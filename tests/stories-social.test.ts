import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {newJob,ownerAct,StoryError,type Job} from '@/lib/stories/jobs'
import {LIMITS,MAX_POSTS,PLATFORMS,captionLength,claimSocial,cleanLights,compose,dueSocial,socialDue,hashtagCount,resultSocial,scheduleSocial,socialTags,textProblem,SocialError} from '@/lib/stories/social'
// @ts-expect-error — plain ESM runner, no types
import {config,lights,oauth1,packMessage,redactor,tiktokChunks} from '../scripts/football-stories/publish/social.mjs'

const now=new Date('2026-11-04T08:00:00Z')
const palette={club_id:'aek-athens',club_name:'AEK Athens',primary:'#15130F',on_primary:'#FFFFFF',bans:[]}
function film(over:Partial<Job>={}):Job{
 const j=newJob('0f1e2d3c-aaaa-bbbb-cccc-000000000001',{club_id:'aek-athens',club_name:'AEK Athens',season:'2002/03',topic:'',duration:5,visual_style:'collage',voice:'auto',review:'auto',privacy:'private',publish_at:null,kind:'match',tone:'auto'},palette,'owner','key-12345678',now)
 return {...j,state:'ready',stage:'done',progress:1,
  artefacts:{master:{chunks:[{path:'jobs/x/master.000.part',bytes:10}],bytes:10,sha256:'s'},thumbnails:[{path:'jobs/x/thumbnail-1.jpg',bytes:5}],shorts:[{path:'jobs/x/short-1.mp4',bytes:9,hook:'The night Madrid went quiet',seconds:42}]},
  youtube:{title:'AEK 3–3 Real Madrid: The Night Athens Believed',synthetic_media:{altered_or_synthetic:true}},...over}
}
const at=(min:number)=>new Date(now.getTime()+min*60_000).toISOString()

