# Journal

What I did in each commit, and why.

## 0.1 Add README, gitignore and docs skeleton

I wrote the plan down before any code, so every PR can be checked against it.

## 1.1 Init npm workspaces

Three empty packages: `api`, `web` and `shared`. `npm install` links them into `node_modules/@merkl`, so the apps can import `@merkl/shared` without publishing it. Node is pinned to 22, the LTS already on my machine.

## 1.2 Add strict TypeScript base config

One strict base config that every package extends. The API adds Node types, the web app adds DOM types, and `shared` gets neither so it can't depend on either side. `noUncheckedIndexedAccess` makes `array[0]` possibly `undefined`, which catches bugs when mapping API data.

Tested: `npm run typecheck` passes, and a file reading `xs[0]` into a `string` is rejected.

## 1.3 Add ESLint flat config and Prettier

One ESLint config at the root for the whole repo, using typescript-eslint's strict type aware rules. Prettier handles formatting, and `eslint-config-prettier` turns off the ESLint rules that would fight it. React rules come with the web app in PR 7.

Tested: `npm run lint` and `npm run format:check` pass. A file with a floating promise and an `any` gets 3 errors.

## 1.4 Add Vitest with one project per workspace

One `npm test` at the root runs every workspace, and each workspace keeps its own config so the web app can use a browser like environment later without affecting the API. The API smoke test imports `@merkl/shared`, which proves the workspace link and the TypeScript source export both work. The web app joins in PR 7 when it has code.

Tested: 2 smoke tests pass, and `npx vitest --project api` runs a single workspace.

## 1.5 Add root dev script with concurrently

`npm run dev` starts every `dev:*` script at the root in parallel, each with its own colored prefix. For now that's only the API, running under `tsx watch` so it restarts on every save. The web app becomes one more `dev:web` line in PR 7.

Tested: I ran `npm run dev`, edited `src/index.ts`, and tsx reran it under the `[api]` prefix.

## 2.1 Add GitHub Actions workflow

Every PR and every push to `main` runs format check, lint, typecheck and tests. A matrix turns them into four parallel jobs, so one failure doesn't hide the others and each shows up as its own check on the PR. Node comes from `.nvmrc`, so CI and my machine always use the same version.

Tested: I replayed the CI steps locally (`npm ci` then the four scripts) and they pass. The real proof is this PR's checks.

## 2.2 Cancel superseded runs and add README badge

If I push twice to a PR, the first run is cancelled because only the latest commit matters. On `main` nothing is cancelled, so every merge gets checked. The README badge shows the status of `main`.

Tested: the cancel behavior shows up on this PR's checks when I push again.

## 3.1 Add opportunity enums

Status, action, sort and order as Zod enums in `shared`, each exporting its schema and its TypeScript type. The values come from Merkl's docs, and I checked them against 618 live opportunities. I only expose three sorts (APR, TVL, rewards) because that's what the list page offers. I used Zod enums instead of TypeScript `enum` because they validate at runtime and don't need a compile step.

Tested: valid values pass, unknown and wrong case values fail, and the action list matches Merkl's. The `shared` smoke test is gone now that real tests replace it.

## 3.2 Add opportunities query schema

