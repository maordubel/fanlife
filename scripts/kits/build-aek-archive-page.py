#!/usr/bin/env python3 -I
"""Build public/aek-kit-archive/index.html from content/manual/kit-aek-athens.json (the reconciled archive) + the approved kits in core.json.
Nothing on the page is typed by hand. Usage: build-aek-archive-page.py"""
import json
joined=json.load(open('content/manual/kit-aek-athens.json'))
data=dict(retrieved=joined['retrieved'],sources=joined['sources'],total=joined['kitCount'],catalogue=joined['catalogueKits'],drawingOnly=joined['drawingOnlyKits'],crossChecked=joined['crossChecked'],conflicts=joined['typeConflicts'],
    drawings=json.load(open('content/manual/kit-commons-aek-athens.json'))['count'],kits=joined['kits'])
tpl=open('scripts/kits/aek-archive.template.html',encoding='utf8').read()
out=tpl.replace('/*__DATA__*/null',json.dumps(data,ensure_ascii=False,separators=(',',':')))
import os;os.makedirs('public/aek-kit-archive',exist_ok=True)
open('public/aek-kit-archive/index.html','w',encoding='utf8').write(out)
print('kits',len(data['kits']),'bytes',len(out))
