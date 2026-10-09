#!/usr/bin/env python3 -I
"""AEK Athens kit archive from Wikimedia Commons "Category:Football kit body/AEK Athens" (133 files, 38x59 px drawings).

Input  : a directory of the 133 PNGs named by their Commons file name (Kit body <code>.png), or --pdf <category-page.pdf>
         (the owner-exported category page; its embedded 38x59 images are extracted with pdfimages, in page order).
Output : content/manual/kit-commons-aek-athens.json  — one measured record per drawing (palette, stripe/hoop counts) and `kits`:
         the drawings folded to one per season+type (alternates listed). make-aek-wave.py joins this with the colours-of-football manifest.

The drawings themselves are NOT copied into the repository (licence of each file unchecked, rule 5): only measurements.
Rule 11: a field the drawing cannot state stays null. Maker and sponsor are therefore null unless a source states them;
what a drawing visibly carries (a swoosh, a printed word) is recorded under `observed`, never promoted to `manufacturer`.
Usage: make-aek-commons.py --pdf category.pdf [--day 2026-10-09]"""
import argparse,collections,datetime,json,os,re,subprocess,sys,tempfile
from PIL import Image

ORDER="""aek0001 aek0002 aek0002B aek0102 aek0204 aek0204a aek0204B aek04 aek04a aek0506 aek05C aek0607a
aek0607b aek0607h aek0607t aek0708a aek0708A aek0708h aek0708t aek0708T aek0809a aek0809h aek0809t aek0910a aek0910h aek0910t aek100995h aek1011a
aek1011g4 aek1011h aek1011t aek1011T aek1112h aek1112t aek1213a aek1213g1 aek1213h aek1213H aek1213t aek1314a aek1314h aek1516 aek1516a aek1516B
aek1516C aek1516h aek1617a aek1617h aek1718a aek1718c aek1718f aek1718h aek1819a aek1819h aek1819t aek1920a aek1920h AEK1924 aek1924 AEK1925
AEK1931 aek1931 aek2021a aek2021h aek2021t aek2223h aek2324h_v2 aek2324h aek2425a aek2425h aek2627a aek2627h aek2627t aek8889(2) aek8889 aek9192
aek9395a aek9496h aek9900 aek9900a aek9900h aekfc0001a aekfc0001h aekfc0001t aekfc0102t aekfc0203a aekfc0203h aekfc0203t aekfc0304t aekfc04a aekfc04h aekfc04t
aekfc0506a aekfc0506h aekfc0506t aekfc05a aekfc05h aekfc05t aekfc0607a aekfc0607h aekfc0607t aekfc0708a aekfc0708h aekfc0708t aekfc0809a aekfc0809h aekfc0809t aekfc0910a
aekfc0910t aekfc1011a aekfc1011h aekfc1011t aekfc1112h aekfc1112t aekfc1213a aekfc1213h aekfc1213t aekfc1314a aekfc1314h aekfc1415h aekfc1516a aekfc1516h aekfc15f aekfc1718a
aekfc1718c aekfc1718h aekfc1819a aekfc1819h aekfc2526a aekfc2526h aekfc2526t aekfc7981 aekfc9900h""".split()

