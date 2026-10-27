import {SWATCH} from '@/lib/clubs/rumble-kit'
import type {Moment,PixelKit,Reel,ReelTeam,Shape} from './types'

/**
 * QA only — an invented match for `/qa/highlights`: two made-up sides (no real people), and one moment of every kind and every
 * set piece, so each kind of scene can be looked at frame by frame.
 */
const kit=(shirt:string,second:string|null=null,pattern:PixelKit['pattern']='plain'):PixelKit=>({shirt,second,pattern,shorts:SWATCH.white!,socks:shirt})
const POS=['GK','DF','DF','DF','DF','MF','MF','MF','FW','FW','FW'] as const
const side=(p:string,name:string,k:PixelKit,keeper:PixelKit):ReelTeam=>({name,code:p.toUpperCase(),kit:k,keeper,formation:'4-3-3',lineup:POS.map((pos,i)=>({id:`${p}${i}`,no:i+1,name:`${name.split(' ')[0]} ${['Keeper','Back','Stopper','Libero','Wing','Anchor','Engine','Ten','Nine','Flyer','Poacher'][i]}`,pos,kit:pos==='GK'?keeper:k}))})
const SHAPES:Shape[]=['through','cross','cutback','long','dribble','combo','corner','free-kick','penalty','counter','rebound','lob','volley']
export function qaReel(): Reel {
 const moments:Moment[]=[];let a=0,b=0
 SHAPES.forEach((shape,i)=>{const sd=(i%2) as 0|1;if(sd)b++;else a++;moments.push({minute:3+i*6,side:sd,kind:'goal',shape,player:`${sd?'oak':'ash'}${8+i%3}`,assist:`${sd?'oak':'ash'}${5+i%3}`,score:[a,b]})})
 for(const [i,kind] of (['save','miss','post','block','offside','yellow','red','injury'] as const).entries())moments.push({minute:80+i,side:(i%2) as 0|1,kind,player:`${i%2?'oak':'ash'}${9}`,score:[a,b]})
 return {id:'qa',seed:2710,teams:[side('ash','Ashford Rovers',kit(SWATCH.red!,SWATCH.white!,'stripes'),kit(SWATCH.green!)),side('oak','Oakmere Athletic',kit(SWATCH.skyblue!),kit(SWATCH.black!))],moments,final:[a,b],pens:null,mine:0}
}
