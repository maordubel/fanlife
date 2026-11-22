"""
THE ALBUM — the drawn portrait for a man with no free photograph (owner, 18.11.2026: "much better faces, in look and in
proportion"). A painted-sticker portrait, not a cartoon: real head proportions, his own face shape, three tones of skin,
thin ink, eyes with lids and irises, a modelled nose and lips, hair with volume, a beard with texture.

His likeness comes from MEASUREMENTS, never from his picture: 68 facial landmarks (OpenCV LBF) are read from his lead
Wikipedia photograph, normalised (eyes level, eye distance = 1) and blended 55/45 with an average face — so the drawing
has his jaw, his eye spacing, his nose and mouth proportions, while every line is drawn here. The photograph is read in
memory and dropped; only these numbers and the traits (sources.traits) go into the ledger.
"""
import math

# an average frontal face (68 points), eyes level, inter-ocular distance 1, origin between the eyes
MEAN = [(-1.179, 0.014), (-1.168, 0.332), (-1.133, 0.652), (-1.067, 0.963), (-0.949, 1.254), (-0.768, 1.517), (-0.542, 1.74), (-0.291, 1.918), (0.0, 1.967), (0.291, 1.918), (0.542, 1.74), (0.768, 1.517), (0.949, 1.254), (1.067, 0.963), (1.133, 0.652), (1.168, 0.332), (1.179, 0.014), (-0.957, -0.142), (-0.809, -0.293), (-0.587, -0.334), (-0.36, -0.301), (-0.149, -0.22), (0.149, -0.22), (0.36, -0.301), (0.587, -0.334), (0.809, -0.293), (0.957, -0.142), (0.0, -0.024), (0.0, 0.186), (0.0, 0.395), (0.0, 0.612), (-0.245, 0.743), (-0.127, 0.793), (0.0, 0.828), (0.127, 0.793), (0.245, 0.743), (-0.701, 0.002), (-0.577, -0.076), (-0.421, -0.077), (-0.287, 0.031), (-0.429, 0.06), (-0.585, 0.061), (0.287, 0.031), (0.421, -0.077), (0.577, -0.076), (0.701, 0.002), (0.585, 0.061), (0.429, 0.06), (-0.415, 1.161), (-0.267, 1.093), (-0.112, 1.05), (0.0, 1.083), (0.112, 1.05), (0.267, 1.093), (0.415, 1.161), (0.271, 1.318), (0.121, 1.38), (0.0, 1.393), (-0.121, 1.38), (-0.271, 1.318), (-0.345, 1.169), (-0.114, 1.15), (0.0, 1.162), (0.114, 1.15), (0.345, 1.169), (0.116, 1.221), (0.0, 1.238), (-0.116, 1.221)]
BLEND = 0.55              # how much of HIS shape (the rest is the average face): a likeness, never a tracing


def landmarks(im_bgr, face, model_path):
    """68 landmarks for the face box, or None"""
    import cv2
    import numpy as np
    fm = cv2.face.createFacemarkLBF()
    fm.loadModel(model_path)
    g = cv2.cvtColor(im_bgr, cv2.COLOR_BGR2GRAY)
    ok, lm = fm.fit(g, np.array([face]))
    return [(float(p[0]), float(p[1])) for p in np.array(lm[0]).reshape(-1, 2)] if ok else None


def normalise(pts):
    """eyes level, eye distance 1, origin between the eyes; blended with the average face"""
    le = [sum(p[i] for p in pts[36:42]) / 6 for i in (0, 1)]
    re_ = [sum(p[i] for p in pts[42:48]) / 6 for i in (0, 1)]
    ang = math.atan2(re_[1] - le[1], re_[0] - le[0])
    d = math.hypot(re_[0] - le[0], re_[1] - le[1]) or 1
    cx, cy = (le[0] + re_[0]) / 2, (le[1] + re_[1]) / 2
    ca, sa = math.cos(-ang), math.sin(-ang)
    out = []
    for (x, y), (mx, my) in zip(pts, MEAN):
        x, y = x - cx, y - cy
        x, y = (x * ca - y * sa) / d, (x * sa + y * ca) / d
        out.append((round(mx + (x - mx) * BLEND, 3), round(my + (y - my) * BLEND, 3)))
    # symmetrise gently: a frontal sticker portrait keeps half his asymmetry
    pair = {i: 16 - i for i in range(17)}
    pair.update({17 + i: 26 - i for i in range(10)})
    pair.update({36: 45, 37: 44, 38: 43, 39: 42, 40: 47, 41: 46, 31: 35, 32: 34, 48: 54, 49: 53, 50: 52, 59: 55, 58: 56, 60: 64, 61: 63, 67: 65})
    for k, v in list(pair.items()):
        pair[v] = k
    sym = []
    for i, (x, y) in enumerate(out):
        j = pair.get(i, i)
        ox, oy = out[j]
        sym.append(((x - ox) / 4 + x / 2, (y + oy) / 4 + y / 2) if j != i else (x / 2, y))
    return sym


