/**
 * LIFE · the hood — YOUR TURN, ages thirty-one to forty-eight: "who walks behind you now?"
 *
 * The love handed on (THE WORKER's family branch and finale, rewritten for every club): a shirt too big for somebody
 * small, the armchair years, their first match, the father's last away trip, their own Saturday, the empty seat, the
 * bucket, the night nobody went home, the friend with no reserved place, and the Box handed on. The arc ends where
 * childhood began: a radio at home, and somebody listening for you. Authored fiction only. Words in `arc-words.ts`.
 */
import type {Approach, Effect, Mission, StoryStep} from './types'

const talk = (who: Extract<StoryStep, {do: 'talk'}>['who'], say: string): StoryStep => ({do: 'talk', who, say})
const get = (at: Extract<StoryStep, {do: 'collect'}>['at'], item: Extract<StoryStep, {do: 'collect'}>['item'], n = 1): StoryStep => ({do: 'collect', at, item, n})
const go = (at: Extract<StoryStep, {do: 'reach'}>['at']): StoryStep => ({do: 'reach', at})
const a = (id: string, steps: StoryStep[], effects: Effect[], needs?: Approach['needs']): Approach => ({id, steps, effects, ...(needs ? {needs} : {})})
const adult = {stage: 'adult', kind: 'main', template: null, episode: null} as const

