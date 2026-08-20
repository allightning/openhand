#!/usr/bin/env python3
"""Build 8-neighbor autotile atlases from the painted ground textures."""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
TILES = ROOT / "public" / "art" / "tiles"
CELL = 40
COLS = 16
N, NE, E, SE, S, SW, W, NW = 1, 2, 4, 8, 16, 32, 64, 128
CARD = (N, E, S, W)
DIAG = {NW: (N, W), NE: (N, E), SE: (S, E), SW: (S, W)}
CORNER_PX = {NW: (0.0, 0.0), NE: (CELL - 1.0, 0.0), SE: (CELL - 1.0, CELL - 1.0), SW: (0.0, CELL - 1.0)}


def crop_bank(path: Path, n: int = 48, src: int = 180, margin: int = 40) -> list[Image.Image]:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    rng = random.Random(path.name)
    out: list[Image.Image] = []
    box = min(src, w - 2 * margin, h - 2 * margin)
    box = max(40, box)
    for _ in range(n):
        x = rng.randint(margin, w - box - margin)
        y = rng.randint(margin, h - box - margin)
        out.append(im.crop((x, y, x + box, y + box)).resize((CELL, CELL), Image.Resampling.LANCZOS))
    return out


def pick(bank: list[Image.Image], seed: int) -> Image.Image:
    return bank[seed % len(bank)].copy()


def mix(a: Image.Image, b: Image.Image, t: float) -> Image.Image:
    t = max(0.0, min(1.0, t))
    return Image.blend(a.convert("RGB"), b.convert("RGB"), t)


def darken(im: Image.Image, amt: float) -> Image.Image:
    return ImageEnhance.Brightness(im.convert("RGB")).enhance(max(0.05, 1.0 - amt))


def saturate(im: Image.Image, amt: float) -> Image.Image:
    return ImageEnhance.Color(im.convert("RGB")).enhance(amt)


def contrast(im: Image.Image, amt: float) -> Image.Image:
    return ImageEnhance.Contrast(im.convert("RGB")).enhance(amt)


def sd_round_box(px: float, py: float, cx: float, cy: float, hw: float, hh: float, rad: float) -> float:
    rad = max(0.0, min(rad, hw, hh))
    dx = abs(px - cx) - (hw - rad)
    dy = abs(py - cy) - (hh - rad)
    ax = max(dx, 0.0)
    ay = max(dy, 0.0)
    return (ax * ax + ay * ay) ** 0.5 + min(max(dx, dy), 0.0) - rad


def fit_insets(n: float, e: float, s: float, w: float, span: float = 12.0) -> tuple[float, float, float, float]:
    if n + s > CELL - span:
        scale = (CELL - span) / max(1.0, n + s)
        n, s = n * scale, s * scale
    if e + w > CELL - span:
        scale = (CELL - span) / max(1.0, e + w)
        e, w = e * scale, w * scale
    return n, e, s, w


def plateau_alpha(
    mask: int,
    n_in: float,
    e_in: float,
    s_in: float,
    w_in: float,
    radius: float,
    bite: float,
    inset_if_set: bool,
    wave: float = 0.0,
    seed: int = 0,
) -> Image.Image:
    def exposed(bit: int) -> bool:
        has = bool(mask & bit)
        return has if inset_if_set else not has

    ins_n = n_in if exposed(N) else 0.0
    ins_e = e_in if exposed(E) else 0.0
    ins_s = s_in if exposed(S) else 0.0
    ins_w = w_in if exposed(W) else 0.0
    ins_n, ins_e, ins_s, ins_w = fit_insets(ins_n, ins_e, ins_s, ins_w)
    pix = bytearray(CELL * CELL)
    i = 0
    for py in range(CELL):
        for px in range(CELL):
            wobble = 0.0
            if wave:
                wobble = wave * (
                    math.sin((px + seed) * 0.38) + 0.45 * math.sin((px * 0.17) + seed * 0.2)
                )
            top = ins_n + (wobble if ins_n else 0.0)
            bot = CELL - 1.0 - ins_s - (wobble if ins_s else 0.0)
            left = ins_w + (wobble * 0.35 if ins_w else 0.0)
            right = CELL - 1.0 - ins_e - (wobble * 0.35 if ins_e else 0.0)
            d = max(left - (px + 0.5), (px + 0.5) - right, top - (py + 0.5), (py + 0.5) - bot)
            rad = min(radius, max(2.0, (right - left) * 0.45, (bot - top) * 0.45))
            if exposed(S) and exposed(E):
                cxr, cyr = right - rad, bot - rad
                if px + 0.5 > cxr and py + 0.5 > cyr:
                    d = max(d, math.hypot(px + 0.5 - cxr, py + 0.5 - cyr) - rad)
            if exposed(S) and exposed(W):
                cxr, cyr = left + rad, bot - rad
                if px + 0.5 < cxr and py + 0.5 > cyr:
                    d = max(d, math.hypot(px + 0.5 - cxr, py + 0.5 - cyr) - rad)
            if exposed(N) and exposed(E):
                cxr, cyr = right - rad, top + rad
                if px + 0.5 > cxr and py + 0.5 < cyr:
                    d = max(d, math.hypot(px + 0.5 - cxr, py + 0.5 - cyr) - rad)
            if exposed(N) and exposed(W):
                cxr, cyr = left + rad, top + rad
                if px + 0.5 < cxr and py + 0.5 < cyr:
                    d = max(d, math.hypot(px + 0.5 - cxr, py + 0.5 - cyr) - rad)
            for bit, (ca, cb) in DIAG.items():
                if exposed(bit) and not exposed(ca) and not exposed(cb):
                    ox, oy = CORNER_PX[bit]
                    dist = ((px + 0.5 - ox) ** 2 + (py + 0.5 - oy) ** 2) ** 0.5
                    d = max(d, bite - dist)
            if d < -1.15:
                a = 255
            elif d > 1.15:
                a = 0
            else:
                a = int(255 * (1.15 - d) / 2.3)
            pix[i] = a
            i += 1
    return Image.frombytes("L", (CELL, CELL), bytes(pix))


