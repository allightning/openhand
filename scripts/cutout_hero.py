#!/usr/bin/env python3
"""沈夜行立绘抠图：去宣纸底 + 去角落印章/logo，输出透明 PNG 到 public/art/char/hero/。"""
from collections import deque
from PIL import Image

SRC = "/Users/lightning/.cursor/projects/Users-lightning-openhand/assets/image-3fd7ded7-932c-456f-912d-bd4ce720c335.png"
OUT = "/Users/lightning/openhand/public/art/char/hero/idle.png"

img = Image.open(SRC).convert("RGBA")
w, h = img.size
print("src size", w, h)
px = img.load()

# 1) 角落印章 / logo 区域先涂成纸白（之后泛洪一起去掉）
def blank(x0, y0, x1, y1):
    for y in range(max(0, y0), min(h, y1)):
        for x in range(max(0, x0), min(w, x1)):
            px[x, y] = (245, 240, 228, 255)

blank(int(w * 0.75), 0, w, int(h * 0.16))          # 右上朱砂印章
blank(0, 0, int(w * 0.14), int(h * 0.09))          # 左上 logo

# 2) 从四边泛洪：纸白/淡墨雾（高明度低饱和）→ 透明
def paperish(p):
    r, g, b, a = p
    if a == 0:
        return False
    lo, hi = min(r, g, b), max(r, g, b)
    return lo >= 200 and (hi - lo) <= 28  # 亮且灰 => 纸/雾

seen = bytearray(w * h)
q = deque()
for x in range(w):
    for y in (0, h - 1):
        if paperish(px[x, y]):
            q.append((x, y))
for y in range(h):
    for x in (0, w - 1):
        if paperish(px[x, y]):
            q.append((x, y))
while q:
    x, y = q.popleft()
    i = y * w + x
    if seen[i]:
        continue
    seen[i] = 1
    p = px[x, y]
    if not paperish(p):
        continue
    px[x, y] = (p[0], p[1], p[2], 0)
    if x > 0:
        q.append((x - 1, y))
    if x < w - 1:
        q.append((x + 1, y))
    if y > 0:
        q.append((x, y - 1))
    if y < h - 1:
        q.append((x, y + 1))

# 3) 边缘羽化：与透明相邻的半透明残留点压低 alpha，减少白边
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        lo = min(r, g, b)
        if lo >= 200:
            near_hole = False
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                    near_hole = True
                    break
            if near_hole:
                px[x, y] = (r, g, b, 90)

# 4) 裁到内容 bbox + 缩放到石台用尺寸（高 520，等比）
bbox = img.getbbox()
print("bbox", bbox)
img = img.crop(bbox)
ratio = 520 / img.height
img = img.resize((round(img.width * ratio), 520), Image.LANCZOS)
img.save(OUT)
print("saved", OUT, img.size)
