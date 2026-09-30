import {Shell} from '@/components/master/Shell'
import {Admin} from '@/components/master/Admin'
import {readState} from '@/lib/master/store'
import {requireOpenEvaluation} from '@/lib/master/request'
export const dynamic='force-dynamic'
export default async function Page(){requireOpenEvaluation();return <Shell><main id="main"><Admin initial={await readState()}/></main></Shell>}
