import Link from 'next/link'
import type {Metadata} from 'next'
import {DocShell} from '@/components/master/DocShell'
import {SITE_URL} from '@/lib/brand'

export const metadata:Metadata={
 title:'Terms of use',
 description:'The terms for playing FAN LIFE: free games for fun, fair play, respectful posts, independent from the clubs, and how corrections work.',
 alternates:{canonical:`${SITE_URL}/terms`},
}

/** /terms (ADSENSE-APPROVAL §3). */
export default function Terms(){
 return <DocShell kicker="The small print" title="Terms of use" lede="By using FAN LIFE you agree to these terms. They are short because the site is simple: free football games, built from history, played for fun.">
  <h2>The service</h2>
  <p>FAN LIFE is provided by Dubel Team free of charge, as an open preview. Games, clubs and features may change, pause or be removed while the site is developed. We try to keep it available and accurate, but we cannot promise that it will always be online or free of mistakes.</p>
  <h2>Playing fairly</h2>
  <p>Play with your own device and your own answers. Do not use scripts, bots or automated tools to play rounds, vote in ballots, inflate scores or load pages. Do not try to read answers that the server keeps hidden, or to break into parts of the site that are not public. We may remove scores, votes or accounts that were produced unfairly.</p>
  <h2>What you post</h2>
  <p>Some features let you choose a nickname, list a shirt or write a short message. Keep it about football and keep it respectful: no abuse, hate, threats, personal information about other people, or anything illegal. You remain responsible for what you post, and we may remove it. Shirts listed between collectors are arranged directly between them; FAN LIFE takes no fee, handles no payment and is not a party to any exchange.</p>
  <h2>Clubs, names and marks</h2>
  <p>FAN LIFE is independent and is not affiliated with, sponsored by or endorsed by any club, league or federation. Club and player names are used to describe historical facts. Crests, photographs and trademarks belong to their owners and appear only where their use has been cleared; everything else on the site — the design, the drawings and the text — belongs to Dubel Team.</p>
  <h2>Accuracy</h2>
  <p>Every fact is taken from a source listed on the <Link href="/sources">sources &amp; credits</Link> page, but sources can be wrong and so can we. FAN LIFE is for entertainment and must not be relied on for betting or any financial decision. If you find a mistake, please report it through the <Link href="/contact">contact page</Link>.</p>
  <h2>Privacy</h2>
  <p>How we handle data is explained on the <Link href="/privacy">privacy page</Link>, which forms part of these terms.</p>
  <h2>Changes</h2>
  <p>We may update these terms as the site grows. The date at the top of this page shows the latest version, and continuing to use FAN LIFE after a change means you accept it.</p>
 </DocShell>
}
