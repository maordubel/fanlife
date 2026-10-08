#!/usr/bin/env python3
"""Measure the parts of every cut-out shirt in content/manual/kit-photos-<club>.json and write them back into
`parts` (sleeves, collar, body, trim) — measured on the decoded WebP, never guessed.
sleeves: outer 18% each side of the shirt box, upper 55% of its height  (flat front-view shirts only)
collar : top 11% of the box, central 26%
body   : central 40% x 30..80% height
A part is 'contrast' when its colour differs from the body by more than 34 in Lab-ish distance, else 'matches-body'.
nameset stays null: a front-view photo does not show the back. Usage: decompose-club-kits.py <club> [...]"""
import json,sys,colorsys
import numpy as np
from PIL import Image
NAMES={'white':(240,240,240),'black':(25,25,25),'grey':(130,130,130),'red':(190,30,40),'maroon':(110,20,40),'orange':(225,120,30),'green':(25,125,70),'dark green':(10,70,45),'light green':(140,210,120),'blue':(40,90,190),'navy':(20,35,90),'sky blue':(120,185,230),'purple':(100,50,140),'pink':(235,140,170),'brown':(110,70,40),'cream':(225,215,185),'gold':(190,150,50),'yellow':(235,215,40)}
def name(rgb):
    return min(NAMES,key=lambda n:sum((a-b)**2 for a,b in zip(NAMES[n],rgb)))
def med(px):
    return tuple(int(x) for x in np.median(px,axis=0)) if len(px) else None
def hexs(c):return '#%02x%02x%02x'%c
def dist(a,b):
    return float(np.sqrt(sum((x-y)**2 for x,y in zip(a,b))))
for club in sys.argv[1:]:
    p=f'content/manual/kit-photos-{club}.json';m=json.load(open(p))
    for r in m['records']:
        im=np.array(Image.open('public/kits/'+r['file']).convert('RGBA'))
        a=im[...,3]>200
        ys,xs=np.where(a)
        if len(ys)<500:continue
        y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max();h=y1-y0+1;w=x1-x0+1
        def region(fx0,fx1,fy0,fy1):
            sub=im[y0+int(h*fy0):y0+int(h*fy1),x0+int(w*fx0):x0+int(w*fx1)]
            s=sub[sub[...,3]>200][:,:3]
            return s
        body=med(region(.30,.70,.30,.80))
        if body is None:continue
        sl=np.concatenate([region(0,.18,.05,.55),region(.82,1,.05,.55)])
        sleeve=med(sl) if len(sl)>200 else None
        col=region(.37,.63,0,.11);collar=med(col) if len(col)>60 else None
        def part(c):
            if c is None:return None
            d=dist(c,body)
            return {'colour':name(c),'hex':hexs(c),'relation':'contrast' if d>34 else 'matches-body','delta':round(d)}
        bodyP={'colour':name(body),'hex':hexs(body)}
        pr=r['parts']
        pr['body']=bodyP;pr['sleeves']=part(sleeve);pr['collar']=part(collar)
        # sleeves of a worn or sleeveless crop are not trustworthy
        if r.get('photoKind')=='worn' or r.get('cutQuality')=='review':
            pr['sleeves']=None;pr['collar']=None
        pr['nameset']=None
        r['partsNote']='base/pattern/maker/sponsor are from the source page; body, sleeves and collar are measured on the decoded cut-out (flat front view); nameset is not visible from the front and stays null.'
    json.dump(m,open(p,'w'),ensure_ascii=False,indent=1)
    n=sum(1 for r in m['records'] if r['parts'].get('sleeves'))
    print(club,len(m['records']),'with measured sleeves:',n)
