#!/usr/bin/env python3
"""Seamless ground sheets, blend masks, cliff overlays, and break-up stamps."""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
TILES = ROOT / "public" / "art" / "tiles"
STAMPS = ROOT / "public" / "art" / "sprites"
CELL = 40
SHEET = 640
COLS = 16
N, NE, E, SE, S, SW, W, NW = 1, 2, 4, 8, 16, 32, 64, 128
CARD = (N, E, S, W)
DIAG = {NW: (N, W), NE: (N, E), SE: (S, E), SW: (S, W)}
CORNER_PX = {NW: (0.0, 0.0), NE: (CELL - 1.0, 0.0), SE: (CELL - 1.0, CELL - 1.0), SW: (0.0, CELL - 1.0)}


def crop_bank(path: Path, n: int = 64, src: int = 200, margin: int = 36) -> list[Image.Image]:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    rng = random.Random(path.name + str(src))
    out: list[Image.Image] = []
    box = min(src, w - 2 * margin, h - 2 * margin)
    box = max(48, box)
    for _ in range(n):
        x = rng.randint(margin, w - box - margin)
        y = rng.randint(margin, h - box - margin)
        out.append(im.crop((x, y, x + box, y + box)))
    return out


def pick(bank: list[Image.Image], seed: int, size: int | None = None) -> Image.Image:
    im = bank[seed % len(bank)]
    if size and im.size != (size, size):
        return im.resize((size, size), Image.Resampling.LANCZOS)
    return im.copy()


def mix(a: Image.Image, b: Image.Image, t: float) -> Image.Image:
    t = max(0.0, min(1.0, t))
    return Image.blend(a.convert("RGB"), b.convert("RGB"), t)


def tint(im: Image.Image, color: tuple[int, int, int], amt: float) -> Image.Image:
    wash = Image.new("RGB", im.size, color)
    return Image.blend(im.convert("RGB"), wash, amt)


def darken(im: Image.Image, amt: float) -> Image.Image:
    return ImageEnhance.Brightness(im.convert("RGB")).enhance(max(0.05, 1.0 - amt))


def saturate(im: Image.Image, amt: float) -> Image.Image:
    return ImageEnhance.Color(im.convert("RGB")).enhance(amt)


def contrast(im: Image.Image, amt: float) -> Image.Image:
    return ImageEnhance.Contrast(im.convert("RGB")).enhance(amt)


