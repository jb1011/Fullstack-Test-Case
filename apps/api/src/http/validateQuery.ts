import type { RequestHandler, Response } from "express";
import type { z } from "zod";

import { HttpError } from "./errors";

const detailOf = (error: z.ZodError) =>
  error.issues
    .map((issue) => {
      const field = issue.path.map(String).join(".");
      return field === "" ? issue.message : `${field}: ${issue.message}`;
    })
    .join("; ");

export const validateQuery =
  <T>(schema: z.ZodType<T>): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new HttpError(400, detailOf(result.error)));
      return;
    }
    res.locals.validatedQuery = result.data;
    next();
  };

export const readQuery = <T>(res: Response, schema: z.ZodType<T>): T => {
  const result = schema.safeParse(res.locals.validatedQuery);
  if (!result.success) {
    throw new Error("readQuery() called without validateQuery()");
  }
  return result.data;
};