One Zod schema turns raw URL strings into a typed query: lists like `chain=42161,1` become sorted unique arrays, numbers are coerced, blanks count as absent (so `minTvl=` isn't read as 0), and defaults fill the rest. `serializeOpportunitiesQuery` does the reverse and always gives the same string for the same filters, whatever the order in the URL. The API will validate requests with it, the web app will build its URLs with it, and the cache will use the string as its key.

Tested: 20 cases covering defaults, lists, coercion, blanks, invalid values, min above max, and a round trip. Breaking the blank handling makes a test fail.

## 4.1 Add Merkl client for opportunities

A small client for Merkl's list, count and detail endpoints. It translates my query names into Merkl's, gives up after 5 seconds, and parses responses with a Zod schema that keeps only the fields I use. Every failure becomes a `MerklError` with a `kind` (timeout, network, not found, http, invalid response), so the routes can later turn each one into the right HTTP status.

Before writing the schema I checked 618 live opportunities: 96 have no protocol and many have no deposit URL or campaign dates, so those fields are optional. The test fixtures are real Merkl responses, including one without a protocol.

Tested: MSW fakes Merkl and fails any request without a handler. The tests cover the translated parameters, parsing, and every error kind including the timeout. I also ran the client once against the real API: 618 opportunities parsed without error.

## 4.2 Add Merkl client for history and filters

The rest of what the app needs from Merkl: APR and TVL history (one point per day, 90 days by default) for the item page chart, the total TVL of everything matching the filters for the list header, and chains and protocols for the filter dropdowns. Merkl has 247 protocols, so one request of up to 500 gets them all without paging.

Tested: new fixtures recorded from real responses, tests for each method and the parameters it sends.

## 4.3 Add response DTO schemas

The shapes my API sends, in `shared` so the web app uses the same types. I designed them from the fixtures: a list row (name, chain, protocol, action, status, APR, TVL, daily rewards, tokens), the item page adds description, deposit link and campaign dates, and the list response carries the total count and total TVL so the header needs no extra request.

Tested: realistic examples parse, an opportunity without a protocol is accepted, an unknown status and a non ISO date are rejected.

## 4.4 Map Merkl objects to DTOs

Plain functions that turn what Merkl sends into what my API returns. They clean up Merkl's quirks in one place: empty icons and missing fields become `null`, campaign dates go from unix seconds to ISO, history goes from newest first in seconds to oldest first in milliseconds. The filters list sorts chains and protocols by name and hides the `INVALID` action.

Tested: the real fixtures are mapped and every result is validated against the shared DTO schemas, so the mapper and the contract can't disagree. Unknown actions, malformed dates and missing fields are covered too.

## 5.1 Add app factory, env config, logger, health route and error handler

The API now runs. `createApp(deps)` builds the Express app from what it's given instead of creating things itself, so tests can pass in a silent logger now and a fake Merkl later. `index.ts` is the only file that reads the environment, starts listening and closes the server on Ctrl+C. Env variables are checked with Zod at startup and all have defaults, so `.env` is optional. Logs come from pino, pretty in dev and JSON elsewhere.

Every error leaves as a problem body (RFC 7807, the same format Merkl uses): Merkl not found becomes 404, Merkl timing out 504, any other Merkl failure 502, and anything unexpected a bare 500 that's logged but never shows its message.

Tested: Supertest calls the health route, an unknown route, and a route throwing each kind of error. MSW now lets local requests through so Supertest can reach the app, and I checked that a request to the real Merkl still fails. I also started the server and hit it with curl.

## 5.2 Add query validation middleware

`validateQuery(schema)` checks the query string before the route runs and answers 400 with a problem body naming every invalid field. It uses the opportunities schema from `shared`, so the defaults, the sorted lists and the blank values behave the same as they already do there. `createApp` takes the routers to mount and uses the extended query parser, because the default one keeps only the last value of a repeated key and `chain=1&chain=42161` would have dropped Ethereum.

Tested: defaults, comma lists, repeated keys, blanks, an unknown parameter, a 400 that names both bad fields, a minimum TVL above the maximum, and a route that reads the query without the middleware (500, message hidden).

## 5.3 Add opportunities routes

The list, the detail and the history are real endpoints now. A route only checks the query, calls the opportunities service and sends the DTO. The service asks Merkl for the page, the count and the total TVL at the same time, then maps them. A missing opportunity, and one with an action I don't know, both come back as 404. A Merkl failure still becomes 502 or 504 through the error handler.

Tested: Supertest against MSW. The list matches the shared schema and Merkl receives page 0 when I ask for page 2. An invalid query never reaches Merkl. An id that isn't a number is 400, an unknown numeric id and an unknown action are 404, and a Merkl 500 is 502. The history comes back oldest first.

## 5.4 Add filters route

`GET /filters` feeds the dropdowns. The service asks Merkl for chains and protocols at the same time, and the actions come from my own enum with `INVALID` left out, so the list doesn't depend on downloading every opportunity. Chains and protocols are sorted by name.

Tested: the response matches the shared schema, protocols are requested with `items=500` and come back sorted even when Merkl sends them backwards, and a Merkl 500 becomes a 502 that hides the upstream message.

## 6.1 Add cache store interface and in memory LRU store

The cache sits behind `get`, `set` and `delete`, and the memory store is the `lru-cache` package. It keeps a fixed number of entries and drops the least recently used one when it is full. Reading or replacing an entry makes it the newest. Values are copied on the way in and out, because the package stores the object you give it and a caller must not be able to change what the next request gets.

Tested: a missing key, null as a real value, an update that does not grow the store, eviction, a read that saves an entry from eviction, copying, delete, and a store that refuses undefined and a non positive size.

## 6.2 Add a TTL per entry

`set` takes a TTL in milliseconds. A list is fresh for 60 seconds, history for 5 minutes, and chains and protocols for an hour. After that, `get` returns nothing and the caller fetches again. Leaving the TTL off keeps the entry until the size limit drops it, which is what the eviction tests use.

Tested: a value is present at the exact TTL and gone one millisecond later, two keys expire on their own, replacing a value restarts its TTL, an entry with no TTL survives the longest lifetime, and a non positive TTL is refused.

## 6.3 Share in flight loads and keep the last value when a load fails

`load` returns a fresh value without fetching. When several callers miss the same key together, the fetcher runs once and they all wait on it. If the fetch fails and a previous value is still stored, that value is returned, but `get` still returns nothing because the TTL has passed. The error is not stored, so the next `load` tries again.

Tested: two callers share one fetch, a fresh key is not fetched again, an expired key is, a failure with nothing stored throws, and a failed refresh returns the previous value twice without making it fresh.

## 6.4 Cache Merkl calls in the services

The cache now wraps the opportunities service. A list is stored under the normalized query, so the same filters share one entry, and that entry is the page, the count and the total TVL together. A detail stays fresh for 60 seconds, its history for 5 minutes, and the filter lists for an hour. I asked Merkl for the first page of Ethereum opportunities: the first call took 343 ms, and the same call came back from the store in 0.3 ms.

Tested: two queries that mean the same thing share one fetch, a different page fetches again, each lifetime expires on its own, a missing opportunity is remembered, a failed fetch is not stored, and a failed refresh returns the previous list.

## 6.5 Set Cache-Control per route

Each successful response tells caches how long it stays fresh, and that time is the same one the server uses: 60 seconds for a list or a detail, 5 minutes for history, and an hour for filters. The data is public, since it doesn't depend on the caller. Health and every error are `no-store`, so a down check or a 502 is never saved.

Tested: the list and the detail send `max-age=60`, history sends `300`, filters sends `3600`, and a 400, a 404, a 502 and the health check send `no-store`.

## 7.1 Scaffold React Router with Chakra UI and server rendering

The web app is React Router 8 with server rendering, styled with Chakra. The server pulls Emotion styles into the HTML stream, so the first paint already has CSS. `npm run dev` starts it beside the API, and CI builds the app along with the other checks.

Tested: the home page renders its title, a server render of that page includes Chakra styles, and `npm run build` completes.

## 7.2 Add the API client and query factories

The web app now has one client for my API, and one set of TanStack query factories. A list is keyed by the normalized query, so two requests that mean the same thing share a cache entry. A list or a detail stays fresh for 60 seconds, history for 5 minutes, and the filter lists for an hour, the same times the API keeps them. Nothing on the page calls this yet.

Tested: the client sends the normalized query and parses the DTOs, a 404 comes back as the problem detail, a bad payload is rejected, and equivalent filters produce the same query key.

## 7.3 Add per request QueryClient and hydration

Each request gets its own QueryClient in middleware, so one render cannot see another request's data. The root loader hands that cache to the HTML after every loader on the request has finished, and the browser restores it into one client for the session. A URL that matches nothing never runs middleware, so that error page gets an empty client of its own. TanStack Query and React Router devtools are on while I am developing.

Tested: two requests get different clients, a query that resolves after the loader data is created is still in the dehydrated state, and a hydrated `useQuery` renders that data without fetching again.

## 7.4 Add the list page with a loader and a client loader

The home page now shows the first page of live opportunities. The server loader fetches that page into the request cache, and the component reads it with `useQuery`. On a later visit in the browser, the client loader uses the same query, so a fresh list is not fetched again. The API allows any origin so the browser can read that response.

Tested: the loader requests the default list once, a hydrated client loader does not request it again, the page renders the opportunity, and every API response allows any origin.

## 7.5 Sync the filters with the URL

The list now follows the query in the address. Chain, protocol, action, status, TVL, APR, search and sort are form controls, and the loader parses them with the shared schema before it fetches the page and the filter choices. Changing a filter starts again at page 1, and a fresh result is not fetched twice. Reset clears the address back to the default list. Merkl sends a null total when nothing matches, so I treat that as zero and the page stays empty instead of failing.

Tested: a filtered URL is requested once and reused after hydration, choosing a chain writes that chain into the URL and loads that list, reset clears the address, and a null total becomes zero.

## 7.6 Add pagination and a total TVL header

The header shows the total TVL of everything matching the filters, which is already part of the list response, so it does not take another request. Previous and next write the page into the address and leave the other filters alone. The first and last pages stop there.

Tested: the header shows the total from the list, and next keeps the chain filter while loading page 2.

## 7.7 Add an error boundary and an empty state

A list that matches nothing now says so, and the filters stay so the query can be changed. A failed load becomes a short message, because the browser otherwise receives a plain error and loses the reason. The error boundary shows that message and a way to try again.

Tested: an empty list shows the message and hides the pages, a page past the end says that page is empty, an invalid address says the filters are not valid, and a loader error shows the boundary.

## 7.8 Restyle the list

The list now looks like the explorer: a light page, Geist, two totals, a filter bar and a table. The design notes used Tailwind, so I put the same colours and sizes into the Chakra theme. Sort sits in the column headers. Maximum TVL and minimum APR still work from the address. Active filters stay in the bar, with no second row of tags, so the list does not jump when the first filter is chosen. A segment such as Lend or Soon selects immediately. The rows become skeletons only when that list is not already fresh in the cache. I left out a rewards total and a TVL change, because those numbers are not in the API. A row does not open an item page yet, and hovering it does not show View. The time box is past, so after the item page I will only add one Playwright test and skip the rest of the polish.

Tested: a chain filter still writes the URL and loads that list, reset clears the address, the totals and the next page still work, the empty and error states still show, Lend is pressed while a new list is loading, and a cached list shows without skeletons.

## 7.9 Fix the home test type

The test that holds a list until I release it was assigning the promise resolve directly. Typecheck rejects that, because that function does not return undefined. It now calls resolve from a function with the right type.

Tested: the web typecheck passes.

## 8.1 Add the opportunity page

Each row now opens an opportunity page. The loader waits for the detail and prefetches the history, so the hero can show while the history is still loading. The hero shows the name, APR, TVL, daily rewards, chain, protocol, status and a deposit link when there is one. A missing opportunity is a 404. I put the latest history points in a table instead of a chart, because the page had to work and the chart can wait. A client error is not retried.

Tested: the page renders the hero and the newest history first, the hero stays up while history is loading, the loader returns while history is still pending, a fresh detail is not fetched again, and an unknown id shows the 404 boundary.
