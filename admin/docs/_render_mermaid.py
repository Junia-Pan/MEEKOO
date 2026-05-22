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

MERMAID_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  body {{ margin: 24px; font-family: "Microsoft YaHei", sans-serif; background: #fff; }}
  #wrap {{ display: inline-block; }}
</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
<div id="wrap"><pre class="mermaid">{code}</pre></div>
<script>
  mermaid.initialize({{ startOnLoad: true, theme: "default", securityLevel: "loose" }});
</script>
</body>
</html>
"""


def render_one(page, mmd_path: Path, out_png: Path) -> None:
    code = mmd_path.read_text(encoding="utf-8").strip()
    html = MERMAID_HTML.format(code=code)
    page.set_content(html, wait_until="networkidle")
    page.wait_for_selector("svg", timeout=30000)
    wrap = page.locator("#wrap")
    wrap.screenshot(path=str(out_png), type="png")
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

    print(f"渲染 Mermaid → {out_dir}")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        for mmd_path, png_path in pairs:
            try:
                render_one(page, mmd_path, png_path)
            except Exception as e:
                print(f"  FAIL {mmd_path.name}: {e}")
                browser.close()
                return 1
        browser.close()

    print("完成。请运行: python admin/docs/_md_to_docx.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
