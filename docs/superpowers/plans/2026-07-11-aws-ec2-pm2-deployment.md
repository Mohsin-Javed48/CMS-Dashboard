# AWS EC2 + pm2 Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the repo-side configuration (pm2 ecosystem file, env examples, Nginx
template) and a complete runbook so the University CMS monorepo can be deployed to the
user's existing Ubuntu EC2 instance, process-managed by pm2, behind Nginx with TLS.

**Architecture:** Two pm2-managed Node processes (NestJS backend on :3001, Next.js
frontend on :3000) behind Nginx, which reverse-proxies `mohsin-javed.online` to the
frontend and `api.mohsin-javed.online` to the backend, both secured by a single Let's
Encrypt certificate via certbot. PostgreSQL runs locally on the instance.

**Tech Stack:** pm2 (process manager), Nginx (reverse proxy + TLS termination),
certbot (Let's Encrypt), PostgreSQL 15+ (Ubuntu apt package), pnpm workspaces, NestJS,
Next.js 14, Prisma.

## Global Constraints

- Domain: `mohsin-javed.online` (root → frontend, `api.` subdomain → backend), DNS
  already pointed at the instance's Elastic IP.
- Deploy source: `git clone`/`git pull` from
  `https://github.com/Mohsin-Javed48/CMS-Dashboard.git`.
- EC2 instance is Ubuntu 22.04/24.04, already provisioned, already reachable via SSH,
  with an Elastic IP attached — instance/security-group/EIP provisioning is out of
  scope.
- PostgreSQL runs on the same EC2 instance (not RDS).
- Node >= 18 (repo's `engines` field); use Node 20.x LTS on the server to match the
  developer's local `v20.19.6`.
- No CI/CD automation — deploys are manual via SSH, per the runbook.
- Assume the SSH user on the instance is `ubuntu` (Ubuntu AMI default). The runbook
  notes to substitute the actual user if different.
- Backend's `ConfigModule` (`backend/src/app.module.ts`) loads env vars from
  `resolve(process.cwd(), '..', '.env')` and `resolve(process.cwd(), '.env')` — so with
  pm2's `cwd` set to `backend/`, a `backend/.env` file is picked up correctly.
- Prisma client is generated to a non-default path (`backend/generated/prisma`, per
  `backend/prisma/schema.prisma`'s `generator client { output = "../generated/prisma" }`)
  and imported from there in `backend/src/prisma/prisma.service.ts` — `prisma generate`
  must run before `nest build` on every deploy so the generated types/client match the
  schema.

---

### Task 1: pm2 ecosystem config + logs directory

**Files:**
- Create: `ecosystem.config.js` (repo root)
- Create: `logs/.gitkeep`

**Interfaces:**
- Produces: pm2 app names `cms-backend` and `cms-frontend`, referenced by Task 4's
  runbook commands (`pm2 start ecosystem.config.js`, `pm2 reload ecosystem.config.js`).
- Consumes: `backend/dist/main.js` (produced by `nest build`, Task 4) and
  `frontend/node_modules/.bin/next` (installed by `pnpm install`).

- [ ] **Step 1: Create the logs directory placeholder**

Root `.gitignore` already ignores `*.log` anywhere in the tree, but git doesn't track
empty directories, so add a placeholder file to keep `logs/` present after a fresh
clone:

Create `logs/.gitkeep` (empty file).

- [ ] **Step 2: Write `ecosystem.config.js`**

```js
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'cms-backend',
      cwd: path.join(__dirname, 'backend'),
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      error_file: path.join(__dirname, 'logs', 'backend-error.log'),
      out_file: path.join(__dirname, 'logs', 'backend-out.log'),
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'cms-frontend',
      cwd: path.join(__dirname, 'frontend'),
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: path.join(__dirname, 'logs', 'frontend-error.log'),
      out_file: path.join(__dirname, 'logs', 'frontend-out.log'),
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
```

- [ ] **Step 3: Verify the file is valid, loadable Node/CommonJS**

Run: `node -e "const c = require('./ecosystem.config.js'); console.log(c.apps.map(a => a.name));"`

Expected output: `[ 'cms-backend', 'cms-frontend' ]`

- [ ] **Step 4: Commit**

```bash
git add ecosystem.config.js logs/.gitkeep
git commit -m "Add pm2 ecosystem config for backend and frontend"
```

---

### Task 2: Production env examples

**Files:**
- Create: `backend/.env.example`
- Create: `frontend/.env.production.example`

**Interfaces:**
- Produces: documented shape of `DATABASE_URL`, `PORT` (backend) and
  `NEXT_PUBLIC_API_URL` (frontend) that Task 4's runbook instructs the operator to copy
  into real `backend/.env` / `frontend/.env.production` files on the server.
- Consumes: none.

- [ ] **Step 1: Write `backend/.env.example`**

```
# PostgreSQL connection string used by Prisma (backend/prisma/schema.prisma).
# Production example — Postgres running locally on the same EC2 instance:
DATABASE_URL=postgresql://cms_app:CHANGE_ME_STRONG_PASSWORD@localhost:5432/cms_production

# Port the NestJS server listens on. Must match ecosystem.config.js's
# cms-backend env.PORT and the upstream port in deploy/nginx/cms-dashboard.conf.
PORT=3001
```

- [ ] **Step 2: Write `frontend/.env.production.example`**

```
# Public origin of the NestJS API, called from the browser.
# Must match the api.* server_name in deploy/nginx/cms-dashboard.conf.
NEXT_PUBLIC_API_URL=https://api.mohsin-javed.online
```

- [ ] **Step 3: Verify neither file is gitignored**

Run: `git check-ignore -v backend/.env.example frontend/.env.production.example`

Expected output: (empty — exit code 1, meaning neither path is ignored). The root
`.gitignore` only ignores the literal `.env` filename and `*.local` variants, not
`.env.example` / `.env.production.example`.

- [ ] **Step 4: Commit**

```bash
git add backend/.env.example frontend/.env.production.example
git commit -m "Add production env var examples for backend and frontend"
```

---

### Task 3: Nginx reverse-proxy config template

**Files:**
- Create: `deploy/nginx/cms-dashboard.conf`

**Interfaces:**
- Produces: HTTP (port 80) server blocks for `mohsin-javed.online` /
  `www.mohsin-javed.online` (→ 127.0.0.1:3000) and `api.mohsin-javed.online`
  (→ 127.0.0.1:3001), which Task 4's runbook copies to
  `/etc/nginx/sites-available/cms-dashboard` and then hands to
  `certbot --nginx -d mohsin-javed.online -d www.mohsin-javed.online -d api.mohsin-javed.online`
  to upgrade in place with 443/SSL blocks.
- Consumes: pm2-managed ports 3000/3001 from Task 1.

- [ ] **Step 1: Write `deploy/nginx/cms-dashboard.conf`**

```nginx
# Deploy target: /etc/nginx/sites-available/cms-dashboard
#
# Setup on the server:
#   sudo cp deploy/nginx/cms-dashboard.conf /etc/nginx/sites-available/cms-dashboard
#   sudo ln -s /etc/nginx/sites-available/cms-dashboard /etc/nginx/sites-enabled/cms-dashboard
#   sudo rm -f /etc/nginx/sites-enabled/default
#   sudo nginx -t && sudo systemctl reload nginx
#   sudo certbot --nginx -d mohsin-javed.online -d www.mohsin-javed.online -d api.mohsin-javed.online
#
# certbot rewrites this file in place to add the 443/SSL server blocks —
# do not hand-edit those sections back out afterwards.

server {
    listen 80;
    listen [::]:80;
    server_name mohsin-javed.online www.mohsin-javed.online;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name api.mohsin-javed.online;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- [ ] **Step 2: Verify the required directives are present**

Run: `grep -E "server_name|proxy_pass|listen 80" deploy/nginx/cms-dashboard.conf`

Expected output (order may vary, all four lines present):
```
    server_name mohsin-javed.online www.mohsin-javed.online;
        proxy_pass http://127.0.0.1:3000;
    server_name api.mohsin-javed.online;
        proxy_pass http://127.0.0.1:3001;
    listen 80;
    listen 80;
```

- [ ] **Step 3: Commit**

```bash
git add deploy/nginx/cms-dashboard.conf
git commit -m "Add Nginx reverse-proxy config template"
```

---

### Task 4: Deployment runbook

**Files:**
- Create: `docs/deployment.md`

**Interfaces:**
- Consumes: `ecosystem.config.js` app names (Task 1), `backend/.env.example` /
  `frontend/.env.production.example` var names (Task 2), and
  `deploy/nginx/cms-dashboard.conf` path/server names (Task 3).
- Produces: the operator-facing runbook — no further tasks depend on it.

- [ ] **Step 1: Write `docs/deployment.md`**

```markdown
# Deployment Runbook — AWS EC2 + pm2

Target: an existing Ubuntu 22.04/24.04 EC2 instance with an Elastic IP, reachable via
SSH as `ubuntu` (substitute your actual SSH user if different), with security group
inbound rules already allowing TCP 22, 80, and 443.

DNS: point A records for `mohsin-javed.online`, `www.mohsin-javed.online`, and
`api.mohsin-javed.online` at the instance's Elastic IP before starting the Nginx/TLS
steps below.

## 1. One-time server setup

SSH in:

```bash
ssh ubuntu@<elastic-ip-or-domain>
```

Update packages:

```bash
sudo apt update && sudo apt upgrade -y
```

Install Node.js 20.x LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # expect v20.x
```

Install pnpm and pm2 globally:

```bash
sudo npm install -g pnpm pm2
pnpm -v
pm2 -v
```

Install PostgreSQL:

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

Create the application database and role (replace the password):

```bash
sudo -u postgres psql -c "CREATE ROLE cms_app WITH LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE cms_production OWNER cms_app;"
```

Install Nginx and certbot:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Clone the repo:

```bash
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/Mohsin-Javed48/CMS-Dashboard.git cms-dashboard
cd ~/apps/cms-dashboard
```

## 2. Configure environment

Create the backend production env file (values from `backend/.env.example`, with the
real password from the `CREATE ROLE` step above):

```bash
cat > backend/.env <<'EOF'
DATABASE_URL=postgresql://cms_app:CHANGE_ME_STRONG_PASSWORD@localhost:5432/cms_production
PORT=3001
EOF
```

Create the frontend production env file (from `frontend/.env.production.example`):

```bash
cat > frontend/.env.production <<'EOF'
NEXT_PUBLIC_API_URL=https://api.mohsin-javed.online
EOF
```

## 3. First deploy

```bash
cd ~/apps/cms-dashboard
pnpm install --frozen-lockfile
pnpm --filter @university-cms/backend exec prisma generate
pnpm --filter @university-cms/backend exec prisma migrate deploy
pnpm build
```

`pnpm build` runs both workspaces' `build` scripts (`nest build` for the backend,
`next build` for the frontend) via the root `package.json`'s
`"build": "pnpm run --parallel build"`.

## 4. Nginx + TLS

Install the site config and enable it:

```bash
sudo cp deploy/nginx/cms-dashboard.conf /etc/nginx/sites-available/cms-dashboard
sudo ln -s /etc/nginx/sites-available/cms-dashboard /etc/nginx/sites-enabled/cms-dashboard
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Issue the certificate (certbot rewrites the site config in place to add 443/SSL
blocks and a redirect from 80):

```bash
sudo certbot --nginx -d mohsin-javed.online -d www.mohsin-javed.online -d api.mohsin-javed.online
```

Confirm auto-renewal is scheduled:

```bash
sudo systemctl status certbot.timer
```

## 5. Start the apps with pm2

```bash
cd ~/apps/cms-dashboard
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

`pm2 startup` prints a `sudo env PATH=...` command — copy/paste and run exactly what
it prints, so pm2 resurrects both apps after a reboot.

## 6. Verify

```bash
pm2 status
# expect cms-backend and cms-frontend both "online"

curl -I https://mohsin-javed.online
# expect HTTP/2 200

curl -I https://api.mohsin-javed.online/api/health
# expect HTTP/2 200
```

## 7. Redeploy checklist

Run this on every subsequent deploy:

```bash
cd ~/apps/cms-dashboard
git pull origin master
pnpm install --frozen-lockfile
pnpm --filter @university-cms/backend exec prisma generate
pnpm --filter @university-cms/backend exec prisma migrate deploy
pnpm build
pm2 reload ecosystem.config.js
pm2 save
```

`pm2 reload` restarts each app one-at-a-time (graceful reload) rather than killing
both at once.

## 8. Useful pm2 commands

```bash
pm2 status                  # process list + uptime + restart count
pm2 logs cms-backend        # tail backend stdout/stderr
pm2 logs cms-frontend       # tail frontend stdout/stderr
pm2 restart cms-backend     # hard restart one app
pm2 stop ecosystem.config.js  # stop both apps
```
```

- [ ] **Step 2: Verify the runbook references match the committed config files**

Run:
```bash
grep -c "cms-dashboard.conf" docs/deployment.md
grep -c "ecosystem.config.js" docs/deployment.md
grep -c "api.mohsin-javed.online" docs/deployment.md
```

Expected: each command prints a number `>= 1` (confirms the doc references the actual
files/domains created in Tasks 1–3, not stale placeholders).

- [ ] **Step 3: Commit**

```bash
git add docs/deployment.md
git commit -m "Add AWS EC2 + pm2 deployment runbook"
```
