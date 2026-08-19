#!/usr/bin/env python3
"""Swap the Pamwe app icon everywhere it ships from one source image.

    python3 scripts/swap_app_icon.py ~/Downloads/new-icon.png

Writes, from the one source:
  assets/images/icon.png                                       1024, opaque
  ios/Pamwe/Images.xcassets/AppIcon.appiconset/
      App-Icon-1024x1024@1x.png                                1024, opaque
  assets/images/favicon.png                                    48, alpha kept

ios/ is gitignored and hand-maintained, so the AppIcon file is the one that
actually ships: app.json's `icon` only reaches iOS through `expo prebuild`,
which this repo never runs.

Apple rejects an app icon carrying an alpha channel, so both 1024s are
flattened onto the source's own corner pixel. Anything non-square is centre
cropped first rather than squashed.

It does NOT touch assets/images/pamwe-bloom.png. That is the in-app mark on a
transparent background and it stands on cream and near-black, not on the
icon's own field, so it is a separate decision.
"""

import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TARGETS = [
    (ROOT / "assets/images/icon.png", 1024, False),
    (
        ROOT
        / "ios/Pamwe/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png",
        1024,
        False,
    ),
    (ROOT / "assets/images/favicon.png", 48, True),
]


def square(im):
    w, h = im.size
    if w == h:
        return im
    side = min(w, h)
    left, top = (w - side) // 2, (h - side) // 2
    return im.crop((left, top, left + side, top + side))


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1]).expanduser()
    if not src.is_file():
        sys.exit(f"no such file: {src}")

    im = square(Image.open(src).convert("RGBA"))
    if im.width < 1024:
        sys.exit(f"source is {im.width}px square; the app icon needs 1024 or more")

    # The field colour the artwork was drawn on, read off its own corner, so a
    # flatten never introduces a colour nobody chose.
    field = im.getpixel((2, 2))[:3]
    print(f"source {src.name}: {im.width}x{im.height}, field #%02X%02X%02X" % field)

    for path, size, keep_alpha in TARGETS:
        out = im.resize((size, size), Image.LANCZOS)
        if not keep_alpha:
            flat = Image.new("RGB", out.size, field)
            flat.paste(out, mask=out.split()[3])
            out = flat
        if path.exists():
            shutil.copy2(path, path.with_suffix(".png.bak"))
        out.save(path)
        print(f"  wrote {path.relative_to(ROOT)} ({size}px, alpha={keep_alpha})")

    print("\nPrevious files kept beside each as .png.bak.")
    print("Next: bump CURRENT_PROJECT_VERSION (4 spots) and archive.")


if __name__ == "__main__":
    main()