# What the drawing shows, read by eye and checked against the measured runs: design (the club-wave vocabulary), colours (body first, then trim).
# 'obs' records marks the drawing visibly carries; it is an observation about a 38px drawing, not a sourced fact.
T={
'aek0001':('plain','yellow/black',{'sponsorText':'MARFIN','makerMark':'swoosh'}),
'aek0002':('plain','yellow/black',{'makerMark':'swoosh'}),
'aek0002B':('plain','black/yellow',{'makerMark':'swoosh'}),
'aek0102':('plain','yellow/black',{'sponsorText':'ALPHA DIGITAL','makerMark':'swoosh'}),
'aek0204':('stripes','yellow/black',{'makerMark':'swoosh'}),
'aek0204a':('stripes','yellow/black',{'makerMark':'swoosh'}),
'aek0204B':('plain','maroon/black',{'makerMark':'swoosh'}),
'aek04':('plain','yellow/black',{'makerMark':'swoosh'}),
'aek04a':('plain','yellow/black',{'makerMark':'swoosh'}),
'aek0506':('plain','grey/black',{'makerMark':'triangle'}),
'aek05C':('stripes','skyblue/white',{'makerMark':'triangle'}),
'aek0607a':('contrasting sleeves','black/yellow',{'makerMark':'triangle'}),
'aek0607b':('contrasting sleeves','black/yellow',{'makerMark':'triangle'}),
'aek0607h':('contrasting sleeves','yellow/black',{'makerMark':'triangle'}),
'aek0607t':('plain','skyblue/white',{'makerMark':'triangle'}),
'aek0708a':('contrasting sleeves','black/yellow',{'makerMark':'N-mark'}),
'aek0708A':('contrasting sleeves','yellow/black',{'makerMark':'N-mark'}),
'aek0708h':('contrasting sleeves','yellow/black',{'makerMark':'N-mark'}),
'aek0708t':('plain','white/black',{'makerMark':'N-mark','sponsorText':'LG'}),
'aek0708T':('plain','white/black',{'makerMark':'N-mark'}),
'aek0809a':('contrasting sleeves','black/yellow',{'makerMark':'N-mark'}),
'aek0809h':('contrasting sleeves','yellow/black',{'makerMark':'N-mark'}),
'aek0809t':('contrasting sleeves','maroon/cream',{'makerMark':'N-mark'}),
'aek0910a':('plain','black/yellow',{'makerMark':'N-mark'}),
'aek0910h':('pinstripes','yellow/black',{'makerMark':'N-mark'}),
'aek0910t':('plain','grey/yellow',{'makerMark':'N-mark'}),
'aek100995h':('plain','yellow/black',{}),
'aek1011a':('pinstripes','yellow/black',{'makerMark':'N-mark','sponsorText':'KINO'}),
'aek1011g4':('plain','blue/black',{'sponsorText':'KINO'}),
'aek1011h':('stripes','yellow/black',{'makerMark':'N-mark'}),
'aek1011t':('contrasting sleeves','skyblue/orange',{'makerMark':'N-mark','sponsorText':'KINO'}),
'aek1011T':('contrasting sleeves','skyblue/orange',{'makerMark':'N-mark'}),
'aek1112h':('plain','yellow/black',{'makerMark':'N-mark'}),
'aek1112t':('sash','white/black',{'makerMark':'N-mark','sponsorText':'KINO'}),
'aek1213a':('sash','black/yellow',{'makerMark':'N-mark'}),
'aek1213g1':('chest band','orange/black',{'sponsorText':'KINO'}),
'aek1213h':('chest band','yellow/black',{'makerMark':'N-mark'}),
'aek1213H':('chest band','yellow/black',{'makerMark':'N-mark'}),
'aek1213t':('plain','white/black',{'makerMark':'N-mark'}),
'aek1314a':('sash','black/yellow',{'makerMark':'N-mark'}),
'aek1314h':('sash','yellow/black',{'makerMark':'N-mark'}),
'aek1516':('stripes','yellow/black',{'makerMark':'swoosh'}),
'aek1516a':('sash','yellow/black',{'makerMark':'swoosh'}),
'aek1516B':('plain','white/black',{'makerMark':'swoosh'}),
'aek1516C':('plain','maroon/black',{'makerMark':'swoosh'}),
'aek1516h':('stripes','yellow/black',{'makerMark':'swoosh'}),
'aek1617a':('plain','pink/white',{'makerMark':'swoosh'}),
'aek1617h':('pinstripes','black/yellow',{'makerMark':'swoosh'}),
'aek1718a':('plain','grey/black',{'makerMark':'swoosh'}),
'aek1718c':('graphic','black/grey',{'note':'dark tone-on-tone double-headed eagle print'}),
'aek1718f':('plain','white/black',{'makerMark':'swoosh'}),
'aek1718h':('stripes','yellow/black',{'makerMark':'swoosh'}),
'aek1819a':('plain','black/yellow',{'makerMark':'swoosh'}),
'aek1819h':('stripes','yellow/black',{'makerMark':'swoosh'}),
'aek1819t':('plain','blue/yellow',{'makerMark':'swoosh'}),
'aek1920a':('graphic','black/yellow',{'makerMark':'swoosh'}),
'aek1920h':('diagonal','yellow/black',{'makerMark':'swoosh'}),
'AEK1924':('stripes','yellow/black',{'note':'historic recreation, white collar'}),
'aek1924':('stripes','yellow/black',{'note':'historic recreation, white collar'}),
'AEK1925':('stripes','yellow/black',{'note':'historic recreation, white collar'}),
'AEK1931':('hoops','yellow/black',{'note':'historic recreation, collared'}),
'aek1931':('hoops','yellow/black',{'note':'historic recreation, collared'}),
'aek2021a':('hoops','black/grey',{'makerMark':'swoosh'}),
'aek2021h':('half-and-half','yellow/black',{'makerMark':'swoosh'}),
'aek2021t':('plain','cream/grey',{}),
'aek2223h':('graphic','yellow/black',{'makerMark':'swoosh','note':'tiger-stripe print'}),
'aek2324h_v2':('hoops','yellow/black',{'makerMark':'swoosh','sponsorText':'(sponsor band)'}),
'aek2324h':('plain','yellow/black',{'makerMark':'swoosh'}),
'aek2425a':('contrasting sleeves','black/yellow',{'makerMark':'swoosh'}),
'aek2425h':('contrasting sleeves','yellow/black',{'makerMark':'swoosh'}),
'aek2627a':('pinstripes','black/grey',{'makerMark':'swoosh'}),
'aek2627h':('stripes','yellow/black',{'makerMark':'swoosh'}),
'aek2627t':('plain','skyblue/black',{'makerMark':'swoosh'}),
'aek8889(2)':('graphic','yellow/black',{'note':'dotted print'}),
'aek8889':('graphic','yellow/black',{'note':'dotted print'}),
'aek9192':('graphic','yellow/black',{'note':'white print on yellow'}),
'aek9395a':('graphic','grey/black',{'note':'eagle silhouette print'}),
'aek9496h':('graphic','yellow/black',{'note':'large crest print on chest'}),
'aek9900':('plain','yellow/black',{}),
'aek9900a':('contrasting sleeves','grey/black',{}),
'aek9900h':('contrasting sleeves','yellow/black',{}),
'aekfc0001a':('plain','black/yellow',{}),'aekfc0001h':('plain','yellow/black',{}),'aekfc0001t':('plain','skyblue/black',{}),
'aekfc0102t':('plain','skyblue/black',{}),'aekfc0203a':('plain','maroon/yellow',{}),'aekfc0203h':('stripes','yellow/black',{}),
'aekfc0203t':('gradient','skyblue/white',{}),'aekfc0304t':('sash','skyblue/white',{}),
'aekfc04a':('plain','skyblue/white',{}),'aekfc04h':('plain','yellow/black',{}),'aekfc04t':('plain','white/yellow',{}),
'aekfc0506a':('contrasting sleeves','black/yellow',{}),'aekfc0506h':('contrasting sleeves','yellow/black',{}),'aekfc0506t':('contrasting sleeves','grey/black',{}),
'aekfc05a':('plain','black/yellow',{}),'aekfc05h':('plain','yellow/black',{}),'aekfc05t':('stripes','skyblue/white',{}),
'aekfc0607a':('contrasting sleeves','black/yellow',{}),'aekfc0607h':('contrasting sleeves','yellow/black',{}),'aekfc0607t':('plain','skyblue/white',{}),
'aekfc0708a':('contrasting sleeves','black/yellow',{}),'aekfc0708h':('contrasting sleeves','yellow/black',{}),'aekfc0708t':('plain','white/black',{}),
'aekfc0809a':('contrasting sleeves','black/yellow',{}),'aekfc0809h':('contrasting sleeves','yellow/black',{}),'aekfc0809t':('contrasting sleeves','maroon/cream',{}),
'aekfc0910a':('plain','black/yellow',{}),'aekfc0910t':('plain','grey/yellow',{}),
'aekfc1011a':('plain','yellow/black',{}),'aekfc1011h':('stripes','yellow/black',{}),'aekfc1011t':('contrasting sleeves','skyblue/orange',{}),
'aekfc1112h':('plain','yellow/black',{}),'aekfc1112t':('sash','white/black',{}),
'aekfc1213a':('sash','black/yellow',{}),'aekfc1213h':('chest band','yellow/black',{}),'aekfc1213t':('plain','white/black',{}),
'aekfc1314a':('sash','black/yellow',{}),'aekfc1314h':('sash','yellow/black',{}),'aekfc1415h':('stripes','yellow/black',{}),
'aekfc1516a':('plain','white/black',{}),'aekfc1516h':('stripes','yellow/black',{}),'aekfc15f':('sash','yellow/black',{}),
'aekfc1718a':('plain','grey/black',{}),'aekfc1718c':('graphic','black/grey',{'note':'dark tone-on-tone double-headed eagle print'}),'aekfc1718h':('stripes','yellow/black',{}),
'aekfc1819a':('plain','black/yellow',{}),'aekfc1819h':('stripes','yellow/black',{}),
'aekfc2526a':('pinstripes','black/yellow',{}),'aekfc2526h':('stripes','yellow/black',{}),'aekfc2526t':('graphic','white/skyblue',{}),
'aekfc7981':('plain','yellow/black',{}),'aekfc9900h':('plain','yellow/black',{}),
}
assert set(T)==set(ORDER),(set(ORDER)-set(T),set(T)-set(ORDER))

