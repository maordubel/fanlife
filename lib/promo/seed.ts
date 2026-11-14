import type {Banner,PromoDoc} from './types'
const base={enabled:true,audience:'all' as const,startsAt:null,endsAt:null,days:[],fromHour:0,toHour:0,delaySec:null,showSec:null,weight:10,maxPerSession:1,maxPerDay:0,cooldownMin:30,note:''}
/** The owner's three first banners (14.10.2026). The control room edits them from here; a store with no file starts as this. */
export const SEED_BANNERS:Banner[]=[
 {...base,id:'offsides',name:'Offsides',href:'https://offsides.dubelteam.com',alt:'Play Offsides! A different kind of game.',img1x:'/ads/offsides-1x.webp',img2x:'/ads/offsides-2x.webp',
  targeting:{home:true,allClubs:true,clubs:[],other:true,paths:[],exclude:[]},note:'Every page.'},
 {...base,id:'takemeout',name:'TakeMeOut',href:'https://takemeout.dubelteam.com',alt:'TakeMeOut — flying abroad? The nightlife guide.',img1x:'/ads/takemeout-1x.webp',img2x:'/ads/takemeout-2x.webp',
  targeting:{home:true,allClubs:true,clubs:[],other:true,paths:[],exclude:[]},note:'Every page.'},
 {...base,id:'dubid',name:'Dubid (Hebrew)',href:'https://dubid.dubelteam.com',alt:'Dubid — פנטזי קצת שונה. כל מחזור משחק חדש!',img1x:'/ads/dubid-1x.webp',img2x:'/ads/dubid-2x.webp',
  targeting:{home:false,allClubs:false,clubs:['hapoel-tel-aviv','hapoel-petah-tikva'],other:false,paths:[],exclude:[]},note:'Hebrew banner — Hapoel Tel Aviv and Hapoel Petah Tikva only.'},
]
const SITE='https://fanlife.dubelteam.com'
const own=(id:string,name:string,path:string,alt:string,exclude:string[]):Banner=>({...base,id,name,href:`${SITE}${path}`,alt,img1x:`/ads/${id}-1x.webp`,img2x:`/ads/${id}-2x.webp`,
 targeting:{home:true,allClubs:true,clubs:[],other:true,paths:[],exclude},note:'In-house: one of the three features we market. Hidden on its own pages.'})
/** Added 14.10.2026: the three flagship features in the house style, and the fuckyou banner for every page. */
export const SEED_ADDED:Banner[]=[
 own('manager','Legends Manager','/all-football/legends','Legends Manager — build your club’s all-time legends side.',['/all-football/legends']),
 own('market','Shirt market','/market','Swap the shirt — the FAN LIFE shirt market.',['/market','/closet','/auction']),
 own('life','LIFE','/#life','Life! — live one fan’s seasons.',['/']),
 {...base,id:'fuckyou',name:'FUCK YOU (fuckyou.dubelteam.com)',href:'https://fuckyou.dubelteam.com',alt:'Say it. Don’t send it. — play now.',img1x:'/ads/fuckyou-1x.webp',img2x:'/ads/fuckyou-2x.webp',
  targeting:{home:true,allClubs:true,clubs:[],other:true,paths:[],exclude:[]},note:'Every page.'},
 {...base,id:'dubid-en',name:'Dubid (English)',href:'https://dubid.dubelteam.com',alt:'Dubid — a different fantasy, a whole new game. Play now!',img1x:'/ads/dubid-en-1x.webp',img2x:'/ads/dubid-en-2x.webp',
  targeting:{home:true,allClubs:true,clubs:[],other:true,paths:[],exclude:[]},note:'Every page.'},
 {...base,id:'dubid-gr',name:'Dubid (Greek)',audience:'greece' as const,href:'https://dubid.dubelteam.com',alt:'Dubid — μια διαφορετική φαντασία, ένα εντελώς νέο παιχνίδι. Παίξε τώρα!',img1x:'/ads/dubid-gr-1x.webp',img2x:'/ads/dubid-gr-2x.webp',
  targeting:{home:true,allClubs:true,clubs:['aek-athens','olympiacos','panathinaikos'],other:true,paths:[],exclude:[]},note:'Visitors from Greece on any page; anyone on a Greek club page.'},
]
const BOOK='https://www.dubelteam.com/broken-collective',TAPES='https://www.youtube.com/@TheKypseliTapes'
const every={home:true,allClubs:true,clubs:[],other:true,paths:[],exclude:[]}
const art=(id:string)=>({img1x:`/ads/${id}-1x.webp`,img2x:`/ads/${id}-2x.webp`})
/**
 * Added 14.11.2026 (owner): the novel "Broken Collective" and its YouTube channel, The Kypseli Tapes. Each is a Hebrew
 * banner for Israeli visitors and an English twin for everyone else ('world'), so nobody gets both languages; the twins
 * are one family (attention.ts), so one visit shows the book at most once and the channel at most once. On Sundays,
 * before the 19:00 Athens premiere, the channel's banner becomes "new tape tonight" and is weighted to win the rotation.
 */
