import {readFileSync,readdirSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {SCHEDULES} from '@/lib/master/schedules'

describe('the desk lists the schedules the workflows actually have',()=>{
 it('every scheduled workflow is listed with its exact cron, and nothing else',()=>{
  const real=readdirSync('.github/workflows').flatMap(f=>[...readFileSync(`.github/workflows/${f}`,'utf8').matchAll(/cron:\s*'([^']+)'/g)].map(m=>`${f} ${m[1]}`)).sort()
  expect(SCHEDULES.map(s=>`${s.workflow} ${s.cron}`).sort()).toEqual(real)
 })
})
