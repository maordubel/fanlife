import {hash} from '@/lib/clubs/rumble-rng'
import type {Answer,Target,TalkCtx} from './talks'
import {fill} from './talks'

/**
 * The press (owner, 14.10.2026): now and then a newspaper asks the manager one question about the match just played, with four
 * answers (and "no comment"). Each answer moves the club's mood and sometimes a group of men — through the same bounded
 * `applyTalk` as the dressing room, so a press answer can never be worth more than a team talk. The question depends on the
 * league situation; whether one comes at all is a seeded draw.
 */
export type PressQ={id:string;paper:string;head:string;test:(c:TalkCtx)=>boolean;tier:number;answers:readonly [PressA,PressA,PressA,PressA]}
export type PressA=Pick<Answer,'line'|'reaction'|'team'>&{men?:{who:Target;d:number}}
const P=(id:string,tier:number,test:(c:TalkCtx)=>boolean,paper:string,head:string,...answers:[PressA,PressA,PressA,PressA]):PressQ=>({id,paper,head,test,tier,answers})
const a=(line:string,reaction:string,team:number,men?:{who:Target;d:number}):PressA=>({line,reaction,team,...(men?{men}:{})})

export const PRESS:readonly PressQ[]=[
 P('title-race',4,c=>c.result==='W'&&c.place<=2&&c.gapTop<=3,'The Sunday Edition','“{club} are in the title race. Are you ready to say it?”',
  a('“We are. Write it down.”','The hall hears it and stands taller.',1,{who:'xi',d:1}),a('“One game at a time.”','Safe — and nobody minds.',0),a('“The table is the press’s toy.”','A shrug in the dressing room.',-0.5),a('“Ask me in May.”','Cool heads, a little less fire.',0.5)),
 P('slump',4,c=>c.result==='L'&&c.form.slice(-2).every(r=>r==='L'),'The Evening Standard','“Two defeats running. Is your job under threat?”',
  a('“I back my men to the hilt.”','They notice who stood up for them.',1,{who:'xi',d:1}),a('“The responsibility is mine.”','A heavy line — but a fair one.',0.5),a('“Some of them must look in the mirror.”','Heads go down.',-1,{who:'xi',d:-1}),a('“No job talk. Next match.”','The room tightens up.',0)),
 P('comeback',3,c=>c.comeback,'The Matchday Mail','“From behind to the win — what did you say at half-time?”',
  a('“Nothing. They did it themselves.”','Pride in the dressing room.',1,{who:'scorers',d:1}),a('“I told them the truth.”','A smile — they remember.',0.5),a('“A lot, none of it printable.”','Laughter and a little fire.',0.5),a('“We were lucky, to be honest.”','Honest, and it stings a bit.',-0.5)),
 P('thrown',3,c=>c.threw,'The Terrace Voice','“You were ahead and let it go. Who is to blame?”',
  a('“All of us, me first.”','Blame shared; no one is singled out.',0.5),a('“A few concentration lapses.”','The back line hears it.',-0.5,{who:'xi',d:-0.5}),a('“Football happens.”','Easy words, easy room.',0),a('“We will fix it on Monday.”','A promise of work.',0.5)),
 P('red-card',3,c=>c.reds>0,'The Referee’s Friend','“A red card again. Is the discipline out of hand?”',
  a('“He knows. We will talk.”','Private words, no public shame.',0.5),a('“The referee decided the match.”','Fire — and a fine line.',-0.5,{who:'xi',d:0.5}),a('“Never in doubt, that decision.”','Honest — and the man is hurt.',-1,{who:'reds',d:-1}),a('“No comment.”','Quiet in the tunnel.',0)),
 P('clean-sheet',2,c=>c.cleanSheet&&c.result!=='L','The Back Page','“A clean sheet. Is the defence the best in the league?”',
  a('“It is. Give them credit.”','The back line grows two inches.',1,{who:'xi',d:0.5}),a('“Credit the whole team.”','Everybody gets a share.',0.5),a('“We have not met the good strikers yet.”','Modest, careful.',0),a('“Keep writing it.”','They enjoy the headline.',0.5)),
 P('big-win',2,c=>c.result==='W'&&c.margin>=3,'The Goal Post','“A thrashing. Are you sending a message to the others?”',
  a('“We are sending it, loud and clear.”','They swagger.',1,{who:'scorers',d:1}),a('“It is three points, nothing more.”','Feet back on the ground.',0),a('“The rest is up to them.”','A quiet nod.',0.5),a('“I will not gloat.”','Respect — and a little less buzz.',0)),
 P('relegation',2,c=>c.place>=c.of-1&&c.of>=4,'The Worrier','“You are near the bottom. Are you afraid?”',
  a('“Afraid? I have men I trust.”','Backs straighten.',1,{who:'xi',d:1}),a('“We know what is at stake.”','A serious room.',0.5),a('“Yes. Everyone should be.”','Honest — and nervy.',-1),a('“Let us win and see.”','Short and sharp.',0)),
 P('general',1,()=>true,'The Weekly Sports','“Describe your team in one word.”',
  a('“Hungry.”','Eyes light up.',1,{who:'xi',d:0.5}),a('“Unfinished.”','They take it as a challenge.',0.5),a('“Tired.”','The room looks at the floor.',-0.5),a('“Mine.”','Pride, a little confusion.',0.5)),
]
/** the question for a post-match context, or none: a seeded draw (about one match in three), the most specific that applies */
export function pressFor(ctx:TalkCtx,seed:string):PressQ|null{
 if(hash(`${seed}:ask`)%100>=34)return null
 const pool=PRESS.filter(q=>q.test(ctx)),top=Math.max(...pool.map(q=>q.tier)),best=pool.filter(q=>q.tier===top)
 return best[hash(seed)%best.length]??null
}
export const pressById=(id:string)=>PRESS.find(q=>q.id===id)??null
export const pressFill=(q:string,c:Pick<TalkCtx,'club'|'opp'>)=>fill(q,c)
