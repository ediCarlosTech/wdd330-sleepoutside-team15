import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "ptb_session";
export const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

// the database holds this hash, never the token the browser holds
function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSession(db, userId, now = Date.now()) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = now + SESSION_MS;
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
  ).run(hashToken(token), userId, expiresAt);
  return { token, expiresAt };
}

// the user for a token, or null if it is unknown or expired
export function findSessionUser(db, token, now = Date.now()) {
  if (typeof token !== "string" || token.length === 0) {
    return null;
  }
  const row = db
    .prepare(
      `SELECT users.id, users.username, sessions.expires_at
       FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ?`,
    )
    .get(hashToken(token));

  if (!row) {
    return null;
  }
  if (row.expires_at <= now) {
    deleteSession(db, token);
    return null;
  }
  return { id: row.id, username: row.username };
}

export function deleteSession(db, token) {
  if (typeof token === "string") {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(
      hashToken(token),
    );
  }
}

export function deleteExpiredSessions(db, now = Date.now()) {
  return db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now)
    .changes;
}

// reads one cookie from the Cookie header without a library
export function readCookie(request, name) {
  const header = request.headers.cookie;
  if (!header) {
    return undefined;
  }
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return undefined;
}
