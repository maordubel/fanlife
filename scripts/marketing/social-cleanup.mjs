/** Social cleanup (owner, 14.11.2026: "you have my approval to clean everything redundant on my social pages").
 *  Lists the Facebook Page's posts and the Instagram account's media, flags what is redundant, and — only with
 *  CLEANUP_APPLY=1 — deletes the flagged Facebook posts. Instagram's API cannot delete media: flagged ones are listed
 *  with their links for one tap in the app.
 *  Redundant = an exact repeat of an earlier post's caption (the earlier one stays, it carries the engagement), a post
 *  with no picture and almost no text, or a test post. Nothing else is touched. */
const env = process.env
let PAGE = env.META_PAGE_ID || '', IG = env.META_IG_USER_ID || '', TOKEN = env.META_PAGE_TOKEN || ''
const APPLY = env.CLEANUP_APPLY === '1'
const G = 'https://graph.facebook.com/v21.0/'
const get = async (path, q = {}) => { const u = new URL(G + path); for (const [k, v] of Object.entries({...q, access_token: TOKEN})) u.searchParams.set(k, v); const r = await fetch(u); const j = await r.json(); if (!r.ok) throw Error(j?.error?.message || r.status); return j }
const del = async id => { const u = new URL(G + id); u.searchParams.set('access_token', TOKEN); const r = await fetch(u, {method: 'DELETE'}); return r.ok }
async function all(path, q) { const out = []; let j = await get(path, q); for (let i = 0; i < 10; i++) { out.push(...(j.data || [])); if (!j.paging?.next) break; const r = await fetch(j.paging.next); j = await r.json() } return out }

const norm = s => String(s || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 120)
const TEST = /\b(test|testing|ignore this|draft)\b/i
export function flag(items, textOf, hasMedia) {
  const seen = new Map(), out = []
  for (const it of [...items].sort((a, b) => Date.parse(a.t) - Date.parse(b.t))) {
    const k = norm(textOf(it))
    if (TEST.test(textOf(it) || '') && k.length < 80) { out.push({...it, why: 'test post'}); continue }
    if (!hasMedia(it) && k.length < 20) { out.push({...it, why: 'no picture, almost no text'}); continue }
    if (k.length >= 30 && seen.has(k)) { out.push({...it, why: `repeat of ${seen.get(k)}`}); continue }
    if (k.length >= 30) seen.set(k, it.id)
  }
  return out
}

/** the Page connection the live publisher uses (handed over to the server-only store by meta-handoff.yml) */
async function stored() {
  const db = (env.SUPABASE_URL || 'https://afxpjfxwpdjvlmuoawda.supabase.co').replace(/\/$/, ''), key = env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!key) return null
  const r = await fetch(`${db}/rest/v1/worker_fanlife_files?name=eq.marketing%2Fmeta.json&select=body`, {headers: {apikey: key, Authorization: `Bearer ${key}`}})
  const row = r.ok ? (await r.json())[0] : null
  try { return row ? JSON.parse(typeof row.body === 'string' ? row.body : JSON.stringify(row.body)) : null } catch { return null }
}
async function main() {
  const live = await stored().catch(() => null)
  if (live?.token) { TOKEN = live.token; PAGE = live.page || PAGE; IG = live.ig || IG }
  if (!PAGE || !TOKEN) throw Error('META_PAGE_ID / META_PAGE_TOKEN missing')
  const fb = (await all(`${PAGE}/posts`, {fields: 'id,message,created_time,full_picture,permalink_url', limit: 100})).map(p => ({id: p.id, t: p.created_time, text: p.message, pic: !!p.full_picture, link: p.permalink_url}))
  const fbFlags = flag(fb, x => x.text, x => x.pic)
  console.log(`Facebook: ${fb.length} posts, ${fbFlags.length} redundant`)
  for (const f of fbFlags) {
    const ok = APPLY ? await del(f.id) : null
    console.log(`  ${APPLY ? (ok ? 'deleted' : 'FAILED ') : 'would delete'} ${f.id} · ${f.why} · ${String(f.text || '').slice(0, 60).replace(/\n/g, ' ')} · ${f.link || ''}`)
  }
  if (IG) {
    const ig = (await all(`${IG}/media`, {fields: 'id,caption,timestamp,media_type,permalink', limit: 100})).map(m => ({id: m.id, t: m.timestamp, text: m.caption, pic: true, link: m.permalink}))
    const igFlags = flag(ig, x => x.text, () => true)
    console.log(`Instagram: ${ig.length} posts, ${igFlags.length} redundant (Instagram's API cannot delete — open each link and delete in the app)`)
    for (const f of igFlags) console.log(`  ${f.why} · ${String(f.text || '').slice(0, 60).replace(/\n/g, ' ')} · ${f.link}`)
  }
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.log(`::error title=social cleanup::${String(e.message).replace(TOKEN, '[token]')}`); process.exit(1) })