def padded_edges(alpha: Image.Image) -> Image.Image:
    src = alpha.load()
    pad = Image.new("L", (CELL + 4, CELL + 4), 0)
    dst = pad.load()
    for y in range(CELL + 4):
        for x in range(CELL + 4):
            sx = min(CELL - 1, max(0, x - 2))
            sy = min(CELL - 1, max(0, y - 2))
            dst[x, y] = src[sx, sy]
    edge = pad.filter(ImageFilter.FIND_EDGES)
    return edge.crop((2, 2, 2 + CELL, 2 + CELL))


def soft_stone(seed: int) -> Image.Image:
    return pick(STONE, seed).filter(ImageFilter.GaussianBlur(0.85))


def composite(plateau: Image.Image, face: Image.Image, alpha: Image.Image) -> Image.Image:
    return Image.composite(plateau.convert("RGB"), face.convert("RGB"), alpha)


def lip(tile: Image.Image, alpha: Image.Image, color: tuple[int, int, int], width: int = 2) -> Image.Image:
    edge = padded_edges(alpha).point(lambda p: 255 if p > 40 else 0)
    if width > 1:
        edge = edge.filter(ImageFilter.MaxFilter(3))
    edge = edge.filter(ImageFilter.GaussianBlur(0.5))
    wash = Image.new("RGB", (CELL, CELL), color)
    return Image.composite(mix(tile, wash, 0.4), tile, edge)


GRASS: list[Image.Image]
PATH: list[Image.Image]
STONE: list[Image.Image]
WALL: list[Image.Image]
WATER: list[Image.Image]
WOOD: list[Image.Image]


def hill_plateau(seed: int) -> Image.Image:
    moss = darken(saturate(pick(GRASS, seed + 8), 0.82), 0.28)
    rock = mix(soft_stone(seed), Image.new("RGB", (CELL, CELL), (92, 78, 58)), 0.28)
    blot = Image.new("L", (CELL, CELL), 0)
    draw = ImageDraw.Draw(blot)
    rng = random.Random(seed + 4)
    for _ in range(4):
        x, y = rng.randint(0, 26), rng.randint(0, 24)
        draw.ellipse((x, y, x + rng.randint(8, 16), y + rng.randint(6, 12)), fill=rng.randint(90, 180))
    blot = blot.filter(ImageFilter.GaussianBlur(1.4))
    out = Image.composite(rock, moss, blot)
    sun = Image.new("RGB", (CELL, CELL), (150, 140, 100))
    light = Image.new("L", (CELL, CELL), 0)
    ImageDraw.Draw(light).ellipse((4, 2, 22, 16), fill=80)
    light = light.filter(ImageFilter.GaussianBlur(3))
    return Image.composite(mix(out, sun, 0.22), out, light)


