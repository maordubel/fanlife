"""
THE WORKER art catalog for LIFE (24.11.2026) — rule life-worker-art.

Walks a WORKER checkout, measures every file, classifies it (tlv / universal / hapoel-only / no),
joins THE WORKER's own content/manual/asset-provenance.json, measures yellow with the same
definition as lib/isYellow.ts, and writes lib/life/worker-art/catalog.json, picks included.
The classification was set by looking at contact sheets of every family; the name rules
below encode what was seen. Re-run after THE WORKER adds art, then review the diff.

    python3 -I scripts/life/worker-art/classify.py <worker-checkout> lib/life/worker-art/catalog.json
"""
import sys
import json,os,re,fnmatch,colorsys
from PIL import Image
def inventory():
  out=[]
  for d in ['public/life','public/uss','public/kits','public/og','public/video']:
    for root,_,fs in os.walk(R+d):
      for f in fs:
        p=os.path.join(root,f); rel=p[len(R):]; ext=f.rsplit('.',1)[-1].lower()
        row={'path':rel,'bytes':os.path.getsize(p),'ext':ext}
        if ext in('webp','png','jpg','jpeg','gif'):
          try:
            im=Image.open(p); row['w'],row['h']=im.size; row['kind']='image'
          except Exception: row['kind']='image?'
        elif ext in('mp4','webm','mov'): row['kind']='video'
        elif ext in('ogg','m4a','mp3','wav'): row['kind']='audio'
        else: row['kind']=ext
        out.append(row)
  return out
R=sys.argv[1].rstrip('/')+'/'
OUT=sys.argv[2]
inv=inventory()
prov=json.load(open(R+'content/manual/asset-provenance.json'))['records']
def provOf(p):
  folder,base=os.path.dirname(p),os.path.basename(p)
  for r in prov:
    if not p.startswith(r['folder']+'/'): continue
    rel=p[len(r['folder'])+1:]
    for m in r['match']:
      if fnmatch.fnmatch(rel,m) or fnmatch.fnmatch(base,m): return r
  return None
def yellowShare(p):
  try:
    im=Image.open(p).convert('RGBA'); im.thumbnail((192,192)); px=list(im.get_flattened_data() if hasattr(im,'get_flattened_data') else im.getdata())
  except Exception: return None
  n=y=0
  for r,g,b,a in px:
    if a<128: continue
    n+=1; mx=max(r,g,b); mn=min(r,g,b); d=mx-mn
    if d==0 or mx==0: continue
    s=d/mx; v=mx/255
    if s<0.35 or v<0.35: continue
    if mx==r: h=60*(((g-b)/d+6)%6)
    elif mx==g: h=60*((b-r)/d+2)
    else: h=60*((r-g)/d+4)
    if 38<=h<=70: y+=1
  return round(y/n,4) if n else 0