export const ADULT: Mission[] = [
  /* 1 — arms up: a first shirt, the other way round */
  {
    ...adult, id: 'arms-up', age: 31, giver: 'kiosk', place: 'kiosk', day: 'any',
    approaches: [
      a('your-old-one', [get('home', 'bag')], [{bond: 'dad', n: 1}, {flag: 'story:small-shirt', v: 'old'}]),
      a('dad-has-one', [talk('dad', 'story.s.arms-up.dad')], [{bond: 'dad', n: 2}, {flag: 'story:small-shirt', v: 'dads'}]),
      a('buy-new', [talk('kiosk', 'story.s.arms-up.kiosk')], [{money: -6}, {flag: 'story:small-shirt', v: 'new'}], {money: 6}),
    ],
    complication: {choices: [{id: 'grow-into-it', effects: [{bond: 'child', n: 1}]}, {id: 'roll-the-sleeves', effects: [{bond: 'child', n: 1}, {rep: 1}]}]},
    converge: talk('kiosk', 'story.s.arms-up.after'),
    aftermath: [{keep: 'small-shirt'}, {flag: 'story:parent'}],
  },
  /* 2 — the armchair years: football at the edge of a busy life */
  {
    ...adult, id: 'the-armchair', age: 33, giver: 'dad', place: 'home', day: 'any',
    approaches: [
      a('sit-with-dad', [go('home')], [{bond: 'dad', n: 2}]),
      a('read-it-later', [get('kiosk', 'paper')], [{bond: 'kiosk', n: 1}]),
      a('bring-the-little-one', [talk('neighbour', 'story.s.the-armchair.neighbour')], [{bond: 'child', n: 1}]),
    ],
    complication: {choices: [{id: 'correct-him', effects: [{rep: 1}]}, {id: 'let-him', effects: [{bond: 'dad', n: 1}]}]},
    converge: talk('dad', 'story.s.the-armchair.dad'),
    aftermath: [{flag: 'story:armchair'}],
  },
  /* 3 — their first match, and the promise that you can leave */
  {
    ...adult, id: 'their-first', age: 34, giver: 'dad', place: 'ground', day: 'matchday', template: 'lead-the-way',
    approaches: [
      a('shoulders', [talk('dad', 'story.s.their-first.dad')], [{bond: 'dad', n: 2}]),
      a('early-for-the-song', [talk('neighbour', 'story.s.their-first.neighbour')], [{flag: 'story:kid-knows-the-song'}]),
      a('the-short-cut', [go('pitch')], [{rep: 1}]),
    ],
    complication: {choices: [{id: 'home-at-half-time', effects: [{bond: 'child', n: 2}, {flag: 'story:their-first', v: 'half-time'}]}, {id: 'one-more-minute', effects: [{bond: 'child', n: 1}, {flag: 'story:their-first', v: 'stayed'}]}]},
    converge: go('ground'),
    aftermath: [{keep: 'their-half-ticket'}, {flag: 'story:passed-it-on-again'}],
  },
  /* 4 — the father's last away trip: today he follows you */
  {
    ...adult, id: 'dads-last-away', age: 36, giver: 'dad', place: 'corner', day: 'matchday', template: 'away-day',
    approaches: [
      a('drive-him', [get('home', 'sandwich', 2), go('corner')], [{bond: 'dad', n: 2}]),
      a('the-coach-like-before', [talk('kiosk', 'story.s.dads-last-away.kiosk')], [{bond: 'kiosk', n: 1}]),
      a('call-the-old-crew', [talk('mate', 'story.s.dads-last-away.mate')], [{bond: 'mate', n: 2}, {flag: 'story:mate', v: 'back'}]),
    ],
    complication: {choices: [{id: 'turn-back', effects: [{bond: 'dad', n: 2}, {flag: 'story:last-away', v: 'turned-back'}]}, {id: 'slowly-on', effects: [{rep: 1}, {flag: 'story:last-away', v: 'made-it'}]}]},
    converge: talk('dad', 'story.s.dads-last-away.after'),
    aftermath: [{flag: 'story:took-dad'}, {keep: 'service-receipt'}],
  },
  /* 5 — their own Saturday: the scarf does not choose for them */
  {
    ...adult, id: 'their-saturday', age: 38, giver: 'neighbour', place: 'school', day: 'any',
    approaches: [
      a('go-to-theirs', [go('pitch')], [{bond: 'child', n: 2}]),
      a('radio-in-one-ear', [get('kiosk', 'battery'), go('pitch')], [{bond: 'child', n: 1}, {rep: 1}]),
      a('swap-with-dad', [talk('dad', 'story.s.their-saturday.dad')], [{bond: 'dad', n: 1}]),
    ],
    complication: {choices: [{id: 'wave', effects: [{bond: 'child', n: 1}]}, {id: 'their-name', effects: [{bond: 'child', n: 2}, {rep: -1}]}]},
    converge: talk('neighbour', 'story.s.their-saturday.after'),
    aftermath: [{flag: 'story:watched-theirs'}, {keep: 'touchline-photo'}],
  },
  /* 6 — the empty seat: he cannot climb the steps any more */
  {
    ...adult, id: 'the-empty-seat', age: 40, giver: 'neighbour', place: 'ground', day: 'matchday', template: 'kickoff-run',
    approaches: [
      a('leave-it-empty', [go('ground')], [{flag: 'story:seat-beside', v: 'empty'}]),
      a('the-little-one', [talk('neighbour', 'story.s.the-empty-seat.neighbour'), go('ground')], [{flag: 'story:seat-beside', v: 'child'}, {bond: 'child', n: 2}]),
      a('his-scarf', [get('home', 'scarf'), go('ground')], [{flag: 'story:seat-beside', v: 'scarf'}, {bond: 'dad', n: 1}]),
    ],
    complication: {choices: [{id: 'taken', effects: [{bond: 'dad', n: 1}]}, {id: 'sit-down', effects: [{rep: 1}]}]},
    converge: talk('dad', 'story.s.the-empty-seat.dad'),
    aftermath: [{flag: 'story:empty-seat'}, {keep: 'seat-number'}],
  },
  /* 7 — the bucket: the club in trouble, and what you give back */
  {
    ...adult, id: 'the-bucket', age: 42, giver: 'mate', place: 'kiosk', day: 'any',
    approaches: [
      a('the-bucket', [get('kiosk', 'tin', 2), go('ground')], [{rep: 2}]),
      a('the-meeting', [go('school'), talk('neighbour', 'story.s.the-bucket.neighbour')], [{bond: 'neighbour', n: 1}]),
      a('the-banner', [get('home', 'paint'), get('home', 'cloth'), go('pitch')], [{bond: 'mate', n: 1}]),
      a('the-books', [talk('kiosk', 'story.s.the-bucket.books')], [{rep: 2}, {flag: 'story:kept-the-books'}], {has: ['story:route:member']}),
    ],
    complication: {choices: [{id: 'count-it-in-public', effects: [{rep: 2}]}, {id: 'trust-them', effects: [{bond: 'mate', n: 1}]}]},
    converge: talk('mate', 'story.s.the-bucket.after'),
    aftermath: [{flag: 'story:held-the-bucket'}, {keep: 'bucket-sticker'}],
  },
  /* 8 — the night nobody went home: find them in the crowd, then ring him */
  {
    ...adult, id: 'nobody-went-home', age: 44, giver: 'neighbour', place: 'ground', day: 'matchday', template: 'title-night',
    approaches: [
      a('the-old-step', [go('ground')], [{rep: 1}]),
      a('the-fence', [go('pitch'), go('ground')], [{bond: 'child', n: 1}]),
      a('ring-them', [get('kiosk', 'phonecard'), go('ground')], [{bond: 'child', n: 1}]),
    ],
    complication: {choices: [{id: 'lift-them', effects: [{bond: 'child', n: 2}]}, {id: 'ring-dad', effects: [{bond: 'dad', n: 2}]}]},
    converge: talk('dad', 'story.s.nobody-went-home.dad'),
    aftermath: [{flag: 'story:big-night'}, {keep: 'blade-of-grass'}],
  },
  /* 9 — no reserved place, but friends */
  {
    ...adult, id: 'no-reserved-place', age: 46, giver: 'mate', place: 'corner', day: 'any',
    approaches: [
      a('show-him', [go('ground')], [{bond: 'mate', n: 1}]),
      a('the-old-wall', [go('corner'), talk('kiosk', 'story.s.no-reserved-place.kiosk')], [{bond: 'kiosk', n: 1}]),
      a('coming-home', [talk('dad', 'story.s.no-reserved-place.dad')], [{bond: 'dad', n: 2}, {flag: 'story:came-home'}], {has: ['story:route:far']}),
    ],
    complication: {choices: [{id: 'the-old-step', effects: [{bond: 'mate', n: 2}]}, {id: 'a-new-one', effects: [{rep: 1}]}]},
    converge: talk('mate', 'story.s.no-reserved-place.after'),
    aftermath: [{flag: 'story:back-together'}, {bond: 'mate', n: 2}],
  },
  /* 10 — the Box handed on */
  {
    ...adult, id: 'handed-on', age: 48, giver: 'dad', place: 'home', day: 'any',
    approaches: [
      a('the-scarf', [get('home', 'scarf')], [{bond: 'child', n: 2}]),
      a('walk-it-with-them', [go('pitch'), go('school'), go('ground')], [{bond: 'child', n: 1}, {rep: 1}]),
      a('let-them-choose', [talk('dad', 'story.s.handed-on.choose')], [{bond: 'dad', n: 2}, {flag: 'story:they-chose'}]),
    ],
    complication: {choices: [{id: 'give-it', effects: [{flag: 'story:handed', v: 'given'}]}, {id: 'keep-it-for-later', effects: [{flag: 'story:handed', v: 'later'}]}]},
    converge: talk('dad', 'story.s.handed-on.dad'),
    aftermath: [{flag: 'story:handed-on'}, {flag: 'story:life-written'}, {keep: 'empty-shelf'}],
  },
]

