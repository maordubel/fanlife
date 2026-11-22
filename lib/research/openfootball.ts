import {core} from '@/lib/fixtures/names'
import {dailyFetch,dailySource,exactSeason,words} from './daily-evidence'
import {OBJECT,publishedMatch,type Addition} from './daily-project'

// Public-domain release pinned to the same tree that is cited on each fixture.
const REVISION='e6744429ee395bc86f247348c6184bb08d4eb361'
const NAME='OpenFootball'
const REPO='openfootball/football.json'
const LEAGUES:Record<string,readonly string[]>={
 atalanta:['it.1','it.2'],celtic:['sco.1'],'leicester-city':['en.1','en.2','en.3'],
 'st-pauli':['de.1','de.2'],'union-berlin':['de.1','de.2'],'borussia-dortmund':['de.1'],
 olympiacos:['gr.1'],panathinaikos:['gr.1'],'aek-athens':['gr.1'],paok:['gr.1'],fenerbahce:['tr.1'],
}
const LABELS:Record<string,string>={'it.1':'Serie A','it.2':'Serie B','sco.1':'Scottish Premiership','en.1':'Premier League','en.2':'Championship','en.3':'League One','de.1':'Bundesliga','de.2':'2. Bundesliga','gr.1':'Super League Greece','tr.1':'Süper Lig'}

export function readOpenFootball(input:unknown,league:string,season:string,clubNames:readonly string[],day:string,source:ReturnType<typeof dailySource>):Addition[]{
 const data=OBJECT(input),teams=new Set(clubNames.map(core))
 if(!LABELS[league]||!exactSeason(season)||!Array.isArray(data.matches))return []
 return data.matches.flatMap(raw=>{
  const m=OBJECT(raw),ft=OBJECT(m.score).ft,on=words(m.date)
  if(!Array.isArray(ft)||ft.length!==2||!ft.every(n=>Number.isInteger(n)&&n>=0&&n<=25))return []
  const home=words(m.team1),away=words(m.team2),first=teams.has(core(home)),second=teams.has(core(away))
  if(first===second||![season.slice(0,4),String(Number(season.slice(0,4))+1)].includes(on.slice(0,4)))return []
  const match=publishedMatch({home:first?clubNames[0]:home,away:second?clubNames[0]:away,on,score:ft.join('-'),competition:LABELS[league],season},day,source,clubNames)
  return match?[match]:[]
 })
}

export async function openFootball(clubId:string,clubNames:string[],day:string){
 const leagues=LEAGUES[clubId]
 if(!leagues)return null
 const result:Addition[]=[]
 let files=0,unavailable=0
 for(let year=2010;year<=2026&&year<=Number(day.slice(0,4));year++){
  const stem=`${year}-${String(year+1).slice(-2)}`,season=stem.replace('-','/')
  for(const league of leagues){
   const file=`${stem}/${league}.json`
   const url=new URL(`https://raw.githubusercontent.com/${REPO}/${REVISION}/${file}`)
   try{
    const body=await dailyFetch(url)
    const source=dailySource(`https://github.com/${REPO}/blob/${REVISION}/${file}`,`${LABELS[league]} ${season} results`,NAME,day)
    result.push(...readOpenFootball(JSON.parse(body.text),league,season,clubNames,day,source))
    files++
   }catch(e){
    if(e instanceof Error&&/HTTP 404\b/.test(e.message)){unavailable++;continue}
    return {result,files,unavailable,stopped:e instanceof Error?e.message:String(e)}
   }
  }
 }
 return {result,files,unavailable}
}
