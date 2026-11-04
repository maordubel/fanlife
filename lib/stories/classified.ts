import 'server-only'
import {readFile,readdir} from 'node:fs/promises'
import path from 'node:path'
import {classifiedIndex,type Manifest} from './classifiedIndex'
import type {ClassifiedFile} from './jobs'

/** The CLASSIFIED episodes and the panel map, read from the repository at request time (traced into the studio's
 *  routes by next.config.mjs; a commit that changes them always builds — scripts/vercel/should-build.mjs). A missing
 *  folder answers null ("not readable here"), never an empty list that would look like "no FILEs". */
const DIR=path.join(process.cwd(),'scripts','football-stories','comic')
export async function readClassified():Promise<ClassifiedFile[]|null>{
 try{
  const manifest=JSON.parse(await readFile(path.join(DIR,'classified_manifest.json'),'utf8')) as Manifest
  const names=(await readdir(path.join(DIR,'episodes'))).filter(n=>n.endsWith('.json'))
  const episodes=await Promise.all(names.map(async name=>({name,json:JSON.parse(await readFile(path.join(DIR,'episodes',name),'utf8')) as unknown})))
  return classifiedIndex(manifest,episodes)
 }catch{return null}
}
