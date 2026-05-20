/* ============================================================
   MEEKOO 员工端 · 公共 JS
   Version: 1.0
   ============================================================ */

// ── Nav group toggle ──
function toggleGroup(header) {
  header.parentElement.classList.toggle('open');
}

// 财务侧栏（临时隐藏）
const SHOW_FINANCE_NAV = false;

// ── Shared sidebar renderer (single source of truth) ──
function renderSharedSidebar() {
  const nav = document.querySelector('nav.sidebar');
  if (!nav) return;

  const page = (() => {
    try {
      const p = (location.pathname || '').replace(/\\/g, '/');
      return p.split('/').pop() || '';
    } catch { return ''; }
  })();

  const is = (name) => page === name;
  const activeNav = (name) => is(name) ? ' active' : '';
  const activeSub = (name) => is(name) ? ' active' : '';
  const hash = (() => { try { return decodeURIComponent((location.hash || '').replace('#', '')); } catch { return (location.hash || '').replace('#', ''); } })();
  const activeSubH = (pageName, tabId, isFirst) =>
    is(pageName) && (hash === tabId || (isFirst && !hash)) ? ' active' : '';

  nav.innerHTML = `
    <div class="sidebar-logo"><div class="sidebar-logo-icon">M</div><div class="sidebar-logo-text"><span class="sidebar-logo-name">MEEKOO</span><span class="sidebar-logo-sub">员工端</span></div></div>
    <div class="nav-section">
      <div class="nav-item${activeNav('pickup-disassembly-schedule.html')}" onclick="location.href='pickup-disassembly-schedule.html'"><span class="nav-icon">📦</span> 提拆派计划</div>
      <div class="nav-item${activeNav('overseas-warehouse-receiving-plan.html')}" onclick="location.href='overseas-warehouse-receiving-plan.html'"><span class="nav-icon">🏭</span> 外仓收货计划</div>
    </div>
    <div class="nav-section"><div class="nav-section-label">货件</div>
      <div class="nav-group"><div class="nav-group-header" onclick="toggleGroup(this)"><div class="nav-group-header-left"><span class="nav-icon">📋</span> 货件管理</div><span class="nav-group-arrow">▶</span></div>
        <div class="nav-sub">
          <div class="nav-sub-item${activeSub('shipment-management-all-shipments.html')}" onclick="location.href='shipment-management-all-shipments.html'">全部货件</div>
          <div class="nav-sub-item${activeSubH('shipment-management.html','未到仓货件',true)}" onclick="location.href='shipment-management.html#未到仓货件'">未到仓货件</div>
          <div class="nav-sub-item${activeSubH('shipment-management.html','待出库货件')}" onclick="location.href='shipment-management.html#待出库货件'">待出库货件</div>
          <div class="nav-sub-item${activeSub('shipment-management-held-warehouse.html')}" onclick="location.href='shipment-management-held-warehouse.html'">留仓货件</div>
          <div class="nav-sub-item${activeSubH('shipment-management.html','问题件')}" onclick="location.href='shipment-management.html#问题件'">问题件</div>
        </div></div></div>
      <div class="nav-item${activeNav('one-piece-fulfillment.html')}" onclick="location.href='one-piece-fulfillment.html'"><span class="nav-icon">🔁</span> 一件代发</div>
    <div class="nav-section"><div class="nav-section-label">出库</div>
      <div class="nav-group"><div class="nav-group-header" onclick="toggleGroup(this)"><div class="nav-group-header-left"><span class="nav-icon">🗓️</span> FBA发货计划</div><span class="nav-group-arrow">▶</span></div>
        <div class="nav-sub">
          <div class="nav-sub-item${activeSub('fba-plan-overview.html')}" onclick="location.href='fba-plan-overview.html'">排货总览</div>
          <div class="nav-sub-item${activeSub('fba-plan-fba-warehouse-summary.html')}" onclick="location.href='fba-plan-fba-warehouse-summary.html'">FBA仓汇总</div>
          <div class="nav-sub-item${activeSub('fba-plan-management.html')}" onclick="location.href='fba-plan-management.html'">计划单管理</div>
          <div class="nav-sub-item${activeSub('fba-load-management.html')}" onclick="location.href='fba-load-management.html'">装车单管理</div>
        </div>
      </div>
      <div class="nav-item${activeNav('fba-outbound-shipping-management.html')}" onclick="location.href='fba-outbound-shipping-management.html'"><span class="nav-icon">🚛</span> FBA派送管理</div>
      <div class="nav-item${activeNav('local-private-warehouse-shipping.html')}" onclick="location.href='local-private-warehouse-shipping.html'"><span class="nav-icon">🏠</span> 本地私仓卡派</div>
      <div class="nav-item${activeNav('out-of-state-private-warehouse-shipping.html')}" onclick="location.href='out-of-state-private-warehouse-shipping.html'"><span class="nav-icon">🗺️</span> 外州私仓卡派</div>
      <div class="nav-item${activeNav('self-pickup-management.html')}" onclick="location.href='self-pickup-management.html'"><span class="nav-icon">🧍</span> 自提单</div>
      <div class="nav-item${activeNav('express-waybill.html')}" onclick="location.href='express-waybill.html'"><span class="nav-icon">📦</span> 快递单</div>
    </div>
    <div class="nav-section"><div class="nav-section-label">服务</div>
      <div class="nav-group"><div class="nav-group-header" onclick="toggleGroup(this)"><div class="nav-group-header-left"><span class="nav-icon">⚠️</span> 异常与服务支持</div><span class="nav-group-arrow">▶</span></div>
        <div class="nav-sub">
          <div class="nav-sub-item${activeSub('exception-ticket-management.html')}" onclick="location.href='exception-ticket-management.html'">工单管理</div>
          <div class="nav-sub-item${activeSub('pallet-label-query.html')}" onclick="location.href='pallet-label-query.html'">板标查询</div>
          <div class="nav-sub-item${activeSub('ticket-rules-config.html')}" onclick="location.href='ticket-rules-config.html'">工单规则配置</div>
          <div class="nav-sub-item${activeSub('ticket-group-management.html')}" onclick="location.href='ticket-group-management.html'">工单处理组</div>
          <div class="nav-sub-item${activeSub('operation-instructions.html')}" onclick="location.href='operation-instructions.html'">操作指令</div>
        </div></div></div>
    ${SHOW_FINANCE_NAV ? `
    <div class="nav-section"><div class="nav-section-label">财务</div>
      <div class="nav-group"><div class="nav-group-header" onclick="toggleGroup(this)"><div class="nav-group-header-left"><span class="nav-icon">💰</span> 应收管理</div><span class="nav-group-arrow">▶</span></div>
        <div class="nav-sub">
          <div class="nav-sub-item${activeSub('ar-detail.html')}" onclick="location.href='ar-detail.html'">应收明细</div>
          <div class="nav-sub-item${activeSub('ar-summary.html')}" onclick="location.href='ar-summary.html'">应收汇总</div>
          <div class="nav-sub-item${activeSub('ar-invoice.html')}" onclick="location.href='ar-invoice.html'">应收账单管理</div>
          <div class="nav-sub-item${activeSub('ar-payment.html')}" onclick="location.href='ar-payment.html'">收款水单管理</div>
        </div></div>
      <div class="nav-group"><div class="nav-group-header" onclick="toggleGroup(this)"><div class="nav-group-header-left"><span class="nav-icon">💸</span> 应付管理</div><span class="nav-group-arrow">▶</span></div>
        <div class="nav-sub">
          <div class="nav-sub-item${activeSub('ap-detail.html')}" onclick="location.href='ap-detail.html'">应付明细</div>
          <div class="nav-sub-item${activeSub('ap-summary.html')}" onclick="location.href='ap-summary.html'">应付汇总</div>
          <div class="nav-sub-item${activeSub('ap-invoice.html')}" onclick="location.href='ap-invoice.html'">应付账单管理</div>
          <div class="nav-sub-item${activeSub('ap-payment.html')}" onclick="location.href='ap-payment.html'">付款凭证管理</div>
        </div></div>
      <div class="nav-group"><div class="nav-group-header" onclick="toggleGroup(this)"><div class="nav-group-header-left"><span class="nav-icon">🏷️</span> 应收报价配置</div><span class="nav-group-arrow">▶</span></div>
        <div class="nav-sub">
          <div class="nav-sub-item${activeSub('pricing-pickup-delivery.html')}" onclick="location.href='pricing-pickup-delivery.html'">提拆派报价</div>
          <div class="nav-sub-item${activeSub('pricing-warehouse-operation.html')}" onclick="location.href='pricing-warehouse-operation.html'">库内操作费</div>
        </div>
      </div>
    </div>
    ` : ''}
    <div class="nav-section"><div class="nav-section-label">配置</div>
      <div class="nav-group"><div class="nav-group-header" onclick="toggleGroup(this)"><div class="nav-group-header-left"><span class="nav-icon">🏬</span> 仓库设置</div><span class="nav-group-arrow">▶</span></div>
        <div class="nav-sub">
          <div class="nav-sub-item${activeSub('warehouse-list.html')}" onclick="location.href='warehouse-list.html'">仓库列表</div>
          <div class="nav-sub-item${activeSub('warehouse-zone.html')}" onclick="location.href='warehouse-zone.html'">仓库分区</div>
          <div class="nav-sub-item${activeSub('warehouse-location.html')}" onclick="location.href='warehouse-location.html'">库位管理</div>
        </div></div>
      <div class="nav-group"><div class="nav-group-header" onclick="toggleGroup(this)"><div class="nav-group-header-left"><span class="nav-icon">🗂️</span> 基础数据</div><span class="nav-group-arrow">▶</span></div>
        <div class="nav-sub">
          <div class="nav-sub-item${activeSub('customer-management.html')}" onclick="location.href='customer-management.html'">客户管理</div>
          <div class="nav-sub-item${activeSub('supplier-management.html')}" onclick="location.href='supplier-management.html'">供应商管理</div>
          <div class="nav-sub-item${activeSub('delivery-warehouse-config.html')}" onclick="location.href='delivery-warehouse-config.html'">派送仓库配置</div>
          <div class="nav-sub-item${activeSub('carrier-config.html')}" onclick="location.href='carrier-config.html'">船司配置</div>
          <div class="nav-sub-item${activeSub('zipcode-config.html')}" onclick="location.href='zipcode-config.html'">邮编配置</div>
          <div class="nav-sub-item${activeSub('highlight-mark-config.html')}" onclick="location.href='highlight-mark-config.html'">重点标记配置</div>
          <div class="nav-sub-item${activeSub('account-subjects.html')}" onclick="location.href='account-subjects.html'">费用项配置</div>
          <div class="nav-sub-item${activeSub('bank-accounts.html')}" onclick="location.href='bank-accounts.html'">银行账号</div>
        </div></div>
      <div class="nav-group"><div class="nav-group-header" onclick="toggleGroup(this)"><div class="nav-group-header-left"><span class="nav-icon">⚙️</span> 系统配置</div><span class="nav-group-arrow">▶</span></div>
        <div class="nav-sub">
          <div class="nav-sub-item${activeSub('organization-chart.html')}" onclick="location.href='organization-chart.html'">组织架构</div>
          <div class="nav-sub-item${activeSub('role-management.html')}" onclick="location.href='role-management.html'">角色管理</div>
          <div class="nav-sub-item${activeSub('user-management.html')}" onclick="location.href='user-management.html'">用户管理</div>
          <div class="nav-sub-item${activeSub('dictionary-management.html')}" onclick="location.href='dictionary-management.html'">字典管理</div>
        </div></div>
    </div>`;
}

