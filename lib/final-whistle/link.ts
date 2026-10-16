import 'server-only'
import {createHash, randomInt, timingSafeEqual} from 'node:crypto'
import {readDoc, updateDoc} from './store'
import {linkDestination} from './service'

/**
 * Linking the owner's chat without a phone number or a terminal: the signed-in owner asks the control room for a one-time code,
 * then sends `/link CODE` to the bot. The bot's webhook calls `redeemLink`. The code is stored only as a hash, lives 15 minutes,
 * works once, and five wrong tries burn it. Authority comes from the owner's session, which issued the code.
 */
type Pending = {hash: string; expires: string; wrong: number} | null
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const TTL_MS = 15 * 60_000
const hashOf = (code: string) => createHash('sha256').update('fw-link:' + code).digest('hex')

export async function issueLinkCode(now: Date): Promise<{code: string; expires: string}> {
  const code = Array.from({length: 8}, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  const expires = new Date(now.getTime() + TTL_MS).toISOString()
  await updateDoc<Pending>('link.json', null, () => ({hash: hashOf(code), expires, wrong: 0}))
  return {code, expires}
}

/** Returns the text to answer with, or null when the message is not a link attempt at all. */
export async function redeemLink(text: string, chatId: number, now: Date): Promise<string | null> {
  const m = /^\/link(?:@\w+)?(?:\s+([A-Za-z0-9-]{4,16}))?\s*$/i.exec(text.trim())
  if (!m) return null
  if (!Number.isSafeInteger(chatId) || chatId <= 0) return null
  const code = (m[1] ?? '').replace(/-/g, '').toUpperCase()
  if (!code) return 'Send /link followed by the code from the control room: Operations → Final Whistle → Link Telegram.'
  let outcome = 'none' as 'ok' | 'bad' | 'none'
  await updateDoc<Pending>('link.json', null, cur => {
    outcome = 'none'
    if (!cur || Date.parse(cur.expires) <= now.getTime()) return null
    const a = Buffer.from(hashOf(code)), b = Buffer.from(cur.hash)
    if (a.length === b.length && timingSafeEqual(a, b)) { outcome = 'ok'; return null }
    outcome = 'bad'
    return cur.wrong + 1 >= 5 ? null : {...cur, wrong: cur.wrong + 1}
  })
  if (outcome === 'ok') { await linkDestination(String(chatId), now); return 'Linked. FINAL WHISTLE cards will arrive in this chat.\n\nFanLife.DubelTeam.com' }
  return 'That code is not valid or has expired. Ask the control room for a new one.'
}
export async function linkPending(now: Date): Promise<{expires: string} | null> {
  const p = (await readDoc<Pending>('link.json', null)).value
  return p && Date.parse(p.expires) > now.getTime() ? {expires: p.expires} : null
}
