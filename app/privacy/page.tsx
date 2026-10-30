import Link from 'next/link'
import type {Metadata} from 'next'
import {CONTACT_EMAIL,DocShell} from '@/components/master/DocShell'
import {SITE_URL} from '@/lib/brand'

export const metadata:Metadata={
 title:'Privacy',
 description:'What FAN LIFE stores on your device, what it measures, how accounts work and how to ask for your data to be deleted.',
 alternates:{canonical:`${SITE_URL}/privacy`},
}

/** /privacy (ADSENSE-APPROVAL §3). Describes what the code does today: components/ads/Analytics.tsx, lib/analytics, lib/ads.ts. */
export default function Privacy(){
 return <DocShell kicker="The small print" title="Privacy" lede="FAN LIFE is built to work without an account. This page explains what is kept on your device, what we measure, and how to remove it.">
  <h2>What stays on your device</h2>
  <p>Your game progress, the shirts you have collected, your saved line-ups, your terrace votes and your settings are kept in your browser’s local storage. They never leave your device unless you sign in. Clearing your browser’s site data for fanlife.dubelteam.com removes them completely.</p>
  <h2>Accounts</h2>
  <p>Signing in is optional. If you create an account, we store your account identifier and the progress you choose to sync, so that the same file follows you between devices. We do not show your email address to other users; on public pages you appear only by a nickname you choose or by an anonymous supporter number. Votes in the terrace ballot are counted without being linked to your account.</p>
  <h2>What we measure</h2>
  <p>We count page views, game starts and finishes so we can see which gates work and which do not. Our own counter stores no name, no email and no IP address; a device is recorded only as a one-way hash with a daily salt that is deleted after two days. We also use Google Analytics 4 with Google signals and ad personalisation switched off, and with advertising storage denied. If your browser sends Global Privacy Control or Do Not Track, analytics storage is denied as well and our own counter does not count you.</p>
  <h2>Advertising</h2>
  <p>FAN LIFE does not show advertising inside games, sign-in screens, error pages or empty pages. If advertising is shown on reading pages in the future — for example through Google AdSense — Google and its partners may use cookies to serve and measure ads. Visitors in the European Economic Area, the United Kingdom and Switzerland will be asked for consent first, through a consent message certified by Google, and no ad script will load before that choice. You can learn how Google uses data at <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer">policies.google.com/technologies/partner-sites</a> and manage ad personalisation at <a href="https://adssettings.google.com" rel="noopener noreferrer">adssettings.google.com</a>.</p>
  <h2>Telegram and shared links</h2>
  <p>If you open FAN LIFE inside Telegram, Telegram sends the page a signed launch message that includes your Telegram user details; we only check that the message is genuine, and it does not create a FAN LIFE account. Links you share carry only the round you played (a seed number), never who you are.</p>
  <h2>Deleting your data</h2>
  <p>To delete an account and everything synced to it, write to <a href={`mailto:${CONTACT_EMAIL}?subject=FAN%20LIFE%20-%20delete%20my%20data`}>{CONTACT_EMAIL}</a> from the address you signed in with, or include your supporter number. We act on deletion requests within thirty days and confirm by reply. Data kept only in your browser can be removed by you at any time, as described above.</p>
  <h2>Changes and contact</h2>
  <p>If this policy changes, the date at the top of the page changes with it. Questions about privacy go to the same address, or through the <Link href="/contact">contact page</Link>.</p>
 </DocShell>
}
