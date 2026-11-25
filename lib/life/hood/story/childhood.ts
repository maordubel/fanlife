/**
 * LIFE · the hood — CHILDHOOD, ages six to twelve: ten chapters and the small jobs between them.
 *
 * Season One's first five episodes carried into the open street (E1 The First Noise, E2 Six Short, E3 The Way In,
 * E4 The Missing Square, E5 No Ticket), with the chapters the street adds between them, ending on the Box.
 * Authored fiction only: the four people of the hood, six places, no club, no date, no score. Words in `words.ts`.
 */
import type {Approach, Effect, Mission, StoryStep} from './types'

const talk = (who: Extract<StoryStep, {do: 'talk'}>['who'], say: string): StoryStep => ({do: 'talk', who, say})
const get = (at: Extract<StoryStep, {do: 'collect'}>['at'], item: Extract<StoryStep, {do: 'collect'}>['item'], n = 1): StoryStep => ({do: 'collect', at, item, n})
const go = (at: Extract<StoryStep, {do: 'reach'}>['at']): StoryStep => ({do: 'reach', at})
const a = (id: string, steps: StoryStep[], effects: Effect[], needs?: Approach['needs']): Approach => ({id, steps, effects, ...(needs ? {needs} : {})})
const child = {stage: 'child', kind: 'main', template: null, episode: null} as const

