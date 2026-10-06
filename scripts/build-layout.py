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
  nwr["name"~"Micalet|Catedral de València|Llotja de la Seda|Palau del Real|Santíssima Trinitat|Belles Arts|Sant Doménec|Portal de Saïdia"](39.462,-0.400,39.490,-0.355);
  nwr["amenity"="place_of_worship"](39.464,-0.390,39.486,-0.360);
  way["highway"]["name"="Carrer de Sant Vicent Màrtir"](39.462,-0.392,39.475,-0.370);
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

# Buildings drawn with their own silhouette: (OSM name, id, kind, options).
# "kind" picks the model in src/landmarks.js. The churches are today's
# buildings on sites that, from memory, were already churches around 1700;
# see docs/sources.md.
LANDMARKS = [
    ("el Micalet", "micalet", "micalet", {}),
    ("Catedral de València", "seu", "cathedral", {"axis": [1, 0], "length": 95, "width": 28}),
    ("Llotja de la Seda", "llotja", "llotja", {}),
    ("Palau del Real de València", "palau-real", "palace", {"alignToRiver": True}),
    ("Reial Monestir de la Santíssima Trinitat", "trinitat", "convent", {}),
    ("Museu de Belles Arts de València", "sant-pius", "convent", {"alignToRiver": True}),
    ("Convent de Sant Doménec", "sant-domenec", "convent", {}),
    ("Portal de Saïdia", "saidia", "convent", {"alignToRiver": True}),
    ("Santa Mònica", "santa-monica", "church", {}),
    ("Basílica de la Mare de Déu dels Desemparats", "desemparats", "church", {"dome": True, "tower": False}),
    ("Església de Santa Caterina", "santa-caterina", "church", {"towerHeight": 56, "towerSides": 6}),
    ("Església dels Sants Joans", "sants-joans", "church", {}),
    ("Església de Sant Nicolau", "sant-nicolau", "church", {}),
    ("Església de Sant Martí", "sant-marti", "church", {}),
    ("Iglesia de San Esteban", "sant-esteve", "church", {}),
    ("Església de Sant Llorenç", "sant-llorenc", "church", {}),
    ("Reial Església del Santíssim Crist del Salvador", "salvador", "church", {}),
    ("Iglesia de San Juan del Hospital", "sant-joan-hospital", "church", {}),
    ("Sant Joan de la Creu", "sant-andreu", "church", {}),
    ("Església de Sant Agustí i Santa Caterina", "sant-agusti", "church", {}),
    ("Església de la Santíssima Creu", "carme", "church", {}),
    ("Església de la Companyia de Jesús", "companyia", "church", {}),
    ("Convento del Corpus Christi", "corpus-christi", "church", {}),
]

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


def footprint_points(element):
    if element["type"] == "relation":
        return [
            (p["lat"], p["lon"])
            for member in element.get("members", [])
            if member.get("role") != "inner"
            for p in member.get("geometry", [])
        ]
    return element_points(element)


def principal_axis(points):
    """Long axis of a footprint and its extent along and across that axis."""
    cx = sum(p[0] for p in points) / len(points)
    cz = sum(p[1] for p in points) / len(points)
    sxx = sum((p[0] - cx) ** 2 for p in points)
    szz = sum((p[1] - cz) ** 2 for p in points)
    sxz = sum((p[0] - cx) * (p[1] - cz) for p in points)
    angle = 0.5 * math.atan2(2 * sxz, sxx - szz)
    ax, az = math.cos(angle), math.sin(angle)
    along = [(p[0] - cx) * ax + (p[1] - cz) * az for p in points]
    across = [-(p[0] - cx) * az + (p[1] - cz) * ax for p in points]
    return (ax, az), max(along) - min(along), max(across) - min(across)


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

    street = [to_local(p) for p in points_named("Carrer de Sant Vicent Màrtir", lambda tags: "highway" in tags)]
    if street:
        vertex = min(range(len(wall)), key=lambda i: min(math.dist(wall[i], p) for p in street))
        gates.append({
            "id": "sant-vicent",
            "name": "Portal de Sant Vicent",
            "vertex": vertex,
            "placement": "where today's Carrer de Sant Vicent Màrtir meets the ring",
            "major": True,
        })

    landmarks = []
    for name, landmark_id, kind, options in LANDMARKS:
        candidates = [e for e in by_name.get(name, []) if e["type"] != "node"] or by_name.get(name, [])
        if not candidates:
            print(f"warning: landmark not found in OSM data: {name}")
            continue
        points = [to_local(p) for p in footprint_points(candidates[0]) or element_points(candidates[0])]
        xs, zs = [p[0] for p in points], [p[1] for p in points]
        entry = {
            "id": landmark_id,
            "name": name,
            "kind": kind,
            "x": round((min(xs) + max(xs)) / 2, 1),
            "z": round((min(zs) + max(zs)) / 2, 1),
        }
        if len(points) >= 3:
            axis, length, width = principal_axis(points)
            entry.update(axis=[round(axis[0], 3), round(axis[1], 3)], length=round(length), width=round(width))
        entry.update(options)
        landmarks.append(entry)

    def rounded(points):
        return [[round(x, 1), round(z, 1)] for x, z in points]

    layout = {
        "origin": {"name": ORIGIN_NAME, "lat": round(origin[0], 6), "lon": round(origin[1], 6)},
        "axes": "x east, z south, metres from the origin",
        "river": rounded(river),
        "bridges": [{**b, "x": round(b["x"], 1), "z": round(b["z"], 1)} for b in bridges],
        "wall": rounded(wall),
        "gates": gates,
        "landmarks": landmarks,
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
    for landmark in landmarks:
        print(
            f"landmark {landmark['id']:18} {landmark['kind']:9} at ({landmark['x']:6.0f}, {landmark['z']:6.0f})"
            f" {landmark.get('length', '-')}x{landmark.get('width', '-')} river {distance_to_river((landmark['x'], landmark['z'])):.0f} m"
        )


if __name__ == "__main__":
    main()
