#!/usr/bin/env python3
"""猫の日記 — アイコン・アセット生成スクリプト

src/constants/theme.ts のパレットに合わせたフラットな PNG を書き出す。
形をいじりたいときはこのファイルの数値を変えて再実行する。

    pip install Pillow
    python3 scripts/generate_icons.py

出力先はすべて assets/ 配下。
"""

from __future__ import annotations

import math
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
ICON_DIR = os.path.join(ASSETS, "icons")

# --- パレット (src/constants/theme.ts と一致させる) ---
CREAM = "#FBF1E6"        # background
TERRACOTTA = "#E0976A"   # primary
PEACH = "#F1D4B5"
BROWN = "#B08862"
TEXT = "#4A3B2E"

# 猫の毛色 6 種。body=本体, pattern=模様, inner=内耳, face=表情の色,
# outline=輪郭（背景に溶ける明暗の毛色だけ指定して視認性を確保する）
CAT_COLORS = {
    "orange": dict(body="#E0976A", pattern=None,      inner_ear="#F1D4B5", face="#4A3B2E"),
    "black":  dict(body="#3D3129", pattern=None,      inner_ear="#8A6F5A", face="#E8DCCF",
                   outline="#6B5A49"),
    "white":  dict(body="#F9F3EC", pattern=None,      inner_ear="#F1D4B5", face="#7A6A5A",
                   outline="#DCCDBB"),
    "gray":   dict(body="#A9A29B", pattern=None,      inner_ear="#D6CFC7", face="#3D3129"),
    "calico": dict(body="#F9F3EC", pattern="#E0976A", inner_ear="#F1D4B5", face="#7A6A5A",
                   outline="#DCCDBB"),
    "tabby":  dict(body="#C98A50", pattern="#7E5230", inner_ear="#F1D4B5", face="#3D3129"),
}

# 耳の頂点は上かつ外向き。付け根の 2 点は頭の輪郭より内側に置くことで、
# 頭を後から描いたときに継ぎ目の段差が出ないようにしている。
LEFT_EAR = [(270, 420), (285, 160), (450, 360)]
RIGHT_EAR = [(730, 420), (715, 160), (550, 360)]
LEFT_INNER = [(316, 392), (326, 232), (424, 350)]
RIGHT_INNER = [(684, 392), (674, 232), (576, 350)]
HEAD = (150, 270, 850, 820)

# 描画は 4 倍で行い、縮小してアンチエイリアスをかける
SS = 4
# 設計座標系は 1000x1000
D = 1000


