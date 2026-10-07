import type {ChapterScript, Option, SceneScript, Speech, Words} from './types'
import type {Cond, Effect, MiniGame} from '../types'
export const s=(who:string|null,en:string,he:string):Speech=>[who,en,he]
export const o=(id:string,en:string,he:string,who:string|null,re:string,rh:string,effects:Effect[]=[],when?:Cond):Option=>({id,text:[en,he],reply:[s(who,re,rh)],effects,when})
export const scene=(id:string,room:string,who:string,title:Words,lines:Speech[],task:Words,action:Speech[],options:Option[],game?:MiniGame):SceneScript=>({id,room,who,title,lines,task,action,options,game})
export const chapter=(id:string,age:number,act:1|2|3,title:Words,intro:Words,item:string,name:Words,note:Words,scenes:SceneScript[]):ChapterScript=>({id,age,act,title,intro,keepsake:{id:item,name,note},scenes})
