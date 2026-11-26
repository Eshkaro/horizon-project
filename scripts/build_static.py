"""Package only public website assets for static hosts such as GitHub Pages."""
from pathlib import Path
import shutil
from build_page import build_page

ROOT = Path(__file__).resolve().parents[1]


def build_static():
    build_page()
    output = ROOT / "_site"
    output.mkdir(exist_ok=True)
    for name in ["index.html", "matcher.html", "README.md", "MATCHING.md"]:
        shutil.copy2(ROOT / name, output / name)
    shutil.copytree(ROOT / "data", output / "data", dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns("*.zip", "__pycache__"))
    (output / ".nojekyll").touch()
    print("Public website prepared in", output)


if __name__ == "__main__":
    build_static()
