import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, createClient, CREDENTIALS, OWNED } from "./helpers.mjs";

let server;

before(async () => {
  // the real limit is 20 sign-ups an hour per address; these tests make many
  server = await startServer({
    registerByIp: { max: 10000, windowMs: 60000 },
  });
});
after(async () => {
  await server.close();
});

// each test gets its own user so tests do not depend on one another
let counter = 0;
async function signedInClient(name) {
  counter += 1;
  const client = createClient(server.base);
  const username = name ?? `trainer_${counter}`;
  const response = await client.post("/api/auth/register", {
    username,
    password: CREDENTIALS.password,
  });
  assert.equal(response.status, 201);
  return { client, username };
}

describe("registering", () => {
  test("creates an account, signs in, and sets a safe cookie", async () => {
    const client = createClient(server.base);
    const response = await client.post("/api/auth/register", CREDENTIALS);

    assert.equal(response.status, 201);
    assert.equal(response.body.user.username, CREDENTIALS.username);
    assert.equal(response.body.user.password, undefined);

    const cookie = response.setCookie[0];
    assert.match(cookie, /ptb_session=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.doesNotMatch(cookie, /Secure/i); // only in production

    const me = await client.get("/api/auth/me");
    assert.equal(me.body.user.username, CREDENTIALS.username);
  });

  test("never stores the password or the session token in plain text", async () => {
    const { client } = await signedInClient("hash_check");
    const row = server.db
      .prepare("SELECT password_hash FROM users WHERE username = 'hash_check'")
      .get();
    assert.ok(row.password_hash.startsWith("scrypt$"));
    assert.ok(!row.password_hash.includes(CREDENTIALS.password));

    const token = client.cookie.split("=")[1];
    const sessions = server.db.prepare("SELECT token_hash FROM sessions").all();
    assert.ok(sessions.every((session) => session.token_hash !== token));
  });

  test("refuses a name that is taken, ignoring letter case", async () => {
    await signedInClient("Misty");
    const other = createClient(server.base);
    const response = await other.post("/api/auth/register", {
      username: "mISTY",
      password: CREDENTIALS.password,
    });
    assert.equal(response.status, 409);
  });

  test("refuses weak or malformed details", async () => {
    const client = createClient(server.base);
    for (const body of [
      { username: "ab", password: CREDENTIALS.password },
      { username: "fine_name", password: "short" },
      { username: "bad name!", password: CREDENTIALS.password },
      {},
    ]) {
      const response = await client.post("/api/auth/register", body);
      assert.equal(response.status, 400, JSON.stringify(body));
      assert.ok(response.body.error);
    }
  });
});

describe("logging in and out", () => {
  test("works with the right password and starts a new session", async () => {
    await signedInClient("brock");
    const client = createClient(server.base);
    const response = await client.post("/api/auth/login", {
      username: "BROCK",
      password: CREDENTIALS.password,
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.user.username, "brock");
    assert.equal(
      (await client.get("/api/auth/me")).body.user.username,
      "brock",
    );
  });

  test("gives the same answer for a wrong password and an unknown user", async () => {
    await signedInClient("gary");
    const client = createClient(server.base);
    const wrongPassword = await client.post("/api/auth/login", {
      username: "gary",
      password: "not-the-password",
    });
    const unknownUser = await client.post("/api/auth/login", {
      username: "nobody_here",
      password: "not-the-password",
    });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownUser.status, 401);
    assert.deepEqual(wrongPassword.body, unknownUser.body);
  });

  test("logging out ends the session on the server too", async () => {
    const { client } = await signedInClient();
    const stolen = client.cookie;

    assert.equal((await client.post("/api/auth/logout", {})).status, 204);
    assert.equal((await client.get("/api/auth/me")).body.user, null);

    // the old cookie no longer works, even if someone kept a copy
    const thief = createClient(server.base);
    const response = await thief.get("/api/owned", { Cookie: stolen });
    assert.equal(response.status, 401);
  });

  test("an expired session is refused", async () => {
    const { client } = await signedInClient();
    server.db.prepare("UPDATE sessions SET expires_at = 1").run();
    assert.equal((await client.get("/api/owned")).status, 401);
    assert.equal((await client.get("/api/auth/me")).body.user, null);
  });

  test("asking who is signed in while logged out is a normal answer", async () => {
    const response = await createClient(server.base).get("/api/auth/me");
    assert.equal(response.status, 200);
    assert.equal(response.body.user, null);
  });
});

describe("owned Pokémon", () => {
  test("every route needs a login", async () => {
    const client = createClient(server.base);
    assert.equal((await client.get("/api/owned")).status, 401);
    assert.equal((await client.post("/api/owned", OWNED)).status, 401);
    assert.equal((await client.put("/api/owned/1", OWNED)).status, 401);
    assert.equal((await client.delete("/api/owned/1")).status, 401);
  });

  test("can be added, listed, edited and removed", async () => {
    const { client } = await signedInClient();

    const created = await client.post("/api/owned", OWNED);
    assert.equal(created.status, 201);
    assert.equal(created.body.owned.species, "pikachu");
    assert.equal(created.body.owned.shiny, true);
    assert.equal(created.body.owned.level, 30.5);

    const list = await client.get("/api/owned");
    assert.equal(list.body.owned.length, 1);

    const id = created.body.owned.id;
    const edited = await client.put(`/api/owned/${id}`, { ...OWNED, cp: 1800 });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.owned.cp, 1800);

    assert.equal((await client.delete(`/api/owned/${id}`)).status, 204);
    assert.equal((await client.get("/api/owned")).body.owned.length, 0);
  });

  test("a Pokémon with only a species is fine", async () => {
    const { client } = await signedInClient();
    const created = await client.post("/api/owned", { species: "eevee" });
    assert.equal(created.status, 201);
    assert.equal(created.body.owned.cp, null);
    assert.equal(created.body.owned.shadow, false);
  });

  test("bad values are refused with a message", async () => {
    const { client } = await signedInClient();
    for (const bad of [
      { ...OWNED, ivAttack: 16 },
      { ...OWNED, species: "Not A Slug" },
      { ...OWNED, cp: -1 },
    ]) {
      const response = await client.post("/api/owned", bad);
      assert.equal(response.status, 400);
      assert.ok(response.body.error);
    }
    assert.equal((await client.get("/api/owned")).body.owned.length, 0);
  });

  test("people only ever see and change their own Pokémon", async () => {
    const { client: ash } = await signedInClient();
    const { client: misty } = await signedInClient();

    const mine = await ash.post("/api/owned", OWNED);
    const id = mine.body.owned.id;

    assert.equal((await misty.get("/api/owned")).body.owned.length, 0);
    assert.equal(
      (await misty.put(`/api/owned/${id}`, { ...OWNED, cp: 1 + 10 })).status,
      404,
    );
    assert.equal((await misty.delete(`/api/owned/${id}`)).status, 404);

    // still there and unchanged for the real owner
    const list = await ash.get("/api/owned");
    assert.equal(list.body.owned.length, 1);
    assert.equal(list.body.owned[0].cp, OWNED.cp);
  });

  test("a body cannot choose its own owner or id", async () => {
    const { client: ash } = await signedInClient();
    const { client: misty } = await signedInClient();
    await ash.post("/api/owned", { ...OWNED, userId: 9999, id: 1 });
    assert.equal((await ash.get("/api/owned")).body.owned.length, 1);
    assert.equal((await misty.get("/api/owned")).body.owned.length, 0);
  });

  test("odd ids are a plain not found", async () => {
    const { client } = await signedInClient();
    for (const id of ["abc", "-1", "0", "1.5"]) {
      assert.equal(
        (await client.put(`/api/owned/${id}`, OWNED)).status,
        404,
        id,
      );
      assert.equal((await client.delete(`/api/owned/${id}`)).status, 404, id);
    }
  });
});

