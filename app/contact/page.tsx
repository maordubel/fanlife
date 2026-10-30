import Link from 'next/link'
import type {Metadata} from 'next'
import {CONTACT_EMAIL,DocShell,GAMES_URL} from '@/components/master/DocShell'
import {SITE_URL} from '@/lib/brand'

export const metadata:Metadata={
 title:'Contact',
 description:'How to reach the FAN LIFE team: report a wrong fact with a source, suggest a club, ask about your data or say hello.',
 alternates:{canonical:`${SITE_URL}/contact`},
}

/** /contact (ADSENSE-APPROVAL §3): a working address. */
export default function Contact(){
 const mail=(subject:string)=>`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`FAN LIFE - ${subject}`)}`
 return <DocShell kicker="Letters to the editor" title="Contact" lede="FAN LIFE is made by a small team. The quickest way to reach us is by email, and every message is read by a person.">
  <h2>Write to us</h2>
  <p className="wkh-doc-mail"><a href={mail('hello')}>{CONTACT_EMAIL}</a></p>
  <p>We usually reply within a few working days.</p>
  <h2>Report a wrong fact</h2>
  <p>Seen a score, date, line-up or name that is not right? Tell us which club and which page, what you believe is correct, and — if you can — a link to a source that says so. A correction with a source is checked first and, if it holds, the game is updated. <a href={mail('data correction')}>Send a correction</a>.</p>
  <p>What makes a correction quick to check:</p>
  <ul>
   <li>the club, the gate and the exact question, card or shirt you saw;</li>
   <li>what the page says, and what you believe is right;</li>
   <li>a source we can read — a club archive, a competition's official match page, a newspaper of the time or a reference book with its page number;</li>
   <li>whether you were there, if you were — supporters' memories are welcome, and we record them as what they are.</li>
  </ul>
  <p>When two good sources disagree, we keep both and say so instead of choosing one quietly, and a fact under dispute is taken out of the quiz until it is settled.</p>
  <h2>Suggest a club</h2>
  <p>New clubs are added after their history has been researched and reviewed. If you would like to see your club on FAN LIFE, write to us with its name, and any archives, books or supporter sites you trust. <a href={mail('club suggestion')}>Suggest a club</a>.</p>
  <h2>Your data</h2>
  <p>Requests to see or delete your account data go to the same address. The <Link href="/privacy">privacy page</Link> explains what we keep and how deletion works.</p>
  <h2>More from the same team</h2>
  <p>FAN LIFE is made by Dubel Team. You can find the rest of our games at <a href={GAMES_URL}>dubelteam.com/games</a>, and read more about this site on the <Link href="/about">about page</Link>.</p>
 </DocShell>
}
