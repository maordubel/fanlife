/** LIFE · the WATCH LAYER — every word the watch card prints (English; the interface default). No fact lives here. */
const EN = {
  'watch.kicker': 'From the archive',
  'watch.kicker.personal': 'After the match',
  'watch.highlights': 'Match highlights',
  'watch.play': 'Play the highlights',
  'watch.play.film': 'Play our film',
  'watch.poster.hint': 'Tap to play. The film loads from YouTube only when you ask for it.',
  'watch.youtube': 'Watch on YouTube',
  'watch.film.night': 'Our film about this night',
  'watch.film.season': 'Our film about this season',
  'watch.film.club': 'Our film about this club',
  'watch.film.by': 'FanLife: Football Stories',
  'watch.more': 'More from this night',
  'watch.source': 'Archive: {publisher}',
  'watch.footage': 'Footage: YouTube. It belongs to whoever uploaded it.',
  'watch.continue': 'Continue',
  'watch.back': 'Back to the slate',
  'watch.none': 'No film of this night is on record yet.',
  'watch.frame': 'Video player: {title}',
  'watch.title.local': 'As published, in {language}',
  'watch.lang.he': 'Hebrew', 'watch.lang.el': 'Greek', 'watch.lang.de': 'German', 'watch.lang.it': 'Italian', 'watch.lang.es': 'Spanish', 'watch.lang.hr': 'Croatian', 'watch.lang.bs': 'Bosnian', 'watch.lang.other': 'its own language',
} as const

export type WatchKey = keyof typeof EN
export const WATCH_WORDS: Record<string, string> = EN
/** a film's recorded title on the card: as recorded when it is English, otherwise an English line naming its language (the
 *  interface is English; the recorded title stays on YouTube, one tap away) */
export function watchTitle(title: string, locale?: string | null): string {
  if (!locale || locale === 'en') return title
  const k = `watch.lang.${locale}` as WatchKey
  return watchWord('watch.title.local', {language: k in EN ? watchWord(k) : watchWord('watch.lang.other')})
}
export function watchWord(key: WatchKey, vars: Record<string, string> = {}): string {
  return (EN[key] as string).replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`)
}
