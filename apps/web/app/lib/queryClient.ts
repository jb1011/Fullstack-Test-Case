import {
  dehydrate,
  defaultShouldDehydrateQuery,
  QueryClient,
  type DehydratedState,
} from "@tanstack/react-query";
import { createContext, type MiddlewareFunction, type RouterContextProvider } from "react-router";

/**
 * null means this request has no client yet. A URL that matches no route never
 * runs middleware, and the error page must not reuse some other request's client.
 */
export const queryClientContext = createContext<QueryClient | null>(null);

export function requireQueryClient(context: Readonly<RouterContextProvider>) {
  const queryClient = context.get(queryClientContext);
  if (!queryClient) throw new Error("QueryClient is missing for this request");
  return queryClient;
}

export function createQueryClient() {
  return new QueryClient();
}

let browserQueryClient: QueryClient | undefined;

export function getBrowserQueryClient() {
  if (import.meta.env.SSR) {
    throw new Error("The browser QueryClient is only available in the browser");
  }
  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
}

export const queryClientMiddleware: MiddlewareFunction<Response> = async ({ context }, next) => {
  context.set(queryClientContext, createQueryClient());
  await next();
};

export async function queryClientClientMiddleware(
  { context }: { context: RouterContextProvider },
  next: () => Promise<unknown>,
) {
  context.set(queryClientContext, getBrowserQueryClient());
  await next();
}

/**
 * Sibling loaders run at the same time as the root loader. The state is read
 * when the response is serialized, which is after those loaders have finished.
 * A query that is still running is included as its promise, so the browser
 * continues that request instead of starting another one.
 */
export function dehydratedLoaderData(queryClient: QueryClient) {
  return {
    get dehydratedState(): DehydratedState {
      return dehydrate(queryClient, {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      });
    },
  };
}
