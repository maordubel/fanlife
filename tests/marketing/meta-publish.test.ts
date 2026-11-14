import {beforeAll, describe, expect, it} from 'vitest'
import sharp from 'sharp'
// @ts-expect-error plain ESM shared by the tick and the GitHub backup
import {metaConfig, partsOf, publishToMeta, skipReason} from '../../scripts/marketing/meta-publish.mjs'

const msg = (format: string, app = 'FAN LIFE', comment = true) => [
  `📅 <b>Wed 04.11 · 10:00</b> · Gate`, `📌 ${format} · <b>${app}</b> · Instagram · Facebook · TikTok`, '',
  '👇 <b>Caption</b> — tap the box to copy', '<pre>Who scored &amp; won? &lt;3\n\n👉 https://fanlife.dubelteam.com\n\n#FANLIFE</pre>',
  ...(comment ? ['💬 <b>First comment</b> — tap to copy', '<pre>Answer: B</pre>'] : [])].join('\n')
const ON = {META_AUTOPUBLISH: '1', META_PAGE_ID: '1234567890', META_PAGE_TOKEN: 'EAA' + 'x'.repeat(60), META_IG_USER_ID: '178414'}
let png: Buffer
beforeAll(async () => { png = await sharp({create: {width: 1080, height: 1920, channels: 3, background: '#c0392b'}}).png().toBuffer() })

/** a fake Graph API that records every call and never holds a real token */
function fakeGraph(fail?: (url: string) => boolean) {
  const calls: {method: string; url: string; body: Record<string, string>}[] = []
  let n = 0
  const fetcher = async (u: URL, init: {method: string; body?: FormData | URLSearchParams}) => {
    const body: Record<string, string> = {}
    if (init.body instanceof URLSearchParams) init.body.forEach((v, k) => { body[k] = v })
    else if (init.body instanceof FormData) init.body.forEach((v, k) => { body[k] = typeof v === 'string' ? v : '[file]' })
    const url = u.toString()
    calls.push({method: init.method, url, body})
    if (fail?.(url)) return new Response(JSON.stringify({error: {message: `nope ${ON.META_PAGE_TOKEN}`}}), {status: 400})
    const id = String(++n)
    if (init.method === 'GET' && url.includes('fields=images')) return Response.json({images: [{width: 1080, source: `https://scontent.fbcdn.net/${id}.jpg`}]})
    if (init.method === 'GET') return Response.json({status_code: 'FINISHED'})
    if (url.endsWith('/photos')) return Response.json({id: `ph${id}`, post_id: `page_post${id}`})
    return Response.json({id: `x${id}`})
  }
  return {calls, fetcher}
}

