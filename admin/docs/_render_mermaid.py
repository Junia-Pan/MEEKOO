# -*- coding: utf-8 -*-
"""
主要用途：
  将 admin/docs/diagrams/ 下的 .mmd（Mermaid）渲染为 PNG，供 PRD 第 3 章嵌入 Word。

默认输出：
  admin/docs/images/提拆派报价/05-核心业务流程.png
  admin/docs/images/提拆派报价/06-页面流转图.png

用法：
  python admin/docs/_render_mermaid.py
  python admin/docs/_render_mermaid.py --module 提拆派报价

说明：
  依赖 Playwright + Chromium（与 _capture_prd_screenshots.py 相同）。
  渲染完成后请运行 _md_to_docx.py 重新生成 docx。
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

DOCS = Path(__file__).resolve().parent
DEFAULT_MODULE = "提拆派报价"

# Word A4 正文区约 15cm 宽；导出图按此像素上限，避免插入 Word 后超高/超宽
MAX_PNG_WIDTH = 1400
MAX_PNG_HEIGHT = 1800
RENDER_SCALE = 3  # Playwright 设备像素比，提高清晰度

MERMAID_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  body {{ margin: 16px; font-family: "Microsoft YaHei", "微软雅黑", sans-serif; background: #fff; }}
  #wrap {{ display: inline-block; max-width: {max_width}px; }}
  #wrap svg {{ max-width: 100%; height: auto; }}
</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
<div id="wrap"><pre class="mermaid">{code}</pre></div>
<script>
  mermaid.initialize({{
    startOnLoad: true,
    theme: "default",
    securityLevel: "loose",
    flowchart: {{ useMaxWidth: true, htmlLabels: true, curve: "basis" }},
    themeVariables: {{
      fontSize: "16px",
      fontFamily: "Microsoft YaHei, 微软雅黑, sans-serif",
      lineHeight: "1.35"
    }}
  }});
</script>
</body>
</html>
"""


def is_horizontal_flow(code: str) -> bool:
    first = next((ln.strip() for ln in code.splitlines() if ln.strip()), "")
    return first.startswith("flowchart LR") or first.startswith("graph LR")


def normalize_png(path: Path) -> None:
    """缩放到适合 Word 页面的像素尺寸，并保持 Lanczos 清晰度。"""
    try:
        from PIL import Image
    except ImportError:
        print("  提示: pip install pillow 可在导出前自动缩放 PNG，当前跳过缩放")
        return
    with Image.open(path) as im:
        im.load()
        w, h = im.size
        scale = min(MAX_PNG_WIDTH / w, MAX_PNG_HEIGHT / h, 1.0)
        if scale < 1.0:
            nw, nh = int(w * scale), int(h * scale)
            im = im.resize((nw, nh), Image.Resampling.LANCZOS)
        im.save(path, format="PNG", optimize=True)


def render_one(page, mmd_path: Path, out_png: Path) -> None:
    code = mmd_path.read_text(encoding="utf-8").strip()
    max_width = 900 if is_horizontal_flow(code) else 480
    html = MERMAID_HTML.format(code=code, max_width=max_width)
    page.set_content(html, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_selector("svg", timeout=60000)
    page.wait_for_timeout(800)
    svg = page.locator("#wrap svg").first
    box = svg.bounding_box()
    if not box:
        raise RuntimeError("未获取到 SVG 边界")
    pad = 12
    page.screenshot(
        path=str(out_png),
        type="png",
        clip={
            "x": max(0, box["x"] - pad),
            "y": max(0, box["y"] - pad),
            "width": box["width"] + pad * 2,
            "height": box["height"] + pad * 2,
        },
        scale="device",
    )
    normalize_png(out_png)
    print(f"  OK {out_png.name}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--module", default=DEFAULT_MODULE, help="diagrams 与 images 子目录名")
    args = parser.parse_args()
    module = args.module

    diagram_dir = DOCS / "diagrams" / module
    out_dir = DOCS / "images" / module
    if not diagram_dir.is_dir():
        print(f"目录不存在: {diagram_dir}")
        return 1
    out_dir.mkdir(parents=True, exist_ok=True)

    pairs: list[tuple[Path, Path]] = []
    for mmd in sorted(diagram_dir.glob("*.mmd")):
        pairs.append((mmd, out_dir / f"{mmd.stem}.png"))

    if not pairs:
        print(f"未找到 .mmd 文件: {diagram_dir}")
        return 1

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("请先安装: pip install playwright && playwright install chromium")
        return 1

    print(f"渲染 Mermaid → {out_dir} (scale={RENDER_SCALE})")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            device_scale_factor=RENDER_SCALE,
        )
        page = context.new_page()
        for mmd_path, png_path in pairs:
            try:
                render_one(page, mmd_path, png_path)
            except Exception as e:
                print(f"  FAIL {mmd_path.name}: {e}")
                browser.close()
                return 1
        context.close()
        browser.close()

    print("完成。请运行: python admin/docs/_md_to_docx.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
