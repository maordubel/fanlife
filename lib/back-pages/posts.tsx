import Link from 'next/link'
import type {ReactNode} from 'react'

/**
 * THE BACK PAGES (marketing plan v8, owner 14.11.2026): FAN LIFE's own articles, answering what supporters search for and
 * ending at a door that plays it. Topics come from the owner's research file (real questions asked on Reddit, 11.11.2026).
 * A post states only what the product does today — a feature that is not live is not promised (plan v8 §5.3).
 * Each post is a pillar of one cluster; `cluster` and `topics` (numbers in the owner's file) keep the map honest.
 */
export type BackPage = {
 slug: string
 title: string
 /** ≤ 160 characters: the search result's line */
 description: string
 kicker: string
 lede: string
 published: string
 updated: string
 cluster: string
 topics: number[]
 /** the door the post ends at */
 cta: {href: string; label: string}
 body: () => ReactNode
}

export const BACK_PAGES: BackPage[] = [
 {
  slug: 'free-football-games-in-your-browser',
  title: 'Free Football Games You Can Play in Your Browser — No Download',
  description: 'Football trivia, line-up puzzles, kit games and a daily round for two, built from each club\'s real history. Free, in the browser, no account.',
  kicker: 'The Back Pages · Games',
  lede: 'You want a football game for the five minutes you have, on the phone you already hold, without installing anything. Here is what that looks like when every question comes from a club\'s own records.',
  published: '2026-11-14',
  updated: '2026-11-14',
  cluster: 'daily-browser-games',
  topics: [1, 2, 4, 9, 16, 26, 31, 40],
  cta: {href: '/our-games', label: 'Pick your club and play'},
  body: () => <>
   <h2>The short answer</h2>
   <p>FAN LIFE is a free football site that runs in any browser, on a phone or a computer. You choose your club and walk in through thirteen gates — trivia, an all-time XI, historical line-ups, a kit builder, a memory board, a timeline, a derby wall and more. Nothing needs to be installed and nothing needs an account.</p>
   <h2>What makes it different from a random quiz site</h2>
   <p>Every question, shirt and date inside a club&rsquo;s gates comes from that club&rsquo;s own sourced records. A round about one club never borrows a fact from another, and a gate opens only when there is enough checked material to play it properly. That is why a five-minute round still teaches you something you did not know about your own club.</p>
   <h2>Games that fit the time you have</h2>
   <ul>
    <li><b>Two minutes:</b> a trivia round or a memory board.</li>
    <li><b>Five minutes:</b> rebuild a historical line-up or design a shirt in the kit builder.</li>
    <li><b>A coffee break:</b> pick your club&rsquo;s all-time XI and argue about it with a friend.</li>
    <li><b>A long evening:</b> draft seventeen legends in <Link href="/all-football/legends">Legends Manager</Link> and run the club season after season.</li>
   </ul>
   <p>Every one of these is inside your club: <Link href="/today">pick your club</Link> and the gates open in English.</p>
   <h2>A round for two, every day</h2>
   <p><Link href="/today">Today&rsquo;s page</Link> gives every club a round for two: the same questions for both of you, so you can compare scores at the end. It works across devices — send the link and play it on your own phone.</p>
   <h2>Can you play at work or at school?</h2>
   <p>It is an ordinary web page, so it opens wherever a browser does, and a round is short enough to finish before anyone notices. If you like it, add it to your home screen: each club can be installed like an app.</p>
  </>,
 },
 {
  slug: 'football-trivia-questions-by-club',
  title: 'Football Trivia Questions by Club — Easy to Expert',
  description: 'Football trivia built from each club\'s real archive, in four levels from Easy to Expert. Play alone, against a friend, or as a game night with the family.',
  kicker: 'The Back Pages · Trivia',
  lede: 'Generic football quizzes run out fast and repeat the same ten famous moments. Club trivia built from the archive does not — and it works for the casual fan and the know-it-all at the same table.',
  published: '2026-11-14',
  updated: '2026-11-14',
  cluster: 'trivia-game-nights',
  topics: [7, 12, 23, 27, 32, 35],
  cta: {href: '/today', label: 'Pick your club and start a round'},
  body: () => <>
   <h2>Four levels, one game</h2>
   <p>Every FAN LIFE trivia round has four levels, from Easy to Expert. The questions about last season and the questions about the eighties sit in the same game, so a fifteen-year-old and the father who took him to his first match can play the same round and both be challenged.</p>
   <h2>Where the questions come from</h2>
   <p>Each question is generated from a club&rsquo;s sourced archive — matches, scorers, line-ups, kits and dates. A fact with an open conflict between two sources is not used as an answer. That is the difference between a quiz you trust and a quiz you argue with for the wrong reasons.</p>
   <h2>Easy questions for casual fans</h2>
   <p>Easy rounds ask about the club&rsquo;s big nights, its ground and its best-known names. They are the right place to start if you support the club but do not collect statistics.</p>
   <h2>Hard questions for competitive players</h2>
   <p>Expert rounds go into exact dates, line-ups and the seasons nobody remembers. If you want harder still, <Link href="/all-football">ALL FOOTBALL</Link> mixes questions from every published club.</p>
   <h2>Running a football game night</h2>
   <ol>
    <li>Open <Link href="/today">today&rsquo;s page</Link> and choose the club everyone supports — or the one everyone argues about.</li>
    <li>Everyone plays the same round for two on their own phone.</li>
    <li>Compare scores, then settle ties with the club&rsquo;s timeline gate: put the dates in order, fastest wins.</li>
   </ol>
   <h2>Ice-breakers for football fans</h2>
   <p>Good ice-breakers have a short answer and a long story: <i>Who was the first player whose shirt you owned? Which away ground would you go back to? Which match would you watch again from the stand, not on television?</i> Every club&rsquo;s terrace vote asks questions like these.</p>
  </>,
 },
 {
  slug: 'football-games-without-loot-boxes',
  title: 'Football Games Without Loot Boxes or Packs',
  description: 'Looking for a football game with no packs to open and nothing to buy to win? FAN LIFE\'s games are free, need no account and never sell an advantage.',
  kicker: 'The Back Pages · Fair play',
  lede: 'Many football games are built around opening packs: you pay, you hope, you pay again. Parents ask for something different, and so do adults who are tired of it.',
  published: '2026-11-14',
  updated: '2026-11-14',
  cluster: 'family-fair-play',
  topics: [17, 19, 20, 35],
  cta: {href: '/our-games', label: 'See the games'},
  body: () => <>
   <h2>The short answer</h2>
   <p>FAN LIFE&rsquo;s games have no packs, no loot boxes and nothing to buy to win. Every gate is free, and nothing needs an account. What you know about your club is the only advantage there is.</p>
   <h2>Collecting without gambling</h2>
   <p>Each club&rsquo;s shirt collection is drawn from real kits with a sourced season, and you collect them by playing, not by paying. Your closet can also hold the real shirts you own — a record of a collection, not a random draw.</p>
   <h2>Ratings that come from careers, not purchases</h2>
   <p>In Royal Rumble and <Link href="/all-football/legends">Legends Manager</Link>, a player&rsquo;s strength comes from his recorded career span and goals. Nobody can buy a better version of a legend.</p>
   <h2>A family game night that is about football</h2>
   <p>Four trivia levels mean a child and a grandparent can play the same round. For the youngest supporters there are the <a href="https://www.youtube.com/@FanLifeFootballStories">Football Fairy Tales</a> — short animated stories about a club&rsquo;s legends, for the morning and for bedtime.</p>
  </>,
 },
 {
  slug: 'football-manager-game-with-your-club-legends',
  title: 'A Football Manager Game Built From Your Club\'s Legends',
  description: 'Legends Manager: draft seventeen players from one club\'s whole history, take the board\'s money and run the side season after season. Free, in the browser.',
  kicker: 'The Back Pages · Manager',
  lede: 'Most management games hand you today\'s squad. This one hands you every man who ever wore your club\'s shirt, and asks you to build a dynasty out of them.',
  published: '2026-11-15',
  updated: '2026-11-15',
  cluster: 'manager-fantasy',
  topics: [11, 14, 18, 24, 33, 38],
  cta: {href: '/all-football/legends', label: 'Choose your club in Legends Manager'},
  body: () => <>
   <h2>The short answer</h2>
   <p><Link href="/all-football/legends">Legends Manager</Link> is a free football management game in the browser. You choose one club, draft seventeen players from its whole history, take the board&rsquo;s money and run the side season after season: the transfer windows, the team sheet, the touchline and the table.</p>
   <h2>Only the men who wore the shirt</h2>
   <p>Every player in your draft played for the club you chose. A club opens for new careers only when a full draft of seventeen fits its own price list, so the squad you build is always a real piece of that club&rsquo;s history.</p>
   <h2>Why it is not a pack game</h2>
   <p>A player&rsquo;s strength comes from his recorded career, not from a card you bought. Nobody can pay for a better version of a legend; the only edge is knowing your club.</p>
   <h2>Draft ideas to argue about</h2>
   <ul>
    <li>Only one decade: can the eighties beat the two-thousands?</li>
    <li>Only home-grown players.</li>
    <li>The cheapest squad that still wins the league.</li>
   </ul>
  </>,
 },
 {
  slug: 'football-kit-history-by-club',
  title: 'Football Kit History by Club: Every Shirt, Maker and Sponsor',
  description: 'Look up any season\'s shirt — maker, sponsor and design — in each club\'s kit archive on FAN LIFE, then design your own in the kit builder.',
  kicker: 'The Back Pages · Kits',
  lede: 'The first thing a supporter remembers about a season is often the shirt. A kit archive answers the question every collector asks: what did we wear that year, and who made it?',
  published: '2026-11-16',
  updated: '2026-11-16',
  cluster: 'kits-collectors',
  topics: [17],
  cta: {href: '/today', label: 'Pick your club and open its kits'},
  body: () => <>
   <h2>The short answer</h2>
   <p>Every club on FAN LIFE has a shirt collection drawn from its sourced kit records: the season, the maker and the design. Where a photograph has been cleared it sits beside the drawing; where it has not, the drawing comes from the recorded details alone.</p>
   <h2>Where to find your club&rsquo;s shirts</h2>
   <ul>
    <li><Link href="/clubs/celtic/kits">Celtic</Link> · <Link href="/clubs/olympiacos/kits">Olympiacos</Link> · <Link href="/clubs/panathinaikos/kits">Panathinaikos</Link> · <Link href="/clubs/aek-athens/kits">AEK Athens</Link> · <Link href="/clubs/st-pauli/kits">FC St. Pauli</Link></li>
    <li>Every other published club: <Link href="/today">pick your club</Link>, then open its kits.</li>
   </ul>
   <h2>Design one yourself</h2>
   <p>Each club also has a kit builder: put together a shirt from the club&rsquo;s recorded kits and see how close you get to a real season.</p>
   <h2>Do you own the real thing?</h2>
   <p>Your closet on FAN LIFE records the shirts you really own, so other supporters can see which seasons are in collectors&rsquo; hands and which are still missing.</p>
  </>,
 },
 {
  slug: 'how-to-get-better-at-daily-football-puzzles',
  title: 'How to Get Better at Daily Football Puzzles',
  description: 'Five habits that raise your score in daily football trivia, line-up and timeline puzzles — and why playing your own club first is the fastest way to learn.',
  kicker: 'The Back Pages · Tips',
  lede: 'Daily puzzles reward the same thing every day: knowing where a fact sits in time. These habits help, whether you play for two minutes or twenty.',
  published: '2026-11-17',
  updated: '2026-11-17',
  cluster: 'daily-browser-games',
  topics: [37, 39, 15, 30],
  cta: {href: '/today', label: 'Play today\'s round'},
  body: () => <>
   <h2>1. Start with your own club</h2>
   <p>You already carry decades of its history without knowing it. Rounds built from your club&rsquo;s archive turn that into points fastest.</p>
   <h2>2. Anchor every answer to a season</h2>
   <p>When you are unsure, place the question in time first: which manager, which ground, which shirt sponsor. The timeline gate trains exactly this.</p>
   <h2>3. Read the wrong answers</h2>
   <p>Every round shows what was right. The answers you missed are tomorrow&rsquo;s questions in a different form.</p>
   <h2>4. Move up a level only when Easy feels easy</h2>
   <p>Trivia has four levels, from Easy to Expert. Expert questions use exact dates and line-ups; they are much easier once the big nights are second nature.</p>
   <h2>5. Play with someone</h2>
   <p><Link href="/today">Today&rsquo;s round for two</Link> gives both players the same questions. Arguing about an answer afterwards is how it sticks.</p>
  </>,
 },
 {
  slug: 'football-derby-head-to-head-history',
  title: 'Football Derby History: Every Meeting on the Wall',
  description: 'Each club\'s derby gate on FAN LIFE reads every meeting with its rival that the archives record. Here is how it works and where to find yours.',
  kicker: 'The Back Pages · Derbies',
  lede: 'A derby is remembered in single nights, but argued about in totals. Who leads the head to head, and since when?',
  published: '2026-11-18',
  updated: '2026-11-18',
  cluster: 'club-history',
  topics: [12, 27],
  cta: {href: '/today', label: 'Pick your club and open its derby'},
  body: () => <>
   <h2>The short answer</h2>
   <p>Every club on FAN LIFE has a derby gate built around one rival chosen by a person, not by an algorithm. The wall reads every meeting between the two clubs that the archives record, with its date, score and competition.</p>
   <h2>Why the record matters</h2>
   <p>Head-to-head totals online often disagree, because they count different competitions or skip friendlies. On FAN LIFE every meeting carries its source, and a meeting with an open conflict between two sources is marked rather than quietly settled.</p>
   <h2>Where to find yours</h2>
   <p><Link href="/today">Pick your club</Link>, open its games and choose the derby. The same rivalries run through our films on <a href="https://www.youtube.com/@FanLifeFootballStories">Football Stories</a>.</p>
  </>,
 },
 {
  slug: 'football-bedtime-stories-for-kids',
  title: 'Football Bedtime Stories for Kids: Football Fairy Tales',
  description: 'Short animated stories about a club\'s legends and stadiums, made for the morning and for bedtime — in English and in the club\'s own language.',
  kicker: 'The Back Pages · Family',
  lede: 'The club is usually handed down at home, long before the first match. Football Fairy Tales are short animated stories made for that moment.',
  published: '2026-11-21',
  updated: '2026-11-21',
  cluster: 'family-fair-play',
  topics: [19, 35],
  cta: {href: '/back-pages/football-trivia-questions-by-club', label: 'Family trivia for when they are older'},
  body: () => <>
   <h2>The short answer</h2>
   <p>Football Fairy Tales is a series on the <a href="https://www.youtube.com/@FanLifeFootballStories">FanLife: Football Stories</a> channel. Each club gets a Good Morning episode — bright, fast, a pop-up cartoon — and a Good Night episode — a slow comic-book story for bedtime.</p>
   <h2>What is in an episode</h2>
   <ul>
    <li>The club&rsquo;s stadium, drawn as close to the real ground as we can.</li>
    <li>Its legends and its biggest nights, told as a story.</li>
    <li>Little call-and-response moments: count the leaves of a shamrock, show seven fingers.</li>
   </ul>
   <h2>Languages</h2>
   <p>Every club&rsquo;s episodes come in English and, where the club has one, in its own language, each in its own playlist.</p>
  </>,
 },
 {
  slug: 'football-games-to-play-with-friends',
  title: 'Football Games You Can Play Against Friends',
  description: 'Same questions, different phones: how to challenge a friend in football trivia, line-ups and drafts on FAN LIFE, with no account and no download.',
  kicker: 'The Back Pages · Friends',
  lede: 'The best football argument ends with a score. Here is how to turn one into a game in under a minute.',
  published: '2026-11-20',
  updated: '2026-11-20',
  cluster: 'leaderboards-friends',
  topics: [5, 36, 13],
  cta: {href: '/today', label: 'Start a round for two'},
  body: () => <>
   <h2>The fastest way: a round for two</h2>
   <p>Open <Link href="/today">today&rsquo;s page</Link>, choose a club and send the same link to your friend. You both get the same questions; compare scores at the end. No account, no download.</p>
   <h2>Draft against each other</h2>
   <p>Pick the same club in <Link href="/all-football/legends">Legends Manager</Link>, draft seventeen legends each and compare your first season&rsquo;s table.</p>
   <h2>Settle it with an all-time XI</h2>
   <p>Each club&rsquo;s all-time XI gate gives you eleven places and a whole history to fill them from. Build yours, share it, and let the comments decide.</p>
  </>,
 },
 {
  slug: 'open-world-football-fan-game',
  title: 'LIFE: An Open-World Football Fan Game, Coming Soon',
  description: 'LIFE is the open world of football fans: your club\'s city, matchday missions and a supporter\'s whole life. In build now, coming soon to FAN LIFE.',
  kicker: 'The Back Pages · Coming soon',
  lede: 'This week the whole gaming world is talking about open worlds. Football supporters have never had one of their own. We are building it.',
  published: '2026-11-19',
  updated: '2026-11-19',
  cluster: 'manager-fantasy',
  topics: [24, 39],
  cta: {href: '/our-games', label: 'See LIFE and the games you can play now'},
  body: () => <>
   <h2>What LIFE is</h2>
   <p>LIFE is a supporter&rsquo;s life as a game. You start at your first match and live the seasons that follow: the streets around your ground, the friends you go with, the promises you make and the choices that change the story.</p>
   <h2>Two ways to play</h2>
   <p>Everyday life moves at its own pace. A mission changes the tempo: get across the city before kick-off, find what was lost before the gates open, be there on the night everyone will talk about. Every club gets its own city and its own missions, tied to its real history.</p>
   <h2>When</h2>
   <p>LIFE is in build. It will open free, in the browser, on FAN LIFE. Until then, every club&rsquo;s thirteen gates and <Link href="/all-football/legends">Legends Manager</Link> are open now.</p>
   <p><i>LIFE is an original FAN LIFE game. It is not affiliated with, or endorsed by, any other game publisher.</i></p>
  </>,
 },
]

/** Today in Athens (YYYY-MM-DD): a post scheduled for a later day is not published yet (plan v8: one a day). */
export const athensToday = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Athens'}).format(now)
export const isLive = (p: BackPage, now = new Date()) => p.published <= athensToday(now)
export const liveBackPages = (now = new Date()) => BACK_PAGES.filter((p) => isLive(p, now))
export const backPage = (slug: string, now = new Date()) => liveBackPages(now).find((p) => p.slug === slug) ?? null