CANON=r'(pogi|kobi|amit|ofir|keren|efi|rachel|hero|kid|freddy|asaf|shachor|yosef|soko|batya|liron|barry|melamed|hermesh|teen(-|$)|soldier(-|$)|fan[A-G]$|cuKobi|cuOfir|cuRachel|cuPogi)'
REAL=r'(sinai|tikva|gershon|elimelech|michel)'
FACE_CANON=r'face(Pogi|Kobi|Amit|Ofir|Keren|Efi|Rachel|Hero|Kid|Freddy|Asaf|Shachor|Yosef|Soko|Batya|Liron|Barry|Melamed|Hermesh|Soldier|Fan|Aliza|Dudu|Limor|Yaron)'
FACE_REAL=r'face(Sinai|Tikva|Gershon|Elimelech|Michel)'
TLV_BACK={'allenby','allenby20','allenby2000','allenby90','allenbyShops','allenbyShops-wide','allenbyShopsLate','allenbyShopsLate-wide','alley','approach','busStation','busStation20','busStopDan','jaffa00','jaffaAlleyCafe','jaffaBoulevard','kioskNight','promenade','promenade-wide','promenadeDusk','promenadeDusk-wide','ramatGan','ramatGanGates','street','street10','street90','street90Flags','streetEast','streetFore','streetGround','hatikva','ticketOffice','undercroft','ground','teddy2010','menoraSeats','armyRoom','introBeacon','introReturnHome','introDerbyNight','bloom80Goal','bloom90Corner','bloom90Side','bloomNewDay','bloomNewInside','bloomNewNight','bloomNewPitch','bloomNewPlaza','bloomNewSea','bloomNewTerrace','bloomOldCorner','bloomOldEnd','bloomOldGates','bloomOldHigh','bloomOldStand','bloomOldTerrace','bloomOldTunnel','lironCar'}
UNI_BACK={'bedroom','bedroom00','bedroom90','classroom','classroom98','communityRoom','corridor','deskNewsroom','flatAway','hallNew','homeAdult','kiosk','kiosk00','kiosk10','kiosk20','kitchen','living','officeOwner','rehearsal','storeroom','workshopFix','schoolyard','schoolyard20','pitch','pitchPark00','pitchSmall','portEurope','driveIn','introFirstSight','arenaEuroOut','arenaEuroSeats','shopHanger','life-scene-hoops-backdrop-01','life-scene-penalties-backdrop-01'}
HAP_BACK={'gate5','gate5Stand','gate7','gate7Old','cup83','reveal','tunnelReveal','stand','standCrowd','ussCrowd','benfica2010','lyon2010','salzburg2010','titleWorker','botevgradOut2026','botevgradSeats2026'}
NO_UNKNOWN={'boySkate','girlTeen','manBack','manCap','coinPali','coinTree','layerShopfront','propBottle','propBottleFull','propCart','propNewsRack','docTicket','paperAdumim','paperBefore','paperCollector','paperFive'}
UNI_PROPS='propAlbum propBackpack propBall80 propBall90 propBallReal propBannerBlank propBarrier propBarriers propBasketball propBib propBin propBunting propCable propCar propCassette propChalk propClipping90 propCoins propColumn propCrate propDrum propFootball propHeadphones propKeys propLaptop propMug propNewspaper propNote propNoteOpen propPaperFolded propPapers propPassport propPhone2010 propPhone2020 propPlanner propPlanter propPosters propRadio propRecorder propRedBox propRemote propScorePaper propSportsBag propSuitcase propTicketsPair propWrapper livingTable'.split()
TLV_PROPS='propBeret propBus propDarbuka soldierKitA soldierKitB soldierKitC soldierKitD bfSignBox'.split()
HEB_TEXT={'allenby','allenby20','allenby2000','allenby90','allenbyShops','allenbyShops-wide','allenbyShopsLate','allenbyShopsLate-wide','busStopDan','jaffaAlleyCafe','ramatGanGates','ticketOffice','bloom80Goal','bloom90Corner','bloom90Side','promenade','promenade-wide','promenadeDusk','promenadeDusk-wide','panoCinema','panoTamar','panoJaffa','panoPromenade','panoKitchen90','propSign','propBanner','propClipping90'}
SPONSOR={'bloom80Goal','bloom90Corner','bloom90Side','kiosk00','kiosk10','kiosk20','kiosk','panoRoomGrocery'}
RED_DECOR={'bedroom','bedroom90','corridor','street90Flags','propSportsBag','propBackpack','propMug','propDrum','propRedBox','propBib','propTicketsPair','propBunting','overlaySmoke','overlayConfetti','texTunnelWall','texTunnelWallPoster','texTunnelSteps','texTunnelDoor','shopHanger','hooperRed','usher','bfSteward','emScarf','panoBloom','pen-keeper','hoop-ring','iconBag'}
def cls(r):
  p=r['path']; base=os.path.basename(p); f=base.rsplit('.',1)[0]; top=p.split('/')
  out=dict(cls=None,town='*',roles=[],block=[],proc=[],note='')
  def S(c,town,roles,proc=(),note=''):
    out.update(cls=c,town=town,roles=list(roles),proc=list(proc),note=note)
  if p.startswith('public/life/art/'):
    if f in('manifest','sheets'): S('no','*',['index'],note='script index, not a picture')
    elif f.endswith('--sky') or f.endswith('--ground'): S('no','*',[],note='procedural blur strip for 2D letterboxing; LIFE 3D has no role for it')
    elif f.endswith('--tile'): S('universal','*',['texture'],['tile','webp'],'seamless ground/floor tile cut from a panorama')
    elif re.search(r'--(far|mid|near)$',f):
      if f.startswith('gate7'): S('hapoel-only','tlv',['backdrop'],note='Gate 7 parallax layer')
      else: S('tlv','tlv',['backdrop','facade'],['relight-dusk','webp'],'parallax layer of the Tel Aviv street')
    elif f in('pen-ball--wet','hoop-ring--net'): S('universal','*',['prop'],['webp'])
    elif f in NO_UNKNOWN: S('no','*',['prop' if f.startswith(('prop','coin','layer')) else 'portrait' if f in('boySkate','girlTeen','manBack','manCap') else 'doc'],note='provenance unknown (confidence 0) in THE WORKER asset-provenance'); out['block'].append('provenance-unknown')
    elif f.startswith('pano'):
      if re.match(r'pano(Gate7|Reveal|Terrace1986|Uss)',f): S('hapoel-only','tlv',['backdrop','env-map'],note='Hapoel canon place (Gate 7 / Ussishkin / the 1986 terrace)')
      elif re.match(r'pano(Bloom|Cinema|Jaffa|Promenade|Tamar)',f): S('tlv','tlv',['env-map','backdrop','facade'],['equirect-to-cubemap','relight-dusk','webp'],'360 street panorama of Tel Aviv')
      else: S('universal','*',['env-map','interior'],['equirect-to-cubemap','webp'],'360 interior panorama: a room any supporter grew up in')
    elif f.startswith('plate-'): S('hapoel-only','tlv',['title-card'],note='chapter plate graded from Hapoel backdrops; names a Hapoel season')
    elif f.startswith('fx'): S('universal','*',['fx'],['webp'])
    elif f.startswith('overlay'): S('universal','*',['fx'],['recolour-club','webp'] if f in('overlaySmoke','overlayConfetti') else ['webp'])
    elif f.startswith('tex'): S('universal','*',['texture'],['recolour-club','tile','webp'],'tunnel/stand concrete textures')
    elif f.startswith('icon'): S('universal','*',['ui'],['recolour-club','webp'])
    elif f.startswith('em') and f[2:3].isupper(): S('universal','*',['ui'],['recolour-club','webp'])
    elif f.startswith(('pen-','hoop-','hooperRed')): S('universal','*',['prop'] if not f.startswith('hooperRed') else ['portrait'],['recolour-club','webp'])
    elif f in TLV_BACK: S('tlv','tlv',['backdrop'],['relight-dusk','webp'])
    elif f in UNI_BACK: S('universal','*',['interior' if f not in('schoolyard','schoolyard20','pitch','pitchPark00','pitchSmall','arenaEuroOut','introFirstSight','life-scene-hoops-backdrop-01','life-scene-penalties-backdrop-01') else 'backdrop'],['relight-dusk','webp'])
    elif f in HAP_BACK: S('hapoel-only','tlv',['backdrop','title-card'])
    elif f.startswith('uss'): S('hapoel-only','tlv',['backdrop','interior'],note='Ussishkin, Hapoel\'s own hall')
    elif re.match(FACE_REAL,f) or re.match(REAL,f): S('hapoel-only','tlv',['portrait']); out['block'].append('real-person')
    elif re.match(FACE_CANON,f) or re.match(CANON,f): S('hapoel-only','tlv',['portrait'],note='named THE WORKER canon character')
    elif f.startswith('face'):
      if f.startswith('faceCommander'): S('tlv','tlv',['portrait'],['webp'],'army commander portrait (Israeli setting)')
      else: S('universal','*',['portrait'],['webp'],'generic townsperson portrait on cream paper')
    elif re.match(r'(adult[AB]\d|young[AB]\d|oldMan|teacher|pupil|usher|hallVendor|bfSteward|bfVendor|cuTeacherShare|cuUsherNight)',f): S('universal','*',['portrait'],['webp'],'generic townsperson figure (LIFE uses 3D humans; 2D for conversation portraits)')
    elif f in TLV_PROPS: S('tlv','tlv',['prop'],['webp'])
    elif f in UNI_PROPS: S('universal','*',['prop'],['webp'])
    elif f.startswith(('prop','bfSign')): S('hapoel-only','tlv',['prop'],note='carries the Hapoel crest, name or colours as identity')
    elif f.startswith('shirt'): S('hapoel-only','tlv',['prop'],note='Hapoel shirt photo or drawing')
    elif f.startswith('doc'): S('hapoel-only','tlv',['doc'],note='Hapoel paper (cups 1999/2000, tickets)')
    else: S('no','*',[],note='unclassified')
  elif p.startswith('public/life/docs/'): S('hapoel-only','tlv',['doc'],note='Supergol cards / 1980-81 booklet: real Hapoel players'); out['block'].append('real-person')
  elif p.startswith('public/life/artefacts/'):
    if f.startswith('docPendel'): S('no','*',['doc'],note='magazine cover with real players incl. other clubs'); out['block']+=['real-person','third-party-print']
    else: S('tlv','tlv',['doc','prop'],['webp'],'Israeli everyday paper (bus ticket, Toto form, youth card, cinema ticket)')
  elif p.startswith('public/life/film/'):
    if f.startswith('cup83'): S('hapoel-only','tlv',['film']); out['block'].append('yellow')
    elif f=='manifest': S('no','*',['index'])
    else: S('tlv','tlv',['film','title-card'] if base.endswith('.jpg') else ['film'],['grade-dusk'],'1989 / 1995 Tel Aviv street footage'); out['block'].append('licence-unverified')
  elif p.startswith('public/life/transitions/') or p.startswith('public/life/opening/') or p.startswith('public/video/'):
    S('hapoel-only','tlv',['film','title-card'] if base.endswith('.png') else ['film'],note='Hapoel identity throughout (crests, red crowd, canon family)')
    if p.startswith('public/video/'): out['block'].append('yellow')
  elif p.startswith('public/life/sfx/'):
    if f=='manifest': S('no','*',['index'])
    elif f.startswith(('amb-theme','radio-open')): S('no','*',['sfx'],note='commercial/broadcast recording'); out['block'].append('licence')
    elif f.startswith('crowd-real') : S('tlv','tlv',['sfx'],note='owner\'s ground recording; Hebrew chants may be audible')
    elif f.startswith(('amb-park','park-wave')): S('universal','*',['sfx'],note='owner\'s street recording')
    elif f.startswith('chant-derby'): S('hapoel-only','tlv',['sfx'])
    else: S('universal','*',['sfx'],note='procedural synth; muted in THE WORKER since 6.9.2026'); out['block'].append('owner-muted-synth')
  elif p.startswith('public/life/deck/'): S('universal','*',['ui'],['webp'])
  elif p.startswith('public/life/share/'): S('hapoel-only','tlv',['ui'],note='THE WORKER share template with the Hapoel badge')
  elif p.startswith('public/uss/'): S('hapoel-only','tlv',['backdrop','interior'],note='Ussishkin')
  elif p.startswith('public/og/'): S('no','*',[],note='THE WORKER social cards; never in LIFE (two-logos)')
  elif p.startswith('public/kits/'):
    if '/marks/' in p: S('no','*',[],note='third-party maker/sponsor marks'); out['block'].append('trademark')
    elif '/templates/' in p: S('universal','*',['prop'],note='blank shirt photo templates; FAN LIFE lib/kit is canonical for kits, use through it')
    else: S('hapoel-only','tlv',['prop'],note='Hapoel kit archive')
  else: S('no','*',[])
  # blockers
  if f in HEB_TEXT: out['block'].append('hebrew-text')
  if f in SPONSOR: out['block'].append('sponsor-marks')
  if any(f.startswith(k) for k in RED_DECOR) and out['cls'] in('universal','tlv'): out['block'].append('club-red'); 
  if f=='pen-kids': out['block'].append('burned-filename-text')
  if f.startswith(('bloomNew','introBeacon','introReturnHome','bloomOld','bloom8','bloom9')): out['block'].append('real-stadium-shared-by-tlv-clubs')
  if f in('street90Flags',): out['block'].append('red-white-bunting')
  return out
