# AWS EC2 + pm2 Deployment — Design

## Goal

Make the University CMS monorepo (NestJS backend + Next.js frontend) deployable on an
already-provisioned Ubuntu EC2 instance, process-managed by pm2, fronted by Nginx with
TLS, with PostgreSQL running on the same instance.

## Context / constraints

- Monorepo: pnpm workspaces, `backend` (NestJS, port 3001, Prisma → PostgreSQL, GraphQL
  at `/graphql`) and `frontend` (Next.js 14, port 3000).
- EC2 instance already exists (Ubuntu 22.04/24.04), reachable via SSH. This design does
  not cover instance/security-group provisioning.
- Domain: `mohsin-javed.online`, DNS controlled by the user.
- Code reaches the instance via `git clone`/`git pull` from
  `https://github.com/Mohsin-Javed48/CMS-Dashboard.git`.
- PostgreSQL runs locally on the instance (not RDS).
- Claude has no SSH/network access to the instance in this session — this produces repo
  config files plus a runbook the user executes.

## Architecture

```
Internet
  │
  ├─ https://mohsin-javed.online      → Nginx → 127.0.0.1:3000  (Next.js, pm2)
  └─ https://api.mohsin-javed.online  → Nginx → 127.0.0.1:3001  (NestJS, pm2)
                                                     │
                                              PostgreSQL (localhost:5432)
```

A dedicated `api.` subdomain (rather than one domain with `/api` path-based routing) is
used so the GraphQL endpoint (`/graphql`) and any future subscriptions/websockets don't
need Nginx path-rewriting. One Let's Encrypt cert covers both names via
`certbot --nginx -d mohsin-javed.online -d api.mohsin-javed.online`.

## Components to add to the repo

1. **`ecosystem.config.js`** (repo root) — pm2 app definitions:
   - `cms-backend`: `node dist/main.js` in `backend/`, fork mode, env from
     `backend/.env` (`PORT=3001`, `NODE_ENV=production`).
   - `cms-frontend`: `next start -p 3000` in `frontend/`, fork mode,
     `NODE_ENV=production`.
   - Both: log file paths under a `logs/` dir, restart policy
     (`max_restarts`, `min_uptime`), `autorestart: true`.

2. **`deploy/nginx/cms-dashboard.conf`** — two server blocks:
   - `mohsin-javed.online` (+ `www`) → proxy_pass to `127.0.0.1:3000`.
   - `api.mohsin-javed.online` → proxy_pass to `127.0.0.1:3001`, with
     `Upgrade`/`Connection` headers preserved for websocket upgrades.
   - HTTP (port 80) server block redirecting to HTTPS (certbot will fill in the TLS
     directives on the instance when it runs).

3. **`frontend/.env.production.example`** — documents
   `NEXT_PUBLIC_API_URL=https://api.mohsin-javed.online`.

4. **`docs/deployment.md`** — the runbook, covering:
   - One-time server setup: Node 20, pnpm, PostgreSQL, Nginx, certbot, pm2 install;
     creating the app's Postgres role/database; cloning the repo; `pm2 startup`.
   - First deploy: install deps, `prisma migrate deploy`, build both workspaces,
     `pm2 start ecosystem.config.js`, `pm2 save`.
   - Redeploy checklist: `git pull`, `pnpm install`, `prisma migrate deploy`,
     `pnpm build`, `pm2 reload ecosystem.config.js`.
   - Nginx + certbot activation steps and verification commands.

## Out of scope

- Provisioning the EC2 instance itself (AMI, instance type, security group, key pair).
- CI/CD automation (GitHub Actions, auto-deploy on push) — deploys are manual via SSH
  per the runbook.
- Managed database migration path (RDS) — Postgres runs on-instance.
- Zero-downtime blue/green deploys — `pm2 reload` gives graceful reload for the
  Node processes; acceptable for this project's scale.

## Testing / verification

- `pm2 status` shows both processes online after `pm2 start`.
- `curl -I https://mohsin-javed.online` returns 200 from Next.js.
- `curl -I https://api.mohsin-javed.online/api/health` returns 200 from NestJS.
- `pm2 logs` shows no crash loops after a fresh reboot (validates `pm2 startup`/`pm2 save`).