export const CHILDHOOD: Mission[] = [
  /* 1 · S1E1 — the radio, the scarf, the first noise */
  {
    ...child, id: 'first-noise', age: 6, giver: 'dad', place: 'home', day: 'matchday', episode: 'S1E1', template: 'kickoff-run',
    approaches: [
      a('kiosk-first', [get('kiosk', 'battery', 2), talk('mate', 'story.s.first-noise.mate')], [{bond: 'kiosk', n: 1}]),
      a('scarf-first', [talk('mate', 'story.s.first-noise.mate'), get('kiosk', 'battery', 2)], [{bond: 'mate', n: 1}]),
      a('next-door', [talk('neighbour', 'story.s.first-noise.neighbour'), talk('mate', 'story.s.first-noise.mate')], [{bond: 'neighbour', n: 2}, {flag: 'story:radio', v: 'next-door'}]),
    ],
    complication: {choices: [{id: 'run', effects: [{rep: 1}]}, {id: 'ask', effects: [{bond: 'neighbour', n: 1}]}]},
    converge: talk('dad', 'story.s.first-noise.dad'),
    aftermath: [{keep: 'scarf'}, {bond: 'dad', n: 2}],
  },
  /* 2 · S1E2 — twenty coins for the shirt */
  {
    ...child, id: 'six-short', age: 7, giver: 'kiosk', place: 'kiosk', day: 'any', episode: 'S1E2', template: 'bottle-run',
    approaches: [
      a('crates', [get('kiosk', 'bag', 3), talk('kiosk', 'story.s.six-short.kiosk')], [{money: 6}, {bond: 'kiosk', n: 2}]),
      a('car', [talk('neighbour', 'story.s.six-short.neighbour'), get('home', 'cloth'), talk('neighbour', 'story.s.six-short.neighbour.paid')], [{money: 6}, {bond: 'neighbour', n: 2}]),
      a('bottles', [get('corner', 'bottle', 2), get('pitch', 'bottle', 2), get('school', 'bottle', 2)], [{money: 6}, {rep: 1}]),
    ],
    complication: {choices: [{id: 'dad', effects: [{bond: 'dad', n: 1}, {flag: 'story:shirt', v: 'with-dad'}]}, {id: 'owe', effects: [{flag: 'story:owes-kiosk'}, {bond: 'kiosk', n: 1}]}, {id: 'wardrobe', effects: [{flag: 'story:shirt', v: 'dads-old'}, {bond: 'dad', n: 2}]}]},
    converge: talk('kiosk', 'story.s.six-short.shirt'),
    aftermath: [{keep: 'shirt'}, {money: -6}, {rep: 1}],
  },
  /* 3 · S1E3 — the first time at the ground */
  {
    ...child, id: 'the-way-in', age: 8, giver: 'dad', place: 'ground', day: 'matchday', episode: 'S1E3', template: 'first-step',
    approaches: [
      a('with-dad', [get('home', 'ticket', 2), talk('dad', 'story.s.the-way-in.dad')], [{bond: 'dad', n: 2}]),
      a('short-cut', [get('home', 'ticket', 2), talk('mate', 'story.s.the-way-in.mate'), go('pitch')], [{bond: 'mate', n: 1}, {rep: 1}]),
      a('old-hand', [get('home', 'ticket', 2), talk('neighbour', 'story.s.the-way-in.neighbour')], [{bond: 'neighbour', n: 1}, {flag: 'story:knows-the-song'}]),
    ],
    complication: {choices: [{id: 'wait', effects: [{bond: 'dad', n: 1}]}, {id: 'squeeze', effects: [{rep: 1}, {flag: 'story:lost-half-ticket'}]}]},
    converge: go('ground'),
    aftermath: [{keep: 'ticket'}, {bond: 'dad', n: 1}, {flag: 'story:been-inside'}],
  },
  /* 4a / 4b — the street learns who he is: one of two */
  {
    ...child, id: 'monday-colours', age: 9, giver: 'mate', place: 'school', day: 'any', fork: 'age-9',
    approaches: [
      a('open', [get('home', 'scarf'), go('school')], [{rep: 2}]),
      a('under', [get('home', 'scarf'), talk('mate', 'story.s.monday-colours.mate'), go('school')], [{bond: 'mate', n: 1}]),
      a('badges', [get('kiosk', 'sticker', 2), go('school')], [{money: -1}, {bond: 'kiosk', n: 1}], {money: 1}),
    ],
    complication: {choices: [{id: 'stand', effects: [{rep: 1}]}, {id: 'laugh', effects: [{bond: 'mate', n: 1}]}]},
    converge: talk('mate', 'story.s.monday-colours.after'),
    aftermath: [{flag: 'story:street-knows'}, {flag: 'story:age-9', v: 'school'}],
  },
  {
    ...child, id: 'the-window', age: 9, giver: 'neighbour', place: 'home', day: 'any', fork: 'age-9',
    approaches: [
      a('own-up', [talk('neighbour', 'story.s.the-window.own-up'), get('kiosk', 'tape')], [{bond: 'neighbour', n: 2}, {rep: 1}]),
      a('work-it-off', [talk('neighbour', 'story.s.the-window.work'), get('home', 'cloth'), get('corner', 'bag')], [{bond: 'neighbour', n: 1}, {money: 2}]),
      a('pay', [talk('neighbour', 'story.s.the-window.pay')], [{money: -4}], {money: 4}),
    ],
    complication: {choices: [{id: 'tell-dad', effects: [{bond: 'dad', n: 1}]}, {id: 'keep-quiet', effects: [{bond: 'mate', n: 1}, {flag: 'story:secret-window'}]}]},
    converge: talk('neighbour', 'story.s.the-window.after'),
    aftermath: [{flag: 'story:street-knows'}, {flag: 'story:age-9', v: 'window'}],
  },
  /* 5 · S1E4 — the album, one square empty */
  {
    ...child, id: 'missing-square', age: 10, giver: 'mate', place: 'school', day: 'any', episode: 'S1E4', template: 'sticker-swap',
    approaches: [
      a('swap', [get('home', 'sticker', 3), go('school'), talk('mate', 'story.s.missing-square.mate')], [{bond: 'mate', n: 1}]),
      a('packets', [get('kiosk', 'sticker', 3), talk('kiosk', 'story.s.missing-square.kiosk')], [{money: -3}, {bond: 'kiosk', n: 1}], {money: 3}),
      a('play-for-it', [go('pitch'), talk('mate', 'story.s.missing-square.pitch')], [{rep: 1}]),
    ],
    complication: {choices: [{id: 'her-price', effects: [{flag: 'story:square', v: 'full'}, {rep: -1}]}, {id: 'leave-it', effects: [{flag: 'story:square', v: 'empty'}, {rep: 1}]}]},
    converge: go('school'),
    aftermath: [{keep: 'album'}, {bond: 'mate', n: 1}],
  },
  /* 6 — a Saturday without Dad */
  {
    ...child, id: 'her-seat', age: 10, giver: 'neighbour', place: 'ground', day: 'matchday', template: 'kickoff-run',
    approaches: [
      a('carry', [get('home', 'bag'), talk('neighbour', 'story.s.her-seat.walk')], [{bond: 'neighbour', n: 2}]),
      a('ahead', [get('home', 'bag'), go('ground')], [{rep: 1}, {bond: 'neighbour', n: 1}]),
      a('sandwiches', [get('kiosk', 'sandwich', 2), get('home', 'bag'), talk('neighbour', 'story.s.her-seat.walk')], [{money: -2}, {bond: 'neighbour', n: 3}], {money: 2}),
    ],
    complication: {choices: [{id: 'hold', effects: [{rep: 1}]}, {id: 'share', effects: [{bond: 'mate', n: 1}]}]},
    converge: talk('neighbour', 'story.s.her-seat.after'),
    aftermath: [{flag: 'story:heard-her-story'}, {bond: 'dad', n: 1}],
  },
  /* 7 — somebody else's first time */
  {
    ...child, id: 'lead-the-way', age: 11, giver: 'dad', place: 'ground', day: 'matchday', template: 'lead-the-way',
    approaches: [
      a('main-street', [talk('dad', 'story.s.lead-the-way.dad'), go('corner')], [{bond: 'dad', n: 1}]),
      a('sweets', [get('kiosk', 'sandwich'), go('corner')], [{money: -1}, {bond: 'kiosk', n: 1}], {money: 1}),
      a('the-pitch', [go('pitch'), talk('mate', 'story.s.lead-the-way.mate')], [{bond: 'mate', n: 1}, {rep: 1}]),
    ],
    complication: {choices: [{id: 'hand', effects: [{flag: 'story:took-a-hand'}, {bond: 'dad', n: 1}]}, {id: 'song', effects: [{rep: 1}]}], },
    converge: go('ground'),
    aftermath: [{flag: 'story:passed-it-on'}, {rep: 1}],
  },
  /* 8 — the banner for the last home game */
  {
    ...child, id: 'the-banner', age: 11, giver: 'mate', place: 'pitch', day: 'any', template: 'banner-march',
    approaches: [
      a('buy-paint', [get('kiosk', 'paint', 2), get('home', 'cloth'), go('pitch')], [{money: -3}], {money: 3}),
      a('art-room', [go('school'), get('school', 'paint', 2), get('home', 'cloth'), go('pitch')], [{rep: 1}]),
      a('old-sheets', [talk('neighbour', 'story.s.the-banner.neighbour'), get('home', 'paint'), go('pitch')], [{bond: 'neighbour', n: 1}]),
    ],
    complication: {choices: [{id: 'start-again', effects: [{bond: 'mate', n: 1}]}, {id: 'leave-it', effects: [{rep: 1}, {flag: 'story:banner', v: 'crooked'}]}]},
    converge: talk('mate', 'story.s.the-banner.after'),
    aftermath: [{keep: 'banner-corner'}, {bond: 'mate', n: 2}],
  },
  /* 9 · S1E5 — no ticket, on the one night that matters */
  {
    ...child, id: 'no-ticket', age: 12, giver: 'mate', place: 'corner', day: 'matchday', episode: 'S1E5', template: 'sneak-in',
    approaches: [
      a('fence', [talk('mate', 'story.s.no-ticket.crew'), go('pitch'), go('ground')], [{rep: 2}, {flag: 'story:night', v: 'inside'}]),
      a('ask-dad', [talk('dad', 'story.s.no-ticket.ask')], [{bond: 'dad', n: 2}, {flag: 'story:night', v: 'with-dad'}]),
      a('radio', [talk('kiosk', 'story.s.no-ticket.radio')], [{bond: 'kiosk', n: 2}, {flag: 'story:night', v: 'radio'}]),
    ],
    complication: {choices: [{id: 'truth', effects: [{bond: 'dad', n: 2}]}, {id: 'cover', effects: [{bond: 'mate', n: 2}, {bond: 'dad', n: -1}]}]},
    converge: talk('dad', 'story.s.no-ticket.home'),
    aftermath: [{keep: 'fence-thread'}, {flag: 'story:dad-knows'}],
  },
  /* 10 — the Box */
  {
    ...child, id: 'the-box', age: 12, giver: 'dad', place: 'home', day: 'any',
    approaches: [
      a('gather', [talk('mate', 'story.s.the-box.mate'), talk('kiosk', 'story.s.the-box.kiosk'), talk('neighbour', 'story.s.the-box.neighbour')], [{bond: 'mate', n: 1}, {bond: 'kiosk', n: 1}, {bond: 'neighbour', n: 1}]),
      a('walk-it', [go('pitch'), go('school'), go('ground')], [{rep: 1}]),
      a('his-first', [talk('dad', 'story.s.the-box.dad-first')], [{bond: 'dad', n: 2}, {flag: 'story:knows-dads-first'}], {has: ['story:been-inside']}),
    ],
    complication: {choices: [{id: 'keep-all', effects: [{flag: 'story:box', v: 'full'}]}, {id: 'give-one', effects: [{flag: 'story:box', v: 'gave-one'}, {bond: 'mate', n: 2}]}]},
    converge: talk('dad', 'story.s.the-box.dad'),
    aftermath: [{keep: 'box'}, {flag: 'story:box-started'}, {bond: 'dad', n: 2}],
  },
]

