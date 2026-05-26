import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"]
    }
  },
  resolve: {
    alias: {
      "@agent-team-runtime/shared": new URL("./packages/shared/src/index.ts", import.meta.url).pathname,
      "@agent-team-runtime/runtime": new URL("./packages/runtime/src/index.ts", import.meta.url).pathname,
      "@agent-team-runtime/mcp-server": new URL("./packages/mcp-server/src/index.ts", import.meta.url).pathname
    }
  }
});
