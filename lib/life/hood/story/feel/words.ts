/**
 * LIFE · the hood — every word the FEEL pass prints (English; merged into `STORY_WORDS`).
 *
 * Authored fiction only, club-agnostic: no club, no date, no score, no real person. The inner voice is HIS: first person,
 * warm, a little funny, short. `{name}` is his name, `{nick}` the name his mate gave him, `{mate}` / `{kiosk}` /
 * `{neighbour}` the club cast's first names, `{n}` / `{money}` an amount in the era's money, `{left}` a clock.
 */
export const FEEL_WORDS: Record<string, string> = {
  /* the cold open: two lines, then Dad, then you */
  'feel.open.1': 'A Saturday. The street smells of hot tarmac and somebody’s dinner.',
  'feel.open.2': 'Dad is on the front step, shaking the radio like it owes him money.',
  'story.talk.other': 'Something else?',

  /* the ticking reasons */
  'feel.clock.kickoff': 'Kick-off in {left}', 'feel.clock.curfew': 'Home before Mum notices · {left}', 'feel.clock.last-bus': 'Last bus in {left}',
  'feel.clock.kiosk-shuts': 'The kiosk shuts in {left}', 'feel.clock.bell': 'The bell goes in {left}', 'feel.clock.dark': 'Dark in {left}',
  'feel.clock.gates': 'The gates shut in {left}', 'feel.clock.tea': 'Tea’s on the table in {left}',
  'feel.clock.late': 'Late. It happens.', 'feel.clock.label': 'The clock',
  'feel.promise': '{who} by {left}', 'feel.promise.kept': '{who}: kept', 'feel.promise.broke': '{who}: late',
  'feel.watch.on': 'Somebody’s watching. Walk, don’t run.', 'feel.watch.seen': 'Seen.',
  'feel.carry.on': 'Carrying. No running.', 'feel.carry.knock': 'Careful — that nearly went.', 'feel.carry.spilt': 'Spilt some.',
  'feel.find.hint': 'Look around. Stand still and press talk to search.', 'feel.find.search': 'Search here', 'feel.find.found': 'Found it!',
  'feel.find.hot': 'Close. Really close.', 'feel.find.warm': 'Somewhere round here.', 'feel.find.cold': 'Not here. Keep looking.',
  'feel.heart': 'Heart', 'feel.heart.label': 'How much the club is yours',

  /* the challenges' notes, in his own head */
  'feel.n.warn': 'Not much time. Move.', 'feel.n.late': 'Too late for the start. Never mind — I’m still going.',
  'feel.n.seen': 'He saw me. Fine. The long way round, then.', 'feel.n.knock': 'Whoa. Steady.', 'feel.n.spilt': 'Some of it’s gone. Don’t tell anyone.',
  'feel.n.chant': 'A knot of people singing. I sing too, and my legs find a bit more.', 'feel.n.found': 'There you are!', 'feel.n.kept': 'Made it to {who} in time.', 'feel.n.broke': 'Late for {who}. I’ll make it up.',

  /* SPEND: the coins in his pocket (prices in the era's money) */
  'feel.spend.monday-colours.badges.line': '“Badges are {p0} the pair. Or one for {p1}, if you’re skint.”',
  'feel.spend.monday-colours.badges.two': 'Both badges ({p0})', 'feel.spend.monday-colours.badges.one': 'Just the one, keep a coin ({p1})',
  'feel.spend.her-seat.sandwiches.line': '“Two rolls for {p0}. Or a roll and a fizzy drink for her, {p1}.”',
  'feel.spend.her-seat.sandwiches.two': 'Two rolls ({p0})', 'feel.spend.her-seat.sandwiches.one-and-drink': 'A roll and a drink for her ({p1})',
  'feel.spend.lead-the-way.sweets.line': '“Sweets for the little one, {p0}? There’s a programme too, {p1}.”',
  'feel.spend.lead-the-way.sweets.sweets': 'Just the sweets ({p0})', 'feel.spend.lead-the-way.sweets.programme': 'The programme as well ({p1})',

  /* BARGAIN */
  'feel.bargain.price': '“That’s the price. Same as yesterday, same as tomorrow.”',
  'feel.bargain.cheek': 'Offer half', 'feel.bargain.fair': 'Offer a fair bit less', 'feel.bargain.pay': 'Pay the price',
  'feel.bargain.no': '“Half? Cheeky. Try again.”', 'feel.bargain.ok': '“Go on, then. Don’t tell the others.”', 'feel.bargain.thanks': '“Good lad. You’ll go far.”',

  /* the shortcut that opens as he grows */
  'feel.bus.line': 'The bus to the ground is at the stop, doors open. The fare is {money}.',
  'feel.bus.take': 'Jump on ({money})', 'feel.bus.run': 'Run it', 'feel.bus.ride': 'Three stops. Scarves out of every window.',

  /* the inner voice: childhood */
  'feel.v.first-noise.accept': 'Kick-off soon and the radio’s dead. This is the most important job in the world.',
  'feel.v.first-noise.clean': 'It crackles, and then a roar comes out of it. I didn’t know a box could do that.',
  'feel.v.first-noise.slip': 'We missed the start. Dad didn’t mind. I minded.',
  'feel.v.six-short.accept': 'Six short for the shirt. Six! I can do six.',
  'feel.v.six-short.clean': 'It’s too big. It’s perfect.',
  'feel.v.six-short.slip': 'Not the way I planned it. Still mine.',
  'feel.v.the-way-in.accept': 'Inside. Today I go inside.',
  'feel.v.the-way-in.clean': 'It’s louder than the radio. It’s louder than anything.',
  'feel.v.the-way-in.slip': 'We were late through the gate. The noise hit me in the stairs.',
  'feel.v.monday-colours.accept': 'Everyone will see. Good.',
  'feel.v.the-window.accept': 'It was one ball. One window. One very long afternoon.',
  'feel.v.missing-square.accept': 'One empty square. It’s been staring at me for a month.',
  'feel.v.missing-square.clean': 'Full. I don’t know what to do with my hands now.',
  'feel.v.her-seat.accept': 'Her seat, her bag, her stories. I’m in charge today.',
  'feel.v.lead-the-way.accept': 'Somebody smaller is holding my hand. So that’s how Dad felt.',
  'feel.v.the-banner.accept': 'A banner. Our banner. How hard can paint be?',
  'feel.v.the-banner.clean': 'Crooked letters, straight from the heart.',
  'feel.v.no-ticket.accept': 'No ticket. Tonight of all nights.',
  'feel.v.no-ticket.slip': 'Caught at the fence. Still heard it, though. Everyone heard it.',
  'feel.v.the-box.accept': 'A shoebox. Everything I am fits in a shoebox.',
  'feel.v.old-photo.accept': 'Dad, younger than I can imagine, on the same terrace.',
  'feel.v.lost-ball.accept': 'It went over somewhere. It’s always somewhere.',
  'feel.v.papers.accept': 'Papers before school. The street is still asleep.',
  'feel.v.kickabout.accept': 'Jumpers for posts. Nobody keeps the score but everybody knows it.',
  'feel.v.radio-check.accept': 'Dad says the radio needs checking. Dad says that every week.',
  'feel.v.eve': 'Tomorrow. I won’t sleep. I never sleep.',
  'feel.v.midweek': 'The middle of the week goes slowly. Then all at once.',
  'feel.v.stage.teen.1': 'I’m taller than the kiosk counter now. When did that happen?',
  'feel.v.stage.teen.2': 'Same street. Different me.',
  'feel.v.stage.teen.3': 'I know every crack in this pavement.',
  'feel.v.stage.young.1': 'My own money, my own key, my own Saturdays.',
  'feel.v.stage.young.2': 'Work all week. Live on matchday.',
  'feel.v.stage.young.3': 'The street got smaller. Or I didn’t notice it growing up with me.',
  'feel.v.stage.adult.1': 'I sound like Dad now. I don’t mind.',
  'feel.v.stage.adult.2': 'Somebody calls me by my old nickname and I’m twelve again.',
  'feel.v.stage.adult.3': 'Same corner. Same song. Older voice.',
  'feel.v.slip': 'Didn’t go to plan. The good stories never do.',
  'feel.v.clean': 'Done. Proper done.',

  /* callbacks: lines that remember */
  'feel.cb.dads-shirt': 'Dad’s old shirt. It still smells of his wardrobe.',
  'feel.cb.radio-next-door': 'Last time I heard it through her wall. Today I hear it for real.',
  'feel.cb.half-ticket': 'Half a ticket in the Box. The other half is somewhere in that crowd.',
  'feel.cb.square-empty': 'The album still has its empty square. I like it like that.',
  'feel.cb.square-full': 'The album’s full. I still check it every night.',
  'feel.cb.song': 'I know the song now. Every word, even the rude ones.',
  'feel.cb.seen': 'Last time somebody saw me running. Not today.',
  'feel.cb.secret-window': 'The window. Dad still doesn’t know. I think.',
  'feel.cb.box': 'The Box is under the bed. I still open it, some nights.',
  'feel.cb.took-a-hand': 'I held a small hand on that walk once. Now I’m the one with the long stride.',
  'feel.cb.owes': 'I still owe at the kiosk. They haven’t forgotten. Neither have I.',

  /* the mate calls him by the name he gave him */
  'feel.nick.kiosk-first': 'Sparks', 'feel.nick.scarf-first': 'Knot', 'feel.nick.next-door': 'Wires', 'feel.nick.none': 'Kid',
  'feel.mate.nick.1': '{mate}: “Oi, {nick}! Over here!”', 'feel.mate.nick.2': '{mate}: “{nick}! Knew you’d come.”', 'feel.mate.nick.3': '{mate}: “Took your time, {nick}.”',
  'feel.mate.named': '{mate} has a name for you now: {nick}.',

  /* juice */
  'feel.kept': 'Into the Box: {what}', 'feel.reveal': 'New on your map: {place}', 'feel.arrive': 'The ground. You can feel it in your chest before you hear it.',
  'feel.paper.kicker': 'The paper, the morning after', 'feel.paper.caption': 'In the crowd: {name}, age {age}', 'feel.paper.line': 'Dad cuts it out. It goes in the Box.',
  'feel.call': '{who} calls you over.', 'feel.home.after': 'Full time. The walk home is a blur of songs. The front door, late.',
  'story.midweek': 'Midweek', 'story.banner.midweek': 'The week flies. Matchday is close.',

  /* the recap at the end of a stage */
  'feel.recap.kicker': 'Your {stage}', 'feel.recap.title': '{name}, age {age}', 'feel.recap.ways': 'How you did it',
  'feel.recap.box': 'In the Box', 'feel.recap.people': 'Who stood by you', 'feel.recap.heart': 'Heart {n} of 100', 'feel.recap.slips': 'Things that went wrong and made a story: {n}',
  'feel.bond.dad': 'Dad', 'feel.bond.mate': '{mate}', 'feel.bond.kiosk': '{kiosk}', 'feel.bond.neighbour': '{neighbour}',

  /* the era's texture, each line only in a year its thing exists */
  'era.t.radio': 'A transistor radio on a window sill, turned up for the whole street.',
  'era.t.radio-window': 'Somebody’s radio through an open window: the build-up, the crackle, the roar.',
  'era.t.phone-box': 'A queue at the phone box. Somebody is telling his whole family the team.',
  'era.t.payphone': 'The payphone on the corner eats coins and gives nothing back.',
  'era.t.cassette': 'A cassette of the songs, wound back with a pencil.',
  'era.t.walkman': 'A big kid with headphones and a tape player on his belt, nodding along.',
  'era.t.aerial': 'Every roof has an aerial, all pointing the same way, like they’re listening too.',
  'era.t.teletext': 'Through a window, the teletext page with the scores, blinking.',
  'era.t.window': 'The ticket window at the ground: a queue, a grille, a hand counting change.',
  'era.t.paper': 'Old papers in the kiosk rack, the back pages folded outward.',
  'era.t.dish': 'A new satellite dish on the corner house, white as a plate.',
  'era.t.pager': 'Somebody’s pager goes off. He looks very important about it.',
  'era.t.text': 'A text from {mate}: “where r u”. Very short. Very {mate}.',
  'era.t.mobile': 'Somebody’s mobile plays a tune nobody asked for.',
  'era.t.smartphone': 'Half the street is filming the street.',
  'era.t.video': 'A video tape of last season, worn thin at the good bits.',
  'era.live.radio': 'The only way to hear it is the radio. You hold it to your ear and pray for the batteries.',
  'era.live.tv': 'The set in the corner shows it, a little late and a little snowy.',
  'era.live.text': 'The score arrives in a text, one goal at a time.',
  'era.live.phone': 'The phone buzzes with every goal, everyone’s phone, all at once.',
  'era.ware.papers': 'The morning papers', 'era.ware.sweets': 'Loose sweets', 'era.ware.batteries': 'Batteries', 'era.ware.cassettes': 'Blank cassettes',
  'era.ware.stickers': 'Sticker packets', 'era.ware.phonecards': 'Phone cards', 'era.ware.topup': 'Phone top-up cards',
  'story.keep.programme': 'The matchday programme',
}
