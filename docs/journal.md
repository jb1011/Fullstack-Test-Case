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
