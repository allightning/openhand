#!/usr/bin/env python3
"""从特效样式图裁候选刀光弧，黑底保留（screen 混合用）。"""
from PIL import Image

SRC = "/Users/lightning/.cursor/projects/Users-lightning-openhand/assets/image-d05d8c2b-cbf3-4238-9bc1-a9506c67d9b7.png"
img = Image.open(SRC).convert("RGB")
w, h = img.size
print("src size", w, h)

# 候选区域（按比例）：上弧 / 中弧 / 下弧
cands = {
    "slash_top": (0.0, 0.05, 0.75, 0.42),
    "slash_mid": (0.10, 0.30, 1.0, 0.62),
    "slash_bot": (0.05, 0.62, 0.95, 0.98),
}
for name, (x0, y0, x1, y1) in cands.items():
    box = (int(w * x0), int(h * y0), int(w * x1), int(h * y1))
    img.crop(box).save(f"/tmp/{name}.png")
    print(name, box)
