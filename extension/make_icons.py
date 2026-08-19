"""One-off script to generate toolbar icon PNGs. Not shipped with the extension.

Signal Card identity: solid ink-teal tile, white QR-glyph on top (finder
eyes at 3 corners + a timing-pattern cross + a data cluster) so the mark
reads as an actual QR code, not a single ring/target.
"""
from PIL import Image, ImageDraw
import os

TILE = (20, 66, 75, 255)     # #14424B ink-teal
MARK = (243, 246, 245, 255)  # #F3F6F5 paper-white
SCALE = 16                   # supersample factor for crisp downscale
SIZES = [16, 32, 48, 128]

OUT_DIR = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(OUT_DIR, exist_ok=True)

# 5x5 conceptual module grid. F = finder block (handled separately),
# True/False = a lit/unlit data or timing-pattern module.
GRID = [
    [None, None, True,  None, None],
    [None, None, False, None, None],
    [True, False, True, False, True],
    [None, None, False, True,  False],
    [None, None, True,  False, True],
]
FINDER_BLOCKS = [(0, 0), (0, 3), (3, 0)]  # (row, col) top-left of each 2x2 block


def draw_finder(d, x0, y0, cell):
    size = cell * 2
    outer_pad = size * 0.08
    ring_w = size * 0.16
    d.rounded_rectangle(
        [x0 + outer_pad, y0 + outer_pad, x0 + size - outer_pad, y0 + size - outer_pad],
        radius=size * 0.12, outline=MARK, width=int(ring_w),
    )
    dot_pad = size * 0.36
    d.rounded_rectangle(
        [x0 + dot_pad, y0 + dot_pad, x0 + size - dot_pad, y0 + size - dot_pad],
        radius=size * 0.06, fill=MARK,
    )


def draw_module(d, x0, y0, cell):
    pad = cell * 0.13
    d.rounded_rectangle(
        [x0 + pad, y0 + pad, x0 + cell - pad, y0 + cell - pad],
        radius=cell * 0.16, fill=MARK,
    )


def draw_mark(size):
    # Below ~24px the timing/data cluster just blurs into noise, so the
    # smallest sizes drop it and show only the 3 finder eyes.
    show_detail = size > 24

    S = size * SCALE
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = S * 0.24
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=radius, fill=TILE)

    inset = S * 0.155
    grid_size = S - inset * 2
    cell = grid_size / 5

    finder_cells = set()
    for (fr, fc) in FINDER_BLOCKS:
        for r in range(fr, fr + 2):
            for c in range(fc, fc + 2):
                finder_cells.add((r, c))

    for (fr, fc) in FINDER_BLOCKS:
        draw_finder(d, inset + fc * cell, inset + fr * cell, cell)

    if show_detail:
        for r in range(5):
            for c in range(5):
                if (r, c) in finder_cells:
                    continue
                if GRID[r][c]:
                    draw_module(d, inset + c * cell, inset + r * cell, cell)
    else:
        # single anchor module bottom-right, enough to read as "grid" not "target"
        draw_module(d, inset + 3 * cell, inset + 3 * cell, cell)

    return img.resize((size, size), Image.LANCZOS)


for size in SIZES:
    icon = draw_mark(size)
    icon.save(os.path.join(OUT_DIR, f"icon{size}.png"))

print("done")
