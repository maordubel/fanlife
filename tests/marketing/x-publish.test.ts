import crypto from 'node:crypto'
import {beforeAll, describe, expect, it} from 'vitest'
import sharp from 'sharp'
// @ts-expect-error plain ESM shared by the tick and the GitHub backup
import {oauthHeader, publishToX, tweetText, weight, xConfig} from '../../scripts/marketing/x-publish.mjs'

const msg = (format: string, app = 'FAN LIFE', comment = true) => [
  `📅 <b>Wed 04.11 · 10:00</b> · Gate`, `📌 ${format} · <b>${app}</b> · Instagram · Facebook · X`, '',
  '👇 <b>Caption</b> — tap the box to copy',
  '<pre>Who scored the winner &amp; when? &lt;3\n\n👉 https://fanlife.dubelteam.com\n\n#FANLIFE #Football #Derby #Archive</pre>',
  ...(comment ? ['💬 <b>First comment</b> — tap to copy', '<pre>Answer: B — play it at https://fanlife.dubelteam.com</pre>'] : [])].join('\n')
const KEYS = {X_API_KEY: 'k'.repeat(25), X_API_SECRET: 's'.repeat(50), X_ACCESS_TOKEN: '123456-' + 't'.repeat(40), X_ACCESS_SECRET: 'z'.repeat(45)}
const ON = {X_AUTOPUBLISH: '1', ...KEYS}
let png: Buffer
beforeAll(async () => { png = await sharp({create: {width: 1080, height: 1350, channels: 3, background: '#c0392b'}}).png().toBuffer() })

function fakeX(fail?: (url: string) => boolean) {
  const calls: {url: string; auth: string; body: Record<string, unknown>}[] = []
  let n = 0
  const fetcher = async (url: string, init: {headers: Record<string, string>; body: string}) => {
    const body = JSON.parse(init.body)
    calls.push({url, auth: init.headers.authorization, body})
    if (fail?.(url)) return new Response(JSON.stringify({title: 'Forbidden', detail: `nope ${KEYS.X_ACCESS_SECRET}`}), {status: 403})
    return Response.json({data: {id: url.endsWith('media/upload') ? `m${++n}` : `t${++n}`}})
  }
  return {calls, fetcher}
}

describe('X publishing (docs/fanlife/54-x-publishing.md)', () => {
  it('is off unless switched on with all four keys', () => {
    expect(xConfig({}).on).toBe(false)
    expect(xConfig(KEYS).on).toBe(false)
    expect(xConfig({...ON, X_ACCESS_TOKEN: 'bad'}).on).toBe(false)
    expect(xConfig(ON).on).toBe(true)
  })

  it('takes links out by default (a link costs ~13× more), keeps three hashtags, fits 280', () => {
    const t = tweetText('Who scored?\n\n👉 https://fanlife.dubelteam.com\n\n#A #B #C #D')
    expect(t).not.toMatch(/https?:/)
    expect(t).not.toContain('👉')
    expect(t).toBe('Who scored?\n\n#A #B #C')
    expect(tweetText('Play: https://x.y/z', {links: true})).toContain('https://x.y/z')
    const long = Array.from({length: 40}, (_, i) => `Sentence number ${i} is here.`).join(' ')
    const cut = tweetText(long + '\n#FANLIFE')
    expect(weight(cut)).toBeLessThanOrEqual(280)
    expect(cut.endsWith('#FANLIFE')).toBe(true)
    expect(cut).toMatch(/here\.\n\n#FANLIFE$/)
  })

  it('signs OAuth 1.0a exactly as the spec example (RFC 5849 / X docs)', () => {
    // X's documented example: https://developer.x.com/en/docs/authentication/oauth-1-0a/creating-a-signature
    const h = oauthHeader({key: 'xvz1evFS4wEEPTGEFPHBog', secret: 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw', token: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb', tokenSecret: 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE'},
      'POST', 'https://api.x.com/1.1/statuses/update.json?include_entities=true', {nonce: 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg', ts: 1318622958})
    expect(h.startsWith('OAuth ')).toBe(true)
    // the signature depends only on the oauth fields + the query here (the documented example also signs the form
    // body, which a JSON body does not have), so check it against an independent computation
    const p = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    const params = 'include_entities=true&oauth_consumer_key=xvz1evFS4wEEPTGEFPHBog&oauth_nonce=kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg&oauth_signature_method=HMAC-SHA1&oauth_timestamp=1318622958&oauth_token=370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb&oauth_version=1.0'
    const base = `POST&${p('https://api.x.com/1.1/statuses/update.json')}&${p(params)}`
    const sig = crypto.createHmac('sha1', 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw&LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE').update(base).digest('base64')
    expect(h).toContain(`oauth_signature="${p(sig)}"`)
  })

  it('does nothing when off, and skips stories, briefings and unlisted apps', async () => {
    const {calls, fetcher} = fakeX()
    expect((await publishToX({id: 1, msg: msg('Post')}, [png], {env: {}, fetcher})).line).toBe('')
    expect((await publishToX({id: 1, msg: msg('Story')}, [png], {env: ON, fetcher})).x).toMatch(/^skipped: story/)
    expect((await publishToX({id: 1, msg: msg('Post'), kit: {data: {briefing: true}}}, [png], {env: ON, fetcher})).x).toBe('skipped: owner briefing')
    expect((await publishToX({id: 1, msg: msg('Post', 'FUCK YOU')}, [png], {env: ON, fetcher})).x).toMatch(/X_APPS/)
    expect(calls).toHaveLength(0)
  })

  it('posts a carousel with up to four pictures, then the answer as a reply — no links, no personal endpoints', async () => {
    const {calls, fetcher} = fakeX()
    const r = await publishToX({id: 7, msg: msg('Carousel')}, [png, png, png, png, png], {env: ON, fetcher})
    expect(r.x).toMatch(/^published t/)
    const uploads = calls.filter(c => c.url.endsWith('/media/upload'))
    expect(uploads).toHaveLength(4)
    expect(uploads[0]!.body.media_category).toBe('tweet_image')
    const [post, reply] = calls.filter(c => c.url.endsWith('/tweets'))
    expect((post!.body.media as {media_ids: string[]}).media_ids).toHaveLength(4)
    expect(post!.body.text).toBe('Who scored the winner & when? <3\n\n#FANLIFE #Football #Derby')
    expect(reply!.body.reply).toEqual({in_reply_to_tweet_id: 't5'})
    expect(String(reply!.body.text)).not.toMatch(/https?:/)
    for (const c of calls) { expect(c.auth.startsWith('OAuth ')).toBe(true); expect(c.url).not.toMatch(/\/users\/me|\/2\/users/) }
  })

  it('reports a refusal once, without leaking a key', async () => {
    const {calls, fetcher} = fakeX(u => u.endsWith('/tweets'))
    const r = await publishToX({id: 8, msg: msg('Post')}, [png], {env: ON, fetcher})
    expect(r.x).toMatch(/^refused:/)
    expect(r.line).toMatch(/^⚠️ X refused/)
    expect(JSON.stringify(r)).not.toContain(KEYS.X_ACCESS_SECRET)
    expect(calls.filter(c => c.url.endsWith('/tweets'))).toHaveLength(1)
  })
})
