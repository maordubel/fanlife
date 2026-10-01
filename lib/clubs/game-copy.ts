import en from '@/messages/games/en.json'
import he from '@/messages/games/he.json'
import type {UiLocale} from './locale'
export type GameCopy=typeof en
export function gameCopy(locale:UiLocale):GameCopy{return locale==='he'?he:en}
