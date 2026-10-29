"""Outline "1mb" in Space Grotesk 700 and write the icon SVG sources.

The glyphs become paths, so the icons look the same wherever they render, whatever fonts the
client has. Run through scripts/icons/build.sh, not directly.

Usage: python outline.py <font.woff2> <out_dir>
"""

import sys
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

BG = "#0a0a0a"
FG = "#e5e5e5"
TRACKING = -0.04  # em, matches .logo letter-spacing


def outline(font_path):
    font = TTFont(font_path)
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    hmtx = font["hmtx"]

    pen = SVGPathPen(glyph_set)
    bounds = BoundsPen(glyph_set)
    x = 0
    for ch in "1mb":
        name = cmap[ord(ch)]
        # Flip y (font units are y-up) and advance along x.
        for target in (pen, bounds):
            glyph_set[name].draw(TransformPen(target, (1, 0, 0, -1, x, 0)))
        x += hmtx[name][0] + TRACKING * upm
    return pen.getCommands(), bounds.bounds  # bounds: xMin, yMin, xMax, yMax (y flipped)


def icon_svg(path, bounds, size, width_ratio, radius):
    x_min, y_min, x_max, y_max = bounds
    w, h = x_max - x_min, y_max - y_min
    scale = size * width_ratio / w
    tx = (size - w * scale) / 2 - x_min * scale
    ty = (size - h * scale) / 2 - y_min * scale
    rect = f'<rect width="{size}" height="{size}" rx="{radius}" fill="{BG}"/>'
    glyphs = (
        f'<path fill="{FG}" transform="translate({tx:.3f} {ty:.3f}) scale({scale:.5f})" d="{path}"/>'
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
        f"<title>1mb</title>{rect}{glyphs}</svg>\n"
    )


def main():
    font_path, out = sys.argv[1], Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    path, bounds = outline(font_path)
    # favicon / "any" icons: rounded tile, mark fills most of the width.
    (out / "favicon.svg").write_text(icon_svg(path, bounds, 32, 0.78, 6))
    # Full-bleed tiles: iOS and maskable platforms round the corners themselves.
    # Maskable keeps the mark inside the central 80% safe zone.
    (out / "apple-touch-icon.svg").write_text(icon_svg(path, bounds, 180, 0.70, 0))
    (out / "icon-maskable.svg").write_text(icon_svg(path, bounds, 512, 0.56, 0))
    print("bounds", [round(b) for b in bounds], "path chars", len(path))


main()
