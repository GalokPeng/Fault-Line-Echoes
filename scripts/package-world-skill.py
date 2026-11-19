"""Generate the portable handbook and its embedded, installable skill archive (Python 3)."""
from base64 import b64encode
from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / ".agents" / "skills" / "build-game-world"


def package():
    archive = BytesIO()
    with ZipFile(archive, "w") as out:
        for source in sorted(SKILL.rglob("*")):
            if not source.is_file() or "__pycache__" in source.parts or source.name.endswith(".pyc"):
                continue
            name = SKILL.name + "/" + source.relative_to(SKILL).as_posix()
            record = ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            record.external_attr = 0o100644 << 16
            record.create_system = 3
            payload = source.read_bytes()
            if source.suffix in {".md", ".json", ".py", ".svg", ".yaml"} or source.name == "LICENSE":
                payload = payload.replace(b"\r\n", b"\n")
            out.writestr(record, payload, compress_type=ZIP_DEFLATED)
    return b64encode(archive.getvalue()).decode("ascii")


def data_url(file, mime):
    return f"data:{mime};base64," + b64encode(file.read_bytes()).decode("ascii")


if __name__ == "__main__":
    html = (ROOT / "scripts" / "world-skill.template.html").read_text(encoding="utf-8")
    html = html.replace("@@ZIP@@", package()).replace("@@SIGIL@@", data_url(ROOT / "public/sigil.svg", "image/svg+xml")).replace("@@COVER@@", data_url(ROOT / "public/atlas/capital.webp", "image/webp"))
    (ROOT / "public/world-skill.html").write_bytes(html.encode("utf-8"))
    print("Created public/world-skill.html with the complete offline skill ZIP.")
