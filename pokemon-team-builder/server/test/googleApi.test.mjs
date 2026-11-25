import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { startServer, createClient, CREDENTIALS } from "./helpers.mjs";
import { openDatabase } from "../db.mjs";

// A pretend Google check. A credential like "ok:SUB:NAME" is valid.
// "down" means Google could not be reached; anything else is invalid.
async function fakeVerify(credential) {
  if (credential === "down") {
    throw new Error("network down");
  }
  const [flag, sub, hint] = credential.split(":");
  return flag === "ok" ? { sub, hint: hint ?? "" } : null;
}

let server;
let plain;

before(async () => {
  server = await startServer({
    googleClientId: "test-client",
    verifyGoogle: fakeVerify,
    registerByIp: { max: 10000, windowMs: 60000 },
  });
  plain = await startServer(); // Google sign-in not set up
});
after(async () => {
  await server.close();
  await plain.close();
});

const google = (client, credential, extra = {}) =>
  client.post("/api/auth/google", { credential, ...extra });

describe("which sign-in options exist", () => {
  test("/api/config gives the public client ID when Google is on", async () => {
    const response = await createClient(server.base).get("/api/config");
    assert.deepEqual(response.body, { googleClientId: "test-client" });
  });

  test("/api/config says null when Google is off, and sign-in answers 404", async () => {
    const client = createClient(plain.base);
    assert.deepEqual((await client.get("/api/config")).body, {
      googleClientId: null,
    });
    assert.equal((await google(client, "ok:abc:Ash")).status, 404);
  });
});

describe("signing in with Google", () => {
  test("creates an account the first time, with a safe session", async () => {
    const client = createClient(server.base);
    const response = await google(client, "ok:first-sub:Misty");

    assert.equal(response.status, 201);
    assert.equal(response.body.user.username, "Misty");
    assert.equal(response.body.user.hasPassword, false);
    assert.equal(response.body.user.googleLinked, true);
    assert.match(response.setCookie[0], /HttpOnly/i);
    assert.equal(
      (await client.get("/api/auth/me")).body.user.username,
      "Misty",
    );
  });

  test("never stores an email, and leaves the password empty", async () => {
    const row = server.db
      .prepare("SELECT * FROM users WHERE google_sub = 'first-sub'")
      .get();
    assert.equal(row.password_hash, "!");
    assert.ok(!JSON.stringify(row).includes("@"));
  });

  test("the second time, logs into the same account (200, no new user)", async () => {
    const countBefore = server.db
      .prepare("SELECT COUNT(*) AS n FROM users")
      .get().n;
    const again = await google(createClient(server.base), "ok:first-sub:Misty");
    assert.equal(again.status, 200);
    assert.equal(again.body.user.username, "Misty");
    assert.equal(
      server.db.prepare("SELECT COUNT(*) AS n FROM users").get().n,
      countBefore,
    );
  });

  test("a taken name gets a number added, still a valid username", async () => {
    const one = await google(createClient(server.base), "ok:dup-1:Brock");
    const two = await google(createClient(server.base), "ok:dup-2:Brock");
    assert.equal(one.body.user.username, "Brock");
    assert.notEqual(two.body.user.username, "Brock");
    assert.match(two.body.user.username, /^Brock_\d+$/);
  });

  test("a name taken by a password account (any capitalisation) is not reused", async () => {
    const owner = createClient(server.base);
    await owner.post("/api/auth/register", {
      username: "Gary",
      password: CREDENTIALS.password,
    });
    const response = await google(
      createClient(server.base),
      "ok:gary-sub:gary",
    );
    assert.equal(response.status, 201);
    assert.match(response.body.user.username, /^gary_\d+$/);
  });

  test("a bad credential is refused with a generic 401", async () => {
    const client = createClient(server.base);
    const response = await google(client, "forged");
    assert.equal(response.status, 401);
    assert.equal(response.setCookie.length, 0);
    assert.equal((await client.get("/api/auth/me")).body.user, null);
  });

  test("rejects a missing, non-text or oversized credential", async () => {
    const client = createClient(server.base);
    for (const credential of [undefined, "", 42, "x".repeat(5000)]) {
      assert.equal((await google(client, credential)).status, 400);
    }
  });

  test("says 503 (try again) when Google cannot be reached", async () => {
    assert.equal((await google(createClient(server.base), "down")).status, 503);
  });

  test("a stranger cannot take over an account by guessing", async () => {
    // knowing someone's username does not help: it is the Google id that counts
    const response = await google(
      createClient(server.base),
      "ok:other-sub:Misty",
    );
    assert.notEqual(response.body.user.username, "Misty");
    assert.notEqual(response.body.user.id, undefined);
  });
});

