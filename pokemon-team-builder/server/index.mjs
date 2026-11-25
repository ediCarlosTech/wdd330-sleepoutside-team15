import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { openDatabase } from "./db.mjs";
import { createApp } from "./app.mjs";
import { deleteExpiredSessions } from "./sessions.mjs";

const production = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT) || 3000;
const root = resolve(import.meta.dirname, "..");

// On a host with a persistent disk, point this at the disk (for example /var/data/app.db)
const databasePath =
  process.env.DATABASE_PATH || resolve(root, "data", "app.db");
mkdirSync(dirname(databasePath), { recursive: true });
const db = openDatabase(databasePath);

// serve the built site too when deployed, so the page and the API share one origin
const distPath = resolve(root, "dist");
const serveSite = production || process.env.SERVE_STATIC === "1";
if (serveSite && !existsSync(distPath)) {
  console.warn("No dist/ folder found. Run `npm run build` first.");
}

const app = createApp({
  db,
  production,
  staticDir: serveSite ? distPath : null,
  // extra allowed origins for state-changing requests, comma separated
  extraOrigins: (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean),
});

// expired sessions are cleaned up every hour
setInterval(() => deleteExpiredSessions(db), 60 * 60 * 1000).unref();

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

process.on("SIGTERM", () => {
  server.close(() => db.close());
});
