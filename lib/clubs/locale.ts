import type {Locale} from './contract'

export const UI_LOCALES = ['en','he'] as const
export type UiLocale = typeof UI_LOCALES[number]
/** Hebrew is switched off for now (owner, 2026-10-06): English only. Flip to true to bring the switch back. */
export const HEBREW_ENABLED = false
export const ENABLED_LOCALES: readonly UiLocale[] = HEBREW_ENABLED ? UI_LOCALES : ['en']
export const localeDirection = (locale:Locale):'ltr'|'rtl' => locale==='he'?'rtl':'ltr'
export function uiLocale(requested?:string):UiLocale {
 return ENABLED_LOCALES.includes(requested as UiLocale)?requested as UiLocale:'en'
}
/** English reads day-month-year with a short month name ("2 May 2024"): unambiguous for every reader, unlike 05/02. */
export function localizedDate(iso:string,locale:UiLocale):string {
 const date=new Date(`${iso}T00:00:00Z`)
 return Number.isFinite(date.getTime())?(locale==='en'?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'})).format(date):iso
}
