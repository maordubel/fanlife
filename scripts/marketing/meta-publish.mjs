/**
 * FAN LIFE social plan → the business Facebook Page and its Instagram account (Meta Graph API).
 * docs/fanlife/53-meta-publishing.md. Plain ESM so both delivery paths share it: the tick (app/api/marketing/tick)
 * loads it at run time like the kit renderer, the GitHub backup (telegram-send.mjs) imports it.
 *
 * Switched OFF unless META_AUTOPUBLISH=1 AND the page id + page token are set. It only ever speaks for the PAGE —
 * a Page access token from a Business system user — never for a personal profile. Each post is tried ONCE: a claimed
 * post is never published twice, and a refusal is reported on the owner's Telegram so he can post it by hand.
 *
 * What is published: where the row says (`kit.to`, plan v5) — the feed (Post, Carousel) and stories, each with its
 * picture. A plan-v4 row goes by its format: feed only. Reels need a video and TikTok has no open API for a page this
 * size, so they stay ready-made drafts on Telegram.
 * The owner's morning briefing is never published.
 */
const PUBLISH = new Set(['post', 'carousel'])
const APPS = {'FAN LIFE': 'fanlife', 'THE WORKER': 'theworker', DUBID: 'dubid', OFFSIDES: 'offsides', 'FUCK YOU': 'fuckyou'}
const ENTITIES = {'&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#039;': "'", '&amp;': '&'}
const unescape = s => s.replace(/&(lt|gt|quot|#0?39|amp);/g, m => ENTITIES[m] ?? m)

/** The post's format (from the "📌 Post · …" header line), its caption (first copy box) and first comment (second box). */
export function partsOf(msg) {
  const boxes = [...String(msg || '').matchAll(/<pre>([\s\S]*?)<\/pre>/g)].map(m => unescape(m[1]).trim())
  const head = String(msg || '').match(/📌\s*([^·<\n]+?)\s*·\s*<b>([^<]+)<\/b>/)
  const format = (head?.[1] || '').trim().toLowerCase()
  const app = APPS[(head?.[2] || '').trim().toUpperCase()] || ''
  return {format, app, caption: boxes[0] || '', comment: boxes[1] || ''}
}

export function metaConfig(env = process.env) {
  const on = String(env.META_AUTOPUBLISH || '').trim() === '1'
  const page = String(env.META_PAGE_ID || '').trim(), token = String(env.META_PAGE_TOKEN || '').trim()
  const ig = String(env.META_IG_USER_ID || '').trim()
  const apps = String(env.META_APPS || 'fanlife,theworker,dubid,offsides').split(',').map(s => s.trim()).filter(Boolean)
  return {on: on && /^\d+$/.test(page) && token.length > 40, page, token, ig: /^\d+$/.test(ig) ? ig : '', apps,
    version: /^v\d+\.\d+$/.test(env.META_GRAPH_VERSION || '') ? env.META_GRAPH_VERSION : 'v23.0'}
}

/** Where a post goes. Plan v5 names it in the kit (`kit.to`: feed · story · tiktok); an older row falls back to its format. */
export function targetsOf(p, parts) {
  const to = Array.isArray(p?.kit?.to) ? p.kit.to : null
  if (to) return {feed: to.includes('feed'), story: to.includes('story'), tiktok: to.includes('tiktok'), named: true}
  return {feed: PUBLISH.has(parts.format), story: false, tiktok: false, named: false}
}

/** Why this post is not for Meta, or null when it is. */
export function skipReason(p, parts, pngs, cfg) {
  if (!cfg.on) return 'off'
  if (p.kind === 'briefing' || p.kit?.data?.briefing === true || /briefing/i.test(String(p.msg).split('\n')[0])) return 'owner briefing'
  const tg = targetsOf(p, parts)
  if (!tg.feed && !tg.story) return tg.named ? 'not for Facebook or Instagram' : `${parts.format || 'unknown format'} stays a Telegram draft`
  if (!parts.caption && !tg.story) return 'no caption'
  if (!pngs?.length) return 'no picture'
  if (!parts.app) return 'unknown app'
  const app = parts.app
  if (!cfg.apps.includes(app)) return `${app} is not published (META_APPS)`
  return null
}

const clean = (s, token) => String(s ?? '').split(token).join('[token]').replace(/\s+/g, ' ').slice(0, 220)

/** Instagram takes JPEG between 4:5 and 1.91:1; Facebook takes the same file. A picture taller than 4:5 is set on a
 *  1080×1350 ink sheet rather than cropped. Without sharp the PNG goes as it is (Facebook only). */
async function asJpeg(png, story = false) {
  let sharp
  try { sharp = (await import('sharp')).default } catch { try { sharp = (await import('./kit/node_modules/sharp/lib/index.js')).default } catch { return {buf: png, type: 'image/png', ig: false} } }
  const img = sharp(png), {width = 1080, height = 1350} = await img.metadata()
  const r = width / height
  let out = img
  if (story) out = sharp(png).resize(1080, 1920, {fit: 'contain', background: {r: 21, g: 19, b: 18}})
  else if (r < 0.8) out = sharp(png).resize(1080, 1350, {fit: 'contain', background: {r: 21, g: 19, b: 18}})
  else if (r > 1.91) out = sharp(png).resize(1080, 565, {fit: 'contain', background: {r: 21, g: 19, b: 18}})
  return {buf: await out.flatten({background: {r: 21, g: 19, b: 18}}).jpeg({quality: 92, mozjpeg: true}).toBuffer(), type: 'image/jpeg', ig: true}
}

export function graph(cfg, fetcher = fetch) {
  const base = `https://graph.facebook.com/${cfg.version}`
  return async (pathname, params = {}, {method = 'POST', form} = {}) => {
    const url = new URL(`${base}/${pathname}`)
    let body
    if (method === 'GET') { for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v)); url.searchParams.set('access_token', cfg.token) }
    else if (form) { form.append('access_token', cfg.token); body = form }
    else { body = new URLSearchParams({...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])), access_token: cfg.token}) }
    const r = await fetcher(url, {method, body, signal: AbortSignal.timeout(25_000)})
    const j = await r.json().catch(() => ({}))
    if (!r.ok || j.error) throw new Error(clean(j.error?.message || `status ${r.status}`, cfg.token))
    return j
  }
}

