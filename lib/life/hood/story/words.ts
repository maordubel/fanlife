/**
 * LIFE · the hood — every word the story prints (English; the interface default).
 *
 * Authored fiction only: no club, no date, no score, no real person, and nothing a real person is made to say.
 * `{mate}`, `{kiosk}`, `{neighbour}` are the first names of the club's own cast (or the role's word when the pack
 * has none). A date or a score is never written here: it comes from the archive night, printed as recorded.
 * Same shape as `lib/life/hood/words.ts`: a key table and one function, so a second language is a second table.
 */
import {ARC_WORDS} from './arc-words'
import {FEEL_WORDS} from './feel/words'

const EN = {
  // the frame
  'story.stage.child': 'Childhood', 'story.stage.teen': 'The teens', 'story.stage.young': 'On your own', 'story.stage.adult': 'Your turn',
  'story.route.family': 'Family', 'story.route.ultras': 'The end behind the goal', 'story.route.away': 'Away days', 'story.route.member': 'The members’ room', 'story.route.far': 'Far from home',
  'story.age': 'Age {n}', 'story.bridge': 'Same street. A little taller.',
  'story.day.0': 'Six days to go', 'story.day.1': 'Five days to go', 'story.day.2': 'Four days to go', 'story.day.3': 'Three days to go', 'story.day.4': 'Two days to go', 'story.day.5': 'Tomorrow', 'story.day.6': 'Matchday',
  'story.offer.main': 'Chapter', 'story.offer.side': 'A small job', 'story.offer.standing': 'This week', 'story.offer.pick': 'How will you do it?', 'story.offer.wait': 'The next chapter is on matchday',
  // the story in the hood: the HUD, the talks, the cards
  'story.next': 'Next: {title}', 'story.next.talk': 'Talk to {who}', 'story.next.kicker': '{stage} · Age {n} · {day}', 'story.active.kicker': '{title} · {n} of {m}',
  'story.talk.menu': '“Got a minute? There’s something.”', 'story.talk.later': 'Not now.', 'story.talk.carry-on': 'On it.', 'story.talk.drop': 'Leave it for now.', 'story.talk.later.line': '“Whenever you’re ready. I’m not going anywhere.”',
  'story.end-day.line': '“Get some sleep. Every night brings matchday closer.”',
  'story.idle.dad': '“Go on, have a wander. I’m here.”', 'story.idle.mate': '“Same corner as always. Where else would I be?”', 'story.idle.kiosk': '“Papers, sweets, batteries. Take your time.”', 'story.idle.neighbour': '“Mind how you go. I’m always on the balcony if you want me.”',
  'story.chapter': 'Chapter {n}', 'story.begin': 'It starts here.', 'story.later.1': 'A year later.', 'story.later.n': '{k} years later.',
  'story.num.2': 'Two', 'story.num.3': 'Three', 'story.num.4': 'Four', 'story.num.5': 'Five', 'story.num.6': 'Six',
  'story.stage-end.child': 'That was a childhood.', 'story.stage-end.teen': 'That was growing up.', 'story.stage-end.young': 'That was your own time.', 'story.stage-end.adult': 'That was a life.',
  'story.stage-end.line': 'The street is still yours. The next chapter starts when you are ready.', 'story.stage-end.last': 'The Box belongs to somebody smaller now. The street is still yours.',
  'story.delta.money': 'Money', 'story.delta.rep': 'The street', 'story.delta.kept': 'Into the Box', 'story.delta.none': 'Nothing changed but the day.',
  'story.card.continue': 'Continue', 'story.card.go': 'Back to the street',
  'story.archive.kicker': 'From the archive', 'story.archive.paper': 'In the paper the next morning', 'story.archive.radio': 'On the radio that night', 'story.archive.source': 'Source: {publisher}', 'story.archive.tonight': 'Tonight, as the archive has it',
  'story.banner.accepted': 'Mission accepted', 'story.banner.week': 'A new week',
  'story.map.next': 'The next mission starts here', 'story.map.side': 'A small job here',
  'story.bag.box': 'The Box', 'story.bag.keep.d': 'In the Box. Kept for good.', 'story.bag.carry.d': 'For the job you are on.',
  'story.item.battery': 'Batteries', 'story.item.bag': 'Bags', 'story.item.cloth': 'A cloth', 'story.item.bottle': 'Empties', 'story.item.ticket': 'Tickets', 'story.item.scarf': 'Your scarf', 'story.item.sticker': 'Stickers', 'story.item.tape': 'Tape', 'story.item.sandwich': 'Something to eat', 'story.item.paint': 'Paint', 'story.item.coin': 'A coin', 'story.item.paper': 'Papers',
  'story.complication': 'Then this happens', 'story.aftermath': 'Afterwards', 'story.kept': 'Into the Box: {thing}', 'story.end-day': 'Call it a day',
  // objectives
  'story.o.talk.dad': 'Talk to Dad', 'story.o.talk.mate': 'Find {mate}', 'story.o.talk.kiosk': 'Ask at {kiosk}’s kiosk', 'story.o.talk.neighbour': 'Knock for {neighbour}',
  'story.o.reach.home': 'Back to the front door', 'story.o.reach.kiosk': 'To the kiosk corner', 'story.o.reach.corner': 'To the corner', 'story.o.reach.school': 'To the school gate', 'story.o.reach.pitch': 'To the pitch', 'story.o.reach.ground': 'To the ground',
  'story.o.collect.battery': 'Pick up the batteries', 'story.o.collect.bag': 'Carry the bags', 'story.o.collect.cloth': 'Fetch the cloth', 'story.o.collect.bottle': 'Collect the empties', 'story.o.collect.ticket': 'Take the tickets', 'story.o.collect.scarf': 'Fetch your scarf',
  'story.o.collect.sticker': 'Get the stickers', 'story.o.collect.tape': 'Get the tape', 'story.o.collect.sandwich': 'Pick up something to eat', 'story.o.collect.paint': 'Get the paint', 'story.o.collect.coin': 'Find a coin', 'story.o.collect.paper': 'Take the papers',
  // what is kept
  'story.keep.scarf': 'The first scarf', 'story.keep.shirt': 'The first shirt', 'story.keep.ticket': 'Half a ticket', 'story.keep.album': 'The album', 'story.keep.banner-corner': 'A corner of the banner', 'story.keep.fence-thread': 'A thread from the fence', 'story.keep.box': 'The Box itself',

  /* the moments (moments.ts): a gesture at a chapter's last line, remembered a chapter later */
  'story.moment.first-noise.ask': 'Through the wall the neighbours are already shouting. The radio has not caught up.',
  'story.moment.first-noise.radio': 'Hold the radio to his ear', 'story.moment.first-noise.window': 'Run to the window and shout',
  'story.moment.first-noise.radio.say': '“There. THERE. You heard it before I did.”', 'story.moment.first-noise.window.say': '“Go on! Tell them it was us!”',
  'story.moment.first-noise.radio.after': 'You held the radio to his ear. He heard it from you.', 'story.moment.first-noise.window.after': 'You were at the window before the radio said it. The whole street heard you.',
  'story.moment.first-noise.radio.later': '“The boy with the ears,” the kiosk keeper calls you. Dad has told him about the radio.', 'story.moment.first-noise.window.later': '“The boy who shouted,” the kiosk keeper calls you. The street has not forgotten.',
  'story.moment.six-short.ask': 'It is in your hands. It still smells of the shop.',
  'story.moment.six-short.wear': 'Put it on now, over everything', 'story.moment.six-short.carry': 'Fold it and carry it home',
  'story.moment.six-short.wear.say': '“Sleeves to your knees. You’ll grow. Don’t take it off on my account.”', 'story.moment.six-short.carry.say': '“Careful with it. Go on, show them at home.”',
  'story.moment.six-short.wear.after': 'You wore it home over your jumper, sleeves rolled four times.', 'story.moment.six-short.carry.after': 'You carried it home folded, flat on both hands.',
  'story.moment.six-short.wear.later': 'The sleeves are rolled three times now, not four.', 'story.moment.six-short.carry.later': 'It comes out of the drawer still folded the way you folded it.',
  /* 1 · first-noise */
  'story.m.first-noise.title': 'The First Noise',
  'story.m.first-noise.offer': '“Kick-off soon and the radio is dead. Two batteries. And {mate} still has my scarf. Go on, you’re quick.”',
  'story.m.first-noise.again': '“Batteries and the scarf. Any order you like.”', 'story.m.first-noise.done': '“Hear that? That is them coming out.”',
  'story.m.first-noise.a.kiosk-first': 'Kiosk first, then the scarf', 'story.m.first-noise.a.scarf-first': 'Scarf first, then the kiosk', 'story.m.first-noise.a.next-door': 'Ask {neighbour}: her radio always works',
  'story.m.first-noise.c': 'The crossing is jammed with people in colours and the noise from the ground has already started.',
  'story.m.first-noise.c.run': 'Run the long way round', 'story.m.first-noise.c.ask': 'Ask {neighbour} to see you across',
  'story.m.first-noise.aftermath': 'The scarf is longer than you are. Dad winds it round you twice and turns the radio up.',
  'story.s.first-noise.mate': '“Your dad’s scarf? Here. Tell him I only wore it once.”', 'story.s.first-noise.neighbour': '“Mine works. Bring your dad round, I’ll put the kettle on.”', 'story.s.first-noise.dad': '“Sit here. Listen. You’ll know when it happens, the whole street will tell you.”',
  /* 2 · six-short */
  'story.m.six-short.title': 'Six Short',
  'story.m.six-short.offer': '“That shirt in the window? Twenty. You have fourteen, I’ve seen you count. I can find you a morning’s work.”',
  'story.m.six-short.again': '“Six more. The shirt is not going anywhere before the weekend.”', 'story.m.six-short.done': '“It’s big on you. Good. You’ll get years out of it.”',
  'story.m.six-short.a.crates': 'Stack the crates for {kiosk}', 'story.m.six-short.a.car': 'Wash {neighbour}’s car', 'story.m.six-short.a.bottles': 'Collect the empties round the street',
  'story.m.six-short.c': 'You count it twice on the kerb. Nineteen. One coin rolled down a drain somewhere.',
  'story.m.six-short.c.dad': 'Ask Dad for the last one', 'story.m.six-short.c.owe': 'Ask {kiosk} to trust you for it', 'story.m.six-short.c.wardrobe': 'Go home and tell Dad you tried',
  'story.m.six-short.aftermath': 'You wear it to bed. Nobody tells you not to.',
  'story.s.six-short.kiosk': '“Tidy. Tidier than I’d have done it. Here.”', 'story.s.six-short.neighbour': '“The car? It hasn’t been washed since it was new. Bucket’s by your door.”', 'story.s.six-short.neighbour.paid': '“I can see my face in it. I’m not sure I wanted to.”', 'story.s.six-short.shirt': '“Arms up. There. Now you look like you belong on this street.”',
  /* 3 · the-way-in */
  'story.m.the-way-in.title': 'The Way In',
  'story.m.the-way-in.offer': '“Two tickets on the table. Count them. Two. You’re coming with me today.”',
  'story.m.the-way-in.again': '“Tickets first. Then we walk.”', 'story.m.the-way-in.done': '“That step is yours now. Remember where it is.”',
  'story.m.the-way-in.a.with-dad': 'Walk the main street with Dad', 'story.m.the-way-in.a.short-cut': 'Take {mate}’s short cut past the pitch', 'story.m.the-way-in.a.old-hand': 'Go early with {neighbour}, who has always gone',
  'story.m.the-way-in.c': 'At the gate the queue closes round you and somebody’s elbow takes half your ticket with it.',
  'story.m.the-way-in.c.wait': 'Hold on and wait your turn', 'story.m.the-way-in.c.squeeze': 'Squeeze through the gap',
  'story.m.the-way-in.aftermath': 'You come up the steps and the green is brighter than anything on your street. Half a ticket goes in your pocket.',
  'story.s.the-way-in.dad': '“Stay close. If we lose each other: the gate, under the clock.”', 'story.s.the-way-in.mate': '“Round the back of the pitch. Nobody queues that way.”', 'story.s.the-way-in.neighbour': '“We go early. You learn the song before the ground is full, that’s how it’s done.”',
  /* 4a · monday-colours */
  'story.m.monday-colours.title': 'Monday Colours',
  'story.m.monday-colours.offer': '“Everyone’s wearing theirs to school on Monday. Everyone. You in?”',
  'story.m.monday-colours.again': '“Monday. Colours. Don’t forget.”', 'story.m.monday-colours.done': '“Told you. Half the yard.”',
  'story.m.monday-colours.a.open': 'Scarf on, out in the open', 'story.m.monday-colours.a.under': 'Under the jumper, show it at the gate', 'story.m.monday-colours.a.badges': 'Badges from the kiosk for the two of you',
  'story.m.monday-colours.c': 'By the gate, a kid from the other lot looks you up and down and has something to say about it.',
  'story.m.monday-colours.c.stand': 'Stand there and say nothing', 'story.m.monday-colours.c.laugh': 'Laugh first, with {mate}',
  'story.m.monday-colours.aftermath': 'By the last bell the whole yard knows which side of the street you are from.',
  'story.s.monday-colours.mate': '“Under the jumper till the gate. Then both together. Ready?”', 'story.s.monday-colours.after': '“They’ll remember that. So will I.”',
  /* 4b · the-window */
  'story.m.the-window.title': 'The Window',
  'story.m.the-window.offer': '“That ball came through my kitchen window. I’m not cross. I am curious who is going to put it right.”',
  'story.m.the-window.again': '“The window is still a window with a hole in it.”', 'story.m.the-window.done': '“Good as new. Better: now it has a story.”',
  'story.m.the-window.a.own-up': 'Own up and tape it till the glass comes', 'story.m.the-window.a.work-it-off': 'Work it off: her shopping and her step', 'story.m.the-window.a.pay': 'Pay for it from your tin',
  'story.m.the-window.c': '{mate} kicked it, not you. Nobody saw.',
  'story.m.the-window.c.tell-dad': 'Tell Dad how it really went', 'story.m.the-window.c.keep-quiet': 'Keep it between you and {mate}',
  'story.m.the-window.aftermath': 'She gives the ball back at the door. Every door on the street knows your name now.',
  'story.s.the-window.own-up': '“You came and said so. That is most of the job done.”', 'story.s.the-window.work': '“Two bags from the corner and my step swept. Then we are even.”', 'story.s.the-window.pay': '“Put half of that back in your tin. Half is plenty.”', 'story.s.the-window.after': '“Play at the pitch next time. And knock when there’s a match on, I like the company.”',
  /* 5 · missing-square */
  'story.m.missing-square.title': 'The Missing Square',
  'story.m.missing-square.offer': '“One square. One! I’ve got every double there is and not that one. You?”',
  'story.m.missing-square.again': '“Still one square short. Before the bell.”', 'story.m.missing-square.done': '“Let me see the page again.”',
  'story.m.missing-square.a.swap': 'Take your doubles to the school gate', 'story.m.missing-square.a.packets': 'Buy packets at the kiosk', 'story.m.missing-square.a.play-for-it': 'Play for it at the pitch',
  'story.m.missing-square.c': 'Only one kid has it. Three times over. And they support the other lot.',
  'story.m.missing-square.c.her-price': 'Pay their price, whatever it is', 'story.m.missing-square.c.leave-it': 'Keep your pride and the empty square',
  'story.m.missing-square.aftermath': 'The album goes under the bed. Full or one short, you know every page by heart.',
  'story.s.missing-square.mate': '“Doubles out. Don’t show them the good ones first.”', 'story.s.missing-square.kiosk': '“Three packets. I don’t know what’s in them either, that’s the point.”', 'story.s.missing-square.pitch': '“First to three. Winner picks from the other one’s pile.”',
  /* 6 · her-seat */
  'story.m.her-seat.title': 'Her Seat',
  'story.m.her-seat.offer': '“Your dad’s working today, I heard. I’m going anyway, I always go. My bag is heavier than it used to be.”',
  'story.m.her-seat.again': '“The bag’s by your door. Mind the flask.”', 'story.m.her-seat.done': '“Same seat next time. You know where it is now.”',
  'story.m.her-seat.a.carry': 'Carry her bag and walk at her pace', 'story.m.her-seat.a.ahead': 'Run ahead and keep her place', 'story.m.her-seat.a.sandwiches': 'Bring something from the kiosk for half-time',
  'story.m.her-seat.c': 'Somebody is already in her place, and they are bigger than both of you.',
  'story.m.her-seat.c.hold': 'Tell them whose place it is', 'story.m.her-seat.c.share': 'Squeeze along and make room',
  'story.m.her-seat.aftermath': 'She tells you about her first time here. You tell Dad all of it that night, in the wrong order.',
  'story.s.her-seat.walk': '“Slowly. The ground isn’t going anywhere. I’ve checked, for years.”', 'story.s.her-seat.after': '“I came here with my father. He stood just there. Tell yours I said he raised you right.”',
  /* 7 · lead-the-way */
  'story.m.lead-the-way.title': 'Lead the Way',
  'story.m.lead-the-way.offer': '“There’s a little one on the corner who has never been. First time. You know the way now. You take them.”',
  'story.m.lead-the-way.again': '“They’re waiting on the corner. Don’t walk too fast.”', 'story.m.lead-the-way.done': '“I watched you all the way down the road. You didn’t look back once.”',
  'story.m.lead-the-way.a.main-street': 'Straight down the main street', 'story.m.lead-the-way.a.sweets': 'By the kiosk first, for something sweet', 'story.m.lead-the-way.a.the-pitch': 'Past the pitch, to show them where it starts',
  'story.m.lead-the-way.c': 'At the last crossing the noise from the ground gets big and the little one stops walking.',
  'story.m.lead-the-way.c.hand': 'Hold out your hand', 'story.m.lead-the-way.c.song': 'Teach them the first line of the song',
  'story.m.lead-the-way.aftermath': 'At the top of the steps they go quiet, the way you did. You know what they are looking at.',
  'story.s.lead-the-way.dad': '“What did I tell you, your first time? Tell them that.”', 'story.s.lead-the-way.mate': '“Is that them? Small. Were we that small?”',
  /* 8 · the-banner */
  'story.m.the-banner.title': 'The Banner',
  'story.m.the-banner.offer': '“Last home game. We should have a banner. A real one. I’ve got an idea and no paint.”',
  'story.m.the-banner.again': '“Paint and a sheet. I’ll bring the idea.”', 'story.m.the-banner.done': '“They saw it. I swear the whole end saw it.”',
  'story.m.the-banner.a.buy-paint': 'Buy paint at the kiosk', 'story.m.the-banner.a.art-room': 'Ask at school for what the art room can spare', 'story.m.the-banner.a.old-sheets': 'Ask {neighbour} for an old sheet',
  'story.m.the-banner.c': 'It dries overnight. In the morning one letter is plainly the wrong way round.',
  'story.m.the-banner.c.start-again': 'Start again, together', 'story.m.the-banner.c.leave-it': 'Leave it. It’s yours.',
  'story.m.the-banner.aftermath': 'You cut a corner off it afterwards. Paint on your hands for a week.',
  'story.s.the-banner.neighbour': '“Take the old sheets. They’ve seen worse than paint.”', 'story.s.the-banner.after': '“Next season, a bigger one. With poles.”',
  /* 9 · no-ticket */
  'story.m.no-ticket.title': 'No Ticket',
  'story.m.no-ticket.offer': '“Tonight’s the one, and you’ve got no ticket and you’re meant to be indoors. There’s a gap in the fence behind the pitch. I found it.”',
  'story.m.no-ticket.again': '“It’s tonight. Decide.”', 'story.m.no-ticket.done': '“We never tell anyone. Agreed?”',
  'story.m.no-ticket.a.fence': 'The gap in the fence, with the crew', 'story.m.no-ticket.a.ask-dad': 'Go home and ask Dad straight', 'story.m.no-ticket.a.radio': 'Listen at the kiosk radio with {kiosk}',
  'story.m.no-ticket.c': 'Dad was not at work tonight. He was there. And he saw you, or he is about to hear.',
  'story.m.no-ticket.c.truth': 'Tell him all of it', 'story.m.no-ticket.c.cover': 'Leave {mate} out of it',
  'story.m.no-ticket.aftermath': 'A thread from the fence is still caught on your sleeve. You keep it like a medal.',
  'story.s.no-ticket.crew': '“Low, then left, then run. Don’t stop to look.”', 'story.s.no-ticket.ask': '“You came and asked. Sit down. Let me think what I’d have done at your age.”', 'story.s.no-ticket.radio': '“No ticket? Pull up a crate. Best seat on the street, this.”', 'story.s.no-ticket.home': '“I did the same once. My father waited up as well. Next time we go together, through the front.”',
  /* 10 · the-box */
  'story.m.the-box.title': 'The Box',
  'story.m.the-box.offer': '“I had a box like this. My father gave it to me. Scarf, ticket, the album, whatever matters. Go and see what the street has kept for you.”',
  'story.m.the-box.again': '“The box is on your bed. It’s not full yet.”', 'story.m.the-box.done': '“Under the bed. One day you’ll hand it to somebody small.”',
  'story.m.the-box.a.gather': 'Ask the street what it kept for you', 'story.m.the-box.a.walk-it': 'Walk every place it happened', 'story.m.the-box.a.his-first': 'Ask Dad what was in his',
  'story.m.the-box.c': '{mate} has nothing to put in a box of their own.',
  'story.m.the-box.c.keep-all': 'Keep every piece, and promise to show it', 'story.m.the-box.c.give-one': 'Give {mate} one of yours',
  'story.m.the-box.aftermath': 'The lid goes on. It is not heavy, and it is the heaviest thing you own.',
  'story.s.the-box.mate': '“I kept the bit of banner you threw away. Have it back.”', 'story.s.the-box.kiosk': '“Your first coin, the bent one. I never spent it. Here.”', 'story.s.the-box.neighbour': '“A photo. You on my balcony, radio on. You didn’t know I took it.”', 'story.s.the-box.dad-first': '“A ticket, a button off a coat, and a programme with the corner chewed. That was all. That was plenty.”', 'story.s.the-box.dad': '“That is a childhood in there. Look after it.”',

  /* small jobs */
  'story.m.old-photo.title': 'The Old Photo', 'story.m.old-photo.offer': '“There’s a photo on the shelf by the door. Have a look, then ask me.”', 'story.m.old-photo.again': '“On the shelf. Go on.”', 'story.m.old-photo.done': '“That was me. Younger than you are now.”',
  'story.m.old-photo.a.look': 'Go and look', 'story.m.old-photo.aftermath': 'A small boy on big shoulders, outside the same gate.', 'story.s.old-photo.dad': '“My first time. I don’t remember the match. I remember the shoulders.”',
  'story.m.lost-ball.title': 'The Lost Ball', 'story.m.lost-ball.offer': '“The ball went over. Again. It’s somewhere between here and the corner.”', 'story.m.lost-ball.again': '“No ball, no game.”', 'story.m.lost-ball.done': '“Right. You’re in goal.”',
  'story.m.lost-ball.a.search': 'Search from the pitch to the corner', 'story.m.lost-ball.a.ask': 'Ask {neighbour}, she sees everything', 'story.m.lost-ball.aftermath': 'It was in a doorway the whole time.', 'story.s.lost-ball.neighbour': '“Behind the bins at the corner. I watched it roll.”', 'story.s.lost-ball.mate': '“Found it? You’re still in goal.”',
  'story.m.pay-back.title': 'Square with the Kiosk', 'story.m.pay-back.offer': '“You still owe me one. I haven’t forgotten, I just haven’t said.”', 'story.m.pay-back.again': '“One coin. Or ten minutes of work.”', 'story.m.pay-back.done': '“Square. I knew you were good for it.”',
  'story.m.pay-back.a.coin': 'Bring the coin from your tin', 'story.m.pay-back.a.work': 'Work it off behind the counter', 'story.m.pay-back.aftermath': 'Nothing owed on this street.', 'story.s.pay-back.kiosk': '“There. Now we can both stop thinking about it.”',
  'story.m.radio-aerial.title': 'The Aerial', 'story.m.radio-aerial.offer': '“My radio crackles the moment anything happens. Every time. Could you look at the aerial?”', 'story.m.radio-aerial.again': '“Still crackling.”', 'story.m.radio-aerial.done': '“Clear as a bell. Here, for your tin.”',
  'story.m.radio-aerial.a.fix': 'Tape it up yourself', 'story.m.radio-aerial.a.swap': 'Ask Dad, he has a spare', 'story.m.radio-aerial.aftermath': 'She can hear every word now, and so can the landing.', 'story.s.radio-aerial.dad': '“The spare is in the drawer. Tell her it’s a loan she never has to return.”', 'story.s.radio-aerial.neighbour': '“Listen to that. Lovely.”',
  /* the week's standing work */
  'story.m.papers.title': 'The Papers', 'story.m.papers.offer': '“Papers need taking round before the street wakes up. There’s a coin or two in it.”', 'story.m.papers.again': '“Papers. Before they’re old news.”', 'story.m.papers.done': '“Same time tomorrow if you want it.”',
  'story.m.papers.a.round': 'Do the round', 'story.m.papers.a.counter': 'Help behind the counter instead', 'story.m.papers.aftermath': 'Ink on your fingers and something in your pocket.', 'story.s.papers.kiosk': '“Back page first, I know, I know. Everyone reads it that way.”',
  'story.m.kickabout.title': 'Kickabout', 'story.m.kickabout.offer': '“We’re one short at the pitch. We’re always one short.”', 'story.m.kickabout.again': '“Pitch. Now. Bring yourself.”', 'story.m.kickabout.done': '“Next goal wins. It’s always next goal wins.”',
  'story.m.kickabout.a.play': 'Go and play', 'story.m.kickabout.a.bring-all': 'Round up the school gate first', 'story.m.kickabout.aftermath': 'Dark before anyone admits it is.', 'story.s.kickabout.mate': '“Jumpers down. You’re on my side.”',
  'story.m.radio-check.title': 'Radio Check', 'story.m.radio-check.offer': '“Matchday’s coming. I want that radio working before it does.”', 'story.m.radio-check.again': '“The radio. Humour me.”', 'story.m.radio-check.done': '“There. Ready when they are.”',
  'story.m.radio-check.a.batteries': 'Fresh batteries from the kiosk', 'story.m.radio-check.a.listen': 'Sit and tune it with him', 'story.m.radio-check.aftermath': 'It crackles, then it clears.', 'story.s.radio-check.dad': '“Hear the crowd under the talking? That’s what I’m listening for.”',
} as const

export type StoryKey = keyof typeof EN
/** childhood's words and the rest of the life's (`arc-words.ts`), one table */
export const STORY_WORDS: Record<string, string> = {...ARC_WORDS, ...FEEL_WORDS, ...EN}

export function storyWord(key: StoryKey | string, vars: Record<string, string> = {}): string {
  const s = STORY_WORDS[key] ?? key
  return s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`)
}
