#!/usr/bin/env python3
"""Measures each catalogue kit's stripes and hoops from its reference drawing (colours-of-football template, ~159x215), 14.11.2026.
The drawing is read, never copied: along a vertical line at the side of the torso (clear of crest and sponsor) and a horizontal
line under the sponsor, every pixel is classed to the nearest of the kit's own recorded colours; the runs that survive smoothing
become measured.runsY / measured.runsX — fractions of the torso with a colour index — which the renderer draws exactly.
  python3 scripts/kits/measure-cof.py [club ...]   (writes content/manual/kit-archive-<club>.json in place)"""
import json,os,sys
from PIL import Image
R=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TX0,TX1,TY0,TY1=34,113,4,128   # torso box in the template (measured on the template: 32..115 wide, collar 0..4, hem ~130)
def rgb(h):h=h.lstrip('#');return tuple(int(h[i:i+2],16) for i in (0,2,4))
def runs(px,inks,minrun):
    idx=[min(range(len(inks)),key=lambda i:sum((a-b)**2 for a,b in zip(p,inks[i]))) for p in px]
    # smooth: a run shorter than minrun takes its neighbours' colour
    out=[];i=0
    while i<len(idx):
        j=i
        while j<len(idx) and idx[j]==idx[i]:j+=1
        out.append([idx[i],j-i]);i=j
    changed=True
    while changed and len(out)>1:
        changed=False
        for k,(c,n) in enumerate(out):
            if n<minrun:
                if k>0: out[k-1][1]+=n
                else: out[k+1][1]+=n
                out.pop(k);changed=True;break
        m=[]
        for c,n in out:
            if m and m[-1][0]==c:m[-1][1]+=n
            else:m.append([c,n])
        out=m
    tot=sum(n for _,n in out);acc=0;res=[]
    for c,n in out:res.append([round(acc/tot,3),round((acc+n)/tot,3),c]);acc+=n
    return res
def measure(img,inks):
    im=Image.open(img).convert('RGB')
    if not(150<=im.width<=165 and 205<=im.height<=220):return None
    # nine columns at the side of the torso, each pixel classed, majority per row (textured cloth reads as noise otherwise)
    def cls(p):return min(range(len(inks)),key=lambda i:sum((a-b)**2 for a,b in zip(p,inks[i])))
    n=TY1-TY0;colY=[]
    for y in range(TY0,TY1):
        votes=[cls(im.getpixel((x,y))) for x in range(TX0+3,TX0+12)]
        colY.append(inks[max(set(votes),key=votes.count)])
    rowY=TY0+int((TY1-TY0)*.9);rowX=[tuple(sum(im.getpixel((x,yy))[c] for yy in (rowY-1,rowY,rowY+1))//3 for c in range(3)) for x in range(TX0,TX1)]
    return {'runsY':runs(colY,inks,4),'runsX':runs(rowX,inks,3)}
clubs=sys.argv[1:] or [f[len('kit-archive-'):-5] for f in os.listdir(f'{R}/content/manual') if f.startswith('kit-archive-')]+['aek-athens']
for club in clubs:
    p=f'{R}/content/manual/kit-archive-{club}.json'
    if not os.path.exists(p):p=f'{R}/content/manual/kit-{club}.json'
    d=json.load(open(p));n=0
    for k in d['kits']:
        img=k.get('image');s=k['shirt']
        if not img or len(s['colours'])<2:continue
        f=R+'/public'+img
        if not os.path.exists(f):continue
        inks=[rgb(s['hex'][c]) for c in s['colours'] if c in s['hex']]
        if len(inks)<2:continue
        m=measure(f,inks)
        if not m:continue
        s.setdefault('measured',{}).update(m);n+=1
    # a kit whose reference is a photograph (no template to sample) borrows the runs of the nearest-season catalogue kit of the
    # same design — same type first, then any type, at most eight seasons away; runsFrom names the kit it borrowed from
    yr=lambda k:int(str(k['season'])[:4]) if str(k['season'])[:4].isdigit() else None
    measured=[k for k in d['kits'] if (k['shirt'].get('measured') or {}).get('runsY') and not (k['shirt'].get('measured') or {}).get('runsFrom')]
    b=0
    for k in d['kits']:
        s=k['shirt'];m=s.get('measured') or {}
        if s['design'] not in('hoops','stripes','pinstripes') or (m.get('runsY') and not m.get('runsFrom')) or yr(k) is None:continue
        pool=[x for x in measured if x['shirt']['design']==s['design'] and yr(x) is not None and abs(yr(x)-yr(k))<=8 and x['shirt']['colours'][:2]==s['colours'][:2]]
        pool.sort(key=lambda x:(x['type']!=k['type'],abs(yr(x)-yr(k))))
        if not pool:continue
        src=pool[0]['shirt']['measured'];s['measured']={**m,'runsY':src['runsY'],'runsX':src['runsX'],'runsFrom':pool[0]['id']};b+=1
    print(club,'borrowed',b)
    open(p,'w').write(json.dumps(d,ensure_ascii=False,indent=1)+'\n')
    print(club,'measured',n)
