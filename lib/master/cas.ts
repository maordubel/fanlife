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
 const run=(queues.get(key)??Promise.resolve()).then(job,job)
 queues.set(key,run.catch(()=>undefined))
 return run
}

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