/** the spine: one slot after another; a slot with two ids is a fork */
export const CHILDHOOD_SPINE: readonly (readonly string[])[] = [
  ['first-noise'], ['six-short'], ['the-way-in'], ['monday-colours', 'the-window'], ['missing-square'], ['her-seat'], ['lead-the-way'], ['the-banner'], ['no-ticket'], ['the-box'],
]

const side = {stage: 'child', kind: 'side', template: null, episode: null, complication: null, day: 'any'} as const
/** optional, once each: they open as the life goes on and never block it */
export const CHILDHOOD_SIDES: Mission[] = [
  {...side, id: 'old-photo', age: 6, giver: 'dad', place: 'home', approaches: [a('look', [go('home')], [{bond: 'dad', n: 1}])], converge: talk('dad', 'story.s.old-photo.dad'), aftermath: [{flag: 'story:saw-photo'}]},
  {...side, id: 'lost-ball', age: 7, giver: 'mate', place: 'pitch', needs: {has: ['story:done:first-noise']}, approaches: [a('search', [go('pitch'), get('corner', 'bag')], [{bond: 'mate', n: 1}]), a('ask', [talk('neighbour', 'story.s.lost-ball.neighbour')], [{bond: 'neighbour', n: 1}])], converge: talk('mate', 'story.s.lost-ball.mate'), aftermath: [{rep: 1}]},
  {...side, id: 'pay-back', age: 8, giver: 'kiosk', place: 'kiosk', needs: {has: ['story:owes-kiosk'], money: 1}, approaches: [a('coin', [get('home', 'coin')], [{money: -1}]), a('work', [get('kiosk', 'bag', 2)], [{bond: 'kiosk', n: 1}])], converge: talk('kiosk', 'story.s.pay-back.kiosk'), aftermath: [{flag: 'story:owes-kiosk', v: false}, {bond: 'kiosk', n: 1}]},
  {...side, id: 'radio-aerial', age: 10, giver: 'neighbour', place: 'home', needs: {has: ['story:done:the-way-in']}, approaches: [a('fix', [get('kiosk', 'tape'), go('home')], [{bond: 'neighbour', n: 1}]), a('swap', [talk('dad', 'story.s.radio-aerial.dad')], [{bond: 'dad', n: 1}])], converge: talk('neighbour', 'story.s.radio-aerial.neighbour'), aftermath: [{money: 2}]},
]

