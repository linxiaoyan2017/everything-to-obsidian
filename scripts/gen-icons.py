"""
gen-icons.py — 从 bee.png 生成圆形裁剪的三尺寸 Chrome 插件图标
用法: python3 scripts/gen-icons.py
"""

from pathlib import Path
from PIL import Image, ImageDraw

BASE_DIR = Path(__file__).parent.parent / "bookmark-to-obsidian" / "icons"
SOURCE   = BASE_DIR / "bee.png"
SIZES    = [16, 48, 128]


def make_circle_icon(img: Image.Image, size: int) -> Image.Image:
    """将图片中心裁剪为正方形，应用圆形遮罩，缩放至目标尺寸。"""
    # 1. 转为 RGBA
    img = img.convert("RGBA")
    w, h = img.size

    # 2. 中心裁剪为正方形（取最短边）
    side = min(w, h)
    left   = (w - side) // 2
    top    = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))

    # 3. 缩放到目标尺寸（先放大到 2× 再缩小，抗锯齿更好）
    render_size = max(size * 2, side)
    img = img.resize((render_size, render_size), Image.LANCZOS)

    # 4. 创建圆形 alpha 遮罩
    mask = Image.new("L", (render_size, render_size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, render_size - 1, render_size - 1), fill=255)

    # 5. 应用遮罩
    result = Image.new("RGBA", (render_size, render_size), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask)

    # 6. 最终缩放到目标尺寸
    result = result.resize((size, size), Image.LANCZOS)
    return result


def main():
    if not SOURCE.exists():
        print(f"❌ 找不到源文件: {SOURCE}")
        return

    src = Image.open(SOURCE)
    print(f"✅ 读取源图: {SOURCE.name}  ({src.size[0]}×{src.size[1]})")

    for size in SIZES:
        out_path = BASE_DIR / f"icon{size}.png"
        icon = make_circle_icon(src, size)
        icon.save(out_path, "PNG")
        print(f"  → 生成 {out_path.name}  ({size}×{size})")

    print("✅ 全部图标生成完毕！")


if __name__ == "__main__":
    main()
