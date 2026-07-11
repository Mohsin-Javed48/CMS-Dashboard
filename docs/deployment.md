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
