import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // `@/` points at src, as in the app, so server actions can be imported by tests.
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { include: ["src/**/*.test.ts"] },
});