const wait = ms => new Promise(r => setTimeout(r, ms))
const mark = s => s.startsWith('published') ? '✅' : s.startsWith('skipped') ? '➖' : '⚠️'

/** One picture as a Facebook Page story and an Instagram story (plan v5). Stickers cannot be added through the API, so
 *  a story in the plan is drawn to need none: the question now, its answer in a later story. */
async function publishStory(p, png, cfg, api) {
  const out = {facebook: '', instagram: ''}
  let url = ''
  try {
    const f = await asJpeg(png, true)
    const form = new FormData()
    form.append('source', new Blob([f.buf], {type: f.type}), `fanlife-${p.id}-story.${f.type === 'image/png' ? 'png' : 'jpg'}`)
    form.append('published', 'false')
    const photo = await api(`${cfg.page}/photos`, {}, {form})
    const g = await api(photo.id, {fields: 'images'}, {method: 'GET'}).catch(() => null)
    url = (g?.images || []).sort((a, b) => b.width - a.width)[0]?.source || ''
    const st = await api(`${cfg.page}/photo_stories`, {photo_id: photo.id})
    out.facebook = `published ${st.post_id || st.id || photo.id}`
  } catch (e) { out.facebook = `refused: ${clean(e?.message || e, cfg.token)}` }
  const video = p.kit?.v4?.story || ''
  if (!cfg.ig) out.instagram = 'skipped: no Instagram account (META_IG_USER_ID)'
  else if (!url && !video) out.instagram = 'skipped: Facebook did not hand back the picture URL'
  else try {
    // v4: the story that moves (a public MP4 from the social-pictures release) when there is one, else the picture
    const creation = (await api(`${cfg.ig}/media`, video ? {video_url: video, media_type: 'STORIES'} : {image_url: url, media_type: 'STORIES'})).id
    for (let i = 0; i < (video ? 30 : 6); i++) {
      const s = await api(creation, {fields: 'status_code'}, {method: 'GET'}).catch(() => ({}))
      if (s.status_code === 'FINISHED') break
      if (s.status_code === 'ERROR') throw new Error('Instagram could not process the picture')
      await wait(1500)
    }
    out.instagram = `published ${(await api(`${cfg.ig}/media_publish`, {creation_id: creation})).id}`
  } catch (e) { out.instagram = `refused: ${clean(e?.message || e, cfg.token)}` }
  const line = `${mark(out.facebook)} Facebook story · ${mark(out.instagram)} Instagram story` +
    (out.facebook.startsWith('refused') || out.instagram.startsWith('refused') ? ' — post the ⚠️ one by hand.' : ' — published automatically.')
  return {...out, line, story: true}
}

