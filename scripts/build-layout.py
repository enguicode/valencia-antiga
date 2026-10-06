#!/usr/bin/env python3
"""Build data/layout.json from OpenStreetMap.

The river course is taken from the midpoints of today's bridges over the old
Turia bed, and the wall perimeter from the ring streets that replaced the wall
after 1865. Both are approximations of the layout around 1700; see
docs/sources.md.

Usage: python3 scripts/build-layout.py [--cache osm.json]
"""
import json
import math
import statistics
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
QUERY = """
[out:json][timeout:90];
(
  way["bridge"]["name"~"^Pont"](39.455,-0.410,39.492,-0.345);
  way["highway"]["name"~"Guillem de Castro|Xàtiva|Colón|Colom|Blanqueri|Comte de Trénor|Pintor López|Ciutadella"](39.462,-0.392,39.485,-0.360);
  nwr["historic"="city_gate"](39.462,-0.392,39.485,-0.360);
);
out geom tags;
"""

# Bridges over the old river bed, upstream to downstream. Only the historic
# ones are drawn; the rest just pin down the course of the river.
RIVER_BRIDGES = [
    ("Pont de Campanar", None),
    ("Pont de les Glòries Valencianes", None),
    ("Pont de les Arts", None),
    ("Pont de Sant Josep", "sant-josep"),
    ("Pont dels Serrans", "serrans"),
    ("Pont de la Trinitat", "trinitat"),
    ("Pont del Real", "real"),
    ("Pont de la Mar", "mar"),
    ("Pont d'Aragó", None),
    ("Pont de l'Àngel Custodi", None),
    ("Pont del Regne de València", None),
]

RING_STREETS = [
    "Carrer de Guillem de Castro",
    "Carrer de Xàtiva",
    "Carrer de Colón",
    "Carrer de Colom",
    "Carrer de la Blanqueria",
    "Carrer del Comte de Trénor",
    "Carrer del Pintor López",
    "Passeig de la Ciutadella",
]

# Riverside gates stood at the city end of each historic bridge.
BRIDGE_GATES = {
    "sant-josep": "Portal Nou",
    "serrans": "Portal dels Serrans",
    "trinitat": "Portal de la Trinitat",
    "real": "Portal del Real",
    "mar": "Portal de la Mar",
}

ORIGIN_NAME = "Torres dels Serrans"
TOWER_SPACING = 70  # metres between wall vertices, which is where towers go
ANGLE_BINS = 90


