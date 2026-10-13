#!/usr/bin/env python3 -I
"""Fills a drawn kit's missing maker or sponsor from another record of the SAME shirt (same season and type) in the club's own pack waves (13.10.2026).
A value is taken only when every record that states it agrees; a disagreement or silence leaves the field null (rule 11). The source is written on the kit
(`filled`), so a reader can see where a name came from. Idempotent. Then re-run export-kit-svgs.mjs / export-kit-icons.mjs / build-kit-archive-pages.py."""
import collections,glob,json,os
CL=['aek-athens','celtic','hapoel-petah-tikva','hapoel-tel-aviv','olympiacos','panathinaikos','st-pauli','zrinjski-mostar']
total=0
for c in CL:
    f=f'content/manual/kit-archive-{c}.json' if c!='aek-athens' else 'content/manual/kit-aek-athens.json'
    j=json.load(open(f));pack=collections.defaultdict(lambda:collections.defaultdict(set))
    for w in sorted(glob.glob(f'club-packs/{c}/wave-kits-*.json')):
        d=json.load(open(w))
        for k in d.get('kits',[]):
            v=k.get('value') or {};key=(v.get('season'),(v.get('type') or 'home').lower())
            for fld,src in(('maker','manufacturer'),('sponsor','sponsor')):
                if v.get(src):pack[key][fld].add((v[src],os.path.basename(w)))
    n=0
    for k in j['kits']:
        for fld in('maker','sponsor'):
            if k.get(fld):continue
            got=pack[(k['season'],k['type'])][fld]
            vals={g[0] for g in got}
            if len(vals)==1:
                k[fld]=next(iter(vals));k.setdefault('filled',{})[fld]=sorted({g[1] for g in got});n+=1
    json.dump(j,open(f,'w'),ensure_ascii=False,indent=1);open(f,'a').write('\n');print(c,n);total+=n
print('filled',total)
