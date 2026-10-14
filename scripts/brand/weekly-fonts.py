#!/usr/bin/env python3
"""THE WEEKLY (rule 124) — the self-hosted faces, cut from their open-source packages.

Run once from a folder where the @fontsource packages are installed:
  npm i @fontsource-variable/archivo @fontsource/shrikhand @fontsource/knewave @fontsource/ultra \
        @fontsource/fira-sans-extra-condensed @fontsource/fira-sans @fontsource/dela-gothic-one
  python3 scripts/brand/weekly-fonts.py <that folder>/node_modules <repo>/public/fonts

Archivo is variable (wght 100–900, wdth 62–125). The weekly's two working cuts are frozen into static
instances so that ANY rule asking for the family gets the right voice even at weight 400:
  · Weekly Head  = Archivo italic, wght 900, wdth 80  — heads, names, buttons (carries č ć đ š ž)
  · Weekly Caps  = Archivo upright, wght 800, wdth 75 — small capitals: kickers, labels, captions
Shrikhand (mastheads), Knewave (fixed shouts) and Ultra (numbers) ship as they are, latin + latin-ext.
Greek has no weekly face: Fira Sans (Extra Condensed) and Dela Gothic One carry it as fallbacks.
"""
import shutil, sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

nm, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
AV = nm / '@fontsource-variable/archivo/files'
for sub in ('latin', 'latin-ext'):
    for name, src, loc in (('head', f'archivo-{sub}-wdth-italic.woff2', {'wght': 900, 'wdth': 80}),
                           ('caps', f'archivo-{sub}-wdth-normal.woff2', {'wght': 800, 'wdth': 75})):
        f = TTFont(AV / src)
        inst = instancer.instantiateVariableFont(f, loc)
        inst.flavor = 'woff2'
        inst.save(out / f'weekly-{name}-{sub}.woff2')
    shutil.copy(AV / f'archivo-{sub}-wdth-normal.woff2', out / f'weekly-body-{sub}.woff2')
for pkg, stem in (('shrikhand', 'shrikhand'), ('knewave', 'knewave'), ('ultra', 'ultra')):
    for sub in ('latin', 'latin-ext'):
        shutil.copy(nm / f'@fontsource/{pkg}/files/{stem}-{sub}-400-normal.woff2', out / f'{stem}-{sub}-400-normal.woff2')
for w in ('800', '900'):
    for st in ('normal', 'italic'):
        shutil.copy(nm / f'@fontsource/fira-sans-extra-condensed/files/fira-sans-extra-condensed-greek-{w}-{st}.woff2',
                    out / f'fira-sans-extra-condensed-greek-{w}-{st}.woff2')
for w in ('400', '700'):
    shutil.copy(nm / f'@fontsource/fira-sans/files/fira-sans-greek-{w}-normal.woff2', out / f'fira-sans-greek-{w}-normal.woff2')
shutil.copy(nm / '@fontsource/dela-gothic-one/files/dela-gothic-one-greek-400-normal.woff2', out / 'dela-gothic-one-greek-400-normal.woff2')
print('ok')
