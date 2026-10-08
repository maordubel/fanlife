'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {finalFrame,stateAt,type Frame,type Timeline} from '@/lib/clubs/goal-model'

const reduced=()=>{try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch{return false}}

/**
 * Drives a deterministic timeline frame by frame. `play(tl)` runs it from the start; `pause`/`resume` hold it where it
 * is; `skip` jumps to the final frame. Under `prefers-reduced-motion` a timeline is never animated: it lands on its
 * final state at once and `onDone` fires.
 */
export function useBallRun(){
 const [frame,setFrame]=useState<Frame|null>(null),[playing,setPlaying]=useState(false),[paused,setPaused]=useState(false)
 const raf=useRef<number|null>(null),tl=useRef<Timeline|null>(null),at=useRef(0),last=useRef(0),done=useRef<(()=>void)|null>(null),hold=useRef(false)
 const stop=useCallback(()=>{if(raf.current!==null)cancelAnimationFrame(raf.current);raf.current=null},[])
 const finish=useCallback(()=>{
  stop();const t=tl.current;if(t)setFrame(finalFrame(t))
  setPlaying(false);setPaused(false);hold.current=false
  const cb=done.current;done.current=null;cb?.()
 },[stop])
 const tick=useCallback((now:number)=>{
  const t=tl.current;if(!t)return
  if(!hold.current)at.current+=Math.min(64,now-last.current)
  last.current=now
  const f=stateAt(t,at.current);setFrame(f)
  if(f.done){finish();return}
  raf.current=requestAnimationFrame(tick)
 },[finish])
 const play=useCallback((t:Timeline,onDone?:()=>void)=>{
  stop();tl.current=t;at.current=0;done.current=onDone??null;hold.current=false;setPaused(false)
  if(reduced()||!t.pts.length){setPlaying(true);finish();return}
  setFrame(stateAt(t,0));setPlaying(true);last.current=performance.now();raf.current=requestAnimationFrame(tick)
 },[finish,stop,tick])
 const pause=useCallback(()=>{hold.current=true;setPaused(true)},[])
 const resume=useCallback(()=>{hold.current=false;setPaused(false);last.current=performance.now()},[])
 const skip=useCallback(()=>{if(tl.current)finish()},[finish])
 const reset=useCallback(()=>{stop();tl.current=null;done.current=null;setFrame(null);setPlaying(false);setPaused(false)},[stop])
 useEffect(()=>stop,[stop])
 return {frame,playing,paused,play,pause,resume,skip,reset}
}
