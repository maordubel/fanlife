import Link from 'next/link'
import type {Metadata} from 'next'
import {DocShell,GAMES_URL} from '@/components/master/DocShell'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {readState} from '@/lib/master/store'
import {REGISTRY} from '@/lib/master/registry'
import {SITE_URL} from '@/lib/brand'
import {featuresOf} from '@/lib/features'

export const dynamic='force-dynamic'
export const metadata:Metadata={
 title:'About FAN LIFE',
 description:'What FAN LIFE is: thirteen football games for each club, built from that club\'s own sourced history, made and maintained by Dubel Team.',
 alternates:{canonical:`${SITE_URL}/about`},
}

/** /about (ADSENSE-APPROVAL §3): what it is, how it works, who makes it, how it is maintained. Clubs are read live, never typed. */
export default async function About(){
 const state=await readState().catch(()=>null)
 const f=featuresOf(state)
 const live=REGISTRY.filter(r=>state?.clubs.find(c=>c.id===r.id)?.status==='live').sort((a,b)=>a.name.localeCompare(b.name))
 return <DocShell kicker="About this paper" title="About FAN LIFE" lede="FAN LIFE is a football site where every club is a world of its own: games, an archive and a supporter's life, all built from that club's recorded history.">
  <h2>What it is</h2>
  <p>FAN LIFE treats each club as its own small app. You choose your club and walk in through thirteen gates — trivia rounds, line-up puzzles, kit games, a timeline, a living archive and more. Every question, shirt and date inside a gate comes from that club’s own records, so a round for one club never borrows a fact from another. The site is written in English; some club archives keep names and titles in the language they were published in.</p>
  <h2>The thirteen gates</h2>
  <p>Each gate is a different way into the same history. A gate opens for a club only when there is enough checked material to play it properly; until then it stays closed rather than padded with guesses.</p>
  <ol>{SHARED_GATES.map(g=><li key={g.key}><b>{g.name}</b></li>)}</ol>
  <h2>Clubs on FAN LIFE</h2>
  {live.length?<><p>These clubs are published today. Each has its own home page, history, kit archive and games:</p>
   <ul>{live.map(c=><li key={c.id}><Link href={`/clubs/${c.id}`}>{c.name}</Link> — {c.city}, {c.country}</li>)}</ul></>
   :<p>The list of published clubs is loading. You can always start from the <Link href="/">front page</Link>.</p>}
  {f.allFootball?<p>Beyond the club gates there is <Link href="/all-football">ALL FOOTBALL</Link>, which mixes questions from every published club.</p>:null}
  {f.fanLeague?<p><Link href="/all-football/legends">Legends Manager</Link> lets you run one club with only the players who wore its shirt, season after season.</p>:null}
  <h2>For every generation</h2>
  <p>A club is usually handed down: someone took you to your first match. FAN LIFE is built so that a fifteen-year-old and the father who took him can play the same thing. Every trivia round has four levels, from Easy to Expert, so the questions about last season and the questions about the eighties sit in the same game. Nothing needs an account, and a round can be shared: <Link href="/today">today’s page</Link> gives every club a round for two, the same questions for both of you, so you can compare scores at the end.</p>
  <h2>Where the facts come from</h2>
  <p>Every fact carries a source and a confidence level. Matches, scores, line-ups and kits are taken from published records — club archives, competition sites, contemporary newspapers and reference works — and cross-checked where two sources exist. When two sources disagree, the disagreement is recorded instead of quietly settled, and a fact with an open conflict is not used as a quiz answer. The full list of sources, club by club, is on the <Link href="/sources">sources &amp; credits</Link> page.</p>
  <h2>Who makes it</h2>
  <p>FAN LIFE is made by Dubel Team, an independent studio that builds football and sports games. It is not affiliated with, or endorsed by, any club, league or governing body. Club names are used to describe their history; club crests and photographs appear only where their use has been cleared. Other games by the same team are listed at <a href={GAMES_URL}>dubelteam.com/games</a>.</p>
  <h2>How it is maintained</h2>
  <p>New clubs are researched before they are published, and their records are reviewed by a person before any of them reaches a game. Existing clubs are updated as new sources are found and as errors are reported. FAN LIFE is still an open preview: some gates and features are not finished, and we say so on the page rather than hiding it. If you spot a wrong score, date or name, please tell us through the <Link href="/contact">contact page</Link> — a correction with a source is the most useful message we receive.</p>
 </DocShell>
}
