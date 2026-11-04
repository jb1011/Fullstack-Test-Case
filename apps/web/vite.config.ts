import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig(async ({ mode }) => {
  const devtools =
    mode === "development" ? (await import("react-router-devtools")).reactRouterDevTools() : [];

  return {
    plugins: [...devtools, reactRouter()],
    resolve: { tsconfigPaths: true },
    server: { port: 5173 },
  };
});