export const SEED_BOOK:Banner[]=[
 {...base,id:'book-he',name:'Broken Collective — the book (Hebrew)',audience:'israel',href:`${BOOK}/he/`,alt:'קולקטיב שבור — רומן. ים אחד, שני חופים, חוט אדום אחד. לקריאה חינם.',...art('book-he'),
  targeting:every,weight:12,maxPerDay:2,note:'The novel, free to read. Israeli visitors; the English twin is book-en.'},
 {...base,id:'book-en',name:'Broken Collective — the book (English)',audience:'world',href:`${BOOK}/en/`,alt:'Broken Collective — a novel. One sea, two shores, one red thread. Read free.',...art('book-en'),
  targeting:every,weight:12,maxPerDay:2,note:'The novel, free to read. Visitors outside Israel; the Hebrew twin is book-he.'},
 {...base,id:'kypseli-he',name:'The Kypseli Tapes — channel (Hebrew)',audience:'israel',href:TAPES,alt:'The Kypseli Tapes — קולקטיב שבור, קלטת אחרי קלטת. כתוביות בעברית. לצפייה.',...art('kypseli-he'),
  targeting:every,weight:10,maxPerDay:2,note:'The YouTube channel. Israeli visitors.'},
 {...base,id:'kypseli-en',name:'The Kypseli Tapes — channel (English)',audience:'world',href:TAPES,alt:'The Kypseli Tapes — Broken Collective, the novel, tape by tape. Watch.',...art('kypseli-en'),
  targeting:every,weight:10,maxPerDay:2,note:'The YouTube channel. Visitors outside Israel.'},
 {...base,id:'kypseli-sunday-he',name:'The Kypseli Tapes — new tape tonight (Hebrew)',audience:'israel',href:TAPES,alt:'קלטת חדשה הערב ב־19:00 — The Kypseli Tapes. לצפייה.',...art('kypseli-sunday-he'),
  targeting:every,days:[0],fromHour:8,toHour:19,weight:40,maxPerDay:2,note:'Sundays 08:00–19:00 Athens, before the weekly premiere.'},
 {...base,id:'kypseli-sunday-en',name:'The Kypseli Tapes — new tape tonight (English)',audience:'world',href:TAPES,alt:'New tape tonight, 19:00 Athens — The Kypseli Tapes. Watch.',...art('kypseli-sunday-en'),
  targeting:every,days:[0],fromHour:8,toHour:19,weight:40,maxPerDay:2,note:'Sundays 08:00–19:00 Athens, before the weekly premiere.'},
]
export const SEED_DOC:PromoDoc={v:1,settings:{enabled:true,delaySec:3,showSec:7,gapSec:45,maxPerSession:3,pageRules:[]},banners:[...SEED_BANNERS,...SEED_ADDED,...SEED_BOOK],audit:[]}
