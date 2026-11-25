import Account from "../js/account.js";
import * as accountApi from "../js/accountApi.js";

const ok = (data) => ({ ok: true, data });
const fail = (error, status = 400) => ({ ok: false, status, error });

function fakeApi(overrides = {}) {
  return {
    getSession: jest.fn(async () => ok({ user: null })),
    register: jest.fn(async (username) => ok({ user: { id: 1, username } })),
    login: jest.fn(async (username) => ok({ user: { id: 1, username } })),
    logout: jest.fn(async () => ok(null)),
    deleteAccount: jest.fn(async () => ok(null)),
    listOwned: jest.fn(async () => ok({ owned: [] })),
    addOwned: jest.fn(async (body) => ok({ owned: { id: 7, ...body } })),
    updateOwned: jest.fn(async (id, body) => ok({ owned: { id, ...body } })),
    deleteOwned: jest.fn(async () => ok(null)),
    ...overrides,
  };
}

describe("Account", () => {
  test("starts logged out and becomes ready after checking for an old login", async () => {
    const account = new Account(fakeApi());
    expect(account.ready).toBe(false);
    const listener = jest.fn();
    account.onChange(listener);

    await account.init();

    expect(account.ready).toBe(true);
    expect(account.isLoggedIn).toBe(false);
    expect(listener).toHaveBeenCalledWith("session");
  });

  test("restores an old login together with its Pokémon", async () => {
    const api = fakeApi({
      getSession: jest.fn(async () => ok({ user: { id: 1, username: "ash" } })),
      listOwned: jest.fn(async () =>
        ok({ owned: [{ id: 3, species: "mew" }] }),
      ),
    });
    const account = new Account(api);
    await account.init();

    expect(account.user.username).toBe("ash");
    expect(account.bestBySpecies().get("mew").id).toBe(3);
  });

  test("a missing server just means logged out", async () => {
    const account = new Account(
      fakeApi({
        getSession: jest.fn(async () =>
          fail("Accounts aren't available right now.", 200),
        ),
      }),
    );
    await account.init();
    expect(account.isLoggedIn).toBe(false);
    expect(account.ready).toBe(true);
  });

  test("login loads Pokémon and tells listeners", async () => {
    const api = fakeApi({
      listOwned: jest.fn(async () =>
        ok({ owned: [{ id: 1, species: "eevee" }] }),
      ),
    });
    const account = new Account(api);
    const listener = jest.fn();
    account.onChange(listener);

    const result = await account.login("ash", "secret-pass");

    expect(result).toEqual({ ok: true });
    expect(api.login).toHaveBeenCalledWith("ash", "secret-pass");
    expect(account.owned).toHaveLength(1);
    expect(listener).toHaveBeenCalledWith("session");
  });

  test("a failed login returns the message and stays logged out", async () => {
    const api = fakeApi({
      login: jest.fn(async () =>
        fail("Username or password is incorrect.", 401),
      ),
    });
    const account = new Account(api);
    const result = await account.login("ash", "nope-nope");
    expect(result).toEqual({
      ok: false,
      error: "Username or password is incorrect.",
    });
    expect(account.isLoggedIn).toBe(false);
  });

  test("register uses the register call", async () => {
    const api = fakeApi();
    const account = new Account(api);
    await account.register("misty", "long-enough");
    expect(api.register).toHaveBeenCalled();
    expect(api.login).not.toHaveBeenCalled();
    expect(account.user.username).toBe("misty");
  });

  test("a list that fails to load is reported, and can be reloaded", async () => {
    const listOwned = jest
      .fn()
      .mockResolvedValueOnce(fail("down", 500))
      .mockResolvedValueOnce(ok({ owned: [{ id: 1, species: "mew" }] }));
    const account = new Account(fakeApi({ listOwned }));
    await account.login("ash", "secret-pass");
    expect(account.loadError).toBe("down");

    await account.reloadOwned();
    expect(account.loadError).toBe("");
    expect(account.owned).toHaveLength(1);
  });

  describe("owned Pokémon", () => {
    async function loggedIn(overrides) {
      const api = fakeApi(overrides);
      const account = new Account(api);
      await account.login("ash", "secret-pass");
      return { account, api };
    }

    test("adding puts the new one first and refreshes the best-of map", async () => {
      const { account, api } = await loggedIn();
      const listener = jest.fn();
      account.onChange(listener);

      const result = await account.save({ species: "pikachu", cp: 900 });

      expect(result.ok).toBe(true);
      expect(api.addOwned).toHaveBeenCalledWith({
        species: "pikachu",
        cp: 900,
      });
      expect(account.owned[0].id).toBe(7);
      expect(account.bestBySpecies().has("pikachu")).toBe(true);
      expect(listener).toHaveBeenCalledWith("owned");
    });

    test("saving with an id updates that one in place", async () => {
      const { account, api } = await loggedIn({
        listOwned: jest.fn(async () =>
          ok({
            owned: [
              { id: 1, species: "eevee", cp: 100 },
              { id: 2, species: "mew", cp: 5 },
            ],
          }),
        ),
      });
      await account.save({ species: "eevee", cp: 999 }, 1);
      expect(api.updateOwned).toHaveBeenCalledWith(1, {
        species: "eevee",
        cp: 999,
      });
      expect(account.owned.find((entry) => entry.id === 1).cp).toBe(999);
      expect(account.owned).toHaveLength(2);
    });

    test("removing drops it from the list", async () => {
      const { account } = await loggedIn({
        listOwned: jest.fn(async () =>
          ok({ owned: [{ id: 1, species: "eevee" }] }),
        ),
      });
      expect((await account.remove(1)).ok).toBe(true);
      expect(account.owned).toHaveLength(0);
      expect(account.bestBySpecies().size).toBe(0);
    });

    test("a validation error is returned and the list is unchanged", async () => {
      const { account } = await loggedIn({
        addOwned: jest.fn(async () =>
          fail("Attack IV must be a whole number from 0 to 15."),
        ),
      });
      const result = await account.save({ species: "pikachu", ivAttack: 16 });
      expect(result).toEqual({
        ok: false,
        error: "Attack IV must be a whole number from 0 to 15.",
      });
      expect(account.owned).toHaveLength(0);
    });

    test("an ended session logs the person out with a clear message", async () => {
      const { account } = await loggedIn({
        addOwned: jest.fn(async () => fail("Log in to continue.", 401)),
      });
      const result = await account.save({ species: "pikachu" });
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/session ended/i);
      expect(account.isLoggedIn).toBe(false);
      expect(account.owned).toEqual([]);
    });
  });

  describe("logging out and deleting", () => {
    test("logout clears everything", async () => {
      const api = fakeApi({
        listOwned: jest.fn(async () =>
          ok({ owned: [{ id: 1, species: "mew" }] }),
        ),
      });
      const account = new Account(api);
      await account.login("ash", "secret-pass");
      await account.logout();
      expect(account.isLoggedIn).toBe(false);
      expect(account.owned).toEqual([]);
      expect(account.bestBySpecies().size).toBe(0);
    });

    test("if logout cannot reach the server, the person stays logged in", async () => {
      const api = fakeApi({
        logout: jest.fn(async () => fail("We couldn't reach the server.", 0)),
      });
      const account = new Account(api);
      await account.login("ash", "secret-pass");
      const result = await account.logout();
      expect(result.ok).toBe(false);
      expect(account.isLoggedIn).toBe(true);
    });

    test("deleting the account needs success from the server", async () => {
      const api = fakeApi({
        deleteAccount: jest.fn(async () =>
          fail("That password is not right.", 403),
        ),
      });
      const account = new Account(api);
      await account.login("ash", "secret-pass");
      expect(await account.deleteAccount("bad")).toEqual({
        ok: false,
        error: "That password is not right.",
      });
      expect(account.isLoggedIn).toBe(true);

      api.deleteAccount.mockResolvedValueOnce(ok(null));
      expect((await account.deleteAccount("secret-pass")).ok).toBe(true);
      expect(account.isLoggedIn).toBe(false);
    });
  });
});

