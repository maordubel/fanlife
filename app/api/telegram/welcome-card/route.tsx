/* eslint-disable @next/next/no-img-element -- ImageResponse renders embedded image bytes, not a browser page. */
import words from '@/messages/telegram/en.json'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const revalidate = 86400
let rendered: Promise<ArrayBuffer> | undefined

/** The existing Weekly artwork, original seal and house ink tokens, rendered as a public Telegram photo. */
async function render() {
  const [css, font, logo, drawing] = await Promise.all([
    readFile(join(process.cwd(), 'app/magazine.css'), 'utf8'),
    readFile(join(process.cwd(), 'lib/og/fonts/archivo-latin-800.ttf')),
    readFile(join(process.cwd(), 'public/brand/fanlife/logo-192.png')),
    readFile(join(process.cwd(), 'public/brand/weekly/plates/cheer-line.webp')),
  ])
  const ink = (name: string) => {
    const color = css.match(new RegExp(`--mag-${name}:\\s*(#[a-fA-F0-9]{6});`))?.[1]
    if (!color) throw new Error('Missing Weekly ink')
    return color
  }
  const art = await sharp(drawing).png().toBuffer()
  return new ImageResponse(<div style={{ width:1200,height:720,display:'flex',flexDirection:'column',background:ink('paper'),color:ink('ink'),fontFamily:'Weekly',border:`12px solid ${ink('ink')}` }}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 30px',background:ink('navy'),color:ink('white'),fontSize:24}}>
      <span>FAN LIFE · THE TELEGRAM EDITION</span><span>FOOTBALL. FOREVER.</span>
    </div>
    <div style={{display:'flex',position:'relative',flex:1,background:ink('green'),color:ink('white'),overflow:'hidden',padding:'30px 40px'}}>
      <div style={{display:'flex',flexDirection:'column',position:'relative',width:760}}>
        <img src={`data:image/png;base64,${logo.toString('base64')}`} width={92} height={92} alt="" />
        <div style={{display:'flex',flexDirection:'column',fontSize:100,lineHeight:1.04,marginTop:20}}><span>YOUR CLUB.</span><span>YOUR CALL.</span></div>
        <span style={{fontSize:25,marginTop:20}}>{words.welcomeFeatures}</span>
      </div>
      <img src={`data:image/png;base64,${art.toString('base64')}`} width={340} height={490} alt="" style={{position:'absolute',right:0,bottom:-20,objectFit:'contain'}} />
    </div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 30px',borderTop:`6px solid ${ink('ink')}`,background:ink('orange'),fontSize:26}}><span>TAKE YOUR PLACE IN THE STAND.</span><span>FanLife.DubelTeam.com</span></div>
  </div>,{width:1200,height:720,fonts:[{name:'Weekly',data:font,weight:800,style:'normal'}]}).arrayBuffer()
}

export async function GET() {
  try {
    const bytes = await (rendered ??= render().catch(error => { rendered = undefined; throw error }))
    return new Response(bytes, {headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=86400, s-maxage=86400','X-Content-Type-Options':'nosniff'}})
  } catch { return new Response('Welcome artwork is temporarily unavailable.', {status:503,headers:{'Cache-Control':'no-store'}}) }
}
