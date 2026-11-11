// FAN LIFE on a Hugging Face Space, behind a Cloudflare Worker (deploy/space/worker.js).
// HF routes by Host, so the Worker must send the Space's own host; it puts the visitor's host in X-Fanlife-Host.
// This front door gives that host back to Next (tenant hosts, metadata, server-action origin checks all read Host).
import http from 'node:http'
const UP = { host: '127.0.0.1', port: 3000 }
const KEY = process.env.FANLIFE_PROXY_KEY || ''
http.createServer((req, res) => {
  const headers = { ...req.headers }
  const want = headers['x-fanlife-host']
  if (want && (!KEY || headers['x-fanlife-key'] === KEY)) {
    headers.host = want
    headers['x-forwarded-host'] = want
    headers['x-forwarded-proto'] = 'https'
  }
  delete headers['x-fanlife-key']
  const up = http.request({ ...UP, method: req.method, path: req.url, headers }, (r) => {
    res.writeHead(r.statusCode || 502, r.headers)
    r.pipe(res)
  })
  up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('starting') })
  req.pipe(up)
}).listen(7860, '0.0.0.0')