describe('Meta publishing (docs/fanlife/53-meta-publishing.md)', () => {
  it('reads the format, the app, the caption and the first comment out of the draft', () => {
    const p = partsOf(msg('Post'))
    expect(p).toMatchObject({format: 'post', app: 'fanlife', comment: 'Answer: B'})
    expect(p.caption.startsWith('Who scored & won? <3')).toBe(true)
  })

  it('is OFF without the switch, the page id or the token', () => {
    expect(metaConfig({}).on).toBe(false)
    expect(metaConfig({...ON, META_AUTOPUBLISH: ''}).on).toBe(false)
    expect(metaConfig({...ON, META_PAGE_TOKEN: 'short'}).on).toBe(false)
    expect(metaConfig(ON).on).toBe(true)
  })

  it('never publishes a story, a reel, the owner briefing or a switched-off app', () => {
    const cfg = metaConfig(ON)
    const why = (m: string, extra = {}) => skipReason({id: 1, msg: m, ...extra}, partsOf(m), [png], cfg)
    expect(why(msg('Story'))).toMatch(/Telegram draft/)
    expect(why(msg('Reel / TikTok'))).toMatch(/Telegram draft/)
    expect(why(msg('Post'), {kind: 'briefing'})).toBe('owner briefing')
    expect(why(msg('Post'), {kit: {data: {briefing: true}}})).toBe('owner briefing')
    expect(why(msg('Post', 'FUCK YOU'))).toMatch(/META_APPS/)
    expect(skipReason({id: 1, msg: msg('Post')}, partsOf(msg('Post')), [], cfg)).toBe('no picture')
    expect(why(msg('Post'))).toBeNull()
  })

  it('does nothing at all when off', async () => {
    const g = fakeGraph()
    const r = await publishToMeta({id: 1, msg: msg('Post')}, [png], {env: {}, fetcher: g.fetcher})
    expect(g.calls).toHaveLength(0)
    expect(r.line).toBe('')
  })

  it('a post: one Page photo with the caption, the comment, then the same picture on Instagram', async () => {
    const g = fakeGraph()
    const r = await publishToMeta({id: 7, msg: msg('Post')}, [png], {env: ON, fetcher: g.fetcher})
    expect(r.facebook).toMatch(/^published/)
    expect(r.instagram).toMatch(/^published/)
    const posts = g.calls.filter(c => c.method === 'POST').map(c => new URL(c.url).pathname.split('/').slice(2).join('/'))
    expect(posts[0]).toBe('1234567890/photos')
    expect(posts).toContain('178414/media')
    expect(posts).toContain('178414/media_publish')
    expect(posts.filter(x => x.endsWith('/comments'))).toHaveLength(2)
    const ig = g.calls.find(c => c.url.endsWith('178414/media'))!
    expect(ig.body.image_url).toMatch(/fbcdn/)
    // only the Page and its Instagram account are ever addressed — never /me
    expect(g.calls.every(c => !/\/me[/?]/.test(c.url))).toBe(true)
  })

  it('a carousel: unpublished photos + one feed post, and an Instagram carousel of the same slides', async () => {
    const g = fakeGraph()
    const r = await publishToMeta({id: 8, msg: msg('Carousel')}, [png, png, png], {env: ON, fetcher: g.fetcher})
    expect(r.facebook).toMatch(/^published/)
    const photos = g.calls.filter(c => c.url.endsWith('/photos'))
    expect(photos.every(c => c.body.published === 'false')).toBe(true)
    const feed = g.calls.find(c => c.url.endsWith('/feed'))!
    expect(Object.keys(feed.body).filter(k => k.startsWith('attached_media'))).toHaveLength(3)
    expect(g.calls.find(c => c.body.media_type === 'CAROUSEL')!.body.children!.split(',')).toHaveLength(3)
  })

  it('a story-tall picture is set on a 4:5 sheet as JPEG; a broken one still reaches Facebook', async () => {
    const g = fakeGraph()
    const r = await publishToMeta({id: 10, msg: msg('Post')}, [Buffer.from('not a png')], {env: ON, fetcher: g.fetcher})
    expect(r.facebook).toMatch(/^published/)
    expect(r.instagram).toMatch(/JPEG/)
  })

  it('a refusal is reported, never retried, and never leaks the token', async () => {
    const g = fakeGraph(u => u.includes('178414/media'))
    const r = await publishToMeta({id: 9, msg: msg('Post')}, [png], {env: ON, fetcher: g.fetcher})
    expect(r.facebook).toMatch(/^published/)
    expect(r.instagram).toMatch(/^refused/)
    expect(r.instagram).not.toContain(ON.META_PAGE_TOKEN)
    expect(r.line).toMatch(/by hand/)
    expect(g.calls.filter(c => c.url.endsWith('178414/media'))).toHaveLength(1)
  })

  it('plan v5: a story goes up as a Facebook Page story and an Instagram story, on a 9:16 sheet', async () => {
    const {calls, fetcher} = fakeGraph()
    const r = await publishToMeta({id: 9, msg: msg('Story', 'FAN LIFE', false), kit: {t: 'T10-NERDS', data: {}, to: ['story']}}, [png], {env: ON, fetcher})
    expect(r.facebook).toMatch(/^published/)
    expect(r.instagram).toMatch(/^published/)
    expect(r.line).toBe('✅ Facebook story · ✅ Instagram story — published automatically.')
    expect(calls.some(c => c.url.endsWith('/photo_stories'))).toBe(true)
    expect(calls.find(c => c.url.endsWith('/photos'))!.body.published).toBe('false')
    expect(calls.find(c => c.url.endsWith('/media'))!.body.media_type).toBe('STORIES')
    expect(calls.some(c => c.url.endsWith('/feed'))).toBe(false)
  })

  it('plan v5: kit.to decides — a TikTok-only row is not for Meta, a feed row is', async () => {
    const {calls, fetcher} = fakeGraph()
    expect((await publishToMeta({id: 10, msg: msg('Post'), kit: {t: 'x', data: {}, to: ['tiktok']}}, [png], {env: ON, fetcher})).facebook).toBe('skipped: not for Facebook or Instagram')
    expect(calls).toHaveLength(0)
    expect((await publishToMeta({id: 11, msg: msg('Story'), kit: {t: 'x', data: {}, to: ['feed', 'tiktok']}}, [png], {env: ON, fetcher})).facebook).toMatch(/^published/)
  })

  it('plan v9: a feed + story post goes to both, and the Instagram story is the v4 moving video', async () => {
    const {calls, fetcher} = fakeGraph()
    const kit = {t: 'L-GATE', data: {}, to: ['feed', 'story', 'tiktok'], v4: {ver: '4.0', png: ['https://x/p.png'], story: 'https://github.com/maordubel/fanlife/releases/download/social-pictures/p1-story-v4.0.mp4'}}
    const r = await publishToMeta({id: 12, msg: msg('Post'), kit}, [png], {env: ON, fetcher})
    expect(r.facebook).toMatch(/^published/)
    expect(r.story).toBe(true)
    expect(calls.some(c => c.url.endsWith('/photo_stories'))).toBe(true)
    const st = calls.find(c => c.url.endsWith('/media') && c.body.media_type === 'STORIES')!
    expect(st.body.video_url).toContain('p1-story-v4.0.mp4')
    expect(calls.some(c => c.url.endsWith('/media') && c.body.caption)).toBe(true) // the feed post too
  })
})
