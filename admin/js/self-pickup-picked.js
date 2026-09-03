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
        vouchers: [{ name: 'pickup-voucher-101.pdf', downloadCount: 0 }]
      }]
    },
    'ZT2604250001': {
      sessions: [
        {
          time: '2026-04-25 09:20',
          plts: ['PLT-LAX-310', 'PLT-LAX-311', 'PLT-LAX-312', 'PLT-LAX-313', 'PLT-LAX-314', 'PLT-LAX-315'],
          vouchers: [{ name: 'pickup-voucher-batch1.pdf', downloadCount: 0 }]
        },
        {
          time: '2026-04-25 14:35',
          plts: ['PLT-LAX-316', 'PLT-LAX-317'],
          vouchers: [{ name: 'pickup-voucher-batch2.pdf', downloadCount: 0 }]
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
    var s = String(val || '').trim().replace('T', ' ').replace(/\//g, '-');
    s = s.replace(/\s+/g, ' ');
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ ](\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!m) return '';
    return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0') +
      ' ' + String(m[4]).padStart(2, '0') + ':' + String(m[5]).padStart(2, '0');
  }

  function toPickupTimeInputValue(timeStr) {
    return formatDtLocal(timeStr) || '';
  }

  function assignFilesToInput(input, files) {
    if (!input || !files || !files.length) return;
    try {
      var dt = new DataTransfer();
      var list = Array.prototype.slice.call(files);
      if (!input.multiple && list.length > 1) list = [list[0]];
      list.forEach(function (f) { dt.items.add(f); });
      input.files = dt.files;
    } catch (e) {
      /* ignore: some browsers block programmatic FileList assign */
    }
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function getSessionVouchers(s) {
    if (!s) return [];
    if (Array.isArray(s.vouchers)) {
      return s.vouchers.filter(function (v) { return v && v.name; });
    }
    if (s.voucher) {
      s.vouchers = [{ name: s.voucher, downloadCount: s.downloadCount || 0 }];
      delete s.voucher;
      delete s.downloadCount;
      return s.vouchers;
    }
    if (!s.vouchers) s.vouchers = [];
    return s.vouchers;
  }

  function sessionVoucherCount(s) {
    return getSessionVouchers(s).length;
  }

  function sessionVoucherLabel(s) {
    var list = getSessionVouchers(s);
    if (!list.length) return '—';
    if (list.length === 1) return list[0].name;
    return list.length + ' 份';
  }

  var SP_EV_VOUCHER_DRAFT = { zt: '', sessionIdx: -1, kept: [], pending: [] };

  function spEvDraftTotalCount() {
    return (SP_EV_VOUCHER_DRAFT.kept || []).length + (SP_EV_VOUCHER_DRAFT.pending || []).length;
  }

  function bindEvSessionVoucherDrop() {
    var drop = document.getElementById('sp-ev-session-voucher-drop');
    var input = document.getElementById('sp-ev-session-voucher');
    if (!drop || !input || drop.dataset.bound === '1') return;
    drop.dataset.bound = '1';
    drop.addEventListener('click', function (e) {
      if (e.target === input) return;
      input.click();
    });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        input.click();
      }
    });
    input.addEventListener('change', function () {
      var files = input.files ? Array.prototype.slice.call(input.files) : [];
      spEvAddPendingVouchers(files);
      input.value = '';
    });
    ['dragenter', 'dragover'].forEach(function (evt) {
      drop.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        drop.classList.add('is-drag');
      });
    });
    drop.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!drop.contains(e.relatedTarget)) drop.classList.remove('is-drag');
    });
    drop.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      drop.classList.remove('is-drag');
      var files = e.dataTransfer && e.dataTransfer.files
        ? Array.prototype.slice.call(e.dataTransfer.files)
        : [];
      spEvAddPendingVouchers(files);
    });
  }

  var SP_VOUCHER_MAX_BYTES = 20 * 1024 * 1024;

  function spEvAddPendingVouchers(files) {
    var list = (files || []).filter(Boolean);
    if (!list.length) return;
    var oversized = [];
    list.forEach(function (file) {
      if (typeof file.size === 'number' && file.size > SP_VOUCHER_MAX_BYTES) {
        oversized.push(file.name || '附件');
        return;
      }
      SP_EV_VOUCHER_DRAFT.pending.push({
        name: file.name || '附件',
        file: file
      });
    });
    if (oversized.length) {
      showToast('单个文件不超过 20MB：' + oversized.slice(0, 3).join('、') + (oversized.length > 3 ? ' 等' : ''), 'warning');
    }
    spEvRenderVoucherDraft();
  }

  function spEvRenderVoucherDraft() {
    var keptEl = document.getElementById('sp-ev-voucher-kept');
    var keptEmpty = document.getElementById('sp-ev-voucher-kept-empty');
    var pendingEl = document.getElementById('sp-ev-voucher-pending');
    var kept = SP_EV_VOUCHER_DRAFT.kept || [];
    var pending = SP_EV_VOUCHER_DRAFT.pending || [];

    if (keptEmpty) keptEmpty.style.display = kept.length ? 'none' : '';
    if (keptEl) {
      keptEl.innerHTML = kept.map(function (f, i) {
        return '<div class="sp-ev-voucher-file-row">' +
          '<span class="sp-ev-voucher-file-name" title="' + C.esc(f.name) + '">📄 ' + C.esc(f.name) + '</span>' +
          '<div class="sp-ev-voucher-file-actions">' +
          (spCanPreviewEvFileName(f.name) ? '<button type="button" class="btn btn-default btn-xs" onclick="spPreviewEvDraftVoucher(\'kept\',' + i + ')">预览</button>' : '') +
          '<button type="button" class="btn btn-default btn-xs" onclick="spDownloadEvDraftVoucher(\'kept\',' + i + ')">下载</button>' +
          '<button type="button" class="btn btn-default btn-xs sp-ev-voucher-file-remove" onclick="spRemoveEvDraftVoucher(\'kept\',' + i + ')">删除</button>' +
          '</div></div>';
      }).join('');
    }
    if (pendingEl) {
      pendingEl.innerHTML = pending.map(function (f, i) {
        return '<div class="sp-ev-voucher-file-row sp-ev-voucher-file-row--pending">' +
          '<span class="sp-ev-voucher-file-name" title="' + C.esc(f.name) + '">📄 ' + C.esc(f.name) + '</span>' +
          '<div class="sp-ev-voucher-file-actions">' +
          (spCanPreviewEvFileName(f.name) ? '<button type="button" class="btn btn-default btn-xs" onclick="spPreviewEvDraftVoucher(\'pending\',' + i + ')">预览</button>' : '') +
          '<button type="button" class="btn btn-default btn-xs sp-ev-voucher-file-remove" onclick="spRemoveEvDraftVoucher(\'pending\',' + i + ')">移除</button>' +
          '</div></div>';
      }).join('');
    }
  }

  window.spRemoveEvDraftVoucher = function (kind, idx) {
    idx = parseInt(idx, 10);
    if (kind === 'kept') {
      if (isNaN(idx) || !SP_EV_VOUCHER_DRAFT.kept[idx]) return;
      if (spEvDraftTotalCount() <= 1) {
        return showToast('至少保留 1 份凭证', 'warning');
      }
      SP_EV_VOUCHER_DRAFT.kept.splice(idx, 1);
    } else {
      if (isNaN(idx) || !SP_EV_VOUCHER_DRAFT.pending[idx]) return;
      if (spEvDraftTotalCount() <= 1) {
        return showToast('至少保留 1 份凭证', 'warning');
      }
      SP_EV_VOUCHER_DRAFT.pending.splice(idx, 1);
    }
    spEvRenderVoucherDraft();
  };

  window.spDownloadEvDraftVoucher = function (kind, idx) {
    idx = parseInt(idx, 10);
    var item = kind === 'pending' ? SP_EV_VOUCHER_DRAFT.pending[idx] : SP_EV_VOUCHER_DRAFT.kept[idx];
    if (!item) return;
    if (item.file instanceof File) {
      var url = URL.createObjectURL(item.file);
      var a = document.createElement('a');
      a.href = url;
      a.download = item.name || '附件';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    item.downloadCount = (item.downloadCount || 0) + 1;
    showToast('下载 ' + item.name + '（演示）', 'success');
  };

  window.spPreviewEvDraftVoucher = function (kind, idx) {
    idx = parseInt(idx, 10);
    var item = kind === 'pending' ? SP_EV_VOUCHER_DRAFT.pending[idx] : SP_EV_VOUCHER_DRAFT.kept[idx];
    if (!item) return;
    spOpenEvFilePreview(item.name, { file: item.file });
  };

  function refreshEditPickupVoucherList(zt) {
    var sessions = getState(zt).sessions;
    var pallets = C.getPalletLabelsForZt(zt);
    var pltMap = {};
    pallets.forEach(function (p) { pltMap[p.pltNo] = p; });
    var sum = document.getElementById('sp-ev-edit-summary');
    var tbody = document.getElementById('sp-ev-edit-tbody');
    var c = countPickedPlts(zt);
    if (sum) {
      sum.innerHTML =
        '<span>自提单 <strong>' + C.esc(zt) + '</strong></span>' +
        '<span>共 <strong>' + sessions.length + '</strong> 次自提</span>' +
        '<span>已提 <strong>' + c.picked + '</strong> / ' + c.total + ' 板</span>' +
        (lastPickupTime(zt) ? '<span>最近自提 <strong>' + C.esc(lastPickupTime(zt)) + '</strong></span>' : '');
    }
    if (!tbody) return;
    var ztJs = String(zt || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    tbody.innerHTML = sessions.map(function (s, idx) {
      var plts = s.plts || [];
      var stats = sessionQtyPltStats(plts, pltMap);
      var vCount = sessionVoucherCount(s);
      var vchCell = vCount
        ? '<span class="sp-ev-edit-voucher-count">' + vCount + '</span>'
        : '<span class="sp-ev-edit-voucher-count sp-ev-edit-voucher-count--empty">0</span>';
      return '<tr data-session-idx="' + idx + '">' +
        '<td>' + (idx + 1) + '</td>' +
        '<td><span class="sp-ev-edit-time">' + C.esc(toPickupTimeInputValue(s.time) || s.time || '—') + '</span></td>' +
        '<td class="sp-pick-sessions-plts-cell">' + renderPltListText(plts) + '</td>' +
        '<td>' + C.esc(stats.qty) + '</td>' +
        '<td>' + C.esc(stats.pltCount) + '</td>' +
        '<td>' + vchCell + '</td>' +
        '<td><button type="button" class="btn btn-default btn-xs" onclick="spOpenEditPickupSession(\'' + ztJs + '\',' + idx + ')">编辑</button></td>' +
        '</tr>';
    }).join('');
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
    var out = [];
    getState(zt).sessions.forEach(function (s, sIdx) {
      getSessionVouchers(s).forEach(function (v, vIdx) {
        out.push({
          name: v.name,
          downloadCount: v.downloadCount || 0,
          sessionIdx: sIdx,
          voucherIdx: vIdx
        });
      });
    });
    return out;
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
    var meta = SP_VOUCHER_FILE_CTX.files[idx];
    if (!meta) return;
    var session = getState(zt).sessions[meta.sessionIdx];
    var list = getSessionVouchers(session);
    var voucher = list[meta.voucherIdx];
    if (!voucher) return;
    voucher.downloadCount = (voucher.downloadCount || 0) + 1;
    showToast('下载 ' + voucher.name + '（演示）', 'success');
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
    if (file && typeof file.size === 'number' && file.size > SP_VOUCHER_MAX_BYTES) {
      if (err) { err.textContent = '自提凭证单个文件不超过 20MB'; err.style.display = 'block'; }
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
      vouchers: file ? [{ name: file.name || '附件', downloadCount: 0 }] : []
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
        '<td>' + C.esc(sessionVoucherLabel(s)) + '</td></tr>';
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
    var hid = document.getElementById('sp-ev-zt-value');
    if (hid) hid.value = zt;
    refreshEditPickupVoucherList(zt);
    showModal('modal-edit-pickup-voucher');
  };

  var SP_EV_FILE_PREVIEW_URL = '';

  function spRevokeEvFilePreviewUrl() {
    if (!SP_EV_FILE_PREVIEW_URL) return;
    try { URL.revokeObjectURL(SP_EV_FILE_PREVIEW_URL); } catch (e) { /* ignore */ }
    SP_EV_FILE_PREVIEW_URL = '';
  }

  function spGetEvFilePreviewKind(name) {
    var n = String(name || '').toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|bmp)$/.test(n)) return 'image';
    if (/\.pdf$/.test(n)) return 'pdf';
    return 'other';
  }

  function spCanPreviewEvFileName(name) {
    var kind = spGetEvFilePreviewKind(name);
    return kind === 'image' || kind === 'pdf';
  }

  function spBuildEvDemoPreviewDataUrl(name) {
    var text = String(name || '自提凭证');
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">' +
      '<rect width="100%" height="100%" fill="#F1F5F9"/>' +
      '<rect x="80" y="60" width="800" height="600" rx="12" fill="#fff" stroke="#CBD5E1"/>' +
      '<text x="480" y="340" text-anchor="middle" font-size="28" fill="#64748B" font-family="sans-serif">演示预览</text>' +
      '<text x="480" y="390" text-anchor="middle" font-size="20" fill="#94A3B8" font-family="sans-serif">' + text.replace(/[<>&"']/g, '') + '</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  window.spCloseEvFilePreview = function () {
    spRevokeEvFilePreviewUrl();
    var body = document.getElementById('sp-ev-file-preview-body');
    if (body) body.innerHTML = '';
    closeModal('modal-sp-ev-file-preview');
  };

  window.spOpenEvFilePreview = function (name, opts) {
    opts = opts || {};
    name = String(name || '').trim();
    if (!name) return showToast('暂无凭证可预览', 'warning');
    if (!spCanPreviewEvFileName(name) && !(opts.file instanceof File)) {
      return showToast('该文件类型暂不支持预览，请下载查看', 'warning');
    }
    spRevokeEvFilePreviewUrl();
    var title = document.getElementById('sp-ev-file-preview-title');
    var body = document.getElementById('sp-ev-file-preview-body');
    if (title) title.textContent = '预览 · ' + name;
    if (!body) return;
    var kind = spGetEvFilePreviewKind(name);
    var html = '';
    if (opts.file instanceof File) {
      var mime = String(opts.file.type || '');
      if (kind === 'other' && mime.indexOf('image/') !== 0 && mime !== 'application/pdf') {
        return showToast('该文件类型暂不支持预览，请下载查看', 'warning');
      }
      var url = URL.createObjectURL(opts.file);
      SP_EV_FILE_PREVIEW_URL = url;
      if (kind === 'image' || mime.indexOf('image/') === 0) {
        html = '<img src="' + url + '" alt="' + C.esc(name) + '">';
      } else {
        html = '<iframe src="' + url + '" title="' + C.esc(name) + '"></iframe>';
      }
    } else if (kind === 'image') {
      html = '<img src="' + spBuildEvDemoPreviewDataUrl(name) + '" alt="' + C.esc(name) + '">';
    } else if (kind === 'pdf') {
      html = '<div class="sp-ev-file-preview-fallback">' +
        '<p class="sp-ev-file-preview-fallback-ico" aria-hidden="true">📄</p>' +
        '<p><strong>' + C.esc(name) + '</strong></p>' +
        '<p>演示环境暂无 PDF 原件，可下载查看。</p></div>';
    } else {
      return showToast('该文件类型暂不支持预览，请下载查看', 'warning');
    }
    body.innerHTML = html;
    showModal('modal-sp-ev-file-preview');
  };

  window.spOpenEditPickupSession = function (zt, idx) {
    zt = String(zt || '').trim();
    idx = parseInt(idx, 10);
    var sessions = getState(zt).sessions;
    if (!zt || isNaN(idx) || !sessions[idx]) {
      return showToast('未找到该次自提记录', 'warning');
    }
    var s = sessions[idx];
    var pallets = C.getPalletLabelsForZt(zt);
    var pltMap = {};
    pallets.forEach(function (p) { pltMap[p.pltNo] = p; });
    var stats = sessionQtyPltStats(s.plts || [], pltMap);

    var ztEl = document.getElementById('sp-ev-session-zt');
    var idxEl = document.getElementById('sp-ev-session-idx');
    var title = document.getElementById('sp-ev-session-title');
    var meta = document.getElementById('sp-ev-session-meta');
    var timeEl = document.getElementById('sp-ev-session-time');
    var fileEl = document.getElementById('sp-ev-session-voucher');
    var err = document.getElementById('sp-ev-session-error');

    if (ztEl) ztEl.value = zt;
    if (idxEl) idxEl.value = String(idx);
    if (title) title.textContent = '编辑自提记录';
    if (meta) {
      meta.innerHTML =
        '<span>自提单 <strong>' + C.esc(zt) + '</strong></span>' +
        '<span>件数 <strong>' + C.esc(stats.qty) + '</strong></span>' +
        '<span>板数 <strong>' + C.esc(stats.pltCount) + '</strong></span>';
    }
    if (timeEl) timeEl.value = toPickupTimeInputValue(s.time) || '';
    if (fileEl) fileEl.value = '';
    if (err) { err.style.display = 'none'; err.textContent = ''; }

    SP_EV_VOUCHER_DRAFT = {
      zt: zt,
      sessionIdx: idx,
      kept: getSessionVouchers(s).map(function (v) {
        return { name: v.name, downloadCount: v.downloadCount || 0 };
      }),
      pending: []
    };
    bindEvSessionVoucherDrop();
    spEvRenderVoucherDraft();
    showModal('modal-edit-pickup-session');
  };

  window.spConfirmEditPickupSession = function () {
    var zt = ((document.getElementById('sp-ev-session-zt') || {}).value || '').trim();
    var idx = parseInt(((document.getElementById('sp-ev-session-idx') || {}).value || ''), 10);
    var timeEl = document.getElementById('sp-ev-session-time');
    var err = document.getElementById('sp-ev-session-error');
    var state = getState(zt);
    if (!zt || isNaN(idx) || !state.sessions[idx]) {
      closeModal('modal-edit-pickup-session');
      return showToast('未找到该次自提记录', 'warning');
    }
    var t = formatDtLocal(timeEl && timeEl.value);
    if (!t) {
      if (err) { err.textContent = '请填写自提时间（yyyy-mm-dd HH:mm）'; err.style.display = 'block'; }
      if (timeEl) timeEl.focus();
      return;
    }
    var kept = SP_EV_VOUCHER_DRAFT.kept || [];
    var pending = SP_EV_VOUCHER_DRAFT.pending || [];
    if (kept.length + pending.length < 1) {
      if (err) { err.textContent = '至少保留 1 份凭证'; err.style.display = 'block'; }
      return;
    }
    var nextVouchers = kept.map(function (v) {
      return { name: v.name, downloadCount: v.downloadCount || 0 };
    }).concat(pending.map(function (v) {
      return { name: v.name || '附件', downloadCount: 0 };
    }));
    state.sessions[idx].time = t;
    state.sessions[idx].vouchers = nextVouchers;
    delete state.sessions[idx].voucher;
    delete state.sessions[idx].downloadCount;
    if (err) { err.style.display = 'none'; err.textContent = ''; }
    closeModal('modal-edit-pickup-session');
    syncPickupRow(zt);
    refreshEditPickupVoucherList(zt);
    showToast('已更新自提时间与凭证', 'success');
  };

  window.spBootPickupDemo = function () {
    syncAllPickupRows();
  };

  bindMarkPickedCheckAll();
})();