def canvas(bg=None) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    size = D * SS
    img = Image.new("RGBA", (size, size), bg if bg else (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def s(v: float) -> float:
    """設計座標 → 実描画座標"""
    return v * SS


def box(x0, y0, x1, y1):
    return [s(x0), s(y0), s(x1), s(y1)]


def rounded_polygon(draw, pts, radius, fill):
    """角を丸めた多角形。輪郭を太い線でなぞって丸みを出す。

    閉じるときに先頭 2 点を足しているのは、始点にも丸い継ぎ目を作るため。
    pts[0] だけで閉じると始点が平らなキャップのまま残り、小さな突起が出る。
    """
    scaled = [(s(x), s(y)) for x, y in pts]
    draw.polygon(scaled, fill=fill)
    draw.line(
        scaled + [scaled[0], scaled[1]],
        fill=fill,
        width=int(s(radius) * 2),
        joint="curve",
    )


def silhouette(draw, color, grow=0.0):
    """耳 + 頭のシルエット。grow で外側に太らせて輪郭線に使う。"""
    rounded_polygon(draw, LEFT_EAR, 40 + grow, color)
    rounded_polygon(draw, RIGHT_EAR, 40 + grow, color)
    x0, y0, x1, y1 = HEAD
    draw.ellipse(box(x0 - grow, y0 - grow, x1 + grow, y1 + grow), fill=color)


def draw_pattern(img, body, pattern):
    """模様を別レイヤーに描き、頭のシルエットでクリップして重ねる。

    こうすると、ぶちが頭の縁まで自然に届く（円をそのまま置くと
    「ほお紅」に見えるうえ、輪郭からはみ出す）。
    """
    size = img.size[0]
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)

    if body == "#F9F3EC":                        # 三毛: 縁まで届く大きなぶち
        ld.ellipse(box(540, 250, 900, 540), fill=pattern)
        ld.ellipse(box(140, 560, 430, 820), fill=pattern)
    else:                                        # キジトラ: 額の縞
        for i, x in enumerate((434, 500, 566)):
            h = 104 if i == 1 else 78
            ld.rounded_rectangle(
                box(x - 19, 368, x + 19, 368 + h), radius=s(19), fill=pattern
            )

    mask = Image.new("L", (size, size), 0)
    silhouette(ImageDraw.Draw(mask), 255)
    layer.putalpha(Image.composite(layer.split()[3], Image.new("L", (size, size), 0), mask))
    img.alpha_composite(layer)


def draw_cat(img, draw, body, pattern, inner_ear, face=TEXT, outline=None, with_face=True):
    """1000x1000 の設計座標に猫の顔を描く。"""
    if outline:
        silhouette(draw, outline, grow=11)
    silhouette(draw, body)

    # 内耳
    rounded_polygon(draw, LEFT_INNER, 22, inner_ear)
    rounded_polygon(draw, RIGHT_INNER, 22, inner_ear)

    if pattern:
        draw_pattern(img, body, pattern)

    if not with_face:
        return

    # 目（閉じた笑顔の弧）
    lw = int(s(28))
    draw.arc(box(316, 492, 452, 594), start=200, end=340, fill=face, width=lw)
    draw.arc(box(548, 492, 684, 594), start=200, end=340, fill=face, width=lw)

    # 鼻
    rounded_polygon(draw, [(468, 626), (532, 626), (500, 668)], 11, face)

    # 口（ω）
    mw = int(s(19))
    draw.arc(box(430, 648, 502, 718), start=20, end=160, fill=face, width=mw)
    draw.arc(box(498, 648, 570, 718), start=20, end=160, fill=face, width=mw)

    # ひげ（顔の内側から始めて外へ抜ける）
    ww = int(s(16))
    for y_in, y_out in ((572, 552), (622, 626)):
        draw.line([s(300), s(y_in), s(148), s(y_out)], fill=face, width=ww)
        draw.line([s(700), s(y_in), s(852), s(y_out)], fill=face, width=ww)


def render(bg=None, **kwargs) -> Image.Image:
    img, draw = canvas(bg)
    draw_cat(img, draw, **kwargs)
    return img.resize((D, D), Image.LANCZOS)


def save(img: Image.Image, path: str, size: int, bg: str | None = None):
    out = img.resize((size, size), Image.LANCZOS)
    if bg:
        flat = Image.new("RGB", (size, size), bg)
        flat.paste(out, (0, 0), out)
        out = flat
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.save(path)
    print(f"  {os.path.relpath(path, ROOT):46} {size}x{size}")


def padded(img: Image.Image, scale: float, size: int, bg=None) -> Image.Image:
    """中央に scale 倍で配置した size x size の画像を作る（安全領域対応）。"""
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * scale)
    out.paste(img.resize((inner, inner), Image.LANCZOS), ((size - inner) // 2,) * 2)
    if bg:
        flat = Image.new("RGB", (size, size), bg)
        flat.paste(out, (0, 0), out)
        return flat
    return out


def main():
    print("ブランドアイコン:")
    logo = render(bg=None, body=TERRACOTTA, pattern=None, inner_ear=PEACH)

    # A-1 iOS/共通アプリアイコン: 透過なし・フルブリード
    padded(logo, 0.78, 1024, bg=CREAM).save(os.path.join(ASSETS, "icon.png"))
    print(f"  {'assets/icon.png':46} 1024x1024 (不透明)")

    # A-2 Android アダプティブ前景: 中央 66% の安全領域に収める
    padded(logo, 0.60, 1024).save(os.path.join(ASSETS, "adaptive-icon.png"))
    print(f"  {'assets/adaptive-icon.png':46} 1024x1024 (透過/安全領域内)")

    # A-3 スプラッシュ: resizeMode contain 用の透過ロゴ
    padded(logo, 0.62, 1024).save(os.path.join(ASSETS, "splash.png"))
    print(f"  {'assets/splash.png':46} 1024x1024 (透過)")

    # A-4 Web favicon
    save(padded(logo, 0.86, 512, bg=CREAM), os.path.join(ASSETS, "favicon.png"), 196)

    # A-5 Android 通知アイコン: 白シルエット単色
    sil = render(body="#FFFFFF", pattern=None, inner_ear="#FFFFFF", with_face=False)
    padded(sil, 0.82, 96).save(os.path.join(ASSETS, "notification-icon.png"))
    print(f"  {'assets/notification-icon.png':46} 96x96 (白シルエット)")

    # Android 13+ テーマアイコン
    padded(sil, 0.60, 1024).save(os.path.join(ASSETS, "adaptive-icon-monochrome.png"))
    print(f"  {'assets/adaptive-icon-monochrome.png':46} 1024x1024 (単色)")

    print("\n猫の毛色 6 種:")
    for key, spec in CAT_COLORS.items():
        img = render(**spec)
        save(padded(img, 0.92, 512), os.path.join(ICON_DIR, f"cat-{key}.png"), 256)

    print("\n完了。")


if __name__ == "__main__":
    main()
