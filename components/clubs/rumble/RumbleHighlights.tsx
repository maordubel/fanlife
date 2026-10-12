'use client'
import {useMemo,useState} from 'react'
import type {ShowScript} from '@/lib/clubs/rumble-show'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {rumbleReel} from '@/lib/highlights/rumble'
import type {HighlightsAllow} from '@/lib/highlights/page'
import {Theatre,type TheatreSound} from '@/components/highlights/Theatre'
import {RumbleMatchCentre,type ClubFace} from './RumbleMatchCentre'
import type {Sfx} from './shared'
import s from './rumble.module.css'

/**
 * The Royal Rumble's match as highlights (owner, 12.10.2026 — "display only, highlights only, the right kits"): the line-ups,
 * then the moves the server staged drawn as scenes. The match centre the gate had before stays one tap away.
 */
export function RumbleHighlights({script,wardrobe,copy,reduced,sound,soundOn,onSound,onDone,usClub,themClub,allow,seed}:{script:ShowScript;wardrobe:RumbleWardrobe;copy:GameCopy;reduced:boolean;sound:(n:Sfx,v?:number)=>void;soundOn:boolean;onSound:()=>void;onDone:()=>void;usClub:ClubFace;themClub:ClubFace;allow:HighlightsAllow;seed:number}){
 const [centre,setCentre]=useState(false)
 const reel=useMemo(()=>rumbleReel(script,wardrobe,{us:{name:usClub.name,primary:allow.primary.us},them:{name:themClub.name,primary:allow.primary.them}},seed,allow.keepers),[script,wardrobe,usClub.name,themClub.name,allow,seed])
 const snd:TheatreSound=n=>sound(n==='whistle'?'kickoff':n==='save'?'roar':n,n==='save'?.35:.6)
 if(centre)return <RumbleMatchCentre script={script} wardrobe={wardrobe} copy={copy} reduced={reduced} sound={sound} soundOn={soundOn} onSound={onSound} onDone={onDone} usClub={usClub} themClub={themClub}/>
 return <div data-testid="rumble-highlights">
  <Theatre reel={reel} sound={snd} allow={allow} autoStart onDone={onDone}/>
  <div className={s.chips}>
   <button type="button" className={`${s.chip} min-h-tap`} onClick={()=>setCentre(true)} data-testid="rumble-centre"><span>Match centre</span></button>
   <button type="button" className={`${s.chip} min-h-tap`} onClick={onSound} aria-pressed={!soundOn}><span>{soundOn?'Sound on':'Sound off'}</span></button>
  </div>
 </div>
}
