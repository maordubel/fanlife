"""LIFE · the hood's people: assemble the frames of hood-human-shoot.ts into strips.
   python3 scripts/life/hood-human-strips.py /tmp/human2 olympiacos,hapoel-tel-aviv lite"""
import sys, glob, os
from PIL import Image
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/human2'
clubs = (sys.argv[2] if len(sys.argv) > 2 else 'olympiacos,hapoel-tel-aviv').split(',')
q = sys.argv[3] if len(sys.argv) > 3 else 'lite'
SEQ = {'walk-strip': ['walk'], 'dad-talk-strip': ['approach', 'talk', 'accepted'], 'scarf-strip': ['scarf'], 'street-life-strip': ['street']}
def strip(files, path, h=560):
    ims = [Image.open(f).convert('RGB') for f in files]
    if not ims: return
    ims = [i.resize((int(i.width * h / i.height), h), Image.LANCZOS) for i in ims]
    cols = min(len(ims), 8); rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * ims[0].width, rows * h), (12, 12, 14))
    for k, im in enumerate(ims): sheet.paste(im, ((k % cols) * im.width, (k // cols) * h))
    sheet.save(path); print(path, sheet.size)
for club in clubs:
    for name, parts in SEQ.items():
        files = []
        for p in parts: files += sorted(glob.glob(f'{out}/{club}-{q}-{p}-[0-9]*.png'), key=lambda f: int(f.rsplit('-', 1)[1].split('.')[0]))
        strip(files, f'{out}/{club}-{name}.png')
        if club == clubs[0] and files: strip(files, f'{out}/{name}.png')