def rock_plateau(seed: int) -> Image.Image:
    grit = mix(soft_stone(seed), Image.new("RGB", (CELL, CELL), (86, 80, 74)), 0.22)
    moss = darken(pick(GRASS, seed + 2), 0.55)
    blot = Image.new("L", (CELL, CELL), 40)
    draw = ImageDraw.Draw(blot)
    rng = random.Random(seed + 6)
    for _ in range(2):
        x, y = rng.randint(2, 28), rng.randint(2, 26)
        draw.ellipse((x, y, x + rng.randint(6, 12), y + rng.randint(5, 10)), fill=rng.randint(50, 110))
    blot = blot.filter(ImageFilter.GaussianBlur(1.2))
    return Image.composite(moss, contrast(darken(grit, 0.08), 1.15), blot)


def cliff_face(seed: int, rocky: bool) -> Image.Image:
    rng = random.Random(seed)
    umber = (62, 46, 32) if not rocky else (52, 48, 44)
    base = mix(darken(soft_stone(seed + 21), 0.3), Image.new("RGB", (CELL, CELL), umber), 0.42)
    overlay = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")
    y = 0
    while y < CELL:
        h = rng.randint(3, 6)
        col = rng.choice([(36, 28, 20, 110), (96, 74, 50, 70), (18, 16, 14, 90), (70, 62, 54, 55)])
        draw.rectangle((0, y, CELL, y + h), fill=col)
        if rng.random() < 0.5:
            draw.line([(0, y + 1), (CELL, y + 1)], fill=(20, 16, 12, 80), width=1)
        y += h
    return Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB")


def water_body(seed: int) -> Image.Image:
    return contrast(saturate(pick(WATER, seed), 1.15), 1.08)


def shore_sand(seed: int) -> Image.Image:
    sand = mix(pick(PATH, seed), darken(pick(GRASS, seed + 4), 0.25), 0.22)
    wet = mix(sand, pick(WATER, seed + 6), 0.28)
    return wet


def foot_scree(seed: int) -> Image.Image:
    dirt = mix(darken(pick(GRASS, seed), 0.35), pick(PATH, seed + 2), 0.4)
    return mix(dirt, darken(pick(STONE, seed + 9), 0.2), 0.38)


def make_cliff(mask: int, kind: str) -> Image.Image:
    seed = mask * 17 + (13 if kind == "rock" else 0)
    plateau = rock_plateau(seed) if kind == "rock" else hill_plateau(seed)
    face = cliff_face(seed + 40, rocky=kind == "rock")
    alpha = plateau_alpha(
        mask, 6, 12, 20, 12, radius=10, bite=12, inset_if_set=False, wave=1.8, seed=seed
    )
    tile = composite(plateau, face, alpha)
    lip_col = (70, 62, 48) if kind == "rock" else (78, 92, 48)
    tile = lip(tile, alpha, lip_col, 2)
    if not (mask & S):
        shade = Image.new("RGB", (CELL, CELL), (18, 14, 10))
        bot = Image.new("L", (CELL, CELL), 0)
        ImageDraw.Draw(bot).rectangle((0, CELL - 5, CELL, CELL), fill=120)
        bot = bot.filter(ImageFilter.GaussianBlur(1.2))
        tile = Image.composite(mix(tile, shade, 0.55), tile, bot)
    return tile


def make_core(kind: str, idx: int) -> Image.Image:
    seed = 800 + idx * 19
    plateau = rock_plateau(seed) if kind == "rock" else hill_plateau(seed)
    stone = mix(soft_stone(seed + 4), Image.new("RGB", (CELL, CELL), (110, 96, 72)), 0.2)
    blot = Image.new("L", (CELL, CELL), 0)
    draw = ImageDraw.Draw(blot)
    rng = random.Random(idx + 3)
    for _ in range(3 + idx % 3):
        x = rng.randint(2, 24)
        y = rng.randint(2, 20)
        draw.ellipse((x, y, x + rng.randint(10, 18), y + rng.randint(8, 14)), fill=rng.randint(110, 190))
    if idx % 2 == 0:
        draw.polygon([(4, 30), (20, 6), (36, 32)], fill=150)
    blot = blot.filter(ImageFilter.GaussianBlur(1.1))
    ridge = mix(plateau, darken(stone, 0.05), 0.6)
    tile = Image.composite(ridge, plateau, blot)
    shade = Image.new("RGB", (CELL, CELL), (24, 20, 16))
    grad = Image.new("L", (CELL, CELL), 0)
    gdraw = ImageDraw.Draw(grad)
    gdraw.rectangle((0, 28, CELL, CELL), fill=70)
    grad = grad.filter(ImageFilter.GaussianBlur(2))
    return Image.composite(mix(tile, shade, 0.45), tile, grad)


