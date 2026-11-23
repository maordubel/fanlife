/**
 * LIFE · the hood — every word the neighbourhood prints (English; the interface default).
 *
 * Authored fiction and interface only: no date, no score, no real person, no club name. `{name}` is the
 * person's first name from the club's cast, or the role's own word when the pack has no name. Same shape as
 * `lib/life/rush/words.ts`: a key table and one function, so a second language is a second table.
 */
const EN = {
  'hood.kicker': 'The hood',
  'hood.free': 'Free roam — walk up to somebody and press Talk',
  'hood.free.keys': 'WASD or arrows move · Shift sprints · E talks and uses · V switches the camera · Esc pauses',
  'hood.touch': 'Left thumb moves. Talk is the button by your thumb.',
  'hood.hud.job': 'Job', 'hood.hud.carrying': 'Carrying', 'hood.hud.none': 'nothing',
  'hood.hud.talk': 'Talk', 'hood.hud.use': 'Use', 'hood.hud.sprint': 'Sprint', 'hood.hud.camera': 'Camera', 'hood.hud.pause': 'Pause', 'hood.hud.map': 'Map',
  'hood.hud.near': 'Talk to {name}', 'hood.hud.done': 'Done', 'hood.hud.go': 'Walk on',
  'hood.pause.title': 'Paused', 'hood.pause.resume': 'Carry on', 'hood.pause.restart': 'Back to the front door',
  'hood.err': 'This device cannot draw the street.',
  'hood.who.dad': 'Dad', 'hood.who.mate': 'Your mate', 'hood.who.kiosk': 'The kiosk', 'hood.who.neighbour': 'The neighbour',
  'hood.place.home': 'Home', 'hood.place.kiosk': 'Kiosk corner', 'hood.place.corner': 'The corner', 'hood.place.school': 'School gate', 'hood.place.pitch': 'The pitch', 'hood.place.ground': 'The ground', 'hood.place.street': 'Main street',
  'hood.job.before-kickoff': 'Before kick-off',
  'hood.obj.batteries': 'Two batteries from {kiosk}', 'hood.obj.scarf': 'Dad’s scarf from {mate}', 'hood.obj.dad': 'Back to Dad',
  'hood.item.battery': 'battery', 'hood.item.batteries': 'batteries', 'hood.item.scarf': 'scarf',
  'hood.ev.job': 'Job: Before kick-off', 'hood.ev.done': 'Job done: Before kick-off', 'hood.ev.battery': 'Battery', 'hood.ev.hit': 'Sorry — sorry!',
  // what people say
  'hood.say.dad.offer': '“Before kick-off: the radio wants two batteries, and {mate} still has my scarf. No hurry. Mind the corners.”',
  'hood.say.dad.again': '“Batteries, then my scarf. You know the way.”',
  'hood.say.dad.thanks': '“There. Radio on, scarf on. Now it feels like a matchday.”',
  'hood.say.dad.done': '“Go on, have a wander. The street is yours until it’s time.”',
  'hood.say.dad.idle': '“Morning. Nothing for me yet.”',
  'hood.say.mate.scarf': '“Your dad’s scarf? Here. I kept it warm.”',
  'hood.say.mate.wait': '“Scarf? Sure — but you’re carrying no batteries. Kiosk first.”',
  'hood.say.mate.idle': '“Out and about? Same corner as always.”',
  'hood.say.mate.done': '“Told you I’d kept it safe.”',
  'hood.say.kiosk.idle': '“Batteries, papers, sweets. Take your time.”',
  'hood.say.kiosk.job': '“Batteries? On the counter — take two.”',
  'hood.say.kiosk.done': '“Radio working again? Good.”',
  'hood.say.neighbour.idle': '“I can hear your radio from here. Or I could, if it worked.”',
  'hood.say.neighbour.done': '“Now I can hear the pre-match show. Lovely.”',
} as const

export type HoodKey = keyof typeof EN
export const HOOD_WORDS: Record<string, string> = EN

export function hoodWord(key: HoodKey | string, vars: Record<string, string> = {}): string {
  const s = (EN as Record<string, string>)[key] ?? key
  return s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`)
}