def wrap_seamless(im: Image.Image, band: int = 96) -> Image.Image:
    rgb = im.convert("RGB")
    w, h = rgb.size
    off = ImageChops.offset(rgb, w // 2, h // 2)
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rectangle((w // 2 - band, 0, w // 2 + band, h), fill=255)
    draw.rectangle((0, h // 2 - band, w, h // 2 + band), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(band * 0.45))
    mixed = Image.composite(off.filter(ImageFilter.GaussianBlur(0.6)), off, mask)
    return ImageChops.offset(mixed, -(w // 2), -(h // 2))


def blob_mask(size: int, rng: random.Random, rx: int, ry: int) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(m)
    cx, cy = rng.randint(size // 5, size - size // 5), rng.randint(size // 5, size - size // 5)
    draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    return m.filter(ImageFilter.GaussianBlur(rng.randint(8, 18)))


def paste_wrap(dst: Image.Image, src: Image.Image, x: int, y: int, alpha: Image.Image | None = None) -> None:
    w, h = dst.size
    sw, sh = src.size
    for ox, oy in ((0, 0), (-w, 0), (w, 0), (0, -h), (0, h), (-w, -h), (w, -h), (-w, h), (w, h)):
        dst.paste(src, (x + ox, y + oy), alpha)


def noise_base(color: tuple[int, int, int], seed: int, vary: int = 22) -> Image.Image:
    rng = random.Random(seed)
    n = 36
    small = Image.new("RGB", (n, n))
    px = small.load()
    for y in range(n):
        for x in range(n):
            px[x, y] = tuple(max(0, min(255, color[i] + rng.randint(-vary, vary))) for i in range(3))
    for x in range(n):
        px[x, n - 1] = px[x, 0]
    for y in range(n):
        px[n - 1, y] = px[0, y]
    px[n - 1, n - 1] = px[0, 0]
    return small.resize((SHEET, SHEET), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(7))


def scatter_detail(canvas: Image.Image, bank: list[Image.Image], seed: int, n: int, lo: int, hi: int) -> Image.Image:
    rng = random.Random(seed)
    for _ in range(n):
        crop = pick(bank, rng.randint(0, 9999))
        span = rng.randint(lo, hi)
        patch = crop.resize((span, span), Image.Resampling.LANCZOS)
        alpha = blob_mask(span, rng, rng.randint(span // 3, span // 2), rng.randint(span // 3, span // 2))
        paste_wrap(canvas, patch, rng.randint(0, SHEET - 1), rng.randint(0, SHEET - 1), alpha)
    return canvas


def low_freq(seed: int, dark: tuple[int, int, int], light: tuple[int, int, int]) -> Image.Image:
    rng = random.Random(seed)
    n = 24
    m = Image.new("L", (n, n), 0)
    p = m.load()
    for y in range(n):
        for x in range(n):
            p[x, y] = rng.randint(0, 255)
    for x in range(n):
        p[x, n - 1] = p[x, 0]
    for y in range(n):
        p[n - 1, y] = p[0, y]
    p[n - 1, n - 1] = p[0, 0]
    m = m.resize((SHEET, SHEET), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(18))
    return Image.composite(Image.new("RGB", (SHEET, SHEET), light), Image.new("RGB", (SHEET, SHEET), dark), m)


def grade(im: Image.Image, color: tuple[int, int, int], sat: float, deep: float, con: float) -> Image.Image:
    out = saturate(contrast(darken(tint(im, color, 0.42), deep), con), sat)
    return out


def draw_ruts(im: Image.Image, seed: int, color: tuple[int, int, int]) -> Image.Image:
    rng = random.Random(seed)
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")
    for i in range(7):
        y = 40 + i * 82 + rng.randint(-18, 18)
        wobble = [y + int(18 * math.sin(x / 70.0 + i)) + rng.randint(-2, 2) for x in range(0, SHEET, 8)]
        pts = [(x, wobble[j]) for j, x in enumerate(range(0, SHEET, 8))]
        draw.line(pts, fill=(*color, 70), width=5)
        draw.line([(x, p[1] + 7) for x, p in zip(range(0, SHEET, 8), pts)], fill=(*color, 48), width=3)
    return Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")


def draw_cobble(im: Image.Image, seed: int, warm: bool) -> Image.Image:
    rng = random.Random(seed)
    out = im.convert("RGBA")
    grout = Image.new("RGBA", im.size, (36, 34, 32, 55) if not warm else (48, 40, 32, 50))
    out = Image.alpha_composite(out, grout)
    draw = ImageDraw.Draw(out, "RGBA")
    row = 0
    y = -6
    while y < SHEET + 12:
        xoff = (row * 9) % 17
        x = -10 + xoff
        while x < SHEET + 12:
            bw = rng.randint(11, 17)
            bh = rng.randint(8, 13)
            jx, jy = rng.randint(-2, 2), rng.randint(-1, 2)
            col = (
                rng.randint(68, 96) if not warm else rng.randint(78, 108),
                rng.randint(70, 94) if not warm else rng.randint(68, 90),
                rng.randint(72, 98) if not warm else rng.randint(58, 78),
                rng.randint(90, 150),
            )
            box = (x + jx, y + jy, x + jx + bw, y + jy + bh)
            draw.rounded_rectangle(box, radius=2, fill=col, outline=(28, 26, 24, 80), width=1)
            if rng.random() < 0.08:
                draw.ellipse((box[0] + 2, box[1] + 2, box[0] + 6, box[1] + 5), fill=(48, 70, 40, 90))
            x += bw + rng.randint(1, 3)
        y += rng.randint(10, 14)
        row += 1
    return out.convert("RGB")


def draw_bricks(im: Image.Image, seed: int) -> Image.Image:
    rng = random.Random(seed)
    out = im.convert("RGBA")
    grout = Image.new("RGBA", im.size, (42, 38, 34, 70))
    out = Image.alpha_composite(out, grout)
    draw = ImageDraw.Draw(out, "RGBA")
    bw, bh = 18, 9
    row = 0
    y = -4
    while y < SHEET + 10:
        x = -12 + ((row % 2) * (bw // 2))
        while x < SHEET + 10:
            col = (rng.randint(82, 108), rng.randint(74, 92), rng.randint(64, 82), rng.randint(110, 170))
            draw.rectangle((x, y, x + bw - 2, y + bh - 2), fill=col, outline=(32, 28, 24, 90))
            x += bw
        y += bh
        row += 1
    moss = Image.new("RGBA", im.size, (0, 0, 0, 0))
    md = ImageDraw.Draw(moss, "RGBA")
    for _ in range(40):
        x, y = rng.randint(0, SHEET - 8), rng.randint(0, SHEET - 6)
        md.ellipse((x, y, x + rng.randint(4, 10), y + rng.randint(3, 7)), fill=(56, 78, 44, rng.randint(30, 70)))
    out = Image.alpha_composite(out, moss.filter(ImageFilter.GaussianBlur(0.6)))
    return out.convert("RGB")


def fit_insets(n: float, e: float, s: float, w: float, span: float = 10.0) -> tuple[float, float, float, float]:
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
                wobble = wave * (math.sin((px + seed) * 0.31) + 0.35 * math.sin((py * 0.19) + seed * 0.15))
            top = ins_n + (wobble if ins_n else 0.0)
            bot = CELL - 1.0 - ins_s - (wobble if ins_s else 0.0)
            left = ins_w + (wobble * 0.4 if ins_w else 0.0)
            right = CELL - 1.0 - ins_e - (wobble * 0.4 if ins_e else 0.0)
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
            if d < -1.2:
                a = 255
            elif d > 1.2:
                a = 0
            else:
                a = int(255 * (1.2 - d) / 2.4)
            pix[i] = a
            i += 1
    return Image.frombytes("L", (CELL, CELL), bytes(pix))


def invert_alpha(alpha: Image.Image) -> Image.Image:
    return ImageChops.invert(alpha)


def cliff_face(stone: list[Image.Image], seed: int, rocky: bool) -> Image.Image:
    rng = random.Random(seed)
    umber = (58, 46, 34) if not rocky else (50, 48, 46)
    base = mix(darken(pick(stone, seed + 21, CELL), 0.28), Image.new("RGB", (CELL, CELL), umber), 0.38)
    overlay = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")
    y = 0
    while y < CELL:
        h = rng.randint(3, 6)
        col = rng.choice([(34, 26, 18, 120), (92, 74, 52, 70), (16, 14, 12, 90), (70, 64, 56, 55)])
        draw.rectangle((0, y, CELL, y + h), fill=col)
        y += h
    return Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB")


def pack_alpha(make_alpha, path: Path) -> None:
    atlas = Image.new("L", (COLS * CELL, COLS * CELL), 0)
    for mask in range(256):
        atlas.paste(make_alpha(mask), ((mask % COLS) * CELL, (mask // COLS) * CELL))
    atlas.save(path, format="PNG", optimize=True)
    print(f"wrote {path.name}")


def pack_rgba(make_tile, path: Path) -> None:
    atlas = Image.new("RGBA", (COLS * CELL, COLS * CELL), (0, 0, 0, 0))
    for mask in range(256):
        tile = make_tile(mask)
        atlas.paste(tile, ((mask % COLS) * CELL, (mask // COLS) * CELL), tile)
    atlas.save(path, format="PNG", optimize=True)
    print(f"wrote {path.name} ({path.stat().st_size // 1024}kb)")


def stamp_crag(stone: list[Image.Image], grass: list[Image.Image], idx: int) -> Image.Image:
    rng = random.Random(40 + idx)
    size = 48
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rock = darken(pick(stone, idx + 3, size), 0.12)
    moss = darken(saturate(pick(grass, idx + 8, size), 0.7), 0.35)
    body = mix(rock, moss, 0.28)
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    pts = []
    for i in range(7):
        ang = i / 7 * math.pi * 2
        r = rng.randint(12, 20)
        pts.append((size / 2 + math.cos(ang) * r, size / 2 + math.sin(ang) * r * 0.78))
    d.polygon(pts, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(1.1))
    cut = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cut.paste(body.convert("RGBA"), (0, 0), mask)
    shade = Image.new("RGBA", (size, size), (20, 16, 12, 70))
    cut = Image.alpha_composite(cut, Image.composite(shade, Image.new("RGBA", (size, size), (0, 0, 0, 0)), ImageChops.offset(mask, 0, 4)))
    return cut


def stamp_tuft(grass: list[Image.Image], idx: int) -> Image.Image:
    rng = random.Random(80 + idx)
    size = 40
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im, "RGBA")
    for _ in range(rng.randint(5, 9)):
        x = rng.randint(10, 28)
        col = (rng.randint(60, 90), rng.randint(88, 120), rng.randint(28, 48), rng.randint(90, 150))
        d.polygon([(x, 28), (x - rng.randint(2, 4), 14), (x + rng.randint(1, 3), 28)], fill=col)
    return im


def main() -> None:
    TILES.mkdir(parents=True, exist_ok=True)
    STAMPS.mkdir(parents=True, exist_ok=True)
    grass = crop_bank(TILES / "tile-grass.png")
    path = crop_bank(TILES / "tile-path.png")
    stone = crop_bank(TILES / "tile-stone.png")
    wall = crop_bank(TILES / "tile-wall.png")
    water = crop_bank(TILES / "tile-water.png", src=260, margin=100)
    wood = crop_bank(TILES / "tile-wood.png")

    sheets: dict[str, Image.Image] = {}
    sheets["grass"] = saturate(darken(noise_base((76, 94, 48), 11, 16), 0.08), 0.58)
    gdraw = ImageDraw.Draw(sheets["grass"])
    gr = random.Random(12)
    for _ in range(420):
        x, y = gr.randint(0, SHEET - 1), gr.randint(0, SHEET - 1)
        col = (gr.randint(58, 92), gr.randint(78, 112), gr.randint(28, 52))
        for ox, oy in ((0, 0), (-SHEET, 0), (SHEET, 0), (0, -SHEET), (0, SHEET)):
            gdraw.ellipse((x + ox, y + oy, x + ox + gr.randint(2, 6), y + oy + gr.randint(2, 5)), fill=col)
    sheets["earth"] = noise_base((128, 106, 76), 21, 14)
    ed = ImageDraw.Draw(sheets["earth"])
    er = random.Random(22)
    for _ in range(180):
        x, y = er.randint(0, SHEET - 1), er.randint(0, SHEET - 1)
        col = (er.randint(108, 140), er.randint(88, 118), er.randint(60, 88))
        for ox, oy in ((0, 0), (-SHEET, 0), (SHEET, 0), (0, -SHEET), (0, SHEET)):
            ed.ellipse((x + ox, y + oy, x + ox + er.randint(3, 8), y + oy + er.randint(2, 6)), fill=col)
    sheets["dirt"] = draw_ruts(noise_base((118, 88, 54), 31, 16), 4, (72, 48, 28))
    sheets["cobble"] = draw_cobble(noise_base((86, 88, 90), 41, 10), 5, False)
    sheets["brick"] = draw_bricks(noise_base((96, 84, 70), 51, 8), 7)
    sheets["court"] = draw_cobble(noise_base((120, 114, 102), 61, 8), 6, True)
    sheets["wood"] = noise_base((86, 58, 32), 71, 12)
    sheets["stone"] = noise_base((110, 108, 102), 81, 10)
    sheets["wall"] = darken(noise_base((48, 40, 32), 91, 10), 0.04)
    sheets["water"] = saturate(noise_base((64, 140, 168), 101, 18), 1.08)
    hill = saturate(darken(noise_base((64, 76, 42), 111, 14), 0.16), 0.52)
    hd = ImageDraw.Draw(hill)
    hr = random.Random(112)
    for _ in range(260):
        x, y = hr.randint(0, SHEET - 1), hr.randint(0, SHEET - 1)
        col = (hr.randint(48, 80), hr.randint(62, 90), hr.randint(28, 48))
        for ox, oy in ((0, 0), (-SHEET, 0), (SHEET, 0), (0, -SHEET), (0, SHEET)):
            hd.ellipse((x + ox, y + oy, x + ox + hr.randint(3, 9), y + oy + hr.randint(2, 7)), fill=col)
    rock_tex = noise_base((86, 78, 62), 121, 12)
    rock_blobs = Image.new("L", (SHEET, SHEET), 0)
    rng = random.Random(9)
    rd = ImageDraw.Draw(rock_blobs)
    for _ in range(22):
        x, y = rng.randint(0, SHEET), rng.randint(0, SHEET)
        rw, rh = rng.randint(36, 88), rng.randint(28, 64)
        fill = rng.randint(90, 170)
        for ox, oy in ((0, 0), (-SHEET, 0), (SHEET, 0), (0, -SHEET), (0, SHEET)):
            rd.ellipse((x + ox, y + oy, x + ox + rw, y + oy + rh), fill=fill)
    rock_blobs = rock_blobs.filter(ImageFilter.GaussianBlur(6))
    sheets["hill"] = Image.composite(rock_tex, hill, rock_blobs)
    sheets["rock"] = noise_base((76, 72, 68), 131, 12)
    sheets["scree"] = mix(sheets["earth"], darken(sheets["rock"], 0.08), 0.55)
    sheets["sand"] = mix(sheets["earth"], tint(sheets["water"], (186, 176, 140), 0.35), 0.28)

    for name, im in sheets.items():
        dest = TILES / f"sheet-{name}.png"
        im.save(dest, format="PNG", optimize=True)
        print(f"wrote {dest.name} ({dest.stat().st_size // 1024}kb)")

    pack_alpha(
        lambda m: plateau_alpha(m, 11, 11, 11, 11, radius=9, bite=10, inset_if_set=True, wave=0.9, seed=m),
        TILES / "mask-blend.png",
    )

    def make_cliff(mask: int, rocky: bool) -> Image.Image:
        if mask == 255:
            return Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        face = cliff_face(stone, mask * 17 + (4 if rocky else 0), rocky)
        plate = plateau_alpha(
            mask, 5, 8, 16, 8, radius=8, bite=9, inset_if_set=False, wave=1.2, seed=mask * 3
        )
        alpha = invert_alpha(plate)
        lip = Image.new("RGB", (CELL, CELL), (88, 96, 58) if not rocky else (92, 86, 76))
        edge = alpha.filter(ImageFilter.FIND_EDGES).point(lambda p: 200 if p > 24 else 0).filter(ImageFilter.GaussianBlur(0.5))
        rgb = Image.composite(mix(face, lip, 0.28), face, edge)
        out = rgb.convert("RGBA")
        out.putalpha(alpha)
        return out

    pack_rgba(lambda m: make_cliff(m, False), TILES / "overlay-cliff.png")
    pack_rgba(lambda m: make_cliff(m, True), TILES / "overlay-crag.png")

    def make_foam(mask: int) -> Image.Image:
        if mask == 255:
            return Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        plate = plateau_alpha(mask, 8, 8, 8, 8, radius=10, bite=10, inset_if_set=False, wave=1.1, seed=mask)
        edge = plate.filter(ImageFilter.FIND_EDGES).point(lambda p: 180 if p > 30 else 0).filter(ImageFilter.GaussianBlur(0.7))
        foam = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        foam.paste(Image.new("RGBA", (CELL, CELL), (214, 224, 218, 160)), (0, 0), edge)
        sand = tint(pick(path, mask, CELL), (186, 172, 132), 0.25).convert("RGBA")
        shore = invert_alpha(plate).point(lambda p: int(p * 0.55))
        base = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        sand.putalpha(shore)
        base = Image.alpha_composite(base, sand)
        return Image.alpha_composite(base, foam)

    pack_rgba(make_foam, TILES / "overlay-foam.png")

    for i in range(8):
        stamp_crag(stone, grass, i).save(STAMPS / f"stamp-crag-{i}.png", optimize=True)
        stamp_tuft(grass, i).save(STAMPS / f"stamp-tuft-{i}.png", optimize=True)
    print("stamps written")


if __name__ == "__main__":
    main()
