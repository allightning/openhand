#!/usr/bin/env python3
"""水墨匾额：白底转透明。墨=亮度反相 alpha；朱砂印章保留红色。"""
from PIL import Image

SRC = "/Users/lightning/openhand/public/art/ui/ink-frame.png"
OUT = "/Users/lightning/openhand/public/art/ui/ink-plaque.png"

img = Image.open(SRC).convert("RGB")
w, h = img.size
px = img.load()
out = Image.new("RGBA", (w, h))
op = out.load()

for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        # 朱砂红印章：红显著高于绿蓝
        if r > 110 and r > g * 1.5 and r > b * 1.4:
            a = max(0, min(255, int((r - max(g, b)) * 2.2)))
            op[x, y] = (r, g, b, a)
            continue
        # 墨：亮度反相为 alpha，色取暖黑
        lum = (r * 299 + g * 587 + b * 114) // 1000
        a = max(0, min(255, int((255 - lum) * 1.15)))
        if a < 10:
            a = 0
        op[x, y] = (38, 30, 24, a)

out.save(OUT)
a_hist = out.getchannel("A").histogram()
total = w * h
print("saved", OUT, out.size, "visible%", round(100 * sum(a_hist[40:]) / total, 1))
