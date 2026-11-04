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

## Cache the service answer

I cache the DTO a route returns, not each Merkl call on its own. A list is the page, the count and the total TVL together, so they stay one snapshot and expire together. The key is the normalized query, which already sorts values and drops defaults, so the same filters share an entry whatever order they arrived in.

## Cache-Control matches the server TTL

A successful response is `public`, because nothing in it depends on who asked, and `max-age` is the same number of seconds the server keeps that answer. I didn't add a stale window on the header, for the same reason the server doesn't have one. Health and errors are `no-store`, so a liveness check or a 502 is never replayed from a browser cache.

## HTTP stays in the routes

The opportunities service returns `null` when Merkl has nothing, or when an opportunity uses an action or status I don't know. The route turns that into a 404. I didn't throw HTTP errors from the service, because the cache wraps the service and a cache shouldn't know about status codes.

## Errors as problem details

Every error has the same shape (RFC 7807: `type`, `title`, `status`, `detail`), so the web app has one thing to handle. Merkl failures become 502 or 504 because the problem is upstream, not in the request, and 404 stays 404. Merkl's own error messages and unexpected errors are logged but never sent, since they can leak internals.

## Faking Merkl with Mock Service Worker

The client uses the real `fetch`, and MSW intercepts it in tests. That tests the actual URLs, headers and error handling, not a mock I wrote myself. Any request without a handler fails the test, so nothing can reach the real Merkl by accident.

The cost: tests depend on fixtures that can drift from the live API, so I recorded them from real responses.

## CI as one matrix

I run each check as its own job in a matrix instead of steps in one job. Each check shows up separately on the PR, and a lint error doesn't stop the tests from running. The web build is one of those jobs.

## Chakra UI only

Chakra gives me components and styling in one tool. Adding Tailwind would mean two styling systems fighting each other.

## React Router 8

The web app uses React Router 8 in framework mode, with server rendering on. It is the current major, and loaders, middleware and client loaders work the way the hydration plan needs. Starting on v7 would mean adopting the previous major.

## Client freshness matches the server

A list or a detail stays fresh in the browser for 60 seconds, history for 5 minutes, and the filter lists for an hour. Those are the same lifetimes the API already uses. I didn't use 60 seconds for everything, because history and filters change more slowly and the browser would ask for them again while the server still has a fresh copy.

## Dehydrate when the page is serialized

Loaders on one request run at the same time, so the root loader cannot snapshot the cache while another loader is still fetching. The dehydrated state is read when React Router serializes the page, which is after every loader has finished. I didn't dehydrate at the end of the root loader function, because that runs too early.

A query that is still running is part of that snapshot, as a promise that streams to the browser. Only finished queries used to be sent, so history was missing on the first load and the browser called the API again. I didn't make the loader wait for history, because the hero should paint before the chart.

## The browser calls the API directly

The server render and the browser both call the API at its own URL. I allow any origin, because the responses are public and the request sends no cookies. I didn't proxy the API through the web app, because a proxy on `/opportunities` would collide with the item page, and a proxy that exists only in dev would be missing when the production server runs.

## Filters live in the address bar

The filter controls read and write the page URL, and the loader parses that URL with the same schema as the API. I didn't keep the filters in component state, because a reload, a shared link and the back button would then disagree with the list.

## An empty filter has a total of zero

When nothing matches, Merkl's total TVL is null. I read that as zero, so the list comes back empty instead of as an error. I didn't reject the response, because an empty filter is a normal page.

## An empty list is not an error

When nothing matches, the page stays up and says so, with the filters still there. I didn't send that through the error boundary, because an empty filter is a normal result and the controls have to stay usable.

## The explorer layout stays in Chakra

The list design was written for Tailwind, Radix and a motion library. I drew it with Chakra, which the app already uses. I didn't add Tailwind, because two styling systems would fight. I didn't show a rewards total or a change since yesterday, because I would have had to invent them. I didn't make a row a link, because the item page is not built yet.

## The next filter shows before the list

I mark the clicked segment immediately. If that list is still fresh in the cache I show it at once. If it is not, I put skeletons in the rows until the loader finishes. I didn't leave the previous rows up under a filter I have not loaded, because they would look like they already belong to it.

## The time box is over

The three hours are past, so I am cutting the polish. I will not add motion, prefetch on hover, or keepPreviousData. The list already selects a filter at once and shows skeletons only when that list is not fresh.

I am keeping the item page, because the exercise asks for one. After it I will add one Playwright test: the first load does not call the API from the browser, and going back is served from the cache.

## The item page shows recent history in a table

The exercise asks for an item page, so each row links to one. The loader waits for the opportunity and starts the history without waiting, so the hero can paint while those points are still on the way. Hovering a row prefetches that page. I did not draw a chart, because a working page matters more than a half finished one, and the recent APR and TVL already come from the history.

## History is a chart

The history was already loading behind the hero, so I drew it with Recharts instead of leaving the table. APR opens on the last seven days. TVL, thirty days and the full series are the other views. The change since yesterday is the newest point minus the point from a day earlier.

## Hover loads the opportunity

The link prefetch downloads the page code. It does not run the client loader, so the detail and the history were still fetched when the row opened. On hover and on focus I load both into the browser cache. I kept the link prefetch, because the code still has to arrive. A second pass while those entries are fresh does not call the API again.
