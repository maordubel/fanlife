import { SITE_URL } from '@/lib/brand'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * מה כתוב בשיתוף — the text that travels with a share, and where it lands.
 *
 * A share is not a screenshot with a link stapled to it. The message has to work when
 * it arrives cold in a group chat between two other conversations: it has to say what
 * happened, dare the reader to beat it, and hand them the exact same round rather than
 * a homepage. That last part is the whole engine — `?seed=` makes a result
 * CHALLENGEABLE instead of merely announced, and a challenge is the only kind of link a
 * football supporter forwards.
 */
export type ShareKind =
  | 'hate'
  | 'file'
  | 'trivia'
  | 'kit'
  | 'xi'
  | 'worst'
  | 'member'
  | 'lineup'
  | 'memory'
  | 'goal'
  | 'timeline'
  | 'polls'
  // הארון (מפרט §45–§49) — no round, no seed: each hands over a closet, a shirt or the market
  | 'closet'
  | 'wanted'
  | 'gaps'
  | 'match'
  // Share V2 (28.9.2026) — the gates that shared through a system of their own
  | 'blindcow'
  | 'rumble'
  | 'thread'
  // gate 12 and THE WORKER LIFE (28.9.2026) — a story to open, not a round to beat
  | 'archive'
  | 'life'

const ROUTE: Record<ShareKind, string> = {
  hate: '/derby',
  file: '/derby/file',
  trivia: '/trivia',
  kit: '/kits/build',
  xi: '/xi',
  // ההרכב הגרוע — the same gate, the other sheet. The tab is a parameter `/xi` READS
  // (see `app/xi/page.tsx`), so the link opens on the eleven it is talking about.
  worst: '/xi?tab=worst',
  member: '/tik',
  lineup: '/lineup',
  memory: '/memory',
  goal: '/goal',
  timeline: '/timeline',
  polls: '/polls',
  // the closet cards always pass `route` (the collector's own closet, the archive item); these
  // are where a card lands when it has nothing more specific to hand over
  closet: '/kits/closet',
  wanted: '/kits/archive',
  gaps: '/kits/closet',
  match: '/kits/market',
  // gate 10 has no seed: its same-run link is always a challenge (`/c/…`, the man sealed)
  blindcow: '/blind-cow',
  rumble: '/royal-rumble',
  thread: '/timeline',
  // both always pass `route`: the archive item (`/archive?at=<id>`), the LIFE landing (`/life?ch=`)
  archive: '/archive',
  life: '/life',
}

/** The link a share sends people to — the same round, not the front door. */
/**
 * A gate with no round has no seed to hand over.
 *
 * Every other share here is a dare — the link reproduces the identical round. The polls
 * wing has no round: there is nothing to reproduce and nothing to beat, and a `?seed=1`
 * stapled to it would be a parameter the page ignores, which is the kind of small lie
 * that makes a URL untrustworthy to read.
 */
const SEEDLESS: ReadonlySet<ShareKind> = new Set<ShareKind>(['polls', 'xi', 'worst', 'member', 'closet', 'wanted', 'gaps', 'match', 'blindcow', 'archive', 'life'])

/**
 * The line under the share row says what the LINK does (see `ShareRow`), so a kind that hands
 * over something other than a round says so in its own words. Written out in full (rule 32).
 */
const DARE: Partial<Record<ShareKind, MessageKey>> = {
  polls: 'share.dare.polls',
  closet: 'collector.share.dare.closet',
  wanted: 'collector.share.dare.wanted',
  gaps: 'collector.share.dare.gaps',
  match: 'collector.share.dare.match',
  archive: 'share.dare.archive',
  life: 'share.dare.life',
}

export function dareKey(kind: ShareKind): MessageKey {
  return DARE[kind] ?? 'share.dare'
}

/*
 * Two more joined `polls` on 17.9.2026, and both were live defects rather than tidying.
 *
 * · **`xi`** did not exist. The all-time XI shared as `kind="lineup"` with a hand-written
 *   `params={{ s: '1' }}`, so every card in the world handed its reader
 *   `/xi?seed=1&from=share` — a parameter `/xi` does not read, on a screen that deals no
 *   round. The recipient got an empty pitch and a promise of a round that was never there.
 * · **`member`** replaces `crest`, which pointed at `/crest` — a TOMBSTONE that
 *   `redirect('/')`s. The member card is the one artefact in this app that is purely
 *   somebody's own, and its share button sent every reader to the front door.
 *
 * Neither route reads a seed, so neither gets one. That is the same sentence the polls
 * wing earned: a parameter the page ignores is a small lie in a URL people read.
 */

/**
 * Two things a challenge link has to carry that it did not.
 *
 *   · **The topic.** `trivia` points at `/trivia`, which is the PICKER — a route that
 *     reads no seed. A trivia challenge therefore dropped the recipient on a wall of
 *     five topics with the round it was bragging about nowhere in sight. The topic is a
 *     route segment (`/trivia/europe`), so `route` overrides the gate's own path for
 *     exactly that case. `/xi` needs it for the same reason in reverse: its card shares
 *     as `kind="lineup"`, which would send an all-time XI to the graded match quiz.
 *   · **The cursor.** With rotation on, a round is addressed by seed AND cursor
 *     (`lib/rotation/deck.ts`); a link carrying only the seed reproduces the first
 *     round of that deck rather than the one that was played.
 *
 * This is the one link in the app that is deliberately NOT re-rolled on arrival
 * (`lib/rotation/round.ts`) — the point of a duel is that both people get the same
 * questions.
 */
export function challengeUrl(
  kind: ShareKind,
  seed: string | number,
  cursor: string | number = 0,
  route?: string,
): string {
  const path = route ?? ROUTE[kind]
  // A route may already carry the parameter that decides WHICH screen it is — `/xi`'s
  // two sheets are one route — so the marker joins with `&` rather than minting a
  // second `?` and producing a URL no browser reads the way it looks.
  const join = path.includes('?') ? '&' : '?'
  if (SEEDLESS.has(kind)) return `${SITE_URL}${path}${join}from=share`
  const r = Number(cursor) > 0 ? `&r=${cursor}` : ''
  // A seeded route may carry its own query too — gate 2's era, Hard, and a personal
  // run's `?q=` ids — so the seed joins it rather than opening a second `?`.
  return `${SITE_URL}${path}${join}seed=${seed}${r}&from=share`
}

/**
 * The WhatsApp body. Hebrew, three short lines, then the link on its own line so the
 * client renders a preview card rather than burying it mid-sentence.
 */
export function whatsappText(
  kind: ShareKind,
  vars: Record<string, string>,
  seed: string | number,
  cursor: string | number = 0,
  route?: string,
) {
  const key = `share.msg.${kind}` as MessageKey
  return `${t(key, vars)}\n\n${challengeUrl(kind, seed, cursor, route)}`
}

export function whatsappHref(
  kind: ShareKind,
  vars: Record<string, string>,
  seed: string | number,
  cursor: string | number = 0,
  route?: string,
) {
  return `https://wa.me/?text=${encodeURIComponent(whatsappText(kind, vars, seed, cursor, route))}`
}

export function telegramHref(
  kind: ShareKind,
  vars: Record<string, string>,
  seed: string | number,
  cursor: string | number = 0,
  route?: string,
) {
  const url = challengeUrl(kind, seed, cursor, route)
  const key = `share.msg.${kind}` as MessageKey
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(t(key, vars))}`
}
