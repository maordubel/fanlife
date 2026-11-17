import 'server-only'

/**
 * One way to win a compare-and-swap race (owner, 11.10.2026: "conflict: the player files changed too many times" and
 * "the control room is busy" kept coming back). Three causes were hiding behind the same message:
 *  1. six retries with NO pause — two saves a few milliseconds apart collide on every attempt;
 *  2. no ordering inside one server instance — a double click, or price + positions saved together, raced each other;
 *  3. any storage error that looked like "412" was swallowed as a lost race, so the real failure never reached the screen.
 * Here: writes to one file go through a queue per instance, retries back off with jitter inside a time budget,
 * and a store error that is NOT a lost race is thrown as itself.
 */
export const CAS_BUDGET_MS=20_000
const queues=(globalThis as typeof globalThis&{fanCasQueues?:Map<string,Promise<unknown>>}).fanCasQueues??=new Map<string,Promise<unknown>>()
const pause=(attempt:number)=>new Promise<void>(r=>setTimeout(r,Math.min(1200,60*1.6**attempt)*(0.5+Math.random())))

/** Run `job` after every earlier job on the same key in this instance has finished. */
export function inOrder<T>(key:string,job:()=>Promise<T>):Promise<T>{
 // a job that never settles must not hold the lane forever (Legends, 17.11.2026: one hung store call froze a career's every
 // later move on that instance): the NEXT job waits for the one before it at most QUEUE_WAIT_MS, then goes anyway
 const prev=queues.get(key)??Promise.resolve()
 let t:ReturnType<typeof setTimeout>|undefined
 const waited=Promise.race([prev,new Promise(r=>{t=setTimeout(r,QUEUE_WAIT_MS);(t as {unref?:()=>void}).unref?.()})]).finally(()=>clearTimeout(t))
 const run=waited.then(job,job)
 queues.set(key,run.catch(()=>undefined))
 return run
}
/** the longest a queued job waits for the one before it (the store's own calls give up at 15 s) */
export const QUEUE_WAIT_MS=25_000

export class ConflictError extends Error{constructor(what:string,readonly attempts:number){super(`${what} kept changing while saving (${attempts} attempts). Someone else is saving the same file — wait a few seconds and press Save again.`);this.name='ConflictError'}}

/** `attempt` returns true when the write landed, false when it lost the race, and throws for any other failure. */
export async function untilWon(what:string,attempt:(n:number)=>Promise<boolean>,{budgetMs=CAS_BUDGET_MS,minAttempts=8}:{budgetMs?:number;minAttempts?:number}={}):Promise<void>{
 const stop=Date.now()+budgetMs
 for(let n=0;;n++){
  if(n)await pause(n)
  if(await attempt(n))return
  if(n+1>=minAttempts&&Date.now()>stop)throw new ConflictError(what,n+1)
 }
}
