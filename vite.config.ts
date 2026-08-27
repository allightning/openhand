import { defineConfig } from "vitest/config";

export default defineConfig({
  base: process.env.VITE_BASE ?? "./",
  server: { port: 5175, strictPort: true, host: "127.0.0.1" },
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: "index.html",
        lab: "combat-lab.html",
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
