import {requireAdmin} from '@/lib/master/admin'
import {StoriesDesk} from './stories-desk'
export const dynamic='force-dynamic'
export default function StoriesPage(){requireAdmin('/master/stories');return <StoriesDesk/>}
