import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/PlayRusty/",
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    // Node 25 ships an experimental global localStorage that shadows jsdom's; disable it.
    execArgv: ["--no-experimental-webstorage"],
  },
});
