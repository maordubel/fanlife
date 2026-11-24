/**
 * LIFE · the hood — THE TEENS, ages thirteen to eighteen: "what kind of supporter am I?"
 *
 * Inherited love becomes chosen identity (THE WORKER, Stage B's thesis, rewritten for every club): the older lot at
 * the wall, knowing in time, the first away trip, the father's hero in doubt, the ticket you cannot afford, the route
 * you lean into (a fork of four that converges), the loss you stand through, the only bus, and the friend on the steps.
 * Authored fiction only: the four people of the hood, its six places, no club, no date, no score. Words in
 * `arc-words.ts`. Sources per mission: `docs/life/LIFE-FULL-ARC-2026-11-24.md`.
 */
import type {Approach, Effect, Mission, StoryStep} from './types'

const talk = (who: Extract<StoryStep, {do: 'talk'}>['who'], say: string): StoryStep => ({do: 'talk', who, say})
const get = (at: Extract<StoryStep, {do: 'collect'}>['at'], item: Extract<StoryStep, {do: 'collect'}>['item'], n = 1): StoryStep => ({do: 'collect', at, item, n})
const go = (at: Extract<StoryStep, {do: 'reach'}>['at']): StoryStep => ({do: 'reach', at})
const a = (id: string, steps: StoryStep[], effects: Effect[], needs?: Approach['needs']): Approach => ({id, steps, effects, ...(needs ? {needs} : {})})
const teen = {stage: 'teen', kind: 'main', template: null, episode: null} as const

