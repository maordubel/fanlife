#!/usr/bin/env node
/**
 * A PostgREST stand-in for `worker_fanlife_files` — NOT a product file, never deployed. It answers exactly the four calls
 * lib/master/durable.ts makes (GET by name / like-prefix, POST create-only with ignore-duplicates, PATCH on name+etag) by running
 * SQL through `psql` AS service_role against the local verify database, so a sweep exercises the real table, grants and
 * compare-and-swap. Refuses a request without the service key, as Supabase would.
 *   PGHOST=/tmp PGPORT=5499 PGUSER=postgres FILES_DB=worker_verify node scripts/qa/files-rest-shim.mjs 54329
 */
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
const port = Number(process.argv[2] ?? 54329), db = process.env.FILES_DB ?? 'worker_verify', KEY = process.env.SHIM_KEY ?? 'shim-service-key'
const lit = (v) => `'${String(v).replace(/'/g, "''")}'`
const sql = (q) => execFileSync('psql', ['-d', db, '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', `set role service_role; ${q}`], { encoding: 'utf8' }).trim()
const json = (q) => sql(`with t as (${q}) select coalesce(json_agg(t), '[]') from t;`).split('\n').pop() || '[]'
createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    const send = (code, text) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(text) }
    try {
      if (req.headers.apikey !== KEY) return send(401, '{"message":"Invalid API key"}')
      const u = new URL(req.url, 'http://x')
      if (u.pathname !== '/rest/v1/worker_fanlife_files') return send(404, '{"code":"PGRST205"}')
      const eq = (k) => u.searchParams.get(k)?.replace(/^eq\./, '')
      const name = u.searchParams.get('name') ?? ''
      if (req.method === 'GET') {
        if (name.startsWith('like.')) return send(200, json(`select name from public.worker_fanlife_files where name like ${lit(name.slice(5).replace(/\*$/, '') + '%')} order by name`))
        return send(200, json(`select body, etag from public.worker_fanlife_files where name = ${lit(eq('name'))}`))
      }
      const b = JSON.parse(body || '{}')
      if (req.method === 'POST') return send(201, json(`insert into public.worker_fanlife_files(name, body, etag) values (${lit(b.name)}, ${lit(b.body)}, ${lit(b.etag)}) on conflict (name) do nothing returning name, etag`))
      if (req.method === 'PATCH') return send(200, json(`update public.worker_fanlife_files set body = ${lit(b.body)}, etag = ${lit(b.etag)}, updated_at = now() where name = ${lit(eq('name'))} and etag = ${lit(eq('etag'))} returning name, etag`))
      send(405, '[]')
    } catch (e) { send(500, JSON.stringify({ message: String(e.message || e).slice(0, 300) })) }
  })
}).listen(port, '127.0.0.1', () => console.log(`files shim on ${port}`))
