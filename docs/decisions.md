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

Data can be up to 240 seconds old, which is what Merkl itself allows (`max-age=240`). With several API instances I'd move the cache to Redis. The storage is behind an interface so that's one adapter.

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

## CI as one matrix

I run the four checks as a matrix of parallel jobs instead of steps in one job. Each check shows up separately on the PR, and a lint error doesn't stop the tests from running.

The cost: `npm ci` runs four times, but the npm cache keeps it fast.

## Chakra UI only

Chakra gives me components and styling in one tool. Adding Tailwind would mean two styling systems fighting each other.

The cost: Chakra uses Emotion, which needs a bit of SSR setup.