rows=[]
for r in inv:
  c=cls(r); p=r['path']; pr=provOf(p)
  y=yellowShare(R+p) if r['kind']=='image' else None
  if y and y>0.001 and 'yellow' not in c['block']: c['block'].append('yellow')
  if c['cls'] in ('universal','tlv') and y and y>0.001 and 'de-yellow' not in c['proc']: c['proc'].insert(0,'de-yellow')
  approved=bool(pr and pr['origin'] in('maor-upload','original-artwork','procedural') and pr['confidence']==2)
  if pr and pr['confidence']==0 and 'provenance-unknown' not in c['block']: c['block'].append('provenance-unknown')
  if pr and pr['confidence']==1 and 'licence-unverified' not in c['block'] and 'licence' not in c['block']: c['block'].append('provenance-partial')
  fam=re.sub(r'(--.*|[-_]?\d.*|[A-Z].*)$','',os.path.basename(p).rsplit('.',1)[0]) or os.path.basename(p)
  row=dict(path=p,family=('/'.join(p.split('/')[:-1]))+':'+fam,kind=r['kind'],bytes=r['bytes'],w=r.get('w'),h=r.get('h'),cls=c['cls'],town=c['town'],roles=c['roles'],blockers=sorted(set(c['block'])),processing=c['proc'],approvedByPack=approved,provenance=(pr['key'] if pr else None),yellowShare=y)
  if c['note']: row['note']=c['note']
  rows.append(row)
