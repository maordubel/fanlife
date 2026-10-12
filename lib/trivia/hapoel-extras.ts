import 'server-only'
import trophies from '@/content/manual/trophies.json'
import {pickablePlayers} from '@/lib/archive/player-master'
import type {ForgeExtras} from './forge'

/**
 * Hapoel Tel Aviv's two Worker records the club pack does not carry, translated for the English forge:
 *  · honours (`content/manual/trophies.json`) — the competition named in English and era-neutral ("the Israeli
 *    championship", not a league name a 1934 title never had). League (13) and State Cup (16) lists are the club's full
 *    count as their source states it, so a season NOT on them is a season not won; the others are partial and only ever
 *    asked as true statements.
 *  · season-bound shirt numbers from the Player Master (rule 37: never the one "remembered" number, only a season's).
 */
const NAMES:Record<string,{name:string;complete:boolean}>={
 'ליגת-העל':{name:'Israeli championship',complete:true},
 'גביע-המדינה':{name:'Israel State Cup',complete:true},
 'גביע-הטוטו':{name:'Toto Cup',complete:false},
 'גביע-אלופות-אסיה':{name:'Asian Champion Club Tournament',complete:false},
}
type Row={competitionSlug:string;seasonLabel:string;result:string;sport:string;confidence:number;sourceUrl?:string;sourceTitle:string}
export function hapoelExtras():ForgeExtras{
 const by=new Map<string,Row[]>()
 for(const r of (trophies as {records:Row[]}).records)if(r.sport==='football'&&r.result==='won'&&r.confidence>=2&&NAMES[r.competitionSlug])by.set(r.competitionSlug,[...(by.get(r.competitionSlug)??[]),r])
 const out:ForgeExtras={trophies:[],numbers:[]}
 for(const [slug,rows] of by){
  const n=NAMES[slug]!,first=rows[0]!
  out.trophies!.push({id:`hapoel-tel-aviv:honour:${slug}`,name:n.name,seasons:[...new Set(rows.map(r=>r.seasonLabel))].sort(),complete:n.complete,count:n.complete?rows.length:null,source:{title:first.sourceTitle,url:first.sourceUrl??null,confidence:Math.min(...rows.map(r=>r.confidence))}})
 }
 for(const p of pickablePlayers())for(const s of p.shirtNumbers){
  if(!/^\d{4}\/\d{2}$/.test(s.seasonLabel)||!s.source)continue
  out.numbers!.push({playerId:p.id,number:s.number,season:s.seasonLabel,source:{title:s.source.sourceTitle||s.source.file,url:s.source.sourceUrl||null,confidence:2}})
 }
 return out
}
