import {CHILDHOOD} from './childhood'
import {ADULTHOOD} from './adulthood'
import {LATER} from './later'
import {compileScript} from './compile'
import type {ChapterScript} from './types'
export const SCREENPLAY: ChapterScript[] = [...CHILDHOOD,...ADULTHOOD,...LATER]
export const screenplayChapters=(locale:'en'|'he')=>SCREENPLAY.map(c=>compileScript(c,locale))
