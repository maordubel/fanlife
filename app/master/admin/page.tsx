import {Shell} from '@/components/master/Shell'
import {ClubGaps} from '@/components/master/ClubGaps'
import {Admin} from '@/components/master/Admin'
import {readState} from '@/lib/master/store'
import {requireOpenEvaluation} from '@/lib/master/request'
export const dynamic='force-dynamic'
export default async function Page(){requireOpenEvaluation();return <Shell><main id="main"><nav className="mag-adminnav" aria-label="Control room sections"><a href="#gaps">What is missing</a><a href="#controls">Controls</a><a href="/master/core">Club data</a><a href="/master/test-lab">Test lab</a></nav><ClubGaps/><div id="controls"><Admin initial={await readState()}/></div></main></Shell>}
