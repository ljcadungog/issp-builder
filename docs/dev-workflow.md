# Dev Workflow — Verify Locally & Open a PR

Repeatable runbook for making a change, proving it green locally, and getting it onto
`main` as a clean squashed commit. This is the workflow established in the
`agentic-dev-improvements` effort (CI fixes, Node pin, lint cleanup).

> TL;DR gate order: **prisma generate → tsc → lint → test → build → commit → PR → squash-merge.**

---

## 0. Environment prerequisite — Node ≥ 20.19 (target 22 LTS)

Prisma 7.8.0 requires Node `^20.19 || ^22.12 || >=24`. On older Node (e.g. 20.12)
`prisma generate` crashes with `ERR_REQUIRE_ESM`. The requirement is pinned in-repo:

- `package.json` → `engines.node`
- `.nvmrc` → `22.22.3`

Activate the right version:

```bash
nvm install 22.22.3 && nvm use 22.22.3   # honors .nvmrc in this folder
node --version                            # expect v22.x
```

> **Windows + agent gotcha:** `nvm-windows` produces **no output and installs nothing**
> when its stdio is redirected (i.e. when driven by an automated/non-interactive shell),
> and `nvm use` rewrites the symlink under `C:\Program Files\nodejs` (needs an elevated
> shell). Run nvm yourself in an interactive terminal. If a tool must verify on Node 22
> without nvm, the fallback is a **standalone Node build**: download
> `https://nodejs.org/dist/v22.22.3/node-v22.22.3-win-x64.zip`, extract, and call its
> `node.exe` / `npm.cmd` / `npx.cmd` directly (prepend its dir to `PATH` for the command).

---

## 1. Local verification gates

Run in this order from the project root (Node ≥ 20.19 active):

```bash
npx prisma generate            # generate the gitignored @/generated/prisma client — REQUIRED before tsc/build
npx tsc --noEmit               # type check — must be exit 0
npm run lint                   # eslint — must be 0 ERRORS (pre-existing warnings are tolerated)
npm test                       # vitest — all suites pass
npm run build                  # full production build (Next also type-checks + lints here)
```

For the build, mirror CI's env:

```bash
NEXT_PUBLIC_BASE_PATH="" NEXT_TELEMETRY_DISABLED=1 npm run build
```

A change is **not ready for a PR** until all five are green. The `build` step is the
comprehensive final gate and catches things `tsc`/`lint` alone miss.

These mirror the CI jobs in `.github/workflows/ci.yml` (`lint`, `typecheck`, `test`,
`build`). Note the `typecheck` job runs `npx prisma generate` before `tsc` for exactly
the reason above — the generated client is gitignored.

---

## 2. Commit on a feature branch

Never commit directly to `main`. Work on a feature branch (e.g. `agentic-dev-improvements`):

```bash
git checkout -b <feature-branch>     # if not already on one
git add <specific files>             # stage explicitly; do NOT add stray artifacts
                                     #   (e.g. .claude/scheduled_tasks.lock, coverage/, src/generated/)
git commit -m "<type(scope): subject>"   # conventional-commit style; explain WHY in the body
git push origin <feature-branch>
```

Keep commits focused. The branch lands as **one** squashed commit (step 4), so commit
granularity here is for review/history, not the final tree.

---

## 3. Open the PR (GitHub API — no `gh` CLI in this env)

PR goes to **`origin`** (`ljcadungog/issp-builder`), base `main`. `upstream`
(`carlosalbornoz/...`) is never a PR target.

There is no `gh` CLI here, so create it via the REST API using the stored git
credential. The token must be a **fine-grained PAT with `Pull requests: Read and write`**
on this repo (being a repo admin does *not* grant the token that permission — it's a
separate per-permission grant; missing it returns `403 Resource not accessible by
personal access token`).

```powershell
# PowerShell — does not echo the token
$cred = "protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
$token = ($cred | Select-String '^password=(.*)$').Matches.Groups[1].Value
$body  = Get-Content "$env:TEMP\pr-body.md" -Raw      # write the body to a file first
$payload = @{ title = "<title>"; head = "<feature-branch>"; base = "main"; body = $body } | ConvertTo-Json
$headers = @{ Authorization = "token $token"; "User-Agent" = "issp-pr-script"; Accept = "application/vnd.github+json" }
$r = Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/ljcadungog/issp-builder/pulls" -Headers $headers -Body $payload -ContentType "application/json"
Write-Output ("PR #{0}: {1}" -f $r.number, $r.html_url)
```

**PR body convention — human *and* agent readable.** Lead with human prose
(Summary / What's included / Verification), then append a fenced ```yaml change
manifest (areas, key_files, verification, follow_ups). The body is written to double as
the squash-merge commit message.

---

## 4. Merge as a single squashed commit

On the PR, after all four CI jobs are green, use **"Squash and merge"**. The PR
title/body becomes the single commit message on `main`. (We squash at merge time rather
than force-pushing a rewritten branch — non-destructive.)

---

## Gotchas learned (and their fixes)

| Symptom | Cause | Fix |
|---|---|---|
| `prisma generate` → `ERR_REQUIRE_ESM` | Node < 20.19 | Use Node ≥ 20.19 / 22.12 (see §0) |
| CI `typecheck` red: `Cannot find module @/generated/prisma/client` | client is gitignored + `npm ci --ignore-scripts` skips the `postinstall` | `npx prisma generate` step before `tsc` (already in CI) |
| CI install fails on Linux: `EBADPLATFORM ... wanted win32` | a Windows-only native binary (e.g. `@rolldown/binding-win32-x64-msvc`) hard-pinned in `dependencies` | Never pin platform binaries directly — they belong in a parent's `optionalDependencies`. Remove from `package.json` + prune from `package-lock.json` |
| `next build` warns "inferred workspace root … multiple lockfiles" | a stray `package-lock.json` in a parent dir (e.g. `C:\Users\<you>\`) | Delete the stray lockfile, or set `turbopack.root` in `next.config.ts` |
| ESLint: "Unused eslint-disable directive" | `// eslint-disable-next-line` only covers the **next** line; the real violation is further down | Move/remove the directive; prefer fixing the code over disabling |
| ESLint `set-state-in-effect` | synchronous `setState` inside `useEffect` to re-seed state on prop change | Remount via `key=` from the parent and seed with `useState` initializers, or adjust state during render with a prev-value guard |

---

See also: `.claude/memory/index.md` (status + key constants), `.claude/memory/deployment.md`
(production deploy), and `AGENTS.md` (task playbooks).