export const ADULT_SPINE: readonly (readonly string[])[] = ADULT.map(m => [m.id])

const side = {stage: 'adult', kind: 'side', template: null, episode: null, complication: null, day: 'any'} as const
export const ADULT_SIDES: Mission[] = [
  {...side, id: 'dads-stories', age: 37, giver: 'dad', place: 'home', approaches: [a('write-them', [get('kiosk', 'paper'), go('home')], [{bond: 'dad', n: 2}]), a('tape-them', [get('kiosk', 'battery'), go('home')], [{bond: 'dad', n: 2}])], converge: talk('dad', 'story.s.dads-stories.dad'), aftermath: [{keep: 'dads-stories'}]},
  {...side, id: 'the-shutters', age: 45, giver: 'kiosk', place: 'kiosk', approaches: [a('help-clear', [get('kiosk', 'bag', 2)], [{bond: 'kiosk', n: 2}]), a('the-last-paper', [get('kiosk', 'paper')], [{bond: 'kiosk', n: 1}])], converge: talk('kiosk', 'story.s.the-shutters.kiosk'), aftermath: [{keep: 'kiosk-sign'}]},
]

const standing = {stage: 'adult', kind: 'standing', template: null, episode: null, complication: null, day: 'any', age: 31} as const
export const ADULT_STANDING: Mission[] = [
  {...standing, id: 'school-run', giver: 'neighbour', place: 'school', approaches: [a('walk', [go('school')], [{bond: 'child', n: 1}]), a('the-long-way', [go('pitch'), go('school')], [{bond: 'child', n: 1}, {rep: 1}])], converge: talk('neighbour', 'story.s.school-run.neighbour'), aftermath: []},
  {...standing, id: 'pitch-with-them', giver: 'dad', place: 'pitch', approaches: [a('in-goal', [go('pitch')], [{bond: 'child', n: 1}]), a('with-grandad', [talk('dad', 'story.s.pitch-with-them.dad'), go('pitch')], [{bond: 'dad', n: 1}])], converge: talk('dad', 'story.s.pitch-with-them.after'), aftermath: []},
  {...standing, id: 'the-shop', giver: 'kiosk', place: 'kiosk', approaches: [a('the-list', [get('kiosk', 'bag', 2)], [{money: 3}]), a('for-next-door', [get('kiosk', 'bag'), talk('neighbour', 'story.s.the-shop.neighbour')], [{money: 2}, {bond: 'neighbour', n: 1}])], converge: talk('kiosk', 'story.s.the-shop.kiosk'), aftermath: []},
]
