import { Router } from "express";

import { NO_STORE } from "../http/cacheControl";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.set("Cache-Control", NO_STORE).json({ status: "ok" });
});
