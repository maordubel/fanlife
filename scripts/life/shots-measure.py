"""
LIFE · TOWN — finish the chapter shots: PNG captures → 960×540 WebP, measured.

Hapoel Tel Aviv's set must decode with no yellow at all (rule 8, the band of lib/isYellow.ts measured on the
decoded file, rule 61). Any pixel left in it is rotated to the badge's warm brown and the file re-encoded until
the decode is clean; every other club keeps its own colours. The PNG captures are removed.

    python3 -I scripts/life/shots-measure.py
"""
import glob, io, os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'life', 'town', 'shots')
BAND = (38.0, 70.0, 0.35, 0.35)  # lib/isYellow.ts: hue, min saturation, min value


def yellow(rgb):
    hsv = np.asarray(Image.fromarray(rgb).convert('HSV')).astype(np.float32)
    h, s, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    return (h >= BAND[0]) & (h <= BAND[1]) & (s >= BAND[2]) & (v >= BAND[3])


def wide_band(rgb):
    hsv = np.asarray(Image.fromarray(rgb).convert('HSV')).astype(np.float32)
    h, s, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    return (h >= 36) & (h <= 72) & (s >= 0.33) & (v >= 0.33)


def deyellow(rgb, wide=True):
    hsv = np.asarray(Image.fromarray(rgb).convert('HSV')).astype(np.float32)
    h, s = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255
    m = (h >= 30) & (h <= 80) & (s >= 0.12) if wide else yellow(rgb)
    hsv[..., 0][m] = 26 * 255 / 360
    return np.asarray(Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB'))


def main():
    # new captures, plus Hapoel's finished stills again (they are re-proved every run: cheap, and never stale)
    srcs = sorted(glob.glob(os.path.join(ROOT, '*', '*.png')))
    srcs += [w for w in sorted(glob.glob(os.path.join(ROOT, 'hapoel-tel-aviv', '*.webp'))) if not os.path.exists(w[:-5] + '.png')]
    for png in srcs:
        club = os.path.basename(os.path.dirname(png))
        rgb = np.asarray(Image.open(png).convert('RGB').resize((960, 540), Image.LANCZOS))
        if png.endswith('.webp'):
            png = png[:-5] + '.png'  # the name the loop writes beside and removes; the webp is the source here
        out = png[:-4] + '.webp'
        for attempt in range(10):
            if club == 'hapoel-tel-aviv':
                rgb = deyellow(rgb, wide=True)
            buf = io.BytesIO(); Image.fromarray(rgb).save(buf, 'WEBP', quality=82, method=6)
            dec = np.asarray(Image.open(io.BytesIO(buf.getvalue())).convert('RGB'))
            # counted on the WIDE band, not the scanner's: another decoder (the test reads with sharp) rounds a
            # pixel or two differently, and a margin is what keeps the proof true for every decoder (rule 44)
            left = int(wide_band(dec).sum()) if club == 'hapoel-tel-aviv' else 0
            if not left:
                break
            # what the codec keeps inventing is ringing at an edge: grey out a small neighbourhood round each
            # pixel it made, so the next encode has no chroma there to ring with
            near = ndimage.binary_dilation(wide_band(dec), iterations=3)
            hsv = np.asarray(Image.fromarray(deyellow(dec, wide=True)).convert('HSV')).copy()
            hsv[..., 1][near] = (hsv[..., 1][near] * 0.25).astype(np.uint8)
            rgb = np.asarray(Image.fromarray(hsv, 'HSV').convert('RGB'))
        if left:
            Image.fromarray(rgb).save(out, 'WEBP', lossless=True)
        else:
            open(out, 'wb').write(buf.getvalue())
        if os.path.exists(png):
            os.remove(png)
        print(club, os.path.basename(out), os.path.getsize(out), 'yellow left', left)


if __name__ == '__main__':
    main()