export const TEEN: Mission[] = [
  /* 1 — the older lot at the wall */
  {
    ...teen, id: 'the-wall', age: 13, giver: 'mate', place: 'corner', day: 'any',
    approaches: [
      a('listen', [talk('mate', 'story.s.the-wall.mate'), go('corner')], [{bond: 'mate', n: 1}]),
      a('kick-first', [go('pitch'), talk('mate', 'story.s.the-wall.mate')], [{rep: 1}]),
      a('sandwiches', [get('kiosk', 'sandwich', 2), go('corner')], [{money: -2}, {bond: 'kiosk', n: 1}, {rep: 1}], {money: 2}),
      a('the-song', [talk('neighbour', 'story.s.the-wall.neighbour'), go('corner')], [{rep: 2}], {has: ['story:knows-the-song']}),
    ],
    complication: {choices: [{id: 'run-it', effects: [{rep: 1}, {flag: 'story:ran-a-message'}]}, {id: 'say-no', effects: [{bond: 'dad', n: 1}]}]},
    converge: talk('mate', 'story.s.the-wall.after'),
    aftermath: [{flag: 'story:crew'}, {bond: 'mate', n: 1}],
  },
  /* 2 — the information game: the news from elsewhere, before anyone else */
  {
    ...teen, id: 'know-in-time', age: 13, giver: 'kiosk', place: 'kiosk', day: 'matchday', template: 'clipping-hunt',
    approaches: [
      a('kiosk-radio', [talk('kiosk', 'story.s.know-in-time.kiosk')], [{bond: 'kiosk', n: 1}]),
      a('phone-box', [get('kiosk', 'phonecard'), go('corner')], [{rep: 1}]),
      a('next-door', [talk('neighbour', 'story.s.know-in-time.neighbour')], [{bond: 'neighbour', n: 1}]),
    ],
    complication: {choices: [{id: 'check', effects: [{flag: 'story:checks-twice'}, {rep: 1}]}, {id: 'shout', effects: [{bond: 'mate', n: 1}, {flag: 'story:shouted-early'}]}]},
    converge: talk('dad', 'story.s.know-in-time.dad'),
    aftermath: [{keep: 'clipping'}, {flag: 'story:knew-in-time'}, {bond: 'dad', n: 1}],
  },
  /* 3 · S1E6 — the first away trip, and the coach that does not wait */
  {
    ...teen, id: 'first-away', age: 14, giver: 'mate', place: 'corner', day: 'matchday', template: 'away-pen', episode: 'S1E6',
    approaches: [
      a('pack-the-bag', [get('home', 'sandwich'), get('kiosk', 'phonecard')], [{bond: 'dad', n: 1}]),
      a('the-crew', [talk('mate', 'story.s.first-away.mate')], [{bond: 'mate', n: 1}]),
      a('dads-blessing', [talk('dad', 'story.s.first-away.dad')], [{bond: 'dad', n: 2}, {flag: 'story:away-with-blessing'}]),
    ],
    complication: {choices: [
      {id: 'wait', effects: [{bond: 'mate', n: 2}, {flag: 'story:first-away', v: 'late'}]},
      {id: 'go', effects: [{rep: 1}, {flag: 'story:first-away', v: 'on-time'}]},
      {id: 'next-coach', effects: [{bond: 'kiosk', n: 1}, {flag: 'story:first-away', v: 'later-coach'}]},
    ]},
    converge: go('ground'),
    aftermath: [{keep: 'away-ticket'}, {flag: 'story:been-away'}],
  },
  /* 4 — the father's hero, defended, doubted */
  {
    ...teen, id: 'dads-hero', age: 14, giver: 'dad', place: 'home', day: 'any',
    approaches: [
      a('defend', [talk('mate', 'story.s.dads-hero.mate')], [{bond: 'dad', n: 1}, {bond: 'mate', n: -1}]),
      a('read-both', [get('kiosk', 'paper'), talk('kiosk', 'story.s.dads-hero.kiosk')], [{flag: 'story:read-both-sides'}]),
      a('old-hand', [talk('neighbour', 'story.s.dads-hero.neighbour')], [{bond: 'neighbour', n: 1}]),
    ],
    complication: {choices: [
      {id: 'stand-by-him', effects: [{bond: 'dad', n: 2}]},
      {id: 'the-man-not-the-job', effects: [{flag: 'story:hero-both'}, {bond: 'dad', n: 1}, {rep: 1}]},
      {id: 'say-it', effects: [{rep: 1}, {flag: 'story:hero-doubt'}]},
    ]},
    converge: talk('dad', 'story.s.dads-hero.dad'),
    aftermath: [{keep: 'poster'}, {flag: 'story:hero-question'}],
  },
  /* 5 — the ticket you cannot afford, on the night that matters */
  {
    ...teen, id: 'too-dear', age: 15, giver: 'kiosk', place: 'kiosk', day: 'matchday', template: 'cup-final-trip',
    approaches: [
      a('work-it', [get('kiosk', 'bag', 3), get('corner', 'bottle', 2)], [{money: 4}, {bond: 'kiosk', n: 1}]),
      a('dads-overtime', [talk('dad', 'story.s.too-dear.dad')], [{money: 4}, {bond: 'dad', n: 1}, {flag: 'story:dad-paid'}]),
      a('the-pot', [talk('mate', 'story.s.too-dear.mate')], [{money: 4}, {flag: 'story:owe:crew'}]),
      a('sell-the-album', [talk('kiosk', 'story.s.too-dear.album')], [{money: 6}, {flag: 'story:sold-album'}], {has: ['story:done:missing-square']}),
    ],
    complication: {choices: [{id: 'take-it', effects: [{flag: 'story:owe:group'}, {bond: 'mate', n: 1}]}, {id: 'radio', effects: [{flag: 'story:final', v: 'radio'}, {rep: 1}]}]},
    converge: go('ground'),
    aftermath: [{keep: 'final-ticket'}, {money: -4}],
  },
  /* 6a–6d — the route you lean into: one of four, and all four lead to the same night */
  {
    ...teen, id: 'the-end', age: 16, giver: 'mate', place: 'pitch', day: 'matchday', template: 'tifo-carry', fork: 'teen-route',
    approaches: [
      a('carry', [get('kiosk', 'roll', 2), go('pitch')], [{rep: 2}]),
      a('paint-night', [get('home', 'paint'), get('school', 'cloth')], [{bond: 'mate', n: 1}]),
      a('lookout', [go('corner'), talk('mate', 'story.s.the-end.mate')], [{rep: 1}]),
    ],
    complication: {choices: [{id: 'shield', effects: [{rep: 1}, {flag: 'story:tifo-whole'}]}, {id: 'detour', effects: [{bond: 'mate', n: 1}]}]},
    converge: go('ground'),
    aftermath: [{flag: 'story:route:ultras'}, {flag: 'story:lean', v: 'ultras'}, {keep: 'tifo-sheet'}],
  },
  {
    ...teen, id: 'the-road', age: 16, giver: 'mate', place: 'corner', day: 'matchday', template: 'away-pen', fork: 'teen-route',
    approaches: [
      a('the-map', [get('kiosk', 'paper'), go('corner')], [{rep: 1}]),
      a('the-fare', [get('home', 'money'), talk('kiosk', 'story.s.the-road.kiosk')], [{bond: 'kiosk', n: 1}]),
      a('the-list', [talk('mate', 'story.s.the-road.mate')], [{bond: 'mate', n: 1}]),
    ],
    complication: {choices: [{id: 'the-aisle', effects: [{rep: 1}]}, {id: 'give-your-seat', effects: [{flag: 'story:gave-seat'}, {bond: 'neighbour', n: 1}]}]},
    converge: go('ground'),
    aftermath: [{flag: 'story:route:away'}, {flag: 'story:lean', v: 'away'}, {keep: 'coach-list'}],
  },
  {
    ...teen, id: 'the-room', age: 16, giver: 'neighbour', place: 'school', day: 'any', fork: 'teen-route',
    approaches: [
      a('the-meeting', [go('school'), talk('neighbour', 'story.s.the-room.neighbour')], [{bond: 'neighbour', n: 1}]),
      a('the-fanzine', [get('kiosk', 'paper'), get('home', 'scissors'), get('home', 'glue')], [{rep: 1}]),
      a('the-letter', [get('home', 'paper'), go('kiosk')], [{flag: 'story:wrote-letter'}]),
    ],
    complication: {choices: [{id: 'speak', effects: [{rep: 2}]}, {id: 'listen', effects: [{bond: 'neighbour', n: 1}]}]},
    converge: talk('neighbour', 'story.s.the-room.after'),
    aftermath: [{flag: 'story:route:member'}, {flag: 'story:lean', v: 'member'}, {keep: 'member-card'}],
  },
  {
    ...teen, id: 'the-same-step', age: 16, giver: 'dad', place: 'ground', day: 'matchday', template: 'kickoff-run', fork: 'teen-route',
    approaches: [
      a('early', [talk('dad', 'story.s.the-same-step.dad')], [{bond: 'dad', n: 2}]),
      a('the-flask', [get('home', 'bag'), talk('dad', 'story.s.the-same-step.dad')], [{bond: 'dad', n: 1}, {bond: 'kiosk', n: 1}]),
      a('bring-her', [talk('neighbour', 'story.s.the-same-step.neighbour')], [{bond: 'neighbour', n: 2}]),
    ],
    complication: {choices: [{id: 'stay', effects: [{bond: 'dad', n: 2}]}, {id: 'wave', effects: [{bond: 'mate', n: 1}]}]},
    converge: go('ground'),
    aftermath: [{flag: 'story:route:family'}, {flag: 'story:lean', v: 'family'}, {keep: 'flask-cup'}],
  },
  /* 7 — the loss you have to stand through */
  {
    ...teen, id: 'stand-through-it', age: 17, giver: 'dad', place: 'ground', day: 'matchday', template: 'where-you-stood',
    approaches: [
      a('to-the-end', [go('ground'), talk('mate', 'story.s.stand-through-it.mate')], [{rep: 1}]),
      a('with-dad', [talk('dad', 'story.s.stand-through-it.dad')], [{bond: 'dad', n: 2}]),
      a('sing-through', [go('ground'), talk('mate', 'story.s.stand-through-it.sing')], [{rep: 2}], {has: ['story:route:ultras']}),
    ],
    complication: {choices: [{id: 'stay', effects: [{rep: 2}, {flag: 'story:stayed'}]}, {id: 'walk-him-out', effects: [{bond: 'dad', n: 1}]}]},
    converge: talk('dad', 'story.s.stand-through-it.after'),
    aftermath: [{flag: 'story:stood-through-it'}, {keep: 'cold-programme'}],
  },
  /* 8 — the obligation, and the only bus that gets you there on time */
  {
    ...teen, id: 'the-only-bus', age: 18, giver: 'dad', place: 'corner', day: 'any',
    approaches: [
      a('refuse', [go('corner'), talk('kiosk', 'story.s.the-only-bus.kiosk')], [{rep: 2}, {flag: 'story:bus', v: 'refused'}]),
      a('board', [go('corner')], [{flag: 'story:bus', v: 'boarded'}, {flag: 'story:regret-bus'}]),
      a('another-way', [get('kiosk', 'coin'), go('pitch')], [{flag: 'story:bus', v: 'searched'}]),
    ],
    complication: {choices: [
      {id: 'truth', effects: [{rep: 1}, {flag: 'story:told-truth'}]},
      {id: 'excuse', effects: [{flag: 'story:lied-once'}]},
      {id: 'silence', effects: [{bond: 'dad', n: 1}]},
    ]},
    converge: talk('dad', 'story.s.the-only-bus.dad'),
    aftermath: [{flag: 'story:first-duty'}, {keep: 'late-slip'}],
  },
  /* 9 — the friend on the steps with nothing in his hands */
  {
    ...teen, id: 'the-steps', age: 18, giver: 'mate', place: 'ground', day: 'any',
    approaches: [
      a('sit-with-him', [go('ground'), talk('mate', 'story.s.the-steps.mate')], [{bond: 'mate', n: 2}]),
      a('fetch-the-scarf', [get('home', 'scarf'), go('ground')], [{bond: 'dad', n: 1}]),
      a('ask-her', [talk('neighbour', 'story.s.the-steps.neighbour'), go('ground')], [{bond: 'neighbour', n: 1}]),
    ],
    complication: {choices: [{id: 'give', effects: [{flag: 'story:scarf', v: 'given'}, {bond: 'mate', n: 3}]}, {id: 'keep', effects: [{flag: 'story:scarf', v: 'kept'}]}]},
    converge: talk('mate', 'story.s.the-steps.after'),
    aftermath: [{flag: 'story:teen-done'}, {rep: 1}],
  },
]

