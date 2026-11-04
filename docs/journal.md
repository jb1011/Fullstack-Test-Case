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
