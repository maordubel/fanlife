import {ClubDerby} from '@/components/clubs/gates/derby/ClubDerby'
import {ClubWall} from '@/components/clubs/gates/rivalry/ClubWall'
import {ClubBlackFile} from '@/components/clubs/gates/rivalry/ClubBlackFile'
import {ModeBar} from '@/components/clubs/gates/rivalry/ModeBar'
import {ModeLocked} from '@/components/clubs/gates/rivalry/ModeLocked'
import css from '@/components/clubs/gates/rivalry/rivalry.module.css'
import {rivalsOf} from '@/lib/clubs/gate-content'
import {blackFileSource,wallCandidates} from '@/lib/clubs/gate-extras'
import {dealFile,publicFile,scopeOf} from '@/lib/clubs/blackfile-deal'
import {wallOf} from '@/lib/clubs/derby-model'
import {modeFrom,rivalList,rivalryModes,type ModeKey} from '@/lib/clubs/rivalry-modes'
import {meetingsBetween} from '@/lib/fixtures/meetings'
import {makeT} from '../derby/ui'
import type {GateView} from '../types'

/**
 * Gate 11 · Rivalry — three separate experiences over one club's approved data (rulebook §2.4, §13).
 *   meetings  — one approved rival at a time and the meetings the archives document (limited by coverage, said aloud)
 *   wall      — a preference bracket; needs ten approved, distinct names
 *   blackfile — documented crossings and dated order; needs a verifiable crossing or an unambiguous dated pair
 * An approved rival alone opens only the meetings. A mode that is not open says so, with exact counts and its blocker.
 */
export const view:GateView=async({club,locale,copy,round,searchParams})=>{
 const rivals=rivalList(rivalsOf(club))
 const rival=rivals.find(r=>r.id===searchParams.rival)??rivals[0]??null
 const meetings=rival?wallOf(await meetingsBetween(club.identity.id,rival.name,rival.aliases)):[]
 const candidates=await wallCandidates(club)
 const source=await blackFileSource(club)
 const modes=rivalryModes({rivals:rivals.length,meetings:meetings.length,wall:candidates,binary:source.binary,items:source.items})
 const mode:ModeKey=modeFrom(searchParams.mode)
 const info=modes.find(m=>m.key===mode)!
 const t=makeT(copy)

 const keep=['lang','seed','r','rival']
 const qs=(over:Record<string,string|undefined>,drop:string[]=[])=>`?${new URLSearchParams(Object.entries({...Object.fromEntries(keep.map(k=>[k,searchParams[k]])),...over}).filter((e):e is [string,string]=>typeof e[1]==='string'&&!drop.includes(e[0])))}`
 const hrefs:Record<ModeKey,string>={meetings:qs({mode:'meetings'}),wall:qs({mode:'wall'}),blackfile:qs({mode:'blackfile'})}
 const again=(m:ModeKey)=>qs({mode:m,r:String(round.cursor+1),seed:String(round.seed)})
 const contentLocale=club.locales.content
 const bar=<ModeBar modes={modes} current={mode} hrefs={hrefs} copy={copy} rivals={rivals} currentRival={rival?.id??null} rivalHref={id=>qs({mode:'meetings',rival:id})}/>
 const barHeight=66+(rivals.length>1&&mode==='meetings'?54:0)

 let body:JSX.Element|null
 if(mode==='meetings'){
  if(!rival||info.state==='locked')body=<ModeLocked mode={modes[0]!} clubName={club.identity.name} copy={copy} otherHref={hrefs.meetings}/>
  else{
   const tab=searchParams.play==='1'?'call':(['wall','call','record'] as const).find(k=>k===searchParams.tab)??'wall'
   body=<ClubDerby key={rival.id} club={club.identity.id} clubName={club.identity.name} rival={rival.name} rivalNote={[rival.type,rival.period,rival.note].filter(Boolean).join(' · ')||null} meetings={meetings} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={contentLocale} copy={copy} initialTab={tab} autoStart={searchParams.play==='1'}/>
  }
 }else if(mode==='wall'){
  body=info.state==='open'
   ?<ClubWall club={club.identity.id} clubName={club.identity.name} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={contentLocale} copy={copy} candidates={candidates} playUrl={again('wall')}/>
   :<ModeLocked mode={info} clubName={club.identity.name} copy={copy} otherHref={hrefs.meetings}/>
 }else{
  if(info.state==='locked')body=<ModeLocked mode={info} clubName={club.identity.name} copy={copy} otherHref={hrefs.meetings}/>
  else{
   const file=publicFile(dealFile(source,round.seed,round.cursor),scopeOf(club.identity.id,club.version,round.seed,round.cursor))
   const notes=[(info.have===0?t('derby.bf.limited.noCross',{club:club.identity.name,have:info.have}):null),((info.have2??0)<(info.need2??4)?t('derby.bf.limited.noOrder',{have2:info.have2??0,need2:info.need2??4}):null)].filter((x):x is string=>x!==null)
   body=<>
    {info.state==='limited'&&notes.map((n,i)=><p key={i} className={css.fine} data-testid="file-limited">{n}</p>)}
    <ClubBlackFile key={`${round.seed}:${round.cursor}`} club={club.identity.id} clubName={club.identity.name} slug={club.identity.id} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={contentLocale} copy={copy} file={file} playUrl={again('blackfile')}/>
   </>
  }
 }
 return <div className={css.shell} data-testid="derby-gate" data-mode={mode} style={{'--mode-bar':`${barHeight}px`} as React.CSSProperties}>{bar}{body}</div>
}