// ── Nav group auto-open only when needed ──
let __navGroupsSynced = false;
function syncNavGroupsOpenState() {
  // 默认折叠所有分组，只展开含当前激活项的分组
  document.querySelectorAll('.nav-group').forEach(group => {
    const hasActive = group.querySelector('.nav-sub-item.active');
    group.classList.toggle('open', !!hasActive);
  });

  // Allow nav submenus to render after sync (avoid flicker)
  document.body.classList.add('nav-ready');
  __navGroupsSynced = true;
}

// ── Tab switching (list page) ──
function initTabs(container) {
  const el = container || document;
  el.querySelectorAll('.tabs .tab').forEach(tab => {
    tab.addEventListener('click', function () {
      this.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

// ── Detail tab switching ──
function switchDetailTab(el, panelId) {
  const wrap = el.closest('.detail-tabs').parentElement;
  el.closest('.detail-tabs').querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
  wrap.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add('active');
}

// ── Modal ──
function showModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('show');
    try {
      requestAnimationFrame(() => wirePersistentTableHScroll(el));
    } catch (_) {}
    try {
      if (id === 'modal-mark-issue') {
        resetIssueMarkPhotos();
        mountIssueMarkPhotoUpload();
      }
      if (id === 'modal-issue-detail') renderIssueDetailMarkPhotos();
    } catch (_) {}
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

// ── Query date-range unified picker (start/end in one panel) ──
function wireDateRanges(root) {
  const host = root || document;
  const wraps = host.querySelectorAll ? host.querySelectorAll('.date-range') : [];
  wraps.forEach((wrap) => {
    const dates = wrap.querySelectorAll ? wrap.querySelectorAll('input[type="date"]') : [];
    const from = dates && dates[0];
    const to = dates && dates[1];
    if (!from || !to) return;

    const phs = wrap.querySelectorAll ? wrap.querySelectorAll('.dr-ph') : [];
    const fromPh = phs && phs[0];
    const toPh = phs && phs[1];
    const sync = () => {
      if (fromPh) fromPh.style.display = from.value ? 'none' : 'block';
      if (toPh) toPh.style.display = to.value ? 'none' : 'block';
    };
    sync();
    const btn = wrap.querySelector ? wrap.querySelector('.dr-ico') : null;
    if (btn && !btn.dataset.boundPicker) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const open = (node) => {
          if (!node) return;
          try {
            if (typeof node.showPicker === 'function') node.showPicker();
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
      btn.dataset.boundPicker = '1';
    }
  });
}

function closeModalOutside(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

// ── Set active nav item ──
function setActiveNav(selector) {
  document.querySelectorAll('.nav-item, .nav-sub-item').forEach(el => el.classList.remove('active'));
  const el = document.querySelector(selector);
  if (el) {
    el.classList.add('active');
    const group = el.closest('.nav-group');
    if (group) group.classList.add('open');
  }
}

// ── Breadcrumb ──
function setBreadcrumb(items) {
  // items: [{label, href?, onclick?}]
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;
  bc.innerHTML = items.map((item, i) => {
    const isLast = i === items.length - 1;
    let html = '';
    if (i > 0) html += '<span class="sep">›</span>';
    if (isLast) {
      html += `<span class="current">${item.label}</span>`;
    } else if (item.onclick) {
      html += `<span class="link" onclick="${item.onclick}">${item.label}</span>`;
    } else {
      html += `<span>${item.label}</span>`;
    }
    return html;
  }).join('');
}

// ── Cargo row add/remove (new plan modal) ──
let _cargoRowCount = 1;

function addCargoRow(tbodyId, moveTypeOptions) {
  tbodyId = tbodyId || 'cargo-rows';
  _cargoRowCount++;
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  const options = (moveTypeOptions || [
    'FBA卡派','Walmart卡派','私卡派','自提','UPS','FedEx','DHL','USPS','留仓','扣货'
  ]).map(o => `<option>${o}</option>`).join('');

  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${_cargoRowCount}</td>
    <td><select class="form-select" style="height:28px;min-width:100px;font-size:12px;">${options}</select></td>
    <td><input class="form-input" style="height:28px;min-width:100px;font-size:12px;" placeholder="Ref No"></td>
    <td><input class="form-input" style="height:28px;min-width:90px;font-size:12px;" placeholder="FBA ID"></td>
    <td><input class="form-input" style="height:28px;min-width:70px;font-size:12px;" placeholder="PO"></td>
    <td><input class="form-input" style="height:28px;min-width:80px;font-size:12px;" placeholder="Code"></td>
    <td><input class="form-input" style="height:28px;min-width:140px;font-size:12px;" placeholder="Address"></td>
    <td><input class="form-input" style="height:28px;width:60px;font-size:12px;" placeholder="0"></td>
    <td><input class="form-input" style="height:28px;width:60px;font-size:12px;" placeholder="0.00"></td>
    <td><input class="form-input" style="height:28px;width:60px;font-size:12px;" placeholder="0"></td>
    <td><input class="form-input" style="height:28px;width:50px;font-size:12px;" placeholder="CA"></td>
    <td><input class="form-input" style="height:28px;width:70px;font-size:12px;" placeholder="Zip"></td>
    <td><button class="btn btn-default btn-xs text-danger" onclick="removeCargoRow(this)">删除</button></td>
  `;
  tbody.appendChild(row);
}

function removeCargoRow(btn) {
  btn.closest('tr').remove();
}

// ── Toast notification ──
function showToast(msg, type) {
  type = type || 'success';
  const colors = { success: '#4CAF50', danger: '#F44336', warning: '#FF9800', info: '#2196F3' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; top:20px; right:20px; z-index:9999;
    background:${colors[type] || colors.success}; color:#fff;
    padding:10px 18px; border-radius:8px; font-size:13px;
    box-shadow:0 4px 16px rgba(0,0,0,0.15);
    animation: toastIn 0.25s ease;
    font-family:'Noto Sans SC',sans-serif;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 2200);
  setTimeout(() => toast.remove(), 2600);
}

/* ── Shared confirm modal ── */
window.__sharedConfirmResolver = null;
function ensureSharedConfirmModal() {
  if (document.getElementById('modal-ui-confirm')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
  <div id="modal-ui-confirm" class="modal-overlay" onclick="closeModalOutside(event,'modal-ui-confirm')">
    <div class="modal" style="width:min(420px, calc(100vw - 36px));max-width:420px;border-radius:16px;box-shadow:0 22px 70px rgba(2,6,23,.28);">
      <div class="modal-header" style="padding:14px 18px;border-bottom:1px solid var(--border-light,#E2E8F0);">
        <span class="modal-title" id="ui-confirm-title" style="font-size:15px;font-weight:750;letter-spacing:.2px;">提示</span>
        <button class="modal-close" type="button" onclick="closeSharedConfirm(false)">✕</button>
      </div>
      <div class="modal-body" style="padding:16px 18px;">
        <div id="ui-confirm-desc" style="font-size:13px;color:var(--text-secondary,#334155);line-height:1.65;white-space:pre-wrap;">确认继续当前操作？</div>
      </div>
      <div class="modal-footer" style="padding:14px 18px;border-top:1px solid var(--border-light,#E2E8F0);display:flex;justify-content:flex-end;gap:10px;">
        <button class="btn btn-default" type="button" style="height:32px;line-height:32px;padding:0 14px;border-radius:10px;" onclick="closeSharedConfirm(false)">取消</button>
        <button class="btn btn-primary" type="button" style="height:32px;line-height:32px;padding:0 14px;border-radius:10px;" onclick="closeSharedConfirm(true)">确认</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(wrap.firstElementChild);
}

function openSharedConfirm(title, message) {
  ensureSharedConfirmModal();
  return new Promise((resolve) => {
    window.__sharedConfirmResolver = resolve;
    const t = document.getElementById('ui-confirm-title');
    const d = document.getElementById('ui-confirm-desc');
    if (t) t.textContent = String(title || '提示');
    if (d) d.textContent = String(message || '确认继续当前操作？');
    showModal('modal-ui-confirm');
  });
}

function closeSharedConfirm(result) {
  closeModal('modal-ui-confirm');
  const resolve = window.__sharedConfirmResolver;
  window.__sharedConfirmResolver = null;
  if (typeof resolve === 'function') resolve(Boolean(result));
}

/** 列表 / 详情 / 弹窗内宽表：自绘常驻横向条（与 client/_ui-kit.js 同思路） */
function isVerticallyBoundedTableHost(host) {
  if (!host || host.nodeType !== 1) return false;
  const ds = host.dataset && host.dataset.cpHscrollBounded;
  if (ds === '0' || ds === 'false') return false;
  if (ds === '1' || ds === 'true') return true;

  const imh = host.style && host.style.maxHeight;
  if (imh && imh !== 'none' && imh !== '') {
    const px = Number.parseFloat(imh);
    if (Number.isFinite(px) && px > 0) return true;
  }
  const ih = host.style && host.style.height;
  if (ih && ih !== 'auto' && ih !== '') {
    const px = Number.parseFloat(ih);
    if (Number.isFinite(px) && px > 0) return true;
  }

  const s = getComputedStyle(host);
  const mh = s.maxHeight;
  if (mh && mh !== 'none') {
    const px = Number.parseFloat(mh);
    if (Number.isFinite(px) && px > 0) return true;
  }
  // 不要用 getComputedStyle(host).height：height:auto 时仍会解析成内容高度的 px，
  // 会把列表 .table-wrap 误判为「有固定高度」，从而套上 .cp-y { overflow-y:auto } 出现嵌套纵滚条。
  return false;
}

/* 列表 .table-wrap 不注入 cp-hscroll：flex+内层 scrollport 在部分环境下仍会出现右侧纵轨/嵌套滚动手感。
   列表横向滚动交给 common.css 中 .table-wrap { overflow-x:auto; overflow-y:hidden }。 */
const TABLE_HSCROLL_HOST_SEL = [
  '.cp-table-scroll',
  '.cargo-table-scroll',
  '.report-cargo-table-scroll',
  '.meekoo-hscroll',
].join(', ');

function installPersistentTableHScroll(host) {
  if (!host || host.nodeType !== 1) return;
  const skipH = host.getAttribute && host.getAttribute('data-cp-hscroll');
  if (skipH === 'off' || skipH === '0' || skipH === 'false') return;
  if (host.dataset.cpHscroll === '1') return;
  if (host.closest('.cp-x')) return;
  if (host.querySelector(':scope > .cp-x')) return;

  const bounded = isVerticallyBoundedTableHost(host);
  const x = document.createElement('div');
  x.className = 'cp-x';
  while (host.firstChild) x.appendChild(host.firstChild);

  const hbar = document.createElement('div');
  hbar.className = 'cp-hbar';
  hbar.setAttribute('aria-hidden', 'true');
  const track = document.createElement('div');
  track.className = 'cp-hbar-track';
  const thumb = document.createElement('div');
  thumb.className = 'cp-hbar-thumb';
  hbar.appendChild(track);
  hbar.appendChild(thumb);

  host.classList.add('cp-hscroll-host');
  if (bounded) host.classList.add('cp-hscroll--bounded');
  if (bounded) {
    const y = document.createElement('div');
    y.className = 'cp-y';
    y.appendChild(x);
    host.appendChild(y);
  } else {
    host.appendChild(x);
  }
  host.appendChild(hbar);
  host.dataset.cpHscroll = '1';

  const scrollEl = x;
  const sync = () => {
    const max = scrollEl.scrollWidth - scrollEl.clientWidth;
    if (max <= 2) {
      hbar.setAttribute('hidden', '');
      return;
    }
    hbar.removeAttribute('hidden');
    const tw = track.clientWidth;
    if (tw <= 0) return;
    const ratio = scrollEl.clientWidth / scrollEl.scrollWidth;
    const thumbW = Math.max(24, Math.floor(tw * ratio));
    const maxLeft = Math.max(0, tw - thumbW);
    const left = max <= 0 ? 0 : Math.round((scrollEl.scrollLeft / max) * maxLeft);
    thumb.style.width = `${thumbW}px`;
    thumb.style.left = `${left}px`;
  };

  scrollEl.addEventListener('scroll', sync, { passive: true });
  const ro = new ResizeObserver(() => requestAnimationFrame(sync));
  ro.observe(scrollEl);
  ro.observe(track);
  const mo = new MutationObserver(() => requestAnimationFrame(sync));
  mo.observe(scrollEl, { childList: true, subtree: true, attributes: true });

  track.addEventListener('pointerdown', (e) => {
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
  thumb.addEventListener('pointerdown', (e) => {
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
    } catch (_) {}
  });
  thumb.addEventListener('pointermove', (e) => {
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
    } catch (_) {}
    drag = null;
  };
  thumb.addEventListener('pointerup', endDrag);
  thumb.addEventListener('pointercancel', endDrag);
  thumb.addEventListener('lostpointercapture', () => {
    drag = null;
  });

  hbar.addEventListener(
    'wheel',
    (e) => {
      if (hbar.hasAttribute('hidden')) return;
      e.preventDefault();
      scrollEl.scrollLeft += e.deltaY + e.deltaX;
      sync();
    },
    { passive: false }
  );

  requestAnimationFrame(sync);
  window.addEventListener('load', sync, { once: true });
}

/** 旧版曾给 .table-wrap 注入 cp-x/cp-y；拆掉后恢复为「表直接在 .table-wrap 内」，避免缓存 HTML+旧脚本残留结构 */
function migrateLegacyTableWrapHscroll() {
  try {
    document.querySelectorAll('.table-wrap.cp-hscroll-host').forEach((host) => {
      const hbar = host.querySelector(':scope > .cp-hbar');
      const y = host.querySelector(':scope > .cp-y');
      const x = y ? y.querySelector(':scope > .cp-x') : host.querySelector(':scope > .cp-x');
      if (!x) {
        if (hbar) hbar.remove();
        host.classList.remove('cp-hscroll-host', 'cp-hscroll--bounded');
        delete host.dataset.cpHscroll;
        return;
      }
      const anchor = y || x;
      while (x.firstChild) host.insertBefore(x.firstChild, anchor);
      if (y) y.remove();
      else x.remove();
      if (hbar) hbar.remove();
      host.classList.remove('cp-hscroll-host', 'cp-hscroll--bounded');
      delete host.dataset.cpHscroll;
    });
  } catch (_) {}
}

function wirePersistentTableHScroll(root) {
  const doc = root && root.querySelectorAll ? root : document;
  try {
    doc.querySelectorAll(TABLE_HSCROLL_HOST_SEL).forEach((host) => installPersistentTableHScroll(host));
  } catch (_) {}
}

let __tableHScrollMoInstalled = false;
function installDynamicTableHScrollObserver() {
  if (__tableHScrollMoInstalled) return;
  __tableHScrollMoInstalled = true;
  let tid;
  const flush = () => {
    clearTimeout(tid);
    tid = setTimeout(() => wirePersistentTableHScroll(document), 100);
  };
  try {
    const mo = new MutationObserver(flush);
    if (document.body) mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  } catch (_) {}
}

// ── 问题件 · 问题照片（标记 / 详情）──
const ISSUE_MARK_PHOTO_MAX = 9;
const ISSUE_MARK_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic';
let __issueMarkPhotos = [];

const ISSUE_DEMO_MARK_PHOTOS = [
  { name: '外包装破损-01.jpg', tone: '#FECACA' },
  { name: '标签污损-02.jpg', tone: '#FED7AA' },
  { name: '少件清点-03.jpg', tone: '#BFDBFE' },
];

function getIssueMarkPhotos() {
  return __issueMarkPhotos;
}

function resetIssueMarkPhotos() {
  __issueMarkPhotos.forEach((item) => {
    try {
      if (item && item.url) URL.revokeObjectURL(item.url);
    } catch (_) {}
  });
  __issueMarkPhotos = [];
  renderIssueMarkPhotoGrid();
}

function mountIssueMarkPhotoUpload() {
  const modal = document.getElementById('modal-mark-issue');
  if (!modal) return;
  const body = modal.querySelector('.modal-body');
  if (!body || body.querySelector('[data-issue-photo-upload]')) return;

  const wrap = document.createElement('div');
  wrap.setAttribute('data-issue-photo-upload', '');
  wrap.className = 'form-field mt-12';
  wrap.innerHTML =
    '<label class="form-label">问题照片 <span class="req">*</span></label>' +
    '<div class="issue-photo-toolbar">' +
    '<input type="file" id="mark-issue-photo-input" accept="' + ISSUE_MARK_PHOTO_ACCEPT + '" multiple capture="environment" style="display:none">' +
    '<button type="button" class="btn btn-default btn-sm" id="mark-issue-photo-pick">📷 上传照片</button>' +
    '<span class="issue-photo-hint">支持 JPG/PNG/WEBP，至少 1 张，最多 ' + ISSUE_MARK_PHOTO_MAX + ' 张</span>' +
    '</div>' +
    '<div class="issue-photo-grid" id="mark-issue-photo-grid"></div>';

  body.appendChild(wrap);

  const pickBtn = document.getElementById('mark-issue-photo-pick');
  const input = document.getElementById('mark-issue-photo-input');
  if (pickBtn && input) {
    pickBtn.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const files = input.files ? Array.from(input.files) : [];
      addIssueMarkPhotos(files);
      input.value = '';
    });
  }

  const footerBtn = modal.querySelector('.modal-footer .btn-danger');
  if (footerBtn && !footerBtn.dataset.issueBound) {
    footerBtn.dataset.issueBound = '1';
    footerBtn.setAttribute('onclick', 'confirmMarkIssueShipment()');
  }

  renderIssueMarkPhotoGrid();
}

function addIssueMarkPhotos(files) {
  const list = (files || []).filter((f) => f && String(f.type || '').startsWith('image/'));
  if (!list.length) {
    showToast('请选择图片文件', 'warning');
    return;
  }
  const room = ISSUE_MARK_PHOTO_MAX - __issueMarkPhotos.length;
  if (room <= 0) return showToast('最多上传 ' + ISSUE_MARK_PHOTO_MAX + ' 张照片', 'warning');
  list.slice(0, room).forEach((file) => {
    __issueMarkPhotos.push({ file, url: URL.createObjectURL(file), name: file.name || 'photo.jpg' });
  });
  if (list.length > room) showToast('已超出上限，仅保留前 ' + ISSUE_MARK_PHOTO_MAX + ' 张', 'warning');
  renderIssueMarkPhotoGrid();
}

function removeIssueMarkPhoto(idx) {
  const item = __issueMarkPhotos[idx];
  if (item && item.url) {
    try { URL.revokeObjectURL(item.url); } catch (_) {}
  }
  __issueMarkPhotos.splice(idx, 1);
  renderIssueMarkPhotoGrid();
}

function renderIssueMarkPhotoGrid() {
  const grid = document.getElementById('mark-issue-photo-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!__issueMarkPhotos.length) {
    const empty = document.createElement('div');
    empty.className = 'issue-photo-empty';
    empty.textContent = '请上传问题现场照片';
    grid.appendChild(empty);
    return;
  }
  __issueMarkPhotos.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'issue-photo-card';
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.name || '';
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'issue-photo-remove';
    rm.title = '删除';
    rm.setAttribute('aria-label', '删除');
    rm.textContent = '×';
    rm.addEventListener('click', () => removeIssueMarkPhoto(idx));
    const name = document.createElement('span');
    name.className = 'issue-photo-name';
    name.textContent = item.name || '';
    card.appendChild(img);
    card.appendChild(rm);
    card.appendChild(name);
    grid.appendChild(card);
  });
}

function confirmMarkIssueShipment() {
  const modal = document.getElementById('modal-mark-issue');
  if (!modal) return false;
  const typeSel = modal.querySelector('.modal-body select');
  const descTa = modal.querySelector('.modal-body textarea');
  const type = (typeSel && typeSel.value ? String(typeSel.value) : '').trim();
  const desc = (descTa && descTa.value ? String(descTa.value) : '').trim();
  if (!type) {
    showToast('请选择问题类型', 'warning');
    return false;
  }
  if (!desc) {
    showToast('请填写问题描述', 'warning');
    return false;
  }
  if (!__issueMarkPhotos.length) {
    showToast('请上传至少 1 张问题照片', 'warning');
    return false;
  }
  showToast('已标记为问题件', 'warning');
  closeModal('modal-mark-issue');
  resetIssueMarkPhotos();
  if (typeSel) typeSel.value = '';
  if (descTa) descTa.value = '';
  return true;
}

function mountIssueDetailMarkPhotos() {
  const modal = document.getElementById('modal-issue-detail');
  if (!modal || modal.querySelector('#issue-detail-mark-photos')) return;
  const situation = modal.querySelector('.modal-body [style*="FEF2F2"]');
  const hostCard = situation ? situation.closest('div[style*="background:#fff"]') : null;
  if (!hostCard) return;

  const section = document.createElement('div');
  section.className = 'mt-12';
  const title = document.createElement('div');
  title.className = 'issue-photo-section-title';
  title.textContent = '问题照片';
  const grid = document.createElement('div');
  grid.className = 'issue-photo-grid issue-photo-grid--readonly';
  grid.id = 'issue-detail-mark-photos';
  section.appendChild(title);
  section.appendChild(grid);
  hostCard.appendChild(section);
}

function renderIssueDetailMarkPhotos() {
  mountIssueDetailMarkPhotos();
  const grid = document.getElementById('issue-detail-mark-photos');
  if (!grid) return;
  grid.innerHTML = '';
  ISSUE_DEMO_MARK_PHOTOS.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'issue-photo-card';
    const ph = document.createElement('div');
    ph.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:' + p.tone + ';font-size:28px';
    ph.textContent = '📷';
    const name = document.createElement('span');
    name.className = 'issue-photo-name';
    name.textContent = p.name;
    card.appendChild(ph);
    card.appendChild(name);
    grid.appendChild(card);
  });
}

function initIssuePhotoModals() {
  mountIssueMarkPhotoUpload();
  mountIssueDetailMarkPhotos();
}

// ── Init ──
function initCommon() {
  renderSharedSidebar();
  // 关键：先渲染侧栏，再同步展开状态，避免跨页后被默认样式折叠
  syncNavGroupsOpenState();

  // ── 恢复侧边栏滚动位置 ──
  const sidebar = document.querySelector('nav.sidebar');
  if (sidebar) {
    const savedScroll = sessionStorage.getItem('meekoo_sidebar_scroll');
    const activeItem = sidebar.querySelector('.active');
    
    const restoreScroll = () => {
      if (savedScroll) {
        sidebar.scrollTop = parseInt(savedScroll, 10);
      } else if (activeItem) {
        // 初次访问没有缓存时，自动滚动将当前激活菜单定位到视野居中
        activeItem.scrollIntoView({ block: 'center' });
      }
    };
    
    restoreScroll();
    setTimeout(restoreScroll, 250); // 因为菜单分组有 0.22s 的展开动画，延迟一次补正确保高度充足
    
    sidebar.addEventListener('scroll', () => {
      sessionStorage.setItem('meekoo_sidebar_scroll', sidebar.scrollTop);
    }, { passive: true });
  }

  initTabs();
  wireDateRanges(document);
  migrateLegacyTableWrapHscroll();
  wirePersistentTableHScroll(document);
  installDynamicTableHScrollObserver();
  if (typeof COL_GROUPS !== 'undefined') colRender();
  initAutoColumnCustomizer();
  normalizePaginations();
  initIssuePhotoModals();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initCommon();
  });
} else {
  initCommon();
}

// ── Pagination: normalize to 提拆派计划 layout ──
function normalizePaginations() {
  document.querySelectorAll('.pagination').forEach(p => {
    const info = p.querySelector('.pagination-info');
    let right = p.querySelector('.pagination-right');

    // Ensure base blocks exist
    if (!info) {
      const div = document.createElement('div');
      div.className = 'pagination-info';
      div.textContent = '共 0 条';
      p.prepend(div);
    } else {
      // Remove inconsistent suffix like “（示例）”
      info.textContent = (info.textContent || '')
        .replace(/（\s*示例[^）]*\s*）/g, '')
        .replace(/\(\s*示例[^)]*\s*\)/g, '')
        .trim();
    }
    if (!right) {
      right = document.createElement('div');
      right.className = 'pagination-right';
      p.appendChild(right);
    }

    // If already matches 提拆派（含跳页输入框和总页数），不处理
    if (right.querySelector('.page-input') && right.textContent.includes('/')) return;

    // Try to infer total pages from existing numeric buttons (fallback to 1)
    const nums = [...right.querySelectorAll('.page-btn')]
      .map(b => (b.textContent || '').trim())
      .filter(t => /^\d+$/.test(t))
      .map(t => Number(t));
    const totalPages = Math.max(1, ...(nums.length ? nums : [1]));

    // Current page: active button or 1
    const activeBtn = right.querySelector('.page-btn.active');
    const currentPage = activeBtn ? Number((activeBtn.textContent || '1').trim()) || 1 : 1;

    // Page size options: keep existing if present, else 10/20/50
    const existSelect = right.querySelector('.page-size-select');
    const pageSizeHtml = existSelect
      ? existSelect.outerHTML
      : `<select class="page-size-select"><option>10</option><option>20</option><option>50</option></select>`;

    // Build buttons (at least 1..min(3,totalPages) for consistent look)
    const pageButtons = [];
    const maxShow = Math.min(3, totalPages);
    for (let i = 1; i <= maxShow; i++) {
      pageButtons.push(`<button class="page-btn ${i === currentPage ? 'active' : ''}">${i}</button>`);
    }

    const prevDisabled = currentPage <= 1;
    const nextDisabled = currentPage >= totalPages;

    // 保留原「上一页 / 下一页」按钮的 id，避免整段替换后其它脚本的 getElementById 失效（如 fba-load-management 的 initPage）
    let prevBtnId = '';
    let nextBtnId = '';
    right.querySelectorAll('button.page-btn').forEach((b) => {
      const id = (b.getAttribute('id') || '').trim();
      if (!id || !/^[-A-Za-z0-9_]+$/.test(id)) return;
      const t = (b.textContent || '').replace(/\s+/g, '');
      if (/上一页|‹/.test(t)) prevBtnId = id;
      if (/下一页|›/.test(t)) nextBtnId = id;
    });
    const prevIdAttr = prevBtnId ? ` id="${prevBtnId}"` : '';
    const nextIdAttr = nextBtnId ? ` id="${nextBtnId}"` : '';

    right.innerHTML = `
      每页
      ${pageSizeHtml}
      条
      <button class="page-btn"${prevIdAttr}${prevDisabled ? ' disabled' : ''}>‹ 上一页</button>
      ${pageButtons.join('')}
      <button class="page-btn"${nextIdAttr}${nextDisabled ? ' disabled' : ''}>下一页 ›</button>
      <span class="text-muted">第</span>
      <input class="page-input" value="${currentPage}">
      <span class="text-muted">/ ${totalPages} 页</span>
    `;
  });
}

// ════ 自定义列通用函数 ════
function colRender() {
  const container = document.getElementById('col-groups');
  if (!container || typeof COL_GROUPS === 'undefined') return;
  container.innerHTML = COL_GROUPS.map((g, gi) => {
    const checkedCount = g.cols.filter(c => c.def || c.locked).length;
    const items = g.cols.map(c =>
      `<label class="col-check-item ${c.locked ? 'col-check-locked' : ''}" data-label="${c.label}">
        <input type="checkbox"
          ${c.def || c.locked ? 'checked' : ''}
          ${c.locked ? 'disabled' : ''}
          data-default="${c.def ? 1 : 0}"
          data-col-idx="${typeof c.idx === 'number' ? c.idx : ''}"
          onchange="colUpdateCount()">
        ${c.label}
      </label>`
    ).join('');
    return `
      <div class="col-group" data-gi="${gi}">
        <div class="col-group-header" onclick="colToggleGroup(this.closest('.col-group'))">
          <div class="col-group-header-left">
            <span class="col-group-arrow">▼</span>
            <span class="col-group-name">${g.name}</span>
            <span class="col-group-count" id="col-gc-${gi}">${checkedCount}/${g.cols.length}</span>
          </div>
          <button class="col-group-select-btn"
            onclick="event.stopPropagation();colGroupToggleAll(this.closest('.col-group'))">全选本组</button>
        </div>
        <div class="col-group-body">
          <div class="col-check-grid">${items}</div>
        </div>
      </div>`;
  }).join('');
  colUpdateCount();
}

function colToggleGroup(groupEl) { groupEl.classList.toggle('collapsed'); }

function colGroupToggleAll(groupEl) {
  const cbs = [...groupEl.querySelectorAll('.col-group-body input[type="checkbox"]')].filter(cb => !cb.disabled);
  const allChecked = cbs.length > 0 && cbs.every(cb => cb.checked);
  cbs.forEach(cb => cb.checked = !allChecked);
  groupEl.querySelector('.col-group-select-btn').textContent = allChecked ? '全选本组' : '取消全选';
  colUpdateCount();
}

function colUpdateCount() {
  const selected = document.querySelectorAll('#col-groups input[type="checkbox"]:checked').length;
  const locked = document.querySelectorAll('#col-fixed-cols input[type="checkbox"]').length;
  const total = selected + locked;
  const el = document.getElementById('col-selected-count');
  if (el) el.textContent = `已选 ${total} 列`;
  document.querySelectorAll('.col-group').forEach(g => {
    const gi = g.dataset.gi;
    const checked = g.querySelectorAll('input:checked').length;
    const all = g.querySelectorAll('input').length;
    const countEl = document.getElementById(`col-gc-${gi}`);
    if (countEl) countEl.textContent = `${checked}/${all}`;
    const btn = g.querySelector('.col-group-select-btn');
    if (btn) btn.textContent = checked === all ? '取消全选' : '全选本组';
  });
}

function colSearch(query) {
  const q = query.trim().toLowerCase();
  let totalVisible = 0;
  document.querySelectorAll('.col-group').forEach(g => {
    let groupVisible = 0;
    g.querySelectorAll('.col-check-item[data-label]').forEach(item => {
      const match = !q || item.dataset.label.toLowerCase().includes(q);
      item.classList.toggle('col-item-hidden', !match);
      if (match) groupVisible++;
    });
    g.style.display = groupVisible === 0 ? 'none' : '';
    if (q) g.classList.remove('collapsed');
    totalVisible += groupVisible;
  });
  const nr = document.getElementById('col-no-result');
  if (nr) nr.style.display = totalVisible === 0 ? '' : 'none';
}

function colCheckAll(checked) {
  document.querySelectorAll('#col-groups input[type="checkbox"]').forEach(cb => { if (!cb.disabled) cb.checked = checked; });
  colUpdateCount();
}

function colResetDefault() {
  document.querySelectorAll('#col-groups input[type="checkbox"]').forEach(cb => {
    if (!cb.disabled) cb.checked = cb.dataset.default === '1';
  });
  colUpdateCount();
}

function colModalOpen() {
  const inp = document.getElementById('col-search-input');
  if (inp) { inp.value = ''; colSearch(''); }
  document.querySelectorAll('.col-group').forEach(g => {
    g.style.display = ''; g.classList.remove('collapsed');
  });
  const nr = document.getElementById('col-no-result');
  if (nr) nr.style.display = 'none';
  showModal('modal-col-setting');
}

// ════ 自定义列（自动适配所有列表页） ════
function initAutoColumnCustomizer() {
  try {
    // Pages that already provide custom COL_GROUPS keep their own implementation.
    if (typeof COL_GROUPS !== 'undefined') return;

    const cards = document.querySelectorAll('.table-card');
    if (!cards || cards.length === 0) return;

    cards.forEach((card, idx) => {
      const table = card.querySelector('table.data-table');
      if (!table) return;

      const toolbar = card.querySelector('.table-toolbar');
      if (!toolbar) return;

      // De-duplicate "自定义列" buttons in the same toolbar (some pages already have one)
      const colBtns = [...toolbar.querySelectorAll('.btn-col-setting, button[title="自定义列"]')]
        .filter(b => (b.textContent || '').includes('自定义列'));
      if (colBtns.length > 1) {
        colBtns.slice(1).forEach(b => b.remove());
      }

      // Cleanup legacy auto divider (previous versions inserted a vertical line)
      [...toolbar.querySelectorAll('div')].forEach(d => {
        const w = (d.style.width || '').trim();
        const bg = (d.style.background || '').trim();
        const as = (d.style.alignSelf || '').trim();
        const m = (d.style.margin || '').trim();
        if (w === '1px' && bg.includes('var(--border)') && as === 'stretch' && m === '0px 4px') {
          d.remove();
        }
      });

      // Auto insert button if missing
      if (!toolbar.querySelector('.btn-col-setting')) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-default btn-col-setting';
        btn.type = 'button';
        btn.title = '自定义列';
        btn.style.padding = '0 10px';
        btn.style.color = 'var(--text-secondary)';
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="margin-right:4px;vertical-align:-2px;">
            <rect x="1" y="1" width="3" height="12" rx="1" fill="currentColor" opacity=".35"></rect>
            <rect x="5.5" y="1" width="3" height="12" rx="1" fill="currentColor"></rect>
            <rect x="10" y="1" width="3" height="12" rx="1" fill="currentColor" opacity=".35"></rect>
          </svg>自定义列`;

        // match 提拆派：按钮放工具条最右侧 + 分割线
        if (!toolbar.querySelector('.ml-auto')) {
          btn.classList.add('ml-auto');
        }
        toolbar.appendChild(btn);
      }

      const btn = toolbar.querySelector('.btn-col-setting');
      if (!btn) return;

      // Build modal once per page
      ensureColSettingModal();

      // Build COL_GROUPS from table headers
      const ths = [...table.querySelectorAll('thead th')];
      if (ths.length === 0) return;

      const lockedIdx = new Set();
      ths.forEach((th, i) => {
        const text = (th.textContent || '').trim();
        if (i === 0) lockedIdx.add(i); // checkbox column
        if (text === '操作') lockedIdx.add(i);
      });

      const storageKey = `colSetting:${location.pathname}::${idx}`;
      const saved = safeParseJSON(localStorage.getItem(storageKey), null);

      // Fixed columns (always show) render in modal fixed area, not in groups
      table.dataset.lockedIdx = JSON.stringify([...lockedIdx]);

      window.COL_GROUPS = [{
        name: '基础信息',
        cols: ths
          .map((th, i) => ({ th, i }))
          .filter(x => !lockedIdx.has(x.i))
          .map(x => {
            const label = ((x.th.textContent || '').trim() || `列${x.i + 1}`);
            const def = saved ? !!saved.includes(x.i) : true;
            return { label, idx: x.i, def, locked: false };
          })
      }];

      colRender();
      renderFixedCols(ths, lockedIdx);
      applyColumnsByIndex(table, getCheckedColumnIndices(), [...lockedIdx]);

      btn.onclick = () => {
        // refresh defaults to current selection before open
        renderFixedCols(ths, lockedIdx);
        syncModalFromTable(table);
        colModalOpen();
        bindColConfirmOnce(table, storageKey);
      };
    });
  } catch (e) {
    // fail silently for non-list pages
  }
}

function renderFixedCols(ths, lockedIdxSet) {
  const box = document.getElementById('col-fixed-cols');
  if (!box) return;
  const items = [...lockedIdxSet]
    .sort((a, b) => a - b)
    .map(i => {
      const label = ((ths[i]?.textContent || '').trim() || `列${i + 1}`);
      return `<label class="col-check-item col-check-locked"><input type="checkbox" checked disabled> ${label}</label>`;
    })
    .join('');
  box.innerHTML = items || `<span style="color:var(--text-muted);font-size:12px;">无</span>`;
}

function ensureColSettingModal() {
  if (document.getElementById('modal-col-setting')) return;
  const wrap = document.createElement('div');
  // Match 提拆派计划页面的弹窗结构/布局
  wrap.innerHTML = `
  <div id="modal-col-setting" class="modal-overlay" onclick="closeModalOutside(event,'modal-col-setting')">
    <div class="modal" style="width:540px;max-height:88vh;display:flex;flex-direction:column;">
      <div class="modal-header" style="flex-shrink:0;">
        <span class="modal-title">自定义列</span>
        <button class="modal-close" onclick="closeModal('modal-col-setting')">✕</button>
      </div>

      <!-- 搜索框 -->
      <div style="padding:10px 20px;border-bottom:1px solid var(--border);flex-shrink:0;position:relative;">
        <span style="position:absolute;left:30px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px;pointer-events:none;">🔍</span>
        <input id="col-search-input" class="search-input" style="width:100%;padding-left:32px;"
               placeholder="搜索列名称…" oninput="colSearch(this.value)">
      </div>

      <!-- 固定列 -->
      <div style="padding:10px 20px;border-bottom:1px solid var(--border);flex-shrink:0;background:var(--bg);">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600;letter-spacing:.5px;margin-bottom:6px;">固定列（始终显示）</div>
        <div id="col-fixed-cols" style="display:flex;gap:20px;flex-wrap:wrap;"></div>
      </div>

      <!-- 分组列表（可滚动） -->
      <div style="flex:1;overflow-y:auto;padding:0 20px;" id="col-panel-body">
        <div id="col-groups"></div>
        <div id="col-no-result" class="col-no-result" style="display:none;">没有匹配的列名称</div>
      </div>

      <!-- 底部操作栏 -->
      <div class="modal-footer" style="justify-content:space-between;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:14px;font-size:12px;">
          <span id="col-selected-count" style="color:var(--text-secondary);"></span>
          <span style="color:var(--primary);cursor:pointer;" onclick="colCheckAll(true)">全选</span>
          <span style="color:var(--text-muted);">·</span>
          <span style="color:var(--text-secondary);cursor:pointer;" onclick="colCheckAll(false)">全不选</span>
          <span style="color:var(--text-muted);">·</span>
          <span style="color:var(--text-secondary);cursor:pointer;" onclick="colResetDefault()">恢复默认</span>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-default" onclick="closeModal('modal-col-setting')">取消</button>
          <button id="col-confirm-btn" class="btn btn-primary" type="button">确认</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(wrap.firstElementChild);
}

function bindColConfirmOnce(table, storageKey) {
  const btn = document.getElementById('col-confirm-btn');
  if (!btn) return;
  btn.onclick = () => {
    const selected = getCheckedColumnIndices();
    localStorage.setItem(storageKey, JSON.stringify(selected));
    const locked = safeParseJSON(table.dataset.lockedIdx || '[]', []);
    applyColumnsByIndex(table, selected, locked);
    showToast('列设置已保存', 'success');
    closeModal('modal-col-setting');
  };
}

function getCheckedColumnIndices() {
  const out = [];
  document.querySelectorAll('#col-groups input[type="checkbox"]').forEach(cb => {
    const idx = Number(cb.dataset.colIdx);
    if ((cb.checked || cb.disabled) && Number.isFinite(idx)) out.push(idx);
  });
  return out;
}

function applyColumnsByIndex(table, selectedIdx, lockedIdx) {
  const keep = new Set([...(selectedIdx || []), ...(lockedIdx || [])]);
  const rows = table.querySelectorAll('tr');
  rows.forEach(tr => {
    [...tr.children].forEach((cell, i) => {
      cell.style.display = keep.has(i) ? '' : 'none';
    });
  });
}

function syncModalFromTable(table) {
  // When modal opens, keep current visible columns checked (if user adjusted via saved settings)
  const headerCells = [...table.querySelectorAll('thead th')];
  const visibleIdx = headerCells.map((th, i) => ({ i, visible: th.style.display !== 'none' }))
    .filter(x => x.visible).map(x => x.i);
  const visibleSet = new Set(visibleIdx);
  document.querySelectorAll('#col-groups input[type="checkbox"]').forEach(cb => {
    const idx = Number(cb.dataset.colIdx);
    if (!Number.isFinite(idx) || cb.disabled) return;
    cb.checked = visibleSet.has(idx);
  });
  colUpdateCount();
}

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

try {
  window.wirePersistentTableHScroll = wirePersistentTableHScroll;
  window.installPersistentTableHScroll = installPersistentTableHScroll;
} catch (_) {}

/* ── 员工端查询区：默认仅展示前两行 .search-grid / .search-grid-5，其余收入「展开更多」（全站 .search-card） ── */
(function initAdminSearchExpand() {
  const GRID_ROW_SEL = '.search-grid, .search-grid-5';

  function directGridRows(card) {
    const rows = [];
    for (const node of card.children) {
      if (node.nodeType === 1 && node.matches(GRID_ROW_SEL)) rows.push(node);
    }
    return rows;
  }

  function wrapOverflowGrids(card) {
    if (card.closest('.modal-overlay')) return;
    if (card.querySelector(':scope > .search-header')) return;
    if (card.querySelector(':scope > .search-more')) return;

    const grids = directGridRows(card);
    if (grids.length <= 2) return;

    const more = document.createElement('div');
    more.className = 'search-more';
    more.setAttribute('aria-hidden', 'true');

    grids[1].insertAdjacentElement('afterend', more);
    for (let i = 2; i < grids.length; i++) more.appendChild(grids[i]);
  }

  function ensureToggle(card) {
    const actions = card.querySelector(':scope > .search-actions');
    const more = card.querySelector(':scope > .search-more');
    if (!actions || !more || actions.querySelector('.search-toggle')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'search-toggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML =
      '<span class="search-toggle-label">展开更多</span>' +
      '<span class="search-toggle-badge filter-count" style="display:none" aria-hidden="true"></span>' +
      '<span class="toggle-arrow" aria-hidden="true">▼</span>';
    actions.appendChild(btn);
  }

  function updateFilterBadge(more) {
    const card = more.closest('.search-card');
    if (!card) return;
    const btn = card.querySelector('.search-toggle');
    if (!btn) return;
    const badge = btn.querySelector('.search-toggle-badge');
    if (!badge) return;
    let count = 0;
    more.querySelectorAll('input, select').forEach((el) => {
      const v = el.value != null ? String(el.value).trim() : '';
      if (v !== '') count++;
    });
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  function bindMore(more) {
    const onChange = () => updateFilterBadge(more);
    more.addEventListener('change', onChange);
    more.addEventListener('input', onChange);
    updateFilterBadge(more);
  }

  function toggleExpand(btn) {
    const card = btn.closest('.search-card');
    if (!card) return;
    const more = card.querySelector(':scope > .search-more');
    if (!more) return;
    const isOpen = more.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', String(isOpen));
    const label = btn.querySelector('.search-toggle-label');
    if (label) label.textContent = isOpen ? '收起' : '展开更多';
    more.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }

  function run() {
    document.querySelectorAll('.search-card').forEach((card) => {
      wrapOverflowGrids(card);
      ensureToggle(card);
      const more = card.querySelector(':scope > .search-more');
      if (more) bindMore(more);
    });
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.search-card .search-actions .search-toggle');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    toggleExpand(btn);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
