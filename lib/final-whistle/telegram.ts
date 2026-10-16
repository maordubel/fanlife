/**
 * FINAL WHISTLE → Telegram. No imports and no aliases on purpose: the scheduled runner (plain node) loads this file as it is.
 * The token is a function argument, never logged and scrubbed from every error. "unknown" = we cannot tell whether Telegram
 * delivered (timeout, 5xx, no answer) — the caller must NOT resend on its own.
 */
export const TELEGRAM_API = 'https://api.telegram.org'
export type Sent = {ok: true; messageId: number} | {ok: false; kind: 'rejected' | 'unknown'; retryable: boolean; retryAfterSec?: number; error: string}
type Fetch = typeof fetch
const scrub = (s: string, token: string) => (token ? s.split(token).join('[token]') : s).slice(0, 300)

export async function callTelegram(token: string, method: string, body: FormData | Record<string, unknown>, f: Fetch = fetch, timeoutMs = 25_000): Promise<Sent & {result?: unknown}> {
  let res: Response, text: string
  try {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData
    res = await f(`${TELEGRAM_API}/bot${token}/${method}`, {method: 'POST', body: isForm ? body : JSON.stringify(body), headers: isForm ? undefined : {'content-type': 'application/json'}, signal: AbortSignal.timeout(timeoutMs)})
    text = await res.text()
  } catch (e) {
    return {ok: false, kind: 'unknown', retryable: false, error: scrub(`no answer from Telegram: ${(e as Error)?.name ?? 'error'}`, token)}
  }
  let j: {ok?: boolean; result?: {message_id?: number}; description?: string; parameters?: {retry_after?: number}} | null = null
  try { j = JSON.parse(text) } catch { /* not JSON */ }
  if (j?.ok && res.ok) return {ok: true, messageId: j.result?.message_id ?? 0, result: j.result}
  if (res.status === 429) return {ok: false, kind: 'rejected', retryable: true, retryAfterSec: j?.parameters?.retry_after ?? 30, error: 'Telegram asked us to slow down'}
  if (res.status >= 400 && res.status < 500 && j) return {ok: false, kind: 'rejected', retryable: false, error: scrub(`Telegram refused (${res.status}): ${j.description ?? ''}`, token)}
  return {ok: false, kind: 'unknown', retryable: false, error: scrub(`Telegram answered ${res.status}`, token)}
}

const form = (chatId: string, field: 'photo' | 'document', name: string, png: Uint8Array, caption?: string) => {
  const fd = new FormData()
  fd.set('chat_id', chatId)
  if (caption) fd.set('caption', caption.slice(0, 1000))
  fd.set(field, new Blob([png as BlobPart], {type: 'image/png'}), name)
  if (field === 'document') fd.set('disable_content_type_detection', 'true')
  return fd
}
export const sendPhoto = (token: string, chatId: string, png: Uint8Array, caption: string, f?: Fetch) => callTelegram(token, 'sendPhoto', form(chatId, 'photo', 'final-whistle-preview.png', png, caption), f)
export const sendDocument = (token: string, chatId: string, png: Uint8Array, fileName: string, caption: string, f?: Fetch) => callTelegram(token, 'sendDocument', form(chatId, 'document', fileName, png, caption), f)

type CaptionJob = {kind: 'FINAL' | 'CORRECTED'; clubId: string; result: {home: string; away: string; homeScore: number; awayScore: number; competition: string | null; kickoff: string; finalStatus: 'FT' | 'AET' | 'PEN'; penalties: {home: number; away: number} | null}}
/** Plain text (no parse mode, so no escaping can go wrong). The link is the club's page — the story itself carries the one fixed address. */
export function captionFor(j: CaptionJob, site = 'https://fanlife.dubelteam.com'): string {
  const r = j.result
  const tail = r.finalStatus === 'AET' ? ' (after extra time)' : r.finalStatus === 'PEN' && r.penalties ? ` (penalties ${r.penalties.home}–${r.penalties.away})` : ''
  return [j.kind === 'CORRECTED' ? 'CORRECTED RESULT' : 'FINAL WHISTLE', `${r.home} ${r.homeScore}–${r.awayScore} ${r.away}${tail}`, r.competition, `${site}/clubs/${j.clubId}`].filter(Boolean).join('\n')
}
export const documentName = (j: CaptionJob) => `final-whistle-${j.clubId}-${j.result.kickoff.slice(0, 10)}${j.kind === 'CORRECTED' ? '-corrected' : ''}.png`

/** PNG signature + IHDR size, so a blank or wrong-sized render is never sent. */
export function pngSize(b: Uint8Array): {w: number; h: number} | null {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10]
  if (b.length < 24 || sig.some((v, i) => b[i] !== v)) return null
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
  return {w: dv.getUint32(16), h: dv.getUint32(20)}
}

/** Linking the owner's chat: only the person who shares THEIR OWN contact, with the expected number, in a private chat. */
export type TgMessage = {chat?: {id?: number; type?: string}; from?: {id?: number}; text?: string; contact?: {phone_number?: string; user_id?: number}}
export const digits = (s: string) => s.replace(/\D/g, '')
export function judgeContact(m: TgMessage, expectedPhone: string): {ok: true; chatId: string} | {ok: false; why: string} {
  const exp = digits(expectedPhone)
  if (exp.length < 8) return {ok: false, why: 'the expected number is not set'}
  if (m.chat?.type !== 'private' || m.chat.id === undefined) return {ok: false, why: 'not a private chat'}
  if (!m.contact || m.contact.user_id === undefined || m.contact.user_id !== m.from?.id) return {ok: false, why: 'the contact is not the sender’s own'}
  if (digits(m.contact.phone_number ?? '') !== exp) return {ok: false, why: 'the number does not match'}
  return {ok: true, chatId: String(m.chat.id)}
}
