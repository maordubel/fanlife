#!/usr/bin/env python3 -I
"""Real photographs of vintage and current shirts from four retailers' public product feeds (Football Shirt Collective, Cult Kits, Shorty Football Shirts,
Vintage Football Shirts), for the clubs the app has open. Owner, 10.10.2026: "צא לסבב השלמת חוסרים ואיסוף תמונות אמיתיות של מדים לכל המועדונים".
Inputs : /tmp/shop/<store>.json (harvest-shops.py)         Outputs: public/club-kits/<club>/shop/*.webp (max 900px, q86) + content/manual/kit-shop-<club>.json
Rule 11: season, type and maker are only what the product title states; a title with no clear season or type is skipped; a range ("1989/91") is kept as the
publisher wrote it and its first season is the season; a single year is marked ambiguous. Training wear, polos, jackets, shorts, kids' and other clubs of the same name are dropped.
Each photograph carries the shop's name and the product page."""
import glob,json,os,re,time,urllib.request
from PIL import Image
CLUBS=[('hapoel-tel-aviv',r'hapoel[ -]?(tel[ -]?aviv|t\.?a\.?)'),('hapoel-petah-tikva',r'hapoel[ -]?petah'),('zrinjski-mostar',r'zrinjski'),('st-pauli',r'st\.? ?pauli'),('aek-athens',r'\baek\b(?! larnaca| larnaka)'),('olympiacos',r'olympia[ck]os(?! nicosia| volou| volos)'),('panathinaikos',r'panathinaikos'),('celtic',r'(?<!bloemfontein )\bceltic\b(?! park)')]
DROP=re.compile(r'train|polo|jacket|track|shorts?\b|hoodie|scarf|jersey short|kids?|boys|youth|junior|\bjnr\b|bomb|windbreak|shell|anthem|pre-?match|warm|vest|bag|cap\b|beanie|tee\b|t-shirt|women|ladies|\bwmns|poster|print|mug|book|programme|socks|bib',re.I)
MAKERS=['Umbro','Nike','adidas','Puma','Kappa','Macron','Hummel','Diadora','Lotto','New Balance','Under Armour','Asics','Capelli','Joma','Errea','Reebok','Fila','Admiral','Le Coq Sportif','Uhlsport','Zeus','Mizuno','Erreà']
STORE={'footballshirtcollective.com':('Football Shirt Collective','https://footballshirtcollective.com/'),'www.cultkits.com':('Cult Kits','https://www.cultkits.com/'),'shortyfootballshirts.com':('Shorty Football Shirts','https://shortyfootballshirts.com/'),'www.vintagefootballshirts.com':('Vintage Football Shirts','https://www.vintagefootballshirts.com/')}
UA='Mozilla/5.0 FanLifeKitArchive/1.0 (maordubel@gmail.com)'
def season(t):
    m=re.search(r'\b((?:19|20)\d{2})\s*[/-]\s*((?:19|20)?\d{2})\b',t)
    if m:
        y=int(m[1]);e=m[2][-2:];nxt=(y+1)%100
        return f'{y}/{(y+1)%100:02d}',(f'{y}-{e}' if int(e)!=nxt else None),False
    m=re.search(r'\b((?:19|20)\d{2})\b',t)
    return (f'{m[1]}',None,True) if m else (None,None,False)
def kind(t):
    l=t.lower()
    if re.search(r'goal\s*keeper|\bgk\b',l):return 'gk'
    if re.search(r'\bfourth\b|\b4th\b',l):return 'fourth'
    if re.search(r'\bthird\b|\b3rd\b',l):return 'third'
    if re.search(r'\baway\b',l):return 'away'
    if re.search(r'\bhome\b',l):return 'home'
    if re.search(r'cup final|champions|europe|uefa|final|centenary|anniversary|special',l):return 'special'
    return None
rows=[]
for f in sorted(glob.glob('/tmp/shop/*.json')):rows+=json.load(open(f))
kept={};skipped=0
for r in rows:
    t=r['title'];club=next((c for c,rx in CLUBS if re.search(rx,t,re.I)),None)
    if not club or DROP.search(t) or not r['images']:skipped+=1;continue
    s,rng,amb=season(t);k=kind(t)
    if not s or not k:skipped+=1;continue
    ls=bool(re.search(r'\bl/s\b|long sleeve',t,re.I));mk=next((m for m in MAKERS if re.search(re.escape(m),t,re.I)),None)
    key=(club,s,k,ls)
    kept.setdefault(key,[]).append(dict(r,club=club,season=s,range=rng,ambiguous=amb,kind=k,longSleeve=ls,maker=mk))
out={};n=0
for key,lst in sorted(kept.items()):
    lst.sort(key=lambda x:('#' in x['title'],x['store'],len(x['title'])))  # a shirt without a player's print first
    seen=set()
    for r in lst:
        if r['store'] in seen or len(seen)>=2:continue
        seen.add(r['store']);club=r['club'];os.makedirs(f'public/club-kits/{club}/shop',exist_ok=True)
        name=re.sub(r'[^a-z0-9]+','-',f"{r['store'].split('.')[-2] if r['store'].count('.')>1 else r['store'].split('.')[0]}-{r['handle']}".lower())[:90]
        dst=f'public/club-kits/{club}/shop/{name}.webp'
        if not os.path.exists(dst):
            src=r['images'][1 if ('#' in r['title'] and len(r['images'])>1) else 0]['src'].split('?')[0]  # a shop's first photo of a printed shirt is its back; the second is the front
            try:
                d=urllib.request.urlopen(urllib.request.Request(src,headers={'User-Agent':UA}),timeout=40).read();open('/tmp/shop/_t','wb').write(d)
                im=Image.open('/tmp/shop/_t').convert('RGBA');im.thumbnail((900,900),Image.LANCZOS);im.save(dst,'WEBP',quality=86,method=6)
            except Exception as e:print('skip',name,e);continue
            time.sleep(1.0)
        im=Image.open(dst);px=list(im.convert('RGB').getdata());ny=sum(1 for p in px if p[0]>200 and p[1]>150 and p[2]<110 and p[1]>p[0]*.62)/len(px)
        sn,sh=STORE[r['store']]
        out.setdefault(club,[]).append(dict(id=f"shop-{name}",type=r['kind'],season=r['season'],spans=r['range'],seasonAmbiguous=r['ambiguous'],longSleeve=r['longSleeve'],maker=r['maker'],title=r['title'],image=f'/club-kits/{club}/shop/{name}.webp',width=im.size[0],height=im.size[1],yellowShare=round(ny,4),credit=dict(publisher=sn,url=sh,page=f"{sh}products/{r['handle']}" if 'cultkits' not in r['store'] else f"{sh}products/{r['handle']}")));n+=1
for club,ks in out.items():
    ks.sort(key=lambda k:(k['season'],k['type']))
    json.dump(dict(source=dict(note='Retail product photographs of real shirts, from four shops\' public product feeds; used with the owner\'s approval (chat, 2026-10-10). Season, type and maker are the product title\'s words.',stores=[dict(publisher=a,url=b) for a,b in STORE.values()],readOn='2026-10-10'),count=len(ks),kits=ks),open(f'content/manual/kit-shop-{club}.json','w'),ensure_ascii=False,indent=1);print(club,len(ks))
for club,_ in CLUBS:  # every club has a file, so the app can import them all
    if club not in out:json.dump(dict(source=dict(note='No retail photograph found.',stores=[],readOn='2026-10-10'),count=0,kits=[]),open(f'content/manual/kit-shop-{club}.json','w'),indent=1)
print('photographs',n,'skipped',skipped)
