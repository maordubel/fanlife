#!/usr/bin/env python3 -I
"""Build public/kit-archive/<club>/index.html for every club with a joined archive, and the hub public/kit-archive/index.html.
Nothing on a page is typed by hand: data = content/manual/kit-archive-<club>.json (kit-aek-athens.json for AEK). Usage: build-kit-archive-pages.py"""
import json,os
CLUBS=[
 dict(id='aek-athens',name='AEK Athens',accent='#f3c613',data='content/manual/kit-aek-athens.json',man='content/manual/kit-cof-aek-athens.json'),
 dict(id='celtic',name='Celtic',accent='#3fbf6e',data='content/manual/kit-archive-celtic.json',man='content/manual/kit-cof-celtic.json'),
 dict(id='panathinaikos',name='Panathinaikos',accent='#3fbf6e',data='content/manual/kit-archive-panathinaikos.json',man='content/manual/kit-cof-panathinaikos.json'),
 dict(id='st-pauli',name='FC St. Pauli',accent='#d29a64',data='content/manual/kit-archive-st-pauli.json',man='content/manual/kit-cof-st-pauli.json'),
 dict(id='zrinjski-mostar',name='Zrinjski Mostar',accent='#e5484d',data='content/manual/kit-archive-zrinjski-mostar.json',man='content/manual/kit-cof-zrinjski-mostar.json'),
 dict(id='olympiacos',name='Olympiacos',accent='#e5484d',data='content/manual/kit-archive-olympiacos.json',man='content/manual/kit-cof-olympiacos.json'),
 dict(id='hapoel-petah-tikva',name='Hapoel Petah Tikva',accent='#4c8dff',data='content/manual/kit-archive-hapoel-petah-tikva.json',man='content/manual/kit-cof-hapoel-petah-tikva.json'),
]
tpl=open('scripts/kits/kit-archive.template.html',encoding='utf8').read().replace('/*__RENDERER__*/',open('scripts/kits/kit-render.js',encoding='utf8').read())
hub=[]
for c in CLUBS:
    j=json.load(open(c['data']));man=json.load(open(c['man']))
    pages=man.get('pages') or {k:'https://www.colours-of-football.com/colours03/gre/aek/'+k for k in ['aek_1.html','aek_2.html','aek_athens_3.html','aek_athens_4.html']}
    data=dict(retrieved=j['retrieved'],club=dict(id=c['id'],name=c['name']),crest=f"/club-kits/{c['id']}/crest.png",catalogueUrls=list(pages.values()),sources=dict(catalogue=j['sources']['catalogue']),total=j['kitCount'],catalogue=j['catalogueKits'],drawingOnly=j['drawingOnlyKits'],crossChecked=j['crossChecked'],conflicts=j['typeConflicts'],kits=j['kits'])
    hp=f"content/manual/kit-hfk-{c['id']}.json"
    if os.path.exists(hp):
        h=json.load(open(hp));fy=[k['from'] for k in h['kits'] if k['from']];ty=[k['to'] for k in h['kits'] if k['to']];data['hfk']=dict(count=h['count'],source=h['source'],kits=h['kits'],**{'from':min(fy),'to':max(ty)})
    out=(tpl.replace('/*__TITLE__*/',f"ארכיון מדים {c['name']}").replace('/*__DESC__*/',f"ארכיון המדים של {c['name']}: {j['kitCount']} מערכות, ציורי SVG ותמונות מקור, עם כל המקורות.").replace('/*__ACCENT__*/',c['accent']).replace('/*__DATA__*/null',json.dumps(data,ensure_ascii=False,separators=(',',':'))))
    os.makedirs(f"public/kit-archive/{c['id']}",exist_ok=True);open(f"public/kit-archive/{c['id']}/index.html",'w',encoding='utf8').write(out)
    hub.append((c,j['kitCount'],len({k['season'] for k in j['kits']})));print(c['id'],j['kitCount'],len(out))
cards=''.join(f"<a class='c' href='/kit-archive/{c['id']}/'><img src='/club-kits/{c['id']}/crest.png' alt='' width='72' height='72'><b>{c['name']}</b><span>{n} מערכות · {s} עונות</span></a>" for c,n,s in hub)
open('public/kit-archive/index.html','w',encoding='utf8').write(f"""<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ארכיוני המדים</title>
<style>:root{{color-scheme:dark}}*{{box-sizing:border-box}}body{{margin:0;background:#0a0a0b;color:#f4f0e6;font:16px/1.5 system-ui,sans-serif;padding:clamp(16px,4vw,56px)}}h1{{font:800 clamp(36px,7vw,72px)/1 system-ui;margin:0 0 8px}}p{{color:#a09b8f;max-width:60ch}}.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr));gap:14px;margin-top:28px}}.c{{display:flex;flex-direction:column;gap:6px;align-items:flex-start;padding:18px;background:#141415;border:1px solid #2b2b2e;color:inherit;text-decoration:none}}.c:hover,.c:focus-visible{{border-color:#f4f0e6;outline:none}}.c b{{font-size:20px}}.c span{{color:#a09b8f;font-size:14px}}</style></head><body><h1>ארכיוני המדים</h1><p>שישה מועדונים, כל עונה כמערכת שלמה: חולצה, מכנסיים וגרביים. ציורי SVG ותמונות מקור מקטלוג colours-of-football.com, עם מקורות ואי-התאמות מסומנים.</p><div class="g">{cards}</div></body></html>""")
