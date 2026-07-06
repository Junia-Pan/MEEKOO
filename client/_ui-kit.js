// Shared tiny UI helpers for single-file pages.
// Intentionally no build step; every page can inline-copy if needed.
(function (global) {
  // Show a visible banner for uncaught errors (helps avoid "页面空白" with no clue).
  (function installErrorBanner() {
    if (global.__MEEKOO_ERROR_BANNER_INSTALLED__) return;
    global.__MEEKOO_ERROR_BANNER_INSTALLED__ = true;
    const show = (msg) => {
      try {
        const id = "__meekoo_boot_error__";
        const exist = document.getElementById(id);
        if (exist) exist.remove();
        const bar = document.createElement("div");
        bar.id = id;
        bar.setAttribute(
          "style",
          "position:sticky;top:0;z-index:9999;background:#fff1f2;color:#9f1239;border-bottom:1px solid rgba(159,18,57,.25);padding:10px 14px;font-size:12px;line-height:1.5"
        );
        bar.textContent = msg;
        document.body.insertBefore(bar, document.body.firstChild);
      } catch {}
    };
    global.addEventListener("error", (e) => {
      const m = (e && (e.message || (e.error && e.error.message))) || "未知错误";
      show("页面脚本报错：" + m);
    });
    global.addEventListener("unhandledrejection", (e) => {
      const m = (e && e.reason && (e.reason.message || String(e.reason))) || "Promise 未处理异常";
      show("页面脚本报错：" + m);
    });
  })();

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") node.className = v;
        else if (k === "html") node.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) node.setAttribute(k, "");
        else if (v !== false && v != null) node.setAttribute(k, String(v));
      }
    }
    const push = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) return c.forEach(push);
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    };
    children.forEach(push);
    return node;
  }

  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function fmtDTS(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function downloadCSV(filename, rows) {
    const esc = (s) => `"${String(s ?? "").replaceAll('"', '""')}"`;
    const cols = Array.from(
      rows.reduce((set, r) => {
        Object.keys(r || {}).forEach((k) => set.add(k));
        return set;
      }, new Set())
    );
    const head = cols.map(esc).join(",");
    const body = rows.map((r) => cols.map((c) => esc(r?.[c])).join(",")).join("\n");
    const blob = new Blob(["\ufeff", head, "\n", body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function toast(msg, type = "info") {
    const hostId = "__toast_host__";
    let host = document.getElementById(hostId);
    if (!host) {
      host = el("div", { id: hostId, class: "toast-host" });
      document.body.appendChild(host);
    }
    const item = el("div", { class: `toast toast-${type}` }, msg);
    host.appendChild(item);
    setTimeout(() => item.classList.add("show"), 10);
    setTimeout(() => {
      item.classList.remove("show");
      setTimeout(() => item.remove(), 220);
    }, 2200);
  }

  const DATE_INPUT_PH_TEXT = "YYYY/MM/DD";

  function shouldSkipDateInputPlaceholder(input) {
    if (!input || input.type !== "date") return true;
    if (input.closest(".date-input-field")) return true;
    if (input.closest(".dr-field") && input.closest(".dr-field").querySelector(".dr-ph")) return true;
    if (input.closest(".sp-book-date-field")) return true;
    return false;
  }

  function syncDateInputPlaceholder(input, wrap) {
    if (!input || !wrap) return;
    const empty = !String(input.value || "").trim();
    wrap.classList.toggle("is-empty", empty);
    input.classList.toggle("date-input--empty", empty);
  }

  function wireDateInputPlaceholder(input) {
    if (shouldSkipDateInputPlaceholder(input)) return;
    if (input.dataset.datePhWired === "1") return;
    input.dataset.datePhWired = "1";

    const wrap = document.createElement("div");
    wrap.className = "date-input-field is-empty date-input-field--default";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const ph = document.createElement("span");
    ph.className = "date-input-ph";
    ph.textContent = DATE_INPUT_PH_TEXT;
    ph.setAttribute("aria-hidden", "true");
    wrap.appendChild(ph);

    const sync = () => syncDateInputPlaceholder(input, wrap);
    input.addEventListener("change", sync);
    input.addEventListener("input", sync);
    sync();
  }

  function wireDateInputPlaceholders(root = document) {
    const inputs = root.querySelectorAll ? root.querySelectorAll('input[type="date"]') : [];
    inputs.forEach((input) => wireDateInputPlaceholder(input));
  }

  function installDateInputPlaceholderObserver() {
    if (installDateInputPlaceholderObserver._done) return;
    installDateInputPlaceholderObserver._done = true;
    const mo = new MutationObserver(() => wireDateInputPlaceholders(document));
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function wireDateHints(root = document) {
    const fields = root.querySelectorAll ? root.querySelectorAll(".date-field") : [];
    fields.forEach((wrap) => {
      const input = wrap.querySelector && wrap.querySelector('input[type="date"]');
      if (!input) return;
      const sync = () => wrap.classList.toggle("has-value", !!input.value);
      sync();
      input.addEventListener("input", sync);
      input.addEventListener("change", sync);
      input.addEventListener("blur", sync);
    });
  }

  function wireSidenavDetails(root = document) {
    const list = root.querySelectorAll ? root.querySelectorAll("details[data-snav]") : [];
    list.forEach((d) => {
      const hasActive = d.querySelector && d.querySelector('.subnav a.active');
      if (!hasActive) d.open = false;
    });
  }

  function wireDateRanges(root = document) {
    const list = root.querySelectorAll ? root.querySelectorAll(".date-range") : [];
    list.forEach((wrap) => {
      try {
        const dates = wrap.querySelectorAll ? wrap.querySelectorAll('input[type="date"]') : [];
        const from = dates && dates[0];
        const to = dates && dates[1];
        const phs = wrap.querySelectorAll ? wrap.querySelectorAll(".dr-ph") : [];
        const fromPh = phs && phs[0];
        const toPh = phs && phs[1];
        const btn = wrap.querySelector ? wrap.querySelector(".dr-ico") : null;

        const sync = () => {
          const hasFrom = !!(from && from.value);
          const hasTo = !!(to && to.value);
          if (fromPh) fromPh.style.display = hasFrom ? "none" : "block";
          if (toPh) toPh.style.display = hasTo ? "none" : "block";
          if (from && from.classList) from.classList.toggle("has-value", hasFrom);
          if (to && to.classList) to.classList.toggle("has-value", hasTo);
        };
        if (from) {
          from.addEventListener("change", sync);
          from.addEventListener("input", sync);
          from.addEventListener("blur", sync);
          from.addEventListener("focus", () => { if (fromPh) fromPh.style.display = "none"; });
        }
        if (to) {
          to.addEventListener("change", sync);
          to.addEventListener("input", sync);
          to.addEventListener("blur", sync);
          to.addEventListener("focus", () => { if (toPh) toPh.style.display = "none"; });
        }
        if (btn && !btn.dataset.boundPicker) {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            const open = (node) => {
              if (!node) return;
              try {
                if (typeof node.showPicker === "function") node.showPicker();
                else node.focus();
              } catch {
                node.focus();
              }
            };
            if (from && !from.value) return open(from);
            if (to && !to.value) return open(to);
            if (to) return open(to);
            if (from) return open(from);
          });
          btn.dataset.boundPicker = "1";
        }
        sync();
      } catch {}
    });
  }

  function modal({ title, content, onConfirm, confirmText = "确认", cancelText = "取消", width = 820, actions = [] }) {
    const overlay = el("div", { class: "modal-overlay", role: "dialog", "aria-modal": "true" });
    const panel = el("div", { class: "modal", style: `max-width:${width}px` });
    const head = el("div", { class: "modal-head" }, el("div", { class: "modal-title" }, title || ""));
    const closeBtn = el(
      "button",
      { class: "btn btn-ghost", type: "button", onClick: () => close() },
      "关闭"
    );
    head.appendChild(closeBtn);
    const body = el("div", { class: "modal-body" });
    if (typeof content === "string") body.innerHTML = content;
    else if (content) body.appendChild(content);
    const foot = el("div", { class: "modal-foot" });
    for (const a of actions || []) {
      if (a) foot.appendChild(a);
    }
    if (cancelText !== null) {
      const cancel = el("button", { class: "btn btn-ghost", type: "button", onClick: () => close() }, cancelText);
      foot.appendChild(cancel);
    }
    if (confirmText !== null) {
      const ok = el(
        "button",
        {
          class: "btn btn-primary",
          type: "button",
          onClick: async () => {
            if (onConfirm) await onConfirm({ close });
          },
        },
        confirmText
      );
      foot.appendChild(ok);
    }
    // If footer has no actions/buttons, do not render it
    if (foot.childNodes && foot.childNodes.length > 0) panel.append(head, body, foot);
    else panel.append(head, body);
    overlay.appendChild(panel);

    function close() {
      overlay.classList.remove("open");
      setTimeout(() => overlay.remove(), 120);
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);

    document.body.appendChild(overlay);
    requestAnimationFrame(() => wirePersistentListHScroll(overlay));
    setTimeout(() => overlay.classList.add("open"), 10);
    return { close, overlay, panel };
  }

  function formGrid(fields, initial = {}) {
    const root = el("div", { class: "form-grid" });
    const controls = {};
    for (const f of fields) {
      const id = `f_${Math.random().toString(16).slice(2)}`;
      const label = el("label", { class: "label", for: id }, f.label);
      let input;
      const common = { id, name: f.name, class: "input" };
      if (f.type === "select") {
        input = el("select", common, (f.options || []).map((o) => el("option", { value: o.value }, o.label)));
      } else if (f.type === "textarea") {
        input = el("textarea", { ...common, class: "input textarea", rows: f.rows || 3 });
      } else {
        input = el("input", { ...common, type: f.type || "text", placeholder: f.placeholder || "" });
      }
      if (f.readonly) input.setAttribute("readonly", "");
      if (f.required) input.setAttribute("required", "");
      if (initial[f.name] != null) input.value = String(initial[f.name]);
      const help = f.help ? el("div", { class: "help" }, f.help) : null;
      const cell = el("div", { class: `field col-${f.col || 6}` }, label, input, help);
      root.appendChild(cell);
      controls[f.name] = input;
    }
    return { root, controls };
  }

  /**
   * 列表分页：条数展示 + 每页条数 + 页码 + 上一页/下一页
   * @param {{ page:number, pageSize:number }} pager 可变引用
   * @param {{ count?:string, pageSize?:string, page?:string, totalPages?:string, prev?:string, next?:string }} ids 元素 id
   * @param {() => number} getTotal 当前筛选结果总条数
   * @param {() => void} onChange 页码/每页条数变化后回调（内应调用表格重绘）
   */
  function wireTablePager(pager, ids, getTotal, onChange) {
    const $ = (id) => (id ? document.getElementById(id) : null);
    const countEl = $(ids.count);
    const pageSizeEl = $(ids.pageSize);
    const pageEl = $(ids.page);
    const totalPagesEl = $(ids.totalPages);
    const prevEl = $(ids.prev);
    const nextEl = $(ids.next);

    function readPageSize() {
      const n = parseInt(pageSizeEl && pageSizeEl.value, 10);
      return Math.max(1, Number.isFinite(n) ? n : pager.pageSize || 10);
    }

    function sync() {
      const total = Math.max(0, Number(getTotal()) || 0);
      const pageSize = readPageSize();
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      let page = Math.max(1, Math.min(pager.page || 1, totalPages));
      pager.page = page;
      pager.pageSize = pageSize;
      if (countEl) countEl.textContent = `${total} 条`;
      if (pageSizeEl) pageSizeEl.value = String(pageSize);
      if (pageEl) pageEl.value = String(page);
      if (totalPagesEl) totalPagesEl.textContent = String(totalPages);
      if (prevEl) prevEl.disabled = page <= 1;
      if (nextEl) nextEl.disabled = page >= totalPages;
    }

    function getSlice(rows) {
      const total = rows.length;
      const pageSize = readPageSize();
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      let page = Math.max(1, Math.min(pager.page || 1, totalPages));
      pager.page = page;
      pager.pageSize = pageSize;
      if (countEl) countEl.textContent = `${total} 条`;
      if (pageSizeEl) pageSizeEl.value = String(pageSize);
      if (pageEl) pageEl.value = String(page);
      if (totalPagesEl) totalPagesEl.textContent = String(totalPages);
      if (prevEl) prevEl.disabled = page <= 1;
      if (nextEl) nextEl.disabled = page >= totalPages;
      const start = (page - 1) * pageSize;
      return rows.slice(start, start + pageSize);
    }

    if (prevEl) {
      prevEl.addEventListener("click", () => {
        pager.page = Math.max(1, (pager.page || 1) - 1);
        sync();
        onChange();
      });
    }
    if (nextEl) {
      nextEl.addEventListener("click", () => {
        const total = Math.max(0, Number(getTotal()) || 0);
        const pageSize = readPageSize();
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        pager.page = Math.min(totalPages, (pager.page || 1) + 1);
        sync();
        onChange();
      });
    }
    if (pageSizeEl) {
      pageSizeEl.addEventListener("change", () => {
        pager.pageSize = readPageSize();
        pager.page = 1;
        sync();
        onChange();
      });
    }
    if (pageEl) {
      pageEl.addEventListener("change", () => {
        const total = Math.max(0, Number(getTotal()) || 0);
        const pageSize = readPageSize();
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const n = parseInt(pageEl.value, 10);
        let p = Number.isFinite(n) ? n : 1;
        p = Math.max(1, Math.min(p, totalPages));
        pager.page = p;
        sync();
        onChange();
      });
    }

    return { sync, getSlice };
  }

  /** macOS 等环境下原生横向条为叠加层；用自绘轨道常驻，与真实 scrollLeft 同步 */
  function isVerticallyBoundedList(host) {
    const s = getComputedStyle(host);
    if (s.maxHeight && s.maxHeight !== "none") {
      const px = Number.parseFloat(s.maxHeight);
      if (Number.isFinite(px) && px > 0) return true;
    }
    if (s.height && s.height !== "auto" && s.height !== "0px") {
      const px = Number.parseFloat(s.height);
      if (Number.isFinite(px) && px > 0) return true;
    }
    return false;
  }

  const LIST_HSCROLL_HOST_SEL = [".scroll", ".cp-table-scroll"].join(", ");

  function installPersistentHorizontalBar(host) {
    if (!host || host.nodeType !== 1) return;
    if (host.dataset.cpHscroll === "1") return;
    if (host.closest(".cp-x")) return;
    if (host.querySelector(":scope > .cp-x")) return;

    const bounded = isVerticallyBoundedList(host);
    const x = document.createElement("div");
    x.className = "cp-x";
    while (host.firstChild) x.appendChild(host.firstChild);

    const hbar = document.createElement("div");
    hbar.className = "cp-hbar";
    hbar.setAttribute("aria-hidden", "true");
    const track = document.createElement("div");
    track.className = "cp-hbar-track";
    const thumb = document.createElement("div");
    thumb.className = "cp-hbar-thumb";
    hbar.appendChild(track);
    hbar.appendChild(thumb);

    host.classList.add("cp-hscroll-host");
    if (bounded) host.classList.add("cp-hscroll--bounded");
    if (bounded) {
      const y = document.createElement("div");
      y.className = "cp-y";
      y.appendChild(x);
      host.appendChild(y);
    } else {
      host.appendChild(x);
    }
    host.appendChild(hbar);
    host.dataset.cpHscroll = "1";

    const scrollEl = x;
    const sync = () => {
      const max = scrollEl.scrollWidth - scrollEl.clientWidth;
      if (max <= 2) {
        hbar.setAttribute("hidden", "");
        return;
      }
      hbar.removeAttribute("hidden");
      const tw = track.clientWidth;
      if (tw <= 0) return;
      const ratio = scrollEl.clientWidth / scrollEl.scrollWidth;
      const thumbW = Math.max(24, Math.floor(tw * ratio));
      const maxLeft = Math.max(0, tw - thumbW);
      const left = max <= 0 ? 0 : Math.round((scrollEl.scrollLeft / max) * maxLeft);
      thumb.style.width = `${thumbW}px`;
      thumb.style.left = `${left}px`;
    };

    scrollEl.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(() => requestAnimationFrame(sync));
    ro.observe(scrollEl);
    ro.observe(track);
    const mo = new MutationObserver(() => requestAnimationFrame(sync));
    mo.observe(scrollEl, { childList: true, subtree: true, attributes: true });

    track.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      if (e.target === thumb) return;
      const max = scrollEl.scrollWidth - scrollEl.clientWidth;
      if (max <= 0) return;
      const rect = track.getBoundingClientRect();
      const rel = e.clientX - rect.left;
      const tw = rect.width;
      const thumbW = thumb.getBoundingClientRect().width;
      const maxLeft = Math.max(0, tw - thumbW);
      const targetLeft = rel - thumbW / 2;
      scrollEl.scrollLeft =
        maxLeft <= 0 ? 0 : Math.max(0, Math.min(max, (targetLeft / maxLeft) * max));
      sync();
    });

    let drag = null;
    thumb.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      sync();
      const max = scrollEl.scrollWidth - scrollEl.clientWidth;
      const thumbW = thumb.getBoundingClientRect().width;
      const maxMove = Math.max(0, track.clientWidth - thumbW);
      drag = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startSL: scrollEl.scrollLeft,
        max,
        maxMove,
      };
      try {
        thumb.setPointerCapture(e.pointerId);
      } catch {}
    });
    thumb.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dSl = drag.maxMove <= 0 ? 0 : (dx / drag.maxMove) * drag.max;
      scrollEl.scrollLeft = Math.max(0, Math.min(drag.max, drag.startSL + dSl));
      sync();
    });
    const endDrag = (e) => {
      if (!drag || (e && e.pointerId != null && e.pointerId !== drag.pointerId)) return;
      try {
        thumb.releasePointerCapture(drag.pointerId);
      } catch {}
      drag = null;
    };
    thumb.addEventListener("pointerup", endDrag);
    thumb.addEventListener("pointercancel", endDrag);
    thumb.addEventListener("lostpointercapture", () => {
      drag = null;
    });

    hbar.addEventListener(
      "wheel",
      (e) => {
        if (hbar.hasAttribute("hidden")) return;
        e.preventDefault();
        scrollEl.scrollLeft += e.deltaY + e.deltaX;
        sync();
      },
      { passive: false }
    );

    requestAnimationFrame(sync);
    window.addEventListener("load", sync, { once: true });
  }

  function wirePersistentListHScroll(root) {
    const doc = root && root.querySelectorAll ? root : document;
    try {
      doc.querySelectorAll(LIST_HSCROLL_HOST_SEL).forEach((host) => installPersistentHorizontalBar(host));
    } catch {}
  }

  let __listHScrollMoInstalled = false;
  function installDynamicListHScrollObserver() {
    if (__listHScrollMoInstalled) return;
    __listHScrollMoInstalled = true;
    let tid;
    const flush = () => {
      clearTimeout(tid);
      tid = setTimeout(() => wirePersistentListHScroll(document), 100);
    };
    try {
      const mo = new MutationObserver(flush);
      if (document.body) mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    } catch {}
  }

  // Auto-wire common UI behaviors (non-invasive)
  try {
    if (document && document.addEventListener) {
      document.addEventListener("DOMContentLoaded", () => {
        wireDateInputPlaceholders(document);
        installDateInputPlaceholderObserver();
        wireDateHints(document);
        wireSidenavDetails(document);
        wirePersistentListHScroll(document);
        installDynamicListHScrollObserver();
      });
    }
  } catch {}

  global.MEEKOO_UI = {
    el,
    fmtDate,
    fmtDTS,
    downloadCSV,
    toast,
    modal,
    formGrid,
    wireTablePager,
    wireDateHints,
    wireDateInputPlaceholders,
    wireSidenavDetails,
    wireDateRanges,
    wirePersistentListHScroll,
    installPersistentHorizontalBar,
  };
})(window);

