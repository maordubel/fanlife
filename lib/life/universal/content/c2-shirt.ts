/**
 * Age eight — THE SHIRT.
 *
 * The universal beat: the first shirt of your own. He wants the one in the kiosk window, he has
 * a tin, and the tin is six short. There are three ways across the six — his own arms, his
 * mother's silence, his father's wardrobe — and none of them is the right one. Nobody in the
 * chapter says what a shirt is for. What he keeps from the day is that it was too big.
 */
import type {Chapter, Cond, Effect, Line} from '../types'
import {bond, coins, flag, heart, keep, say, tell} from './kit'

/** The scarf from chapter one, if this life has it. The day plays the same without it. */
const scarfed: Cond = {any: [{wears: 'scarf'}, {has: 'scarf'}]}

const bought = (what: 'shirt' | 'both'): Effect[] => [coins(-20), flag('c2:got'), flag('c2:bought'), keep('shirt'), {e: 'wear', what}, heart(10), {e: 'sound', cue: 'coin'}]
const handed = (what: 'shirt' | 'both'): Effect[] => [flag('c2:got'), flag('c2:handed'), keep('shirt'), {e: 'wear', what}, heart(8), bond('dad', 8)]

const draped: Line = tell('Arms up. It comes down over your head like a tent somebody has already lived in. He rolls each sleeve three times.')
const turn: Line[] = [
  say('dad', 'Turn round.'),
  say('dad', 'Hm.'),
]
const rules: Line[] = [
  say('mum', 'It comes off before you eat.'),
  say('dad', 'It comes off when the season is over.'),
]

