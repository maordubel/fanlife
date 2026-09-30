#!/usr/bin/env python3
"""
המסמכים של 1986 — the real paper, treated as paper.

  python3 scripts/life/ingest-1986-docs.py

Everything else in `public/life/art` is DRAWN. These five are not: a match ticket somebody
kept for forty years, and four pages of מעריב ספורט from the two days either side of
24.5.1986. They are evidence, and the whole reason the finale can be what it is — a game
may not invent a scoreline (rule 11), but it may show you the newspaper.

Two things follow from that, and they are why this is its own script rather than three
more rows in the September ingest:

  · **A photograph of a document is not the document.** The ticket arrives at an angle,
    in somebody's hand, on a table. It is deskewed off its four measured corners into the
    rectangle it actually is, so the game can hold it up flat — which is the only way a
    player reads the words `הפועל תל-אביב / מכבי חיפה` and `7 ש"ח` and understands, without
    a line of dialogue, that a child went to this.
  · **Aged paper lives inside the yellow band, and it still goes through the de-yellow.**
    Cream at S≈0.25 comes out the other side barely touched and legal; anything more
    saturated gets pulled to the same 0.26 as every other asset. No exemption is asked for
    and none is needed — which is the point, because the first thing an exemption costs is
    the meaning of the rule.
"""
import importlib.util
import json
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public/life/art')
ART = os.environ.get('WORKER_DOCS', os.path.join(ROOT, 'brand/source/life-1986-docs'))

spec = importlib.util.spec_from_file_location('ba', os.path.join(HERE, 'build-art.py'))
ba = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ba)

spec2 = importlib.util.spec_from_file_location('ing', os.path.join(HERE, 'ingest-2026-09.py'))
ing = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(ing)


# The ticket's four corners in the photograph, as fractions of it, read off the print.
# Fractions rather than pixels so a re-scan at another size deskews to the same rectangle.
TICKET_CORNERS = [(0.058, 0.040), (0.962, 0.068), (0.952, 0.658), (0.112, 0.700)]
TICKET_W = 900
# …and then the fingertip holding it, and the sliver of table above it, come off. Cutting
# rather than painting: the left edge lands on the perforation, so what the game holds up
# is a stub — which is what a kept ticket IS, and what the red box has been describing in
# words since the systems pass.
TICKET_TRIM = (0.138, 0.022)


def perspective_coeffs(src, dst):
    """
    The eight numbers PIL wants, solved without numpy's help.

    PIL's PERSPECTIVE transform maps DESTINATION pixels back into the source, so the pairs
    go in that direction — get this backwards and the ticket deskews inside out.
    """
    matrix = []
    for (sx, sy), (dx, dy) in zip(src, dst):
        matrix.append([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy])
        matrix.append([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy])
    # Gaussian elimination on the 8×9 augmented system.
    rhs = [c for point in src for c in point]
    n = 8
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(matrix[r][col]))
        matrix[col], matrix[pivot] = matrix[pivot], matrix[col]
        rhs[col], rhs[pivot] = rhs[pivot], rhs[col]
        div = matrix[col][col]
        matrix[col] = [v / div for v in matrix[col]]
        rhs[col] /= div
        for row in range(n):
            if row == col:
                continue
            factor = matrix[row][col]
            if not factor:
                continue
            matrix[row] = [v - factor * w for v, w in zip(matrix[row], matrix[col])]
            rhs[row] -= factor * rhs[col]
    return rhs


def deskew_ticket(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    src = [(fx * w, fy * h) for fx, fy in TICKET_CORNERS]
    # the rectangle it becomes: width from the two long edges, height from the two short
    top = ((src[1][0] - src[0][0]) ** 2 + (src[1][1] - src[0][1]) ** 2) ** 0.5
    bottom = ((src[2][0] - src[3][0]) ** 2 + (src[2][1] - src[3][1]) ** 2) ** 0.5
    left = ((src[3][0] - src[0][0]) ** 2 + (src[3][1] - src[0][1]) ** 2) ** 0.5
    right = ((src[2][0] - src[1][0]) ** 2 + (src[2][1] - src[1][1]) ** 2) ** 0.5
    ratio = ((left + right) / 2) / ((top + bottom) / 2)
    out_w, out_h = TICKET_W, max(1, round(TICKET_W * ratio))
    dst = [(0, 0), (out_w, 0), (out_w, out_h), (0, out_h)]
    coeffs = perspective_coeffs(src, dst)
    flat = im.transform((out_w, out_h), Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    left, top = TICKET_TRIM
    return flat.crop((round(out_w * left), round(out_h * top), out_w, out_h))


# The pages. `paper-before` is the spread from the day BEFORE — both line-ups printed, the
# league table, and a headline that states the stakes in 1986's own words. The other three
# are the morning after, and they are the celebration: a game does not have to describe
# what winning felt like if it can hand you the front page.
PAGES = [
    ('paperBefore', 'paper-before.png', 1500),
    ('paperAdumim', 'paper-adumim.png', 860),
    ('paperFive', 'paper-five-minutes.png', 860),
    ('paperCollector', 'paper-collector.png', 860),
]


def main():
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8'))

    ticket = os.path.join(ART, 'ticket.png')
    if os.path.exists(ticket):
        manifest.setdefault('docs', {})['docTicket'] = ing.write(
            deskew_ticket(ticket), 'docTicket', quantise=200, max_w=TICKET_W
        )

    for key, name, width in PAGES:
        path = os.path.join(ART, name)
        if not os.path.exists(path):
            print(f'-- missing {name}')
            continue
        manifest.setdefault('docs', {})[key] = ing.write(
            Image.open(path).convert('RGB'), key, quantise=200, max_w=width
        )

    json.dump(manifest, open(manifest_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('\nmanifest updated')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