const standing = {stage: 'child', kind: 'standing', template: null, episode: null, complication: null, day: 'any', age: 6} as const
/** the week's own work: always there when no chapter is ready, so there is always a mission in front of him */
export const STANDING: Mission[] = [
  {...standing, id: 'papers', giver: 'kiosk', place: 'kiosk', approaches: [a('round', [get('kiosk', 'paper', 2), go('corner'), go('home')], [{money: 2}]), a('counter', [get('kiosk', 'bag', 2)], [{money: 1}, {bond: 'kiosk', n: 1}])], converge: talk('kiosk', 'story.s.papers.kiosk'), aftermath: []},
  {...standing, id: 'kickabout', giver: 'mate', place: 'pitch', approaches: [a('play', [go('pitch')], [{bond: 'mate', n: 1}]), a('bring-all', [go('school'), go('pitch')], [{rep: 1}])], converge: talk('mate', 'story.s.kickabout.mate'), aftermath: []},
  {...standing, id: 'radio-check', giver: 'dad', place: 'home', approaches: [a('batteries', [get('kiosk', 'battery')], [{money: -1}, {bond: 'dad', n: 2}], {money: 1}), a('listen', [go('home')], [{bond: 'dad', n: 1}])], converge: talk('dad', 'story.s.radio-check.dad'), aftermath: []},
]
