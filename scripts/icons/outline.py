"""Outline the brand type and write the icon and share-image SVG sources.

The glyphs become paths, so the icons look the same wherever they render, whatever fonts the
client has. Run through scripts/icons/build.sh, not directly.

Usage: python outline.py <display.woff2> <body.woff2> <out_dir>
"""

import sys
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

BG = "#0a0a0a"
FG = "#e5e5e5"
MUTED = "#888"
TRACKING = -0.04  # em, matches .logo letter-spacing
WATERMARK = 0.06  # --watermark, dark theme
OG_WIDTH, OG_HEIGHT = 1200, 630


def outline(font_path, text="1mb", tracking=TRACKING):
    font = TTFont(font_path)
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    hmtx = font["hmtx"]

    pen = SVGPathPen(glyph_set)
    bounds = BoundsPen(glyph_set)
    x = 0
    for ch in text:
        name = cmap[ord(ch)]
        # Flip y (font units are y-up) and advance along x.
        for target in (pen, bounds):
            glyph_set[name].draw(TransformPen(target, (1, 0, 0, -1, x, 0)))
        x += hmtx[name][0] + tracking * upm
    return pen.getCommands(), bounds.bounds, upm  # bounds: xMin, yMin, xMax, yMax (y flipped)


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


def og_line(font_path, text, size, baseline, fill, tracking=0.0, opacity=None):
    path, (x_min, _, x_max, _), upm = outline(font_path, text, tracking)
    scale = size / upm
    tx = (OG_WIDTH - (x_max - x_min) * scale) / 2 - x_min * scale
    faded = f' opacity="{opacity}"' if opacity else ""
    return (
        f'<path fill="{fill}"{faded} '
        f'transform="translate({tx:.3f} {baseline}) scale({scale:.5f})" d="{path}"/>'
    )


def og_svg(display, body):
    lines = [
        og_line(display, "1", 500, 480, FG, opacity=WATERMARK),
        og_line(display, "1mb", 120, 240, FG, tracking=TRACKING),
        og_line(body, "one-man-band", 24, 300, MUTED, tracking=0.25),
        og_line(body, "· · ·", 20, 370, MUTED, tracking=0.8),
        og_line(display, "All the hats. One head.", 28, 430, FG, tracking=-0.02),  # .manifesto
    ]
    rect = f'<rect width="{OG_WIDTH}" height="{OG_HEIGHT}" fill="{BG}"/>'
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {OG_WIDTH} {OG_HEIGHT}">'
        f"<title>1mb, one-man-band</title>{rect}{''.join(lines)}</svg>\n"
    )


def main():
    display, body, out = sys.argv[1], sys.argv[2], Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    path, bounds, _ = outline(display)
    # favicon / "any" icons: rounded tile, mark fills most of the width.
    (out / "favicon.svg").write_text(icon_svg(path, bounds, 32, 0.78, 6))
    # Full-bleed tiles: iOS and maskable platforms round the corners themselves.
    # Maskable keeps the mark inside the central 80% safe zone.
    (out / "apple-touch-icon.svg").write_text(icon_svg(path, bounds, 180, 0.70, 0))
    (out / "icon-maskable.svg").write_text(icon_svg(path, bounds, 512, 0.56, 0))
    (out / "og-image.svg").write_text(og_svg(display, body))
    print("bounds", [round(b) for b in bounds], "path chars", len(path))


main()
