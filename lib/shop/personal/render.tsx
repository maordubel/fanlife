import 'server-only'
import {ImageResponse} from 'next/og'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {ogFonts} from '@/lib/og/fonts'
import {XIPoster,type XIPrintSpec} from './xi-poster'

let seal:Promise<string>|null=null
/** the FAN LIFE seal in one ink: a club's print never carries another colour than its own */
const sealUri=()=>seal??=readFile(join(process.cwd(),'public/brand/fanlife/seal-mono-512.png')).then(b=>`data:image/png;base64,${b.toString('base64')}`)
export const PRINT={w:3600,h:4800}
/** the XI print as a PNG: k=3 → 3600×4800 for the printer, k=0.6 → 720×960 for the proof on screen */
export async function renderXI(spec:XIPrintSpec,k:number):Promise<ImageResponse>{
 return new ImageResponse(<XIPoster spec={spec} k={k} seal={await sealUri()}/>,{width:Math.round(1200*k),height:Math.round(1600*k),fonts:await ogFonts()})
}
