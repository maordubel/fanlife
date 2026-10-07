import {ROOMS} from '../rooms'
import type {Branch, Chapter, Cond, Effect, Line, Talk} from '../types'
import type {ChapterScript, SceneScript, Speech, Words} from './types'

/** A choice records intent. Its consequences are committed only after the world action. */
export function compileScript(script: ChapterScript, locale: 'en' | 'he'): Chapter {
  const word=(w:Words)=>w[locale==='he'?1:0]
  const lines=(ss:Speech[]):Line[]=>ss.map(s=>({who:s[0],t:s[locale==='he'?2:1]}))
  const stage=`story:${script.id}:stage`, talks:Talk[]=[], cast:Chapter['cast']=[], spots:Chapter['spots']=[]
  const beats:Chapter['beats']=[], objectives:Chapter['objectives']=[], endings:Chapter['endings']={}
  const active=(n:number):Cond=>n===0?{not:stage}:{is:[stage,n]}
  const sayDone:Line[]=[{who:null,t:locale==='he'?'הרגע הזה כבר קרה. אפשר להמשיך.':'This moment has already happened. Keep going.'}]
  script.scenes.forEach((scene:SceneScript,n:number)=>{
    const room=ROOMS[scene.room];if(!room)throw new Error(`STORY_ROOM:${scene.room}`)
    const root=`${scene.id}:choose`, task=`${scene.id}:act`, pick=`story:${script.id}:${scene.id}:pick`
    const choosing:Cond={all:[active(n),{not:pick}]}, doing:Cond={all:[active(n),{flag:pick}]}
    // The automatic arrival can be closed; the same conversation remains on the person.
    const locations=scene.locations||[{room:scene.room,when:{all:[]} as Cond}]
    for(const location of locations){
      const geo=ROOMS[location.room]!, chooseHere:Cond={all:[choosing,location.when]}, doHere:Cond={all:[doing,location.when]}
      cast.push({who:scene.who,room:location.room,slot:Object.keys(geo.slots)[0]!,talk:root,when:scene.presence?{all:[chooseHere,scene.presence]}:chooseHere,mark:true})
      for(const guest of scene.company||[])cast.push({who:guest.who,room:location.room,slot:guest.slot,when:{all:[active(n),location.when,guest.when]},mark:false})
      beats.push({id:`${root}:${location.room}`,room:location.room,when:chooseHere,talk:root})
      spots.push({id:`${root}:${location.room}`,room:location.room,spot:Object.keys(geo.spots)[0]!,talk:root,when:chooseHere,verb:'look',label:word(scene.title)})
      spots.push({id:`${task}:${location.room}`,room:location.room,spot:Object.keys(geo.spots)[0]!,talk:task,when:doHere,verb:'use',label:word(scene.task)})
    }
    objectives.push({id:scene.id,t:word(scene.task),...(scene.locations?{}:{room:scene.room}),done:{flag:`story:${script.id}:${scene.id}:done`}})
    const choices=scene.options.map(o=>({id:o.id,t:word(o.text),when:o.when,then:[{e:'flag' as const,k:pick,v:o.id}],next:`${scene.id}:${o.id}:reply`}))
    const base:Branch={when:choosing,lines:lines(scene.lines),choices}
    talks.push({id:root,branches:[...(scene.callbacks||[]).map(c=>({when:{all:[choosing,c.when]} as Cond,lines:[...lines(c.lines),...lines(scene.lines)],choices})),base,{lines:sayDone}]})
    for(const o of scene.options)talks.push({id:`${scene.id}:${o.id}:reply`,branches:[{lines:lines(o.reply)}]})
    const next=script.scenes[n+1]
    const destinations=next?.locations||[{room:next?.room||scene.room,when:{all:[]} as Cond}]
    const actionBranches:Branch[]=scene.options.flatMap(o=>destinations.map(destination=>{
      const done:Effect[]=[...(o.effects||[]),{e:'flag',k:`life:decision:${scene.id}`,v:o.id},{e:'flag',k:`story:${script.id}:${scene.id}:done`},{e:'flag',k:stage,v:n+1}]
      if(n===script.scenes.length-1){
        done.push({e:'flag',k:`story:${script.id}:complete`},{e:'keep',item:script.keepsake.id},{e:'end',ending:o.id})
        endings[o.id]={title:word(script.title),body:word(o.text)+' — '+o.reply.map(s=>s[locale==='he'?2:1]).join(' '),keep:script.keepsake.id}
      }else done.push({e:'goto',room:destination.room,spawn:'start'})
      return {when:{all:[doing,{is:[pick,o.id]},destination.when]},lines:lines([...scene.action,...(o.action||[])]),then:scene.game?[{e:'play',game:scene.game,id:`${scene.id}:${o.id}`,then:done}]:done}
    }))
    talks.push({id:task,branches:[...actionBranches,{lines:sayDone}]})
  })
  return {id:script.id,act:script.act,age:script.age,title:word(script.title),kicker:locale==='he'?`גיל ${script.age}`:`Age ${script.age}`,intro:word(script.intro),start:{room:script.scenes[0]!.room,spawn:'start',time:'day'},cast,spots,doors:[],beats,talks,objectives,endings,keepsakes:[{id:script.keepsake.id,name:word(script.keepsake.name),note:word(script.keepsake.note)}]}
}
