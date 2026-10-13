'use client'
/**
 * The career's own navigation (owner, 13.10.2026: "I don't like sliding menus on mobile"). Five doors, always all on the glass:
 * on a phone a fixed segmented bar under the masthead (never sideways, never over the site's own tab bar at the foot); on a
 * desk a rail of large tiles beside the page. The friendlies live inside Club.
 */
export type Tab='match'|'squad'|'market'|'league'|'club'
const ICON:Record<Tab,string>={
 match:'M4 7h16v10H4zM12 7v10M8 12a1 1 0 1 0 0 .01M16 12a1 1 0 1 0 0 .01',
 squad:'M8 4l-4 3 2 3 2-1v11h8V9l2 1 2-3-4-3c-1 2-2 2-4 2s-3 0-4-2z',
 market:'M5 9h14l-1 11H6zM9 9V7a3 3 0 0 1 6 0v2',
 league:'M8 4h8v4a4 4 0 0 1-8 0zM6 5H4v2a3 3 0 0 0 3 3M18 5h2v2a3 3 0 0 1-3 3M12 12v4M8 20h8M9 16h6v4H9z',
 club:'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z',
}
export function CareerNav({tab,setTab,windowOpen,matchLabel}:{tab:Tab;setTab:(t:Tab)=>void;windowOpen:boolean;matchLabel:string}){
 const doors:{id:Tab;label:string;hint:string}[]=[{id:'match',label:matchLabel,hint:'The next match'},{id:'squad',label:'Team',hint:'The eleven and the plan'},{id:'market',label:'Market',hint:windowOpen?'The window is open':'Transfers'},{id:'league',label:'League',hint:'Table, results, stats'},{id:'club',label:'Club',hint:'Honours and the books'}]
 return <nav className="tl-nav" aria-label="Career">
  {doors.map(d=><button key={d.id} type="button" className="min-h-tap" aria-current={tab===d.id?'page':undefined} onClick={()=>{setTab(d.id);if(typeof window!=='undefined')window.scrollTo({top:0})}} data-testid={`legends-tab-${d.id}`}>
   <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={ICON[d.id]}/></svg>
   <span className="tl-nav-l">{d.label}</span><small className="tl-nav-h">{d.hint}</small>
   {d.id==='market'&&windowOpen?<i className="tl-nav-dot" aria-label="open"/>:null}
  </button>)}
 </nav>
}
