import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/PlayRusty/",
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
