/**
 * LIFE · the hood — ON YOUR OWN, ages nineteen to thirty: "what does it cost me, and what will I give back?"
 *
 * Love carried on your own wages (THE WORKER, Stage C's question, rewritten for every club): your own seat, a night
 * abroad, the friend who drifts, the second route fork (the end, the coach, the vote, or far from home), the night you
 * choose the club over something else (or do not), the calendar on the fridge, the first day at a new gate, the news.
 * Authored fiction only: no club, no date, no score. Words in `arc-words.ts`.
 */
import type {Approach, Effect, Mission, StoryStep} from './types'

const talk = (who: Extract<StoryStep, {do: 'talk'}>['who'], say: string): StoryStep => ({do: 'talk', who, say})
const get = (at: Extract<StoryStep, {do: 'collect'}>['at'], item: Extract<StoryStep, {do: 'collect'}>['item'], n = 1): StoryStep => ({do: 'collect', at, item, n})
const go = (at: Extract<StoryStep, {do: 'reach'}>['at']): StoryStep => ({do: 'reach', at})
const a = (id: string, steps: StoryStep[], effects: Effect[], needs?: Approach['needs']): Approach => ({id, steps, effects, ...(needs ? {needs} : {})})
const young = {stage: 'young', kind: 'main', template: null, episode: null} as const

