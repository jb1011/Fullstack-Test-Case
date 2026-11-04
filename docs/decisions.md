# Decisions

Why I picked what I picked.

## Opportunities as the resource

It's the core of Merkl, and Merkl already filters it on its side (chain, protocol, action, status, TVL, APR). Campaigns are a detail of an opportunity, and tokens don't have interesting filters.

## My own API in front of Merkl

With SSR, every page load runs a server loader. If loaders called Merkl directly, Merkl would get one call per page view, from every user. My API gives me one cache shared by everyone, small payloads, and a frontend that doesn't break when Merkl changes its schema.

The cost is one more service to run.

## Filtering on Merkl's side

I pass the filters to Merkl instead of downloading everything and filtering myself. There are thousands of opportunities and Merkl returns 100 per page at most, so fetching it all would mean many calls just to show 20 rows.

The cost: each filter combination is its own cache entry.

## Two cache layers

TanStack Query only caches inside one browser, so it can't stop 100 users from causing 100 calls to Merkl. The API has its own in memory cache for that, and TanStack makes navigation instant for each user.

A list entry stays fresh for 60 seconds, which is tighter than the 240 seconds Merkl itself allows.

## SSR hydration with TanStack Query

The loader fills a `QueryClient` on the server, the cache is sent with the HTML, and components just call `useQuery` like in a normal client app. A `clientLoader` reads the same cache when you navigate.

I didn't use `initialData` because the server loader would still run on every navigation. I didn't fetch only on the client because every page change would show a loader.

## npm workspaces

npm is already installed everywhere, and workspaces are enough for three packages. `shared` is imported as TypeScript source, so there's no build step to wait for.

The cost: npm runs scripts one after another, so `npm run dev` needs `concurrently`.

## TypeScript 6.0 with bundler resolution

TypeScript 7 is out, but `typescript-eslint` only supports up to 6.0, so I pinned 6.0. tsx runs the API and Vite runs the web app, so `tsc` only type checks. Bundler resolution fits that and avoids `.js` extensions in every import.

The cost: a production API build would need a bundler like esbuild.

## Type aware linting

I use typescript-eslint's `strictTypeChecked` rules. They read the types, so they catch things plain linting can't, like a promise nobody awaits. That matters in an API full of `fetch` calls.

The cost: linting is slower because it runs the type checker.

## My own query names

My API uses its own query names (`chain`, `protocol`, `minTvl`, `page` from 1) instead of Merkl's (`chainId`, `mainProtocolId`, `minimumTvl`, `page` from 0). The Merkl client translates them. Same idea as the DTOs: if Merkl renames a parameter, only the client changes, and the URLs users share keep working.

The status defaults to `LIVE` because past opportunities are rarely what someone is looking for.

The cost: one small mapping function to maintain.

## Parsing Merkl responses

I validate what Merkl sends with Zod, but only the fields I use, and fields that real data sometimes omits are optional. If Merkl adds fields nothing breaks, and if it removes one I use I get a clear `invalid_response` error instead of `undefined` deep in the UI.

Status and action stay plain strings at this level. Turning them into my enums is the mapper's job, so a new Merkl action can't make the whole list fail.

The cost: one bad item fails the whole page. Skipping bad items would need logging, which I'll add with the logger.

## DTO shape

Missing values are always `null`. Merkl mixes empty strings, missing keys and `null`, and the UI shouldn't have to check all three. Dates are ISO strings and chart points use millisecond timestamps, because that's what `Date` and Recharts expect. History points come oldest first, ready to draw.

The total TVL rides along with the list response instead of having its own endpoint: it depends on the same filters, so it's cached and invalidated together.

The cost: one more Merkl call per list request, which the cache absorbs.

## DTO types written by hand

The DTOs are the contract between the API and the web app, so they're plain interfaces anyone can read without knowing Zod. Each schema is checked against its interface with `satisfies z.ZodType<T>`, so the two can't drift apart. I used `satisfies` rather than a type annotation because an annotation widens the schema and loses `.extend()`.

The query schema and Merkl's schemas still infer their types. The query schema transforms its input, so its input and output types differ and inference gives both. Merkl's schemas are internal and only exist to parse.

## Unknown Merkl values

If Merkl starts sending an action or status I don't know, that opportunity is skipped from the list instead of failing the whole page. The detail mapper returns `null` for it, so the route can answer 404.

## Extended query parser

Express's default query parser keeps only the last value when a key is repeated, so `chain=1&chain=42161` would drop Ethereum and the request would still succeed. The extended parser keeps every value, which the schema already sorts and dedupes. Unknown parameters are ignored, so a tracking parameter doesn't fail the request.

## lru-cache

The in memory store is the `lru-cache` package. It is the usual LRU in Node services, and it already does a TTL and joined fetches, which the next commits need. An entry has one freshness time. A list stays fresh for 60 seconds and is then fetched again. There is no second, longer window where an old entry is still served.

Values are copied on the way in and out. The package stores the object you give it, and one request must not be able to edit what another request receives.

Tests pass a clock into the store. Fake timers start `performance.now()` at 0, and the package treats a start time of 0 as "no timestamp", so an entry would never expire.

## One load for identical keys

If several requests miss the same key at once, the fetcher runs once and they all wait for it. If that fetch fails and a previous value is still stored, they receive it. A normal read still returns nothing once the TTL has passed, and the error is never stored, so the next request tries again.

The cost: an old value can sit in memory until the size limit drops it.

## HTTP stays in the routes

The opportunities service returns `null` when Merkl has nothing, or when an opportunity uses an action or status I don't know. The route turns that into a 404. I didn't throw HTTP errors from the service, because the cache will wrap the service next and a cache shouldn't know about status codes.

## Errors as problem details

Every error has the same shape (RFC 7807: `type`, `title`, `status`, `detail`), so the web app has one thing to handle. Merkl failures become 502 or 504 because the problem is upstream, not in the request, and 404 stays 404. Merkl's own error messages and unexpected errors are logged but never sent, since they can leak internals.

## Faking Merkl with Mock Service Worker

The client uses the real `fetch`, and MSW intercepts it in tests. That tests the actual URLs, headers and error handling, not a mock I wrote myself. Any request without a handler fails the test, so nothing can reach the real Merkl by accident.

The cost: tests depend on fixtures that can drift from the live API, so I recorded them from real responses.

## CI as one matrix

I run the four checks as a matrix of parallel jobs instead of steps in one job. Each check shows up separately on the PR, and a lint error doesn't stop the tests from running.

## Chakra UI only

Chakra gives me components and styling in one tool. Adding Tailwind would mean two styling systems fighting each other.

The cost: Chakra uses Emotion, which needs a bit of SSR setup.
