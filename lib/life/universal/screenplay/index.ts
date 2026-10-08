import {ADULTHOOD} from './adulthood'
import {CHILDHOOD} from './childhood'
import {LATER} from './later'
import {compileScript} from './compile'
import type {ChapterScript} from './types'

/** The story: every chapter of the one life, in the order it is lived (the finale is always last). */
export const SCREENPLAY: ChapterScript[] = [...CHILDHOOD, ...ADULTHOOD, ...LATER]
export const screenplayChapters = (locale: 'en' | 'he') => SCREENPLAY.map(c => compileScript(c, locale))
