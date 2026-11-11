// FAN LIFE's front door on Cloud Run (or a Space), behind a Cloudflare Worker (deploy/space/worker.js).
// HF routes by Host, so the Worker must send the Space's own host; it puts the visitor's host in X-Fanlife-Host.
// This front door gives that host back to Next (tenant hosts, metadata, server-action origin checks all read Host).
import http from 'node:http'
import net from 'node:net'
const UP = { host: '127.0.0.1', port: 3000 }
const KEY = process.env.FANLIFE_PROXY_KEY || ''
const server = http.createServer((req, res) => {
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
})
// open the door only once Next answers, so the platform's startup probe never routes a visitor to a cold server
const ready = () => new Promise((ok) => {
  const s = net.connect(UP.port, UP.host, () => { s.end(); ok(true) })
  s.on('error', () => ok(false))
})
for (let i = 0; i < 600 && !(await ready()); i++) await new Promise((r) => setTimeout(r, 100))
server.listen(Number(process.env.PORT) || 7860, '0.0.0.0')
