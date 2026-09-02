#!/usr/bin/env python3
"""沈夜行立绘 → 石台站位图（原图直用，一字不改）。

用户 2026-08-31 定：站位直接用立绘原图（含角标印章），不做任何图像处理，
源图 575×1024 尺寸已合适，直接拷贝入库。若未来源图过大再在此加缩放。

用法：python3 scripts/full_hero.py
产物：public/art/char/hero/full.png
"""
import shutil
from pathlib import Path

SRC = Path("/Users/lightning/.cursor/projects/Users-lightning-openhand/assets/image-d4146951-ecc5-4379-8119-d2a398ea3036.png")
DST = Path("/Users/lightning/openhand/public/art/char/hero/full.png")

DST.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(SRC, DST)
print("copied", SRC.name, "->", DST, f"{DST.stat().st_size // 1024}KB")
