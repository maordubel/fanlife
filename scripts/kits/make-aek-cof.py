#!/usr/bin/env python3 -I
"""AEK Athens complete kits (shirt, shorts, socks) as catalogued by colours-of-football.com (© Mikhail Sipovich, updated 13.04.2026).

The site is read as a reference publisher: season and type come from its captions ("home kit 2002-2003"), the maker and the printed
sponsor from what its drawings show, shorts/socks colours from the pixels. The drawings are NOT copied into the repository
(© the publisher; rule 5): only the measurements are stored, and every garment on our page is our own drawing.
Rule 11: a mark that cannot be read stays null. `--fetch` downloads the four catalogue pages (1 request/second, plain GET) into --cache.
Usage: make-aek-cof.py --cache DIR [--fetch] [--day YYYY-MM-DD]"""
import argparse,collections,datetime,html,json,os,re,subprocess,sys,time
from PIL import Image
BASE='https://www.colours-of-football.com/colours03/gre/aek/'
PAGES=['aek_1.html','aek_2.html','aek_athens_3.html','aek_athens_4.html']

# Read by eye from the drawings, index = order in the catalogue (57). shirt = (design, body, trim); maker/sponsor as drawn;
# shorts_trim / socks_trim = a second colour that is plainly visible on the garment, else None.
M={'Nike':'Nike','adidas':'adidas','Puma':'Puma','Capelli':'Capelli Sport'}
S=lambda i,design,body,trim,maker,sponsor,st=None,sk=None,sh=None:dict(i=i,design=design,body=body,trim=trim,maker=maker,sponsor=sponsor,shorts_trim=st,socks_trim=sk,shirt_note=sh)
ROWS=[
S(1,'stripes','yellow','black','Nike','Alpha Digital','yellow','black'),
S(2,'gradient','skyblue','white','Nike','Alpha Digital',None,'white'),
S(3,'stripes','yellow','black','Nike','Piraeus Bank','yellow','black'),
S(4,'sash','skyblue','white','Nike','Piraeus Bank'),
S(5,'plain','yellow','black','Nike',None),
S(6,'plain','skyblue','white','Nike',None),
S(7,'plain','yellow','black','adidas','TIM','yellow','black'),
S(8,'contrasting sleeves','black','yellow','adidas','TIM','yellow','yellow'),
S(9,'stripes','white','skyblue','adidas','TIM','grey','black'),
S(10,'contrasting sleeves','black','yellow','adidas','TIM','yellow','yellow'),
S(11,'contrasting sleeves','yellow','black','adidas','TIM','black','black'),
S(12,'contrasting sleeves','yellow','black','adidas','LG','black','black'),
S(13,'contrasting sleeves','black','yellow','adidas','LG','yellow','yellow'),
S(14,'plain','yellow','black','Puma','LG','black'),
S(15,'plain','black','yellow','Puma','LG','yellow'),
S(16,'plain','white','black','Puma','LG'),
S(17,'plain','black','yellow','Puma','LG',None,'yellow'),
S(18,'plain','yellow','black','Puma','LG',None,'black'),
S(19,'plain','maroon','cream','Puma','LG','cream','cream'),
S(20,'plain','yellow','black','Puma',None,None,'black'),
S(21,'plain','navy','yellow','Puma',None,'yellow','yellow'),
S(22,'plain','grey','yellow','Puma',None,'yellow','yellow'),
S(23,'stripes','black','yellow','Puma',None,None,'yellow'),
S(24,'plain','yellow','black','Puma',None,'black','black'),
S(25,'plain','blue','orange','Puma',None,'orange','orange'),
S(26,'plain','yellow','black','Puma','Kino',None,None),
S(27,'stripes','black','yellow','Puma','Kino',None,'yellow'),
S(28,'pinstripes','black','yellow','Nike','Pame Stoixima'),
S(29,'plain','pink','white','Nike','Pame Stoixima'),
S(30,'stripes','yellow','black','Nike','Pame Stoixima'),
S(31,'stripes','yellow','black','Nike','Pame Stoixima'),
S(32,'plain','grey','black','Nike','Pame Stoixima'),
S(33,'plain','black','grey','Nike','Pame Stoixima'),
S(34,'stripes','yellow','black','Capelli Sport','Pame Stoixima'),
S(35,'plain','black','yellow','Capelli Sport','Pame Stoixima'),
S(36,'plain','blue','yellow','Capelli Sport','Pame Stoixima'),
S(37,'diagonal','yellow','black','Capelli Sport','Pame Stoixima'),
S(38,'chest band','black','yellow','Capelli Sport','Pame Stoixima'),
S(39,'half-and-half','yellow','black','Capelli Sport','Pame Stoixima'),
S(40,'hoops','black','grey','Capelli Sport','Pame Stoixima',None,'yellow'),
S(41,'plain','cream','grey','Capelli Sport','Pame Stoixima'),
S(42,'stripes','yellow','black','Nike','Pame Stoixima'),
S(43,'plain','black','grey','Nike','Pame Stoixima'),
S(44,'plain','blue','skyblue','Nike','Pame Stoixima','white'),
S(45,'graphic','yellow','black','Nike','Pame Stoixima',None,'black'),
S(46,'plain','yellow','yellow','Nike','Pame Stoixima'),
S(47,'plain','maroon','maroon','Nike','Pame Stoixima'),
S(48,'plain','yellow','black','Nike','Pame Stoixima',None,'black'),
S(49,'plain','orange','orange','Nike','Pame Stoixima'),
S(50,'plain','black','grey','Nike','Pame Stoixima'),
S(51,'contrasting sleeves','yellow','black','Nike','Pame Stoixima',None,'black'),
S(52,'plain','white','white','Nike','Pame Stoixima'),
S(53,'contrasting sleeves','black','yellow','Nike','Pame Stoixima'),
S(54,'stripes','yellow','black','Nike','Pame Stoixima'),
S(55,'stripes','yellow','black','Nike','Pame Stoixima',None,None),
S(56,'graphic','white','skyblue','Nike','Pame Stoixima'),
S(57,'graphic','black','yellow','Nike','Pame Stoixima'),
]
LG_SHORTS=range(34,45)   # "LG" printed on the shorts of the 2018-19 .. 2021-22 kits

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
    if 40<r<150 and g<95 and b<95 and r>g+15:return 'maroon'
    if b>r+25 and b>150 and g>120:return 'skyblue'
    if b>r+60:return 'blue'
    return None
