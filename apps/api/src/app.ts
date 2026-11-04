import type { RequestHandler } from "express";
import express from "express";
import { pinoHttp } from "pino-http";

import { errorHandler, notFoundHandler } from "./http/errors";
import type { Logger } from "./logger";
import { healthRouter } from "./routes/health";

export interface AppDeps {
  logger: Logger;
  routes?: RequestHandler[];
}

export const createApp = ({ logger, routes = [] }: AppDeps) => {
  const app = express();

  app.disable("x-powered-by");
  app.set("query parser", "extended");
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));

  app.use(healthRouter);
  for (const route of routes) app.use(route);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
