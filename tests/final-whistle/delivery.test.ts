import {afterEach, describe, expect, it} from 'vitest'
import {memoryStore, useDurableStore} from '@/lib/master/durable'
import {captionFor, callTelegram, digits, documentName, judgeContact, pngSize, sendDocument, sendPhoto} from '@/lib/final-whistle/telegram'
import {RENDER_TTL_MS, signRender, verifyRender} from '@/lib/final-whistle/token'
import {claim, complete, fail, getConfig, markSending, ownerAction, setConfig, sweepLeases, uncertain, pendingCount} from '@/lib/final-whistle/service'
import {updateDoc} from '@/lib/final-whistle/store'
import {DESTINATION_ID, type Job} from '@/lib/final-whistle/types'
import type {FinalResult} from '@/lib/fixtures/types'

afterEach(() => useDurableStore(null))
const T0 = new Date('2026-10-17T18:00:00Z')
const at = (min: number) => new Date(T0.getTime() + min * 60_000)
const result = {clubId: 'hapoel-tel-aviv', kickoff: '2026-10-17T16:00:00.000Z', home: 'Hapoel Tel Aviv', away: 'Rival FC', homeScore: 2, awayScore: 1, clubSide: 'home', opponent: 'Rival FC', competition: 'Israeli Premier League', providerEventId: 'E1', dateOnly: false, finalStatus: 'FT', regulationScore: {home: 2, away: 1}, afterExtraTimeScore: null, penalties: null, competitionKind: 'league', evidence: {source: 'thesportsdb', providerEventId: 'E1', rawStatus: 'Match Finished', status: 'FT', observedAt: T0.toISOString(), providerUpdatedAt: null}} as FinalResult
const ID = 'a'.repeat(24)
const seedJob = (o: Partial<Job> = {}) => updateDoc<Job | null>(`jobs/${o.id ?? ID}.json`, null, () => ({id: ID, destinationId: DESTINATION_ID, providerEventId: 'E1', clubId: 'hapoel-tel-aviv', fingerprint: 'f1', kind: 'FINAL', state: 'ready', result, dryRun: false, createdAt: T0.toISOString(), updatedAt: T0.toISOString(), attempts: 0, lease: null, retryAfter: null, delivered: {}, sentAt: null, note: null, ...o}))
const fake = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), {status})) as unknown as typeof fetch

