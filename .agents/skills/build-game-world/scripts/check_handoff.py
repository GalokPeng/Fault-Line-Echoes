"""Preflight a collaborator's game art folder using only Python's standard library."""
import argparse
import json
from pathlib import Path, PureWindowsPath
import struct
from urllib.parse import unquote, urlsplit


def supplied(base, name, root):
    if not isinstance(name, str) or not name.strip():
        raise ValueError("A nonempty relative filename is required")
    ref = urlsplit(name)
    path = unquote(ref.path)
    if ref.scheme or ref.netloc or ref.query or ref.fragment or PureWindowsPath(path).anchor or "\\" in path:
        raise ValueError(f"Expected a portable relative filename: {name}")
    file = (base / path).resolve()
    if root not in file.parents or not file.is_file():
        raise ValueError(f"Missing or outside the delivery: {name}")
    return file


def string_list(value, field):
    if not isinstance(value, list) or any(not isinstance(item, str) or not item for item in value):
        raise ValueError(f"{field} must be a list of strings")
    return value


def inspect_model(file, root, item):
    if file.suffix.lower() == ".glb":
        size = file.stat().st_size
        with file.open("rb") as stream:
            header = stream.read(20)
            if len(header) != 20:
                raise ValueError(f"Incomplete GLB: {file.name}")
            magic, version, length, size_json, tag = struct.unpack("<4sIII4s", header)
            if (magic, version, tag) != (b"glTF", 2, b"JSON") or length != size or size_json > size - 20:
                raise ValueError(f"Invalid GLB header/length: {file.name}")
            model = json.loads(stream.read(size_json))
    else:
        model = json.loads(file.read_text(encoding="utf-8-sig"))
    if model.get("asset", {}).get("version") != "2.0":
        raise ValueError(f"Expected glTF 2.0: {file.name}")
    for ref in model.get("buffers", []) + model.get("images", []):
        uri = ref.get("uri")
        if uri is not None and not uri.startswith("data:"):
            supplied(file.parent, uri, root)
    names = {}
    for key, section in (("nodes", "nodes"), ("clips", "animations")):
        names[key] = [row["name"] for row in model.get(section, []) if row.get("name")]
        missing = set(string_list(item.get(key, []), key)) - set(names[key])
        if missing:
            raise ValueError(f"{file.name} missing {key}: {', '.join(sorted(missing))}")
    return (f"{len(model.get('meshes', []))} mesh(es), {len(model.get('skins', []))} skin(s), "
            f"nodes {names['nodes']}, clips {names['clips']}")


def check(manifest):
    root = manifest.resolve().parent
    spec = json.loads(manifest.read_text(encoding="utf-8-sig"))
    for field in ("credit", "license"):
        if not isinstance(spec.get(field), str) or not spec[field].strip():
            raise ValueError(f"Provide {field} for this delivery")
    if not isinstance(spec.get("assets"), list) or not spec["assets"]:
        raise ValueError("Include at least one asset")
    seen = set()
    for item in spec["assets"]:
        for field in ("id", "role", "kind", "file"):
            if not isinstance(item.get(field), str) or not item[field].strip():
                raise ValueError(f"Asset requires {field}")
        key, kind = item["id"], item["kind"]
        if key in seen or kind not in ("attachment", "character", "vfx"):
            raise ValueError(f"Duplicate ID or unsupported kind: {key}, {kind}")
        seen.add(key)
        if kind == "vfx":
            if any(not isinstance(item.get(k), str) or not item[k].strip() for k in ("action", "event", "anchor")):
                raise ValueError(f"{key}: specify the action, event and anchor")
            duration = item.get("durationSeconds")
            if type(duration) not in (int, float) or not (0 < duration < float("inf")):
                raise ValueError(f"{key}: provide a positive durationSeconds")
        if kind == "attachment" and not item.get("anchor"):
            raise ValueError(f"{key}: identify the attachment anchor")
        file = supplied(root, item["file"], root)
        for name in string_list(item.get("dependencies", []), "dependencies"):
            supplied(root, name, root)
        detail = inspect_model(file, root, item) if file.suffix.lower() in (".glb", ".gltf") else "supplied; inspect in the renderer"
        print(f"{key}: {file.name}, {file.stat().st_size:,} bytes; {detail}")
    print(f"{len(seen)} asset(s) ready for visual and in-game review.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    try:
        check(args.manifest)
    except (OSError, ValueError, TypeError, AttributeError) as exc:
        parser.exit(1, f"Handoff check failed: {exc}\n")