describe("connecting Google to an existing account", () => {
  test("a logged-in user can link, then later sign in with Google alone", async () => {
    const client = createClient(server.base);
    await client.post("/api/auth/register", {
      username: "linker",
      password: CREDENTIALS.password,
    });
    const linked = await google(client, "ok:link-sub:x", { link: true });
    assert.equal(linked.status, 200);
    assert.equal(linked.body.user.googleLinked, true);
    assert.equal(linked.body.user.hasPassword, true);

    const later = await google(createClient(server.base), "ok:link-sub:x");
    assert.equal(later.status, 200);
    assert.equal(later.body.user.username, "linker");
  });

  test("linking needs a session", async () => {
    const response = await google(createClient(server.base), "ok:nobody:x", {
      link: true,
    });
    assert.equal(response.status, 401);
  });

  test("a Google account already used elsewhere cannot be linked a second time", async () => {
    await google(createClient(server.base), "ok:taken-sub:Taken");
    const client = createClient(server.base);
    await client.post("/api/auth/register", {
      username: "latecomer",
      password: CREDENTIALS.password,
    });
    const response = await google(client, "ok:taken-sub:x", { link: true });
    assert.equal(response.status, 409);
    const me = await client.get("/api/auth/me");
    assert.equal(me.body.user.googleLinked, false);
  });

  test("a failed link does not log anyone in or change the session", async () => {
    const client = createClient(server.base);
    await client.post("/api/auth/register", {
      username: "stayput",
      password: CREDENTIALS.password,
    });
    await google(client, "forged", { link: true });
    assert.equal(
      (await client.get("/api/auth/me")).body.user.username,
      "stayput",
    );
  });
});

describe("accounts with no password", () => {
  test("password login cannot get in, with the same answer as an unknown user", async () => {
    await google(createClient(server.base), "ok:nopass-sub:nopass");
    const client = createClient(server.base);
    const real = await client.post("/api/auth/login", {
      username: "nopass",
      password: "!",
    });
    const fake = await client.post("/api/auth/login", {
      username: "no_such_user",
      password: "!",
    });
    assert.equal(real.status, 401);
    assert.deepEqual(real.body, fake.body);
  });

  test("deleting needs the username typed, not a password", async () => {
    const client = createClient(server.base);
    await google(client, "ok:del-sub:deleter");

    assert.equal((await client.delete("/api/account", {})).status, 403);
    assert.equal(
      (await client.delete("/api/account", { password: "!" })).status,
      403,
    );
    assert.equal(
      (await client.delete("/api/account", { confirm: "someone_else" })).status,
      403,
    );
    assert.equal(
      (await client.delete("/api/account", { confirm: "Deleter" })).status,
      204,
    );
    assert.equal(
      server.db
        .prepare("SELECT id FROM users WHERE google_sub = 'del-sub'")
        .get(),
      undefined,
    );
  });

  test("a password account still needs its password to delete, not just a username", async () => {
    const client = createClient(server.base);
    await client.post("/api/auth/register", {
      username: "keeper",
      password: CREDENTIALS.password,
    });
    assert.equal(
      (await client.delete("/api/account", { confirm: "keeper" })).status,
      403,
    );
    assert.equal(
      (await client.delete("/api/account", { password: CREDENTIALS.password }))
        .status,
      204,
    );
  });
});

describe("limits and headers", () => {
  test("repeated bad credentials from one address get rate limited", async () => {
    const limited = await startServer({
      googleClientId: "test-client",
      verifyGoogle: fakeVerify,
      loginByIp: { max: 3, windowMs: 60000 },
    });
    try {
      const client = createClient(limited.base);
      for (let attempt = 0; attempt < 3; attempt += 1) {
        assert.equal((await google(client, "forged")).status, 401);
      }
      const blocked = await google(client, "forged");
      assert.equal(blocked.status, 429);
      assert.ok(blocked.headers.get("retry-after"));
    } finally {
      await limited.close();
    }
  });

  test("the security policy allows Google's sign-in only when it is set up", async () => {
    const on = (await createClient(server.base).get("/api/config")).headers.get(
      "content-security-policy",
    );
    const off = (await createClient(plain.base).get("/api/config")).headers.get(
      "content-security-policy",
    );
    assert.match(
      on,
      /script-src 'self' https:\/\/accounts\.google\.com\/gsi\/client/,
    );
    assert.match(on, /frame-src https:\/\/accounts\.google\.com\/gsi\//);
    assert.doesNotMatch(off, /accounts\.google\.com/);
    assert.doesNotMatch(off, /frame-src/);
    for (const policy of [on, off]) {
      assert.doesNotMatch(policy, /unsafe-eval|unsafe-inline.*script/);
      assert.match(policy, /frame-ancestors 'none'/);
    }
  });
});

describe("upgrading an older database", () => {
  test("adds the Google column and keeps existing accounts", () => {
    const folder = mkdtempSync(join(tmpdir(), "ptb-"));
    const file = join(folder, "old.db");
    try {
      const old = new Database(file);
      old.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          username TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        INSERT INTO users (username, password_hash, created_at)
          VALUES ('veteran', 'scrypt$x', '2026-01-01');
      `);
      old.close();

      // opening it with the real startup code upgrades it in place
      const upgraded = openDatabase(file);
      const columns = upgraded
        .prepare("PRAGMA table_info(users)")
        .all()
        .map((column) => column.name);
      assert.ok(columns.includes("google_sub"));
      const veteran = upgraded
        .prepare("SELECT username, google_sub FROM users")
        .get();
      assert.deepEqual(
        { ...veteran },
        { username: "veteran", google_sub: null },
      );
      upgraded.close();

      // and opening it a second time changes nothing and does not fail
      openDatabase(file).close();
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  test("two accounts cannot share one Google id", () => {
    const db = openDatabase(":memory:");
    const add = db.prepare(
      "INSERT INTO users (username, password_hash, google_sub, created_at) VALUES (?, '!', ?, 'now')",
    );
    add.run("one", "same");
    assert.throws(() => add.run("two", "same"));
    add.run("three", null); // many accounts with no Google id are fine
    add.run("four", null);
    db.close();
  });
});
