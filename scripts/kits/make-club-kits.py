#!/usr/bin/env python3 -I
"""A club's complete-kit archive from the colours-of-football.com catalogue (© Mikhail Sipovich), generic over clubs.

The owner granted use of the catalogue's graphics, logos and symbols on 9.10.2026 ("יש לך אישור להשתמש בכל החומרים הגרפים המצורפים, בכל הלוגואים. בכל הסמלים").
Inputs  : --rows   rows.json of the crawl (club, page, dir, img, caption; the page logo has caption LOGO)
          --images directory with the downloaded catalogue images, one folder per club
          --reads  the by-eye transcription of the drawings (design, colours, maker, sponsor, trims), one entry per kit in catalogue order (kept in content/manual/kit-reads/<club>.json)
Outputs : public/club-kits/<club>/cof/<image>          the source images, unchanged
          content/manual/kit-cof-<club>.json        measurements + transcription per kit
          content/manual/kit-archive-<club>.json    the joined archive (what pages and SVGs are built from)
          club-packs/<club>/wave-kits-cof-<day>.json  kits the club pack has no (season, type) for, status 'review'
Rule 11: a mark the transcription could not read stays null. Maker and sponsor are the transcription of a small drawing, so every kit
stays `review` until the owner approves; kits the pack already holds are cross-checked, never overwritten.
Usage: make-club-kits.py --club ID --rows rows.json --images DIR --reads read.json [--day YYYY-MM-DD]"""
import argparse,collections,datetime,glob,json,os,re,shutil
from PIL import Image
PAGE_BASE='https://www.colours-of-football.com/colours03/'
NAMES={'st-pauli':('FC St. Pauli','germany/st-pauli'),'panathinaikos':('Panathinaikos','greece/panathinaikos'),'zrinjski-mostar':('Zrinjski Mostar','bosnia-and-herzegovina/zrinjski'),'hapoel-petah-tikva':('Hapoel Petah Tikva','israel/hapoel-petah-tikva'),'celtic':('Celtic','scotland/celtic'),'aek-athens':('AEK Athens','greece/aek-athens'),'olympiacos':('Olympiacos','greece/olympiacos'),'hapoel-tel-aviv':('Hapoel Tel Aviv','israel/hapoel-tel-aviv')}
def classify(c):
    r,g,b=c;mx,mn=max(c),min(c)
    if mx<64:return 'black'
    if mn>235:return 'white'
    if mn>200 and r-b>=10 and r>=g-4:return 'cream'
    if mx-mn<28:return 'grey'
    if b>r+30 and mx<115:return 'navy'
    if r>200 and g>150 and b<110 and g>r*0.62:return 'yellow'
    if r>225 and 70<g<140 and b<90:return 'orange'
    if r>215 and g<140 and b>90 and r>b:return 'pink'
    if 50<r<170 and 45<=g<110 and b<90 and r>g+12 and g-b>=6:return 'brown'
    if 40<r<150 and g<95 and b<95 and r>g+15:return 'maroon'
    if r>150 and g<70 and b<70:return 'red'
    if g>r+25 and g>b+10:return 'green'
    if b>r+25 and b>150 and g>120:return 'skyblue'
    if b>r+60:return 'blue'
    if r>b+80 and g>b+60:return 'yellow'
    return None
def region_pal(im,box,name):
    px=im.load();x0,y0,x1,y1=box;by=collections.defaultdict(collections.Counter);allc=collections.Counter()
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b,a=px[x,y]
            if a<250:continue
            c=(r,g,b);allc[c]+=1;k=classify(c)
            if k:by[k][c]+=1
    if name=='navy' and name not in by:
        nv=collections.Counter(c for c,n in allc.items() for _ in range(n) if c[2]-c[0]>=12 and max(c)<115)
        if nv:return '#%02x%02x%02x'%nv.most_common(1)[0][0],True
    if name in by:return '#%02x%02x%02x'%by[name].most_common(1)[0][0],True
    body=[(c,n) for c,n in allc.most_common() if classify(c)!='black'] or allc.most_common()
    return ('#%02x%02x%02x'%body[0][0] if body else '#808080'),False
def dominant(im,box):
    px=im.load();x0,y0,x1,y1=box;f=collections.Counter()
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b,a=px[x,y]
            if a>=250:
                k=classify((r,g,b))
                if k:f[k]+=1
    return f.most_common(1)[0][0] if f else None
def runs(seq):
    o=[]
    for c in seq:
        if o and o[-1][0]==c:o[-1][1]+=1
        else:o.append([c,1])
    return o
def count_trim(im,trim,axis,pos,lo,hi):
    px=im.load();seq=[]
    for a in range(lo,hi):
        r,g,b,al=px[a,pos] if axis=='row' else px[pos,a]
        seq.append(classify((r,g,b)) if al>=250 else None)
    return sum(1 for k,n in runs(seq) if k==trim and n>=2)
