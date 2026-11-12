import 'server-only'
/**
 * The euro guide price (owner, 12.11.2026). The Pop-Up store sells in US dollars only; most FAN LIFE supporters pay in euros, so the
 * site shows "≈ €" beside the dollar price. The rate is the European Central Bank's daily reference (Frankfurter, free, no key),
 * kept for twelve hours. If it cannot be read the site shows the dollar price alone — never a guessed rate (rule 105).
 */
let kept:{at:number;rate:number}|null=null
const TTL=12*3600e3
export async function usdToEur():Promise<number|null>{
 if(kept&&Date.now()-kept.at<TTL)return kept.rate
 try{const r=await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR',{cache:'no-store',signal:AbortSignal.timeout(4000)})
  const j=await r.json() as {rates?:{EUR?:number}},rate=j.rates?.EUR
  if(r.ok&&typeof rate==='number'&&rate>0.5&&rate<2){kept={at:Date.now(),rate};return rate}
 }catch{/* no rate: dollars alone */}
 return kept?.rate??null
}
/** cents → whole euros, rounded to the nearest euro: a guide, not a quote */
export const eurGuide=(usdCents:number,rate:number|null)=>rate?Math.max(1,Math.round(usdCents*rate/100)):null
