"""Export the playable MIT reference into a new directory, without repository or deployment bindings."""
import argparse
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
from zipfile import ZipFile

REV = "482b5dc15428ded3a6a1ed5f5de9c8593c717de6"
REMOTE = "https://github.com/GalokPeng/Fault-Line-Echoes.git"
FILES = ["src", "public", "server", "api", "tests", "scripts", "index.html", "package.json",
         "package-lock.json", "vite.config.js", "vercel.json", "LICENSE", "README.md", ".gitignore", ".vercelignore"]


def export(destination, local_repo):
    target = destination.absolute()
    if target.exists() or target.is_symlink():
        raise ValueError("Choose a new directory. The destination already exists.")
    target.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=target.parent) as tmp:
        work = Path(tmp)
        repo = local_repo or work / "git-source"
        if not local_repo:
            subprocess.run(["git", "init", "--quiet", str(repo)], check=True)
            subprocess.run(["git", "-C", str(repo), "fetch", "--quiet", "--no-tags", "--depth=1", REMOTE, REV], check=True)
        archive = work / "reference.zip"
        subprocess.run(["git", "-C", str(repo), "archive", "--format=zip", "-o", str(archive), REV, "--", *FILES], check=True)
        game = work / "game"
        with ZipFile(archive) as source:
            source.extractall(game)
        game.rename(target)
    print(f"Exported Fault Line Echoes {REV[:7]} to {target}")
    print("Run npm ci, npm test and npm run build there. The standalone game is dist/faultline-local.html.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--from-repo", type=Path, help="Local Git checkout containing the pinned commit")
    args = parser.parse_args()
    try:
        export(args.destination, args.from_repo)
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        parser.exit(1, f"Reference export failed: {exc}\n")
