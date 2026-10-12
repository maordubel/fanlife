/**
 * Daily backup (owner's reliability plan, 12.10.2026, P1 §10): every row this project keeps in Supabase — the control room's files
 * (`worker_fanlife_files`: control.json, desk packs, players, goals, profiles, audit archive) and every `worker_*` table (market,
 * closet, auction, stands, games) — written out as JSON lines. Only the server builds it (service role); the GitHub workflow
 * `backup.yml` encrypts it with the owner's passphrase BEFORE it is stored, so a plaintext copy never leaves the server.
 * Nothing of DUBID's is read: only names that start with `worker_` (rule 89).
 * Storage-bucket photos are not included — they are files, not rows; their paths are, so the rows still point at them.
 */
const PAGE = 1000

function base(): { url: string; key: string } | null {
  const url = process.env.FAN_LIFE_STORE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? { url: `${url.replace(/\/$/, '')}/rest/v1`, key } : null
}
const headers = (key: string, extra: Record<string, string> = {}) => ({ apikey: key, Authorization: `Bearer ${key}`, ...extra })

/** The worker_ tables PostgREST exposes to the service role, read from its own schema description (never a typed list that drifts). */
export async function backupTables(): Promise<string[]> {
  const b = base(); if (!b) throw new Error('Supabase is not configured on this deployment.')
  const r = await fetch(`${b.url}/`, { headers: headers(b.key, { Accept: 'application/openapi+json' }), cache: 'no-store' })
  if (!r.ok) throw new Error(`Supabase schema ${r.status}`)
  const doc = await r.json() as { definitions?: Record<string, unknown>; paths?: Record<string, unknown> }
  const names = new Set<string>(Object.keys(doc.definitions || {}))
  for (const p of Object.keys(doc.paths || {})) if (/^\/[a-z0-9_]+$/.test(p)) names.add(p.slice(1))
  return [...names].filter((n) => /^worker_[a-z0-9_]+$/.test(n)).sort()
}

/** Every row of every worker_ table, one JSON line each: {"t":table,"r":row}. The first line says what this is; the last, how many. */
export async function* backupLines(now = new Date()): AsyncGenerator<string> {
  const b = base(); if (!b) throw new Error('Supabase is not configured on this deployment.')
  const tables = await backupTables()
  if (!tables.includes('worker_fanlife_files')) throw new Error('worker_fanlife_files is not visible — refusing to write a backup without the control room.')
  yield JSON.stringify({ kind: 'fan-life-backup', version: 1, at: now.toISOString(), tables }) + '\n'
  const counts: Record<string, number> = {}
  for (const t of tables) {
    counts[t] = 0
    for (let from = 0; ; from += PAGE) {
      const r = await fetch(`${b.url}/${t}?select=*`, { headers: headers(b.key, { Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items', Prefer: 'count=none' }), cache: 'no-store' })
      if (r.status === 416) break
      if (!r.ok) throw new Error(`${t}: ${r.status} ${(await r.text()).slice(0, 160)}`)
      const rows = await r.json() as unknown[]
      for (const row of rows) yield JSON.stringify({ t, r: row }) + '\n'
      counts[t] += rows.length
      if (rows.length < PAGE) break
    }
  }
  yield JSON.stringify({ kind: 'end', counts }) + '\n'
}
