import { defineConfig } from "vite";

// index.html lives in the project root; Vite builds it into dist/
export default defineConfig({
  build: { outDir: "dist" },
});
