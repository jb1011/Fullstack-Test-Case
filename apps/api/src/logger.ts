import { pino } from "pino";

import type { Env } from "./config/env";

export type Logger = pino.Logger;

export const createLogger = (env: Pick<Env, "NODE_ENV" | "LOG_LEVEL">): Logger =>
  pino({
    level: env.LOG_LEVEL,
    ...(env.NODE_ENV === "development" && {
      transport: { target: "pino-pretty", options: { ignore: "pid,hostname" } },
    }),
  });
