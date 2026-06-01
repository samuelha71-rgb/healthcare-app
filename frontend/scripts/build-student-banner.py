#!/usr/bin/env python3
"""원본 사진으로 5:1 배너를 꽉 채움(cover 크롭). top_bias: 0=위, 1=아래."""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SRC = PUBLIC / "student-banner-source.jpg"
OUT = PUBLIC / "student-banner.jpg"

BANNER_W = 2400
BANNER_H = 480


def cover_crop(img: Image.Image, tw: int, th: int, top_bias: float) -> Image.Image:
    scale = max(tw / img.width, th / img.height)
    w, h = int(img.width * scale), int(img.height * scale)
    resized = img.resize((w, h), Image.Resampling.LANCZOS)
    left = max(0, (w - tw) // 2)
    top = int((h - th) * top_bias)
    top = max(0, min(top, h - th))
    return resized.crop((left, top, left + tw, top + th))


def main() -> None:
    top_bias = float(sys.argv[1]) if len(sys.argv) > 1 else 0.9
    src = Image.open(SRC).convert("RGB")
    banner = cover_crop(src, BANNER_W, BANNER_H, top_bias)
    banner.save(OUT, format="JPEG", quality=90, optimize=True)
    print(f"Wrote {OUT} top_bias={top_bias}")


if __name__ == "__main__":
    main()
