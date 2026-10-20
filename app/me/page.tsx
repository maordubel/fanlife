import { FanPage } from '@/components/fanlife/FanPage'
import { MeArea } from '@/components/fanlife/me/MeArea'
import { fl } from '@/lib/fanlife/copy'

import { meClubs } from './data'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Me', robots: { index: false, follow: false } }

/** The supporter's card, the oath, the story and the standing — The Worker's /tik for every club. */
export default async function MePage() {
  return <FanPage active="me" mast="full" spread title={fl('me.title')} sub={fl('me.sub')}><MeArea clubs={await meClubs()} /></FanPage>
}
