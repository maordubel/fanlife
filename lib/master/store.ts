import 'server-only'
import {mkdir,readFile,rename,writeFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import path from 'node:path'
import {createHash} from 'node:crypto'
import type {State,Finding,AuditEntry} from './types'
import {seedState} from './seed'
const root=()=>path.resolve(process.env.FAN_LIFE_DATA_DIR||'.fan-life')
const globals=globalThis as typeof globalThis & {fanWrites?:Promise<unknown>}
function withRegistry(s:State):State{const have=new Set(s.clubs.map(c=>c.id));const add=seedState().clubs.filter(c=>!have.has(c.id));return add.length?{...s,clubs:[...s.clubs,...add]}:s}
export const findingId=(f:Pick<Finding,'field'|'value'|'sources'>)=>'f-'+createHash('sha256').update(JSON.stringify([f.field,f.value,[...f.sources].sort()])).digest('hex').slice(0,16)
export const contentHash=(text:string)=>createHash('sha256').update(text).digest('hex').slice(0,24)
/** Older control files have findings without ids; give them their stable id on read. */
function withIds(s:State):State{for(const c of s.clubs)for(const f of c.findings){f.id??=findingId(f);if(f.approved&&!f.decision)f.decision='approved'}return s}
export async function readState():Promise<State>{try{return withIds(withRegistry(JSON.parse(await readFile(path.join(root(),'control.json'),'utf8'))))}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return seedState();throw e}}
export function mutate<T>(fn:(s:State)=>T):Promise<T>{const op=(globals.fanWrites||Promise.resolve()).then(async()=>{const s=await readState();const result=fn(s);s.revision++;s.audit=s.audit.slice(-1000);await mkdir(root(),{recursive:true});const temp=path.join(root(),`${randomUUID()}.tmp`);await writeFile(temp,JSON.stringify(s),{mode:0o600});await rename(temp,path.join(root(),'control.json'));return result});globals.fanWrites=op.catch(()=>undefined);return op}
export const EVALUATION_ACTOR='evaluator:open-evaluation'
export function audit(s:State,action:string,target:string,detail='',extra:Partial<Pick<AuditEntry,'actor'|'before'|'after'|'reason'>>={}){s.audit.push({at:new Date().toISOString(),action,target,detail,actor:extra.actor||EVALUATION_ACTOR,...extra})}
