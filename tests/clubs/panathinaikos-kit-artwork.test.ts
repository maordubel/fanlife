import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'

type Shirt = {id: string; shirt: {artwork?: {centralPanel: {x: number; width: number}; crestSrc: string; sponsorSrc: string}}}
const archive = JSON.parse(readFileSync('content/manual/kit-archive-panathinaikos.json', 'utf8')) as {kits: Shirt[]}

describe('Panathinaikos 2024/25 home illustration', () => {
 it('applies the referenced central panel and specific marks to exactly one archive record', () => {
  const directed = archive.kits.filter(kit => kit.shirt.artwork)
  expect(directed.map(kit => kit.id)).toEqual(['cof-k-56'])
  const art = directed[0]!.shirt.artwork!
  expect(art.centralPanel).toEqual({x: 124, width: 92})
  for (const src of [art.crestSrc, art.sponsorSrc]) {
   const asset = readFileSync('public' + src, 'utf8')
   expect(asset).toContain('<svg')
   expect(asset).not.toMatch(/<script|<foreignObject|https?:\/\/(?!www\.w3\.org)/i)
  }
 })
 it('exports a standalone SVG with the directed geometry and both embedded vector marks', () => {
  const script = `
   const fs = require('fs');
   const src=fs.readFileSync('scripts/kits/kit-render.js','utf8');
   const SPONSOR_TYPE=JSON.parse(fs.readFileSync('content/manual/sponsor-type.json','utf8'));
   const MARKS=JSON.parse(fs.readFileSync('content/manual/maker-marks.json','utf8'));
   const RESOLVE=(path)=>'data:image/svg+xml;base64,'+fs.readFileSync('public'+path).toString('base64');
   const kit=JSON.parse(fs.readFileSync('content/manual/kit-archive-panathinaikos.json','utf8')).kits.find(x=>x.id==='cof-k-56');
   process.stdout.write(new Function('RESOLVE','SPONSOR_TYPE','MARKS',src+';return kitSVG')(RESOLVE,SPONSOR_TYPE,MARKS)(kit,'test'));
  `
  const svg = execFileSync(process.execPath, ['-e', script], {encoding: 'utf8'})
  expect(svg).toContain('x="124" y="20" width="92"')
  expect(svg).toContain('M111 30Q79 38 56 61')
  expect(svg.match(/data:image\/svg\+xml;base64,/g)).toHaveLength(2)
  expect(svg).not.toContain('STOIXIMAN</text>')
 })
})