export const YOUNG: Mission[] = [
  /* 1 — your own seat, paid with your own wages */
  {
    ...young, id: 'own-seat', age: 19, giver: 'kiosk', place: 'kiosk', day: 'any',
    approaches: [
      a('save-it', [get('home', 'money', 2), talk('kiosk', 'story.s.own-seat.kiosk')], [{rep: 1}]),
      a('next-to-dad', [talk('dad', 'story.s.own-seat.dad')], [{bond: 'dad', n: 2}, {flag: 'story:seat', v: 'by-dad'}]),
      a('with-the-crew', [talk('mate', 'story.s.own-seat.mate')], [{bond: 'mate', n: 2}, {flag: 'story:seat', v: 'with-crew'}]),
    ],
    complication: {choices: [{id: 'pay-it', effects: [{money: -4}, {rep: 1}]}, {id: 'cheaper-end', effects: [{flag: 'story:seat', v: 'cheap-end'}, {bond: 'mate', n: 1}]}]},
    converge: talk('kiosk', 'story.s.own-seat.card'),
    aftermath: [{keep: 'season-card'}, {flag: 'story:own-seat'}],
  },
  /* 2 — a night abroad: first passport, a dead phone, your friend's ticket in your pocket */
  {
    ...young, id: 'away-abroad', age: 21, giver: 'mate', place: 'corner', day: 'matchday', template: 'europe-night',
    approaches: [
      a('the-cheap-way', [get('kiosk', 'paper'), go('corner')], [{rep: 1}]),
      a('drive-all-night', [talk('mate', 'story.s.away-abroad.mate')], [{bond: 'mate', n: 2}]),
      a('the-organised-trip', [talk('kiosk', 'story.s.away-abroad.kiosk')], [{rep: 2}], {has: ['story:route:away']}),
    ],
    complication: {choices: [{id: 'find-him', effects: [{bond: 'mate', n: 2}]}, {id: 'go-in', effects: [{rep: 1}, {flag: 'story:went-in-alone'}]}]},
    converge: go('ground'),
    aftermath: [{keep: 'foreign-coin'}, {flag: 'story:been-abroad'}],
  },
  /* 3 — the friend who drifts */
  {
    ...young, id: 'the-drift', age: 22, giver: 'neighbour', place: 'pitch', day: 'any',
    approaches: [
      a('call-him', [get('kiosk', 'phonecard'), go('home')], [{bond: 'mate', n: 1}]),
      a('his-door', [go('corner'), talk('mate', 'story.s.the-drift.door')], [{bond: 'mate', n: 1}, {rep: 1}]),
      a('ask-around', [talk('neighbour', 'story.s.the-drift.neighbour'), talk('kiosk', 'story.s.the-drift.kiosk')], [{bond: 'neighbour', n: 1}]),
    ],
    complication: {choices: [{id: 'let-it-be', effects: [{flag: 'story:mate', v: 'drifted'}]}, {id: 'remind-him', effects: [{flag: 'story:mate', v: 'reminded'}, {bond: 'mate', n: 1}]}]},
    converge: talk('mate', 'story.s.the-drift.mate'),
    aftermath: [{flag: 'story:mate-drifted'}],
  },
  /* 4a–4d — the second fork: what you give your twenties to; all four reach the same night */
  {
    ...young, id: 'their-banner', age: 23, giver: 'mate', place: 'pitch', day: 'matchday', template: 'derby-banner-raid', fork: 'young-route',
    approaches: [
      a('the-storeroom', [go('pitch'), go('corner')], [{rep: 2}]),
      a('the-decoy', [talk('mate', 'story.s.their-banner.mate'), go('school')], [{bond: 'mate', n: 1}]),
      a('the-long-way', [go('school'), go('corner')], [{rep: 1}]),
    ],
    complication: {choices: [{id: 'run', effects: [{rep: 2}]}, {id: 'leave-it', effects: [{flag: 'story:left-their-banner'}, {bond: 'dad', n: 1}]}]},
    converge: talk('mate', 'story.s.their-banner.after'),
    aftermath: [{flag: 'story:route:ultras'}, {flag: 'story:lean', v: 'ultras'}, {keep: 'banner-thread'}],
  },
  {
    ...young, id: 'the-coach', age: 23, giver: 'kiosk', place: 'corner', day: 'matchday', template: 'away-day', fork: 'young-route',
    approaches: [
      a('the-list', [get('kiosk', 'paper'), talk('mate', 'story.s.the-coach.mate')], [{bond: 'mate', n: 1}]),
      a('the-tin', [get('home', 'tin'), talk('kiosk', 'story.s.the-coach.kiosk')], [{bond: 'kiosk', n: 1}]),
      a('the-driver', [talk('neighbour', 'story.s.the-coach.neighbour')], [{bond: 'neighbour', n: 1}]),
    ],
    complication: {choices: [{id: 'cover-him', effects: [{flag: 'story:covered-fare'}, {money: -2}, {rep: 1}]}, {id: 'pass-the-hat', effects: [{rep: 2}]}]},
    converge: go('ground'),
    aftermath: [{flag: 'story:route:away'}, {flag: 'story:lean', v: 'away'}, {keep: 'coach-sign'}],
  },
  {
    ...young, id: 'the-vote', age: 23, giver: 'neighbour', place: 'school', day: 'any', fork: 'young-route',
    approaches: [
      a('count-hands', [go('school'), talk('mate', 'story.s.the-vote.mate')], [{bond: 'mate', n: 1}]),
      a('the-leaflet', [get('kiosk', 'paper', 2), get('home', 'glue')], [{rep: 1}]),
      a('the-speech', [talk('neighbour', 'story.s.the-vote.neighbour')], [{bond: 'neighbour', n: 1}, {rep: 1}]),
    ],
    complication: {choices: [{id: 'answer', effects: [{rep: 2}]}, {id: 'listen', effects: [{bond: 'neighbour', n: 1}]}]},
    converge: talk('neighbour', 'story.s.the-vote.after'),
    aftermath: [{flag: 'story:route:member'}, {flag: 'story:lean', v: 'member'}, {keep: 'ballot-slip'}],
  },
  {
    ...young, id: 'the-far-job', age: 23, giver: 'dad', place: 'home', day: 'any', fork: 'young-route',
    approaches: [
      a('tell-dad', [talk('dad', 'story.s.the-far-job.dad')], [{bond: 'dad', n: 1}]),
      a('tell-the-kiosk', [talk('kiosk', 'story.s.the-far-job.kiosk')], [{bond: 'kiosk', n: 1}]),
      a('walk-the-streets', [go('pitch'), go('ground')], [{rep: 1}]),
    ],
    complication: {choices: [{id: 'one-last-match', effects: [{rep: 1}]}, {id: 'radio-with-dad', effects: [{bond: 'dad', n: 2}]}]},
    converge: talk('dad', 'story.s.the-far-job.after'),
    aftermath: [{flag: 'story:route:far'}, {flag: 'story:lean', v: 'far'}, {keep: 'one-way-ticket'}],
  },
  /* 5 — the night you choose: the club, or the promise */
  {
    ...young, id: 'the-promise', age: 25, giver: 'kiosk', place: 'kiosk', day: 'matchday', template: 'cup-final-trip',
    approaches: [
      a('the-final', [go('ground')], [{flag: 'story:chose', v: 'club'}, {rep: 2}]),
      a('the-promise', [talk('neighbour', 'story.s.the-promise.neighbour')], [{flag: 'story:chose', v: 'promise'}, {bond: 'neighbour', n: 1}]),
      a('both-halves', [get('kiosk', 'phonecard'), go('ground')], [{flag: 'story:chose', v: 'both'}], {has: ['story:own-seat']}),
    ],
    complication: {choices: [{id: 'answer', effects: [{flag: 'story:answered-the-phone'}]}, {id: 'let-it-ring', effects: [{rep: 1}]}]},
    converge: go('home'),
    aftermath: [{keep: 'two-tickets'}, {flag: 'story:chose-once'}],
  },
  /* 6 — the fixture list on the fridge */
  {
    ...young, id: 'the-calendar', age: 26, giver: 'neighbour', place: 'home', day: 'any',
    approaches: [
      a('mark-them-all', [get('kiosk', 'paper'), go('home')], [{flag: 'story:calendar', v: 'all'}]),
      a('the-big-ones', [talk('dad', 'story.s.the-calendar.dad')], [{bond: 'dad', n: 1}, {flag: 'story:calendar', v: 'some'}]),
      a('ask-first', [talk('neighbour', 'story.s.the-calendar.neighbour')], [{bond: 'neighbour', n: 1}, {flag: 'story:calendar', v: 'asked'}]),
    ],
    complication: {choices: [{id: 'swap-the-day', effects: [{flag: 'story:swapped-a-birthday'}]}, {id: 'there-and-back', effects: [{rep: 1}]}]},
    converge: go('home'),
    aftermath: [{flag: 'story:together'}, {keep: 'fridge-list'}],
  },
  /* 7 — the first day at a new gate */
  {
    ...young, id: 'the-new-gate', age: 28, giver: 'dad', place: 'ground', day: 'matchday', template: 'new-ground',
    approaches: [
      a('take-dad', [talk('dad', 'story.s.the-new-gate.dad')], [{bond: 'dad', n: 2}]),
      a('the-old-way', [go('pitch'), go('corner')], [{rep: 1}]),
      a('a-piece-of-the-old', [get('kiosk', 'tin')], [{flag: 'story:kept-old-piece'}]),
    ],
    complication: {choices: [{id: 'a-new-step', effects: [{rep: 1}]}, {id: 'where-dad-stands', effects: [{bond: 'dad', n: 1}]}]},
    converge: go('ground'),
    aftermath: [{flag: 'story:new-gate'}, {keep: 'first-new-ticket'}],
  },
  /* 8 — the news: there will be somebody smaller */
  {
    ...young, id: 'the-news', age: 30, giver: 'dad', place: 'home', day: 'any',
    approaches: [
      a('at-the-ground', [go('ground')], [{rep: 1}]),
      a('at-home', [go('home')], [{bond: 'dad', n: 1}]),
      a('kiosk-first', [talk('kiosk', 'story.s.the-news.kiosk')], [{bond: 'kiosk', n: 1}]),
    ],
    complication: {choices: [{id: 'ours', effects: [{bond: 'dad', n: 2}]}, {id: 'their-choice', effects: [{flag: 'story:their-choice'}, {rep: 1}]}]},
    converge: talk('dad', 'story.s.the-news.dad'),
    aftermath: [{flag: 'story:expecting'}, {flag: 'story:young-done'}],
  },
]

