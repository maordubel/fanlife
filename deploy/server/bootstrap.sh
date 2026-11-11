#!/usr/bin/env bash
# FAN LIFE on our own server (Oracle Cloud Always Free, Ubuntu 24.04, ARM). Idempotent: safe to run on every deploy.
# Called by .github/workflows/deploy-server.yml over SSH. Nothing here needs the owner at a terminal.
set -euo pipefail
APP=/srv/fanlife
if ! command -v node >/dev/null || ! node -v | grep -q '^v22'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
if ! command -v caddy >/dev/null; then
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update && sudo apt-get install -y caddy
fi
sudo apt-get install -y git >/dev/null
# Oracle's Ubuntu image blocks 80/443 in iptables even when the cloud firewall allows them
if sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null; then :; else
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
  sudo netfilter-persistent save || true
fi
# 4 GB swap so a build never runs out of memory
if [ ! -f /swapfile ]; then sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab; fi
sudo mkdir -p "$APP" && sudo chown "$USER" "$APP"
if [ ! -d "$APP/.git" ]; then git clone --depth 50 https://github.com/maordubel/fanlife.git "$APP"; fi
cd "$APP"
git fetch --depth 50 origin main && git reset --hard origin/main
npm ci --no-audit --no-fund
# NEXT_PUBLIC_* are written into the bundle at build time, so the build reads the same file the service does
set -a; sudo cat /etc/fanlife.env > /tmp/fanlife.env; . /tmp/fanlife.env; rm -f /tmp/fanlife.env; set +a
NODE_OPTIONS=--max-old-space-size=8192 npm run build
sudo cp deploy/server/fanlife.service /etc/systemd/system/fanlife.service
sudo cp deploy/server/Caddyfile /etc/caddy/Caddyfile
sudo systemctl daemon-reload
sudo systemctl enable fanlife caddy >/dev/null
sudo systemctl restart fanlife
sudo systemctl reload caddy || sudo systemctl restart caddy
for i in $(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:3000/robots.txt && { echo READY; exit 0; }; sleep 2; done
echo "fanlife did not answer on :3000"; sudo journalctl -u fanlife -n 60 --no-pager; exit 1