/** the spine of the teens; the slot of four is the route fork */
export const TEEN_SPINE: readonly (readonly string[])[] = [
  ['the-wall'], ['know-in-time'], ['first-away'], ['dads-hero'], ['too-dear'], ['the-end', 'the-road', 'the-room', 'the-same-step'], ['stand-through-it'], ['the-only-bus'], ['the-steps'],
]

const side = {stage: 'teen', kind: 'side', template: null, episode: null, complication: null, day: 'any'} as const
export const TEEN_SIDES: Mission[] = [
  {...side, id: 'grounded', age: 15, giver: 'dad', place: 'home', needs: {has: ['story:done:first-away']}, approaches: [a('the-window', [get('home', 'shoes'), go('corner')], [{rep: 1}, {flag: 'story:out-the-window'}]), a('under-the-pillow', [get('kiosk', 'battery'), go('home')], [{bond: 'dad', n: 1}])], converge: talk('dad', 'story.s.grounded.dad'), aftermath: [{flag: 'story:was-grounded'}]},
  {...side, id: 'shirt-swap', age: 16, giver: 'kiosk', place: 'kiosk', approaches: [a('swap', [get('home', 'bag'), talk('kiosk', 'story.s.shirt-swap.kiosk')], [{bond: 'kiosk', n: 1}]), a('buy', [talk('kiosk', 'story.s.shirt-swap.kiosk')], [{money: -3}], {money: 3})], converge: talk('kiosk', 'story.s.shirt-swap.after'), aftermath: [{keep: 'second-shirt'}]},
]

