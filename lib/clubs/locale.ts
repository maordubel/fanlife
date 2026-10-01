import type {Locale} from './contract'

export const UI_LOCALES = ['en','he'] as const
export type UiLocale = typeof UI_LOCALES[number]
export const localeDirection = (locale:Locale):'ltr'|'rtl' => locale==='he'?'rtl':'ltr'
export function uiLocale(requested?:string):UiLocale {
 return UI_LOCALES.includes(requested as UiLocale)?requested as UiLocale:'en'
}
export function localizedDate(iso:string,locale:UiLocale):string {
 const date=new Date(`${iso}T00:00:00Z`)
 return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(date):iso
}
