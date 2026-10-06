import type {Source,Finding,Job} from '../types'
/**
 * Research adapter = collector → parser → normalizer, producing REVIEW material only.
 * An adapter never approves, never writes generated JSON, never invents a field it could not read, and reports a
 * refusal (403/404) as an answer instead of retrying around it. Approval is a separate, human step.
 */
export type AdapterResult={sources:Source[];findings:Finding[];gaps?:string[]}
export type Adapter={id:string;label:string;collect:(job:Job)=>Promise<AdapterResult>}
