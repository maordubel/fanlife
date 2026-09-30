/**
 * לוחות הסצנות — every painted room with its doors, people, hotspots and floor drawn on it.
 *
 * Twice on 3.9.2026 a door was placed by reading numbers: once on a graffiti wall where
 * Ofir and Keren stand, once on a corner pillar with three painted men and no door. Both
 * were found in ninety seconds the moment the boxes were drawn over the picture. So this
 * draws them, for every scene, and that picture is now the definition of "placed":
 * no exit, actor or hotspot is sent in a delta before its board has been looked at.
 *
 *   node scripts/life/scene-boards.mjs        → docs/life-shots/board-<scene>.png
 *   ERA=1990 node scripts/life/scene-boards.mjs → the same rooms as 1990 dresses them
 *                                                 (docs/life-shots/board-1990-<scene>.png)
 *
 * People are drawn at the size the runtime draws them — from `bodySize()`, never from the
 * deprecated `size` field — so a father "at the table" drawn at a front-of-room size shows up
 * here first.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../../', import.meta.url).pathname
const dump = join(ROOT, 'scripts/life/.scene-dump.ts')
writeFileSync(
  dump,
  `import { ALL_SCENES, sceneIn } from '../../lib/life/world/scenes'
import { bodySize, heightOf } from '../../lib/life/world/heights'
import { yearOfChapter } from '../../lib/life/world/homes'
import { eraFor } from '../../lib/life/content/era'
import { SCHEDULE_1986 } from '../../lib/life/content/schedules1986'
import { SCHEDULE_1990 } from '../../lib/life/content/schedules1990'
const era = process.env.ERA ?? '1986'
const k = eraFor(era).player.scale ?? 1

/**
 * The size the engine actually draws.
 *
 * This board used to draw every actor at ActorDef.size — a field marked deprecated since
 * delta 30, which scenes.ts says in as many words the runtime "never reads". So rule 55's
 * instruction that a placement is not done until its board has been looked at was being
 * satisfied by looking at a picture of something else.
 *
 * Every actor now carries "drawn", computed exactly as WorldScene.bodySizeAt does, and
 * every scene carries "boy" — the two numbers this board exists for.
 */
// a rebuilt room is drawn on its own painting with its own floor (Repaint, 21.9.2026)
const scenes = ALL_SCENES.map((room) => sceneIn(room, era)).map((scene) => {
  const taper = scene.size.far / Math.max(1e-6, scene.size.near)
  const depth = (y) => Math.max(0, Math.min(1, (y - scene.band.far) / (scene.band.near - scene.band.far)))
  const boyNear = scene.metre * heightOf('pogi') * k
  return {
    ...scene,
    boy: { far: boyNear * taper, near: boyNear },
    actors: scene.actors.map((a) => ({ ...a, drawn: bodySize(a.figure, scene.metre, depth(a.y), taper, yearOfChapter(era)) })),
  }
})
process.stdout.write(JSON.stringify({ era, hero: eraFor(era).player.pose.down, scenes, schedule: era === '1990' ? SCHEDULE_1990 : SCHEDULE_1986 }, (_k, v) => (typeof v === 'function' ? undefined : v)))
`,
)
const json = execFileSync('npx', ['tsx', dump], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env } })
writeFileSync('/tmp/.scene-dump.json', json)
mkdirSync(join(ROOT, 'docs/life-shots'), { recursive: true })
const py = String.raw`
import json
from PIL import Image, ImageDraw, ImageFont
d=json.load(open('/tmp/.scene-dump.json')); ART='${ROOT}public/life/art'; OUT='${ROOT}docs/life-shots'
font=ImageFont.load_default()
ERA=d['era']; PREFIX='board-' if ERA=='1986' else f'board-{ERA}-'
# Mirrors inEra()/decadeOf()/stageOf() in lib/life/world/scenes.ts. Without the list and
# the decade/stage tags this board drew a row tagged ['1998-laces','1999-basket'] — or
# '1990s' — nowhere at all, so the picture rule 55 calls the definition of "placed" was
# quietly leaving out exactly the rows that are shared between chapters.
def _decade(ch):
    try: y=int(ch[:4])
    except Exception: return '1980s'
    return '2000s' if y>=2000 else ('1990s' if y>=1990 else '1980s')
def _stage(ch):
    return 'A' if ch in ('1986','prologue') or (len(ch)>1 and ch[0]=='a' and ch[1].isdigit()) else 'B'
def _exact(ch):
    try: y=int(ch[:4])
    except Exception: return _decade(ch)
    return f'{y//10*10}s' if y>=2010 else _decade(ch)
DEC=_decade(ERA); EXACT=_exact(ERA); STG=_stage(ERA)
def _one(e): return e=='*' or e==ERA or e==EXACT or e==DEC or e==STG
def in_era(x, fallback='1986'):
    e=x.get('era', fallback)
    return any(_one(i) for i in e) if isinstance(e,list) else _one(e)
