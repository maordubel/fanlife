import { FanPage } from '@/components/fanlife/FanPage'
import { MyFile } from '@/components/fanlife/me/MyFile'
import { fanShirtMap } from '@/lib/fanlife/catalog'
import { fl } from '@/lib/fanlife/copy'
import { shirtDateText } from '@/lib/fanlife/collector/cards'

import { meClubs } from '../data'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'My file · FAN LIFE' }

/** The Worker's "התיק שלי": what this supporter made and kept, from every club. */
export default async function FilePage() {
  const [clubs, map] = await Promise.all([meClubs(), fanShirtMap()])
  const labels = Object.fromEntries(Object.values(map).map((s) => [s.slug, { label: `${s.variantHe} · ${shirtDateText(s)}`, club: s.club }]))
  return <FanPage active="file" title={fl('file.title')} sub={fl('file.sub')}><MyFile clubs={clubs} labels={labels} /></FanPage>
}
