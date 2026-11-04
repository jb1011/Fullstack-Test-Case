import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { HydrationBoundary } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";

import {
  dehydratedLoaderData,
  queryClientClientMiddleware,
  queryClientMiddleware,
  requireQueryClient,
} from "./lib/queryClient";

export const middleware = [queryClientMiddleware];
export const clientMiddleware = [queryClientClientMiddleware];

export function loader({ context }: LoaderFunctionArgs) {
  return dehydratedLoaderData(requireQueryClient(context));
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Merkl</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <Meta />
        <Links />
      </head>
      <body>
        <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { dehydratedState } = useLoaderData<typeof loader>();
  return (
    <HydrationBoundary state={dehydratedState}>
      <Outlet />
    </HydrationBoundary>
  );
}
