import type { HistoricalAnchor } from '../anchors'
import type { AnchorSet } from '../content/era'
import type { LifeEngine } from '../engine'

import type { LifeBus } from './bus'
import type { DialogueRunner } from './dialogue'
import type { InputState } from './input'

/**
 * מה שכל סצנה צריכה. Held in Phaser's registry under one key, so a scene reaches the
 * life through a typed object instead of through a global — and so a test can build the
 * whole context without a canvas.
 */
export type LifeContext = {
  engine: LifeEngine
  bus: LifeBus
  input: InputState
  dialogue: DialogueRunner
  /** the chapter's canonical anchor, resolved server-side from the archive */
  /** the 1986 anchor — the one the game shipped with; every scene reads `anchors` by era first */
  anchor: HistoricalAnchor
  prologueAnchor: HistoricalAnchor
  /** every chapter's anchor, keyed by `Era.anchorKey`, resolved server-side */
  anchors: AnchorSet
  /** the headless probes: canvas renderer, and a directed match at a quarter of its length */
  probing: boolean
}

export const CONTEXT_KEY = 'life'
