import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "api",
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
  },
});