describe('Telegram delivery', () => {
  it('a rejected token or chat is final; a slow-down is retryable; no answer is UNKNOWN, never "send again"', async () => {
    expect(await callTelegram('TOK', 'sendPhoto', {a: 1}, fake(200, {ok: true, result: {message_id: 7}}))).toMatchObject({ok: true, messageId: 7})
    expect(await callTelegram('TOK', 'x', {}, fake(403, {ok: false, description: 'bot was blocked by the user'}))).toMatchObject({ok: false, kind: 'rejected', retryable: false})
    expect(await callTelegram('TOK', 'x', {}, fake(429, {ok: false, parameters: {retry_after: 12}}))).toMatchObject({ok: false, kind: 'rejected', retryable: true, retryAfterSec: 12})
    expect(await callTelegram('TOK', 'x', {}, fake(502, 'bad gateway'))).toMatchObject({ok: false, kind: 'unknown'})
    expect(await callTelegram('TOK', 'x', {}, (async () => { throw new Error('boom') }) as unknown as typeof fetch)).toMatchObject({ok: false, kind: 'unknown'})
  })
  it('the token never appears in an error', async () => {
    const f = (async () => { throw new Error('connect to https://api.telegram.org/botSECRET123/sendPhoto failed') }) as unknown as typeof fetch
    const r = await callTelegram('SECRET123', 'sendPhoto', {}, f)
    expect(JSON.stringify(r)).not.toContain('SECRET123')
    const d = await callTelegram('SECRET123', 'x', {}, fake(400, {ok: false, description: 'bad request: SECRET123'}))
    expect(JSON.stringify(d)).not.toContain('SECRET123')
  })
  it('photo and document are sent as multipart to the right methods and carry the caption', async () => {
    const calls: Array<{url: string; body: FormData}> = []
    const f = (async (url: string, init: RequestInit) => { calls.push({url, body: init.body as FormData}); return new Response(JSON.stringify({ok: true, result: {message_id: calls.length}}), {status: 200}) }) as unknown as typeof fetch
    const png = new Uint8Array([1, 2, 3])
    await sendPhoto('T', '42', png, 'cap', f); await sendDocument('T', '42', png, 'x.png', 'cap', f)
    expect(calls.map(c => c.url.split('/').pop())).toEqual(['sendPhoto', 'sendDocument'])
    expect(calls[0]!.body.get('chat_id')).toBe('42'); expect(calls[1]!.body.get('caption')).toBe('cap'); expect(calls[1]!.body.get('document')).toBeInstanceOf(Blob)
  })
  it('caption and file name state the result, mark a correction, and link the club page', () => {
    const j = {kind: 'FINAL' as const, clubId: 'hapoel-tel-aviv', result: {...result}}
    expect(captionFor(j)).toBe('FINAL WHISTLE\nHapoel Tel Aviv 2–1 Rival FC\nIsraeli Premier League\nhttps://fanlife.dubelteam.com/clubs/hapoel-tel-aviv')
    expect(captionFor({...j, kind: 'CORRECTED'}).startsWith('CORRECTED RESULT')).toBe(true)
    expect(captionFor({...j, result: {...result, finalStatus: 'PEN', penalties: {home: 4, away: 3}}})).toContain('penalties 4–3')
    expect(documentName(j)).toBe('final-whistle-hapoel-tel-aviv-2026-10-17.png')
  })
  it('a PNG must be a PNG of the right size', () => {
    const b = new Uint8Array(24); b.set([137, 80, 78, 71, 13, 10, 26, 10]); new DataView(b.buffer).setUint32(16, 1080); new DataView(b.buffer).setUint32(20, 1920)
    expect(pngSize(b)).toEqual({w: 1080, h: 1920}); expect(pngSize(new Uint8Array(30))).toBeNull()
  })
  it('only the sender’s OWN contact with the expected number, in a private chat, links the chat', () => {
    const ok = {chat: {id: 99, type: 'private'}, from: {id: 5}, contact: {phone_number: '+30 694 370 4434', user_id: 5}}
    expect(judgeContact(ok, '+306943704434')).toEqual({ok: true, chatId: '99'})
    expect(judgeContact({...ok, contact: {phone_number: '306943704434', user_id: 6}}, '+306943704434').ok).toBe(false)
    expect(judgeContact({...ok, contact: {phone_number: '30111', user_id: 5}}, '+306943704434').ok).toBe(false)
    expect(judgeContact({...ok, chat: {id: 99, type: 'group'}}, '+306943704434').ok).toBe(false)
    expect(judgeContact(ok, '').ok).toBe(false)
    expect(digits('+30 (694)')).toBe('30694')
  })
})

describe('render links', () => {
  const S = 's'.repeat(40)
  it('are signed for one job and a few minutes', () => {
    const {exp, sig} = signRender(S, ID, 1000)
    expect(verifyRender(S, ID, exp, sig, 2000)).toBe(true)
    expect(verifyRender(S, 'b'.repeat(24), exp, sig, 2000)).toBe(false)
    expect(verifyRender(S, ID, exp, sig, exp + 1)).toBe(false)
    expect(verifyRender('t'.repeat(40), ID, exp, sig, 2000)).toBe(false)
    expect(verifyRender(S, ID, 1000 + RENDER_TTL_MS * 10, sig, 2000)).toBe(false)
    expect(() => signRender('short', ID, 0)).toThrow()
  })
})