SHIRT=(10,10,118,100);SHORTS=(12,138,118,208);SOCKS=(128,110,156,200)
def season_of(cap):
    m=re.search(r'(\d{4})[-–](\d{2,4})',cap)
    if not m:
        m=re.search(r'(\d{4})',cap);return m[1],'year'
    a,b=m[1],m[2][-2:]
    if (int(b)-int(a[2:]))%100==1:return f'{a}/{b}','season'
    return f'{a}–{b}','range'
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--club',required=True);ap.add_argument('--rows',required=True);ap.add_argument('--images',required=True);ap.add_argument('--reads',required=True)
    ap.add_argument('--day',default=datetime.date.today().isoformat());a=ap.parse_args();club=a.club
    rows=[r for r in json.load(open(a.rows)) if r['club']==club];kits=[r for r in rows if r['caption']!='LOGO'];logos=[r for r in rows if r['caption']=='LOGO']
    reads=json.load(open(a.reads));assert len(reads)==len(kits),(len(reads),len(kits))
    pages=sorted({r['page'] for r in kits},key=lambda p:int(re.search(r'(\d+)\.html',p)[1]));pid={p:f'cof-{club}-p{i}' for i,p in enumerate(pages,1)}
    out_dir=f'public/club-kits/{club}/cof';os.makedirs(out_dir,exist_ok=True)
    recs=[]
    for r,rd in zip(kits,reads):
        src=os.path.join(a.images,club,r['img']);shutil.copyfile(src,os.path.join(out_dir,r['img']))
        im=Image.open(src).convert('RGBA');cap=r['caption'];season,kind=season_of(cap);t=cap.split()[0];euro=' euro ' in cap
        body,trim=rd['body'],rd['trim'];hb,okb=region_pal(im,SHIRT,body);ht=region_pal(im,SHIRT,trim)[0] if trim!=body else hb
        if rd['design']=='gradient':hb=region_pal(im,SOCKS,body)[0]
        shorts=dominant(im,SHORTS);socks=dominant(im,SOCKS);sh_hex=region_pal(im,SHORTS,shorts)[0];sk_hex=region_pal(im,SOCKS,socks)[0]
        meas={}
        if rd['design']=='stripes':meas['stripes']=count_trim(im,trim,'row',34,0,im.size[0])
        if rd['design']=='hoops':meas['hoops']=count_trim(im,trim,'col',im.size[0]//2,14,56)
        tr=lambda n,box:region_pal(im,box,n)[0] if n else None
        recs.append(dict(i=len(recs)+1,caption=cap,page=r['page'],image=r['img'],season=season,seasonKind=kind,type=t,euro=euro,
            shirt=dict(design=rd['design'],body=body,trim=trim,hex=dict(body=hb,trim=ht),bodyMeasured=okb,measured=meas),maker=rd.get('maker'),sponsor=rd.get('sponsor'),readUnsure=bool(rd.get('unsure')),
            shorts=dict(colour=shorts,hex=sh_hex,trim=rd.get('shorts_trim'),trimHex=tr(rd.get('shorts_trim'),SHORTS)),
            socks=dict(colour=socks,hex=sk_hex,trim=rd.get('socks_trim'),trimHex=tr(rd.get('socks_trim'),SOCKS),bands=bool(rd.get('socks_trim')))))
    for r in logos[:1]:shutil.copyfile(os.path.join(a.images,club,r['img']),os.path.join(f'public/club-kits/{club}','cof-logo'+os.path.splitext(r['img'])[1]))
    cat_dir=kits[0]['dir']
    name,logopath=NAMES[club]
    man=dict(sources=[dict(key='cof',title=f'colours-of-football.com — {name} kit catalogue (© Mikhail Sipovich)',url=PAGE_BASE+cat_dir+pages[0],readOn=a.day,kits=len(recs)),dict(key='logo',title=f'football-logos.cc — {name} logo',url=f'https://football-logos.cc/{logopath}/',readOn=a.day,kits=0)],source=PAGE_BASE+cat_dir+pages[0],publisher='colours-of-football.com (Mikhail Sipovich)',retrieved=a.day,count=len(recs),
        pages={p:PAGE_BASE+cat_dir+p for p in pages},method='Season/type from the catalogue captions; design, maker, printed sponsor and trims transcribed by eye from the drawings (readUnsure marks the doubtful ones); colours measured from pixels in fixed regions (shirt, shorts, socks), transparent background excluded.',records=recs)
    json.dump(man,open(f'content/manual/kit-cof-{club}.json','w'),ensure_ascii=False,indent=1);open(f'content/manual/kit-cof-{club}.json','a').write('\n')
    # existing pack kits, for the cross-check and for not duplicating a (season, type) the pack already has
    have=collections.defaultdict(list)
    for f in sorted(glob.glob(f'club-packs/{club}/*.json')):
        if '/wave-kits-cof-' in f:continue
        try:d=json.load(open(f))
        except Exception:continue
        for k in (d.get('kits') or []) if isinstance(d,dict) else []:
            v=k.get('value') or {};have[(v.get('season'),(v.get('type') or 'home').lower())].append(dict(id=k['id'],maker=v.get('manufacturer'),status=k.get('status')))
    joined=[];seen=collections.Counter()
    for r in recs:
        sh=r['shirt'];cols=[sh['body']]+([sh['trim']] if sh['trim']!=sh['body'] else [])
        key=(r['season'],r['type'],r['euro']);seen[key]+=1
        k=dict(id=f"cof-k-{r['i']:02d}",origin='catalogue',season=r['season'],kind=r['seasonKind'],type=r['type'],euro=r['euro'],
            shirt=dict(design=sh['design'],colours=cols,hex={sh['body']:sh['hex']['body'],**({sh['trim']:sh['hex']['trim']} if sh['trim']!=sh['body'] else {})},measured=sh['measured']),
            shorts=r['shorts'],socks=r['socks'],maker=r['maker'],sponsor=r['sponsor'],shortsSponsor=None,sources=[pid[r['page']]],
            evidence=[dict(publisher='colours-of-football.com',ref=r['caption'],image=r['image'])],image=f"/club-kits/{club}/cof/{r['image']}",drawings=[],conflicts=[],notes=[],verified=None,readUnsure=r['readUnsure'])
        if seen[key]>1:k['id']+=f'-v{seen[key]}';k['notes'].append(['second'])
        twins=have.get((r['season'],r['type']),[]) if not r['euro'] else []
        k['twin']=[t['id'] for t in twins]
        for t in twins:
            if t['maker'] and r['maker'] and t['maker'].lower().replace('-','')!=r['maker'].lower().replace('-',''):k['conflicts'].append(['maker',r['maker'],t['maker']])
        joined.append(k)
    joined.sort(key=lambda k:(-int(re.search(r'\d{4}',k['season'])[0]),['home','away','third','special'].index(k['type']),k['euro'],k['id']))
    json.dump(dict(club=club,retrieved=a.day,sources=dict(catalogue=man['source']),kitCount=len(joined),catalogueKits=len(joined),drawingOnlyKits=0,crossChecked=sum(1 for k in joined if k['twin']),typeConflicts=sum(1 for k in joined if k['conflicts']),kits=joined),open(f'content/manual/kit-archive-{club}.json','w'),ensure_ascii=False,indent=1)
    open(f'content/manual/kit-archive-{club}.json','a').write('\n')
    # wave: only kits the pack has no (season, type) for (a euro kit is its own kit)
    src=[dict(id=pid[p],title=f'{club} kits, catalogue page {i} — colours-of-football.com',url=PAGE_BASE+cat_dir+p,publisher='colours-of-football.com',access='available',checkedAt=a.day) for i,p in enumerate(pages,1)]
    wk=[]
    for k in joined:
        if k['twin']:continue
        colors='/'.join(k['shirt']['colours'])
        v=dict(name=f"{club} {k['season']} {k['type']}{' (European)' if k['euro'] else ''}",season=k['season'],type=k['type'],manufacturer=k['maker'],construction=dict(design=k['shirt']['design'],colors=colors),sponsor=k['sponsor'],
            shorts=dict(colour=k['shorts']['colour'],trim=k['shorts']['trim']),socks=dict(colour=k['socks']['colour'],trim=k['socks']['trim']))
        note=f"Catalogue: {k['evidence'][0]['ref']}. Season and type are the publisher's caption; colours are measured from its drawing; design, maker and the printed sponsor are transcribed from the drawing (single publisher)."+(' The transcription of this drawing was flagged uncertain.' if k['readUnsure'] else '')
        wk.append(dict(id=k['id'],value=v,sources=k['sources'],researchedAt=a.day,parserCertainty='medium',conflictFree=True,confidence=1,status='review',notes=note))
    outp=f'club-packs/{club}/wave-kits-cof-{a.day}.json'
    json.dump(dict(sources=src,kits=wk),open(outp,'w'),ensure_ascii=False,indent=1);open(outp,'a').write('\n')
    print(club,'kits',len(joined),'twins in pack',sum(1 for k in joined if k['twin']),'wave kits',len(wk),'maker conflicts',sum(1 for k in joined if k['conflicts']),'unsure',sum(k['readUnsure'] for k in joined))
main()
