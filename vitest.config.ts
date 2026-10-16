import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // `server-only` throws when imported outside Next's server bundle; tests run in plain Node.
      "server-only": path.resolve(__dirname, "test/server-only-stub.ts"),
    },
  },
});
