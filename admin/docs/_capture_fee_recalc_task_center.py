# -*- coding: utf-8 -*-
"""截取「计划单费用重算与任务中心」原型图，供 PRD 嵌入。"""
from __future__ import annotations

import http.server
import socket
import threading
import time
from pathlib import Path

ADMIN_DIR = Path(__file__).resolve().parents[1]
OUT_DIR = Path(__file__).resolve().parent / "images" / "费用重算-任务中心"
PORT = 8771


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
    time.sleep(0.35)
    return httpd


def ensure_modal_show(page):
    modal = page.locator("#modal-fee-recalc.show, #modal-fee-recalc.modal-overlay.show")
    if modal.count() == 0:
        page.locator("#modal-fee-recalc").evaluate("el => el.classList.add('show')")
        page.wait_for_timeout(200)


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

            # 01 计划单费用汇总列表
            page.goto(f"{base}/ar-plan-fee-summary.html", wait_until="domcontentloaded")
            page.wait_for_timeout(900)
            page.evaluate(
                """() => {
                  if (typeof loadAsyncTasks === 'function') loadAsyncTasks();
                  if (typeof ensureRunningDemoTask === 'function') ensureRunningDemoTask();
                  if (typeof syncTaskCenterBadge === 'function') syncTaskCenterBadge();
                }"""
            )
            page.wait_for_timeout(400)
            page.screenshot(path=str(OUT_DIR / "01-计划单费用汇总列表.png"), full_page=False)

            # 02 费用重算弹窗（单个单号）
            page.evaluate("typeof openFeeRecalcModal==='function' && openFeeRecalcModal()")
            page.wait_for_timeout(500)
            ensure_modal_show(page)
            page.locator("#modal-fee-recalc .modal").screenshot(path=str(OUT_DIR / "02-费用重算弹窗.png"))

            # 02b 费用重算弹窗（按创建时间 + 预览）
            page.evaluate(
                """() => {
                  var r = document.querySelector('input[name="fee-recalc-mode"][value="time"]');
                  if (r) { r.checked = true; }
                  if (typeof switchFeeRecalcMode === 'function') switchFeeRecalcMode();
                  var from = document.getElementById('fee-recalc-from');
                  var to = document.getElementById('fee-recalc-to');
                  if (from) from.value = '2026-04-01';
                  if (to) to.value = '2026-04-30';
                  if (typeof syncFeeRecalcDateLimits === 'function') syncFeeRecalcDateLimits();
                  if (typeof renderFeeRecalcPreview === 'function') renderFeeRecalcPreview();
                }"""
            )
            page.wait_for_timeout(500)
            page.locator("#modal-fee-recalc .modal").screenshot(
                path=str(OUT_DIR / "02b-费用重算弹窗-按创建时间.png")
            )
            page.evaluate("typeof closeModal==='function' && closeModal('modal-fee-recalc')")
            page.wait_for_timeout(200)

            # 03 右侧任务中心抽屉
            page.evaluate("typeof openTaskCenter==='function' && openTaskCenter()")
            page.wait_for_timeout(700)
            page.screenshot(path=str(OUT_DIR / "03-任务中心抽屉.png"), full_page=False)
            page.evaluate("typeof closeTaskCenter==='function' && closeTaskCenter()")
            page.wait_for_timeout(200)

            # 04 完整任务中心列表
            page.goto(f"{base}/task-center.html", wait_until="domcontentloaded")
            page.wait_for_timeout(1000)
            page.evaluate(
                """() => {
                  if (typeof loadAsyncTasks === 'function') loadAsyncTasks();
                  if (typeof ensureRunningDemoTask === 'function') ensureRunningDemoTask();
                  if (typeof loadAllTasks === 'function') loadAllTasks();
                  if (typeof queryTaskCenter === 'function') queryTaskCenter();
                }"""
            )
            page.wait_for_timeout(500)
            page.screenshot(path=str(OUT_DIR / "04-完整任务中心列表.png"), full_page=False)

            browser.close()
    finally:
        httpd.shutdown()

    print("OK screenshots ->", OUT_DIR)
    for f in sorted(OUT_DIR.glob("*.png")):
        print(" -", f.name, f.stat().st_size)


if __name__ == "__main__":
    capture()