describe("deleting an account", () => {
  test("needs the password, then removes the account, sessions and Pokémon", async () => {
    const { client, username } = await signedInClient();
    await client.post("/api/owned", OWNED);
    const userId = server.db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username).id;
    const owned = () =>
      server.db
        .prepare("SELECT COUNT(*) AS n FROM owned WHERE user_id = ?")
        .get(userId).n;
    assert.equal(owned(), 1);

    const wrong = await client.delete("/api/account", {
      password: "nope-nope",
    });
    assert.equal(wrong.status, 403);
    assert.equal((await client.get("/api/owned")).status, 200);

    const done = await client.delete("/api/account", {
      password: CREDENTIALS.password,
    });
    assert.equal(done.status, 204);

    const user = server.db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username);
    assert.equal(user, undefined);
    const count = (table) =>
      server.db
        .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`)
        .get(userId).n;
    assert.equal(count("owned"), 0);
    assert.equal(count("sessions"), 0);
    assert.equal((await client.get("/api/auth/me")).body.user, null);
  });

  test("leaves other people's data alone", async () => {
    const { client: keeper } = await signedInClient();
    await keeper.post("/api/owned", OWNED);
    const { client: leaver } = await signedInClient();
    await leaver.post("/api/owned", OWNED);
    await leaver.delete("/api/account", { password: CREDENTIALS.password });
    assert.equal((await keeper.get("/api/owned")).body.owned.length, 1);
  });
});

describe("request safety", () => {
  test("a request from another site is refused", async () => {
    const { client } = await signedInClient();
    const response = await client.post("/api/owned", OWNED, {
      Origin: "https://evil.example",
    });
    assert.equal(response.status, 403);
    assert.equal((await client.get("/api/owned")).body.owned.length, 0);
  });

  test("a request from this site is accepted", async () => {
    const { client } = await signedInClient();
    const response = await client.post("/api/owned", OWNED, {
      Origin: server.base,
    });
    assert.equal(response.status, 201);
  });

  test("a browser saying cross-site is refused even without an Origin", async () => {
    const { client } = await signedInClient();
    const response = await client.post("/api/owned", OWNED, {
      "Sec-Fetch-Site": "cross-site",
    });
    assert.equal(response.status, 403);
  });

  test("changes must be sent as JSON", async () => {
    const { client } = await signedInClient();
    const response = await fetch(`${server.base}/api/owned`, {
      method: "POST",
      headers: { "Content-Type": "text/plain", Cookie: client.cookie },
      body: JSON.stringify(OWNED),
    });
    assert.equal(response.status, 415);
  });

  test("broken or oversized JSON is a clean error", async () => {
    const { client } = await signedInClient();
    const broken = await fetch(`${server.base}/api/owned`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: client.cookie },
      body: "{not json",
    });
    assert.equal(broken.status, 400);

    const huge = await fetch(`${server.base}/api/owned`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: client.cookie },
      body: JSON.stringify({ species: "eevee", notes: "x".repeat(30000) }),
    });
    assert.equal(huge.status, 413);
  });

  test("answers carry security headers and are not cacheable", async () => {
    const response = await createClient(server.base).get("/api/auth/me");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.match(
      response.headers.get("content-security-policy"),
      /default-src 'self'/,
    );
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-powered-by"), null);
  });

  test("unknown API paths are a JSON 404", async () => {
    const response = await createClient(server.base).get("/api/nothing-here");
    assert.equal(response.status, 404);
    assert.ok(response.body.error);
  });
});

describe("limits", () => {
  test("too many wrong passwords for one name are blocked, even with the right one", async () => {
    const limited = await startServer({
      loginByUser: { max: 3, windowMs: 60000 },
    });
    try {
      const owner = createClient(limited.base);
      await owner.post("/api/auth/register", CREDENTIALS);

      const attacker = createClient(limited.base);
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await attacker.post("/api/auth/login", {
          username: CREDENTIALS.username,
          password: "wrong-wrong",
        });
        assert.equal(response.status, 401);
      }
      const blocked = await attacker.post("/api/auth/login", CREDENTIALS);
      assert.equal(blocked.status, 429);
      assert.ok(Number(blocked.headers.get("retry-after")) > 0);
    } finally {
      await limited.close();
    }
  });

  test("a successful login clears the count", async () => {
    const limited = await startServer({
      loginByUser: { max: 3, windowMs: 60000 },
    });
    try {
      const client = createClient(limited.base);
      await client.post("/api/auth/register", CREDENTIALS);
      for (let round = 0; round < 3; round += 1) {
        await client.post("/api/auth/login", {
          ...CREDENTIALS,
          password: "wrong-wrong",
        });
        await client.post("/api/auth/login", {
          ...CREDENTIALS,
          password: "wrong-wrong",
        });
        const good = await client.post("/api/auth/login", CREDENTIALS);
        assert.equal(good.status, 200);
      }
    } finally {
      await limited.close();
    }
  });

  test("account creation is limited per address", async () => {
    const limited = await startServer({
      registerByIp: { max: 2, windowMs: 60000 },
    });
    try {
      const client = createClient(limited.base);
      for (const name of ["one_a", "two_b"]) {
        const response = await client.post("/api/auth/register", {
          username: name,
          password: CREDENTIALS.password,
        });
        assert.equal(response.status, 201);
      }
      const third = await client.post("/api/auth/register", {
        username: "three_c",
        password: CREDENTIALS.password,
      });
      assert.equal(third.status, 429);
    } finally {
      await limited.close();
    }
  });

  test("each person can track a limited number of Pokémon", async () => {
    const { client, username } = await signedInClient();
    const userId = server.db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username).id;
    const insert = server.db.prepare(
      `INSERT INTO owned (user_id, species, created_at, updated_at)
       VALUES (?, 'eevee', 'now', 'now')`,
    );
    for (let count = 0; count < 1000; count += 1) {
      insert.run(userId);
    }
    const response = await client.post("/api/owned", OWNED);
    assert.equal(response.status, 409);
  });
});

describe("production settings", () => {
  test("cookies are Secure and responses ask for HTTPS", async () => {
    const secure = await startServer({ production: true });
    try {
      const response = await createClient(secure.base).post(
        "/api/auth/register",
        {
          username: "secure_one",
          password: CREDENTIALS.password,
        },
      );
      assert.match(response.setCookie[0], /Secure/i);
      assert.ok(response.headers.get("strict-transport-security"));
    } finally {
      await secure.close();
    }
  });
});
