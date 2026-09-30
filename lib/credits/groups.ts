/**
 * קבוצות המקורות — the shape of `/credits`, and the only thing a screen needs to point at it.
 *
 * Client-safe on purpose: `components/ui/SourceNote.tsx` imports `creditsHref` from here,
 * and must never pull the server-only read-model (`lib/credits/index.ts`, which reads
 * `content/manual` from disk) into a client bundle.
 *
 * Spec §0.3 (22.9.2026): credits and sources live in ONE place. A screen that states a
 * fact shows at most `מקור מתועד`, linked here; the data layer keeps every `sourceTitle`
 * and `sourceUrl` it had, because integrity needs them — only the UI stops scattering them.
 */

/**
 * Page order. `team` is the owner-knowledge label; `assets` is asset provenance.
 * `community` (27.9.2026) is the one shelf that is NOT sources: people and sites who keep the
 * club's memory, and the shop links (`lib/merch.ts`). Nothing is ever grouped onto it by
 * `groupOf` — it is filled from `COMMUNITY` in `lib/credits/index.ts`, so no fact or asset
 * can cite it by accident.
 */
export const CREDIT_GROUPS = ['club', 'press', 'wiki', 'photo', 'data', 'research', 'team', 'assets', 'community', 'other'] as const

export type CreditGroupKey = (typeof CREDIT_GROUPS)[number]

/**
 * The neutral label the owner's own knowledge is cited under (spec §0.2, 22.9.2026).
 * `lib/game/hate-run.ts` classifies on it and `lib/credits` groups on it.
 */
export const OWNER_KNOWLEDGE_LABEL = 'ידע אישי — צוות The Worker'

export const CREDITS_PATH = '/credits'

/** `/credits`, or `/credits#<group>` when the caller knows which shelf it cites. */
export function creditsHref(group?: CreditGroupKey | null): string {
  return group ? `${CREDITS_PATH}#${group}` : CREDITS_PATH
}