for sc in d['scenes']:
    art=None
    for key in (ERA, EXACT, DEC, STG):
        art=(sc.get('artByEra') or {}).get(key)
        if art: break
    art=art or sc['art']
    im=Image.open(f"{ART}/{art}.webp").convert('RGBA'); W,H=im.size
    for L in sc.get('layers') or []:
        if not in_era(L): continue
        try: la=Image.open(f"{ART}/{L['art']}.webp").convert('RGBA')
        except Exception: continue
        if L.get('foot'):
            lw=max(1,int(L['w']*W)); lh=max(1,int(lw*la.height/la.width)); la=la.resize((lw,lh))
            im.alpha_composite(la,(int(L['x']*W)-lw//2,int(L['y']*H)-lh))
        elif L['w']>=1: im.alpha_composite(la.resize((W,H)),(0,0))
    im=im.convert('RGB').resize((1200,int(H*1200/W))); W2,H2=im.size; dr=ImageDraw.Draw(im)
    def R(x,y,w,h,c,l): dr.rectangle([x*W2,y*H2,(x+w)*W2,(y+h)*H2],outline=c,width=3); dr.text((x*W2+3,y*H2-11),l,fill=c,font=font)
    for yy in (sc['band']['far'],sc['band']['near']): dr.line([0,yy*H2,W2,yy*H2],fill=(0,255,255),width=2)
    for e in sc['exits']:
        if not in_era(e, '*'): continue
        R(e['x'],e['y'],e['w'],e['h'],(255,0,0),'EXIT '+e['id'])
        if e.get('light'): R(e['light']['x'],e['light']['y'],e['light']['w'],e['light']['h'],(255,160,0),'light')
    for hs in sc['hotspots']:
        if not in_era(hs): continue
        pr=hs.get('prop')
        if pr:
            try:
                pa=Image.open(f"{ART}/{pr['key']}.webp").convert('RGBA'); at=pr.get('at') or hs
                ph=max(1,int(pr['size']*H2)); pw=max(1,int(ph*pa.width/pa.height)); pa=pa.resize((pw,ph))
                im.paste(pa,(int(at['x']*W2)-pw//2,int(at['y']*H2)-ph),pa)
            except Exception as ex: print('missing prop',pr['key'],ex)
        dr.ellipse([(hs['x']-hs['w']/2)*W2,hs['y']*H2-8,(hs['x']+hs['w']/2)*W2,hs['y']*H2+8],outline=(0,255,0),width=3); dr.text((hs['x']*W2,hs['y']*H2+10),'HS '+hs['id'],fill=(0,255,0),font=font)
    for a in sc['actors']:
        if not in_era(a): continue
        try:
            fa=Image.open(f"{ART}/{a['figure']}.webp").convert('RGBA')
            hh=max(1,int(a.get('drawn', a.get('size') or 0.26)*H2)); ww=max(1,int(hh*fa.width/fa.height)); fa=fa.resize((ww,hh))
            if a.get('flip'): fa=fa.transpose(Image.FLIP_LEFT_RIGHT)
            im.paste(fa,(int(a['x']*W2)-ww//2,int(a['y']*H2)-hh),fa)
        except Exception as ex: print('missing figure',a['figure'],ex)
        dr.text((a['x']*W2-10,a['y']*H2+2),a['id'],fill=(255,0,255),font=font)
    for name,sp in sc['spawns'].items():
        dr.ellipse([sp['x']*W2-5,sp['y']*H2-5,sp['x']*W2+5,sp['y']*H2+5],fill=(255,255,0)); dr.text((sp['x']*W2+6,sp['y']*H2-4),'sp:'+name,fill=(255,255,0),font=font)
    for row in d['schedule']:
        if row['location']==sc['id'] and 'x' in row: dr.text((row['x']*W2-10,row.get('y',0.9)*H2+12),'SCHED '+row['actorId'],fill=(0,200,255),font=font)
    # the boy himself, at both ends of the band, at this year's height
    try:
        # the boy this chapter actually draws, not the eight-year-old sheet under an adult's size
        hero=d.get('hero') or 'pogi'
        ha=Image.open(f"{ART}/{hero}.webp").convert('RGBA')
        for yy,sz in ((sc['band']['far'],sc['boy']['far']),(sc['band']['near'],sc['boy']['near'])):
            hh=max(1,int(sz*H2)); ww=max(1,int(hh*ha.width/ha.height)); h2=ha.resize((ww,hh))
            im.paste(h2,(int(0.5*W2)-ww//2,int(yy*H2)-hh),h2)
    except Exception as ex: print('missing hero',ex)
    im.save(f"{OUT}/{PREFIX}{sc['id']}.png")
print('boards:',len(d['scenes']))
`
execFileSync('python3', ['-c', py], { stdio: 'inherit' })
