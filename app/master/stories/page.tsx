import type {Metadata} from 'next'
import {redirect} from 'next/navigation'
import {requireAdmin} from '@/lib/master/admin'
export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Football Stories studio',robots:{index:false,follow:false}}
/** The studio is an area of the desk (`/master/admin?section=studio`, 4.11.2026); old links land there. */
export default function StoriesPage(){
 requireAdmin('/master/stories')
 redirect('/master/admin?section=studio')
}
