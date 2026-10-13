#!/usr/bin/env python3
"""Build data/streets.json by tracing the streets of Tosca's plan of València.

The source is José Fortea's engraving (1738) of the plan Tomás Vicente Tosca
drew in 1704, 7130 x 4751 px, as published at
https://puentesvalencia.com/plano-cartografico-valencia-en-1704-del-padre-tosca/
(plano-padre-tosca-grabado-fortea-1738.jpg). It is not kept in the repository.

The engraving is laid over the scene with an affine fit through ten places
that stand in both (CONTROL). The fit is 4 to 35 m out, 20 m on average: the
street pattern is Tosca's, its position is approximate. See docs/sources.md.

Needs Pillow, numpy, scipy and scikit-image.
Usage: python3 scripts/trace-tosca.py <engraving.jpg>
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.draw import polygon as fill_polygon
from skimage.morphology import skeletonize

ROOT = Path(__file__).resolve().parent.parent
Image.MAX_IMAGE_PIXELS = None
CONTROL = {  # scene (x, z) -> engraving pixel
 'serrans': ((0, 0), (5018, 3815)), 'quart': ((-672.3, 371.8), (6150, 1905)), 'micalet': ((32.8, 439.8), (4310, 2775)),
 'sant-vicent': ((-295.9, 1241.5), (4140, 380)), 'llotja': ((-208.7, 541.5), (4750, 2150)), 'sants-joans': ((-276.8, 556.9), (4910, 2010)),
 'carme': ((-217.6, -21), (5650, 3450)), 'sant-domenec': ((602, 564.1), (2650, 3200)), 'russafa': ((106.9, 1326.4), (2960, 595)),
 'torre-sta-caterina': ((-546.1, -155.4), (6600, 3380)),
}
rows = np.array([(x, z, 1) for (x, z), _ in CONTROL.values()], float)
A = np.linalg.lstsq(rows, np.array([p for _, p in CONTROL.values()], float), rcond=None)[0].T  # scene (x, z, 1) -> pixel
PPM = math.sqrt(abs(np.linalg.det(A[:, :2])))
DARK = 150  # grey level under which a pixel is ink
EDGE = 12  # metres kept from the line of the wall
SPUR = 26  # dead ends shorter than this are courtyards and noise
WIDE = 11  # metres from the middle to the nearest ink beyond which it is a square or a garden, not a street
residual = np.hypot(*(rows @ A.T - np.array([p for _, p in CONTROL.values()])).T) / PPM
print('fit off by', residual.round(0).tolist(), 'm')
gray = np.asarray(Image.open(sys.argv[1]).convert('L'))
ink = ndi.binary_dilation(gray < DARK)  # thicken outlines and hatching, so roofs close off from the streets
white = ~ink
white = white[: white.shape[0] // 2 * 2, : white.shape[1] // 2 * 2]
white = white.reshape(white.shape[0] // 2, 2, white.shape[1] // 2, 2).all(axis=(1, 3))   # half resolution
K = PPM / 2                                # half-resolution pixels per metre
wall = np.array(json.loads((ROOT / 'data' / 'layout.json').read_text())['wall'])
wp = (np.c_[wall, np.ones(len(wall))] @ A.T) / 2
inside = np.zeros(white.shape, bool)
rr, cc = fill_polygon(wp[:, 1], wp[:, 0], white.shape); inside[rr, cc] = True
inside = ndi.distance_transform_edt(inside) > EDGE * K
white &= inside
white = ndi.binary_opening(white, iterations=1)
labels, n = ndi.label(white, structure=np.ones((3, 3)))
sizes = ndi.sum(white, labels, range(1, n + 1))
net = np.isin(labels, 1 + np.flatnonzero(sizes > 260 * K * K))
half = ndi.distance_transform_edt(net) / K          # metres to the nearest ink
sk = skeletonize(net) & (half < WIDE)               # squares and gardens are not streets
# courtyards and garden plots trace as short stray tangles: keep what belongs to a real run of street
runs, m = ndi.label(sk, structure=np.ones((3, 3)))
sk &= np.isin(runs, 1 + np.flatnonzero(ndi.sum(sk, runs, range(1, m + 1)) / K > 90))
print(f'{PPM:.3f} px/m; components {n}; network {net.sum() / K / K / 1e4:.1f} ha; skeleton {sk.sum() / K / 1000:.1f} km')

# skeleton -> polylines between nodes (pixels with one or more than two neighbours)
nb = ndi.convolve(sk.astype(int), np.ones((3, 3), int), mode='constant') - 1
P = set(zip(*np.nonzero(sk)))
node = {p for p in P if nb[p] != 2}
def around(p):
    return [(p[0] + a, p[1] + b) for a in (-1, 0, 1) for b in (-1, 0, 1) if (a or b) and (p[0] + a, p[1] + b) in P]
lines, seen = [], set()
for s in node:
    for q in around(s):
        if (s, q) in seen: continue
        line = [s, q]; seen.add((s, q))
        while line[-1] not in node:
            nxt = [r for r in around(line[-1]) if r != line[-2]]
            nxt = [r for r in nxt if r not in line[-3:]] or nxt
            if not nxt: break
            line.append(min(nxt, key=lambda r: abs(r[0] - line[-1][0]) + abs(r[1] - line[-1][1])))
        seen.add((line[-1], line[-2]))
        lines.append(line)
ends = {p for p in node if nb[p] == 1}
length = lambda l: sum(math.dist(a, b) for a, b in zip(l, l[1:])) / K
lines = [l for l in lines if not ((l[0] in ends or l[-1] in ends) and length(l) < SPUR) and length(l) > 3]
inv = np.linalg.inv(A[:, :2])
def scene(l):
    px = np.array([(c * 2 + 1, r * 2 + 1) for r, c in l], float)
    if len(px) > 8:  # the skeleton wanders a pixel either way: run a mean along it, ends held
        pad = np.vstack([np.repeat(px[:1], 4, 0), px, np.repeat(px[-1:], 4, 0)])
        px = np.stack([np.convolve(pad[:, k], np.ones(9) / 9, 'valid') for k in (0, 1)], 1)
    return (px - A[:, 2]) @ inv.T
def simplify(pts, tol=1.6):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; d = b - a; n = np.hypot(*d) or 1
    dist = np.abs(d[0] * (pts[1:-1, 1] - a[1]) - d[1] * (pts[1:-1, 0] - a[0])) / n
    i = int(dist.argmax()) + 1
    if dist[i - 1] <= tol: return np.array([a, b])
    return np.vstack([simplify(pts[: i + 1], tol)[:-1], simplify(pts[i:], tol)])
streets = [np.round(simplify(scene(l)), 1).tolist() for l in lines]
streets = [s for s in streets if len(s) > 1]
km = sum(math.dist(a, b) for s in streets for a, b in zip(s, s[1:])) / 1000
assert 800 < len(streets) < 4000 and 30 < km < 55, (len(streets), km)
target = ROOT / 'data' / 'streets.json'
target.write_text(json.dumps(streets, separators=(',', ':')) + '\n')
print(f'{len(streets)} streets, {km:.1f} km, {target.stat().st_size / 1024:.0f} KB')

# The blocks: what the streets leave within the walls, each as its outline
# followed by any squares enclosed in it. Street is the white that hangs from
# the traced runs or from the middle of a square: the dotted orchards of the
# engraving are white specks off both, and so stay inside their block.
from skimage.measure import approximate_polygon, find_contours
spine = sk | (skeletonize(net) & (half >= WIDE))
away, (near_r, near_c) = ndi.distance_transform_edt(~spine, return_indices=True)
street = net & (away / K <= half[near_r, near_c] + 1)
block = ndi.binary_opening(inside & ~street, iterations=1)
parts, m = ndi.label(block)
area = lambda ring: abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, np.roll(ring, -1, 0)))) / 2
blocks = []
for i, where in enumerate(ndi.find_objects(parts), 1):
    mask = np.pad(parts[where] == i, 1)
    rings = []
    for contour in find_contours(mask.astype(float), 0.5):
        # 2.5 m of tolerance: straight runs for the rows of houses
        ring = approximate_polygon(contour, 2.5 * K)[:-1] + (where[0].start - 1, where[1].start - 1)
        ring = (np.c_[ring[:, 1] * 2 + 1, ring[:, 0] * 2 + 1] - A[:, 2]) @ inv.T
        if len(ring) > 2 and area(ring) > 25: rings.append(ring)
    rings.sort(key=area, reverse=True)
    if rings and area(rings[0]) > 60: blocks.append([np.round(ring, 1).tolist() for ring in rings])
built = sum(area(np.array(b[0])) - sum(area(np.array(h)) for h in b[1:]) for b in blocks) / 1e4
assert 100 < len(blocks) < 1500 and 60 < built < 140, (len(blocks), built)
target = ROOT / 'data' / 'blocks.json'
target.write_text(json.dumps(blocks, separators=(',', ':')) + '\n')
print(f'{len(blocks)} blocks, {built:.1f} ha, {target.stat().st_size / 1024:.0f} KB')
