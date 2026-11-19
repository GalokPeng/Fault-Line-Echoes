"""Build Gu Chao's left-wrist sound gauge. Uses the Python standard library, dimensions in metres."""

import json
import math
import struct
from pathlib import Path


vertices, index, lookup = [], [], {}


def point(x, y, z):
    return (round(x, 7), round(y, 7), round(z, 7))


def face(color, *points):
    a, b, c = points[:3]
    u = [j - i for i, j in zip(a, b)]
    v = [j - i for i, j in zip(a, c)]
    normal = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
    length = math.hypot(*normal)
    unit = tuple(round(n / length, 6) for n in normal)
    ids = []
    for xyz in points:
        item = (xyz, unit, color)
        if item not in lookup:
            lookup[item] = len(vertices)
            vertices.append(item)
        ids.append(lookup[item])
    for i in range(1, len(ids) - 1):
        index.extend([ids[0], ids[i], ids[i + 1]])


def circle(x, y, r, z, sides):
    return [point(x + r * math.cos(i * math.tau / sides), y + r * math.sin(i * math.tau / sides), z)
            for i in range(sides)]


def wall(lower, upper, color):
    for i in range(len(lower)):
        j = (i + 1) % len(lower)
        face(color, lower[i], lower[j], upper[j], upper[i])


def plate(poly, z, h, color, edge):
    lower = [point(x, y, z) for x, y in poly]
    upper = [point(x, y, z + h) for x, y in poly]
    face(edge, *reversed(lower))
    wall(lower, upper, edge)
    face(color, *upper)


def linear(hex_code):
    # glTF COLOR_0 is linear. Model colours are written as sRGB swatches.
    c = [int(hex_code[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(round(255 * (v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4)) for v in c)


brass, rim, bronze = map(linear, ['D9AF67', 'EDD6A0', '79563E'])
blue, ink, ivory, needle = map(linear, ['326972', '244754', 'E9DBC0', 'FF744F'])

# Chamfered cover and recessed enamel face. One material preserves a single draw call.
levels = [(0.038, 0, bronze), (0.043, .004, bronze), (.043, .011, brass),
          (.039, .0145, rim), (.035, .0145, brass), (.0334, .0118, bronze)]
rings = [circle(0, 0, r, z, 24) for r, z, _ in levels]
face(bronze, *reversed(rings[0]))
for i in range(len(rings) - 1):
    wall(rings[i], rings[i + 1], levels[i + 1][2])
face(blue, *rings[-1])

# Strap lugs at either end have the same leather slot as the third-person wrist band.
for side in [-1, 1]:
    outline = [(-.017, .033), (.017, .033), (.016, .046), (.011, .05), (-.011, .05), (-.016, .046)]
    plate([(x * side, y * side) for x, y in outline], -.002, .005, brass, bronze)
    slot = [(-.011, .043), (.011, .043), (.011, .0465), (-.011, .0465)]
    face(ink, *[point(x * side, y * side, .0032) for x, y in slot])

# A small arc dial with longer hour marks and three low-frequency ports.
for i in range(13):
    angle = math.radians(-28 + i * 236 / 12)
    c, s = math.cos(angle), math.sin(angle)
    r = .0234 if i % 3 == 0 else .0268
    half = .0013 if i % 3 == 0 else .0008

    def tick(radius, offset):
        return point(c * radius - s * offset, s * radius + c * offset, .0121)

    face(ivory if i < 10 else needle, tick(r, -half), tick(.031, -half), tick(.031, half), tick(r, half))

for x, y in [(-.012, -.018), (0, -.0205), (.012, -.018)]:
    face(ink, *circle(x, y, .0034, .0122, 8))
    face(brass, *circle(x, y, .00125, .01235, 7))

# Off-axis counterweight distinguishes the gauge from a compass or clock.
plate([(-.011, -.011), (.001, -.0035), (.022, .021), (-.003, .002)], .0125, .0019, needle, bronze)
face(brass, *circle(0, 0, .0055, .0146, 12))
face(ink, *circle(0, 0, .0023, .0148, 8))


def padded(data, fill):
    return data + fill * (-len(data) % 4)


binary = bytearray()
views, accessors = [], []


def attribute(data, fmt, target, data_type, shape, **options):
    raw = b''.join(struct.pack('<' + fmt, *v) for v in data)
    views.append(dict(buffer=0, byteOffset=len(binary), byteLength=len(raw), target=target))
    binary.extend(padded(raw, b'\0'))
    accessors.append(dict(bufferView=len(views) - 1, componentType=data_type,
                          count=len(data), type=shape, **options))
    return len(accessors) - 1


xyz, normals, colors = zip(*vertices)
pos = attribute(xyz, '3f', 34962, 5126, 'VEC3', min=list(map(min, zip(*xyz))), max=list(map(max, zip(*xyz))))
norm = attribute(normals, '3f', 34962, 5126, 'VEC3')
# RGBA8 provides the four-byte vertex alignment required for glTF attributes.
col = attribute([(*rgb, 255) for rgb in colors], '4B', 34962, 5121, 'VEC4', normalized=True)
ix = attribute([(i,) for i in index], 'H', 34963, 5123, 'SCALAR')
document = dict(
    asset=dict(version='2.0', generator='Fault Line Echoes · scripts/model-phase-dial.py',
               copyright='Copyright (c) 2026 Fault Line Echoes contributors, MIT'),
    scene=0, scenes=[dict(nodes=[0])], nodes=[dict(name='TidalSoundGauge', mesh=0)],
    meshes=[dict(name='PhaseDial', primitives=[dict(attributes=dict(POSITION=pos, NORMAL=norm, COLOR_0=col),
                                                    indices=ix, material=0)])],
    materials=[dict(name='Brass_and_enamel', pbrMetallicRoughness=dict(metallicFactor=.24, roughnessFactor=.58))],
    accessors=accessors, bufferViews=views, buffers=[dict(byteLength=len(binary))],
)
header = padded(json.dumps(document, ensure_ascii=True, separators=(',', ':')).encode(), b' ')
glb = struct.pack('<4sII', b'glTF', 2, 28 + len(header) + len(binary))
glb += struct.pack('<I4s', len(header), b'JSON') + header
glb += struct.pack('<I4s', len(binary), b'BIN\0') + binary
output = Path(__file__).resolve().parents[1] / 'src' / 'avatar-models' / 'phase-dial.glb'
output.parent.mkdir(exist_ok=True)
output.write_bytes(glb)
print(f'{len(index) // 3} triangles, {len(vertices)} vertices, {len(glb)} bytes')
