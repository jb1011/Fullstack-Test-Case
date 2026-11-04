import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { createLogger } from "./logger";

const env = loadEnv();
const logger = createLogger(env);
const app = createApp({ logger });

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${String(env.PORT)}`);
});

const shutdown = (signal: NodeJS.Signals) => {
  logger.info(`${signal} received, closing the server`);
  server.close(() => process.exit(0));
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