export const C2_SHIRT: Chapter = {
  id: 'c2-shirt',
  act: 1,
  age: 8,
  title: 'The Shirt',
  kicker: 'Age eight · the tin under the bed',
  intro: 'Saturday. On Monday {friend} came to school in a {club} shirt, and nothing else has happened all week. Under your bed there is a tin, and the tin rattles.',
  start: {room: 'bedroom', spawn: 'start', time: 'day'},

  cast: [
    {who: 'mum', room: 'room', slot: 'byDoor', when: {flag: 'c2:bought'}, talk: 'mum'},
    {who: 'mum', room: 'kitchen', slot: 'counter', talk: 'mum'},
    {who: 'dad', room: 'room', slot: 'sofa', talk: 'dad'},
    {who: 'kiosk', room: 'street', slot: 'kiosk', talk: 'kiosk'},
    {who: 'friend', room: 'street', slot: 'corner', talk: 'friend', look: {kit: true}},
  ],

  doors: [
    {id: 'bed-out', room: 'bedroom', door: 'door', to: 'room', spawn: 'fromBedroom', label: 'The living room'},
    {id: 'room-bed', room: 'room', door: 'south', to: 'bedroom', spawn: 'fromLiving', label: 'Your room'},
    {id: 'room-kitchen', room: 'room', door: 'east', to: 'kitchen', spawn: 'fromLiving', label: 'The kitchen'},
    {id: 'kitchen-room', room: 'kitchen', door: 'door', to: 'room', spawn: 'fromKitchen', label: 'The living room'},
    {id: 'room-street', room: 'room', door: 'front', to: 'street', spawn: 'fromHome', label: 'Down to the street'},
    {id: 'street-home', room: 'street', door: 'home', to: 'room', spawn: 'fromStreet', label: 'Home'},
  ],

  spots: [
    {id: 'tin', room: 'bedroom', spot: 'box', talk: 'tin', verb: 'open', label: 'The tin under the bed'},
    {id: 'wardrobe', room: 'bedroom', spot: 'wardrobe', talk: 'wardrobe', verb: 'look', label: 'The wardrobe'},
    {id: 'frame', room: 'room', spot: 'frame', talk: 'frame', verb: 'look', label: 'The shirt behind glass'},
    {id: 'fridge', room: 'kitchen', spot: 'fridge', talk: 'fridge', verb: 'look', label: 'The fridge door'},
    {id: 'kiosk-window', room: 'street', spot: 'window', when: {not: 'c2:bought'}, talk: 'kiosk-window', verb: 'look', label: 'The kiosk window'},
    {id: 'crates', room: 'street', spot: 'crates', talk: 'crates', verb: 'look', label: 'The crates'},
  ],

  beats: [
    {id: 'home', room: 'room', when: {flag: 'c2:bought'}, talk: 'home'},
    {id: 'seen', room: 'street', when: {flag: 'c2:handed'}, talk: 'street-end'},
  ],

  objectives: [
    {id: 'count', t: 'The tin under your bed. Count it', done: {flag: 'c2:counted'}, room: 'bedroom'},
    {id: 'price', t: 'Ask {kiosk} what the shirt in the window costs', done: {flag: 'c2:priced'}, room: 'street'},
    {id: 'six', t: 'Six short. Somebody round here has an idea', done: {flag: 'c2:got'}},
    {id: 'home', t: 'Go home. Do not get anything on it', done: {any: [{flag: 'c2:shown'}, {flag: 'c2:handed'}]}, room: 'room'},
    {id: 'street', t: 'Go down. The street has not seen it', done: {flag: 'c2:shown'}, room: 'street'},
  ],

  talks: [
    {id: 'tin', branches: [
      {when: {all: [{flag: 'c2:told'}, {not: 'c2:enough'}, {not: 'c2:got'}]}, lines: [
        tell('People miscount, she said. You tip it out on the blanket and count again, slowly, with one finger.'),
      ], then: [{e: 'play', game: 'count', id: 'c2-tin-again', then: [coins(6), flag('c2:enough'), flag('c2:topped')]}], next: 'tin-count'},
      {when: {flag: 'c2:bought'}, lines: [tell('Empty, the tin makes a different noise: one button, going round.')]},
      {when: {flag: 'c2:enough'}, lines: [tell('Twenty. You are not counting any more. You are checking.')]},
      {when: {flag: 'c2:counted'}, lines: [tell('Fourteen. Counting it again does not make it fifteen. Neither does shaking it.')]},
      {lines: [
        tell('The tin lives under the bed. There is a dent in the lid from the day you stood on it.'),
        tell('You tip it out on the blanket.'),
      ], then: [{e: 'play', game: 'count', id: 'c2-tin', then: [coins(14), flag('c2:counted')]}], next: 'tin-count'},
    ]},
    {id: 'tin-count', branches: [
      {when: {flag: 'c2:enough'}, lines: [
        tell('Twenty.'),
        tell('Six of the coins are warmer than the others. Or you were in a hurry this morning. One of the two.'),
      ]},
      {lines: [
        tell('Fourteen.'),
        tell('It took a year: birthdays, errands, one you found in the street and stood on until nobody was looking.'),
        tell('Whether fourteen is a lot depends on the shirt.'),
      ]},
    ]},

    {id: 'kiosk', branches: [
      {when: {flag: 'c2:handed'}, lines: [say('kiosk', 'Come here. Let me look at that.')], next: 'street-end'},
      {when: {flag: 'c2:bought'}, lines: [say('kiosk', 'Home. Walking. No refunds for knees.')]},
      {when: {flag: 'c2:enough'}, lines: [
        tell('Four towers of five, on the counter. He counts them anyway, sliding each coin across with one finger.'),
        say('kiosk', 'Twenty.'),
        tell('He takes the shirt down with the pole with the hook. No bag. He holds it open like a coat, and you walk into it.'),
      ], next: 'wear-new'},
      {when: {flag: 'c2:priced'}, lines: [
        say('kiosk', 'Still six short?'),
        say('kiosk', 'There are six crates out here that belong round the back. My back says they can stay.'),
        tell('He looks at the crates, then at you, then at nothing.'),
      ], choices: [
        {id: 'carry', t: 'Carry the crates', then: [{e: 'play', game: 'carry', id: 'c2-crates', then: [coins(6), flag('c2:enough'), flag('c2:earned'), bond('kiosk', 5)]}], next: 'crates-done'},
        {id: 'later', t: 'Not yet'},
      ]},
      {when: {flag: 'c2:counted'}, lines: [
        say('me', 'How much is the shirt in the window?'),
        say('kiosk', 'Twenty. Same as when you asked with your face against the glass.'),
        say('me', 'I have fourteen.'),
        say('kiosk', 'Fourteen is most of a shirt. I do not sell most of a shirt.'),
        tell('He is not being unkind. He is being a kiosk.'),
      ], then: [flag('c2:priced')]},
      {lines: [
        say('me', 'How much is the shirt in the window?'),
        say('kiosk', 'How much have you got?'),
        say('me', 'A tin.'),
        say('kiosk', 'A tin is not a number. Go and count it.'),
      ]},
    ]},
    {id: 'crates-done', branches: [{lines: [
      tell('Six crates, one at a time. The last one you carry mostly with your chin.'),
      tell('He counts six coins into your hand, out loud. He does not do that for adults.'),
      tell('Fourteen and six. You check on your fingers.'),
    ]}]},
    {id: 'wear-new', branches: [
      {when: scarfed, lines: [tell('It comes down past your belt. The scarf goes back on top. The two have never met. They get on.'), say('kiosk', 'Do not grow for a year.')], then: bought('both')},
      {lines: [tell('It comes down past your belt. The collar smells of the inside of the kiosk.'), say('kiosk', 'Do not grow for a year.')], then: bought('shirt')},
    ]},

    {id: 'friend', branches: [
      {when: {flag: 'c2:handed'}, lines: [say('friend', 'What are you wearing?')], next: 'street-end'},
      {when: {flag: 'c2:bought'}, lines: [
        say('friend', 'It is the same as mine.'),
        say('me', 'Mine is newer.'),
        say('friend', 'Mine has a number.'),
      ]},
      {when: {all: [{flag: 'c2:priced'}, {not: 'c2:two'}]}, lines: [
        say('me', 'Six short.'),
        tell('{friend} goes through every pocket, including the one with the hole.'),
        say('friend', 'I have two. You can have two.'),
        say('me', 'That leaves four.'),
        say('friend', 'Four is fewer than six.'),
        tell('You do not take them. But you count them as if you had.'),
      ], then: [flag('c2:two'), bond('friend', 5)]},
      {when: {flag: 'c2:priced'}, lines: [say('friend', 'The two are still here.')]},
      {lines: [
        say('friend', 'It has a number on the back. Do you want to see the number?'),
        tell('You have seen the number. Every day since Monday.'),
        say('me', 'Yes.'),
      ]},
    ]},

    {id: 'mum', branches: [
      {when: {flag: 'c2:bought'}, lines: [say('mum', 'Stand still. Let me see what the rattling was for.')], next: 'home'},
      {when: {flag: 'c2:handed'}, lines: [say('mum', 'He told me that shirt was lost.'), say('mum', 'I have washed it twice since it was lost.')]},
      {when: {flag: 'c2:topped'}, lines: [
        say('mum', 'Twenty? There you are. People miscount.'),
        tell('She does not turn round. She is wiping a part of the counter that is already clean.'),
      ]},
      {when: {flag: 'c2:enough'}, lines: [say('mum', 'Crates? Wash your hands. Then go and buy it, before he sells it to a taller child.')]},
      {when: {flag: 'c2:told'}, lines: [say('mum', 'Count it again. Properly. People miscount.')]},
      {when: {flag: 'c2:priced'}, lines: [
        say('me', 'The shirt is twenty. I have fourteen.'),
        say('mum', 'Six.'),
        tell('She says it straight away, without fingers.'),
        say('mum', 'And what are you going to do about six?'),
      ], choices: [
        {id: 'find', t: 'Find six.', then: [flag('c2:told', 'find'), heart(4)], next: 'mum-six'},
        {id: 'dad', t: 'Ask Dad.', then: [flag('c2:told', 'dad'), bond('dad', 3)], next: 'mum-six'},
        {id: 'dunno', t: 'I do not know.', then: [flag('c2:told', 'dunno'), bond('mum', 5)], next: 'mum-six'},
      ]},
      {when: {flag: 'c2:counted'}, lines: [say('mum', 'Fourteen of what? Go and ask the thing what it costs.')]},
      {lines: [say('mum', 'You have been rattling since you woke up. Count it on your bed, not on my floor.')]},
    ]},
    {id: 'mum-six', branches: [
      {when: {is: ['c2:told', 'find']}, lines: [say('mum', 'Good. Start with what you have. Count it again. People miscount.')]},
      {when: {is: ['c2:told', 'dad']}, lines: [
        say('mum', 'He will not give you six coins. He does not think in coins.'),
        say('mum', 'Count the tin again on your way. People miscount.'),
      ]},
      {lines: [say('mum', 'Nobody does, at six short.'), say('mum', 'Count it again, properly. People miscount.')]},
    ]},

    {id: 'dad', branches: [
      {when: {flag: 'c2:bought'}, lines: [say('dad', 'Come here. Into the light.')], next: 'home'},
      {when: {flag: 'c2:handed'}, lines: [
        say('dad', 'Go down. A shirt should be seen from across a street.'),
        tell('He has picked the newspaper up again. It is upside down.'),
      ]},
      {when: {flag: 'c2:enough'}, lines: [say('dad', 'Twenty? Then why are you standing in my light? Go and buy it.')]},
      {when: {flag: 'c2:offered'}, lines: [
        tell('The old shirt is over the arm of the sofa. It has not moved. Neither has he.'),
        say('dad', 'Well?'),
      ], choices: [
        {id: 'wear', t: 'Put it on', next: 'wear-old'},
        {id: 'later', t: 'Not yet'},
      ]},
      {when: {flag: 'c2:priced'}, lines: [
        say('me', 'The shirt is twenty. I have fourteen.'),
        tell('He looks at the shirt behind glass. Then at you. Then he gets up, which he does not do for small things.'),
        tell('From the other room comes the sound of a wardrobe being argued with.'),
        tell('He comes back with a {club} shirt, folded flat. Not the one from the window: the colour has gone soft and the badge has cracked like paint.'),
        tell('He holds it up against you. The sleeves reach your knees.'),
        say('dad', 'It will fit. Eventually.'),
      ], choices: [
        {id: 'wear', t: 'Put it on', next: 'wear-old'},
        {id: 'whose', t: 'Whose was it?', then: [flag('c2:offered', 'whose'), bond('dad', 5)], next: 'dad-shirt'},
        {id: 'window', t: 'It is not the one in the window', then: [flag('c2:offered', 'window')], next: 'dad-shirt'},
      ]},
      {when: {flag: 'c2:counted'}, lines: [say('dad', 'Fourteen of what? Find out the price before you say what you have.')]},
      {lines: [say('dad', 'Something is rattling in this flat. I am not asking.')]},
    ]},
    {id: 'dad-shirt', branches: [
      {when: {is: ['c2:offered', 'whose']}, lines: [
        say('dad', 'Mine. I was older than you. Not by as much as you think.'),
        tell('He lays it over the arm of the sofa, badge up.'),
      ]},
      {lines: [
        say('dad', 'No. That one is twenty. This one you cannot buy.'),
        tell('He lays it over the arm of the sofa, badge up, and sits down next to it.'),
      ]},
    ]},
    {id: 'wear-old', branches: [
      {when: scarfed, lines: [draped, tell('The scarf goes back on top. The two of them are about the same age.'), say('dad', 'There.')], then: handed('both')},
      {lines: [draped, say('dad', 'There.')], then: handed('shirt')},
    ]},

    {id: 'home', branches: [
      {when: {flag: 'c2:earned'}, lines: [
        tell('Mum looks at your hands before she looks at the shirt.'),
        say('mum', 'Crates.'),
        tell('Dad lowers the newspaper as far as his eyes.'),
        ...turn,
        tell('It is the longest thing he has ever said about clothes.'),
        ...rules,
      ], then: [flag('c2:shown'), {e: 'end', ending: 'earned'}]},
      {lines: [
        say('dad', 'Twenty? This morning the whole flat heard fourteen.'),
        say('me', 'I miscounted.'),
        tell('Mum is reading the back of a packet with great attention.'),
        ...turn,
        tell('He says it to Mum, not to the shirt.'),
        ...rules,
      ], then: [flag('c2:shown'), {e: 'end', ending: 'quiet'}]},
    ]},
    {id: 'street-end', branches: [{lines: [
      tell('The street door bangs behind you. The street looks up, and keeps looking.'),
      say('friend', 'That is not the one from the window.'),
      say('me', 'It is my dad\'s.'),
      tell('{friend} looks down at the one with the number, which is new, and has never been anywhere.'),
      say('friend', 'Swap?'),
      say('me', 'No.'),
      say('kiosk', 'I know that shirt. It used to go past here a great deal faster.'),
      tell('Upstairs a curtain moves. He is not watching. He is standing where watching is done from.'),
    ], then: [flag('c2:shown'), {e: 'end', ending: 'handed'}]}]},

    {id: 'wardrobe', branches: [
      {lines: [tell('One hanger with nothing on it. You have been looking at that hanger all week.')]},
    ]},
    {id: 'frame', branches: [{lines: [
      tell('The shirt behind glass has never been worn by anybody you know.'),
      tell('Dad says some shirts are for wearing and some are for knowing where they are.'),
    ]}]},
    {id: 'fridge', branches: [{lines: [
      tell('Your horse is still on the fridge. Under it now there is a drawing of a shirt.'),
      tell('It is a better shirt than it was a horse.'),
    ]}]},
    {id: 'kiosk-window', branches: [
      {lines: [
        tell('A {club} shirt on a hanger, between the newspapers and a card of combs.'),
        tell('One side has faded where the sun gets at it. That is the side you like.'),
      ]},
    ]},
    {id: 'crates', branches: [
      {when: {flag: 'c2:earned'}, lines: [tell('Where the crates were there is a clean square of pavement. It is yours.')]},
      {lines: [tell('Six crates of empty bottles by the kiosk door. They have been there since Thursday.')]},
    ]},
  ],

  endings: {
    earned: {title: 'The Shirt', body: 'Fourteen from the tin and six from your own two arms. It is too new and too big. You will remember the crates longer than the shirt: the first time a thing cost exactly what you could carry.', keep: 'shirt'},
    quiet: {title: 'The Shirt', body: 'Fourteen from the tin, and six that were there when you counted properly. Nobody ever explained the six. You will work them out years from now, at a counter, making up the difference for somebody smaller.', keep: 'shirt'},
    handed: {title: 'The Shirt', body: 'Not the one from the window. The other one: soft, cracked, sleeves rolled three times. The tin went back under the bed, still full. Some things are not for sale. You were handed one of them, on a Saturday, again.', keep: 'shirt'},
  },

  keepsakes: [
    {id: 'shirt', name: 'Your first shirt', note: 'The first one that was yours. It was too big, whichever one it was. That is how you know.'},
  ],
}
