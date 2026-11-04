import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import { STATUS_CODES } from "node:http";

import type { MerklErrorKind } from "../merkl/errors";
import { MerklError } from "../merkl/errors";

export class HttpError extends Error {
  override readonly name = "HttpError";
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const sendProblem = (res: Response, status: number, detail?: string) => {
  res
    .status(status)
    .type("application/problem+json")
    .json({ type: "about:blank", title: STATUS_CODES[status] ?? "Error", status, detail });
};

const merklFailures: Record<MerklErrorKind, { status: number; detail: string }> = {
  not_found: { status: 404, detail: "Not found on Merkl" },
  timeout: { status: 504, detail: "Merkl took too long to answer" },
  network: { status: 502, detail: "Merkl is unreachable" },
  http: { status: 502, detail: "Merkl returned an error" },
  invalid_response: { status: 502, detail: "Merkl returned an unexpected response" },
};

export const notFoundHandler: RequestHandler = (req, res) => {
  sendProblem(res, 404, `No route for ${req.method} ${req.path}`);
};

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    sendProblem(res, error.status, error.message);
    return;
  }

  if (error instanceof MerklError) {
    const failure = merklFailures[error.kind];
    if (failure.status >= 500) req.log.warn({ err: error }, "Merkl request failed");
    sendProblem(res, failure.status, failure.detail);
    return;
  }

  req.log.error({ err: error }, "Unhandled error");
  sendProblem(res, 500);
};