def make_water(mask: int) -> Image.Image:
    seed = mask * 11 + 3
    body = water_body(seed)
    if mask == 255:
        return body
    sand = shore_sand(seed)
    alpha = plateau_alpha(mask, 9, 9, 9, 9, radius=11, bite=11, inset_if_set=False, wave=1.2, seed=seed)
    tile = composite(body, sand, alpha)
    foam = Image.new("RGB", (CELL, CELL), (210, 220, 214))
    edge = padded_edges(alpha).point(lambda p: 200 if p > 36 else 0)
    edge = edge.filter(ImageFilter.GaussianBlur(0.6))
    return Image.composite(mix(tile, foam, 0.4), tile, edge)


def make_beach(mask: int, kind: str) -> Image.Image:
    seed = mask * 13 + (5 if kind == "path" else 0)
    land = pick(PATH, seed) if kind == "path" else pick(GRASS, seed)
    sand = shore_sand(seed + 8)
    alpha = plateau_alpha(mask, 8, 8, 8, 8, radius=10, bite=10, inset_if_set=True, wave=1.1, seed=seed)
    tile = composite(land, sand, alpha)
    foam = Image.new("RGB", (CELL, CELL), (198, 210, 204))
    edge = padded_edges(alpha).point(lambda p: 180 if p > 36 else 0)
    edge = edge.filter(ImageFilter.GaussianBlur(0.5))
    return Image.composite(mix(tile, foam, 0.32), tile, edge)


def make_foot(mask: int, kind: str) -> Image.Image:
    seed = mask * 15 + (7 if kind == "path" else 0)
    land = pick(PATH, seed) if kind == "path" else pick(GRASS, seed)
    scree = foot_scree(seed)
    alpha = plateau_alpha(mask, 6, 6, 7, 6, radius=8, bite=8, inset_if_set=True, wave=0.8, seed=seed)
    tile = composite(land, scree, alpha)
    shadow = Image.new("RGB", (CELL, CELL), (28, 24, 18))
    edge = padded_edges(alpha).point(lambda p: 140 if p > 36 else 0)
    edge = edge.filter(ImageFilter.GaussianBlur(0.7))
    return Image.composite(mix(tile, shadow, 0.5), tile, edge)


def make_wall(mask: int) -> Image.Image:
    seed = mask * 9 + 2
    body = mix(pick(WALL, seed), darken(pick(WOOD, seed + 3), 0.08), 0.18)
    edge = darken(body, 0.28)
    alpha = plateau_alpha(mask, 3.5, 3.5, 3.5, 3.5, radius=4.5, bite=5, inset_if_set=False)
    tile = composite(body, edge, alpha)
    mortar = Image.new("RGB", (CELL, CELL), (22, 18, 14))
    rim = padded_edges(alpha).point(lambda p: 160 if p > 30 else 0)
    return Image.composite(mix(tile, mortar, 0.45), tile, rim)


def pack(make_tile, path: Path) -> None:
    atlas = Image.new("RGB", (COLS * CELL, COLS * CELL))
    for mask in range(256):
        tile = make_tile(mask)
        atlas.paste(tile, ((mask % COLS) * CELL, (mask // COLS) * CELL))
    atlas.save(path, format="PNG", optimize=True)
    print(f"wrote {path.name} ({path.stat().st_size // 1024}kb)")


def main() -> None:
    global GRASS, PATH, STONE, WALL, WATER, WOOD
    GRASS = crop_bank(TILES / "tile-grass.png")
    PATH = crop_bank(TILES / "tile-path.png")
    STONE = crop_bank(TILES / "tile-stone.png")
    WALL = crop_bank(TILES / "tile-wall.png")
    WATER = crop_bank(TILES / "tile-water.png", src=240, margin=120)
    WOOD = crop_bank(TILES / "tile-wood.png")

    pack(lambda m: make_cliff(m, "hill"), TILES / "atlas-cliff.png")
    pack(lambda m: make_cliff(m, "rock"), TILES / "atlas-rock.png")
    pack(make_water, TILES / "atlas-water.png")
    pack(lambda m: make_beach(m, "grass"), TILES / "atlas-beach-grass.png")
    pack(lambda m: make_beach(m, "path"), TILES / "atlas-beach-path.png")
    pack(lambda m: make_foot(m, "grass"), TILES / "atlas-foot-grass.png")
    pack(lambda m: make_foot(m, "path"), TILES / "atlas-foot-path.png")
    pack(make_wall, TILES / "atlas-wall.png")
    for i in range(8):
        make_core("hill", i).save(TILES / f"hill-core-{i}.png", optimize=True)
        make_core("rock", i).save(TILES / f"rock-core-{i}.png", optimize=True)
    print("cores written")


if __name__ == "__main__":
    main()
