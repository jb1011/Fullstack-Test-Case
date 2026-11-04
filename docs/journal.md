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
