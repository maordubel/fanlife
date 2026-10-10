#!/usr/bin/env python3 -I
"""Reads the public product feeds (/products.json) of four shirt retailers and keeps the products that name one of our clubs. Run: python3 -I scripts/kits/harvest-shops.py (writes /tmp/shop/<store>.json), then make-shop-photos.py. Polite: 1.5 s between requests, retries with back-off, 403/404 are answers."""
import json,urllib.request,time,sys,re
UA='Mozilla/5.0 FanLifeKitArchive/1.0 (maordubel@gmail.com)'
stores=['footballshirtcollective.com','www.cultkits.com','shortyfootballshirts.com','www.vintagefootballshirts.com']
KEY=re.compile(r'celtic|olympia[ck]os|olympiakos|panathinaikos|aek|st\.? ?pauli|zrinjski|hapoel|maccabi tel',re.I)
for st in stores:
    out=[];page=1
    while page<=60:
        u=f'https://{st}/products.json?limit=250&page={page}'
        for t in range(4):
            try:
                d=json.loads(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':UA}),timeout=40).read());break
            except Exception as e:
                print('retry',st,page,e,flush=True);time.sleep(5*(t+1));d=None
        if d is None:break
        ps=d.get('products',[])
        if not ps:break
        for p in ps:
            txt=p['title']+' '+' '.join(p.get('tags') or [])
            if KEY.search(txt):out.append(dict(id=p['id'],title=p['title'],handle=p['handle'],type=p.get('product_type'),tags=p.get('tags'),vendor=p.get('vendor'),images=[dict(src=i['src'],w=i.get('width'),h=i.get('height'),alt=i.get('alt')) for i in p['images'][:4]],store=st))
        print(st,page,len(ps),len(out),flush=True);page+=1;time.sleep(1.5)
    json.dump(out,open(f'/tmp/shop/{st}.json','w'),ensure_ascii=False)
print('done',flush=True)
