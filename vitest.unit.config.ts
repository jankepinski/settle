import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "unit",
    include: ["src/**/*.unit.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
