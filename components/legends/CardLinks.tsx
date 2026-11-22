'use client'
import Link from 'next/link'
import {createContext,useContext,type ReactNode} from 'react'
import {playerNumber} from '@/lib/people/number'

/**
 * THE DOORS ON A PLAYER'S CARD (owner, 22.11.2026: "the card carries what his archive card says, with a link to the archive
 * and to what is relevant"). The page that knows the switches says which doors are open: a man's profile (the "Player
 * profiles" switch) and each club's archive (gate 12). A door that would lead to a closed room is not drawn (rule 128).
 */
export type LegendDoors={profiles:boolean;archives:string[]}
const Ctx=createContext<LegendDoors>({profiles:false,archives:[]})
export function LegendDoorsProvider({doors,children}:{doors:LegendDoors;children:ReactNode}){return <Ctx.Provider value={doors}>{children}</Ctx.Provider>}

export function CardLinks({id,person,club,name}:{id:string;person?:string;club?:string;name:string}){
 const d=useContext(Ctx),num=person?playerNumber(person):null
 const archive=club&&d.archives.includes(club)?`/clubs/${club}/archive?${new URLSearchParams({event:id,lang:'en'})}`:null
 const profile=d.profiles&&person?`/players/${num??person}`:null
 if(!archive&&!profile)return null
 return <p className="lgm-card-doors" data-testid="legend-card-doors">
  {archive&&<Link className="lgm-card-door min-h-tap" href={archive} aria-label={`${name} in the archive`}>In the archive <span aria-hidden="true">→</span></Link>}
  {profile&&<Link className="lgm-card-door min-h-tap" href={profile} aria-label={`${name}: full profile`}>Full profile <span aria-hidden="true">→</span></Link>}
 </p>
}