def classify(c):
    r,g,b=c;mx,mn=max(c),min(c)
    if mx<64:return 'black'
    if mn>235:return 'white'
    if mn>200 and r-b>=10 and r>=g-4:return 'cream'
    if mx-mn<28:return 'grey'
    if r>200 and g>150 and b<110 and g>r*0.62:return 'yellow'
    if r>225 and 70<g<140 and b<90:return 'orange'
    if r>225 and g<140 and b>90:return 'pink'
    if r>40 and g<45 and b<90 and r<150:return 'maroon'
    if r>215 and g>200 and b>150 and r-b>14 and g>180:return 'cream'
    if b>r+25 and b>150 and g>120:return 'skyblue'
    if b>r+60:return 'blue'
    return None
def palette(im):
    px=im.load();W,H=im.size;by=collections.defaultdict(collections.Counter)
    for y in range(H):
        for x in range(W):
            c=px[x,y];k=classify(c)
            if k and not(k=='white' and (x<4 or x>W-5 or y<4)):by[k][c]+=1
    return {k:('#%02x%02x%02x'%v.most_common(1)[0][0],sum(v.values())) for k,v in by.items()}
def runs(seq):
    o=[]
    for c in seq:
        if o and o[-1][0]==c:o[-1][1]+=1
        else:o.append([c,1])
    return o
