import {afterEach,describe,expect,it,vi} from 'vitest'
import {pictureName,uploadPictures,validatePictures} from '@/lib/stories/pictureUpload'
import {ART_NAME,claim,newJob,ownerAct,report,validateBrief} from '@/lib/stories/jobs'

afterEach(()=>vi.unstubAllGlobals())
const file=(name:string,data='pixels')=>new File([data],name,{type:'image/png'})

describe('Required studio pictures',()=>{
 it('keeps different same-name uploads and non-Latin filenames distinct',async()=>{
  const names=await Promise.all([file('image.png','one'),file('image.png','two'),file('תמונה.png'),file('εικόνα.png','other')].map(pictureName))
  expect(new Set(names).size).toBe(4)
  expect(names.every(n=>ART_NAME.test(n))).toBe(true)
  expect(await pictureName(file('image.png','one'))).toBe(names[0])
 })
 it('rejects the whole batch instead of silently dropping bad files',()=>{
  expect(()=>validatePictures([file('good.png'),file('bad.pdf')])).toThrow('bad.pdf')
  expect(()=>validatePictures([file('empty.png','')])).toThrow('empty.png')
  expect(()=>validatePictures(Array.from({length:31},()=>file('image.png')))).toThrow('30')
 })
 it('records the selection only after every PUT succeeds and preserves original names',async()=>{
  const files=[file('צילום.png'),file('goal.png')]
  const names=await Promise.all(files.map(pictureName))
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({urls:Object.fromEntries(names.map(n=>[n,`https://storage.test/${n}`]))}))
   .mockResolvedValueOnce(new Response('')).mockResolvedValueOnce(new Response('')).mockResolvedValueOnce(Response.json({}))
  vi.stubGlobal('fetch',fetcher)
  await uploadPictures('job123',files,true,()=>{})
  expect(fetcher.mock.calls.map(c=>c[1].method)).toEqual(['POST','PUT','PUT','POST'])
  expect(JSON.parse(fetcher.mock.calls[3]![1].body)).toEqual({action:'art_added',files:names.map((name,i)=>({name,originalName:files[i]!.name,illustrated:true}))})
 })
 it('does not record or resume an incomplete upload',async()=>{
  const f=file('goal.png'),name=await pictureName(f)
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({urls:{[name]:'https://storage.test/picture'}}))
   .mockResolvedValueOnce(new Response('',{status:500}))
  vi.stubGlobal('fetch',fetcher)
  await expect(uploadPictures('job123',[f],true,()=>{})).rejects.toThrow('stays paused')
  expect(fetcher).toHaveBeenCalledTimes(2)
 })
 it('waits for the running worker to acknowledge pause before accepting pictures',()=>{
  const brief=validateBrief({club_id:'hapoel-tel-aviv',season:'1999/00',duration:5},new Map([['hapoel-tel-aviv','Hapoel Tel Aviv']]))
  const palette={club_id:'hapoel-tel-aviv',club_name:'Hapoel Tel Aviv',primary:'#B02D10',on_primary:'#FFFFFF',bans:['yellow']}
  const j=claim(newJob('job-0000001',brief,palette,'owner','key-00000001'),'worker')
  const paused=ownerAct(j,{action:'pause'},'owner')
  const action={action:'art_added' as const,files:[{name:'goal.png',originalName:'שער.png',illustrated:false}]}
  expect(()=>ownerAct(paused,action,'owner')).toThrow('still stopping')
  const stopped=report(paused,'worker',{stage:'script',progress:.1,message:'stopping'}).job
  const added=ownerAct(stopped,action,'owner')
  expect(added.brief.art).toEqual(action.files)
  expect(added.state).toBe('paused')
 })
})
