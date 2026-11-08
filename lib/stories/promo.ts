import {StoryError,type Brief} from './jobs'

/**
 * MARKETING FILMS (owner, 8.11.2026): "the marketing area makes marketing films on different subjects — one of the site's
 * features, our YouTube channel, a film we produced, or something standalone — in their own language, branded, pure
 * marketing." A promo is a vertical cut-out cartoon (studio/cartoon) of 20–30 seconds with its own script, written by the
 * promo writer (studio/promo.py) from the FACTS below and nothing else: a number the facts do not hold is never said.
 *
 * The facts are the products' own published descriptions (the YouTube descriptions of the trailers already on the
 * channel and the feature switches' text) — a change to a game is a change here.
 */
export type PromoAbout='feature'|'channel'|'film'|'free'
export type PromoSubject={id:string;label:string;facts:string;url:string}
export const PROMO_SUBJECTS:PromoSubject[]=[
 {id:'trivia',label:'Trivia — every club’s own quiz',url:'https://fanlife.dubelteam.com',
  facts:'Every club on FAN LIFE has its own trivia wing, written from that club’s own history. Twelve questions in three stages, every stage harder than the last. Three lives; a wrong answer costs one. Answer quickly and the combo grows, up to four times. Four levels, from easy to expert.'},
 {id:'legends-manager',label:'LEGENDS MANAGER — manage your club’s legends',url:'https://fanlife.dubelteam.com',
  facts:'One club, only the men who wore its shirt. Draft seventeen legends from the club’s whole history (two goalkeepers, six defenders, six midfielders, three forwards) on a budget the board draws with a lever, between 50 and 52 million euros. Before every pick you choose the line; three men are offered: premium, squad and bargain. Three rerolls for the whole draft.'},
 {id:'royal-rumble',label:'Royal Rumble — your club’s all-time five',url:'https://fanlife.dubelteam.com',
  facts:'Pick your club; every player it has ever had is in the deck. Choose a position, three cards land — a premium, a mid-price and a bargain — and you take one. Five-a-side for 15 million euros, or the full eleven for about 35 million. Three rerolls for the whole draft. Your five walk out against another five from your own club, then they play. Send a mate the link: same deck.'},
 {id:'life',label:'LIFE — a supporter’s life at your club',url:'https://fanlife.dubelteam.com',
  facts:'LIFE is a life simulation of a supporter at your club: you grow up with the club, live the real nights from its archive, and make the choices of a fan’s life — the friends, the away days, the matches you were at.'},
 {id:'archive',label:'The club archive — scorers, line-ups, results',url:'https://fanlife.dubelteam.com',
  facts:'Each club on FAN LIFE has its own archive: results over the years, scorers, line-ups and the kits, sourced match by match. Every fact on the site carries its source.'},
 {id:'kits',label:'The kit archive and the closet',url:'https://fanlife.dubelteam.com',
  facts:'Every shirt in a club’s kit archive is taken apart into its layers — the body, the sleeves, the sponsor, the maker and the crest. Assemble a shirt in the game and it enters your closet; mark the shirts you own.'},
 {id:'all-football',label:'ALL FOOTBALL — every club in one game',url:'https://fanlife.dubelteam.com',
  facts:'ALL FOOTBALL is the cross-club space on the FAN LIFE hub: trivia, timeline and memory games drawn from every published club.'},
 {id:'hub',label:'FAN LIFE — the place football still belongs to the fans',url:'https://fanlife.dubelteam.com',
  facts:'FAN LIFE is a home for football supporters of many clubs: each club gets its own gates — an archive, games, a quiz, a kit archive and LIFE — built from its own history. The slogan: Football. Forever.'},
]
export const CHANNEL_FACTS='FanLife: Football Stories is a YouTube channel that tells club football the way supporters lived it. Documentaries cover whole seasons, cup runs, European nights and derbies; CLASSIFIED opens the strange files of football history; I WAS THERE is a matchday diary filmed from the stand. Scores, dates and tables come from a sourced match archive, with the sources under each video.'
export const PROMO_SECONDS=[20,30] as const
export type PromoSpec={about:PromoAbout;subject:string;label:string;facts:string;url:string;seconds:number;angle:string;telegram:boolean}

const clean=(v:unknown,max:number)=>typeof v==='string'?v.replace(/\r/g,'').trim().slice(0,max):''

/** `films` are the finished films the studio can name (id → title and its own description). */
export function validatePromo(v:unknown,films:Map<string,{title:string;description:string;url:string}>):{brief:Brief;spec:PromoSpec}{
 if(!v||typeof v!=='object')throw new StoryError('BRIEF','Choose what the marketing film is about.')
 const b=v as Record<string,unknown>
 const about=b.about as PromoAbout
 if(!['feature','channel','film','free'].includes(about))throw new StoryError('BRIEF','Choose what the marketing film is about.')
 const seconds=b.seconds===undefined?30:Number(b.seconds)
 if(!(PROMO_SECONDS as readonly number[]).includes(seconds))throw new StoryError('BRIEF','Length: 20 or 30 seconds.')
 const angle=clean(b.angle,400)
 let subject='',label='',facts='',url='https://www.youtube.com/@FanLifeFootballStories'
 if(about==='feature'){
  const f=PROMO_SUBJECTS.find(x=>x.id===b.subject)
  if(!f)throw new StoryError('BRIEF','Choose a feature from the list.')
  subject=f.id;label=f.label;facts=f.facts;url=f.url
 }else if(about==='channel'){
  subject='channel';label='The YouTube channel';facts=CHANNEL_FACTS
 }else if(about==='film'){
  const id=clean(b.subject,80),f=films.get(id)
  if(!f)throw new StoryError('BRIEF','Choose a finished film from the list.')
  subject=id;label=f.title;facts=`${f.title}. ${f.description}`.slice(0,2400);url=f.url||url
 }else{
  facts=clean(b.facts,2400)
  if(facts.length<40)throw new StoryError('BRIEF','Write what the film should say (at least a few sentences): the promo says only what you write here.')
  subject='free';label=clean(b.label,80)||'A FAN LIFE promo'
 }
 const spec:PromoSpec={about,subject,label,facts,url,seconds,angle,telegram:b.telegram!==false}
 const brief:Brief={club_id:'promo',club_name:'FAN LIFE',season:'MARKETING',topic:label,duration:seconds/60,visual_style:'mixed',
  voice:'kokoro',review:'auto',privacy:'private',publish_at:null,scripts:1,choice:null,drive:false,reel_to_telegram:spec.telegram,art:[],hold:false}
 return {brief,spec}
}
