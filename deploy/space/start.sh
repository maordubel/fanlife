#!/bin/sh
# the Next server on :3000, the host-restoring front door on $PORT (Cloud Run 8080; a Space 7860)
cd /app
PORT=3000 HOSTNAME=127.0.0.1 node server.js &
exec node /app/deploy-proxy.mjs
