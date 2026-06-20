import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