def fetch(cache):
    if cache and Path(cache).exists():
        return json.loads(Path(cache).read_text())
    body = urllib.parse.urlencode({"data": QUERY}).encode()
    request = urllib.request.Request(
        OVERPASS_URL, data=body, headers={"User-Agent": "valencia-antiga (personal project)"}
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        data = json.load(response)
    if cache:
        Path(cache).write_text(json.dumps(data))
    return data


def element_points(element):
    if "geometry" in element:
        return [(p["lat"], p["lon"]) for p in element["geometry"]]
    if "lat" in element:
        return [(element["lat"], element["lon"])]
    if "bounds" in element:
        b = element["bounds"]
        return [((b["minlat"] + b["maxlat"]) / 2, (b["minlon"] + b["maxlon"]) / 2)]
    return []


def bbox_centre(points):
    lats = [p[0] for p in points]
    lons = [p[1] for p in points]
    return ((min(lats) + max(lats)) / 2, (min(lons) + max(lons)) / 2)


def resample_closed(points, spacing):
    closed = points + [points[0]]
    lengths = [math.dist(closed[i], closed[i + 1]) for i in range(len(points))]
    total = sum(lengths)
    count = round(total / spacing)
    step = total / count
    result = []
    segment, travelled = 0, 0.0
    for i in range(count):
        target = i * step
        while travelled + lengths[segment] < target:
            travelled += lengths[segment]
            segment += 1
        t = (target - travelled) / lengths[segment]
        a, b = closed[segment], closed[segment + 1]
        result.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return result, total


def main():
    cache = sys.argv[sys.argv.index("--cache") + 1] if "--cache" in sys.argv else None
    elements = fetch(cache)["elements"]
    by_name = {}
    for element in elements:
        name = element.get("tags", {}).get("name")
        if name:
            by_name.setdefault(name, []).append(element)

    def points_named(name, predicate=lambda tags: True):
        return [p for e in by_name.get(name, []) if predicate(e["tags"]) for p in element_points(e)]

    gate_points = points_named(ORIGIN_NAME, lambda tags: tags.get("historic") == "city_gate")
    origin = bbox_centre(gate_points)
    metres_per_lat = 111_320.0
    metres_per_lon = metres_per_lat * math.cos(math.radians(origin[0]))

    # Scene axes: x grows to the east, z grows to the south.
    def to_local(point):
        return ((point[1] - origin[1]) * metres_per_lon, -(point[0] - origin[0]) * metres_per_lat)

    river, bridges = [], []
    for name, bridge_id in RIVER_BRIDGES:
        points = points_named(name, lambda tags: "bridge" in tags)
        if not points:
            sys.exit(f"missing bridge in OSM data: {name}")
        centre = to_local(bbox_centre(points))
        river.append(centre)
        if bridge_id:
            bridges.append({"id": bridge_id, "name": name, "x": centre[0], "z": centre[1]})

    ring = [to_local(p) for name in RING_STREETS for p in points_named(name, lambda tags: "highway" in tags)]
    xs, zs = [p[0] for p in ring], [p[1] for p in ring]
    centre = ((min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2)

    # The old town is a rough oval, so the ring can be ordered by bearing from
    # its centre: one radius per angular bin, gaps filled by interpolation.
    bins = [[] for _ in range(ANGLE_BINS)]
    for x, z in ring:
        angle = math.atan2(z - centre[1], x - centre[0]) % (2 * math.pi)
        bins[int(angle / (2 * math.pi) * ANGLE_BINS) % ANGLE_BINS].append(math.dist((x, z), centre))
    radii = [statistics.median(b) if b else None for b in bins]
    known = [i for i, r in enumerate(radii) if r is not None]
    for i in range(ANGLE_BINS):
        if radii[i] is None:
            before = max((k for k in known if k < i), default=known[-1] - ANGLE_BINS)
            after = min((k for k in known if k > i), default=known[0] + ANGLE_BINS)
            t = (i - before) / (after - before)
            radii[i] = radii[before % ANGLE_BINS] * (1 - t) + radii[after % ANGLE_BINS] * t
    smoothed = [
        (radii[i - 1] + 2 * radii[i] + radii[(i + 1) % ANGLE_BINS]) / 4 for i in range(ANGLE_BINS)
    ]
    outline = []
    for i, radius in enumerate(smoothed):
        angle = (i + 0.5) / ANGLE_BINS * 2 * math.pi
        outline.append((centre[0] + math.cos(angle) * radius, centre[1] + math.sin(angle) * radius))
    wall, perimeter = resample_closed(outline, TOWER_SPACING)

    def nearest_wall_vertex(point):
        return min(range(len(wall)), key=lambda i: math.dist(wall[i], point))

    gates = []
    for bridge in bridges:
        gates.append({
            "id": bridge["id"],
            "name": BRIDGE_GATES[bridge["id"]],
            "vertex": nearest_wall_vertex((bridge["x"], bridge["z"])),
            "placement": "nearest wall point to the bridge",
        })
    serrans = next(g for g in gates if g["id"] == "serrans")
    serrans["vertex"] = nearest_wall_vertex((0, 0))
    serrans["placement"] = "OSM position of the surviving gate"
    serrans["major"] = True
    quart = points_named("Torres de Quart", lambda tags: tags.get("historic") == "city_gate")
    if quart:
        gates.append({
            "id": "quart",
            "name": "Portal de Quart",
            "vertex": nearest_wall_vertex(to_local(bbox_centre(quart))),
            "placement": "OSM position of the surviving gate",
            "major": True,
        })

    def rounded(points):
        return [[round(x, 1), round(z, 1)] for x, z in points]

    layout = {
        "origin": {"name": ORIGIN_NAME, "lat": round(origin[0], 6), "lon": round(origin[1], 6)},
        "axes": "x east, z south, metres from the origin",
        "river": rounded(river),
        "bridges": [{**b, "x": round(b["x"], 1), "z": round(b["z"], 1)} for b in bridges],
        "wall": rounded(wall),
        "gates": gates,
    }
    target = ROOT / "data" / "layout.json"
    target.write_text(json.dumps(layout, ensure_ascii=False, indent=1) + "\n")

    def distance_to_river(point):
        best = float("inf")
        for a, b in zip(river, river[1:]):
            ax, az, bx, bz = *a, *b
            t = max(0, min(1, ((point[0] - ax) * (bx - ax) + (point[1] - az) * (bz - az)) / math.dist(a, b) ** 2))
            best = min(best, math.dist(point, (ax + (bx - ax) * t, az + (bz - az) * t)))
        return best

    gaps = sorted(distance_to_river(p) for p in wall)
    print(f"wrote {target.relative_to(ROOT)}")
    print(f"ring points: {len(ring)}, empty bins: {ANGLE_BINS - len(known)}")
    print(f"wall: {len(wall)} vertices, perimeter {perimeter:.0f} m")
    print(f"wall to river centreline: closest {gaps[0]:.0f} m, 5 closest {[round(g) for g in gaps[:5]]}")
    for gate in gates:
        x, z = wall[gate["vertex"]]
        print(f"gate {gate['id']:11} vertex {gate['vertex']:3} at ({x:7.0f}, {z:7.0f})")
    for bridge in bridges:
        print(f"bridge {bridge['id']:11} at ({bridge['x']:7.0f}, {bridge['z']:7.0f})")


if __name__ == "__main__":
    main()
