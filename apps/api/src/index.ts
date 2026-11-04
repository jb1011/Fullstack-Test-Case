import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { createLogger } from "./logger";
import { createMerklClient } from "./merkl/client";
import { createOpportunitiesRouter } from "./routes/opportunities";
import { createOpportunitiesService } from "./services/opportunities";

const env = loadEnv();
const logger = createLogger(env);
const merkl = createMerklClient({ baseUrl: env.MERKL_API_URL, timeoutMs: env.MERKL_TIMEOUT_MS });
const app = createApp({
  logger,
  routes: [createOpportunitiesRouter(createOpportunitiesService(merkl))],
});

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${String(env.PORT)}`);
});

const shutdown = (signal: NodeJS.Signals) => {
  logger.info(`${signal} received, closing the server`);
  server.close(() => process.exit(0));
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
