'use client'
/**
 * THE ALBUM's sounds and touch (18.11.2026) — all synthesised in the browser, no audio files: the crackle of a foil
 * packet tearing under the finger (louder and brighter the faster you pull), the final rip, a card flicked over, the
 * dull "thup" of a sticker pressed onto paper, a page turning, the foil glint of a gold one. A phone also feels it
 * (navigator.vibrate where the device allows). Muted is remembered on the device. Nothing plays before a touch.
 */
let ctx:AudioContext|null=null
let muted=false
try{muted=typeof localStorage!=='undefined'&&localStorage.getItem('alb-mute')==='1'}catch{/* no storage */}

function ac():AudioContext|null{
 if(muted||typeof window==='undefined')return null
 try{
  if(!ctx){const A=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;ctx=new A()}
  if(ctx.state==='suspended')void ctx.resume()
  return ctx
 }catch{return null}
}
function noise(c:AudioContext,secs:number,shape:(t:number)=>number){
 const n=Math.max(1,Math.floor(secs*c.sampleRate)),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0)
 for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*shape(i/n)
 const s=c.createBufferSource();s.buffer=b;return s
}
function out(c:AudioContext,node:AudioNode,gain:number,type:BiquadFilterType,freq:number,q=0.8){
 const f=c.createBiquadFilter(),g=c.createGain();f.type=type;f.frequency.value=freq;f.Q.value=q;g.gain.value=gain
 node.connect(f).connect(g).connect(c.destination)
}
const buzz=(ms:number|number[])=>{try{navigator.vibrate?.(ms)}catch{/* no haptics */}}

export const albumSound={
 get muted(){return muted},
 setMuted(m:boolean){muted=m;try{localStorage.setItem('alb-mute',m?'1':'0')}catch{/* */}},
 /** a grain of tearing foil; `speed` 0..1 from the finger's speed */
 tear(speed:number){
  const c=ac();if(c){const s=noise(c,0.05+0.05*speed,t=>Math.pow(1-t,2)*(Math.random()<0.35?1:0.25));out(c,s,0.25+0.5*speed,'bandpass',2200+2600*speed,0.9);s.start()}
 },
 tick(){buzz(6)},
 /** the strip coming away */
 rip(){
  const c=ac();if(c){const s=noise(c,0.42,t=>Math.pow(1-t,1.3)*(0.5+0.5*Math.sin(t*140)));out(c,s,0.55,'highpass',1500);s.start()}
  buzz([14,30,10])
 },
 /** a card flicked over */
 flip(){
  const c=ac();if(c){const s=noise(c,0.09,t=>Math.sin(Math.PI*t));out(c,s,0.35,'bandpass',900,0.6);s.start()}
  buzz(8)
 },
 /** the backing paper peeling — a slow, sticky crackle */
 peel(p:number){
  const c=ac();if(c&&Math.random()<0.6){const s=noise(c,0.03,t=>1-t);out(c,s,0.12+0.2*p,'bandpass',3200,1.4);s.start()}
 },
 /** the sticker pressed onto the page */
 thup(){
  const c=ac()
  if(c){
   const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(150,c.currentTime);o.frequency.exponentialRampToValueAtTime(60,c.currentTime+0.12)
   g.gain.setValueAtTime(0.5,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.16);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+0.18)
   const s=noise(c,0.06,t=>1-t);out(c,s,0.25,'lowpass',700);s.start()
  }
  buzz(22)
 },
 /** the thumb smoothing it down */
 smooth(){const c=ac();if(c){const s=noise(c,0.35,t=>Math.sin(Math.PI*t)*0.6);out(c,s,0.12,'bandpass',1800,0.5);s.start()}},
 /** a page of the album turning */
 page(){
  const c=ac();if(c){const s=noise(c,0.38,t=>Math.sin(Math.PI*Math.pow(t,0.7))*(0.6+0.4*Math.random()));out(c,s,0.3,'bandpass',1300,0.4);s.start()}
  buzz(6)
 },
 /** the cover opening */
 cover(){const c=ac();if(c){const s=noise(c,0.25,t=>Math.pow(1-t,3));out(c,s,0.45,'lowpass',500);s.start()}buzz(12)},
 /** gold and silver glint */
 glint(){
  const c=ac();if(!c)return
  ;[1568,2093,2637].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+i*0.07;o.type='triangle';o.frequency.value=f
   g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.12,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+0.5);o.connect(g).connect(c.destination);o.start(t);o.stop(t+0.55)})
  buzz([10,40,10])
 },
}
