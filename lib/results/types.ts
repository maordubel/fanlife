import type { MessageKey } from '@/lib/i18n'

/**
 * RESULT CONTEXT — the types (master plan §5, §38). Client-safe.
 *
 * A context does not replace a gate's state. It says one thing: *what just happened, and
 * which real entities mattered in it* — so the exit, the archive, LIFE and the share can
 * all be derived from the same small record instead of each gate inventing its own.
 * Every id here is a canonical id the archive already knows (`m_…`, `p_…`, a goal id, a
 * kit id); nothing in a context is text a screen prints.
 */
export type ResultContext = {
  gateId: number
  /** the run as the gate names it — `seed:cursor`, a duel id, a daily's date */
  runId?: string

  playerIds?: string[]
  matchIds?: string[]
  goalIds?: string[]
  kitIds?: string[]
  seasonIds?: string[]
  archiveEntityIds?: string[]

  era?: string
  score?: number

  /** topic / facet slugs the run went well on (`kits`, `europe`, `1990s`) */
  strengths?: string[]
  /** topic / facet slugs the run went badly on — the recommend engine reads these */
  weakTopics?: string[]
  choices?: Record<string, string>

  /** LIFE chapter ids the run touched — offered only once the chapter is unlocked */
  lifeAnchors?: string[]
}

export type NextActionKind = 'archive' | 'away' | 'goal' | 'gate' | 'life'

/**
 * One natural next step (§6, layer 2). `href` was resolved and CHECKED by
 * `lib/links/index.ts` on the server; `label` is a message key; `subject` names what the
 * door opens on when that helps ("צ'לסי 2001").
 */
export type NextAction = {
  kind: NextActionKind
  href: string
  label: MessageKey
  subject: string | null
  /** why this was chosen — the rule's name, for the measurement and the tests */
  reason: string
}

/** What the engine may know about the person — nothing of it leaves the server. */
export type RecommendState = {
  /** LIFE chapters the person has unlocked. Absent = nothing unlocked, no LIFE links. */
  lifeUnlocked?: (chapterId: string) => boolean
  /** hrefs already on the screen (the gate's own cross-link chips) — not offered twice */
  exclude?: readonly string[]
}