def trim_runs(im,trim,axis,pos,lo,hi):
    px=im.load();W,H=im.size
    seq=[classify(px[a,pos] if axis=='row' else px[pos,a]) for a in range(lo,hi)]
    return sum(1 for k,n in runs(seq) if k==trim and n>=2)

# suffix-less drawings whose same-season twin in the other series carries an h/a/t suffix and the same colours
INFER={'aek0001':'home','aek0002':'home','aek0002B':'away','aek0102':'home','aek0204':'home','aek0204B':'away','aek04':'home','aek0506':'third','aek05C':'third','aek1516':'home','aek1516B':'away','aek9900':'home'}
def season_of(code):
    s=code.lower().replace('_v2','').replace('(2)','');m=re.fullmatch(r'(?:aekfc|aek)(\d{2})(\d{2})([a-z0-9]*)',s)
    if re.fullmatch(r'aek(19\d\d)',s):return s[3:],'year',False   # aek1924 / aek1925 / aek1931
    if not m:
        m2=re.fullmatch(r'(?:aekfc|aek)(\d{2})([a-z]*)',s)
        if m2:return ('20'+m2[1] if int(m2[1])<50 else '19'+m2[1]),'year',True
        return None,'unknown',True
    a,b=m[1],m[2]
    if m[3] and re.fullmatch(r'\d{6}.*',a+b+m[3]):return None,'unknown',True
    y1=int(('20' if int(a)<50 else '19')+a);y2=int(b)
    gap=(y2-int(a))%100
    if gap==1:return f'{y1}/{b}','season',False
    return f'{y1}–{b}','range',False