const standing = {stage: 'teen', kind: 'standing', template: null, episode: null, complication: null, day: 'any', age: 13} as const
/** the week's own work in the teens: there whenever the next chapter waits */
export const TEEN_STANDING: Mission[] = [
  {...standing, id: 'kiosk-shift', giver: 'kiosk', place: 'kiosk', approaches: [a('stock', [get('kiosk', 'bag', 2)], [{money: 3}]), a('the-round', [get('kiosk', 'paper', 2), go('corner')], [{money: 2}, {bond: 'kiosk', n: 1}])], converge: talk('kiosk', 'story.s.kiosk-shift.kiosk'), aftermath: []},
  {...standing, id: 'five-a-side', giver: 'mate', place: 'pitch', approaches: [a('play', [go('pitch')], [{bond: 'mate', n: 1}]), a('bring-the-yard', [go('school'), go('pitch')], [{rep: 1}])], converge: talk('mate', 'story.s.five-a-side.mate'), aftermath: []},
  {...standing, id: 'the-coupon', giver: 'kiosk', place: 'kiosk', approaches: [a('guess', [get('kiosk', 'paper')], [{flag: 'story:coupon'}]), a('ask-dad', [talk('dad', 'story.s.the-coupon.dad')], [{bond: 'dad', n: 1}])], converge: talk('kiosk', 'story.s.the-coupon.kiosk'), aftermath: []},
]
