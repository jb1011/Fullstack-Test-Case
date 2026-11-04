import express from "express";
import { pinoHttp } from "pino-http";

import { errorHandler, notFoundHandler } from "./http/errors";
import type { Logger } from "./logger";
import { healthRouter } from "./routes/health";

export interface AppDeps {
  logger: Logger;
}

export const createApp = ({ logger }: AppDeps) => {
  const app = express();

  app.disable("x-powered-by");
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));

  app.use(healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