def type_of(code):
    s=code.replace('(2)','').replace('_v2','')
    m=re.search(r'(\d{2,4})([a-zA-Z]+\d?)$',s)
    suf=m[2] if m else ''
    if re.fullmatch(r'aek(fc)?\d{4}',s,re.I) is None and not m:suf=''
    if suf in('h','a','t'):return {'h':'home','a':'away','t':'third'}[suf],'filename-suffix'
    if suf.startswith('g'):return 'goalkeeper','filename-suffix'
    if code in INFER:return INFER[code],'twin-series-inference'
    return 'special','filename-suffix-unrecognised' if suf else 'no-suffix'

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--pdf',required=True);ap.add_argument('--day',default=datetime.date.today().isoformat());a=ap.parse_args()
    tmp=tempfile.mkdtemp(prefix='aekkits-')
    subprocess.run(['pdfimages','-png','-f','1','-l','9',a.pdf,os.path.join(tmp,'p')],check=True,capture_output=True)
    lst=subprocess.run(['pdfimages','-list','-f','1','-l','9',a.pdf],check=True,capture_output=True,text=True).stdout.splitlines()[2:]
    idx=[int(l.split()[1]) for l in lst if l.split()[2]=='image' and l.split()[3]=='38' and l.split()[4] in('58','59')]
    assert len(idx)==len(ORDER)==133,(len(idx),len(ORDER))
    recs=[]
    for code,i in zip(ORDER,idx):
        im=Image.open(os.path.join(tmp,f'p-{i:03d}.png')).convert('RGB')
        design,cols,obs=T[code];names=cols.split('/');pal=palette(im)
        base,trim=names[0],names[1]
        if code=='aek2627a':pal['grey']=('#272727',0)  # the dark-grey pinstripe sits below the black threshold
        miss=[n for n in names if n not in pal]
        if miss:print('MISSING',code,miss,{k:v[0] for k,v in pal.items()});continue
        season,kind,amb=season_of(code);typ,tsrc=type_of(code)
        meas={}
        if design=='stripes':meas['stripes']=trim_runs(im,trim,'row',34,0,38)
        if design=='hoops':meas['hoops']=trim_runs(im,trim,'col',19,14,56)
        recs.append(dict(file=f'Kit body {code.replace("_v2"," v2")}.png',code=code,series='aekfc' if code.startswith('aekfc') else 'aek',season=season,seasonKind=kind,seasonAmbiguous=amb,
            type=typ,typeSource=tsrc,design=design,colours=names,hex={n:pal[n][0] for n in names},measured=meas,observed=obs))
    json.dump(dict(source='https://commons.wikimedia.org/wiki/Category:Football_kit_body/AEK_Athens',retrieved=a.day,count=len(recs),
        method='38x59 drawings extracted from the owner-exported category page; palette = most frequent exact pixel colour per colour family; stripes/hoops = counted runs; design read by eye.',records=recs),
        open('content/manual/kit-commons-aek-athens.json','w'),ensure_ascii=False,indent=1);open('content/manual/kit-commons-aek-athens.json','a').write('\n')
    # wave: one kit per (season,type); the older `aek` drawing is kept, `aekfc` only where it is the sole drawing
    chosen={};alts=collections.defaultdict(list)
    for r in recs:
        if r['type']=='goalkeeper' or r['season'] is None:continue
        if '(2)' in r['code']:
            base=next(q for q in recs if q['code']==r['code'].replace('(2)',''));alts[(base['season'],'special:'+base['design']+base['hex'][base['colours'][0]])].append(r['file']);continue
        if r['code'][-1].isupper():  # A/B/C/H/T: an alternate drawing — when it repeats a same-season h/a/t kit (same body colour and design) it is that kit's alternate, not a kit
            twin=next((q for q in recs if q['season']==r['season'] and q['type'] in('home','away','third') and q['colours'][0]==r['colours'][0] and q['design']==r['design'] and q['code']!=r['code']),None)
            if twin:alts[(twin['season'],twin['type'])].append(r['file']);continue
        key=(r['season'],r['type'] if r['type']!='special' else 'special:'+r['design']+r['hex'][r['colours'][0]])
        if key in chosen:
            if chosen[key]['series']=='aekfc' and r['series']=='aek':alts[key].append(chosen[key]['file']);chosen[key]=r
            else:alts[key].append(r['file'])
        else:chosen[key]=r
    kits=[]
    for (season,_),r in sorted(chosen.items(),key=lambda kv:(kv[1]['season'],kv[1]['type'])):
        kits.append({k:r[k] for k in ('code','file','season','seasonKind','seasonAmbiguous','type','typeSource','design','colours','hex','measured','observed')}|{'alts':alts[(season,_)]})
    man=json.load(open('content/manual/kit-commons-aek-athens.json'));man['kits']=kits;man['kitCount']=len(kits)
    json.dump(man,open('content/manual/kit-commons-aek-athens.json','w'),ensure_ascii=False,indent=1);open('content/manual/kit-commons-aek-athens.json','a').write('\n')
    print('records',len(recs),'kits',len(kits))
main()
