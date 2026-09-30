/**
 * מונטיזציה — the shapes, and the order they serve.
 *
 * Maor's plan, 7.9.2026, ends with the hierarchy this whole folder obeys:
 * **player experience → historical integrity → story → retention → revenue.** Never
 * reversed. So the types here describe an advertising layer that is a SERVICE AROUND the
 * game: it is asked, at moments the game chooses, whether this is a reasonable time; it
 * may always answer no; and the game never waits for it, never depends on it, and never
 * changes what it would have done because of it.
 */

/**
 * A moment the game is willing to be interrupted at. Nothing else is ever offered, and
 * a safe point is an OPPORTUNITY rather than an ad: `AdDirector` decides.
 */
export type SafePoint =
  /** a chapter's own written ending has played and its card has been dismissed */
  | 'chapter_completed'
  /** a day closed and the next has not opened */
  | 'day_completed'
  /** the game itself moved the clock — the pass-time card, a bridge card */
  | 'major_time_jump'
  /** stage A → stage B and the like */
  | 'stage_transition'
  /** the player left the world for the menu */
  | 'return_to_menu'
  /** half time, after the score is on the screen and before anything is asked */
  | 'half_time'
  /** a historical event AND its whole emotional aftermath are finished */
  | 'historical_event_aftermath_complete'

export type AdKind = 'interstitial' | 'rewarded'

/** what happened, in the words the analytics use */
export type AdResult =
  | 'shown'
  | 'completed'
  | 'dismissed'
  | 'unavailable'
  | 'blocked'
  | 'failed'
  | 'skipped_by_policy'

/**
 * A provider is anything that can show an ad. The game only ever holds this interface, so
 * Google is never coupled to Phaser, to React or to a chapter — and a provider that does
 * nothing (`none`) is a legitimate implementation, which is what makes the whole layer
 * safe to ship switched off.
 */
export type AdProvider = {
  readonly id: string
  /** is the provider loaded and willing — never throws, never blocks */
  ready(): boolean
  /** show one; resolves with what happened. MUST resolve, and MUST NOT throw */
  show(kind: AdKind): Promise<AdResult>
}

/** the numbers, in one place, so monetization can be tuned without touching gameplay */
export type AdPolicyConfig = {
  /** game-minutes of actual play between two interstitials */
  minMeaningfulPlayBetweenAds: number
  /** real seconds a session must run before the first ad is even considered */
  minimumSessionAgeBeforeFirstAd: number
  maxInterstitialsPerSession: number
  /** safe points ignored entirely while a master event and its aftermath are open */
  masterEventCooldown: number
  stageTransitionAdsEnabled: boolean
  /** the supporter build, and the fallback path for every reward */
  isAdFree: boolean
  /** which safe points are eligible at all — start small, widen later */
  enabledSafePoints: readonly SafePoint[]
}

/** what the director knows about this session; nothing here identifies a person */
export type AdSession = {
  startedAt: number
  interstitials: number
  /** game-minutes played since the last interstitial */
  playedSinceAd: number
  lastResult: AdResult | null
  lastSafePoint: SafePoint | null
  /** true from entering a master event until its aftermath is done */
  locked: boolean
}

/** an archive extra: bonus material, never a step in the story */
export type Reward = {
  id: string
  titleHe: string
  /** what the player is being offered, in the game's own voice */
  bodyHe: string
  /** the chapter it belongs to, so it can only be offered where it makes sense */
  chapter: string
  /** the flag raised when it is granted — always `archive:` and never gameplay */
  flag: string
}
