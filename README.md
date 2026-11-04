# Merkl Opportunities Explorer

[![CI](https://github.com/jb1011/Fullstack-Test-Case/actions/workflows/ci.yml/badge.svg)](https://github.com/jb1011/Fullstack-Test-Case/actions/workflows/ci.yml)

A fullstack SSR application that lets you browse [Merkl](https://merkl.xyz) opportunities through my own API, which sits in front of the [Merkl API](https://api.merkl.xyz/docs).

> Status: planning. This README describes the target architecture and the roadmap. Each section will be updated as the pull requests land.

## The task

1. Pick one Merkl resource and expose it through my own API.
2. Cache to prevent overfetching the Merkl API.
3. Display the data in a list page and an item page, rendered on the server.
4. Offer at least 3 filters on the list.

I chose **opportunities**: it is the core resource of Merkl, and the Merkl API supports every filter I need on its side.

## Stack

| Area     | Choice                                                                                |
| -------- | ------------------------------------------------------------------------------------- |
| Monorepo | npm workspaces: `apps/api`, `apps/web`, `packages/shared`                             |
| API      | Node, Express 5, TypeScript, Zod, pino                                                |
| Web      | React Router v7 (framework mode, SSR), TanStack Query v5, Chakra UI, motion, Recharts |
| Shared   | Zod schemas and inferred types, consumed as TypeScript source (no build step)         |
| Tooling  | strict TypeScript, ESLint (flat config, typescript-eslint, react-hooks), Prettier     |
| Tests    | Vitest, Supertest, MSW, Testing Library, Playwright (end to end, last)                |

## Architecture

```
Browser ──> apps/web (React Router SSR) ──> apps/api (Express) ──> api.merkl.xyz
                  │                              │
           TanStack Query cache          in memory server cache
             (per user)                  (shared by all users)
```

### Why my own API in front of Merkl

1. **One cache shared by every user.** With SSR, every first load and every refresh, from every user, runs a server loader. If that loader called Merkl directly, Merkl would be hit once per page view. A browser cache cannot prevent that because it only helps a single user. Only a server cache can protect Merkl.
2. **Slim payloads.** Merkl opportunity objects are large. My API maps them to small DTOs containing only what the UI renders.
3. **Isolation from upstream changes.** If Merkl renames a field, I fix one mapper and the frontend never notices.
4. **One validated contract.** The Zod schemas in `packages/shared` define queries and responses. The API validates with them and the web app parses its URL with them.
5. **One place for secrets and limits.** An API key, rate limiting or retries would live here, never in the browser.

### API layers

`merkl client` (fetch and Zod parsing of only the fields I use) → `mappers` (Merkl objects to DTOs) → `services` (wrapped by the cache) → `routes` (thin, validated).

### Endpoints

| Method | Path                         | Purpose                                                      |
| ------ | ---------------------------- | ------------------------------------------------------------ |
| GET    | `/opportunities`             | Filtered, sorted, paginated list plus total count            |
| GET    | `/opportunities/:id`         | Opportunity details                                          |
| GET    | `/opportunities/:id/history` | APR and TVL records, separate so the item page can stream it |
| GET    | `/filters`                   | Chains, protocols and actions for the filter controls        |
| GET    | `/health`                    | Liveness                                                     |

`GET /opportunities` accepts `chain`, `protocol`, `action`, `status` (comma separated lists), `minTvl`, `maxTvl`, `minApr`, `search`, `sort` (`apr`, `tvl`, `rewards`), `order`, `page` (from 1) and `pageSize` (up to 100). The schema lives in `packages/shared/src/query.ts`.

Filtering always happens on Merkl's side: the Merkl client translates these into Merkl's own parameters (`chainId`, `mainProtocolId`, `minimumTvl`, ...) instead of downloading every opportunity and filtering locally. The list and the count (`/v4/opportunities/count`) are requested in parallel.

Cross cutting concerns: environment config validated with Zod, a validation middleware, a central error handler (Express 5 forwards async errors natively), structured logs with pino, and a `Cache-Control` header on every response.

## Caching

There are two layers with two different jobs.

### Server cache (protects Merkl)

- **Normalized keys**: parameters are sorted and empty ones dropped, so `?chain=1&status=LIVE` and `?status=LIVE&chain=1` hit the same entry.
- **TTL with stale while revalidate**: an expired entry is served immediately while a single background refresh runs.
- **In flight deduplication**: the pending promise is stored, so if 10 users ask for the same thing at once, Merkl receives one call.
- **Bounded size (LRU)**: keys come from user input, so memory must stay bounded.
- **Errors are never cached**: if Merkl fails, the stale entry is served instead.
- **Lifetimes per data type**: Merkl itself sends `max-age=240`, so caching longer than that makes no sense.

| Data                 | Fresh | Served stale up to |
| -------------------- | ----- | ------------------ |
| Lists and details    | 60 s  | 240 s              |
| APR and TVL history  | 5 min | 15 min             |
| Chains and protocols | 1 h   | 6 h                |

- **Storage behind an interface**: in production I would plug Redis in so every API instance shares the cache. I document it but do not build it.
- **Injected clock and fetcher**: the cache is tested with fake timers.

### Client cache (makes navigation instant)

TanStack Query keeps data per user, so going back to a list or reopening an item renders instantly.

## SSR and hydration

React Router loaders and TanStack Query both want to own the data. I use the pattern TanStack recommends for SSR frameworks:

1. **Server: one `QueryClient` per request**, created in a React Router middleware and passed to loaders through `context`. Sharing one across requests would leak one user's data to another. Loaders `await prefetchQuery`, and the cache is dehydrated into the HTML.
2. **Client: one `QueryClient` for the whole session**, with a `HydrationBoundary`. Components only call `useQuery` or `useSuspenseQuery`, exactly like a client rendered app.
3. **`clientLoader` with `ensureQueryData`**: without it, React Router would call the server loader on every client navigation and bypass the TanStack cache.
4. **Streaming secondary data**: on the item page the opportunity is awaited (critical for first paint and SEO), while the history is prefetched without awaiting and the chart streams in behind a Suspense skeleton.
5. **`queryOptions` factories in one file**, shared by loaders, client loaders and components, so query keys can never drift apart.
6. **`staleTime` above zero (about 60 s)**, otherwise the client would refetch right after hydration and waste the server fetch.

Rejected alternatives:

- **`initialData` from the loader**: simpler, but React Router reruns the server loader on every navigation, so TanStack saves nothing, and freshness depends on manually setting `initialDataUpdatedAt`.
- **SSR for the first load, then plain client fetching**: familiar, but every client navigation shows a loading state.

## Frontend

- **Filter state lives in the URL**, parsed with the shared Zod schema: SSR renders the right results, links are shareable and the back button works.
- **Filters**: chain, protocol, action, status, minimum and maximum TVL, minimum APR, search, sort, pagination.
- **List page**: name, chain, protocol, token icons, APR, TVL, status, and a header with the total TVL matching the filters (`/v4/opportunities/aggregate/tvl`).
- **Item page**: details, tokens, and an APR and TVL chart.

### Focus: making it feel instant

- Previous results stay on screen while new filters load (`keepPreviousData`), instead of flashing a loader.
- Hovering a row prefetches its item page.
- Skeletons instead of spinners.
- Animated transition from the list to the item page.

## Testing

Every commit ships with unit tests:

- **shared**: schema parsing and normalization.
- **api**: Merkl client and mappers against MSW, cache with fake timers, routes with Supertest.
- **web**: components and URL state with Testing Library.
- **end to end**: Playwright on the main flows, at the end.

## Roadmap

1. **Tooling and monorepo scaffold** (done): workspaces, strict TypeScript, ESLint, Prettier, Vitest, single `npm run dev`.
2. **CI** (done): GitHub Actions running format check, lint, typecheck and tests on every PR.
3. **Shared query contract** (done): Zod enums and the opportunities query schema.
4. **API, Merkl client, DTOs and mappers**: DTO schemas designed from real Merkl responses, tested with MSW.
5. **API, routes**: a working API with validation and errors, tested with Supertest.
6. **API, cache**: TTL, stale while revalidate, deduplication, LRU, `Cache-Control`, tested with fake timers.
7. **Web, SSR foundation and list page**: QueryClient middleware, hydration, filters in the URL.
8. **Web, item page**: details, streamed chart, `clientLoader`.
9. **Polish and end to end tests**: prefetching, skeletons, transitions, Playwright.

## Documentation

- `docs/decisions.md`: why I picked what I picked, and what it costs.
- `docs/journal.md`: one entry per commit, explaining what changed and why.

## Getting started

Prerequisites: Node 22 (see `.nvmrc`) and npm 10.

```bash
nvm use
npm install
npm run dev
```

| Command                | What it does                                |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Starts every workspace in watch mode        |
| `npm test`             | Runs every workspace's tests once           |
| `npm run test:watch`   | Runs tests in watch mode                    |
| `npm run typecheck`    | Type checks every workspace                 |
| `npm run lint`         | Lints the whole repository                  |
| `npm run format:check` | Checks formatting (`npm run format` to fix) |
