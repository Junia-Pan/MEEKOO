/**
 * 自提单：按板标登记提货，支持多次自提与自提时间
 */
(function () {
  var C = window.SpPickupCore;
  if (!C) return;

  var SP_PICKED_STATE = {
    'ZT2604260002': {
      sessions: [{
        time: '2026-04-26 10:30',
        plts: ['PLT-LAX-101', 'PLT-LAX-102', 'PLT-LAX-103', 'PLT-LAX-104', 'PLT-LAX-105'],
        voucher: 'pickup-voucher-101.pdf'
      }]
    },
    'ZT2604250001': {
      sessions: [
        {
          time: '2026-04-25 09:20',
          plts: ['PLT-LAX-310', 'PLT-LAX-311', 'PLT-LAX-312', 'PLT-LAX-313', 'PLT-LAX-314', 'PLT-LAX-315'],
          voucher: 'pickup-voucher-batch1.pdf'
        },
        {
          time: '2026-04-25 14:35',
          plts: ['PLT-LAX-316', 'PLT-LAX-317'],
          voucher: 'pickup-voucher-batch2.pdf'
        }
      ]
    }
  };

  function renderPltListText(plts) {
    var list = plts || [];
    if (!list.length) return '<span class="sp-plt-list-text sp-plt-list-text--empty">—</span>';
    return '<div class="sp-plt-list-text">' + C.esc(list.join(', ')) + '</div>';
  }

  var DEMO_ROW_STATUS = {
    'ZT2604270001': '未预约',
    'ZT2604200001': '待提货',
    'ZT2604260004': '待提货',
    'ZT2604260005': '待提货'
  };

  function getState(zt) {
    if (!SP_PICKED_STATE[zt]) SP_PICKED_STATE[zt] = { sessions: [] };
    return SP_PICKED_STATE[zt];
  }

  function getPickedPltSet(zt) {
    var set = {};
    getState(zt).sessions.forEach(function (s) {
      (s.plts || []).forEach(function (p) { set[p] = true; });
    });
    return set;
  }

  function countPickedPlts(zt) {
    var pallets = C.getPalletLabelsForZt(zt);
    var picked = getPickedPltSet(zt);
    var n = 0;
    pallets.forEach(function (p) { if (picked[p.pltNo]) n++; });
    return { picked: n, total: pallets.length };
  }

  function computePickupStatus(zt) {
    if (DEMO_ROW_STATUS[zt] === '未预约') return '未预约';
    var c = countPickedPlts(zt);
    if (c.picked === 0) return DEMO_ROW_STATUS[zt] || '待提货';
    if (c.picked >= c.total) return '已提货';
    return '部分提货';
  }

  function formatDtLocal(val) {
    return String(val || '').trim().replace('T', ' ');
  }

  function toDatetimeLocalValue(timeStr) {
    if (!timeStr) return '';
    var s = String(timeStr).trim().replace(' ', 'T');
    return s.length >= 16 ? s.substring(0, 16) : s;
  }

  function lastPickupTime(zt) {
    var sessions = getState(zt).sessions;
    return sessions.length ? sessions[sessions.length - 1].time : '';
  }

  function renderProgressHtml(zt) {
    if (computePickupStatus(zt) === '未预约') {
      return '<span class="sp-pick-progress text-muted">—</span>';
    }
    var c = countPickedPlts(zt);
    var html = '<div class="sp-pick-progress">';
    html += '<span class="sp-pick-progress-done">已提 <strong>' + c.picked + '</strong></span> / 共 ' + c.total + ' 板';
    html += '</div>';
    return html;
  }

  function setStatusBadge(tr, status) {
    var cell = tr.cells[5];
    if (!cell) return;
    var cls = 'status-badge s-未预约';
    var label = '未预约';
    if (status === '已提货') { cls = 'status-badge s-已提货'; label = '已提货'; }
    else if (status === '部分提货') { cls = 'status-badge s-部分提货'; label = '部分提货'; }
    else if (status === '待提货') { cls = 'status-badge s-待提货'; label = '待提货'; }
    cell.innerHTML = '<span class="' + cls + '"><span class="status-dot"></span>' + label + '</span>';
    if (typeof window.refreshPickupRowActions === 'function') window.refreshPickupRowActions(tr);
    if (status === '已提货' && window.SpPickupAppt) {
      var appt = SpPickupAppt.getAppt(zt);
      if (appt && appt.modifiedFields && appt.modifiedFields.length) {
        SpPickupAppt.saveAppt(zt, { modifiedFields: [] });
        SpPickupAppt.syncApptRow(tr);
      }
    }
  }

  function getVoucherFiles(zt) {
    return getState(zt).sessions
      .filter(function (s) { return s.voucher; })
      .map(function (s) {
        return { name: s.voucher, downloadCount: s.downloadCount || 0 };
      });
  }

  function renderVoucherCellHtml(zt) {
    var files = getVoucherFiles(zt);
    if (!files.length) return '—';
    var ztJs = String(zt || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return '<a class="td-link sp-list-file-link" href="#" title="查看自提凭证" onclick="spOpenPickupVouchers(\'' + ztJs + '\');return false;">自提凭证(' + files.length + ')</a>';
  }

  var SP_VOUCHER_FILE_CTX = { zt: '', files: [] };

  function spEnsurePickupVoucherModal() {
    if (document.getElementById('modal-sp-pickup-vouchers')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div id="modal-sp-pickup-vouchers" class="modal-overlay" onclick="closeModalOutside(event,\'modal-sp-pickup-vouchers\')">' +
      '<div class="modal" style="width:560px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;">' +
      '<div class="modal-header"><span class="modal-title" id="sp-pickup-vouchers-title">自提凭证</span>' +
      '<button class="modal-close" type="button" onclick="closeModal(\'modal-sp-pickup-vouchers\')">✕</button></div>' +
      '<div class="modal-body" style="overflow-y:auto;">' +
      '<div class="sp-appt-files-summary" id="sp-pickup-vouchers-summary"></div>' +
      '<div class="sp-appt-files-list" id="sp-pickup-vouchers-body"></div></div>' +
      '<div class="modal-footer">' +
      '<button class="btn btn-default" type="button" onclick="closeModal(\'modal-sp-pickup-vouchers\')">关闭</button>' +
      '</div></div></div>';
    document.body.appendChild(wrap.firstChild);
  }

  window.spOpenPickupVouchers = function (zt) {
    zt = String(zt || '').trim();
    if (!zt) return;
    spEnsurePickupVoucherModal();
    var files = getVoucherFiles(zt);
    SP_VOUCHER_FILE_CTX = { zt: zt, files: files.slice() };
    var title = document.getElementById('sp-pickup-vouchers-title');
    var sum = document.getElementById('sp-pickup-vouchers-summary');
    var body = document.getElementById('sp-pickup-vouchers-body');
    if (title) title.textContent = '自提凭证 · ' + zt;
    if (sum) {
      sum.innerHTML = files.length
        ? '共 <strong>' + files.length + '</strong> 个文件'
        : '';
      sum.style.display = files.length ? '' : 'none';
    }
    if (body) {
      if (!files.length) {
        body.innerHTML = '<div class="sp-appt-files-empty">暂无自提凭证</div>';
      } else {
        body.innerHTML = files.map(function (f, idx) {
          var dl = f.downloadCount || 0;
          return '<div class="sp-appt-files-item">' +
            '<span class="sp-appt-files-ico" aria-hidden="true">📄</span>' +
            '<span class="sp-appt-files-name" title="' + C.esc(f.name) + '">' + C.esc(f.name) + '</span>' +
            '<span class="sp-appt-files-dl-count">已下载 ' + dl + ' 次</span>' +
            '<a class="td-link" href="#" onclick="spDownloadPickupVoucher(' + idx + ');return false;">下载</a>' +
            '</div>';
        }).join('');
      }
    }
    showModal('modal-sp-pickup-vouchers');
  };

  window.spDownloadPickupVoucher = function (idx) {
    var zt = SP_VOUCHER_FILE_CTX.zt;
    var state = getState(zt);
    var voucherSessions = state.sessions.filter(function (s) { return s.voucher; });
    var session = voucherSessions[idx];
    if (!session) return;
    session.downloadCount = (session.downloadCount || 0) + 1;
    showToast('下载 ' + session.voucher + '（演示）', 'success');
    spOpenPickupVouchers(zt);
    var tr = C.findRow(zt);
    if (tr && tr.cells[C.COL_VOUCHER]) {
      tr.cells[C.COL_VOUCHER].innerHTML = renderVoucherCellHtml(zt);
    }
  };

  function syncPickupRow(zt) {
    var tr = C.findRow(zt);
    if (!tr) return;
    var st = computePickupStatus(zt);
    if (st !== '未预约') {
      setStatusBadge(tr, st);
      var prog = tr.cells[C.COL_PROGRESS];
      if (prog) prog.innerHTML = renderProgressHtml(zt);
      var act = tr.cells[C.COL_ACTUAL_TIME];
      if (act) {
        var lt = lastPickupTime(zt);
        act.textContent = lt || '—';
      }
    }
    var vchCell = tr.cells[C.COL_VOUCHER];
    if (vchCell) vchCell.innerHTML = renderVoucherCellHtml(zt);
  }

  function syncAllPickupRows() {
    document.querySelectorAll('tr[data-sp-zt]').forEach(function (tr) {
      var zt = tr.getAttribute('data-sp-zt');
      if (zt) syncPickupRow(zt);
    });
  }

  function syncMarkPickedCheckAll() {
    var allCb = document.getElementById('sp-mark-picked-check-all');
    if (!allCb) return;
    var rowCbs = document.querySelectorAll('#sp-mark-picked-tbody .sp-mark-picked-cb');
    if (!rowCbs.length) {
      allCb.checked = false;
      allCb.indeterminate = false;
      allCb.disabled = true;
      syncMarkPickedSelSummary();
      return;
    }
    allCb.disabled = false;
    var checked = document.querySelectorAll('#sp-mark-picked-tbody .sp-mark-picked-cb:checked');
    allCb.checked = checked.length === rowCbs.length;
    allCb.indeterminate = checked.length > 0 && checked.length < rowCbs.length;
    syncMarkPickedSelSummary();
  }

  function pendingTotals(pending) {
    return {
      plts: pending.length,
      pieces: pending.reduce(function (sum, p) {
        return sum + (typeof p.pieces === 'number' ? p.pieces : 0);
      }, 0)
    };
  }

  function selectedMarkPickedTotals() {
    var plts = 0;
    var pieces = 0;
    document.querySelectorAll('#sp-mark-picked-tbody .sp-mark-picked-cb:checked').forEach(function (cb) {
      plts++;
      var tr = cb.closest('tr');
      var n = tr && tr.cells[2] ? parseInt(tr.cells[2].textContent, 10) : 0;
      pieces += isNaN(n) ? 0 : n;
    });
    return { plts: plts, pieces: pieces };
  }

  function renderMpbMetrics(plts, pieces, tone) {
    return '<span class="sp-mpb-metric sp-mpb-metric--' + tone + '">' +
      '<span class="sp-mpb-num">' + plts + '</span><span class="sp-mpb-unit">板</span></span>' +
      '<span class="sp-mpb-metric sp-mpb-metric--' + tone + '">' +
      '<span class="sp-mpb-num">' + pieces + '</span><span class="sp-mpb-unit">件</span></span>';
  }

  function syncMarkPickedSelSummary() {
    var el = document.getElementById('sp-mark-picked-sel-summary');
    var group = document.getElementById('sp-mark-picked-sel-group');
    if (!el) return;
    var sel = selectedMarkPickedTotals();
    var tone = sel.plts > 0 ? 'active' : 'idle';
    el.innerHTML = renderMpbMetrics(sel.plts, sel.pieces, tone);
    if (group) group.classList.toggle('is-active', sel.plts > 0);
  }

  function renderMarkPickedPalletBar(pending) {
    var bar = document.getElementById('sp-mark-picked-pallet-bar');
    var pendingMeta = document.getElementById('sp-mark-picked-pending-meta');
    if (!bar || !pendingMeta) return;
    if (!pending.length) {
      bar.style.display = 'none';
      pendingMeta.innerHTML = '';
      syncMarkPickedSelSummary();
      return;
    }
    var t = pendingTotals(pending);
    bar.style.display = '';
    pendingMeta.innerHTML = renderMpbMetrics(t.plts, t.pieces, 'pending');
    syncMarkPickedSelSummary();
  }

  function bindMarkPickedCheckAll() {
    var allCb = document.getElementById('sp-mark-picked-check-all');
    var tbody = document.getElementById('sp-mark-picked-tbody');
    if (!allCb || !tbody || allCb._spBound) return;
    allCb._spBound = true;
    allCb.addEventListener('change', function () {
      var checked = allCb.checked;
      document.querySelectorAll('#sp-mark-picked-tbody .sp-mark-picked-cb').forEach(function (cb) {
        cb.checked = checked;
      });
      allCb.indeterminate = false;
    });
    tbody.addEventListener('change', function (e) {
      if (e.target && e.target.classList.contains('sp-mark-picked-cb')) {
        syncMarkPickedCheckAll();
      }
    });
  }

  function renderMarkPickedModal(zt, requireVoucher) {
    var pallets = C.getPalletLabelsForZt(zt);
    var pickedSet = getPickedPltSet(zt);
    var pending = pallets.filter(function (p) { return !pickedSet[p.pltNo]; });
    var title = document.getElementById('sp-mark-picked-title');
    var tip = document.getElementById('sp-mark-picked-tip');
    var ztRo = document.getElementById('sp-mark-picked-zt-ro');
    var custRefEl = document.getElementById('sp-mark-picked-cust-ref');
    var sum = document.getElementById('sp-mark-picked-prior');
    var tbody = document.getElementById('sp-mark-picked-tbody');
    var dt = document.getElementById('sp-mark-picked-time');
    var vch = document.getElementById('sp-mark-picked-voucher');
    var vchWrap = document.getElementById('sp-mark-picked-voucher-wrap');
    var err = document.getElementById('sp-mark-picked-error');

    if (title) title.textContent = '登记已提货 · ' + zt;
    if (ztRo) ztRo.value = zt;
    var tr = C.findRow(zt);
    if (custRefEl) custRefEl.textContent = C.getRowCustRef(tr);
    if (dt) {
      var now = new Date();
      dt.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + 'T' + String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0');
    }
    if (vch) vch.value = '';
    if (err) { err.style.display = 'none'; err.textContent = ''; }
    if (vchWrap) vchWrap.style.display = requireVoucher ? '' : '';

    var sessions = getState(zt).sessions;
    if (sum) {
      if (!sessions.length) {
        sum.style.display = 'none';
        sum.innerHTML = '';
      } else {
        sum.style.display = '';
        sum.innerHTML = '已完成 <strong>' + sessions.length + '</strong> 次自提 · 已提 <strong>' + countPickedPlts(zt).picked + '</strong> / ' + pallets.length + ' 板。本次可继续勾选未提板标。';
      }
    }
    if (tip) {
      tip.innerHTML = pending.length
        ? '请勾选本次提货的板标，并填写<strong>自提时间</strong>。支持分多次提货，已提板标不可重复勾选。'
        : '该单板标已全部提完。';
    }
    if (!tbody) return;
    if (!pending.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);">无可提板标</td></tr>';
      renderMarkPickedPalletBar([]);
      syncMarkPickedCheckAll();
      return;
    }
    tbody.innerHTML = pending.map(function (p) {
      var autoCheck = pending.length === 1 ? ' checked' : '';
      return '<tr>' +
        '<td><input type="checkbox" class="sp-mark-picked-cb" value="' + C.esc(p.pltNo) + '"' + autoCheck + '></td>' +
        '<td><strong>' + C.esc(p.pltNo) + '</strong></td>' +
        '<td>' + C.esc(p.pieces) + '</td>' +
        '<td><span class="loc-pw-plt-st ' + C.pltStatusCls(p.status) + '">' + C.esc(p.status) + '</span></td>' +
        '<td>' + C.esc(p.container) + '</td>' +
        '<td>' + C.esc(p.location) + '</td>' +
        '<td>' + C.esc(p.warehouseZone) + '</td>' +
        '<td>' + C.esc(p.warehouseName) + '</td>' +
        '<td>' + C.esc(p.sysNo) + '</td>' +
        '</tr>';
    }).join('');
    renderMarkPickedPalletBar(pending);
    syncMarkPickedCheckAll();
  }

  window.spOpenMarkPicked = function (zt, requireVoucher) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr = C.findRow(zt);
    if (!tr) return showToast('未找到该自提单', 'warning');
    var st = C.getRowStatus(tr);
    if (st === '未预约') return showToast('请先完成预约提货', 'warning');
    if (st === '已提货') return showToast('板标已全部提完，请通过「提货记录」查看', 'warning');
    var pending = C.getPalletLabelsForZt(zt).filter(function (p) { return !getPickedPltSet(zt)[p.pltNo]; });
    if (!pending.length) return showToast('无可提板标', 'warning');

    var hid = document.getElementById('sp-mark-picked-zt');
    var req = document.getElementById('sp-mark-picked-require-voucher');
    if (hid) hid.value = zt;
    if (req) req.value = requireVoucher ? '1' : '';
    renderMarkPickedModal(zt, !!requireVoucher);
    showModal('modal-sp-mark-picked');
  };

  window.spOpenMarkPickedFromToolbar = function () {
    var rows = C.getCheckedZtRows();
    if (rows.length !== 1) {
      return showToast('请勾选且仅勾选 1 条待提货或部分提货的自提单', 'warning');
    }
    var zt = rows[0].getAttribute('data-sp-zt');
    var st = C.getRowStatus(rows[0]);
    if (st !== '待提货' && st !== '部分提货') {
      return showToast('仅「待提货」或「部分提货」可登记客户已提货', 'warning');
    }
    spOpenMarkPicked(zt, true);
  };

  window.spConfirmMarkPicked = function () {
    var zt = ((document.getElementById('sp-mark-picked-zt') || {}).value || '').trim();
    var requireVoucher = ((document.getElementById('sp-mark-picked-require-voucher') || {}).value || '') === '1';
    var dt = document.getElementById('sp-mark-picked-time');
    var vch = document.getElementById('sp-mark-picked-voucher');
    var err = document.getElementById('sp-mark-picked-error');

    if (!zt) {
      closeModal('modal-sp-mark-picked');
      return showToast('未找到该自提单', 'warning');
    }
    var time = formatDtLocal(dt && dt.value);
    if (!time) {
      if (err) { err.textContent = '请填写自提时间'; err.style.display = 'block'; }
      if (dt) dt.focus();
      return;
    }
    var file = vch && vch.files && vch.files[0] ? vch.files[0] : null;
    if (requireVoucher && !file) {
      if (err) { err.textContent = '请上传自提凭证'; err.style.display = 'block'; }
      return;
    }

    var picked = [];
    document.querySelectorAll('#sp-mark-picked-tbody .sp-mark-picked-cb:checked').forEach(function (cb) {
      picked.push(cb.value);
    });
    if (!picked.length) {
      if (err) { err.textContent = '请至少勾选 1 个板标'; err.style.display = 'block'; }
      return;
    }

    var pickedSet = getPickedPltSet(zt);
    for (var i = 0; i < picked.length; i++) {
      if (pickedSet[picked[i]]) {
        if (err) { err.textContent = '板标 ' + picked[i] + ' 已提货，请勿重复勾选'; err.style.display = 'block'; }
        return;
      }
    }

    if (err) { err.style.display = 'none'; err.textContent = ''; }
    getState(zt).sessions.push({
      time: time,
      plts: picked,
      voucher: file ? (file.name || '附件') : ''
    });
    closeModal('modal-sp-mark-picked');
    syncPickupRow(zt);
    var st = computePickupStatus(zt);
    var msg = '第 ' + getState(zt).sessions.length + ' 次自提已登记：' + picked.join('、') + ' · ' + time;
    showToast(msg, st === '已提货' ? 'success' : 'success');
  };

  window.spOpenPickSessions = function (zt) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr = C.findRow(zt);
    if (!tr) return showToast('未找到该自提单', 'warning');
    var sessions = getState(zt).sessions;
    if (!sessions.length) return showToast('暂无提货记录', 'warning');

    var title = document.getElementById('sp-pick-sessions-title');
    var sum = document.getElementById('sp-pick-sessions-summary');
    var tbody = document.getElementById('sp-pick-sessions-tbody');
    var pallets = C.getPalletLabelsForZt(zt);
    var pltMap = {};
    pallets.forEach(function (p) { pltMap[p.pltNo] = p; });

    if (title) title.textContent = '提货记录 · ' + zt;
    var c = countPickedPlts(zt);
    if (sum) {
      sum.innerHTML =
        '<span>自提单 <strong>' + C.esc(zt) + '</strong></span>' +
        '<span>共 <strong>' + sessions.length + '</strong> 次自提</span>' +
        '<span>已提 <strong>' + c.picked + '</strong> / ' + c.total + ' 板</span>' +
        (lastPickupTime(zt) ? '<span>最近自提 <strong>' + C.esc(lastPickupTime(zt)) + '</strong></span>' : '');
    }
    if (!tbody) return;
    tbody.innerHTML = sessions.map(function (s, idx) {
      var plts = s.plts || [];
      var totalPieces = 0;
      plts.forEach(function (plt) {
        var p = pltMap[plt];
        if (p && typeof p.pieces === 'number') totalPieces += p.pieces;
      });
      var qtyText = plts.length ? String(totalPieces) : '—';
      var pltCountText = plts.length ? String(plts.length) : '—';
      return '<tr><td>' + (idx + 1) + '</td>' +
        '<td>' + C.esc(s.time) + '</td>' +
        '<td class="sp-pick-sessions-plts-cell">' + renderPltListText(plts) + '</td>' +
        '<td>' + C.esc(qtyText) + '</td>' +
        '<td>' + C.esc(pltCountText) + '</td>' +
        '<td>' + (s.voucher ? C.esc(s.voucher) : '—') + '</td></tr>';
    }).join('');
    showModal('modal-sp-pick-sessions');
  };

  window.spRevokeAllPicked = function (zt) {
    SP_PICKED_STATE[zt] = { sessions: [] };
    DEMO_ROW_STATUS[zt] = '待提货';
    syncPickupRow(zt);
  };

  function sessionQtyPltStats(plts, pltMap) {
    var list = plts || [];
    var totalPieces = 0;
    list.forEach(function (plt) {
      var p = pltMap[plt];
      if (p && typeof p.pieces === 'number') totalPieces += p.pieces;
    });
    return {
      qty: list.length ? String(totalPieces) : '—',
      pltCount: list.length ? String(list.length) : '—'
    };
  }

  window.spOpenEditPickupVoucher = function (zt) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var sessions = getState(zt).sessions;
    if (!sessions.length) {
      return showToast('暂无提货记录，无法修改', 'warning');
    }
    var pallets = C.getPalletLabelsForZt(zt);
    var pltMap = {};
    pallets.forEach(function (p) { pltMap[p.pltNo] = p; });

    var hid = document.getElementById('sp-ev-zt-value');
    var sum = document.getElementById('sp-ev-edit-summary');
    var tbody = document.getElementById('sp-ev-edit-tbody');
    var err = document.getElementById('sp-ev-error');
    if (hid) hid.value = zt;
    if (err) { err.style.display = 'none'; err.textContent = ''; }

    var c = countPickedPlts(zt);
    if (sum) {
      sum.innerHTML =
        '<span>自提单 <strong>' + C.esc(zt) + '</strong></span>' +
        '<span>共 <strong>' + sessions.length + '</strong> 次自提</span>' +
        '<span>已提 <strong>' + c.picked + '</strong> / ' + c.total + ' 板</span>' +
        (lastPickupTime(zt) ? '<span>最近自提 <strong>' + C.esc(lastPickupTime(zt)) + '</strong></span>' : '');
    }

    if (tbody) {
      tbody.innerHTML = sessions.map(function (s, idx) {
        var plts = s.plts || [];
        var stats = sessionQtyPltStats(plts, pltMap);
        var vchName = s.voucher
          ? '<span class="sp-ev-edit-voucher-name">' + C.esc(s.voucher) + '</span>'
          : '<span class="sp-ev-edit-voucher-name sp-ev-edit-voucher-name--empty">暂无</span>';
        var vchCell = vchName +
          (s.voucher
            ? '<div style="margin-top:6px;"><button type="button" class="btn btn-default btn-xs" onclick="showToast(\'凭证下载已开始\')">下载</button></div>'
            : '');
        return '<tr data-session-idx="' + idx + '">' +
          '<td>' + (idx + 1) + '</td>' +
          '<td><input type="datetime-local" id="sp-ev-time-' + idx + '" class="form-input sp-ev-session-time" data-session-idx="' + idx + '" lang="zh-CN" value="' + C.esc(toDatetimeLocalValue(s.time)) + '"></td>' +
          '<td class="sp-pick-sessions-plts-cell">' + renderPltListText(plts) + '</td>' +
          '<td>' + C.esc(stats.qty) + '</td>' +
          '<td>' + C.esc(stats.pltCount) + '</td>' +
          '<td>' + vchCell + '</td>' +
          '<td><input type="file" id="sp-ev-voucher-' + idx + '" class="form-input sp-ev-session-voucher" data-session-idx="' + idx + '" accept="image/*,.pdf,.zip"></td>' +
          '</tr>';
      }).join('');
    }
    showModal('modal-edit-pickup-voucher');
  };

  window.spConfirmEditPickupVoucher = function () {
    var zt = ((document.getElementById('sp-ev-zt-value') || {}).value || '').trim();
    var err = document.getElementById('sp-ev-error');
    if (!zt) {
      closeModal('modal-edit-pickup-voucher');
      return showToast('未找到该自提单', 'warning');
    }
    var state = getState(zt);
    var timeInputs = document.querySelectorAll('#sp-ev-edit-tbody .sp-ev-session-time');
    var voucherInputs = document.querySelectorAll('#sp-ev-edit-tbody .sp-ev-session-voucher');
    if (!timeInputs.length || timeInputs.length !== state.sessions.length) {
      if (err) { err.textContent = '加载异常，请关闭后重试'; err.style.display = 'block'; }
      return;
    }
    var voucherUpdated = 0;
    for (var i = 0; i < timeInputs.length; i++) {
      var t = formatDtLocal(timeInputs[i].value);
      if (!t) {
        if (err) { err.textContent = '请填写第 ' + (i + 1) + ' 次自提时间'; err.style.display = 'block'; }
        timeInputs[i].focus();
        return;
      }
      state.sessions[i].time = t;
    }
    for (var j = 0; j < voucherInputs.length; j++) {
      var fi = voucherInputs[j];
      var file = fi.files && fi.files[0] ? fi.files[0] : null;
      if (!file) continue;
      var idx = parseInt(fi.getAttribute('data-session-idx'), 10);
      if (!isNaN(idx) && state.sessions[idx]) {
        state.sessions[idx].voucher = file.name || '附件';
        voucherUpdated++;
      }
    }
    if (err) { err.style.display = 'none'; err.textContent = ''; }
    closeModal('modal-edit-pickup-voucher');
    syncPickupRow(zt);
    var parts = ['已更新自提时间'];
    if (voucherUpdated) parts.push(voucherUpdated + ' 份凭证');
    showToast(parts.join('，'), 'success');
  };

  window.spBootPickupDemo = function () {
    syncAllPickupRows();
  };

  bindMarkPickedCheckAll();
})();
