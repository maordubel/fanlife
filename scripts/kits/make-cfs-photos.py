#!/usr/bin/env python3 -I
"""Shirt photographs from Club Football Shirts (clubfootballshirts.com) — the "Football Shirt Archive" page of each open club.
Owner, 10.10.2026: "תאסוף את כל המדים של כל הקבוצות שיש לנו כרגע פתוחות, צרף הכל לארכיון המדים המקורי, יש אישור."
Inputs : --list list.json (club, type, season, file, url, page)   --images DIR (downloaded originals)
Outputs: public/club-kits/<club>/cfs/<type>-<season>.webp (max 900px, WebP q88)   content/manual/kit-cfs-<club>.json
Rule 11: the type and season are only what the file name states ("<club>-<type>-<yyyy>-<yyyy>-football-shirt-archive"); a cup shirt is type `special`. Nothing about maker/sponsor is read from a photograph here.
Usage: make-cfs-photos.py --list L --images D"""
import argparse,collections,json,os,re
from PIL import Image
ap=argparse.ArgumentParser();ap.add_argument('--list',required=True);ap.add_argument('--images',required=True);a=ap.parse_args()
rows=json.load(open(a.list));by=collections.defaultdict(list);yellow=0
def cls(c):
    r,g,b=c;return r>200 and g>150 and b<110 and g>r*.62
for r in rows:
    src=os.path.join(a.images,r['file'])
    if not os.path.exists(src):continue
    im=Image.open(src).convert('RGBA');im.thumbnail((900,900),Image.LANCZOS)
    t=r['type'];n=f"{t}-{r['season'].replace('/','-')}";d=f"public/club-kits/{r['club']}/cfs";os.makedirs(d,exist_ok=True)
    if os.path.exists(f'{d}/{n}.webp'):n+=f"-{len(by[r['club']])}"
    im.save(f'{d}/{n}.webp','WEBP',quality=88,method=6)
    px=list(im.convert('RGB').getdata());ny=sum(1 for p in px if cls(p))/len(px)
    by[r['club']].append(dict(id=f"cfs-{n}",type=t,season=r['season'],image=f"/club-kits/{r['club']}/cfs/{n}.webp",width=im.size[0],height=im.size[1],yellowShare=round(ny,4),page=r['page'],original=r['url']))
for club,ks in by.items():
    ks.sort(key=lambda k:(k['season'],k['type']))
    j=dict(source=dict(publisher='Club Football Shirts',url='https://www.clubfootballshirts.com/',archivePage=ks[0]['page'],licence='Photographs of shirts from the publisher\'s archive pages, used with the owner\'s approval (chat, 2026-10-10). Credit travels with every photograph.',readOn='2026-10-10'),count=len(ks),kits=ks)
    json.dump(j,open(f'content/manual/kit-cfs-{club}.json','w'),ensure_ascii=False,indent=1);print(club,len(ks))
