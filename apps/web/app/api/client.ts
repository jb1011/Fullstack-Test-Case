import {
  filtersSchema,
  opportunityDetailSchema,
  opportunityHistorySchema,
  opportunityListSchema,
  serializeOpportunitiesQuery,
  type Filters,
  type OpportunitiesQuery,
  type OpportunityDetail,
  type OpportunityHistory,
  type OpportunityList,
} from "@merkl/shared";

const DEFAULT_API_URL = "http://localhost:4000";

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL;

export class ApiError extends Error {
  override readonly name = "ApiError";
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const messageOf = (body: unknown, fallback: string) => {
  if (typeof body !== "object" || body === null) return fallback;
  if ("detail" in body && typeof body.detail === "string" && body.detail) return body.detail;
  if ("title" in body && typeof body.title === "string" && body.title) return body.title;
  return fallback;
};

export function createApiClient(baseUrl: string) {
  const root = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const endpoint = (path: string) => new URL(path, root);

  async function getJson<T>(url: URL, parse: (body: unknown) => T): Promise<T> {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    const body: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      throw new ApiError(response.status, messageOf(body, response.statusText));
    }

    try {
      return parse(body);
    } catch {
      throw new ApiError(response.status, "The API returned an unexpected response");
    }
  }

  return {
    list(query: OpportunitiesQuery): Promise<OpportunityList> {
      const url = endpoint("opportunities");
      const search = serializeOpportunitiesQuery(query);
      if (search) url.search = search;
      return getJson(url, (body) => opportunityListSchema.parse(body));
    },

    detail(id: string): Promise<OpportunityDetail> {
      return getJson(endpoint(`opportunities/${encodeURIComponent(id)}`), (body) =>
        opportunityDetailSchema.parse(body),
      );
    },

    history(id: string): Promise<OpportunityHistory> {
      return getJson(endpoint(`opportunities/${encodeURIComponent(id)}/history`), (body) =>
        opportunityHistorySchema.parse(body),
      );
    },

    filters(): Promise<Filters> {
      return getJson(endpoint("filters"), (body) => filtersSchema.parse(body));
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const api = createApiClient(apiBaseUrl);
