import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  server: { port: 5175, strictPort: true, host: "127.0.0.1" },
  build: { target: "es2022", sourcemap: false },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