export const YOUNG_SPINE: readonly (readonly string[])[] = [
  ['own-seat'], ['away-abroad'], ['the-drift'], ['their-banner', 'the-coach', 'the-vote', 'the-far-job'], ['the-promise'], ['the-calendar'], ['the-new-gate'], ['the-news'],
]

const side = {stage: 'young', kind: 'side', template: null, episode: null, complication: null, day: 'any'} as const
export const YOUNG_SIDES: Mission[] = [
  {...side, id: 'paying-back', age: 20, giver: 'mate', place: 'corner', needs: {has: ['story:done:own-seat']}, approaches: [a('the-next-kid', [go('corner')], [{rep: 2}]), a('the-crew-tin', [get('kiosk', 'tin')], [{bond: 'kiosk', n: 1}])], converge: talk('mate', 'story.s.paying-back.mate'), aftermath: [{flag: 'story:paid-forward'}, {flag: 'story:owe:group', v: false}, {flag: 'story:owe:crew', v: false}]},
  {...side, id: 'the-older-lot', age: 24, giver: 'mate', place: 'corner', needs: {has: ['story:done:the-wall']}, approaches: [a('tell-them', [talk('mate', 'story.s.the-older-lot.mate')], [{bond: 'mate', n: 1}]), a('walk-them', [go('pitch'), go('ground')], [{rep: 1}])], converge: go('corner'), aftermath: [{flag: 'story:older-lot'}]},
]

const standing = {stage: 'young', kind: 'standing', template: null, episode: null, complication: null, day: 'any', age: 19} as const
export const YOUNG_STANDING: Mission[] = [
  {...standing, id: 'the-week', giver: 'kiosk', place: 'kiosk', approaches: [a('the-shift', [get('kiosk', 'bag', 2)], [{money: 4}]), a('the-delivery', [get('kiosk', 'paper', 2), go('school')], [{money: 3}, {bond: 'kiosk', n: 1}])], converge: talk('kiosk', 'story.s.the-week.kiosk'), aftermath: []},
  {...standing, id: 'midweek-game', giver: 'mate', place: 'pitch', approaches: [a('play', [go('pitch')], [{bond: 'mate', n: 1}]), a('ref-it', [go('school'), go('pitch')], [{rep: 1}])], converge: talk('mate', 'story.s.midweek-game.mate'), aftermath: []},
  {...standing, id: 'sunday-call', giver: 'dad', place: 'home', approaches: [a('ring', [get('kiosk', 'phonecard')], [{bond: 'dad', n: 1}]), a('visit', [go('home')], [{bond: 'dad', n: 2}])], converge: talk('dad', 'story.s.sunday-call.dad'), aftermath: []},
]
