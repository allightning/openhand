#!/usr/bin/env python3
"""Knock out cream/white/green screen backgrounds → transparent PNG."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

GREEN = (0, 255, 0)
CREAM = (240, 230, 208)


def near(c: tuple[int, int, int, int], target: tuple[int, int, int], tol: int) -> bool:
    return abs(c[0] - target[0]) <= tol and abs(c[1] - target[1]) <= tol and abs(c[2] - target[2]) <= tol


def knock(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    px = im.load()
    w, h = im.size
    # Sample corners to decide chroma vs cream
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    greenish = sum(1 for c in corners if c[1] > 180 and c[1] > c[0] + 40 and c[1] > c[2] + 40) >= 2
    visited = [[False] * w for _ in range(h)]
    stack: list[tuple[int, int]] = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    # also edge midpoints
    stack += [(w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]

    def is_bg(c: tuple[int, int, int, int]) -> bool:
        if c[3] < 8:
            return True
        if greenish:
            # chroma green / lime
            return c[1] >= 140 and c[1] >= c[0] + 25 and c[1] >= c[2] + 25
        # cream / white / parchment (AI bag icons often ~246,227,186)
        return (
            c[0] >= 200
            and c[1] >= 190
            and c[2] >= 160
            and c[0] + c[1] + c[2] >= 580
            and abs(c[0] - c[1]) < 45
            and (c[1] - c[2]) < 55
        ) or (c[0] >= 245 and c[1] >= 245 and c[2] >= 245)

    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        c = px[x, y]
        if not is_bg(c):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

    # second pass: soften fringe near transparent
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if c[3] == 0:
                continue
            if greenish and near(c, GREEN, 70):
                px[x, y] = (0, 0, 0, 0)
                continue
            if not greenish and is_bg(c):
                # leftover islands of bg inside? only if mostly surrounded by empty
                neigh = 0
                empty = 0
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        neigh += 1
                        if px[nx, ny][3] == 0:
                            empty += 1
                if neigh and empty >= 3 and is_bg(c):
                    px[x, y] = (0, 0, 0, 0)

    im.save(path)
    print(f"ok {path}")


def main() -> None:
    paths = [Path(p) for p in sys.argv[1:]]
    if not paths:
        root = Path(__file__).resolve().parents[1]
        paths = list((root / "public/art/bag").glob("*.png"))
        paths += list((root / "public/art/objs").glob("obj-*.png"))
    for p in paths:
        knock(p)


if __name__ == "__main__":
    main()