describe('Social — the composer follows the marketing rules',()=>{
 it('every platform: within its limit, smart tags, the link only in the first comment',()=>{
  const j=film({upload:{state:'done',videoId:'abcdefghijk',visibility:'public',publishAt:null,at:null,by:null,note:null}})
  for(const p of PLATFORMS){
   const d=compose(j,p)
   expect(captionLength(p,d.caption)).toBeLessThanOrEqual(LIMITS[p].caption)
   expect(textProblem(p,d.caption,d.comment)).toBeNull()
   expect(d.caption).not.toMatch(/https?:\/\//)
   // X: no link at all (a post with a link is billed many times over — PR #385); the bio carries it
   if(p==='x')expect(d.comment).not.toMatch(/https?:\/\//);else expect(d.comment).toContain('https://youtu.be/abcdefghijk')
   expect(d.tags[0]).toBe('#FootballStories')
   expect(d.caption).toContain('#FootballStories')
   expect(d.tags.length).toBeLessThanOrEqual(LIMITS[p].tags)
  }
  expect(compose(j,'instagram').caption).toContain('The night Madrid went quiet')
  expect(socialTags(j,'instagram')).toEqual(expect.arrayContaining(['#AEK','#FANLIFE']))
  expect(hashtagCount(compose(j,'instagram').caption)).toBeLessThanOrEqual(8)
 })
 it('before YouTube has the film, posts point at the channel — never at a link that does not exist',()=>{
  const d=compose(film(),'facebook')
  expect(d.linkIsFilm).toBe(false)
  expect(d.comment).toContain('youtube.com/@FanLifeFootballStories')
  expect(d.comment).not.toContain('youtu.be')
 })
 it('X counts every link as 23 and a long hook is cut, never the tags',()=>{
  const j=film({artefacts:{...film().artefacts!,shorts:[{path:'jobs/x/short-1.mp4',bytes:9,hook:'A'.repeat(400),seconds:30}]}})
  const d=compose(j,'x')
  expect(captionLength('x',d.caption)).toBeLessThanOrEqual(280)
  expect(d.caption).toMatch(/#FootballStories/)
  expect(captionLength('x','see https://example.com/a/very/long/path/that/goes/on')).toBe(4+23)
 })
 it('a club without its own tag list gets its name as a tag',()=>{
  const j=film();j.brief={...j.brief,club_id:'raja-casablanca',club_name:'Raja Casablanca'}
  expect(socialTags(j,'instagram')).toContain('#RajaCasablanca')
 })
 it('TikTok and Instagram need a file; TikTok a Short',()=>{
  const j=film({artefacts:{...film().artefacts!,shorts:[]}})
  expect(compose(j,'tiktok').media).toBeNull()
  expect(()=>scheduleSocial(j,[{platform:'tiktok',when:'now',caption:'x',media:null}],'owner',now)).toThrow(/Short/)
  expect(()=>scheduleSocial(j,[{platform:'instagram',when:'now',caption:'x',media:null}],'owner',now)).toThrow(/Instagram needs/)
  expect(()=>scheduleSocial(j,[{platform:'tiktok',when:'now',caption:'x',media:{kind:'thumbnail',index:0}}],'owner',now)).toThrow(/Short/)
 })
})

describe('Social — the owner schedules and cancels',()=>{
 it('schedules now or later, validated, stored on the job',()=>{
  const j=scheduleSocial(film(),[{platform:'instagram',when:'now',caption:'Hook #FootballStories',comment:'▶ link',media:{kind:'short',index:0}},{platform:'x',when:'2026-11-04T10:30:00+02:00',caption:'Hook'}],'owner',now)
  expect(j.social!.posts).toHaveLength(2)
  expect(j.social!.posts[0]).toMatchObject({platform:'instagram',state:'scheduled',dueAt:now.toISOString()})
  expect(j.social!.posts[1]!.dueAt).toBe('2026-11-04T08:30:00.000Z')
 })
 it('refuses what cannot go out',()=>{
  const f=film()
  expect(()=>scheduleSocial({...f,state:'running'},[{platform:'x',when:'now',caption:'a'}],'owner',now)).toThrow(/finished/)
  expect(()=>scheduleSocial({...f,artefacts:null},[{platform:'x',when:'now',caption:'a'}],'owner',now)).toThrow(/finished/)
  expect(()=>scheduleSocial(f,[{platform:'myspace',when:'now',caption:'a'}],'owner',now)).toThrow(/platform/)
  expect(()=>scheduleSocial(f,[{platform:'x',when:at(1),caption:'a'}],'owner',now)).toThrow(/two minutes/)
  expect(()=>scheduleSocial(f,[{platform:'x',when:'2026-11-04 10:00',caption:'a'}],'owner',now)).toThrow(/time zone/)
  expect(()=>scheduleSocial(f,[{platform:'x',when:at(61*24*60),caption:'a'}],'owner',now)).toThrow(/sixty/)
  expect(()=>scheduleSocial(f,[{platform:'x',when:'now',caption:'a'.repeat(281)}],'owner',now)).toThrow(/280/)
  expect(()=>scheduleSocial(f,[{platform:'x',when:'now',caption:'  '}],'owner',now)).toThrow(/empty/)
  expect(()=>scheduleSocial(f,[{platform:'instagram',when:'now',caption:Array.from({length:31},(_,i)=>`#t${i}`).join(' '),media:{kind:'thumbnail',index:0}}],'owner',now)).toThrow(/30 hashtags/)
  expect(()=>scheduleSocial(f,[{platform:'x',when:'now',caption:'a',media:{kind:'short',index:7}}],'owner',now)).toThrow(/not part/)
  const many=Array.from({length:MAX_POSTS+1},(_,i)=>({platform:'x',when:at(10+i),caption:`p${i}`}))
  expect(()=>scheduleSocial(f,many,'owner',now)).toThrow(/At most 20/)
 })
 it('a double click is one post',()=>{
  const one=scheduleSocial(film(),[{platform:'x',when:'now',caption:'same'}],'owner',now)
  expect(()=>scheduleSocial(one,[{platform:'x',when:'now',caption:'same'}],'owner',new Date(now.getTime()+5000))).toThrow(/already/)
 })
 it('goes through ownerAct as a StoryError, and cancel removes only what has not gone out',()=>{
  expect(()=>ownerAct(film({state:'queued',artefacts:null}),{action:'social_schedule',posts:[{platform:'x',when:'now',caption:'a'}]},'owner',now)).toThrow(StoryError)
  let j=ownerAct(film(),{action:'social_schedule',posts:[{platform:'x',when:at(30),caption:'a'}]},'owner',now)
  const id=j.social!.posts[0]!.id
  j=claimSocial({...j,social:{posts:j.social!.posts.map(p=>({...p,dueAt:now.toISOString()}))}},id,'social-1',now)
  expect(()=>ownerAct(j,{action:'social_cancel',id},'owner',now)).toThrow(/being sent/)
  j=resultSocial(j,id,'social-1',{state:'sent',result:'post 1',url:'https://x.com/i/web/status/1'},now)
  expect(()=>ownerAct(j,{action:'social_cancel',id},'owner',now)).toThrow(/already published/)
  const k=ownerAct(film(),{action:'social_schedule',posts:[{platform:'x',when:at(30),caption:'b'}]},'owner',now)
  expect(ownerAct(k,{action:'social_cancel',id:k.social!.posts[0]!.id},'owner',now).social!.posts).toHaveLength(0)
 })
})

describe('Social — the runner takes each post once',()=>{
 it('due → claim → result; a second claim and a stranger\'s result are refused',()=>{
  let j=scheduleSocial(film(),[{platform:'facebook',when:'now',caption:'a'},{platform:'x',when:at(60),caption:'b'}],'owner',now)
  const due=dueSocial([j],new Date(now.getTime()+1000))
  expect(due).toEqual([{jobId:j.id,postId:j.social!.posts[0]!.id,platform:'facebook'}])
  // the listener's peek: true only while a scheduled post's time has come
  expect(socialDue([film()],now)).toBe(false)
  expect(socialDue([film(),j],new Date(now.getTime()+1000))).toBe(true)
  const later=scheduleSocial(film(),[{platform:'x',when:at(60),caption:'b'}],'owner',now)
  expect(socialDue([later],new Date(now.getTime()+59*60_000))).toBe(false)
  expect(socialDue([later],new Date(now.getTime()+61*60_000))).toBe(true)
  const id=due[0]!.postId
  expect(()=>claimSocial(j,j.social!.posts[1]!.id,'w',now)).toThrow(/not due/)
  j=claimSocial(j,id,'social-9',now)
  expect(()=>claimSocial(j,id,'social-10',now)).toThrow(SocialError)
  expect(dueSocial([j],new Date(now.getTime()+1000))).toEqual([])
  expect(socialDue([j],new Date(now.getTime()+1000))).toBe(false)   // a post being sent does not start a second runner
  expect(()=>resultSocial(j,id,'social-10',{state:'sent'},now)).toThrow(/does not hold/)
  expect(()=>resultSocial(j,id,'social-9',{state:'published'},now)).toThrow(/Invalid/)
  j=resultSocial(j,id,'social-9',{state:'manual',result:'pack sent',url:'javascript:alert(1)'},now)
  expect(j.social!.posts[0]).toMatchObject({state:'manual',url:null,result:'pack sent'})
  expect(()=>resultSocial(j,id,'social-9',{state:'sent'},now)).toThrow(/does not hold/)
 })
 it('the lights carry yes/no only',()=>{
  expect(cleanLights({facebook:true,x:'yes',token:'abc',autopublish:true},now)).toEqual({at:now.toISOString(),autopublish:true,telegram:false,facebook:true,instagram:false,x:false,tiktok:false})
  expect(cleanLights(null)).toBeNull()
 })
})

describe('Social — the publishing script',()=>{
 it('signs X requests exactly as OAuth 1.0a says (Twitter\'s published example)',()=>{
  const h=oauth1('POST','https://api.twitter.com/1.1/statuses/update.json?include_entities=true',
   {key:'xvz1evFS4wEEPTGEFPHBog',secret:'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw',token:'370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',tokenSecret:'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE'},
   {status:'Hello Ladies + Gentlemen, a signed OAuth request!'},'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg',1318622958)
  expect(h).toContain('oauth_signature="hCtSmYh%2BiHYCEqBWrE7C7hYmtUk%3D"')
 })
 it('nothing publishes without the switch AND the secrets; lights are booleans',()=>{
  const off=lights(config({META_PAGE_ID:'123',META_PAGE_TOKEN:'t'.repeat(60),X_API_KEY:'k'}))
  expect(off).toEqual({autopublish:false,telegram:false,facebook:true,instagram:false,x:false,tiktok:false})
  const on=lights(config({STORIES_SOCIAL_AUTOPUBLISH:'1',TIKTOK_ACCESS_TOKEN:'tok'}))
  expect(on.autopublish).toBe(true);expect(on.tiktok).toBe(true);expect(on.facebook).toBe(false)
  expect(Object.values(on).every(v=>typeof v==='boolean')).toBe(true)
 })
 it('never prints a secret',()=>{
  const r=redactor(config({META_PAGE_TOKEN:'SECRETSECRET-page-token',TELEGRAM_BOT_TOKEN:'123:bot-secret-value'}))
  expect(r(new Error('bad token SECRETSECRET-page-token at https://api.telegram.org/bot123:bot-secret-value/x'))).not.toMatch(/SECRETSECRET|bot-secret/)
 })
 it('TikTok chunks: one up to 64 MB, then 10 MB with the remainder in the last',()=>{
  expect(tiktokChunks(9e6)).toEqual({chunk:9e6,count:1})
  expect(tiktokChunks(100*1024*1024)).toEqual({chunk:10*1024*1024,count:10})
 })
 it('the Telegram pack: a header, the caption and the first comment in copy boxes, HTML escaped',()=>{
  const m=packMessage({platform:'instagram',dueAt:now.toISOString(),caption:'<b>AEK</b> & Real',comment:'▶ https://youtu.be/abcdefghijk',media:{kind:'short',index:0}},{title:'AEK v Real'},'Automatic publishing is off')
  expect(m).toMatch(/^📌 Reel · <b>FOOTBALL STORIES<\/b> · Instagram/)
  expect(m).toContain('<pre>&lt;b&gt;AEK&lt;/b&gt; &amp; Real</pre>')
  expect(m).toContain('<pre>▶ https://youtu.be/abcdefghijk</pre>')
  expect(m.length).toBeLessThanOrEqual(4096)
 })
 it('the workflow keeps every secret in secrets and never echoes one',()=>{
  const y=readFileSync('.github/workflows/stories-social.yml','utf8')
  for(const s of ['META_PAGE_TOKEN','X_API_KEY','X_API_SECRET','X_ACCESS_TOKEN','X_ACCESS_SECRET','TIKTOK_ACCESS_TOKEN','TELEGRAM_BOT_TOKEN','FAN_LIFE_CRON_SECRET'])expect(y).toContain(`${s}: \${{ secrets.${s} }}`)
  expect(y).toContain('STORIES_SOCIAL_AUTOPUBLISH: ${{ vars.STORIES_SOCIAL_AUTOPUBLISH }}')
  expect(y).not.toMatch(/echo .*secrets\./)
 })
})

describe('Social — the owner adds his own Reel to a finished film (10.11.2026)',()=>{
 const id='0f1e2d3c-aaaa-bbbb-cccc-000000000001'
 it('joins the film\'s Shorts and can be scheduled on Instagram and Facebook',()=>{
  const j=ownerAct(film(),{action:'reel_added',name:'reel-hta-zito-mh1.mp4',bytes:4_000_000,seconds:29.4,hook:'0–1 down. Then Zito.'},'owner',now)
  const r=j.artefacts!.shorts!.at(-1)!
  expect(r).toMatchObject({path:`jobs/${id}/reel-hta-zito-mh1.mp4`,seconds:29.4,hook:'0–1 down. Then Zito.',title:'Your Reel'})
  const s=scheduleSocial(j,[{platform:'instagram',when:at(60),caption:'x #FootballStories',comment:'',media:{kind:'short',index:1}}],'owner',now)
  expect(s.social!.posts[0]!.media).toEqual({kind:'short',index:1})
 })
 it('refuses a bad name, a big file, a wrong length, a duplicate, an unfinished film',()=>{
  const add=(j:Job,over:object={})=>ownerAct(j,{action:'reel_added',name:'reel-a.mp4',bytes:10,seconds:20,hook:'',...over} as never,'owner',now)
  expect(()=>add(film(),{name:'../x.mp4'})).toThrow(StoryError)
  expect(()=>add(film(),{name:'short-1.mp4'})).toThrow(StoryError)
  expect(()=>add(film(),{bytes:46*1024*1024})).toThrow(StoryError)
  expect(()=>add(film(),{seconds:1})).toThrow(StoryError)
  expect(()=>add(add(film()))).toThrow(/already/)
  expect(()=>add(film({state:'running'}))).toThrow(/finished/)
 })
 it('the plan\'s Facebook/Instagram switch also follows the films switch',()=>{
  const wf=readFileSync('.github/workflows/marketing-telegram.yml','utf8')
  expect(wf).toContain('META_AUTOPUBLISH: ${{ vars.META_AUTOPUBLISH || vars.STORIES_SOCIAL_AUTOPUBLISH }}')
 })
})
