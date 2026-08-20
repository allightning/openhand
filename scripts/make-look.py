#!/usr/bin/env python3
"""Thin banks, shores, cobble overlays, courtyard walls, and hero cutouts."""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
TILES = ROOT / "public" / "art" / "tiles"
SPRITES = ROOT / "public" / "art" / "sprites"
CELL = 40
COLS = 16
N, E, S, W = 1, 4, 16, 64
CARD = (N, E, S, W)


def pack_rgba(make_tile, path: Path) -> None:
    atlas = Image.new("RGBA", (COLS * CELL, COLS * CELL), (0, 0, 0, 0))
    for mask in range(256):
        tile = make_tile(mask)
        atlas.paste(tile, ((mask % COLS) * CELL, (mask // COLS) * CELL), tile)
    atlas.save(path, format="PNG", optimize=True)
    print(f"wrote {path.name} ({path.stat().st_size // 1024}kb)")


def edge_dist(px: float, py: float, mask: int, toward_set: bool) -> float:
    d = 99.0
    for bit, (ox, oy, axis) in (
        (N, (px, py, "y")),
        (S, (px, CELL - 1 - py, "y")),
        (W, (py, px, "x")),
        (E, (py, CELL - 1 - px, "x")),
    ):
        has = bool(mask & bit)
        if toward_set and not has:
            continue
        if (not toward_set) and has:
            continue
        if bit in (N, S):
            d = min(d, py if bit == N else CELL - 1 - py)
        else:
            d = min(d, px if bit == W else CELL - 1 - px)
    return d


def dirt_color(rng: random.Random, wet: bool = False) -> tuple[int, int, int]:
    if wet:
        return (rng.randint(92, 118), rng.randint(78, 96), rng.randint(48, 64))
    return (rng.randint(118, 148), rng.randint(86, 110), rng.randint(52, 72))


def make_lip(mask: int, toward_set: bool, wet: bool = False) -> Image.Image:
    im = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    bits = mask & (N | E | S | W)
    if toward_set and bits == 0:
        return im
    if (not toward_set) and bits == (N | E | S | W):
        return im
    rng = random.Random(mask * 19 + (3 if toward_set else 0) + (7 if wet else 0))
    pix = im.load()
    for py in range(CELL):
        for px in range(CELL):
            wave = 1.1 * math.sin((px + 9) * 0.41) + 0.6 * math.sin((py + 5) * 0.33)
            width = (4.2 if wet else 4.8) + wave
            d = edge_dist(px + 0.5, py + 0.5, bits, toward_set)
            if d > width:
                continue
            t = max(0.0, min(1.0, d / max(1.0, width)))
            col = dirt_color(rng, wet)
            if t < 0.35:
                col = (max(48, col[0] - 24), max(36, col[1] - 20), max(28, col[2] - 14))
            a = int((200 if wet else 210) * (1.0 - t) ** 0.85)
            if a < 12:
                continue
            pix[px, py] = (*col, a)
    return im


def stone_blob(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, col: tuple[int, int, int], rng: random.Random) -> None:
    pts = []
    for i in range(6):
        ang = i / 6 * math.pi * 2 + rng.random() * 0.4
        rx = w * 0.5 * (0.75 + rng.random() * 0.3)
        ry = h * 0.5 * (0.7 + rng.random() * 0.35)
        pts.append((x + w * 0.5 + math.cos(ang) * rx, y + h * 0.5 + math.sin(ang) * ry))
    rim = (max(0, col[0] - 38), max(0, col[1] - 36), max(0, col[2] - 34), 210)
    draw.polygon(pts, fill=(*col, 230), outline=rim)


def road_cover(mask: int) -> list[list[bool]]:
    bits = mask & (N | E | S | W)
    cover = [[False] * CELL for _ in range(CELL)]
    for py in range(CELL):
        for px in range(CELL):
            wave = 1.4 * math.sin((px + 3) * 0.33) + 0.8 * math.sin(py * 0.27)
            pad = 4.2 + wave
            d = edge_dist(px + 0.5, py + 0.5, bits, False)
            if bits == (N | E | S | W):
                cover[py][px] = True
            elif d > pad:
                cover[py][px] = True
            elif d > 1.2 and random.Random(px * 13 + py * 7 + mask).random() < 0.35:
                cover[py][px] = True
    return cover


def make_cobble(mask: int, brick: bool) -> Image.Image:
    im = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    cover = road_cover(mask)
    rng = random.Random(mask * 31 + (9 if brick else 1))
    draw = ImageDraw.Draw(im, "RGBA")
    stones = 18 if brick else 16
    greys = [
        (176, 174, 168),
        (158, 156, 150),
        (190, 188, 182),
        (142, 140, 134),
        (166, 162, 154),
        (152, 148, 140),
        (184, 180, 172),
    ]
    bricks = [
        (168, 148, 128),
        (154, 136, 118),
        (176, 156, 134),
        (148, 132, 114),
        (160, 142, 122),
    ]
    palette = bricks if brick else greys
    for _ in range(stones):
        w = rng.randint(8, 13) if brick else rng.randint(9, 16)
        h = rng.randint(5, 7) if brick else rng.randint(7, 12)
        x = rng.randint(-2, CELL - w + 2)
        y = rng.randint(-2, CELL - h + 2)
        cx, cy = x + w // 2, y + h // 2
        if not (0 <= cy < CELL and 0 <= cx < CELL and cover[cy][cx]):
            continue
        col = palette[rng.randint(0, len(palette) - 1)]
        if brick:
            box = (x, y, x + w, y + h)
            draw.rounded_rectangle(box, radius=1, fill=(*col, 220), outline=(52, 46, 40, 180))
        else:
            stone_blob(draw, x, y, w, h, col, rng)
    # punch stones that drifted off the road
    pix = im.load()
    for py in range(CELL):
        for px in range(CELL):
            if not cover[py][px] and pix[px, py][3] > 0:
                pix[px, py] = (0, 0, 0, 0)
    return im


def sample_patch(src: Image.Image, seed: int) -> Image.Image:
    rng = random.Random(seed)
    w, h = src.size
    span = CELL
    x = rng.randint(0, max(0, w - span - 1))
    y = rng.randint(0, max(0, h - span - 1))
    return src.crop((x, y, x + span, y + span)).convert("RGBA")


def wall_alpha(mask: int, thick: float, post: bool) -> Image.Image:
    bits = mask & (N | E | S | W)
    a = Image.new("L", (CELL, CELL), 0)
    draw = ImageDraw.Draw(a)
    cx = cy = CELL * 0.5
    hw = thick * 0.5
    if bits & N:
        draw.rectangle((cx - hw, 0, cx + hw, cy + hw), fill=255)
    if bits & S:
        draw.rectangle((cx - hw, cy - hw, cx + hw, CELL), fill=255)
    if bits & W:
        draw.rectangle((0, cy - hw, cx + hw, cy + hw), fill=255)
    if bits & E:
        draw.rectangle((cx - hw, cy - hw, CELL, cy + hw), fill=255)
    if not bits:
        post = True
    if post:
        r = thick * 0.82
        draw.rounded_rectangle((cx - r, cy - r, cx + r, cy + r), radius=2, fill=255)
    return a


def shade_wall(rgb: Image.Image, alpha: Image.Image) -> Image.Image:
    out = rgb.convert("RGBA")
    pix = out.load()
    m = alpha.load()
    for y in range(CELL):
        for x in range(CELL):
            if m[x, y] < 20:
                continue
            r, g, b, a = pix[x, y]
            north = y == 0 or m[x, y - 1] < 20
            south = y == CELL - 1 or m[x, y + 1] < 20
            west = x == 0 or m[x - 1, y] < 20
            east = x == CELL - 1 or m[x + 1, y] < 20
            if north and not south:
                pix[x, y] = (min(255, r + 32), min(255, g + 30), min(255, b + 26), a)
            elif south or west or east:
                pix[x, y] = (max(0, r - 38), max(0, g - 36), max(0, b - 32), a)
    return out


def make_fence(mask: int, src: Image.Image, wood: bool) -> Image.Image:
    bits = mask & (N | E | S | W)
    n, e, s, w = bool(bits & N), bool(bits & E), bool(bits & S), bool(bits & W)
    straight = (n and s and not e and not w) or (e and w and not n and not s)
    post = not straight
    thick = 8.0 if wood else 7.2
    alpha = wall_alpha(mask, thick, post)
    patch = sample_patch(src, mask * 17 + (4 if wood else 0))
    if not wood:
        wash = Image.new("RGB", (CELL, CELL), (158, 156, 150))
        patch = Image.blend(patch.convert("RGB"), wash, 0.22).convert("RGBA")
    out = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    out.paste(patch, (0, 0), alpha)
    return shade_wall(out, alpha)


def paint_seer(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGBA")
    pix = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a < 20:
                continue
            if r > 90 and r >= g and (r - b) > 28 and g > 40:
                pix[x, y] = (
                    min(255, int(r * 0.42 + 118)),
                    min(255, int(g * 0.42 + 122)),
                    min(255, int(b * 0.42 + 128)),
                    a,
                )
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, format="PNG", optimize=True)
    print(f"wrote {dest.name} {im.size}")


def paint_sapper(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGBA")
    pix = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a < 20:
                continue
            if r > 130 and g > 110 and abs(r - g) < 40:
                pix[x, y] = (
                    min(255, int(r * 0.72 + 18)),
                    min(255, int(g * 0.78 + 8)),
                    min(255, int(b * 0.55)),
                    a,
                )
    draw = ImageDraw.Draw(im, "RGBA")
    pole = (112, 82, 48, 255)
    rim = (72, 52, 28, 255)
    for i in range(-3, 4):
        draw.line([(22 + i, 28), (58 + i, 348)], fill=pole if abs(i) < 3 else rim, width=1)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, format="PNG", optimize=True)
    print(f"wrote {dest.name} {im.size}")


def main() -> None:
    TILES.mkdir(parents=True, exist_ok=True)
    cobble = Image.open(TILES / "tile-path.png")
    wood = Image.open(TILES / "tile-wood.png")
    pack_rgba(lambda m: make_lip(m, False, False), TILES / "overlay-bank.png")
    pack_rgba(lambda m: make_lip(m, False, False), TILES / "overlay-crag.png")
    pack_rgba(lambda m: make_lip(m, True, False), TILES / "overlay-foot.png")
    pack_rgba(lambda m: make_lip(m, True, True), TILES / "overlay-shore.png")
    pack_rgba(lambda m: make_cobble(m, False), TILES / "overlay-cobble.png")
    pack_rgba(lambda m: make_cobble(m, True), TILES / "overlay-brick.png")
    pack_rgba(lambda m: make_fence(m, cobble, False), TILES / "overlay-fence.png")
    pack_rgba(lambda m: make_fence(m, wood, True), TILES / "overlay-partition.png")
    paint_seer(SPRITES / "sprite-clerk.png", SPRITES / "sprite-seer.png")
    paint_sapper(SPRITES / "sprite-worker.png", SPRITES / "sprite-sapper.png")


if __name__ == "__main__":
    main()