from collections import Counter
print(Counter(r['cls'] for r in rows))
print('unclassified',[r['path'] for r in rows if r.get('note')=='unclassified'])

# ---- picks: the curated top assets, imported at game size into public/life/worker/<class>/
SIZE={'env-map':2048,'backdrop':2048,'facade':2048,'interior':2048,'title-card':1920,'texture':1024,'portrait':384,'prop':512,'doc':1024,'fx':1024,'ui':256}
PICKS_TLV=[
 ('panoBloomWalk3','env-map','Bloomfield undercroft street in 360: the walk to the ground, red barriers, floodlight mast'),
 ('panoCinema','env-map','Allenby cinema crossroads in 360: a whole Tel Aviv junction as sky/env for the hood'),
 ('panoTamar','env-map','Bauhaus corner café block in 360: the city\'s signature facade line'),
 ('panoPromenade','env-map','sea promenade in 360, sepia: the 1980s seafront'),
 ('panoJaffa','env-map','Jaffa street with tram tracks in 360: southern end of the city'),
 ('allenbyShopsLate-wide','facade','Allenby shopfronts at last light, cars, wet asphalt: closest to the dusk target'),
 ('promenadeDusk-wide','backdrop','sunset promenade with the skyline: sky/skyline band at the end of a street'),
 ('introBeacon','title-card','Bloomfield lit at night over the city: title card and end-of-street stadium glow'),
 ('introReturnHome','backdrop','Bloomfield facade at night, reflections on wet plaza: end-of-street stadium'),
 ('bloomNewSea','backdrop','Bloomfield from the air with Jaffa and the sea: district-map base art'),
 ('busStation','backdrop','wet bus station at blue hour: dusk, reflections, the trip to the ground'),
 ('kioskNight','facade','the kiosk on a wet night street: a stop in the hood'),
 ('street','facade','the Tel Aviv street with the kiosk: facade texture for the hood blocks'),
 ('approach','backdrop','street with floodlight masts over the roofs: the approach shot'),
 ('jaffaAlleyCafe','backdrop','old stone alley with ficus canopy and newsstand'),
 ('bloomOldGates','facade','old Bloomfield gate block, turnstiles: stadium facade texture'),
 ('busStopDan','backdrop','Dan bus stop with posters and newsstand'),
 ('docEggedLira','doc','Egged bus tickets: keepsake for the Box'),
 ('docToto4085','doc','Toto pools coupon: newspaper-era keepsake'),
]
PICKS_UNI=[
 ('panoRoomLiving','env-map','living room of the era in 360: room env behind an interior'),
 ('panoRoomKitchen','env-map','kitchen in 360'),
 ('panoRoomBed','env-map','bedroom in 360'),
 ('panoRoomGrocery','env-map','corner grocery in 360'),
 ('panoClassroom','env-map','classroom in 360 from a pupil\'s desk'),
 ('kitchen','interior','kitchen backdrop, era-neutral'),
 ('living','interior','living room with TV and fan'),
 ('flatAway','interior','an apartment at night, lamp light: the evening before the match'),
 ('classroom','interior','classroom with blackboard'),
 ('schoolyard','backdrop','schoolyard with basketball hoop and trees'),
 ('introFirstSight','title-card','the tunnel mouth opening on to the pitch: the universal "first sight" card'),
 ('kiosk','interior','kiosk interior counter, no brands'),
 ('workshopFix','interior','workshop with the roller door up'),
 ('propRedBox','prop','the Box: tin keepsake box under the bed'),
 ('propSportsBag','prop','the kit bag'),
 ('propRadio','prop','the transistor radio'),
 ('propNewspaper','doc','a generic newspaper page'),
 ('propTicketsPair','prop','a pair of blank match tickets'),
 ('propAlbum','prop','an open sticker album'),
 ('propScorePaper','prop','a scribbled score sheet'),
 ('propCassette','prop','a cassette'),
 ('propKeys','prop','house keys'),
 ('overlayHaze','fx','floodlight haze'),
 ('overlayMist','fx','low mist bank'),
 ('fxGrain','fx','film grain'),
 ('panoRoomLiving--tile','texture','terrazzo floor tile'),
 ('panoRoomKitchen--tile','texture','octagon floor tile'),
 ('panoBloom24--tile','texture','stone paving tile with drain cover'),
 ('texTunnelWall','texture','tunnel concrete wall with band (recolour band to club)'),
 ('texTunnelFloor','texture','wet concrete tunnel floor'),
 ('faceOldMan-story','portrait','old man telling a story'),
 ('faceTeacher','portrait','the teacher'),
 ('faceUsher','portrait','the steward'),
 ('faceVendor','portrait','the vendor'),
 ('faceWoman','portrait','a neighbour'),
 ('shopHanger','ui','the rail the shirts hang on (kit bag / shop screen)'),
]
byname={os.path.basename(r['path']).rsplit('.',1)[0]:r for r in rows if r['path'].startswith(('public/life/art/','public/life/artefacts/'))}
for rank,(n,role,why) in enumerate(PICKS_TLV+PICKS_UNI):
  r=byname[n]; assert r['cls'] in('tlv','universal'),(n,r['cls']); assert r['approvedByPack'] or r['provenance'] in('life-artefacts-2026-09-17',),(n,r['provenance'])
  if role not in r['roles']: r['roles'].append(role)
  r['pick']=dict(group='tlv' if r['cls']=='tlv' else 'universal',role=role,why=why,width=SIZE[role],out=f"public/life/worker/{r['cls']}/{n}.webp")
cat=dict(version=1,source=dict(repo='maordubel/The-Worker',commit='15229a9',checkedAt='2026-11-24'),
  classes=dict(tlv='usable for Tel Aviv and Israeli-city LIFE',universal='usable for every city after colour handling',**{'hapoel-only':'Hapoel identity or canon: only inside Hapoel\'s own pack'},no='not reusable'),
  note='Every file in THE WORKER public/life, public/uss, public/kits, public/og, public/video. public/life/* is already mirrored byte-for-byte in FAN LIFE under the same paths by the LIFE upstream import; picks are the game-size LIFE copies written by scripts/life/worker-art/import.ts.',
  entries=sorted(rows,key=lambda r:r['path']))
ents=cat.pop('entries')
for e in ents:
  for k in ('w','h','yellowShare'):
    if e.get(k) is None: e.pop(k,None)
head=json.dumps(cat,indent=1,ensure_ascii=False)[:-2]
body=',\n'.join('  '+json.dumps(e,ensure_ascii=False,separators=(',',':')) for e in ents)
open(OUT,'w').write(head+',\n "entries": [\n'+body+'\n ]\n}\n')
print('picks',sum(1 for r in rows if 'pick' in r))
