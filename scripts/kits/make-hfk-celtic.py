#!/usr/bin/env python3 -I
"""Celtic's historical kit drawings (1888–2023) from Historical Football Kits (historicalkits.co.uk, © David Moor), home page and change-kits page.
Owner, 10.10.2026: "Historical Football Kits תייבא, האתר שלי לא מסחרי" — the site permits non-commercial use with acknowledgement; the credit travels with every drawing (data, archive pages, /credits).
Inputs : --rows hfk_celtic.json (crawl: kind, img, file, date, maker, ref)   --images DIR (downloaded drawings)
Outputs: public/club-kits/celtic/hfk/<file>.png (lossless copy of the GIF)   content/manual/kit-hfk-celtic.json
Rule 11: a period, maker or reference the page does not print stays null; nothing is inferred. Types come only from the page's own labels ("A" = change/away, "3rd" = third); an unlabelled change-kit entry is `change`.
Usage: make-hfk-celtic.py --rows R --images D"""
import argparse,json,os,re
from PIL import Image
ap=argparse.ArgumentParser();ap.add_argument('--rows',required=True);ap.add_argument('--images',required=True);a=ap.parse_args()
rows=json.load(open(a.rows));os.makedirs('public/club-kits/celtic/hfk',exist_ok=True);out=[]
BASE='https://www.historicalkits.co.uk/Scottish_Football_League/Celtic/'
for i,r in enumerate(rows,1):
    src=os.path.join(a.images,r['file'])
    if not os.path.exists(src):continue
    im=Image.open(src).convert('RGBA');name=os.path.splitext(r['file'])[0]+'.png';im.save('public/club-kits/celtic/hfk/'+name,optimize=True)
    d=r['date'];m=re.search(r'\b(1[89]\d\d|20\d\d)\b',d);y0=int(m[1]) if m else None;ys=re.findall(r'\b(1[89]\d\d|20\d\d)\b',d);y1=int(ys[-1]) if ys else None
    t='home' if r['kind']=='home' else ('third' if re.search(r'\b3rd\b',d) else ('away' if re.search(r'\bA\b',d) else 'change'))
    out.append(dict(id=f'hfk-{i:03d}',type=t,period=re.sub(r'\s+(A|3rd)$','',d).strip(),from_=y0,to=y1,maker=r['maker'] or None,refs=r['ref'] or None,image=f'/club-kits/celtic/hfk/{name}',page=BASE+('Celtic.htm' if r['kind']=='home' else 'Celtic-change-kits.html')))
for o in out:o['from']=o.pop('from_')
j=dict(source=dict(publisher='Historical Football Kits (David Moor)',url='https://www.historicalkits.co.uk/',homePage=BASE+'Celtic.htm',changePage=BASE+'Celtic-change-kits.html',licence='All rights reserved by the publisher; non-commercial use with acknowledgement (https://www.historicalkits.co.uk/copyright.htm). Used here on the owner\'s statement that FAN LIFE is non-commercial.',readOn='2026-10-10'),count=len(out),kits=out)
json.dump(j,open('content/manual/kit-hfk-celtic.json','w'),ensure_ascii=False,indent=1);print(len(out),'drawings')
