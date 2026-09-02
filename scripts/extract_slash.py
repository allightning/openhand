#!/usr/bin/env python3
"""从特效样式图提取白色刀光：高明度低饱和像素保留，其余压黑，输出 screen 混合用 PNG。"""
from PIL import Image, ImageFilter

SRC = "/Users/lightning/.cursor/projects/Users-lightning-openhand/assets/image-d05d8c2b-cbf3-4238-9bc1-a9506c67d9b7.png"
img = Image.open(SRC).convert("RGB")
w, h = img.size

CROPS = {
    "slash_arc": (0.0, 0.05, 0.75, 0.42),   # 上弧刀光
    "slash_line": (0.10, 0.30, 1.0, 0.62),  # 中段横斩
}

for name, (x0, y0, x1, y1) in CROPS.items():
    crop = img.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1)))
    px = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b = px[x, y]
            lo = min(r, g, b)
            if lo >= 175:  # 白 streak 保留
                continue
            px[x, y] = (0, 0, 0)
    crop = crop.filter(ImageFilter.GaussianBlur(0.6))
    # 2x 放大，游戏里显示更柔
    crop = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
    out = f"/Users/lightning/openhand/public/art/vfx/{name}.png"
    crop.save(out)
    print("saved", out, crop.size)
