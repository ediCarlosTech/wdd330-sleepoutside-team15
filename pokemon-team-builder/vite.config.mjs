import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";

// While developing, the account server runs inside the Vite dev server, so
// `npm start` is the only command needed and the page and the API share one
// origin (login cookies just work). A deployed site uses `npm run server`.
function accountServer() {
  return {
    name: "account-server",
    apply: "serve",
    async configureServer(devServer) {
      try {
        // loaded only now, so `vite build` never needs the database package
        const { openDatabase } = await import("./server/db.mjs");
        const { createApp } = await import("./server/app.mjs");

        const databasePath =
          process.env.DATABASE_PATH ||
          resolve(devServer.config.root, "data", "app.db");
        mkdirSync(dirname(databasePath), { recursive: true });

        const app = createApp({
          db: openDatabase(databasePath),
          googleClientId: process.env.GOOGLE_CLIENT_ID || "",
        });
        devServer.middlewares.use((request, response, next) => {
          if (request.url?.startsWith("/api")) {
            app(request, response, next);
          } else {
            next();
          }
        });
      } catch (err) {
        // the site still works without accounts, so do not stop the dev server
        devServer.config.logger.warn(
          `Account server not started: ${err.message}\n` +
            "Run `npm install` again if better-sqlite3 failed to build.",
        );
      }
    },
  };
}

// index.html lives in the project root; Vite builds it into dist/
export default defineConfig({
  build: { outDir: "dist" },
  plugins: [accountServer()],
});
