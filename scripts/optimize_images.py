from pathlib import Path
import re
import subprocess
from PIL import Image, ImageOps

ROOT = Path(".")
IMAGE_DIR = ROOT / "images"
TEXT_SUFFIXES = {".html", ".css", ".js"}
PNG_PATTERN = re.compile(r'''(?P<url>(?:/)?images/[^"'() ,]+\.png)''', re.IGNORECASE)

text_files = [
    p for p in ROOT.rglob("*")
    if p.is_file() and p.suffix.lower() in TEXT_SUFFIXES
    and ".git" not in p.parts and ".github" not in p.parts
]

# First convert only PNGs that are still referenced by the site. URLs are
# switched to WebP below, so visitors don't download the original PNGs.
referenced_pngs = set()
for path in text_files:
    content = path.read_text(encoding="utf-8")
    referenced_pngs.update(
        match.group("url").lstrip("/") for match in PNG_PATTERN.finditer(content)
    )

converted = []
for relative in sorted(referenced_pngs):
    source = ROOT / relative
    if not source.exists():
        print(f"Skipping missing referenced image: {relative}")
        continue
    target = source.with_suffix(".webp")
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        image.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        image.save(target, "WEBP", quality=80, method=6, alpha_quality=85)
    converted.append(relative)

for path in text_files:
    content = path.read_text(encoding="utf-8")
    updated = PNG_PATTERN.sub(
        lambda match: (
            match.group("url")[:-4] + ".webp"
            if (ROOT / match.group("url").lstrip("/")).with_suffix(".webp").exists()
            else match.group("url")
        ),
        content,
    )
    if updated != content:
        path.write_text(updated, encoding="utf-8")

# Recompress existing WebP assets too. These files are commonly displayed as
# small cards/icons, so cap dimensions to their actual use instead of shipping
# source-resolution art to every visitor.
SMALL_REWARD_NAMES = (
    "pilot-marks", "implants-parts", "prodigy-crate", "revoker-8",
    "cryo-launcher-8", "missile-rack-6", "minigun-8", "em-rifle-8",
    "plasma-cannon", "pulse-cannon", "gauss-rifle-6", "shotgun-4",
    "case-pilot.webp", "nova-pilot", "impulse-pilot",
)

optimized = []
for path in sorted(IMAGE_DIR.glob("*.webp")):
    try:
        with Image.open(path) as original:
            image = ImageOps.exif_transpose(original)
            lower_name = path.name.lower()
            if "mechnova-logo" in lower_name:
                max_dimension, quality = 192, 76
            elif "banner" in lower_name:
                max_dimension, quality = 1280, 78
            elif any(token in lower_name for token in SMALL_REWARD_NAMES):
                max_dimension, quality = 256, 78
            else:
                max_dimension, quality = 640, 80

            before_size = path.stat().st_size
            original_size = image.size
            image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

            temp_path = path.with_name(path.stem + ".optimized.tmp.webp")
            image.save(temp_path, "WEBP", quality=quality, method=6, alpha_quality=85)
            after_size = temp_path.stat().st_size
            # Replace only when the optimized output is smaller or dimensions
            # actually need to be reduced; never inflate a more efficient file.
            if after_size < before_size or image.size != original_size:
                temp_path.replace(path)
                optimized.append((path.name, before_size, after_size, image.size))
            else:
                temp_path.unlink(missing_ok=True)
    except Exception as exc:
        print(f"WARNING: unable to optimize {path}: {exc}")

# Commit the generated assets and updated references in one CI commit.
subprocess.run(["git", "config", "user.name", "github-actions[bot]"], check=True)
subprocess.run(
    ["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"],
    check=True,
)
subprocess.run(["git", "add", "-A"], check=True)
changed = subprocess.run(["git", "diff", "--cached", "--quiet"])
if changed.returncode == 0:
    print("No file changes to commit.")
else:
    subprocess.run(["git", "commit", "-m", "Optimize referenced images for faster page loads"], check=True)
    subprocess.run(["git", "push"], check=True)

if converted:
    print(f"Converted {len(converted)} referenced PNG images to WebP.")
if optimized:
    total_before = sum(row[1] for row in optimized)
    total_after = sum(row[2] for row in optimized)
    print(f"Optimized {len(optimized)} WebP assets: {total_before / 1024 / 1024:.2f} MiB -> {total_after / 1024 / 1024:.2f} MiB (file-level total).")
    for name, before_size, after_size, size in optimized:
        print(f"{name}: {before_size:,} -> {after_size:,} bytes; dimensions {size[0]}x{size[1]}")