/**
 * Publish one claimed post. Returns {facebook, instagram} — each 'published <id>', 'skipped: …' or 'refused: …' —
 * and a line for the owner's Telegram message. Never throws.
 */
export async function publishToMeta(p, pngs, {env = process.env, fetcher = fetch} = {}) {
  const cfg = metaConfig(env), parts = partsOf(p.msg)
  const why = skipReason(p, parts, pngs, cfg)
  if (why) return {facebook: `skipped: ${why}`, instagram: `skipped: ${why}`, line: why === 'off' ? '' : `ℹ️ Not auto-published: ${why}.`}
  const api = graph(cfg, fetcher)
  // a post meant for the feed AND the stories (plan v9) goes to both, in parallel; a story-only post stops here
  const tg = targetsOf(p, parts)
  let st = null
  if (tg.story) { st = await publishStory(p, pngs[0], cfg, api); if (!tg.feed) return st }
  const files = await Promise.all(pngs.slice(0, 10).map(b => asJpeg(b).catch(() => ({buf: b, type: 'image/png', ig: false}))))
  const out = {facebook: '', instagram: ''}
  const urls = []
  // Facebook first: its CDN copy of each picture is the public URL Instagram fetches.
  try {
    const ids = []
    for (const [i, f] of files.entries()) {
      const form = new FormData()
      form.append('source', new Blob([f.buf], {type: f.type}), `fanlife-${p.id}-${i + 1}.${f.type === 'image/png' ? 'png' : 'jpg'}`)
      if (files.length === 1) { form.append('message', parts.caption); form.append('published', 'true') } else form.append('published', 'false')
      ids.push(await api(`${cfg.page}/photos`, {}, {form}))
    }
    let postId
    if (files.length === 1) postId = ids[0].post_id || ids[0].id
    else postId = (await api(`${cfg.page}/feed`, {message: parts.caption, ...Object.fromEntries(ids.map((x, i) => [`attached_media[${i}]`, {media_fbid: x.id}]))})).id
    for (const x of ids) {
      const g = await api(x.id, {fields: 'images'}, {method: 'GET'}).catch(() => null)
      const best = (g?.images || []).sort((a, b) => b.width - a.width)[0]?.source
      if (best) urls.push(best)
    }
    if (parts.comment) await api(`${postId}/comments`, {message: parts.comment}).catch(() => {})
    out.facebook = `published ${postId}`
  } catch (e) { out.facebook = `refused: ${clean(e?.message || e, cfg.token)}` }

  if (!cfg.ig) out.instagram = 'skipped: no Instagram account (META_IG_USER_ID)'
  else if (!files.every(f => f.ig)) out.instagram = 'skipped: picture could not be made into a JPEG'
  else if (urls.length !== files.length) out.instagram = 'skipped: Facebook did not hand back the picture URLs'
  else try {
    let creation
    if (urls.length === 1) creation = (await api(`${cfg.ig}/media`, {image_url: urls[0], caption: parts.caption})).id
    else {
      const kids = []
      for (const u of urls) kids.push((await api(`${cfg.ig}/media`, {image_url: u, is_carousel_item: 'true'})).id)
      creation = (await api(`${cfg.ig}/media`, {media_type: 'CAROUSEL', children: kids.join(','), caption: parts.caption})).id
    }
    for (let i = 0; i < 6; i++) {
      const s = await api(creation, {fields: 'status_code'}, {method: 'GET'}).catch(() => ({}))
      if (s.status_code === 'FINISHED') break
      if (s.status_code === 'ERROR') throw new Error('Instagram could not process the picture')
      await wait(1500)
    }
    const media = (await api(`${cfg.ig}/media_publish`, {creation_id: creation})).id
    if (parts.comment) await api(`${media}/comments`, {message: parts.comment}).catch(() => {})
    out.instagram = `published ${media}`
  } catch (e) { out.instagram = `refused: ${clean(e?.message || e, cfg.token)}` }

  const line = `${mark(out.facebook)} Facebook · ${mark(out.instagram)} Instagram` +
    (out.facebook.startsWith('refused') || out.instagram.startsWith('refused') ? ' — post the ⚠️ one by hand from the boxes below.' : ' — published automatically.')
  return st ? {...out, line: `${line}\n${st.line}`, story: true, storyResult: {facebook: st.facebook, instagram: st.instagram}} : {...out, line}
}
