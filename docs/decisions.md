# Decisions

One section per decision: the context, what I chose, what I rejected and what it costs.

## Opportunities as the resource

**Context:** the task asks me to pick one Merkl resource among opportunities, campaigns and tokens.

**Choice:** opportunities.

**Alternatives rejected:** campaigns are a lower level detail of an opportunity, and tokens offer few meaningful filters.

**Tradeoffs:** none significant. Merkl filters opportunities on its side (chain, protocol, action, status, TVL, APR, search, sort), so every filter I need already exists upstream.

## My own API in front of Merkl

**Context:** with SSR, every first load and every refresh, from every user, runs a server loader. If that loader called Merkl directly, Merkl would receive one call per page view.

**Choice:** an Express API between the web app and Merkl.

**Alternatives rejected:** calling Merkl from the React Router loaders. It works, but there is no shared place to cache, payloads stay large, and the frontend depends on Merkl's schema.

**Tradeoffs:** one more service to run. In exchange I get a cache shared by all users, slim DTOs, isolation from upstream changes, one validated contract, and a single place for secrets and rate limits.

## Filtering on Merkl's side

**Context:** I can either pass filters to Merkl or download every opportunity and filter locally.

**Choice:** pass filters through, and request the list and `/v4/opportunities/count` in parallel.

**Alternatives rejected:** downloading everything. Thousands of opportunities, 100 per page at most, meage memory footprint just to shns many upstream calls and a larow 20 rows.

**Tradeoffs:** each distinct filter combination is its own cache entry, so the hit rate is lower than with one big cached dataset.

## Two cache layers

**Context:** the task requires preventing overfetching of Merkl's API. TanStack Query only caches inside one browser, so it cannot stop many users from triggering many upstream calls.

**Choice:** an in memory server cache in the API (normalized keys, TTL with stale while revalidate, in flight deduplication, LRU bound, errors never cached) plus TanStack Query in the browser.

**Alternatives rejected:** TanStack Query alone, which does not protect Merkl. Redis, which is the production answer when the API runs on several instances, but is out of scope here. The store sits behind an interface so swapping it is one adapter.

**Tradeoffs:** data can be up to 240 seconds old, which matches the `max-age=240` Merkl already sends. Each API instance has its own cache until Redis is plugged in.

## SSR hydration with TanStack Query

**Context:** React Router loaders and TanStack Query both want to own the data.

**Choice:** one `QueryClient` per request on the server created in a React Router middleware, loaders awaiting `prefetchQuery`, the cache dehydrated into the HTML and hydrated by a client side singleton. A `clientLoader` calls `ensureQueryData` so client navigation reads the cache. Secondary data (history) streams behind Suspense. Query keys come from shared `queryOptions` factories, and `staleTime` is about 60 seconds.

**Alternatives rejected:** `initialData` from the loader, because the server loader reruns on every navigation and freshness needs manual `initialDataUpdatedAt`. SSR on first load followed by plain client fetching, because every navigation would show a loading state.

**Tradeoffs:** more wiring than either alternative, in exchange for components that use TanStack exactly like a client rendered app.

## npm workspaces

**Context:** the repository holds an API, a web app and a shared package.

**Choice:** npm workspaces, with `packages/shared` consumed as TypeScript source.

**Alternatives rejected:** pnpm, which is stricter and faster but adds a tool to install. A build step for the shared package, which would slow down development for no benefit since both apps compile TypeScript anyway.

**Tradeoffs:** npm runs workspace scripts sequentially, so a single `npm run dev` needs `concurrently`.

## Chakra UI only

**Context:** I need accessible components and a styling system.

**Choice:** Chakra UI v3 for both.

**Alternatives rejected:** Chakra next to Tailwind, which means two styling systems with conflicting resets and specificity. Radix with Tailwind, which works well but means assembling more pieces myself.

**Tradeoffs:** Chakra relies on CSS in JS (Emotion), which needs a little SSR setup with React Router.
