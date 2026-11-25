import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../passwords.mjs";
import { createLimiter } from "../rateLimit.mjs";
import { validateCredentials, validateOwned } from "../validate.mjs";
import { openDatabase } from "../db.mjs";
import {
  createSession,
  findSessionUser,
  deleteExpiredSessions,
  readCookie,
} from "../sessions.mjs";

test("a password hash is salted, verifies, and rejects other passwords", async () => {
  const first = await hashPassword("correct horse");
  const second = await hashPassword("correct horse");
  assert.notEqual(first, second);
  assert.ok(!first.includes("correct horse"));
  assert.equal(await verifyPassword("correct horse", first), true);
  assert.equal(await verifyPassword("wrong horse", first), false);
});

test("a damaged stored hash verifies as false instead of throwing", async () => {
  assert.equal(await verifyPassword("x", "garbage"), false);
  assert.equal(await verifyPassword("x", ""), false);
  assert.equal(await verifyPassword("x", "scrypt$1$1$1$zz$zz"), false);
});

test("the limiter blocks after max attempts and frees up after the window", () => {
  const limiter = createLimiter({ max: 2, windowMs: 1000 });
  assert.equal(limiter.retryAfter("a", 0), 0);
  limiter.hit("a", 0);
  limiter.hit("a", 10);
  assert.ok(limiter.retryAfter("a", 20) > 0);
  assert.equal(limiter.retryAfter("b", 20), 0);
  assert.equal(limiter.retryAfter("a", 1001), 0);
});

test("the limiter can be reset", () => {
  const limiter = createLimiter({ max: 1, windowMs: 1000 });
  limiter.hit("a", 0);
  assert.ok(limiter.retryAfter("a", 1) > 0);
  limiter.reset("a");
  assert.equal(limiter.retryAfter("a", 1), 0);
});

test("credentials: usernames and passwords are checked", () => {
  const ok = validateCredentials(
    { username: " ash_1 ", password: "longenough" },
    { creating: true },
  );
  assert.equal(ok.value.username, "ash_1");

  for (const username of [
    "ab",
    "has space",
    "x".repeat(31),
    "emoji😀",
    5,
    null,
  ]) {
    const result = validateCredentials(
      { username, password: "longenough" },
      { creating: true },
    );
    assert.ok(result.error, `rejects ${String(username)}`);
  }
  assert.ok(
    validateCredentials(
      { username: "ash", password: "short" },
      { creating: true },
    ).error,
  );
  assert.ok(
    validateCredentials(
      { username: "ash", password: "x".repeat(129) },
      { creating: true },
    ).error,
  );
});

test("credentials: logging in does not enforce the length rule for old passwords", () => {
  const result = validateCredentials(
    { username: "ash", password: "short" },
    { creating: false },
  );
  assert.equal(result.error, undefined);
});

test("owned: a good body becomes database fields with flags as 0/1", () => {
  const { value, error } = validateOwned({
    species: "mr-mime",
    cp: 900,
    level: 20.5,
    ivAttack: 0,
    shiny: true,
  });
  assert.equal(error, undefined);
  assert.equal(value.species, "mr-mime");
  assert.equal(value.shiny, 1);
  assert.equal(value.shadow, 0);
  assert.equal(value.ivAttack, 0);
  assert.equal(value.ivDefense, null);
});

test("owned: bad values are refused", () => {
  const bad = [
    { species: "Pikachu!" },
    { species: "" },
    { species: "pikachu", ivAttack: 16 },
    { species: "pikachu", ivDefense: -1 },
    { species: "pikachu", ivStamina: 1.5 },
    { species: "pikachu", cp: -5 },
    { species: "pikachu", cp: "900" },
    { species: "pikachu", level: 0.5 },
    { species: "pikachu", level: 52 },
    { species: "pikachu", level: 10.3 },
    { species: "pikachu", nickname: "x".repeat(21) },
    { species: "pikachu", notes: "x".repeat(501) },
    { species: "pikachu", shiny: "yes" },
    null,
    [],
  ];
  for (const body of bad) {
    assert.ok(validateOwned(body).error, `rejects ${JSON.stringify(body)}`);
  }
});

test("owned: unknown fields are ignored, not stored", () => {
  const { value } = validateOwned({ species: "eevee", userId: 99, id: 5 });
  assert.equal(value.userId, undefined);
  assert.equal(value.id, undefined);
});

test("sessions: the database holds only a hash of the token", () => {
  const db = openDatabase(":memory:");
  db.prepare(
    "INSERT INTO users (username, password_hash, created_at) VALUES ('a', 'h', 'now')",
  ).run();
  const { token } = createSession(db, 1);
  const stored = db.prepare("SELECT token_hash FROM sessions").get();
  assert.notEqual(stored.token_hash, token);
  assert.equal(findSessionUser(db, token).username, "a");
  assert.equal(findSessionUser(db, "nope"), null);
  assert.equal(findSessionUser(db, undefined), null);
  db.close();
});

test("sessions: expired ones are refused and removed", () => {
  const db = openDatabase(":memory:");
  db.prepare(
    "INSERT INTO users (username, password_hash, created_at) VALUES ('a', 'h', 'now')",
  ).run();
  const { token } = createSession(db, 1, 1000);
  const afterExpiry = 1000 + 31 * 24 * 60 * 60 * 1000;
  assert.equal(findSessionUser(db, token, afterExpiry), null);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sessions").get().n, 0);

  createSession(db, 1, 1000);
  deleteExpiredSessions(db, afterExpiry);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sessions").get().n, 0);
  db.close();
});

test("readCookie finds one cookie among several", () => {
  const request = { headers: { cookie: "a=1; ptb_session=abc123; b=2" } };
  assert.equal(readCookie(request, "ptb_session"), "abc123");
  assert.equal(readCookie({ headers: {} }, "ptb_session"), undefined);
});
