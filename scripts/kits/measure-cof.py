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
    col=[im.getpixel((x,y)) for x in (TX0+5,TX0+6,TX0+7) for y in range(TY0,TY1)]
    # average the three columns per row
    n=TY1-TY0;colY=[tuple(sum(col[k*n+y][c] for k in range(3))//3 for c in range(3)) for y in range(n)]
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
    open(p,'w').write(json.dumps(d,ensure_ascii=False,indent=1)+'\n')
    print(club,'measured',n)
