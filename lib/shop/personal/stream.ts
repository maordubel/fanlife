/**
 * A LONG ANSWER THAT DOES NOT TIME OUT (16.11.2026, owner: "personal prints load for a long time and fail").
 * Making a print at the printer takes about two minutes; Cloudflare closes a request whose answer has not started within 100 s
 * (a 524), so the supporter saw a failure while the product was in fact made. A quick answer (a proof, a refusal) goes out as it
 * is, with its own status. A slow one starts a stream after a few seconds: a space every 10 s keeps the line open and the JSON
 * follows when the work is done (JSON allows the leading spaces). That stream's status is 200 — the body's `error` says whether
 * it worked, which is what the client reads.
 */
export async function streamed(work:()=>Promise<Response>,waitMs=4000):Promise<Response>{
 const job=work().catch(e=>new Response(JSON.stringify({error:String((e as Error)?.message||e).slice(0,200)}),{status:502,headers:{'content-type':'application/json'}}))
 const quick=await Promise.race([job,new Promise<null>(r=>setTimeout(()=>r(null),waitMs))])
 if(quick)return quick
 const enc=new TextEncoder()
 const body=new ReadableStream<Uint8Array>({async start(c){
  c.enqueue(enc.encode(' '));const beat=setInterval(()=>{try{c.enqueue(enc.encode(' '))}catch{/* closed */}},10e3)
  try{const r=await job,t=await r.text();c.enqueue(enc.encode(r.ok||/"error"/.test(t)?t:JSON.stringify({error:'Something went wrong — try again in a minute.'})))}
  finally{clearInterval(beat);c.close()}}})
 return new Response(body,{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-accel-buffering':'no'}})
}
