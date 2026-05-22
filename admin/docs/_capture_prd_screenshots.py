# -*- coding: utf-8 -*-
"""
主要用途：
  从 admin/pages 下的 HTML 原型页自动截图，供《提拆派报价》等产品需求文档（PRD）嵌入使用。

输出目录：
  admin/docs/images/提拆派报价/（01-列表页.png 等）

用法：
  python admin/docs/_capture_prd_screenshots.py

说明：
  依赖 Playwright + Chromium；会先启动本地静态服务再打开页面截图。
  截图完成后请运行 _md_to_docx.py 重新生成 Word。
"""
from __future__ import annotations

import http.server
import socket
import threading
import time
from pathlib import Path

ADMIN_DIR = Path(__file__).resolve().parents[1]
OUT_DIR = Path(__file__).resolve().parent / "images" / "提拆派报价"
PORT = 8765


def pick_free_port(preferred: int) -> int:
    for port in (preferred, preferred + 1, preferred + 2):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return preferred


def start_static_server(root: Path, port: int):
    import os

    os.chdir(root)

    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, fmt, *args):
            pass

    httpd = http.server.HTTPServer(("127.0.0.1", port), Handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.3)
    return httpd


def capture():
    from playwright.sync_api import sync_playwright

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    port = pick_free_port(PORT)
    httpd = start_static_server(ADMIN_DIR, port)
    base = f"http://127.0.0.1:{port}/pages"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1440, "height": 900})

            # 01 列表页
            page.goto(f"{base}/pricing-pickup-delivery.html", wait_until="networkidle")
            page.wait_for_timeout(600)
            page.screenshot(path=str(OUT_DIR / "01-列表页.png"), full_page=True)

            # 02 编辑页 — 基础信息 + 默认 Tab
            page.goto(
                f"{base}/pricing-pickup-delivery-edit.html?id=PR-202605-001",
                wait_until="networkidle",
            )
            page.wait_for_timeout(2000)
            page.screenshot(path=str(OUT_DIR / "02-编辑页-基础信息.png"), full_page=True)

            # 03 拆柜-组合仓 Tab
            page.locator('#pricingTabs .detail-tab[data-tab="tab-拆柜提拆费"]').click()
            page.wait_for_timeout(1200)
            page.screenshot(path=str(OUT_DIR / "03-编辑页-价目Tab.png"), full_page=True)

            # 04 生效中只读示意（原型未实现只读态，注入需求说明条）
            page.evaluate(
                """() => {
                  const old = document.getElementById('prd-demo-readonly-banner');
                  if (old) old.remove();
                  const bar = document.createElement('div');
                  bar.id = 'prd-demo-readonly-banner';
                  bar.textContent = '报价生效中，不可编辑（PRD 示意）';
                  bar.style.cssText = [
                    'position:fixed', 'top:56px', 'left:50%', 'transform:translateX(-50%)',
                    'z-index:10000', 'background:#FEF3C7', 'color:#92400E',
                    'padding:10px 20px', 'border-radius:8px', 'font-size:14px',
                    'font-weight:600', 'box-shadow:0 4px 12px rgba(0,0,0,.15)',
                  ].join(';');
                  document.body.appendChild(bar);
                  const saveBtn = document.querySelector('.page-header-actions .btn-primary');
                  if (saveBtn) {
                    saveBtn.disabled = true;
                    saveBtn.style.opacity = '0.5';
                    saveBtn.title = '生效中不可保存';
                  }
                  document.querySelectorAll(
                    '.pricing-basic-card input, .pricing-basic-card select, .pricing-tabs-card input, .pricing-tabs-card select, .pricing-tabs-card textarea'
                  ).forEach((el) => {
                    el.disabled = true;
                  });
                }"""
            )
            page.wait_for_timeout(400)
            page.screenshot(path=str(OUT_DIR / "04-状态与提示.png"), full_page=True)

            browser.close()
    finally:
        httpd.shutdown()

    names = sorted(OUT_DIR.glob("*.png"))
    print("Captured:", len(names))
    for p in names:
        print(" ", p.name, p.stat().st_size)


if __name__ == "__main__":
    capture()
