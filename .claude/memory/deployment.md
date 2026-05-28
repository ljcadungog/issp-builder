# Deployment — ph-issp-builder

---

## Production Environment

| Setting | Value |
|---|---|
| Server path | `/root/apps/issp` |
| Port | 3100 |
| Process manager | pm2 (`issp-builder` process name) |
| Base path | `/issp` (`NEXT_PUBLIC_BASE_PATH=/issp` in env) |
| Node.js | 24+ |
| npm | 11+ |

---

## Deploy Steps

```bash
# 1. Pull latest
cd /root/apps/issp
git pull

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Check for stale port holder (CRITICAL — see gotcha #1)
ss -tlnp | grep 3100
# If any PID shown: kill <pid>

# 5. Restart pm2
pm2 restart issp-builder

# 6. Verify
pm2 logs issp-builder --lines 30
```

---

## Critical Gotchas

### 1. Stale `next-server` process holds port 3100

`pm2 restart` silently fails when a stale `next-server` process is holding port 3100. The new process gets `EADDRINUSE` and never binds — old code keeps serving.

**Always** run `ss -tlnp | grep 3100` before restarting pm2. If a PID appears, kill it first.

```bash
ss -tlnp | grep 3100
# Example output: users:(("node",pid=12345,...))
kill 12345
pm2 restart issp-builder
```

### 2. P052 font must be installed on the server

PDF export requires the P052 / URW Palladio font:

```bash
apt-get install fonts-urw-base35
```

Without it, PDFs fall back to a generic serif and lose uniform formatting.

### 3. `/issp` basePath is mandatory for production

All internal links, API fetches, and static asset references must use the basePath:
- Navigation: `router.push("/editor")` — Next.js adds basePath automatically
- Static assets: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/uacs_active.min.json`
- **Never** hardcode `/issp/...` — use the env var or Next.js router

### 4. `/uacs` must be in the middleware allowlist

`src/proxy.ts` — if `/uacs` is missing from the public allowlist, it redirects to `/login`.
Pattern to follow: `isEditorRoute` / `isUacsRoute` checks + matcher exclusion.

---

## Development

```bash
npm run dev
# App: http://localhost:3000
# Editor: http://localhost:3000/editor
# No login required
```

Type check only (no emit):
```bash
npx tsc --noEmit
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_BASE_PATH` | Set to `/issp` in production; empty in dev |
| (Auth vars) | Only needed for dormant server-side routes |

---

## pm2 Config

Process name: `issp-builder`

Common commands:
```bash
pm2 status                        # see all processes
pm2 logs issp-builder --lines 50 # recent logs
pm2 stop issp-builder             # stop without deleting
pm2 delete issp-builder           # remove from pm2
pm2 start npm --name issp-builder -- start  # re-register
```
