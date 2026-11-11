#!/bin/sh
# the Next server on :3000, the host-restoring front door on :7860 (the Space's app_port)
cd /app
PORT=3000 HOSTNAME=127.0.0.1 node server.js &
exec node /app/deploy-proxy.mjs
