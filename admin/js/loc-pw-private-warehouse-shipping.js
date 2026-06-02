/**
 * 本地 / 外州私仓发货列表：按状态渲染行操作、状态流转（演示）
 */
(function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function locPwFindRow(bol) {
    return document.querySelector('tr[data-loc-pw-bol="' + bol.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
  }

  function locPwGetRowStatus(tr) {
    var badge = tr.querySelector('.status-badge');
    return badge ? badge.textContent.trim() : '';
  }

  function locPwGetShipMode(tr) {
    if (tr.querySelector('.loc-pw-ship-mode--split')) return 'split';
    if (tr.querySelector('.loc-pw-ship-mode--merge')) return 'merge';
    return 'normal';
  }

  /** 演示：BOL 关联板标明细（字段对齐板标查询 · 按板标明细） */
  var LOC_PW_PALLET_LABELS = {
    'BOL-2026-0401': [
      { pltNo: 'PLT-LAX-301', status: '已上架', location: 'A-12-03', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 15, container: 'MSKU1234567', sysNo: 'EXP-2026-0401' },
      { pltNo: 'PLT-LAX-302', status: '已上架', location: 'A-12-04', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 20, container: 'MSKU2233445', sysNo: 'EXP-2026-0402' },
      { pltNo: 'PLT-LAX-303', status: '待上架', location: 'B-05-02', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 12, container: 'MSKU3390008', sysNo: 'EXP-2026-0403' },
      { pltNo: 'PLT-LAX-304', status: '已上架', location: 'B-05-03', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 13, container: 'MSKU3390008', sysNo: 'EXP-2026-0403' }
    ],
    'BOL-2026-0402': [
      { pltNo: 'PLT-LAX-401', status: '已上架', location: 'A-01-02', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 8, container: 'MSKU2234567', sysNo: 'EXP-2026-0402' },
      { pltNo: 'PLT-LAX-402', status: '已上架', location: 'A-01-03', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 14, container: 'MSKU2234567', sysNo: 'EXP-2026-0402' }
    ],
    'BOL-2026-0403': [
      { pltNo: 'PLT-LAX-310', status: '已上架', location: 'B-02-01', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 12, container: 'MSKU3390001', sysNo: 'EXP-2026-0403' },
      { pltNo: 'PLT-LAX-311', status: '待上架', location: 'B-02-02', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 11, container: 'MSKU3390001', sysNo: 'EXP-2026-0403' },
      { pltNo: 'PLT-LAX-312', status: '已上架', location: 'B-02-03', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 12, container: 'MSKU3390001', sysNo: 'EXP-2026-0403' }
    ],
    'BOL-2026-0408': [
      { pltNo: 'PLT-LAX-501', status: '已上架', location: 'C-03-01', warehouseZone: 'C区暂存区', warehouseName: 'LA1150', pieces: 18, container: 'MSKU8899001', sysNo: 'EXP-2026-0408' }
    ],
    'BOL-2026-0410': [
      { pltNo: 'PLT-LAX-601', status: '待上架', location: 'B-03-02', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 11, container: 'MSKU5566778', sysNo: 'EXP-2026-0410' },
      { pltNo: 'PLT-LAX-602', status: '已上架', location: 'B-03-03', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 11, container: 'MSKU5566778', sysNo: 'EXP-2026-0410' }
    ]
  };

  var LOC_PW_RETURN_VOUCHER_MAX = 10 * 1024 * 1024;

  function locPwGetRowCellText(tr, idx) {
    if (!tr) return '—';
    var cells = tr.querySelectorAll('td');
    if (!cells[idx]) return '—';
    var t = cells[idx].textContent.trim();
    return t || '—';
  }

  function locPwResetReturnForm() {
    var ids = ['loc-pw-return-date', 'loc-pw-return-reason', 'loc-pw-return-detail', 'loc-pw-return-act-arrival'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') el.value = '';
      else el.value = '';
    });
    var vch = document.getElementById('loc-pw-return-voucher');
    if (vch) vch.value = '';
  }

  function locPwFillReturnSummary(bol, tr, statusOverride) {
    var sum = document.getElementById('loc-pw-return-summary');
    if (!sum) return;
    var status = statusOverride || (tr ? locPwGetRowStatus(tr) : '—');
    var custRef = locPwGetRowCellText(tr, 4);
    var container = locPwGetRowCellText(tr, 5);
    var sysNo = locPwGetRowCellText(tr, 32);
    if (status === '退仓待执行') {
      sum.innerHTML = 'BOL <strong>' + esc(bol) + '</strong> · Customer Ref No <strong>' + esc(custRef) + '</strong> · 柜号 <strong>' + esc(container) + '</strong> · 系统单号 <strong>' + esc(sysNo) + '</strong>';
      return;
    }
    sum.innerHTML = 'BOL <strong>' + esc(bol) + '</strong> · Customer Ref No <strong>' + esc(custRef) + '</strong> · 柜号 <strong>' + esc(container) + '</strong> · 系统单号 <strong>' + esc(sysNo) + '</strong> · 状态 <strong>' + esc(status) + '</strong>。该 BOL 下货件将整单一起退仓。';
  }

  function locPwApplyReturnModalPhase(phase) {
    var completeOnly = phase === 'complete-only';
    locPwSetHidden('loc-pw-return-phase', phase);
    var notify = document.getElementById('loc-pw-return-notify-section');
    var initBtn = document.getElementById('loc-pw-return-btn-initiate');
    var blockTitle = document.getElementById('loc-pw-return-complete-title');
    var tip = document.getElementById('loc-pw-return-warn-tip');
    if (notify) notify.style.display = completeOnly ? 'none' : '';
    if (initBtn) initBtn.style.display = completeOnly ? 'none' : '';
    if (blockTitle) blockTitle.textContent = completeOnly ? '退仓完成信息' : '确认退仓完成时填写';
    if (tip) {
      tip.innerHTML = completeOnly
        ? '<strong>单项退仓完成：</strong>确认货件已到仓后办结；办结后 BOL 状态将流转为「未预约」，可重新预约派送。'
        : '<strong>单项退仓：</strong>仅针对当前选中的 BOL，该 BOL 下货件整单一起退仓；通知仓库后将进入「退仓待执行」。';
    }
  }

  function locPwValidateReturnForm(requireOnExecute) {
    var dt = ((document.getElementById('loc-pw-return-date') || {}).value || '').trim();
    var actRaw = ((document.getElementById('loc-pw-return-act-arrival') || {}).value || '').trim();
    var actArrival = actRaw.replace('T', ' ').trim();
    var reason = ((document.getElementById('loc-pw-return-reason') || {}).value || '').trim();
    var detail = ((document.getElementById('loc-pw-return-detail') || {}).value || '').trim();
    var fi = document.getElementById('loc-pw-return-voucher');
    var file = fi && fi.files && fi.files[0] ? fi.files[0] : null;
    if (file && file.size > LOC_PW_RETURN_VOUCHER_MAX) {
      showToast('退仓凭证不能超过 10MB', 'warning');
      return null;
    }
    if (requireOnExecute) {
      if (!actArrival) { showToast('请填写实际到仓时间', 'warning'); return null; }
      if (!reason) { showToast('请选择退仓原因', 'warning'); return null; }
      if (!detail) { showToast('请填写详细说明', 'warning'); return null; }
      return { dt: dt, actArrival: actArrival, reason: reason, detail: detail, fileName: file ? (file.name || '附件') : '' };
    }
    if (!dt) { showToast('请选择期望到仓日期', 'warning'); return null; }
    if (!reason) { showToast('请选择退仓原因', 'warning'); return null; }
    if (!detail) { showToast('请填写详细说明', 'warning'); return null; }
    return { dt: dt, actArrival: actArrival, reason: reason, detail: detail, fileName: file ? (file.name || '附件') : '' };
  }

  function locPwPltStatusCls(status) {
    if (status === '已上架') return 'loc-pw-plt-st--done';
    if (status === '待上架') return 'loc-pw-plt-st--wait';
    return 'loc-pw-plt-st--default';
  }

  function locPwBuildFallbackPallets(bol, tr) {
    var n = locPwGetRowPalletCount(tr);
    if (n <= 0) n = 2;
    var cells = tr ? tr.querySelectorAll('td') : [];
    var container = cells[5] ? cells[5].textContent.trim() : '—';
    var location = cells[7] ? cells[7].textContent.trim() : '—';
    var sysNo = cells[32] ? cells[32].textContent.trim() : '—';
    if (container === '—' || !container) container = '—';
    if (location === '—' || !location) location = 'A-01-01';
    if (sysNo === '—' || !sysNo) sysNo = '—';
    var list = [];
    for (var i = 1; i <= n; i++) {
      list.push({
        pltNo: 'PLT-' + bol.replace(/[^A-Za-z0-9]/g, '') + '-' + String(i).padStart(2, '0'),
        status: i % 2 === 0 ? '待上架' : '已上架',
        location: location,
        warehouseZone: 'A区拣货区',
        warehouseName: 'LA1150',
        pieces: 10 + i,
        container: container,
        sysNo: sysNo
      });
    }
    return list;
  }

  function locPwGetRowPalletCount(tr) {
    if (!tr) return 0;
    var attr = tr.getAttribute('data-loc-pw-pallets');
    if (attr != null && attr !== '') {
      var n = parseInt(attr, 10);
      if (!isNaN(n)) return n;
    }
    var cells = tr.querySelectorAll('td');
    var raw = cells[20] ? cells[20].textContent.trim() : '';
    if (!raw || raw === '—' || raw === '-') return 0;
    var parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  function locPwGetPalletLabelsForBol(bol) {
    if (LOC_PW_PALLET_LABELS[bol]) {
      return LOC_PW_PALLET_LABELS[bol].map(function (p) {
        return Object.assign({}, p);
      });
    }
    return locPwBuildFallbackPallets(bol, locPwFindRow(bol));
  }

  function locPwCanPalletSplit(tr) {
    if (!tr) return false;
    if (locPwGetShipMode(tr) === 'split') return false;
    return locPwGetRowPalletCount(tr) > 1;
  }

  function locPwStatusBadgeHtml(status) {
    return '<span class="status-badge s-' + esc(status) + '"><span class="status-dot"></span>' + esc(status) + '</span>';
  }

  function locPwSetRowStatus(bol, status) {
    var tr = locPwFindRow(bol);
    if (!tr) return;
    var cells = tr.querySelectorAll('td');
    var statusTd = cells[3];
    if (statusTd) statusTd.innerHTML = locPwStatusBadgeHtml(status);
    locPwFillActions(tr);
    locPwRefreshTabCounts();
    locPwApplyTabFilter();
  }

  function locPwActionOnclick(kind, bol) {
    var safeBol = String(bol == null ? '' : bol).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var map = {
      booked: 'locPwOpenBooked',
      loaded: 'locPwOpenLoaded',
      departed: 'locPwOpenDeparted',
      uploadPod: 'locPwOpenUploadPod',
      editVoucher: 'locPwOpenEditVoucher',
      cancelBooked: 'locPwOpenCancelBooked',
      undoLoaded: 'locPwOpenUndoLoaded',
      returnInitiate: 'locPwOpenReturn',
      returnExecute: 'locPwOpenReturnComplete',
      returnRevoke: 'locPwRevokeReturn',
      split: 'locPwOpenSplit',
      cancelMerge: 'locPwOpenCancelMerge',
      cancelSplit: 'locPwOpenCancelSplit',
      log: 'showLocPwRowLog'
    };
    return (map[kind] || 'void') + "('" + safeBol + "')";
  }

  function locPwBuildActionsHtml(bol, status, shipMode, tr) {
    var primary = null;
    var more = [];

    if (status === '未预约') {
      primary = { label: '已预约', kind: 'booked' };
      if (shipMode === 'normal') {
        if (locPwCanPalletSplit(tr)) {
          more.push({ label: '拆分发货', kind: 'split' });
        }
      } else if (shipMode === 'split') {
        more.push({ label: '取消拆分', kind: 'cancelSplit' });
      } else if (shipMode === 'merge' && tr.classList.contains('loc-pw-tr-merge-parent')) {
        more.push({ label: '取消合并', kind: 'cancelMerge' });
      }
      more.push({ label: '日志', kind: 'log' });
    } else if (status === '已预约') {
      primary = { label: '已装车', kind: 'loaded' };
      more.push({ label: '取消预约', kind: 'cancelBooked' }, { label: '日志', kind: 'log' });
    } else if (status === '已装车') {
      primary = { label: '已发车', kind: 'departed' };
      more.push({ label: '撤销装车', kind: 'undoLoaded' }, { label: '日志', kind: 'log' });
    } else if (status === '运输中') {
      primary = { label: '上传POD', kind: 'uploadPod' };
      more.push({ label: '退仓', kind: 'returnInitiate' }, { label: '日志', kind: 'log' });
    } else if (status === '已签收') {
      primary = { label: '修改凭证', kind: 'editVoucher' };
      more.push({ label: '日志', kind: 'log' });
    } else if (status === '退仓待执行') {
      primary = { label: '退仓完成', kind: 'returnExecute', primary: true };
      more.push({ label: '撤销退仓', kind: 'returnRevoke' }, { label: '日志', kind: 'log' });
    }

    if (!primary) {
      return '<span class="loc-pw-tree-child-action-muted">—</span>';
    }

    var html = '<div class="loc-pw-row-actions">';
    var btnCls = primary.primary ? 'btn btn-primary btn-xs' : 'btn btn-default btn-xs';
    html += '<button class="' + btnCls + '" type="button" onclick="' + locPwActionOnclick(primary.kind, bol) + '">' + esc(primary.label) + '</button>';

    if (more.length) {
      html += '<div class="btn-with-dropdown"><button class="btn btn-default btn-xs" type="button" onclick="toggleDropdown(this)">更多 ▾</button><div class="dropdown-menu">';
      more.forEach(function (item) {
        html += '<div class="dropdown-item" onclick="' + locPwActionOnclick(item.kind, bol) + '">' + esc(item.label) + '</div>';
      });
      html += '</div></div>';
    } else {
      html += '<span></span>';
    }
    html += '</div>';
    return html;
  }

  function locPwFillActions(tr) {
    var host = tr.querySelector('.loc-pw-action-host');
    if (!host) return;
    var bol = tr.getAttribute('data-loc-pw-bol');
    if (!bol) return;
    host.innerHTML = locPwBuildActionsHtml(bol, locPwGetRowStatus(tr), locPwGetShipMode(tr), tr);
  }

  function locPwInitAllActions() {
    document.querySelectorAll('tr[data-loc-pw-bol]').forEach(locPwFillActions);
  }

  var locPwCurrentTab = '全部';

  function locPwRefreshTabCounts() {
    var statuses = ['未预约', '已预约', '已装车', '运输中', '已签收', '退仓待执行'];
    var counts = {};
    statuses.forEach(function (s) { counts[s] = 0; });
    var total = 0;
    document.querySelectorAll('tr[data-loc-pw-bol]').forEach(function (tr) {
      var s = locPwGetRowStatus(tr);
      if (counts[s] != null) counts[s]++;
      total++;
    });
    var tabs = document.querySelectorAll('.table-card .tabs .tab');
    if (!tabs.length) return;
    var labels = ['全部', '未预约', '已预约', '已装车', '运输中', '已签收', '退仓待执行'];
    tabs.forEach(function (tab, i) {
      var label = labels[i];
      var n = label === '全部' ? total : (counts[label] || 0);
      var countEl = tab.querySelector('.tab-count');
      if (countEl) countEl.textContent = String(n);
    });
  }

  function locPwSyncMergeChildren(parentTr) {
    if (!parentTr || !parentTr.classList.contains('loc-pw-tr-merge-parent')) return;
    var gid = parentTr.getAttribute('data-merge-group');
    if (!gid) return;
    var collapsed = parentTr.classList.contains('loc-pw-tr-merge-parent--collapsed');
    var parentVisible = parentTr.style.display !== 'none';
    document.querySelectorAll('tr.loc-pw-tr-merge-child[data-merge-group="' + gid + '"]').forEach(function (ch) {
      if (!parentVisible) {
        ch.style.display = 'none';
      } else {
        ch.style.display = '';
        ch.hidden = collapsed;
      }
    });
  }

  function locPwInitMergeTrees() {
    document.querySelectorAll('tr.loc-pw-tr-merge-parent').forEach(function (tr) {
      var btn = tr.querySelector('.loc-pw-merge-tree-toggle');
      var collapsed = tr.classList.contains('loc-pw-tr-merge-parent--collapsed');
      if (btn) {
        btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        btn.textContent = collapsed ? '+' : '−';
        btn.title = collapsed ? '展开子行' : '收起子行';
      }
      locPwSyncMergeChildren(tr);
    });
  }

  function locPwRowMatchesTab(tr, tab) {
    if (tab === '全部') return true;
    return locPwGetRowStatus(tr) === tab;
  }

  function locPwApplyTabFilter() {
    var tab = locPwCurrentTab || '全部';
    var visibleCount = 0;
    document.querySelectorAll('tr[data-loc-pw-bol]').forEach(function (tr) {
      var match = locPwRowMatchesTab(tr, tab);
      tr.style.display = match ? '' : 'none';
      if (match) visibleCount++;
      if (tr.classList.contains('loc-pw-tr-merge-parent')) locPwSyncMergeChildren(tr);
    });
    var info = document.getElementById('loc-pw-pagination-info') ||
      document.querySelector('.table-card .pagination-info');
    if (info) info.textContent = '共 ' + visibleCount + ' 条（示例）';
  }

  function locPwSetHidden(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }

  function locPwSetRo(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }

  window.showLocPwRowLog = function (ref) {
    var t = document.getElementById('loc-pw-row-log-title');
    if (t) t.textContent = '操作日志 · ' + ref;
    showModal('modal-loc-pw-row-log');
  };

  var LOC_PW_SCHEDULE_FIELD_SUFFIXES = [
    'warehouse', 'depart-time', 'load-type', 'eta', 'vehicle', 'platform',
    'carrier', 'actual-carrier', 'pickup-time', 'plate-no', 'remark', 'load-remark'
  ];

  function locPwResetScheduleForm(prefix) {
    LOC_PW_SCHEDULE_FIELD_SUFFIXES.forEach(function (suffix) {
      var el = document.getElementById('loc-pw-' + prefix + '-' + suffix);
      if (el) el.value = '';
    });
  }

  function locPwValidateScheduleForm(prefix) {
    var warehouse = ((document.getElementById('loc-pw-' + prefix + '-warehouse') || {}).value || '').trim();
    var eta = ((document.getElementById('loc-pw-' + prefix + '-eta') || {}).value || '').trim();
    var depart = ((document.getElementById('loc-pw-' + prefix + '-depart-time') || {}).value || '').trim();
    var loadType = ((document.getElementById('loc-pw-' + prefix + '-load-type') || {}).value || '').trim();
    if (!warehouse) { showToast('请选择备货仓', 'warning'); return false; }
    if (!depart) { showToast('请填写预计发车时间', 'warning'); return false; }
    if (!loadType) { showToast('请选择发车类型', 'warning'); return false; }
    if (!eta) { showToast('请填写预计送达时间', 'warning'); return false; }
    return true;
  }

  function locPwResetBookedForm() {
    locPwResetScheduleForm('booked');
  }

  window.locPwOpenBooked = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    locPwSetHidden('loc-pw-booked-bol', bol);
    locPwSetRo('loc-pw-booked-bol-ro', bol);
    locPwResetBookedForm();
    var title = document.getElementById('loc-pw-booked-title');
    if (title) title.textContent = '已预约 · ' + bol;
    showModal('modal-loc-pw-booked');
  };

  window.locPwConfirmBooked = function () {
    var bol = ((document.getElementById('loc-pw-booked-bol') || {}).value || '').trim();
    if (!locPwValidateScheduleForm('booked')) return;
    closeModal('modal-loc-pw-booked');
    locPwSetRowStatus(bol, '已预约');
    showToast('已预约已保存（演示）：' + bol, 'success');
  };

  window.locPwOpenLoaded = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    locPwSetHidden('loc-pw-loaded-bol', bol);
    locPwSetRo('loc-pw-loaded-bol-ro', bol);
    locPwResetScheduleForm('loaded');
    var title = document.getElementById('loc-pw-loaded-title');
    if (title) title.textContent = '已装车 · ' + bol;
    showModal('modal-loc-pw-loaded');
  };

  window.locPwConfirmLoaded = function () {
    var bol = ((document.getElementById('loc-pw-loaded-bol') || {}).value || '').trim();
    if (!locPwValidateScheduleForm('loaded')) return;
    closeModal('modal-loc-pw-loaded');
    locPwSetRowStatus(bol, '已装车');
    showToast('已装车已确认（演示）：' + bol, 'success');
  };

  window.locPwOpenDeparted = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    locPwSetHidden('loc-pw-departed-bol', bol);
    locPwSetRo('loc-pw-departed-bol-ro', bol);
    locPwResetScheduleForm('departed');
    var departRemark = document.getElementById('loc-pw-departed-depart-remark');
    if (departRemark) departRemark.value = '';
    var title = document.getElementById('loc-pw-departed-title');
    if (title) title.textContent = '已发车 · ' + bol;
    showModal('modal-loc-pw-departed');
  };

  window.locPwConfirmDeparted = function () {
    var bol = ((document.getElementById('loc-pw-departed-bol') || {}).value || '').trim();
    if (!locPwValidateScheduleForm('departed')) return;
    closeModal('modal-loc-pw-departed');
    locPwSetRowStatus(bol, '运输中');
    showToast('已发车已确认（演示）：' + bol + '，状态已更新为运输中', 'success');
  };

  window.locPwOpenCancelBooked = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    locPwSetHidden('loc-pw-cancel-booked-bol', bol);
    locPwSetRo('loc-pw-cancel-booked-bol-ro', bol);
    var rs = document.getElementById('loc-pw-cancel-booked-reason');
    var dt = document.getElementById('loc-pw-cancel-booked-detail');
    if (rs) rs.value = '';
    if (dt) dt.value = '';
    var title = document.getElementById('loc-pw-cancel-booked-title');
    if (title) title.textContent = '取消预约 · ' + bol;
    showModal('modal-loc-pw-cancel-booked');
  };

  window.locPwConfirmCancelBooked = function () {
    var bol = ((document.getElementById('loc-pw-cancel-booked-bol') || {}).value || '').trim();
    var reason = ((document.getElementById('loc-pw-cancel-booked-reason') || {}).value || '').trim();
    var detail = ((document.getElementById('loc-pw-cancel-booked-detail') || {}).value || '').trim();
    if (!reason) return showToast('请选择取消原因', 'warning');
    if (!detail) return showToast('请填写说明', 'warning');
    closeModal('modal-loc-pw-cancel-booked');
    locPwSetRowStatus(bol, '未预约');
    showToast('已取消预约（演示）：' + bol + '，状态已回退为未预约', 'success');
  };

  window.locPwOpenUndoLoaded = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    locPwSetHidden('loc-pw-undo-loaded-bol', bol);
    locPwSetRo('loc-pw-undo-loaded-bol-ro', bol);
    var rs = document.getElementById('loc-pw-undo-loaded-reason');
    var dt = document.getElementById('loc-pw-undo-loaded-detail');
    if (rs) rs.value = '';
    if (dt) dt.value = '';
    var title = document.getElementById('loc-pw-undo-loaded-title');
    if (title) title.textContent = '撤销装车 · ' + bol;
    showModal('modal-loc-pw-undo-loaded');
  };

  window.locPwConfirmUndoLoaded = function () {
    var bol = ((document.getElementById('loc-pw-undo-loaded-bol') || {}).value || '').trim();
    var reason = ((document.getElementById('loc-pw-undo-loaded-reason') || {}).value || '').trim();
    var detail = ((document.getElementById('loc-pw-undo-loaded-detail') || {}).value || '').trim();
    if (!reason) return showToast('请选择撤销原因', 'warning');
    if (!detail) return showToast('请填写说明', 'warning');
    closeModal('modal-loc-pw-undo-loaded');
    locPwSetRowStatus(bol, '已预约');
    showToast('撤销装车已确认（演示）：' + bol + '，状态已回退为已预约', 'success');
  };

  function locPwRenderPalletPickModal(bol) {
    var pallets = locPwGetPalletLabelsForBol(bol);
    var total = pallets.length;
    var title = document.getElementById('loc-pw-pallet-pick-title');
    var tip = document.getElementById('loc-pw-pallet-pick-tip');
    var bolRo = document.getElementById('loc-pw-pallet-pick-bol-ro');
    var tbody = document.getElementById('loc-pw-pallet-pick-tbody');
    if (title) title.textContent = '拆分发货 · ' + bol;
    if (bolRo) bolRo.value = bol;
    if (tip) {
      tip.innerHTML = 'BOL <strong>' + esc(bol) + '</strong> · 实收板数 <strong>' + total + '</strong> 板。请勾选本次拆分发货的板标（至少 1 板、至多 ' + (total - 1) + ' 板，须保留至少 1 板在原 BOL）。';
    }
    if (!tbody) return;
    tbody.innerHTML = pallets.map(function (p) {
      return '<tr>' +
        '<td><input type="checkbox" class="loc-pw-pallet-pick-cb" value="' + esc(p.pltNo) + '"></td>' +
        '<td><strong>' + esc(p.pltNo) + '</strong></td>' +
        '<td><span class="loc-pw-plt-st ' + locPwPltStatusCls(p.status) + '">' + esc(p.status) + '</span></td>' +
        '<td>' + esc(p.location) + '</td>' +
        '<td>' + esc(p.warehouseZone) + '</td>' +
        '<td>' + esc(p.warehouseName) + '</td>' +
        '<td>' + esc(p.pieces) + '</td>' +
        '<td>' + esc(p.container) + '</td>' +
        '<td>' + esc(p.sysNo) + '</td>' +
        '</tr>';
    }).join('');
  }

  window.locPwOpenSplit = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr = locPwFindRow(bol);
    if (!tr) return showToast('未找到该 BOL', 'warning');
    if (locPwGetRowStatus(tr) !== '未预约') {
      return showToast('仅「未预约」可拆分发货', 'warning');
    }
    if (locPwGetShipMode(tr) !== 'normal') {
      return showToast('仅「普通发货」模式可拆分发货', 'warning');
    }
    if (!locPwCanPalletSplit(tr)) {
      return showToast('实收板数为 1 板时不允许拆分发货', 'warning');
    }
    locPwSetHidden('loc-pw-split-bol', bol);
    locPwRenderPalletPickModal(bol);
    showModal('modal-split');
  };

  window.locPwConfirmPalletPick = function () {
    var bol = ((document.getElementById('loc-pw-split-bol') || {}).value || '').trim();
    var tr = locPwFindRow(bol);
    if (!tr) {
      closeModal('modal-split');
      return showToast('未找到该 BOL', 'warning');
    }
    var total = locPwGetPalletLabelsForBol(bol).length;
    var picked = [];
    document.querySelectorAll('#loc-pw-pallet-pick-tbody .loc-pw-pallet-pick-cb:checked').forEach(function (cb) {
      picked.push(cb.value);
    });
    if (!picked.length) return showToast('请至少勾选 1 个板标', 'warning');
    if (picked.length >= total) {
      return showToast('须在原 BOL 保留至少 1 板，不能勾选全部板标', 'warning');
    }
    closeModal('modal-split');
    showToast('拆分发货已提交（演示）：' + bol + ' · ' + picked.join('、'), 'success');
  };

  window.locPwOpenReturn = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr = locPwFindRow(bol);
    if (!tr) return showToast('未找到该 BOL', 'warning');
    if (locPwGetRowStatus(tr) !== '运输中') {
      return showToast('仅「运输中」的 BOL 可单项退仓。当前为「' + locPwGetRowStatus(tr) + '」。', 'warning');
    }
    locPwSetHidden('loc-pw-return-bol', bol);
    locPwResetReturnForm();
    locPwFillReturnSummary(bol, tr);
    locPwApplyReturnModalPhase('notify');
    var title = document.getElementById('loc-pw-return-title');
    if (title) title.textContent = '单项退仓 · ' + bol;
    showModal('modal-loc-pw-return');
  };

  window.locPwOpenReturnComplete = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr = locPwFindRow(bol);
    if (!tr) return showToast('未找到该 BOL', 'warning');
    if (locPwGetRowStatus(tr) !== '退仓待执行') {
      return showToast('仅「退仓待执行」可操作退仓完成', 'warning');
    }
    locPwSetHidden('loc-pw-return-bol', bol);
    locPwResetReturnForm();
    locPwFillReturnSummary(bol, tr, '退仓待执行');
    locPwApplyReturnModalPhase('complete-only');
    var title = document.getElementById('loc-pw-return-title');
    if (title) title.textContent = '单项退仓完成 · ' + bol;
    showModal('modal-loc-pw-return');
  };

  window.locPwConfirmReturnInitiate = function () {
    var bol = ((document.getElementById('loc-pw-return-bol') || {}).value || '').trim();
    var tr = locPwFindRow(bol);
    if (!tr) { closeModal('modal-loc-pw-return'); return showToast('未找到该 BOL', 'warning'); }
    var form = locPwValidateReturnForm(false);
    if (!form) return;
    closeModal('modal-loc-pw-return');
    locPwSetRowStatus(bol, '退仓待执行');
    showToast('通知仓库退仓已提交（演示）：' + bol + ' → 退仓待执行', 'success');
  };

  window.locPwConfirmReturnExecute = function () {
    var bol = ((document.getElementById('loc-pw-return-bol') || {}).value || '').trim();
    var tr = locPwFindRow(bol);
    if (!tr) { closeModal('modal-loc-pw-return'); return showToast('未找到该 BOL', 'warning'); }
    if (locPwGetRowStatus(tr) !== '退仓待执行') {
      return showToast('仅「退仓待执行」可确认退仓完成', 'warning');
    }
    var form = locPwValidateReturnForm(true);
    if (!form) return;
    closeModal('modal-loc-pw-return');
    locPwSetRowStatus(bol, '未预约');
    showToast('确认退仓完成已提交（演示）：' + bol + ' → 未预约' + (form.fileName ? ' · ' + form.fileName : ''), 'success');
  };

  window.locPwRevokeReturn = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr = locPwFindRow(bol);
    if (!tr) return showToast('未找到该 BOL', 'warning');
    if (locPwGetRowStatus(tr) !== '退仓待执行') {
      return showToast('仅「退仓待执行」可撤销退仓', 'warning');
    }
    var msg = '将撤回 BOL「' + bol + '」的退仓指令，恢复为运输中。';
    if (typeof openSharedConfirm !== 'function') {
      if (!window.confirm(msg)) return;
      locPwSetRowStatus(bol, '运输中');
      return showToast('已撤销退仓（演示）', 'success');
    }
    openSharedConfirm('撤销退仓指令', msg).then(function (ok) {
      if (!ok) return;
      locPwSetRowStatus(bol, '运输中');
      showToast('已撤销退仓（演示）', 'success');
    });
  };

  window.locPwDownloadPod = function (bol) {
    bol = String(bol || '').trim();
    if (!bol) return;
    showToast('POD 已下载（演示）：' + bol, 'success');
  };

  function locPwFormatDisplayDateTime(val) {
    if (!val) return '—';
    return String(val).trim().replace('T', ' ').slice(0, 16);
  }

  function locPwSetPodDownloadCell(tr, bol) {
    if (!tr || !tr.cells || !tr.cells[30]) return;
    var safeBol = String(bol || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    tr.cells[30].innerHTML = '<button class="btn btn-default btn-xs" type="button" onclick="locPwDownloadPod(\'' + safeBol + '\')">下载</button>';
  }

  window.locPwOpenUploadPod = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    locPwSetHidden('loc-pw-upload-pod-bol', bol);
    locPwSetRo('loc-pw-upload-pod-bol-ro', bol);
    var title = document.getElementById('loc-pw-upload-pod-title');
    if (title) title.textContent = '上传 POD · ' + bol;
    var fi = document.getElementById('loc-pw-upload-pod-file');
    if (fi) fi.value = '';
    showModal('modal-loc-pw-upload-pod');
  };

  window.locPwConfirmUploadPod = function () {
    var bol = ((document.getElementById('loc-pw-upload-pod-bol') || {}).value || '').trim();
    var st = ((document.getElementById('loc-pw-upload-pod-sign-time') || {}).value || '').trim();
    var fi = document.getElementById('loc-pw-upload-pod-file');
    if (!st) return showToast('请填写签收时间', 'warning');
    if (!fi || !fi.files || !fi.files.length) return showToast('请选择要上传的 POD 附件', 'warning');
    var name = fi.files[0].name || '附件';
    closeModal('modal-loc-pw-upload-pod');
    locPwSetRowStatus(bol, '已签收');
    var tr = locPwFindRow(bol);
    if (tr && tr.cells) {
      if (tr.cells[29]) tr.cells[29].textContent = locPwFormatDisplayDateTime(st);
      locPwSetPodDownloadCell(tr, bol);
    }
    showToast('POD 已提交（演示）：' + bol + ' · ' + name + '，状态已更新为已签收', 'success');
  };

  window.locPwOpenEditVoucher = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    locPwSetHidden('loc-pw-edit-voucher-bol', bol);
    locPwSetRo('loc-pw-edit-voucher-bol-ro', bol);
    var title = document.getElementById('loc-pw-edit-voucher-title');
    if (title) title.textContent = '修改签收凭证 · ' + bol;
    var st = document.getElementById('loc-pw-edit-voucher-sign-time');
    if (st) st.value = '2026-05-01T14:00';
    var fi = document.getElementById('loc-pw-edit-voucher-file');
    if (fi) fi.value = '';
    var rs = document.getElementById('loc-pw-edit-voucher-reason');
    if (rs) rs.value = '';
    showModal('modal-loc-pw-edit-voucher');
  };

  window.locPwConfirmEditVoucher = function () {
    var bol = ((document.getElementById('loc-pw-edit-voucher-bol') || {}).value || '').trim();
    var st = ((document.getElementById('loc-pw-edit-voucher-sign-time') || {}).value || '').trim();
    var rs = ((document.getElementById('loc-pw-edit-voucher-reason') || {}).value || '').trim();
    if (!st) return showToast('请填写签收时间', 'warning');
    if (!rs) return showToast('请填写修改说明', 'warning');
    closeModal('modal-loc-pw-edit-voucher');
    showToast('签收凭证已更新（演示）：' + bol, 'success');
  };

  function locPwGetCheckedBolRows() {
    return Array.prototype.filter.call(
      document.querySelectorAll('tr[data-loc-pw-bol]'),
      function (tr) {
        var cb = tr.querySelector('td input[type="checkbox"]');
        return cb && cb.checked;
      }
    );
  }

  window.locPwShowStatusRollback = function (target, triggerEl) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    target = String(target || '').trim();
    if (!target) return showToast('请选择回退目标状态', 'warning');

    window.__locPwSrTargetStatus = target;
    var bolLabel = '—';
    var rows = locPwGetCheckedBolRows();
    if (rows.length === 1) {
      bolLabel = rows[0].getAttribute('data-loc-pw-bol') || '—';
    } else if (rows.length > 1) {
      bolLabel = '已选 ' + rows.length + ' 条';
    }

    var pillBol = document.getElementById('loc-pw-sr-bol-pill');
    if (pillBol) pillBol.textContent = 'BOL号：' + bolLabel;
    var pillTarget = document.getElementById('loc-pw-sr-target-pill');
    if (pillTarget) pillTarget.textContent = '回退至：' + target;
    var ta = document.getElementById('loc-pw-sr-reason');
    if (ta) ta.value = '';

    showModal('modal-loc-pw-status-rollback');
  };

  window.locPwConfirmStatusRollback = function () {
    var reason = ((document.getElementById('loc-pw-sr-reason') || {}).value || '').trim();
    if (!reason) return showToast('请填写回退原因', 'warning');
    var target = window.__locPwSrTargetStatus || '';
    closeModal('modal-loc-pw-status-rollback');
    showToast('状态已回退至「' + target + '」（演示）', 'success');
  };

  function locPwGetTransferTargetLabel() {
    return window.__locPwTransferTarget || '外州私仓';
  }

  function locPwGetSplitGroupId(bol, tr) {
    if (tr && tr.getAttribute('data-loc-pw-split-group')) {
      return tr.getAttribute('data-loc-pw-split-group');
    }
    var m = String(bol || '').match(/^(.+)-\d+$/);
    return m ? m[1] : bol;
  }

  function locPwGetSplitGroupRows(groupId) {
    return Array.prototype.filter.call(
      document.querySelectorAll('tr[data-loc-pw-bol]'),
      function (tr) {
        if (locPwGetShipMode(tr) !== 'split') return false;
        var bol = tr.getAttribute('data-loc-pw-bol');
        return locPwGetSplitGroupId(bol, tr) === groupId;
      }
    );
  }

  function locPwGetMergeChildRows(parentTr) {
    var gid = parentTr.getAttribute('data-merge-group');
    if (!gid) return [];
    return Array.prototype.slice.call(
      document.querySelectorAll('tr.loc-pw-tr-merge-child[data-merge-group="' + gid + '"]')
    );
  }

  function locPwGetBolMetaText(tr) {
    var meta = tr.querySelector('.loc-pw-bol-meta');
    return meta ? meta.textContent.trim() : '—';
  }

  function locPwPromoteMergeChildToRow(ch, idx) {
    ch.classList.remove('loc-pw-tr-merge-child');
    ch.removeAttribute('hidden');
    ch.removeAttribute('data-merge-group');
    var cbTd = ch.cells[0];
    if (cbTd) cbTd.innerHTML = '<input type="checkbox">';
    if (ch.cells[1]) {
      ch.cells[1].innerHTML = '<span class="loc-pw-ship-mode loc-pw-ship-mode--normal">普通发货</span>';
    }
    var sysNo = locPwGetRowCellText(ch, 32);
    var bol = sysNo && sysNo !== '—' ? ('BOL-' + sysNo.replace(/^EXP-/, '')) : ('BOL-SPLIT-' + (idx + 1));
    ch.setAttribute('data-loc-pw-bol', bol);
    var bolPrimary = ch.querySelector('.loc-pw-bol-primary');
    if (bolPrimary) {
      bolPrimary.textContent = bol;
      bolPrimary.classList.remove('loc-pw-tr-merge-child-muted');
    }
    var actionTd = ch.querySelector('.td-action');
    if (actionTd) {
      actionTd.classList.add('loc-pw-action-host');
      actionTd.innerHTML = '';
    }
    locPwFillActions(ch);
  }

  function locPwApplyCancelMerge(parentTr) {
    var bol = parentTr.getAttribute('data-loc-pw-bol') || '';
    var children = locPwGetMergeChildRows(parentTr);
    var tbody = parentTr.parentNode;
    children.forEach(function (ch, idx) {
      locPwPromoteMergeChildToRow(ch, idx);
    });
    if (parentTr.parentNode) parentTr.parentNode.removeChild(parentTr);
    locPwRefreshTabCounts();
    locPwApplyTabFilter();
    return { bol: bol, count: children.length };
  }

  function locPwApplyCancelSplit(groupId, rows) {
    if (!rows.length) return null;
    var keep = rows[0];
    var bol = groupId;
    keep.setAttribute('data-loc-pw-bol', bol);
    keep.removeAttribute('data-loc-pw-split-group');
    var modeEl = keep.querySelector('.loc-pw-ship-mode');
    if (modeEl) {
      modeEl.className = 'loc-pw-ship-mode loc-pw-ship-mode--normal';
      modeEl.textContent = '普通发货';
    }
    var bolPrimary = keep.querySelector('.loc-pw-bol-primary');
    if (bolPrimary) bolPrimary.textContent = bol;
    var bolMeta = keep.querySelector('.loc-pw-bol-meta');
    if (bolMeta) bolMeta.remove();
    var custSub = keep.querySelector('.loc-pw-cust-ref-sub');
    if (custSub) custSub.remove();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i].parentNode) rows[i].parentNode.removeChild(rows[i]);
    }
    locPwFillActions(keep);
    locPwRefreshTabCounts();
    locPwApplyTabFilter();
    return { bol: bol, count: rows.length };
  }

  window.locPwOpenTransferWarehouse = function () {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var rows = locPwGetCheckedBolRows();
    if (!rows.length) return showToast('请先勾选要转入的 BOL', 'warning');
    var invalidStatus = rows.filter(function (tr) { return locPwGetRowStatus(tr) !== '未预约'; });
    if (invalidStatus.length) {
      return showToast('仅「未预约」且「普通发货」的货件可转私仓，请取消勾选不符合条件的 BOL', 'warning');
    }
    var invalidMode = rows.filter(function (tr) { return locPwGetShipMode(tr) !== 'normal'; });
    if (invalidMode.length) {
      return showToast('仅「普通发货」模式可转私仓，合并/拆分发货请先取消后再操作', 'warning');
    }
    var target = locPwGetTransferTargetLabel();
    window.__locPwTransferBols = rows.map(function (tr) { return tr.getAttribute('data-loc-pw-bol'); });
    var title = document.getElementById('loc-pw-transfer-title');
    if (title) title.textContent = '转' + target;
    var tip = document.getElementById('loc-pw-transfer-tip');
    if (tip) {
      tip.innerHTML = '仅「<strong>普通发货</strong>」且状态为「<strong>未预约</strong>」的货件可转入<strong>' + esc(target) + '</strong>；确认转入后将从当前列表移除（演示）。';
    }
    var sum = document.getElementById('loc-pw-transfer-summary');
    if (sum) {
      var lines = rows.map(function (tr) {
        var bol = tr.getAttribute('data-loc-pw-bol');
        return 'BOL <strong>' + esc(bol) + '</strong> · 柜号 <strong>' + esc(locPwGetRowCellText(tr, 5)) + '</strong>';
      });
      sum.innerHTML = '共 <strong>' + rows.length + '</strong> 条：' + lines.join('；');
    }
    showModal('modal-loc-pw-transfer');
  };

  window.locPwConfirmTransferWarehouse = function () {
    var bols = window.__locPwTransferBols || [];
    var target = locPwGetTransferTargetLabel();
    bols.forEach(function (bol) {
      var tr = locPwFindRow(bol);
      if (tr && tr.parentNode) tr.parentNode.removeChild(tr);
    });
    closeModal('modal-loc-pw-transfer');
    locPwRefreshTabCounts();
    locPwApplyTabFilter();
    showToast('已转入' + target + '（演示）：' + bols.join('、'), 'success');
  };

  function locPwFillCancelMergeModal(tr) {
    var bol = tr.getAttribute('data-loc-pw-bol') || '';
    var children = locPwGetMergeChildRows(tr);
    if (!children.length) return false;
    locPwSetHidden('loc-pw-cancel-merge-bol', bol);
    var sum = document.getElementById('loc-pw-cancel-merge-summary');
    if (sum) {
      sum.innerHTML = 'BOL <strong>' + esc(bol) + '</strong> · 发货模式 <strong>合并发货</strong> · 含 <strong>' + children.length + '</strong> 个货件';
    }
    var tbody = document.getElementById('loc-pw-cancel-merge-tbody');
    if (tbody) {
      tbody.innerHTML = children.map(function (ch) {
        return '<tr><td>' + esc(locPwGetRowCellText(ch, 4)) + '</td><td>' + esc(locPwGetRowCellText(ch, 5)) + '</td><td>' + esc(locPwGetRowCellText(ch, 32)) + '</td><td>' + esc(locPwGetRowStatus(ch)) + '</td></tr>';
      }).join('');
    }
    return true;
  }

  function locPwFillCancelSplitModal(tr) {
    var bol = tr.getAttribute('data-loc-pw-bol') || '';
    var groupId = locPwGetSplitGroupId(bol, tr);
    var siblings = locPwGetSplitGroupRows(groupId);
    if (siblings.length < 2) return false;
    locPwSetHidden('loc-pw-cancel-split-group', groupId);
    var sum = document.getElementById('loc-pw-cancel-split-summary');
    if (sum) {
      sum.innerHTML = '原货件 <strong>' + esc(groupId) + '</strong> · 当前拆分为 <strong>' + siblings.length + '</strong> 个子单，取消后将合并恢复为 1 条完整 BOL。';
    }
    var tbody = document.getElementById('loc-pw-cancel-split-tbody');
    if (tbody) {
      tbody.innerHTML = siblings.map(function (r) {
        var b = r.getAttribute('data-loc-pw-bol') || '—';
        return '<tr><td><strong>' + esc(b) + '</strong></td><td>' + esc(locPwGetBolMetaText(r)) + '</td><td>' + esc(locPwGetRowCellText(r, 4)) + '</td><td>' + esc(locPwGetRowStatus(r)) + '</td></tr>';
      }).join('');
    }
    return true;
  }

  window.locPwOpenCancelMerge = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr;
    if (bol) {
      tr = locPwFindRow(bol);
      if (!tr) return showToast('未找到该 BOL', 'warning');
      if (locPwGetRowStatus(tr) !== '未预约') {
        return showToast('仅「未预约」的合并发货可取消合并', 'warning');
      }
      if (!tr.classList.contains('loc-pw-tr-merge-parent') || locPwGetShipMode(tr) !== 'merge') {
        return showToast('仅「合并发货」的父行可取消合并', 'warning');
      }
    } else {
      var rows = locPwGetCheckedBolRows();
      if (rows.length !== 1) {
        return showToast('请勾选且仅勾选 1 条「合并发货」记录', 'warning');
      }
      tr = rows[0];
      if (!tr.classList.contains('loc-pw-tr-merge-parent') || locPwGetShipMode(tr) !== 'merge') {
        return showToast('仅「合并发货」的父行可取消合并', 'warning');
      }
    }
    if (!locPwFillCancelMergeModal(tr)) return showToast('未找到合并子货件明细', 'warning');
    showModal('modal-loc-pw-cancel-merge');
  };

  window.locPwConfirmCancelMerge = function () {
    var bol = ((document.getElementById('loc-pw-cancel-merge-bol') || {}).value || '').trim();
    var tr = locPwFindRow(bol);
    if (!tr || !tr.classList.contains('loc-pw-tr-merge-parent')) {
      closeModal('modal-loc-pw-cancel-merge');
      return showToast('未找到合并记录', 'warning');
    }
    var result = locPwApplyCancelMerge(tr);
    closeModal('modal-loc-pw-cancel-merge');
    showToast('已取消合并（演示）：' + result.bol + ' → 恢复为 ' + result.count + ' 个独立货件', 'success');
  };

  window.locPwOpenCancelSplit = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr;
    if (bol) {
      tr = locPwFindRow(bol);
      if (!tr) return showToast('未找到该 BOL', 'warning');
      if (locPwGetRowStatus(tr) !== '未预约') {
        return showToast('仅「未预约」的拆分发货可取消拆分', 'warning');
      }
      if (locPwGetShipMode(tr) !== 'split') {
        return showToast('仅「拆分发货」的 BOL 可取消拆分', 'warning');
      }
    } else {
      var rows = locPwGetCheckedBolRows();
      if (rows.length !== 1) {
        return showToast('请勾选且仅勾选 1 条「拆分发货」记录', 'warning');
      }
      tr = rows[0];
      if (locPwGetShipMode(tr) !== 'split') {
        return showToast('仅「拆分发货」的 BOL 可取消拆分', 'warning');
      }
    }
    if (!locPwFillCancelSplitModal(tr)) return showToast('未找到关联拆分子单', 'warning');
    showModal('modal-loc-pw-cancel-split');
  };

  window.locPwConfirmCancelSplit = function () {
    var groupId = ((document.getElementById('loc-pw-cancel-split-group') || {}).value || '').trim();
    if (!groupId) {
      closeModal('modal-loc-pw-cancel-split');
      return showToast('未找到拆分组', 'warning');
    }
    var siblings = locPwGetSplitGroupRows(groupId);
    if (siblings.length < 2) {
      closeModal('modal-loc-pw-cancel-split');
      return showToast('未找到关联拆分子单', 'warning');
    }
    var result = locPwApplyCancelSplit(groupId, siblings);
    closeModal('modal-loc-pw-cancel-split');
    showToast('已取消拆分（演示）：' + result.count + ' 个子单 → 恢复为 ' + result.bol, 'success');
  };

  function locPwBoot() {
    locPwInitAllActions();
    locPwRefreshTabCounts();
    locPwInitMergeTrees();
    locPwApplyTabFilter();
  }

  window.toggleLocPwMergeTree = function (btn) {
    if (!btn || !btn.closest) return;
    var tr = btn.closest('tr.loc-pw-tr-merge-parent');
    if (!tr) return;
    tr.classList.toggle('loc-pw-tr-merge-parent--collapsed');
    var collapsed = tr.classList.contains('loc-pw-tr-merge-parent--collapsed');
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    btn.textContent = collapsed ? '+' : '−';
    btn.title = collapsed ? '展开子行' : '收起子行';
    locPwSyncMergeChildren(tr);
  };

  window.locPwSwitchTab = function (el, label) {
    locPwCurrentTab = label || '全部';
    document.querySelectorAll('.table-card .tabs .tab').forEach(function (tab) {
      tab.classList.remove('active');
    });
    if (el) el.classList.add('active');
    locPwApplyTabFilter();
  };

  window.locPwInitAllActions = locPwInitAllActions;
  window.locPwSetRowStatus = locPwSetRowStatus;
  window.locPwRefreshTabCounts = locPwRefreshTabCounts;
  window.locPwApplyTabFilter = locPwApplyTabFilter;
  window.locPwBoot = locPwBoot;
})();
