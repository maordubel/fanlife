import type {ClubData,Fact} from './contract'
export type ArchiveRecord={title:string;on:string|null;year:number|null;hint:string}
/** Archive eligibility is independent of chronology's unique-day and hidden-answer rules. */
export function eligibleArchive(data:Pick<ClubData,'archive'|'timeline'|'sources'>&{players?:ClubData['players']}):Fact<ArchiveRecord>[] {
 const records:Fact<ArchiveRecord>[]=!data.archive.length?data.timeline.map(f=>({...f,value:{title:f.value.title,on:f.value.on,year:Number(f.value.on.slice(0,4)),hint:f.value.hint}}))
 :data.archive.filter(f=>f.status==='approved'&&f.confidence>=2&&f.sources.length>0&&f.sources.every(id=>{const source=data.sources.find(s=>s.id===id);return source?.access==='available'&&!!source.checkedAt})).map(f=>({...f,value:{title:f.value.name,on:f.value.precision==='day'?f.value.on:null,year:f.value.year??(f.value.on?Number(f.value.on.slice(0,4)):null),hint:f.value.hint}})).sort((a,b)=>(b.value.on||`${b.value.year||0}`).localeCompare(a.value.on||`${a.value.year||0}`)||a.id.localeCompare(b.id))
 return [...records,...(data.players||[]).filter(f=>f.status==='approved'&&f.confidence>=2).map(f=>({...f,value:{title:f.value.name,on:null,year:null,hint:f.notes}}))]
}
