import type { RequestHandler } from "express";

/** Public responses, no cookies, so any origin may read them. */
export const allowAnyOrigin: RequestHandler = (req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method !== "OPTIONS") {
    next();
    return;
  }
  res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Accept");
  res.sendStatus(204);
};
