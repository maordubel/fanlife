'use client'
import {useCallback,useEffect,useRef} from 'react'

/**
 * The ground's sound (17.11.2026, "upgrade the sound in the game"): a crowd that is ALWAYS there while you watch — the murmur
 * under the match, a rising swell when an attack builds, the "ooh" of a save or a shot off the post, the roar of your goal and
 * the groan or the hush of theirs, the referee's whistles, applause at the end of a win. Only the Worker's own crowd recordings
 * (`/life/sfx`), only after the manager's own tap (kick-off), and silent when he turned the sound off. The bed fades rather
 * than cuts, and ducks under a goal so the roar is heard.
 */
const SRC=(n:string)=>`/life/sfx/${n}.m4a`
export type MatchCue='kick'|'goal'|'concede'|'whistle'|'final'|'save'|'post'|'card'|'win'|'build'
export function useMatchAudio(on:boolean,active:boolean){
 const bed=useRef<HTMLAudioElement|null>(null),fade=useRef<number|null>(null),onRef=useRef(on)
 onRef.current=on
 const ramp=useCallback((to:number,ms=900)=>{const a=bed.current;if(!a)return;if(fade.current)window.clearInterval(fade.current)
  const from=a.volume,t0=performance.now();fade.current=window.setInterval(()=>{const k=Math.min(1,(performance.now()-t0)/ms);a.volume=Math.max(0,Math.min(1,from+(to-from)*k));if(k>=1&&fade.current){window.clearInterval(fade.current);fade.current=null;if(to===0)a.pause()}},40)},[])
 useEffect(()=>{
  if(!active||!on){ramp(0,500);return}
  try{if(!bed.current){const a=new Audio(SRC('crowd-real-murmur'));a.loop=true;a.volume=0;bed.current=a}
   void bed.current.play().catch(()=>undefined);ramp(0.22,1400)}catch{/* no audio here */}
 },[active,on,ramp])
 useEffect(()=>()=>{if(fade.current)window.clearInterval(fade.current);bed.current?.pause();bed.current=null},[])
 const one=useCallback((n:string,v:number)=>{if(!onRef.current)return;try{const a=new Audio(SRC(n));a.volume=v;void a.play().catch(()=>undefined)}catch{/* no audio */}},[])
 const duck=useCallback((ms:number)=>{ramp(0.06,250);window.setTimeout(()=>{if(onRef.current)ramp(0.22,1600)},ms)},[ramp])
 return useCallback((c:MatchCue)=>{
  switch(c){
   case 'kick':if(Math.random()<0.35)one('crowd-real-build',0.32);else one('ball-kick',0.45);break
   case 'build':one('crowd-real-build',0.35);break
   case 'goal':duck(5200);one('crowd-real-goal',0.85);window.setTimeout(()=>one('chant-derby',0.4),2600);break
   case 'concede':duck(2600);one(Math.random()<0.5?'crowd-groan':'crowd-hush',0.6);break
   case 'save':one('crowd-real-miss',0.5);break
   case 'post':one('clang',0.5);window.setTimeout(()=>one('crowd-real-miss',0.55),180);break
   case 'card':one('whistle-2',0.55);break
   case 'whistle':one('whistle-1',0.6);break
   case 'final':one('whistle-3',0.7);break
   case 'win':one('crowd-claps',0.6);window.setTimeout(()=>one('crowd-real-final',0.55),600);break
  }
 },[one,duck])
}
