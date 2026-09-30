#!/usr/bin/env python3
"""
האוסף המלא — the club's own kit archive, turned into shirts a child can buy.

    python3 scripts/life/build-kit-shirts.py

Maor, 5.9.2026: "תוכל למצוא עוד חולצות למכירה ועם מידע עליהם לפי שנה באתר גם כן. אל תשכח
שהאתר הוא מקור המידע שלנו בסוף. אפשר לעשות ממש קולקציה מלאה וכך אני רוצה."

He is right and it is the only correct answer: the collection should not be seven shirts
somebody photographed, it should be the club's shirts. `content/manual/kit-designs.json`
holds thirty-three of them — season, variant, sponsor, base, pattern, sleeves, collar,
shorts, socks, and a note read off a photograph — and `crest-versions.json` says which
badge each season wore.

The site draws those specs with `components/kit/KitShirt`. The life game is a client
bundle and `lib/kit/seasons.ts` is server-only, so this writes the same rows out as a
plain data module the game can import. Regenerating is this one command; nothing is
typed twice, and a shirt added to the archive is a shirt on the rail.
"""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
KITS = os.path.join(ROOT, 'content/manual/kit-designs.json')
CRESTS = os.path.join(ROOT, 'content/manual/crest-versions.json')
OUT = os.path.join(ROOT, 'lib/life/generated/kitShirts.ts')

CLUB = 'הפועל-תל-אביב'

# The archive once recorded a colour the kit palette did not have — `concrete`, the grey
# on the 2020/21 away shoulders — and `seasonKits()` cast it straight to `KitColour`, so
# the kits screen drew that panel with a CSS variable that did not exist. Fixed at source
# on 5.9.2026: `concrete` is a real `KitColour` now. The map stays as the place any future
# mismatch gets written down rather than silently rendered as nothing.
COLOUR_FIX: dict[str, str] = {}


def colour(value):
    return COLOUR_FIX.get(value, value)


def crest_for(season, crests):
    year = int(season[:4])
    holding = [c for c in crests if c['fromYear'] <= year and (c['toYear'] is None or year <= c['toYear'])]
    holding.sort(key=lambda c: -c['fromYear'])
    for c in holding:
        if c.get('imageKey'):
            return c['imageKey']
    earlier = sorted([c for c in crests if c['fromYear'] <= year and c.get('imageKey')],
                     key=lambda c: -c['fromYear'])
    return earlier[0]['imageKey'] if earlier else None


def main():
    kits = json.load(open(KITS, encoding='utf8'))['records']
    crests = [c for c in json.load(open(CRESTS, encoding='utf8'))['records']
              if c.get('clubSlug') == CLUB and c.get('sport') == 'football']
    rows = []
    for k in kits:
        season = k['seasonLabel']
        rows.append({
            'id': f"kit{season.replace('/', '')}{k['variant'][0].upper()}",
            'seasonLabel': season,
            'variantHe': {'home': 'בית', 'away': 'חוץ', 'third': 'שלישית'}[k['variant']],
            'noteHe': k['noteHe'],
            'sponsorHe': k.get('sponsorHe'),
            'sourceTitle': k.get('sourceTitle'),
            'spec': {
                'seasonLabel': season,
                'variant': 'away' if k['variant'] == 'third' else k['variant'],
                'base': colour(k['base']),
                'pattern': k['pattern'],
                'patternInk': colour(k['patternInk']),
                'sleeves': k['sleeves'],
                'sleeveInk': colour(k['sleeveInk']),
                'collar': k['collar'],
                'collarInk': colour(k['collarInk']),
                'sponsorHe': k.get('sponsorHe'),
                'makerHe': k.get('makerHe'),
                'nameset': 'block-solid',
                'number': None,
                'shorts': colour(k['shorts']),
                'socks': colour(k['socks']),
                'crestKey': crest_for(season, crests),
            },
        })
    rows.sort(key=lambda r: (r['seasonLabel'], r['variantHe']))
    body = json.dumps(rows, ensure_ascii=False, indent=2)
    header = '''/**
 * נוצר אוטומטית — do not edit. `python3 scripts/life/build-kit-shirts.py` rewrites it.
 *
 * The club\\'s own kit archive (`content/manual/kit-designs.json`) as data the life game
 * can import from a client bundle, with each season\\'s crest resolved off the crest
 * timeline. The site is the source; this file is a copy of the site, not a second
 * opinion — which is the whole point of generating it.
 */
import type { KitSpec } from '@/lib/kit/spec'

export type ArchiveShirt = {
  id: string
  seasonLabel: string
  variantHe: string
  noteHe: string
  sponsorHe: string | null
  sourceTitle: string | null
  spec: KitSpec
}

export const ARCHIVE_SHIRTS: readonly ArchiveShirt[] = '''
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf8').write(header + body + '\n')
    print(f'{len(rows)} kits → lib/life/generated/kitShirts.ts')
    for r in rows[:4] + rows[-2:]:
        print(f"  {r['seasonLabel']:9s} {r['variantHe']:6s} {r['sponsorHe'] or '—'}")


if __name__ == '__main__':
    main()