def shade(hex_, f):
    r, g, b = int(hex_[1:3], 16), int(hex_[3:5], 16), int(hex_[5:7], 16)
    if f < 1:
        r, g, b = r * f, g * f, b * f
    else:
        r, g, b = r + (255 - r) * (f - 1), g + (255 - g) * (f - 1), b + (255 - b) * (f - 1)
    return '#%02X%02X%02X' % (int(max(0, min(255, r))), int(max(0, min(255, g))), int(max(0, min(255, b))))


def _path(pts, close=False):
    """a smooth Catmull-Rom path through the points"""
    if len(pts) < 2:
        return ''
    p = pts + ([pts[0], pts[1]] if close else [])
    d = f'M{p[0][0]:.1f} {p[0][1]:.1f}'
    rng = range(len(p) - (2 if close else 1)) if close else range(len(p) - 1)
    for i in rng:
        p0 = p[i - 1] if i > 0 else p[i]
        p1, p2 = p[i], p[i + 1]
        p3 = p[i + 2] if i + 2 < len(p) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
    return d + (' Z' if close else '')


def portrait_svg(cx, ey, scale, t, shape=None, uid='p'):
    """the head and neck, eyes on the line ey, eye distance `scale` px. `t` = traits, `shape` = normalised landmarks"""
    S = shape or MEAN
    P = [(cx + x * scale, ey + y * scale) for x, y in S]
    skin, hair = t['skin'], t['hair']
    sk_d, sk_dd, sk_l = shade(skin, .82), shade(skin, .66), shade(skin, 1.12)
    ink = '#1E1612'
    grad = (f'<radialGradient id="{uid}gs" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="{shade(skin, 1.16)}"/><stop offset=".45" stop-color="{skin}"/><stop offset="1" stop-color="{shade(skin, .74)}"/></radialGradient>'
            f'<radialGradient id="{uid}gh" cx=".35" cy=".2" r=".9"><stop offset="0" stop-color="{shade(t["hair"], 1.35)}"/><stop offset=".5" stop-color="{t["hair"]}"/><stop offset="1" stop-color="{shade(t["hair"], .6)}"/></radialGradient>')
    hl = t['length']
    jaw = P[0:17]
    brow_y = min(P[19][1], P[24][1])
    crown = brow_y - scale * (1.05 if hl != 'bald' else 0.98)
    half = (P[16][0] - P[0][0]) / 2
    fore = [(P[16][0] + scale * .02, P[16][1] - scale * .35), (cx + half * .78, crown + scale * .32), (cx, crown),
            (cx - half * .78, crown + scale * .32), (P[0][0] - scale * .02, P[0][1] - scale * .35)]
    head = _path(jaw + fore, close=True)
    neck_w = (P[12][0] - P[4][0]) * .62
    neck = (f'M{cx-neck_w/2:.1f} {P[6][1]:.1f} C{cx-neck_w/2:.1f} {P[8][1]+scale*.6:.1f} {cx-neck_w/2-scale*.1:.1f} {P[8][1]+scale*1.0:.1f} {cx-neck_w/2-scale*.55:.1f} {P[8][1]+scale*1.35:.1f} '
            f'L{cx+neck_w/2+scale*.55:.1f} {P[8][1]+scale*1.35:.1f} C{cx+neck_w/2+scale*.1:.1f} {P[8][1]+scale*1.0:.1f} {cx+neck_w/2:.1f} {P[8][1]+scale*.6:.1f} {cx+neck_w/2:.1f} {P[6][1]:.1f} Z')
    ears = ''
    for side, (a, b) in ((-1, (P[0], P[3])), (1, (P[16], P[13]))):
        ex = a[0] + side * scale * .14
        ears += (f'<path d="M{a[0]:.1f} {a[1]-scale*.08:.1f} C{ex+side*scale*.12:.1f} {a[1]-scale*.18:.1f} {ex+side*scale*.14:.1f} {b[1]-scale*.1:.1f} {b[0]+side*scale*.02:.1f} {b[1]:.1f} Z" fill="{skin}" stroke="{ink}" stroke-width="1.8"/>'
                 f'<path d="M{a[0]+side*scale*.07:.1f} {a[1]:.1f} C{ex:.1f} {a[1]+scale*.05:.1f} {ex:.1f} {b[1]-scale*.2:.1f} {b[0]+side*scale*.06:.1f} {b[1]-scale*.12:.1f}" fill="none" stroke="{sk_dd}" stroke-width="1.2"/>')
    # light from the upper left: the right of the face (viewer's right) in shadow
    shadow = _path([P[16], P[14], P[12], P[10], P[8], (cx + scale * .18, P[8][1] - scale * .2), (cx + scale * .62, P[4][1] - scale * .1), (cx + scale * .72, P[1][1] - scale * .2), (cx + half * .6, crown + scale * .45)], close=True)
    cheek = _path([(P[1][0] + scale * .12, P[1][1] + scale * .25), (P[3][0] + scale * .22, P[3][1] + scale * .05), (P[48][0] - scale * .1, P[48][1] - scale * .3)])
    cheek_r = _path([(P[15][0] - scale * .12, P[15][1] + scale * .25), (P[13][0] - scale * .22, P[13][1] + scale * .05), (P[54][0] + scale * .1, P[54][1] - scale * .3)])
    under_jaw = _path([P[4], (cx, P[8][1] + scale * .28), P[12]])
    # eyes
    eyes = ''
    iris = t.get('eyes', '#3E2A1E')
    for rng in (range(36, 42), range(42, 48)):
        e = [P[i] for i in rng]
        ecx, ecy = sum(p[0] for p in e) / 6, sum(p[1] for p in e) / 6
        ew = abs(e[3][0] - e[0][0])
        eh = max(scale * .11, abs(e[4][1] - e[1][1]) * 1.25)
        r = min(eh * .7, ew * .27)
        eyes += (f'<path d="{_path(e, True)}" fill="#F4EEE6"/>'
                 f'<clipPath id="{uid}e{rng.start}"><path d="{_path(e, True)}"/></clipPath>'
                 f'<g clip-path="url(#{uid}e{rng.start})"><circle cx="{ecx:.1f}" cy="{ecy+eh*.05:.1f}" r="{r:.1f}" fill="{iris}"/><circle cx="{ecx:.1f}" cy="{ecy+eh*.05:.1f}" r="{r*.45:.1f}" fill="#0E0B0A"/>'
                 f'<circle cx="{ecx-r*.35:.1f}" cy="{ecy-r*.3:.1f}" r="{r*.22:.1f}" fill="#FFFFFF" opacity=".9"/>'
                 f'<path d="M{e[0][0]:.1f} {e[0][1]-eh:.1f} L{e[3][0]:.1f} {e[3][1]-eh:.1f} L{e[3][0]:.1f} {ecy-eh*.15:.1f} L{e[0][0]:.1f} {ecy-eh*.15:.1f} Z" fill="{sk_d}" opacity=".35"/></g>'
                 f'<path d="{_path([e[0], e[1], e[2], e[3]])}" fill="none" stroke="{ink}" stroke-width="1.7" stroke-linecap="round"/>'
                 f'<path d="{_path([e[3], e[4], e[5], e[0]])}" fill="none" stroke="{sk_dd}" stroke-width=".9"/>'
                 f'<path d="{_path([(e[0][0]+ew*.1, e[1][1]-eh*.9), ((e[1][0]+e[2][0])/2, e[1][1]-eh*1.35), (e[3][0]-ew*.05, e[2][1]-eh*.8)])}" fill="none" stroke="{sk_dd}" stroke-width=".9" opacity=".8"/>')
    brows = ''
    bt = scale * (.075 if t['hairName'] not in ('blond', 'white') else .06)
    for rng in (range(17, 22), range(22, 27)):
        b = [P[i] for i in rng]
        up = [(x, y - bt * (1 - abs(k - 2) / 3)) for k, (x, y) in enumerate(b)]
        lo = [(x, y + bt * .55 * (1 - abs(k - 2) / 3)) for k, (x, y) in enumerate(b)]
        brows += f'<path d="{_path(up)} L{lo[-1][0]:.1f} {lo[-1][1]:.1f} {_path(list(reversed(lo)))[1:]} Z" fill="{shade(hair, .85) if t["hairName"] not in ("white","grey") else "#7A746E"}"/>'
    # nose
    n = P
    nose = (f'<path d="{_path([n[27], (n[28][0]+scale*.06, n[28][1]), (n[29][0]+scale*.08, n[29][1]), (n[30][0]+scale*.07, n[30][1])])}" fill="none" stroke="{sk_d}" stroke-width="2.2" opacity=".8"/>'
            f'<path d="{_path([(n[31][0]-scale*.06, n[31][1]-scale*.12), n[31], n[32], n[33], n[34], n[35], (n[35][0]+scale*.06, n[35][1]-scale*.12)])}" fill="none" stroke="{ink}" stroke-width="1.3" stroke-linecap="round"/>'
            f'<ellipse cx="{n[32][0]:.1f}" cy="{n[32][1]-scale*.01:.1f}" rx="{scale*.045:.1f}" ry="{scale*.025:.1f}" fill="{sk_dd}"/>'
            f'<ellipse cx="{n[34][0]:.1f}" cy="{n[34][1]-scale*.01:.1f}" rx="{scale*.045:.1f}" ry="{scale*.025:.1f}" fill="{sk_dd}"/>'
            f'<ellipse cx="{n[30][0]-scale*.02:.1f}" cy="{n[30][1]-scale*.04:.1f}" rx="{scale*.05:.1f}" ry="{scale*.035:.1f}" fill="{sk_l}" opacity=".8"/>'
            f'<path d="{_path([(n[33][0]-scale*.18, n[33][1]+scale*.05), (n[33][0], n[33][1]+scale*.1), (n[33][0]+scale*.18, n[33][1]+scale*.05)])}" fill="none" stroke="{sk_d}" stroke-width="2" opacity=".6"/>')
    lip, lip_d = shade(skin, .8), shade(skin, .64)
    up_lip = [P[i] for i in (48, 49, 50, 51, 52, 53, 54)] + [P[i] for i in (64, 63, 62, 61, 60)]
    lo_lip = [P[i] for i in (54, 55, 56, 57, 58, 59, 48)] + [P[i] for i in (60, 67, 66, 65, 64)]
    mouth = (f'<path d="{_path(up_lip, True)}" fill="{lip_d}"/>'
             f'<path d="{_path(lo_lip, True)}" fill="{lip}"/>'
             f'<path d="{_path([P[48], P[60], P[61], P[62], P[63], P[64], P[54]])}" fill="none" stroke="{ink}" stroke-width="1.3" stroke-linecap="round"/>'
             f'<ellipse cx="{P[57][0]:.1f}" cy="{(P[57][1]+P[66][1])/2:.1f}" rx="{scale*.1:.1f}" ry="{scale*.025:.1f}" fill="{sk_l}" opacity=".55"/>'
             f'<path d="{_path([(P[57][0]-scale*.12, P[57][1]+scale*.12), (P[57][0], P[57][1]+scale*.16), (P[57][0]+scale*.12, P[57][1]+scale*.12)])}" fill="none" stroke="{sk_d}" stroke-width="1.6" opacity=".6"/>')
    # hair: a volume that follows the skull (an outward offset of the head's top), a hairline across the forehead
    hair_d, hair_l = shade(hair, .72), shade(hair, 1.22)
    hcx, hcy = cx, (crown + P[8][1]) / 2
    thick = {'short': .16, 'medium': .3, 'long': .34}.get(hl, 0) * scale
    def off(pt, k):
        dx, dy = pt[0] - hcx, pt[1] - hcy
        r = math.hypot(dx, dy) or 1
        return (pt[0] + dx / r * k, pt[1] + dy / r * k)
    skull = [(P[0][0], P[0][1] + scale * .1)] + fore[::-1] + [(P[16][0], P[16][1] + scale * .1)]
    skull = [skull[0], skull[1], (cx - half * .95, crown + scale * .55), skull[2], skull[3], skull[4], (cx + half * .95, crown + scale * .55), skull[5], skull[6]] if len(skull) == 7 else skull
    line_y = brow_y - scale * (.5 if hl == 'short' else .42)
    if hl == 'bald':
        hair_svg = (f'<path d="{_path([(P[0][0] - scale * .02, P[0][1] + scale * .05), (P[0][0] + scale * .02, brow_y - scale * .2), (P[0][0] + scale * .16, brow_y - scale * .45)])}" fill="none" stroke="{hair}" stroke-width="{scale*.1:.1f}" stroke-linecap="round" opacity=".55"/>'
                    f'<path d="{_path([(P[16][0] + scale * .02, P[16][1] + scale * .05), (P[16][0] - scale * .02, brow_y - scale * .2), (P[16][0] - scale * .16, brow_y - scale * .45)])}" fill="none" stroke="{hair}" stroke-width="{scale*.1:.1f}" stroke-linecap="round" opacity=".55"/>'
                    f'<ellipse cx="{cx-half*.3:.1f}" cy="{crown+scale*.3:.1f}" rx="{half*.32:.1f}" ry="{scale*.12:.1f}" fill="{sk_l}" opacity=".6"/>')
        back = ''
    else:
        outer = [off(p_, thick * (1.0 if 1 < i < len(skull) - 2 else .4)) for i, p_ in enumerate(skull)]
        hairline = [(P[16][0] + scale * .02, P[16][1] - scale * .05), (cx + half * .82, line_y + scale * .12), (cx + half * .35, line_y - scale * .02),
                    (cx - half * .1, line_y + scale * .06), (cx - half * .6, line_y - scale * .02), (cx - half * .86, line_y + scale * .14), (P[0][0] - scale * .02, P[0][1] - scale * .05)]
        body = f'{_path(outer)} {_path(hairline).replace("M", "L", 1)} Z'
        strands = ''.join(f'<path d="{_path([off((cx + half * k, crown + scale * .05), thick * .7), (cx + half * k * 1.08, (crown + line_y) / 2), (cx + half * (k * 1.1 + .06), line_y + scale * .02)])}" fill="none" stroke="{hair_d}" stroke-width="{scale*.035:.2f}" stroke-linecap="round" opacity=".7"/>' for k in (-.8, -.55, -.3, -.05, .22, .48, .74))
        shine = f'<path d="{_path([off((cx - half * .6, crown + scale * .2), thick * .55), off((cx - half * .15, crown), thick * .6), off((cx + half * .2, crown + scale * .06), thick * .55)])}" fill="none" stroke="{hair_l}" stroke-width="{scale*.09:.1f}" stroke-linecap="round" opacity=".5"/>'
        hair_svg = f'<path d="{body}" fill="url(#{uid}gh)" stroke="{ink}" stroke-width="2"/>{strands}{shine}'
        if t.get('curly'):
            # curls: small overlapping rounds along the hair's outer line, each inked (measured trait only)
            pts = []
            for i in range(len(outer) - 1):
                (x0, y0), (x1, y1) = outer[i], outer[i + 1]
                for k in range(3):
                    pts.append((x0 + (x1 - x0) * k / 3, y0 + (y1 - y0) * k / 3))
            r = scale * .16
            hair_svg += ''.join(f'<circle cx="{x_:.1f}" cy="{y_:.1f}" r="{r * (1 + .25 * ((j * 7) % 3 - 1)):.1f}" fill="{hair}" stroke="{ink}" stroke-width="1.4"/>'
                                f'<path d="M{x_ - r * .5:.1f} {y_:.1f} a{r * .5:.1f} {r * .5:.1f} 0 0 1 {r:.1f} 0" fill="none" stroke="{hair_l}" stroke-width="{scale * .04:.2f}" opacity=".6"/>'
                                for j, (x_, y_) in enumerate(pts[1:-1]))
        back = ''
        if hl in ('medium', 'long'):
            drop = scale * (.9 if hl == 'medium' else 2.1)
            for side, a_ in ((-1, P[0]), (1, P[16])):
                o = off(a_, thick * .8)
                back += (f'<path d="M{o[0]:.1f} {a_[1]-scale*.5:.1f} C{o[0]+side*scale*.12:.1f} {a_[1]+drop*.35:.1f} {o[0]+side*scale*.05:.1f} {a_[1]+drop*.75:.1f} {a_[0]+side*scale*.02:.1f} {a_[1]+drop:.1f} '
                         f'C{a_[0]-side*scale*.2:.1f} {a_[1]+drop*.7:.1f} {a_[0]-side*scale*.15:.1f} {a_[1]+drop*.3:.1f} {a_[0]-side*scale*.05:.1f} {a_[1]:.1f} Z" fill="{hair_d}" stroke="{ink}" stroke-width="1"/>')
    beard = ''
    if t.get('beard'):
        top_l, top_r = (P[1][0] + scale * .05, P[1][1] + scale * .1), (P[15][0] - scale * .05, P[15][1] + scale * .1)
        inner = [top_r, (P[54][0] + scale * .18, P[54][1] - scale * .32), (P[33][0] + scale * .1, P[33][1] + scale * .08), (P[33][0] - scale * .1, P[33][1] + scale * .08), (P[48][0] - scale * .18, P[48][1] - scale * .32), top_l]
        beard = (f'<path d="{_path([top_l] + jaw[2:15] + [top_r])} {_path(inner).replace("M", "L", 1)} Z" fill="{hair}" opacity=".88"/>'
                 f'<path d="{_path([P[48], P[57], P[54]])}" fill="none" stroke="{hair_d}" stroke-width="2"/>')
    elif t.get('moustache'):
        beard = f'<path d="{_path([(P[48][0]-scale*.04, P[48][1]+scale*.02), (P[49][0], P[33][1]+scale*.12), (P[33][0], P[33][1]+scale*.1), (P[53][0], P[33][1]+scale*.12), (P[54][0]+scale*.04, P[54][1]+scale*.02), (P[52][0], P[51][1]-scale*.02), (P[50][0], P[51][1]-scale*.02)], True)}" fill="{hair}"/>'
    stubble = ''
    if not t.get('beard') and t.get('stubble', True) and t['hairName'] in ('black', 'dark'):
        stubble = f'<path d="{_path([(P[2][0]+scale*.08, P[2][1])] + jaw[3:14] + [(P[14][0]-scale*.08, P[14][1])])} {_path([(P[54][0]+scale*.1, P[54][1]-scale*.2), (P[33][0], P[33][1]+scale*.14), (P[48][0]-scale*.1, P[48][1]-scale*.2)]).replace("M", "L", 1)} Z" fill="{hair}" opacity=".1"/>'
    return (f'<g><defs>{grad}</defs>'
            f'<path d="{neck}" fill="{sk_d}" stroke="{ink}" stroke-width="2"/>'
            f'<path d="{_path([P[4], (cx, P[8][1] + scale * .55), P[12]])}" fill="none" stroke="{sk_dd}" stroke-width="5" opacity=".35"/>'
            f'{back}{ears}'
            f'<path d="{head}" fill="url(#{uid}gs)" stroke="{ink}" stroke-width="2.2"/>'
            f'<clipPath id="{uid}h"><path d="{head}"/></clipPath>'
            f'<g clip-path="url(#{uid}h)"><path d="{shadow}" fill="{sk_d}" opacity=".7"/>'
            f'<path d="{cheek}" fill="none" stroke="{sk_d}" stroke-width="{scale*.16:.1f}" stroke-linecap="round" opacity=".35"/>'
            f'<path d="{cheek_r}" fill="none" stroke="{sk_d}" stroke-width="{scale*.16:.1f}" stroke-linecap="round" opacity=".5"/>'
            f'<path d="{under_jaw}" fill="none" stroke="{sk_dd}" stroke-width="2" opacity=".4"/>'
            f'<ellipse cx="{cx-half*.3:.1f}" cy="{brow_y-scale*.3:.1f}" rx="{half*.35:.1f}" ry="{scale*.14:.1f}" fill="{sk_l}" opacity=".45"/>{stubble}</g>'
            f'{eyes}{brows}{nose}{mouth}{beard}{hair_svg}</g>')