describe("accountApi", () => {
  const reply = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) {
        throw new Error("no body");
      }
      return body;
    },
  });

  afterEach(() => {
    delete global.fetch;
  });

  test("sends JSON for changes and nothing extra for reads", async () => {
    global.fetch = jest.fn(async () => reply(200, { user: null }));

    await accountApi.getSession();
    expect(global.fetch).toHaveBeenLastCalledWith("/api/auth/me", {
      method: "GET",
      headers: {},
      body: undefined,
    });

    await accountApi.addOwned({ species: "mew" });
    const [url, options] = global.fetch.mock.calls[1];
    expect(url).toBe("/api/owned");
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(options.body)).toEqual({ species: "mew" });
  });

  test("builds the right paths and methods", async () => {
    global.fetch = jest.fn(async () => reply(200, {}));
    await accountApi.updateOwned(5, {});
    await accountApi.deleteOwned(5);
    await accountApi.deleteAccount("pw");
    expect(
      global.fetch.mock.calls.map(
        ([url, options]) => `${options.method} ${url}`,
      ),
    ).toEqual([
      "PUT /api/owned/5",
      "DELETE /api/owned/5",
      "DELETE /api/account",
    ]);
  });

  test("an error answer gives the server's message", async () => {
    global.fetch = jest.fn(async () => reply(401, { error: "Nope." }));
    expect(await accountApi.login("a", "b")).toEqual({
      ok: false,
      status: 401,
      error: "Nope.",
    });
  });

  test("an empty 204 answer is a success", async () => {
    global.fetch = jest.fn(async () => reply(204));
    expect(await accountApi.logout()).toEqual({ ok: true, data: null });
  });

  test("a failed request is reported, not thrown", async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const result = await accountApi.getSession();
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toMatch(/couldn't reach the server/i);
  });

  test("a page that is not JSON means accounts are unavailable", async () => {
    global.fetch = jest.fn(async () => reply(200));
    const result = await accountApi.getSession();
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/aren't available/i);
  });
});
