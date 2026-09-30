import { Q_TOPICS, type QTopic } from './questions/types'

/**
 * נושאי הטריוויה — Quick Pick's seven ways in, plus הכול מהכול.
 *
 * Maor's wing had five doors (general, terrace songs, Europe, numbers, player songs);
 * the Quick Pick prototype has seven topics. The seven are TAGS on the master's
 * questions, not seven datasets (rule 1), and the old doors stay open as aliases so no
 * link anybody ever shared stops working:
 *
 *   /trivia/general        → הכול מהכול (both sports, as Maor asked)
 *   /trivia/terrace-songs  → songs
 *   /trivia/player-songs   → songs
 *
 * **On rule 14.** Every question carries a `sport` and is single-sport inside itself; a
 * TOPIC decides which sports are in scope. Only הכול מהכול admits the basketball wing,
 * and `derby` means Maccabi Tel Aviv and nothing else (rule 13).
 *
 * Pure and client-safe: the lobby imports it. The bank itself is server-only.
 */

export { Q_TOPICS, type QTopic }

/** the route segments a run can live under — canonical first, then the aliases */
export const TOPICS = ['general', ...Q_TOPICS] as const
export type Topic = (typeof TOPICS)[number]
export const DEFAULT_TOPIC: Topic = 'general'

const ALIASES: Record<string, Topic> = {
  'terrace-songs': 'songs',
  'player-songs': 'songs',
}

/** every segment a link may carry, the old doors included */
export const ROUTE_SEGMENTS: readonly string[] = [...TOPICS, ...Object.keys(ALIASES)]

export function isTopic(value: string | undefined): value is Topic {
  return value !== undefined && (TOPICS as readonly string[]).includes(value)
}

/** a route segment → the topic it plays, or null for a segment nobody ever issued */
export function resolveTopic(value: string | undefined): Topic | null {
  if (value === undefined) return null
  if (isTopic(value)) return value
  return ALIASES[value] ?? null
}

/** `general` plays everything — the master has no `general` tag */
export function questionTopic(topic: Topic): QTopic | null {
  return topic === 'general' ? null : topic
}

export type TopicSpec = {
  slug: Topic
  /** message keys — no user-facing string lives in code (rule 10) */
  titleKey: string
  bladeKey: string
  /** a one-glyph mark for the Quick Pick tile, drawn as type, never as an image */
  mark: string
  /** which sports may appear in the round. Never mixed inside one question. */
  sports: Array<'football' | 'basketball'>
}

export const TOPIC_SPECS: Record<Topic, TopicSpec> = {
  general: { slug: 'general', titleKey: 'topic.general', bladeKey: 'topic.general.blade', mark: '∞', sports: ['football', 'basketball'] },
  europe: { slug: 'europe', titleKey: 'topic.europe', bladeKey: 'topic.europe.blade', mark: '✈', sports: ['football'] },
  players: { slug: 'players', titleKey: 'topic.players', bladeKey: 'topic.players.blade', mark: '11', sports: ['football'] },
  history: { slug: 'history', titleKey: 'topic.history', bladeKey: 'topic.history.blade', mark: '★', sports: ['football'] },
  numbers: { slug: 'numbers', titleKey: 'topic.numbers', bladeKey: 'topic.numbers.blade', mark: '#', sports: ['football'] },
  songs: { slug: 'songs', titleKey: 'topic.songs', bladeKey: 'topic.songs.blade', mark: '♫', sports: ['football'] },
  kits: { slug: 'kits', titleKey: 'topic.kits', bladeKey: 'topic.kits.blade', mark: '◫', sports: ['football'] },
  derby: { slug: 'derby', titleKey: 'topic.derby', bladeKey: 'topic.derby.blade', mark: '×', sports: ['football'] },
}

export function topicSpec(topic: Topic): TopicSpec {
  return TOPIC_SPECS[topic]
}