def region_pal(im,box,name):
    px=im.load();x0,y0,x1,y1=box;by=collections.defaultdict(collections.Counter);allc=collections.Counter()
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b,a=px[x,y]
            if a<250:continue
            c=(r,g,b);allc[c]+=1;k=classify(c)
            if k:by[k][c]+=1
    if name=='navy':
        nv=collections.Counter()
        for y in range(y0,y1):
            for x in range(x0,x1):
                r,g,b,a=px[x,y]
                if a>=250 and b-r>=12 and max(r,g,b)<115:nv[(r,g,b)]+=1
        if nv:return '#%02x%02x%02x'%nv.most_common(1)[0][0],True
    if name in by:return '#%02x%02x%02x'%by[name].most_common(1)[0][0],True
    body=[(c,n) for c,n in allc.most_common() if classify(c) not in('black',)]
    return ('#%02x%02x%02x'%(body or allc.most_common())[0][0],False)
def dominant(im,box):
    px=im.load();x0,y0,x1,y1=box;f=collections.Counter()
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b,a=px[x,y]
            if a>=250:
                k=classify((r,g,b))
                if k:f[k]+=1
    return f.most_common(1)[0][0] if f else None
SHIRT=(10,10,118,100);SHORTS=(12,138,118,208);SOCKS=(128,110,156,200)
def season_of(cap):
    m=re.search(r'(\d{4})[-–](\d{2,4})',cap)
    a,b=m[1],m[2][-2:]
    if int(b)-int(a[2:])==1 or (a[2:]=='99' and b=='00'):return f'{a}/{b}','season'
    return f'{a}–{b}','range'
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--cache',required=True);ap.add_argument('--fetch',action='store_true');ap.add_argument('--day',default=datetime.date.today().isoformat());a=ap.parse_args()
    os.makedirs(a.cache,exist_ok=True)
    if a.fetch:
        for p in PAGES:
            subprocess.run(['curl','-sS','-m','25','-o',os.path.join(a.cache,p),BASE+p],check=True);time.sleep(1)
    items=[]
    for p in PAGES:
        s=open(os.path.join(a.cache,p),encoding='latin-1').read();t=re.sub(r'<script.*?</script>|<style.*?</style>','',s,flags=re.S)
        imgs=re.findall(r'src="(gre_aek[^"]+\.(?:png|gif))"',t);txt=re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',t)))
        caps=re.findall(r'((?:home|away|third)(?: euro)? kit \d{4}[-–]\d{2,4})',txt);assert len(imgs)==len(caps),(p,len(imgs),len(caps))
        items+=[(p,i,c) for i,c in zip(imgs,caps)]
    assert len(items)==len(ROWS)==57,(len(items),len(ROWS))
    if a.fetch:
        for _,i,_ in items:
            if not os.path.exists(os.path.join(a.cache,i)):subprocess.run(['curl','-sS','-m','25','-o',os.path.join(a.cache,i),BASE+i],check=True);time.sleep(0.5)
    recs=[]
    for (page,img,cap),row in zip(items,ROWS):
        im=Image.open(os.path.join(a.cache,img)).convert('RGBA')
        season,kind=season_of(cap);t=cap.split()[0];euro=' euro ' in cap
        hb,ok1=region_pal(im,SHIRT,row['body']);ht=region_pal(im,SHIRT,row['trim'])[0] if row['trim']!=row['body'] else hb
        shorts=dominant(im,SHORTS);socks=dominant(im,SOCKS)
        if row['design']=='gradient':hb=region_pal(im,SOCKS,'skyblue')[0]  # the shirt fades from this blue (sleeves, socks) to the pale tone measured as trim
        if row['design']=='gradient':ht=region_pal(im,SHIRT,'skyblue')[0]
        sh_hex,_=region_pal(im,SHORTS,shorts);sk_hex,_=region_pal(im,SOCKS,socks)
        trim_hex=lambda name,box:region_pal(im,box,name)[0] if name else None
        recs.append(dict(i=row['i'],caption=cap,page=page,image=img,season=season,seasonKind=kind,type=t,euro=euro,
            shirt=dict(design=row['design'],body=row['body'],trim=row['trim'],hex=dict(body=hb,trim=ht),bodyMeasured=ok1),
            maker=row['maker'],sponsor=row['sponsor'],shortsSponsor='LG' if row['i'] in LG_SHORTS else None,
            shorts=dict(colour=shorts,hex=sh_hex,trim=row['shorts_trim'],trimHex=trim_hex(row['shorts_trim'],SHORTS)),
            socks=dict(colour=socks,hex=sk_hex,trim=row['socks_trim'],trimHex=trim_hex(row['socks_trim'],SOCKS),bands=bool(row['socks_trim']))))
    out=dict(source=BASE+'aek_1.html',publisher='colours-of-football.com (Mikhail Sipovich)',retrieved=a.day,count=len(recs),
        method='Season/type from captions; maker mark and printed sponsor read by eye from the drawings; colours measured from pixels in fixed regions (shirt, shorts, socks) with the transparent background excluded.',records=recs)
    json.dump(out,open('content/manual/kit-cof-aek-athens.json','w'),ensure_ascii=False,indent=1);open('content/manual/kit-cof-aek-athens.json','a').write('\n')
    bad=[(r['i'],r['shirt']['body']) for r in recs if not r['shirt']['bodyMeasured']];print('records',len(recs),'body colour not in measured family:',bad)
main()
