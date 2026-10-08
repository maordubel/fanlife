import type {GateView,ViewKey} from './types'
import {view as xi} from './views/xi'
import {view as trivia} from './views/trivia'
import {view as lineup} from './views/lineup'
import {view as kitBuilder} from './views/kit-builder'
import {view as kits} from './views/kits'
import {view as memory} from './views/memory'
import {view as polls} from './views/polls'
import {view as goal} from './views/goal'
import {view as royalRumble} from './views/royal-rumble'
import {view as blindCow} from './views/blind-cow'
import {view as derby} from './views/derby'
import {view as archive} from './views/archive'

/** One view per gate. Upgrading a gate = editing its file in `views/`; nothing else in the dispatcher changes. */
export const GATE_VIEWS:Record<ViewKey,GateView>={xi,trivia,lineup,'kit-builder':kitBuilder,kits,memory,polls,goal,'royal-rumble':royalRumble,'blind-cow':blindCow,derby,archive}
