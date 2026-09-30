import type { Metadata } from 'next'

import { ClosetDoor } from '@/components/collector/ClosetDoor'
import { AreaSwitch } from '@/components/profile/AreaSwitch'
import { MeArea } from '@/components/profile/MeArea'
import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import { kitCatalog } from '@/lib/kit/catalog'
import { homeKits } from '@/lib/kit/seasons'
import { DEFAULT_SPEC } from '@/lib/kit/spec'
import { t } from '@/lib/i18n'
import { gateMetadata } from '@/lib/seo'

import { CardTabs } from './CardTabs'

/**
 * שער 10 — כרטיס הפועל, the identity layer of the whole gate system (brief §20).
 *
 * The card is the hero and everything else on the page is a tab under it: the standing
 * and the wall, the oath, the story, what was kept, and the details — the editor, the
 * account and the device. All of it is derived on the device from one record
 * (`lib/profile/card.ts`); what the server adds here is two things only it may know —
 * the home shirt the card wears, and how many shirts the Kit Master holds, so "kits
 * unlocked" has a real denominator instead of the 33 this page used to type.
 *
 * `screen.tik.title` still carries the tab's name, so the tab, the header and the SEO
 * title cannot drift apart.
 */
export const metadata: Metadata = gateMetadata('tik')

export default function TikPage() {
  const shirt = homeKits()[0]?.spec ?? DEFAULT_SPEC
  const kitsTotal = kitCatalog().length
  return (
    <Screen title={t('screen.tik.title')} sub={t('screen.tik.sub')}>
      {/* ONE RED WORLD §24 — two destinations: this is "אני"; "התיק שלי" is /tik/file */}
      <AreaSwitch active="me" />
      <p className="mt-stack max-w-prose font-body text-step-0 leading-relaxed text-ink">{t('tik.card.lede')}</p>
      <CardTabs shirt={shirt} kitsTotal={kitsTotal} />
      <MeArea />
      {/* the closet is the account's other half: the card is who you are, the closet is what hangs at home */}
      <ClosetDoor />
      <ReportLink />
    </Screen>
  )
}
