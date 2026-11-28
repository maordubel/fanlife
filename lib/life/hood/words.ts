/**
 * LIFE · the hood — every word the neighbourhood prints (English; the interface default).
 *
 * Authored fiction and interface only: no date, no score, no real person, no club name. `{name}` is the
 * person's first name from the club's cast, or the role's own word when the pack has no name. Same shape as
 * `lib/life/rush/words.ts`: a key table and one function, so a second language is a second table.
 */
const EN = {
  'hood.kicker': 'The hood',
  'hood.free': 'Free roam: walk up to someone and talk',
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
  // the game shell
  'hood.brand.game': 'A FAN LIFE game', 'hood.true': 'Based on a true story', 'hood.true.line': 'These things happened, to supporters we know. Retold as a game. The matches are as the archive records them.', 'hood.slate.day.night': 'Night', 'hood.slate.day.dawn': 'First light', 'hood.slate.day.morning': 'Morning', 'hood.slate.day.midday': 'Midday', 'hood.slate.day.afternoon': 'Afternoon', 'hood.slate.day.sunset': 'Sunset', 'hood.slate.day.dusk': 'Dusk', 'hood.slate.day.evening': 'Evening', 'hood.card.found': 'A sticker for the album', 'hood.card.years': '{from}–{to}', 'hood.bag.cards': 'Stickers found · {n} of {all}', 'hood.bag.cards.none': 'Stickers lie about the street. Each one is a man who wore the shirt in your years.', 'hood.bag.album': 'Open THE ALBUM', 'hood.bag.shirt': 'Home shirt · {season}',
  'hood.brand': 'LIFE by FANLIFE', 'hood.tagline': 'The city is your terrace.', 'hood.kicker.game': 'A football supporter game',
  'hood.boot': 'Opening the street', 'hood.boot.err': 'The street could not open on this device.',
  'hood.title.continue': 'Continue', 'hood.title.new': 'New life', 'hood.title.settings': 'Settings', 'hood.title.club': 'Back to the club', 'hood.title.saved': 'Saved life: {name}',
  'hood.name.kicker': 'New life', 'hood.name.title': 'What do they call you?', 'hood.name.label': 'Your name', 'hood.name.hint': 'Up to 14 letters. Dad will use it.', 'hood.name.go': 'Start', 'hood.name.back': 'Back', 'hood.name.default': 'Kid',
  'hood.intro.1': 'Matchday morning. The street is already in colours.', 'hood.intro.2': 'Every door on it was somebody’s first match once.', 'hood.intro.3': 'Your dad is on the step. He has a small job for you.', 'hood.intro.4': 'The city is your terrace.',
  'hood.skip': 'Skip', 'hood.next': 'Next', 'hood.close': 'Close', 'hood.back': 'Back',
  'hood.outro.1': 'Radio on, scarf on.', 'hood.outro.2': 'That is how a matchday starts.',
  'hood.pause.map': 'District map', 'hood.pause.bag': 'Kit bag', 'hood.pause.settings': 'Settings', 'hood.pause.help': 'Help', 'hood.pause.quit': 'Quit to title', 'hood.pause.saved': 'Progress saved on this device',
  'hood.set.title': 'Settings', 'hood.set.sound': 'Sound', 'hood.set.invert': 'Invert camera', 'hood.set.quality': 'Picture quality', 'hood.set.lite': 'Lite', 'hood.set.high': 'High', 'hood.set.reduced': 'Reduced motion', 'hood.set.on': 'On', 'hood.set.off': 'Off', 'hood.set.note': 'Reduced motion also follows your device setting.',
  'hood.help.title': 'Help', 'hood.help.touch': 'On a phone', 'hood.help.keys': 'On a keyboard',
  'hood.help.t1': 'Left thumb: walk', 'hood.help.t2': 'Talk button: speak to whoever is close', 'hood.help.t3': 'Sprint button: hold to run', 'hood.help.t4': 'Tap the little map: the district map',
  'hood.help.k1': 'WASD or arrows: walk', 'hood.help.k2': 'E or Space: talk', 'hood.help.k3': 'Shift: sprint', 'hood.help.k4': 'M map · B kit bag · V camera · Esc pause',
  'hood.map.kicker': 'Explore the city', 'hood.map.title': 'The District', 'hood.map.you': 'You are here', 'hood.map.set': 'Set waypoint', 'hood.map.clear': 'Clear waypoint', 'hood.map.set.done': 'Waypoint set for {place}.', 'hood.map.places': 'Places', 'hood.map.centre': 'Centre on me', 'hood.map.dist': '{m} m from you', 'hood.map.landmark': 'Landmark', 'hood.map.job': 'Someone here has a job', 'hood.map.aria': 'District map. Drag to move, tap a place to select it.', 'hood.map.pick': 'Tap a place on the map.',
  'hood.pin.home': 'H', 'hood.pin.kiosk': 'K', 'hood.pin.corner': 'C', 'hood.pin.school': 'S', 'hood.pin.pitch': 'P', 'hood.pin.ground': 'G',
  'hood.map.zoomin': 'Zoom in', 'hood.map.zoomout': 'Zoom out', 'hood.map.north': 'N', 'hood.map.scale': '{m} m', 'hood.coach': 'Left thumb walks. Tap Talk beside someone. Tap the map ring for the district.', 'hood.coach.ok': 'Got it',
  'hood.place.home.desc': 'The front door. Dad is on the step.', 'hood.place.kiosk.desc': 'Papers, sweets and batteries on the counter.', 'hood.place.corner.desc': 'The corner where your mate always stands.', 'hood.place.school.desc': 'The school gate, round the first side street.', 'hood.place.pitch.desc': 'A small pitch at the end of the second side street.', 'hood.place.ground.desc': 'The turnstiles at the end of the road. The whole street walks this way on matchday.',
  'hood.bag.kicker': 'Supporter gear', 'hood.bag.title': 'Kit Bag', 'hood.bag.wearing': 'Wearing', 'hood.bag.carrying': 'Carrying', 'hood.bag.locked': 'Locked', 'hood.bag.empty': 'Empty slot', 'hood.bag.wear': 'Wear', 'hood.bag.takeoff': 'Take off', 'hood.bag.worn': 'Worn', 'hood.bag.portrait': 'Your supporter', 'hood.bag.count': 'x{n}',
  'hood.bag.scarf': 'Terrace scarf', 'hood.bag.scarf.d': 'Woven in the colours you wear to the ground.',
  'hood.bag.ticket': 'Match ticket', 'hood.bag.ticket.d': 'Nothing in this slot yet. A ticket will live here.',
  'hood.bag.pass': 'Supporter pass', 'hood.bag.pass.d': 'Locked. It opens later in your life.',
  'hood.bag.bag': 'Canvas bag', 'hood.bag.bag.d': 'Holds what you pick up on the street.',
  'hood.bag.batteries': 'Batteries', 'hood.bag.batteries.d': 'For Dad’s radio. Take them back to him.',
  'hood.bag.dads': 'Dad’s scarf', 'hood.bag.dads.d': 'Kept warm by your mate. Take it back to Dad.',
  'hood.hud.objective': 'Step {n} of {m}', 'hood.hud.waypoint': 'Waypoint', 'hood.hud.cash': 'Cash', 'hood.hud.time': 'Time', 'hood.hud.you': 'You are at', 'hood.hud.bag': 'Kit bag', 'hood.hud.talk.to': 'Talk to {name}', 'hood.hud.arrived': 'Arrived: {place}', 'hood.hud.hold': 'Hold to sprint',
  'hood.banner.job': 'Job accepted', 'hood.banner.step': 'Step done', 'hood.banner.done': 'Job done', 'hood.banner.battery': 'Battery picked up',
  'hood.card.kicker': 'Job done', 'hood.card.line': 'Dad has his radio and his scarf. The street is yours until it is time.', 'hood.card.steps': 'Steps', 'hood.card.cash': 'Cash earned', 'hood.card.go': 'Back to the street', 'hood.card.map': 'District map',
  // talk
  'hood.talk.accept': 'I’ll get them.', 'hood.talk.later': 'Later.', 'hood.talk.leave': 'Leave', 'hood.talk.tap': 'Tap to go on', 'hood.talk.choose': 'Choose',
  'hood.say.dad.accepted': '“Good lad. Batteries from the kiosk, my scarf from {mate}. Then straight back.”',
  'hood.say.dad.later': '“No hurry. I’ll be here on the step.”',
  'hood.say.mate.q1': 'Seen anyone heading for the ground?', 'hood.say.mate.a1': '“Half the street already. Go on, you’ll hear them.”', 'hood.say.mate.q2': 'Nothing. See you.',
  'hood.say.kiosk.q1': 'What have you got today?', 'hood.say.kiosk.a1': '“Papers, sweets, batteries. Whatever a matchday needs.”', 'hood.say.kiosk.q2': 'Just looking.',
  // what people say
  'hood.say.dad.offer': '“There you are, {name}. Before kick-off: the radio wants two batteries, and {mate} still has my scarf. No hurry. Mind the corners.”',
  // the street notices you: short lines that float beside whoever said them
  'hood.amb.balcony.1': 'Evening, {name}! Off to the match?', 'hood.amb.balcony.2': 'Give them a shout from me, {name}!',
  'hood.amb.kiosk.1': 'Alright, {name}!', 'hood.amb.kiosk.2': 'Matchday, {name}. Best day there is.',
  'hood.amb.kids.play': 'Left foot only!', 'hood.amb.kids.pass': 'Here, {name} — on your foot!', 'hood.amb.kids.nice': 'Nice one, {name}!', 'hood.amb.kids.again': 'Next time, {name}!',
  'hood.amb.table.1': 'Double six. Again.', 'hood.amb.table.2': 'He has been lucky since lunch.', 'hood.amb.table.3': 'Mind the road, {name}.',
  'hood.amb.pair.1': 'I have a feeling about today.', 'hood.amb.pair.2': 'You say that every week.',
  'hood.amb.shoulders.1': 'Can you see the lights yet?', 'hood.amb.shoulders.2': 'Hold on tight up there.',
  'hood.amb.mother.1': 'Stay close. Hold my hand.', 'hood.amb.mother.2': 'Scarf on properly. Come here.',
  'hood.amb.hug.1': 'Look who it is!', 'hood.amb.hug.2': 'Same seats as always?',
  'hood.amb.trio.1': 'Sing it loud tonight.', 'hood.amb.trio.2': 'Wait for us at the gate!',
  'hood.hud.kick': 'Kick it back', 'hood.amb.label': 'Voices on the street',
  'hood.say.dad.again': '“Batteries, then my scarf. You know the way.”',
  'hood.say.dad.thanks': '“Hold still, {name}. Today you wear it. There: radio on, scarf on. Now it feels like a matchday.”',
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