describe('jobs: lease, idempotency, and never sending twice', () => {
  it('without a durable store nothing is saved', async () => {
    useDurableStore(null)
    await expect(getConfig()).rejects.toThrow(/durable store/)
  })
  it('switching on starts the clock; nothing before it is history to send', async () => {
    useDurableStore(memoryStore())
    expect((await getConfig()).enabled).toBe(false)
    const c = await setConfig({enabled: true}, T0)
    expect(c.bootstrapAt).toBe(T0.toISOString()); expect(c.dryRun).toBe(true)
    expect((await setConfig({dryRun: false}, at(5))).bootstrapAt).toBe(T0.toISOString())
    await expect(setConfig({clubIds: ['not-a-club']}, T0)).rejects.toThrow(/cannot identify/)
  })
  it('two runners cannot claim the same job', async () => {
    useDurableStore(memoryStore()); await seedJob()
    const [a, b] = await Promise.all([claim('A', T0), claim('B', T0)])
    expect([a, b].filter(Boolean)).toHaveLength(1)
    expect(await claim('C', at(1))).toBeNull()
  })
  it('a runner that dies while rendering frees the job after the lease; one that dies while SENDING makes it "unknown", not resendable', async () => {
    useDurableStore(memoryStore()); await seedJob()
    expect((await claim('A', T0))!.job.attempts).toBe(1)
    expect((await claim('B', at(11)))!.job.attempts).toBe(2)         // rendering lease expired → safe to take again
    await markSending(ID, 'B', at(11))
    await sweepLeases(at(30))
    expect(await claim('C', at(31))).toBeNull()
    const j = (await ownerAction(ID, 'dismiss', at(32)))
    expect(j.ok && j.job.state).toBe('superseded')
  })
  it('only the lease holder moves a job; a sent job is never sent again, and completing twice is harmless', async () => {
    useDurableStore(memoryStore()); await seedJob()
    await claim('A', T0)
    expect((await markSending(ID, 'B', at(1))).ok).toBe(false)
    expect((await markSending(ID, 'A', at(1))).ok).toBe(true)
    expect((await complete(ID, 'A', {photo: 1, document: 2}, at(2))).ok).toBe(true)
    expect((await complete(ID, 'A', {photo: 1, document: 2}, at(3))).ok).toBe(true)
    expect(await pendingCount(at(60))).toBe(0)
    expect(await claim('A', at(60))).toBeNull()
    expect((await fail(ID, 'A', {error: 'late', retryable: true}, at(61)))).toMatchObject({ok: true, job: {state: 'sent'}})
  })
  it('a dry run completes without ever being sent, and says so', async () => {
    useDurableStore(memoryStore()); await seedJob({dryRun: true})
    await claim('A', T0)
    const r = await complete(ID, 'A', {}, at(1))
    expect(r.ok && r.job.note).toMatch(/dry run/)
  })
  it('after sending began, an unqualified failure is "unknown" — never a silent resend; a definite refusal may retry', async () => {
    useDurableStore(memoryStore()); await seedJob()
    await claim('A', T0); await markSending(ID, 'A', at(1))
    const lost = await fail(ID, 'A', {error: 'runner crashed', retryable: true}, at(2))
    expect(lost.ok && lost.job.state).toBe('delivery_unknown')
    useDurableStore(memoryStore()); await seedJob()
    await claim('A', T0); await markSending(ID, 'A', at(1))
    const refused = await fail(ID, 'A', {error: 'rate limited', retryable: true, definite: true, delivered: {photo: 9}}, at(2))
    expect(refused.ok && refused.job).toMatchObject({state: 'retryable_failed', delivered: {photo: 9}})
  })
  it('failures: retryable waits (with the delivered half remembered); a refusal needs a person; "unknown" is never retried by itself', async () => {
    useDurableStore(memoryStore()); await seedJob()
    await claim('A', T0)
    const f = await fail(ID, 'A', {error: 'slow down', retryable: true, retryAfterSec: 60, delivered: {photo: 9}}, at(1))
    expect(f.ok && f.job).toMatchObject({state: 'retryable_failed', delivered: {photo: 9}})
    expect(await claim('A', at(1))).toBeNull()                       // not before retryAfter
    const again = await claim('A', at(3))
    expect(again!.job.delivered).toEqual({photo: 9})                  // the runner skips the photo
    const u = await uncertain(ID, 'A', {error: 'no answer'}, at(4))
    expect(u.ok && u.job.state).toBe('delivery_unknown')
    expect(await claim('A', at(500))).toBeNull()
    const r = await ownerAction(ID, 'retry', at(501))
    expect(r.ok && r.job).toMatchObject({state: 'ready', attempts: 0}); expect(r.ok && r.job.note).toMatch(/duplicate/)
  })
  it('five failed attempts stop for a person', async () => {
    useDurableStore(memoryStore()); await seedJob({attempts: 5})
    await claim('A', T0)
    expect(await pendingCount(at(1))).toBe(0)
  })
})
