/**
 * Stale-response guard for the control room (audit F21). `start(scope)` begins a request and returns `isLatest()`;
 * an answer is applied only while no newer request in the same scope has started. `watch(scope)` checks against the
 * scope's current request without starting one (a per-club refresh must not overwrite a newer full refresh).
 */
export function requestGate(){
 const seq=new Map<string,number>()
 const check=(scope:string,n:number)=>()=>(seq.get(scope)||0)===n
 return {
  start(scope:string){const n=(seq.get(scope)||0)+1;seq.set(scope,n);return check(scope,n)},
  watch(scope:string){return check(scope,seq.get(scope)||0)},
 }
}
export type RequestGate=ReturnType<typeof requestGate>
