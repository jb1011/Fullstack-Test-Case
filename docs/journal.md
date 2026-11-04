# Journal

One entry per commit, explaining what changed and why.

## 0.1 Add README, gitignore and docs skeleton

**What:** the README describing the target architecture and roadmap, a `.gitignore`, this journal and `docs/decisions.md` with the decisions taken during planning.

**Why:** I want the plan written down before any code, so every following PR can be checked against it.

**Tests:** none, documentation only.

## 1.1 Init npm workspaces

**What:** a root `package.json` declaring `apps/*` and `packages/*` as workspaces, empty `@merkl/api`, `@merkl/web` and `@merkl/shared` packages, `.nvmrc`, `.editorconfig` and the lockfile.

**Why:** when I run `npm install` at the root, npm links each workspace into `node_modules/@merkl`, so the apps can later import `@merkl/shared` like any package, without publishing it. I pin Node 22 because it is a supported LTS release and covers everything the stack needs. `.editorconfig` keeps indentation and line endings identical in every editor before Prettier exists.

**Tests:** none yet, there is no code. I checked that `npm install` links the three workspaces.
