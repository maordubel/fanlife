#!/usr/bin/env node
/**
 * A PostgREST stand-in for the stand probe — NOT a product file and never deployed.
 *
 * `supabase-js` calls `POST <url>/rest/v1/rpc/<fn>` with the arguments as a JSON body and
 * reads the function's JSON back. This answers exactly that, for `worker_stand_*` only, by
 * running the call through `psql` AS THE anon ROLE against the local verify database — so
 * the probe exercises the real migration, the real grants and the real refusals, not a mock.
 * Everything else (auth, other tables) answers 404, as a project with no such route would.
 *
 *   PGHOST=/tmp PGPORT=5499 PGUSER=postgres STAND_DB=worker_verify_stand node scripts/stand/pg-rest-shim.mjs 54321
 */
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'

const port = Number(process.argv[2] ?? 54321)
const db = process.env.STAND_DB ?? 'worker_verify_stand'

function literal(value) {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) return `ARRAY[${value.map(literal).join(', ')}]::text[]`
  return `'${String(value).replace(/'/g, "''")}'`
}

createServer((req, res) => {
  const match = /^\/rest\/v1\/rpc\/(worker_stand_[a-z_]+)$/.exec(req.url ?? '')
  let body = ''
  req.on('data', (chunk) => (body += chunk))
  req.on('end', () => {
    res.setHeader('access-control-allow-origin', '*')
    res.setHeader('access-control-allow-headers', '*')
    if (req.method === 'OPTIONS') return res.end()
    if (!match || req.method !== 'POST') {
      res.statusCode = 404
      return res.end('{}')
    }
    try {
      const args = JSON.parse(body || '{}')
      const named = Object.entries(args)
        .filter(([name]) => /^p_[a-z_]+$/.test(name))
        .map(([name, value]) => `${name} => ${literal(value)}`)
        .join(', ')
      const sql = `set role anon; select public.${match[1]}(${named});`
      const out = execFileSync('psql', ['-d', db, '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' })
      res.setHeader('content-type', 'application/json')
      res.end(out.trim().split('\n').pop() || 'null')
    } catch (error) {
      res.statusCode = 400
      res.end(JSON.stringify({ message: String(error).slice(0, 200) }))
    }
  })
}).listen(port, '127.0.0.1', () => console.log(`pg-rest shim on :${port} → ${db}`))
