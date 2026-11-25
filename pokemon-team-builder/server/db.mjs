import Database from "better-sqlite3";

// Three tables. Deleting a user deletes their sessions and Pokémon with them
// (ON DELETE CASCADE), which is what makes account deletion complete.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- only a hash of each session token is stored, so a copy of the database
-- cannot be used to sign in as someone
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS owned (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  species TEXT NOT NULL,
  nickname TEXT,
  cp INTEGER,
  level REAL,
  iv_attack INTEGER,
  iv_defense INTEGER,
  iv_stamina INTEGER,
  fast_move TEXT,
  charged_move_1 TEXT,
  charged_move_2 TEXT,
  shiny INTEGER NOT NULL DEFAULT 0,
  shadow INTEGER NOT NULL DEFAULT 0,
  lucky INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS owned_user ON owned(user_id);
`;

// path ":memory:" gives a throwaway database, which the tests use
export function openDatabase(path = ":memory:") {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  // SQLite only enforces relationships when asked to
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}
