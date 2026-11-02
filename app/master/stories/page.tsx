import type {Metadata} from 'next'
import {requireAdmin} from '@/lib/master/admin'
import {StoriesDesk} from './stories-desk'
export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Football Stories studio',robots:{index:false,follow:false}}
/** The owner's documentary studio: behind the control-room login (fails closed without FAN_LIFE_ADMIN_KEY in production). */
export default function StoriesPage(){requireAdmin('/master/stories');return <StoriesDesk/>}
