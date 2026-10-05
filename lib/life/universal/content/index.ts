/**
 * The universal chapters, in the order of a life. Each is one human beat every supporter knows,
 * told with an age and never a year. A chapter with the id `finale` is always played last.
 */
import type {Chapter} from '../types'
import {C1_COLOURS} from './c1-colours'
import {C2_SHIRT} from './c2-shirt'
import {C3_SATURDAY} from './c3-saturday'
import {C4_YARD} from './c4-yard'
import {C5_AWAY} from './c5-away'
import {C6_WORK} from './c6-work'
import {C7_FAR} from './c7-far'
import {C8_SEAT} from './c8-seat'
import {FINALE} from './finale'

export const UNIVERSAL_CHAPTERS: readonly Chapter[] = [
  C1_COLOURS, C2_SHIRT, C3_SATURDAY, C4_YARD, C5_AWAY, C6_WORK, C7_FAR, C8_SEAT, FINALE,
]
