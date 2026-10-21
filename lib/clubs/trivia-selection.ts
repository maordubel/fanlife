import type {MasterQuestion,QType} from '@/lib/game/questions/types'
import {rng,shuffle} from '@/lib/game/random'
import {bandOf,factsOf} from './trivia-bank'
import {EDITORIAL_TAG,editorialKey,interaction,questionFamily,standardQuestion} from '@/lib/trivia/editorial'

/** Stable seed/cursor selection for the club Standard mode; the native Worker engine is untouched.
 * Caps are real constraints, never silently relaxed. A sparse bank returns null and keeps its labelled History mode.
 * No personal history participates here: a shared seed always reproduces the same challenge. */
export function standardDeck(questions:readonly MasterQuestion[],seed:number,cursor:number):string[]|null{
 const pool=questions.filter(standardQuestion)
 const bands=[0,1,2].map(b=>pool.filter(q=>bandOf(q.difficulty,false)===b))
 if(bands.some(xs=>xs.length<4))return null
 const wantTopics=Math.min(4,new Set(pool.map(q=>q.topic)).size),needAction=pool.some(interaction)
 const decks=bands.map((qs,b)=>{
  const lanes=[qs.filter(q=>q.facets?.includes(EDITORIAL_TAG)),qs.filter(q=>!q.facets?.includes(EDITORIAL_TAG))]
  return lanes.map((xs,k)=>{
   const deck=shuffle([...xs],rng((seed+b*7919+k*104729)>>>0));if(!deck.length)return deck
   const at=(cursor*4)%deck.length;return [...deck.slice(at),...deck.slice(0,at)]
  }).flat()
 })
 for(let lap=0;lap<24;lap++){
  const picked:MasterQuestion[]=[],facts=new Set<string>(),prompts=new Set<string>(),topics=new Map<string,number>(),types=new Map<QType,number>(),templates=new Map<string,number>(),families=new Map<string,number>()
  for(let slot=0;slot<12;slot++){
   const band=Math.floor(slot/4),lane=decks[band]!,at=lap%Math.max(1,lane.length)
   const ordered=[...lane.slice(at),...lane.slice(0,at)]
   const candidates=ordered.map((q,i)=>({q,i})).filter(({q})=>{
    if(factsOf(q).some(f=>facts.has(f))||prompts.has(editorialKey(q)))return false
    if((types.get(q.type)??0)>=(q.type==='tf'?2:q.type==='year'?2:12))return false
    if((topics.get(q.topic)??0)>=4||(templates.get(q.template)??0)>=2)return false
    if((families.get(questionFamily(q))??0)>=(questionFamily(q)==='scoreboard'?3:questionFamily(q)==='shirts'?2:12))return false
    return true
   })
   const hasAction=picked.some(interaction),hasStory=picked.some(q=>q.facets?.includes('heritage')||q.template==='fl-goal-finisher')
   candidates.sort((a,b)=>rank(a.q,a.i)-rank(b.q,b.i))
   function rank(q:MasterQuestion,i:number){
    const repeated=(topics.get(q.topic)??0)*18+(templates.get(q.template)??0)*8+(types.get(q.type)??0)*3
    const same=picked.at(-1)?.type===q.type?12:0
    const action=slot>=3&&needAction&&!hasAction&&interaction(q)?-24:0
    const welcome=slot===0&&q.type!=='mcq'?24:0
    const story=!hasStory&&(q.facets?.includes('heritage')||q.template==='fl-goal-finisher')?-16:0
    const curated=q.facets?.includes(EDITORIAL_TAG)?-8:0
    // Rotation's front window wins within otherwise comparable content. Editorial does not monopolise a seed forever.
    return repeated+same+action+welcome+story+curated+i/2
   }
   const q=candidates[0]?.q;if(!q)break
   picked.push(q);factsOf(q).forEach(f=>facts.add(f));prompts.add(editorialKey(q))
   topics.set(q.topic,(topics.get(q.topic)??0)+1);types.set(q.type,(types.get(q.type)??0)+1)
   templates.set(q.template,(templates.get(q.template)??0)+1);families.set(questionFamily(q),(families.get(questionFamily(q))??0)+1)
  }
  if(picked.length===12&&topics.size>=wantTopics&&(!needAction||picked.some(interaction))&&types.size>=Math.min(3,new Set(pool.map(q=>q.type)).size))return picked.map(q=>q.id)
 }
 return null
}
