import {notFound} from 'next/navigation'
import {qaAllowed} from '@/lib/qa'
import {Shell} from '@/components/master/Shell'
import {ShareGallery} from './ShareGallery'

/**
 * The V3 share kit on one page: every composition in every club's colours and every format, drawn by the real
 * renderer with the real fonts, plus the composer itself. Open on a preview deployment to look at the cards;
 * `notFound()` on the live site (lib/qa.ts).
 */
export default function ShareQaPage(){
 if(!qaAllowed())notFound()
 return <Shell><ShareGallery/></Shell>
}
