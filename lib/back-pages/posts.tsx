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
    <li><b>Two minutes:</b> a <Link href="/trivia">trivia round</Link> or a <Link href="/memory">memory board</Link>.</li>
    <li><b>Five minutes:</b> rebuild a <Link href="/lineup">historical line-up</Link> or design a shirt in the <Link href="/kits/build">kit builder</Link>.</li>
    <li><b>A coffee break:</b> pick your club&rsquo;s <Link href="/xi">all-time XI</Link> and argue about it with a friend.</li>
   </ul>
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
  cta: {href: '/trivia', label: 'Start a trivia round'},
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
    <li>Compare scores, then settle ties with the club&rsquo;s <Link href="/timeline">timeline</Link>: put the dates in order, fastest wins.</li>
   </ol>
   <h2>Ice-breakers for football fans</h2>
   <p>Good ice-breakers have a short answer and a long story: <i>Who was the first player whose shirt you owned? Which away ground would you go back to? Which match would you watch again from the stand, not on television?</i> The <Link href="/polls">terrace vote</Link> asks questions like these for every club.</p>
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
   <p>The <Link href="/kits">shirt collection</Link> is drawn from real kits with a sourced season, and you collect them by playing, not by paying. Your closet can also hold the real shirts you own — a record of a collection, not a random draw.</p>
   <h2>Ratings that come from careers, not purchases</h2>
   <p>In <Link href="/royal-rumble">Royal Rumble</Link> and <Link href="/all-football/legends">Legends Manager</Link>, a player&rsquo;s strength comes from his recorded career span and goals. Nobody can buy a better version of a legend.</p>
   <h2>A family game night that is about football</h2>
   <p>Four trivia levels mean a child and a grandparent can play the same round. For the youngest supporters there are the <a href="https://www.youtube.com/@FanLifeFootballStories">Football Fairy Tales</a> — short animated stories about a club&rsquo;s legends, for the morning and for bedtime.</p>
  </>,
 },
]

export const backPage = (slug: string) => BACK_PAGES.find((p) => p.slug === slug) ?? null
