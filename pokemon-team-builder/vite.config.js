import { defineConfig } from "vite";

// index.html lives in the project root; Vite builds it into dist/
export default defineConfig({
  build: { outDir: "dist" },
  server: {
    // while developing, the page runs here and the API on port 3000.
    // Proxying /api keeps them on one origin, so login cookies just work.
    proxy: { "/api": "http://localhost:3000" },
  },
});
