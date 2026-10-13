#!/usr/bin/env python3
"""Build data/streets.json from OpenStreetMap: the streets inside the wall.

They are today's streets. Most of the old town keeps its medieval plan, but
the openings of the 19th and 20th centuries are in here too, except the few
listed in MODERN; see docs/sources.md.

Usage: python3 scripts/build-streets.py [--cache streets-osm.json]
"""
import json
import math
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
QUERY = """
[out:json][timeout:90];
way["highway"~"^(pedestrian|residential|living_street|tertiary|secondary|primary|unclassified)$"](39.462,-0.392,39.485,-0.360);
out geom;
"""
# Streets cut through the old fabric after 1700.
MODERN = ("Carrer de la Pau", "Avinguda de l'Oest", "Avinguda del Baró de Càrcer", "Avinguda de Maria Cristina")
WALL_CLEARANCE = 10  # metres kept from the wall, where the ring streets run
TOLERANCE = 1.5  # metres a simplified street may stray from the surveyed one


def fetch(cache):
    if cache and Path(cache).exists():
        return json.loads(Path(cache).read_text())
    body = urllib.parse.urlencode({"data": QUERY}).encode()
    request = urllib.request.Request(OVERPASS_URL, data=body, headers={"User-Agent": "valencia-antiga (personal project)"})
    with urllib.request.urlopen(request, timeout=120) as response:
        data = json.load(response)
    if cache:
        Path(cache).write_text(json.dumps(data))
    return data


def inside(point, polygon):
    x, z = point
    result = False
    for (xi, zi), (xj, zj) in zip(polygon, polygon[-1:] + polygon[:-1]):
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi:
            result = not result
    return result


def distance_to_segment(p, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]
    t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / ((dx * dx + dz * dz) or 1)))
    return math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t)


def simplify(points):
    """Douglas-Peucker."""
    if len(points) < 3:
        return points
    far, index = max((distance_to_segment(p, points[0], points[-1]), i) for i, p in enumerate(points[1:-1], 1))
    if far <= TOLERANCE:
        return [points[0], points[-1]]
    return simplify(points[: index + 1])[:-1] + simplify(points[index:])


def main():
    cache = sys.argv[sys.argv.index("--cache") + 1] if "--cache" in sys.argv else None
    layout = json.loads((ROOT / "data" / "layout.json").read_text())
    origin, wall = layout["origin"], [tuple(p) for p in layout["wall"]]
    per_lat = 111320.0
    per_lon = per_lat * math.cos(math.radians(origin["lat"]))
    to_local = lambda node: ((node["lon"] - origin["lon"]) * per_lon, -(node["lat"] - origin["lat"]) * per_lat)
    keep = lambda p: inside(p, wall) and min(distance_to_segment(p, a, b) for a, b in zip(wall, wall[1:] + wall[:1])) > WALL_CLEARANCE

    streets = []
    for way in fetch(cache)["elements"]:
        tags = way.get("tags", {})
        if tags.get("name") in MODERN or tags.get("tunnel") or tags.get("area") == "yes":
            continue
        run = []
        for point in map(to_local, way["geometry"]):
            if keep(point):
                run.append(point)
                continue
            if len(run) > 1:
                streets.append(run)
            run = []
        if len(run) > 1:
            streets.append(run)

    streets = [[[round(x, 1), round(z, 1)] for x, z in simplify(run)] for run in streets]
    length = sum(math.dist(a, b) for run in streets for a, b in zip(run, run[1:]))
    assert 150 < len(streets) < 3000 and 15000 < length < 90000, (len(streets), length)
    target = ROOT / "data" / "streets.json"
    target.write_text(json.dumps(streets, separators=(",", ":")) + "\n")
    print(f"{len(streets)} streets, {length / 1000:.1f} km, {target.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
