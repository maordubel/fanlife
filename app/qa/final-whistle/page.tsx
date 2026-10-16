import {notFound} from 'next/navigation'
import {qaAllowed} from '@/lib/qa'
import {Shell} from '@/components/master/Shell'
import {FinalWhistleGallery} from './Gallery'

export const metadata = {robots: {index: false, follow: false}}
/** FINAL WHISTLE cards drawn by the real renderer with the real fonts, for every outcome. `notFound()` on the live site (lib/qa.ts). */
export default function FinalWhistleQaPage() {
  if (!qaAllowed()) notFound()
  return <Shell><FinalWhistleGallery/></Shell>
}
