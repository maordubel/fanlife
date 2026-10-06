import type {PipelineStep} from '@/lib/master/summary'
const MARK:Record<PipelineStep['state'],string>={done:'Done',active:'In progress',waiting:'Waiting',blocked:'Blocked'}
/** Sources → collect → extract → stage → review → pack → publish. "Automatic" steps are moved on by the scheduled task. */
export function Pipeline({steps}:{steps:PipelineStep[]}){
 return <ol className="cr-pipeline" aria-label="Pipeline">{steps.map((s,i)=><li key={s.key} data-state={s.state}><span className="cr-step-n" aria-hidden="true">{i+1}</span><div><b>{s.label}</b> <small>{MARK[s.state]}{s.auto?' · automatic':' · a person'}</small><p>{s.detail}</p></div></li>)}</ol>
}
