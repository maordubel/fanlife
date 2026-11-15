'use client'
import {useEffect,useState} from 'react'
import {closetMine} from '@/lib/collector/api'
import {IN_CLOSET} from '@/lib/collector/metrics'
import {PersonalPrint} from './PersonalPrint'

/**
 * "Frame my collection" under the closet (owner, 15.11.2026): the shirts he holds, first held first, as the shirt-collection
 * print. Hand-written beside the forked closet (scripts/fanlife/fork-economy.py keeps ClosetBoard a pure fork of THE WORKER).
 */
export function ClosetPrint(){
 const [slugs,setSlugs]=useState<string[]>([])
 useEffect(()=>{closetMine().then(r=>{if(r.ok)setSlugs([...new Set(r.items.filter(i=>IN_CLOSET.has(i.state)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).map(i=>i.archiveSlug))].slice(0,9))}).catch(()=>{})},[])
 if(!slugs.length)return null
 return <div className="mt-stack max-w-2xl"><PersonalPrint kind="shirts" req={{slugs}} className="flex w-full items-center justify-center gap-1 border-plate border-ink bg-paper px-3 font-body text-step--1 font-extrabold text-ink"/></div>
}
