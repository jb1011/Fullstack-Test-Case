import { PassThrough, Transform } from "node:stream";

import { createReadableStreamFromReadable } from "@react-router/node";
import { CacheProvider } from "@emotion/react";
import createEmotionServer from "@emotion/server/create-instance";
import { QueryClientProvider } from "@tanstack/react-query";
import { isbot } from "isbot";
import { renderToPipeableStream, type RenderToPipeableStreamOptions } from "react-dom/server";
import { ServerRouter, type EntryContext, type RouterContextProvider } from "react-router";

import { createEmotionCache } from "./emotion";
import { createQueryClient, queryClientContext } from "./queryClient";

export const streamTimeout = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: RouterContextProvider,
) {
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent");
    const readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const cache = createEmotionCache();
    const emotion = createEmotionServer(cache);
    const queryClient = loadContext.get(queryClientContext) ?? createQueryClient();

    const { pipe, abort } = renderToPipeableStream(
      <CacheProvider value={cache}>
        <QueryClientProvider client={queryClient}>
          <ServerRouter context={routerContext} url={request.url} />
        </QueryClientProvider>
      </CacheProvider>,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
              callback();
            },
          });

          responseHeaders.set("Content-Type", "text/html");
          // React 19 writes Uint8Array chunks. Emotion's style stream only accepts buffers.
          const bytes = new Transform({
            transform(chunk: unknown, _encoding, callback) {
              if (Buffer.isBuffer(chunk)) callback(null, chunk);
              else if (typeof chunk === "string" || chunk instanceof Uint8Array) {
                callback(null, Buffer.from(chunk));
              } else callback(new Error("Unexpected render chunk"));
            },
          });
          pipe(bytes).pipe(emotion.renderStylesToNodeStream()).pipe(body);

          resolve(
            new Response(createReadableStreamFromReadable(body), {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
        },
        onShellError(error: unknown) {
          clearTimeout(timeoutId);
          reject(error instanceof Error ? error : new Error(String(error)));
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) console.error(error);
        },
      },
    );

    timeoutId = setTimeout(() => {
      abort();
    }, streamTimeout + 1000);
  });
}
