import type { OpportunitiesQuery } from "@merkl/shared";
import { z } from "zod";

import { MerklError } from "./errors";
import { toMerklFilterParams, toMerklListParams } from "./params";
import { merklOpportunitySchema } from "./schemas";

export interface MerklClientOptions {
  baseUrl: string;
  timeoutMs?: number;
}

const isTimeout = (error: unknown) =>
  error instanceof DOMException && error.name === "TimeoutError";

export function createMerklClient({ baseUrl, timeoutMs = 5_000 }: MerklClientOptions) {
  async function request<T extends z.ZodType>(
    path: string,
    schema: T,
    params?: URLSearchParams,
  ): Promise<z.output<T>> {
    const url = new URL(path, baseUrl);
    if (params) url.search = params.toString();

    let body: unknown;
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.status === 404) {
        throw new MerklError("not_found", `Merkl has no resource at ${url.pathname}`, {
          status: 404,
        });
      }
      if (!response.ok) {
        throw new MerklError("http", `Merkl responded ${String(response.status)}`, {
          status: response.status,
        });
      }

      body = await response.json();
    } catch (error) {
      if (error instanceof MerklError) throw error;
      if (isTimeout(error)) {
        throw new MerklError("timeout", `Merkl took longer than ${String(timeoutMs)} ms`, {
          cause: error,
        });
      }
      if (error instanceof SyntaxError) {
        throw new MerklError("invalid_response", "Merkl returned invalid JSON", { cause: error });
      }
      throw new MerklError("network", "Could not reach Merkl", { cause: error });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new MerklError("invalid_response", `Unexpected Merkl response for ${url.pathname}`, {
        cause: parsed.error,
      });
    }
    return parsed.data;
  }

  return {
    listOpportunities: (query: OpportunitiesQuery) =>
      request("/v4/opportunities", z.array(merklOpportunitySchema), toMerklListParams(query)),

    countOpportunities: (query: OpportunitiesQuery) =>
      request(
        "/v4/opportunities/count",
        z.number().int().nonnegative(),
        toMerklFilterParams(query),
      ),

    getOpportunity: (id: string) =>
      request(`/v4/opportunities/${encodeURIComponent(id)}`, merklOpportunitySchema),
  };
}

export type MerklClient = ReturnType<typeof createMerklClient>;
