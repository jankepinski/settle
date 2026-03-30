import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "integration",
    include: ["src/**/*.integration.test.ts"],
    environment: "node",
    setupFiles: ["./src/test-utils/integration-setup.ts"],
    pool: "forks",
    fileParallelism: false,
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
