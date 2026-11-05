import { ChakraProvider } from "@chakra-ui/react";
import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense, type ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";

import { fontFaces, fontLinks } from "./fonts";
import {
  dehydratedLoaderData,
  queryClientClientMiddleware,
  queryClientMiddleware,
  requireQueryClient,
} from "./lib/queryClient";
import { system } from "./theme";

export const middleware = [queryClientMiddleware];
export const clientMiddleware = [queryClientClientMiddleware];

export function links() {
  return fontLinks;
}

export function loader({ context }: LoaderFunctionArgs) {
  return dehydratedLoaderData(requireQueryClient(context));
}

export function shouldRevalidate() {
  return false;
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Merkl Explorer</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <style dangerouslySetInnerHTML={{ __html: fontFaces }} />
        <Meta />
        <Links />
      </head>
      <body>
        <ChakraProvider value={system}>{children}</ChakraProvider>
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
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </HydrationBoundary>
  );
}
