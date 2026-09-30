/**
 * שתי זהויות, בכוונה (ONE RED WORLD §35).
 *
 *   · `AccountIdentity` — מי שנכנס: מזהה החשבון ומייל של Google. חי רק במסך הפרטים של
 *     "אני" (`app/tik/AccountPlate.tsx`) ולא יוצא ממנו. שום משטח ציבורי לא מקבל אותו.
 *   · `PublicSupporterIdentity` — מי שהיציע רואה: כינוי שהאדם בחר, או "אדום #N". זה כל מה
 *     שכרטיס שיתוף, יציע או חבר בקבוצה יודעים. אין בו id ואין בו מייל — לא כשדה ריק, אלא
 *     כשדה שלא קיים בטיפוס (`tests/personal-area.test.ts` בודק את המפתחות).
 *
 * **ברירת המחדל היא אנונימי.** פרטיות היא מצב ההתחלה ולא הגדרה שמחפשים; כינוי מופיע רק
 * כשהאדם בחר בו במפורש. המספר N מונפק בחשבון (`worker_public_identity_me`, מיגרציה
 * `20260928130000_worker_public_identity.sql`) וקפוא כמו מספר המנוי (כלל 76). במכשיר בלי
 * חשבון אין N — והתווית היא "אדום", בלי מספר מומצא.
 *
 * ההעדפה נשמרת במכשיר (`worker.public.v1`) ומסונכרנת דרך `lib/portal/public-sync.ts`:
 * העריכה החדשה מנצחת, בשני הצדדים באותו כלל.
 */

import { NAME_MAX } from '@/lib/game/member'

export type AccountIdentity = {
  readonly kind: 'account'
  userId: string
  email: string | null
}

export type PublicMode = 'anonymous' | 'nickname'

/** Everything a public surface may know about a supporter. No id, no email, no account name. */
export type PublicSupporterIdentity = {
  readonly kind: 'public'
  mode: PublicMode
  /** what is printed: the nickname, or "אדום #N", or "אדום" before a number exists */
  label: string
  /** the N of "אדום #N", issued by the account; null on a device with no account */
  no: number | null
}

/** The device's preference. `nickname` is kept while anonymous — choosing it again is one tap. */
export type PublicPref = {
  mode: PublicMode
  nickname: string
  /** ISO instant of the last edit; '' = never */
  editedAt: string
  /** the account's number, cached after a sync so the label can print it offline */
  no: number | null
}

export const PUBLIC_KEY = 'worker.public.v1'
export const ANON_WORD = 'אדום'

export function defaultPref(): PublicPref {
  return { mode: 'anonymous', nickname: '', editedAt: '', no: null }
}

export function cleanNickname(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
}

export function cleanPref(raw: unknown): PublicPref {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return defaultPref()
  const row = raw as Record<string, unknown>
  const nickname = cleanNickname(row.nickname)
  const mode: PublicMode = row.mode === 'nickname' && nickname !== '' ? 'nickname' : 'anonymous'
  const editedAt = typeof row.editedAt === 'string' && !Number.isNaN(Date.parse(row.editedAt)) ? row.editedAt : ''
  const no = typeof row.no === 'number' && Number.isInteger(row.no) && row.no > 0 ? row.no : null
  return { mode, nickname, editedAt, no }
}

/** The label a stand, a group card or a share card prints. */
export function publicIdentity(pref: PublicPref): PublicSupporterIdentity {
  if (pref.mode === 'nickname' && pref.nickname !== '') {
    return { kind: 'public', mode: 'nickname', label: pref.nickname, no: pref.no }
  }
  return { kind: 'public', mode: 'anonymous', label: pref.no === null ? ANON_WORD : `${ANON_WORD} #${pref.no}`, no: pref.no }
}

/**
 * Two preferences (device, account) → one. The newer edit wins; a never-edited side loses to
 * any edit. The number is the account's and only ever arrives from it — a device never
 * mints one, and once known it is never replaced (the SQL refuses a re-issue anyway).
 */
export function mergePref(device: PublicPref, account: PublicPref): PublicPref {
  const deviceAt = device.editedAt === '' ? -Infinity : Date.parse(device.editedAt)
  const accountAt = account.editedAt === '' ? -Infinity : Date.parse(account.editedAt)
  const winner = accountAt > deviceAt ? account : device
  return { ...winner, no: account.no ?? device.no }
}

export function setMode(pref: PublicPref, mode: PublicMode, nickname: string, now: Date = new Date()): PublicPref {
  const clean = cleanNickname(nickname)
  return {
    ...pref,
    mode: mode === 'nickname' && clean !== '' ? 'nickname' : 'anonymous',
    nickname: clean,
    editedAt: now.toISOString(),
  }
}

/* ---------------------------------------------------------------- the device's copy */

export function readPref(): PublicPref {
  if (typeof window === 'undefined') return defaultPref()
  try {
    const raw = window.localStorage.getItem(PUBLIC_KEY)
    return raw ? cleanPref(JSON.parse(raw)) : defaultPref()
  } catch {
    return defaultPref()
  }
}

export function writePref(pref: PublicPref): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PUBLIC_KEY, JSON.stringify(cleanPref(pref)))
  } catch {
    // private mode: the choice holds for this visit
  }
}
