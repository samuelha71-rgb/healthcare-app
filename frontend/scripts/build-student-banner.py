#!/usr/bin/env python3
"""가로 전체 채움 + 햄스터 전체 노출: 블러 배경 + 중앙 선명 합성."""
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SRC = PUBLIC / "student-banner-source.jpg"
OUT = PUBLIC / "student-banner.jpg"

BANNER_W = 2400
BANNER_H = 480
FG_HEIGHT_RATIO = 0.92


def cover_crop(img: Image.Image, tw: int, th: int) -> Image.Image:
    scale = max(tw / img.width, th / img.height)
    w, h = int(img.width * scale), int(img.height * scale)
    resized = img.resize((w, h), Image.Resampling.LANCZOS)
    left = (w - tw) // 2
    top = int((h - th) * 0.35)  # 햄스터·역기 쪽을 조금 더 보이게
    top = max(0, min(top, h - th))
    return resized.crop((left, top, left + tw, top + th))


def main() -> None:
    src = Image.open(SRC).convert("RGB")

    bg = cover_crop(src, BANNER_W, BANNER_H).filter(ImageFilter.GaussianBlur(14))
    # 배경을 살짝 어둡게
    bg = Image.blend(bg, Image.new("RGB", bg.size, (20, 20, 24)), alpha=0.35)

    fg_h = int(BANNER_H * FG_HEIGHT_RATIO)
    fg_scale = fg_h / src.height
    fg_w = int(src.width * fg_scale)
    fg = src.resize((fg_w, fg_h), Image.Resampling.LANCZOS)

    canvas = bg.copy()
    canvas.paste(fg, ((BANNER_W - fg_w) // 2, (BANNER_H - fg_h) // 2))
    canvas.save(OUT, format="JPEG", quality=90, optimize=True)
    print(f"Wrote {OUT} ({BANNER_W}x{BANNER_H}), fg {fg_w}x{fg_h}")


if __name__ == "__main__":
    main()
