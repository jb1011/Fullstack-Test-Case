export type MerklErrorKind = "timeout" | "network" | "not_found" | "http" | "invalid_response";

export class MerklError extends Error {
  override readonly name = "MerklError";
  readonly kind: MerklErrorKind;
  readonly status: number | undefined;

  constructor(
    kind: MerklErrorKind,
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.kind = kind;
    this.status = options.status;
  }
}
