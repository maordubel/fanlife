#!/usr/bin/env python3 -I
"""Drawn kits for shirt PHOTOGRAPHS the archive has no (season, type) for (13.10.2026).

Inputs : content/manual/kit-cfs-<club>.json and kit-shop-<club>.json (the photographs), content/manual/kit-reads/photo-shirts.json (a person's reading)
Outputs: appends origin='photo' records to content/manual/kit-archive-<club>.json (AEK: kit-aek-athens.json), idempotent (ids photo-k-NN, re-run replaces them)
Rule 11: shorts and socks are not in a shirt photograph, so they are absent; every kit is readUnsure; a colour that cannot be measured keeps the club's own
hex from its existing archive. Season and type are the source's, never guessed. Run, then export-kit-svgs.mjs / export-kit-icons.mjs for each club."""
import collections,json,os,sys
from PIL import Image
CLUBS=['aek-athens','celtic','hapoel-tel-aviv','olympiacos','panathinaikos','st-pauli','zrinjski-mostar']
HEX={'white':'#ffffff','black':'#1e1e1e','red':'#e30613','green':'#008057','navy':'#14224e','blue':'#1f4e9e','yellow':'#f3c20d','grey':'#8a8a8a','pink':'#e4577e','purple':'#4b2a7a','brown':'#5a3a22','cream':'#efe6d4','skyblue':'#6db3e0','maroon':'#6b1020','orange':'#e8731a'}
def classify(c):
    r,g,b=c;mx,mn=max(c),min(c)
    if mx<64:return 'black'
    if mn>235:return 'white'
    if mn>200 and r-b>=10 and r>=g-4:return 'cream'
    if mx-mn<28:return 'grey'
    if b>r+30 and mx<115:return 'navy'
    if r>200 and g>150 and b<110 and g>r*0.62:return 'yellow'
    if r>215 and g<140 and b>90 and r>b:return 'pink'
    if 50<r<170 and 45<=g<110 and b<90 and r>g+12 and g-b>=6:return 'brown'
    if r>150 and g<70 and b<70:return 'red'
    if g>r+25 and g>b+10:return 'green'
    if b>r+25 and b>150 and g>120:return 'skyblue'
    if b>r+60:return 'blue'
    return None
def gaps(club):
    f=f'content/manual/kit-archive-{club}.json' if club!='aek-athens' else 'content/manual/kit-aek-athens.json'
    j=json.load(open(f));have={(k['season'],k['type']) for k in j['kits'] if k['origin']!='photo'};out=[]
    for src in ('cfs','shop'):
        p=f'content/manual/kit-{src}-{club}.json'
        if os.path.exists(p):
            for k in json.load(open(p))['kits']:
                if k.get('season') and (k['season'],k['type']) not in have:out.append((src,k))
    return f,j,out
def measure(path,name,fallback):
    im=Image.open(path).convert('RGB');w,h=im.size;px=im.load();c=collections.Counter()
    for y in range(int(h*.32),int(h*.74),2):
        for x in range(int(w*.30),int(w*.70),2):
            r=classify(px[x,y])
            if r==name:c[px[x,y]]+=1
    return '#%02x%02x%02x'%c.most_common(1)[0][0] if c else fallback
def runs(path,trim,axis):
    im=Image.open(path).convert('RGB');w,h=im.size;px=im.load();seq=[]
    if axis=='col':
        for y in range(int(h*.30),int(h*.72)):seq.append(classify(px[int(w*.5),y]))
    else:
        for x in range(int(w*.28),int(w*.72)):seq.append(classify(px[x,int(h*.5)]))
    o=[];
    for s in seq:
        if o and o[-1][0]==s:o[-1][1]+=1
        else:o.append([s,1])
    return sum(1 for s,n in o if s==trim and n>=3)
def main():
    reads=json.load(open('content/manual/kit-reads/photo-shirts.json'))['reads'];idx=0;total=0
    for club in CLUBS:
        f,j,items=gaps(club);base_hex={}
        for k in j['kits']:
            for n,h in k['shirt'].get('hex',{}).items():base_hex.setdefault(n,h)
        kits=[k for k in j['kits'] if k['origin']!='photo'];new=[];n=0
        for src,k in items:
            r=reads.get(str(idx));idx+=1
            if not r:continue
            n+=1;p='public'+k['image']
            body,trim=r['body'],r['trim'];same=body==trim
            hb=measure(p,body,base_hex.get(body,HEX[body]));ht=hb if same else measure(p,trim,base_hex.get(trim,HEX[trim]))
            meas={}
            if r['design']=='hoops':meas['hoops']=r.get('count') or max(1,runs(p,trim,'col'))
            if r['design']=='stripes':meas['stripes']=r.get('count') or max(1,runs(p,trim,'row'))
            cred=k.get('credit') or {};pub=cred.get('publisher') or 'Club Football Shirts'
            page=cred.get('page') or k.get('page')
            maker=r['maker'] if 'maker' in r else k.get('maker')
            new.append(dict(id=f'photo-k-{n:02d}',origin='photo',season=k['season'],kind='season',type=k['type'],euro=False,
                shirt=dict(design=r['design'],colours=[body]+([] if same else [trim]),hex={body:hb,**({} if same else {trim:ht})},measured=meas),
                shorts=None,socks=None,maker=maker,sponsor=r.get('sponsor'),shortsSponsor=None,sources=[f'photo-{src}'],
                evidence=[dict(publisher=pub,ref=k.get('title') or f"{k['type']} {k['season']}",image=os.path.basename(k['image']),page=page)],
                image=k['image'],drawings=[],conflicts=[],notes=[],verified=None,readUnsure=True,twin=[]))
        j['kits']=kits+new;j['kitCount']=len(j['kits']);j['photoKits']=len(new)
        srcs=j.setdefault('sources',{})
        if new and isinstance(srcs,dict):srcs['photos']=dict(title='Shirt photographs (Club Football Shirts archive and four retail shops) read by eye for seasons the catalogue lacks',readOn='2026-10-13',note='Shorts and socks are not visible in a shirt photograph and are not drawn; every kit is readUnsure.')
        json.dump(j,open(f,'w'),ensure_ascii=False,indent=1);open(f,'a').write('\n');total+=len(new);print(club,len(new))
    print('total',total)
main()
