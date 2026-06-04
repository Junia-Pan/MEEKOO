/**
 * 自提单：按板标勾选拆分（与本地私仓卡派拆分发货交互一致）
 */
(function () {
  var COL_ZT = 2;
  var COL_STATUS = 5;
  var COL_CONTAINER = 9;
  var COL_LOCATION = 11;
  var COL_SYS = 8;
  var COL_ACTUAL_PALLETS = 16;

  var SP_PALLET_LABELS = {
    'ZT-2026-M0401': [
      { pltNo: 'PLT-LAX-301', status: '已上架', location: 'A-12-03', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 15, container: 'MSKU1234567', sysNo: 'EXP-2026-0401' },
      { pltNo: 'PLT-LAX-302', status: '已上架', location: 'A-12-04', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 20, container: 'MSKU2233445', sysNo: 'EXP-2026-0402' },
      { pltNo: 'PLT-LAX-303', status: '待上架', location: 'B-05-02', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 12, container: 'MSKU3390008', sysNo: 'EXP-2026-0403' },
      { pltNo: 'PLT-LAX-304', status: '已上架', location: 'B-05-03', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 13, container: 'MSKU3390008', sysNo: 'EXP-2026-0403' }
    ],
    'ZT-2026-0405': [
      { pltNo: 'PLT-LAX-205', status: '已上架', location: 'D-01-01', warehouseZone: 'D区待发区', warehouseName: 'LA1150', pieces: 14, container: 'MSKU4400123', sysNo: 'EXP-2026-0405' },
      { pltNo: 'PLT-LAX-206', status: '已上架', location: 'D-01-02', warehouseZone: 'D区待发区', warehouseName: 'LA1150', pieces: 14, container: 'MSKU4400123', sysNo: 'EXP-2026-0405' }
    ],
    'ZT-2026-0402': [
      { pltNo: 'PLT-LAX-401', status: '已上架', location: 'A-01-02', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 8, container: 'MSKU2234567', sysNo: 'EXP-2026-0402' },
      { pltNo: 'PLT-LAX-402', status: '已上架', location: 'A-01-03', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 14, container: 'MSKU2234567', sysNo: 'EXP-2026-0402' }
    ]
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function spFindRow(zt) {
    return document.querySelector('tr[data-sp-zt="' + zt.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
  }

  function spGetRowStatus(tr) {
    var cell = tr.cells[COL_STATUS];
    if (!cell) return '';
    var t = cell.textContent || '';
    if (t.indexOf('已提货') >= 0) return '已提货';
    if (t.indexOf('部分提货') >= 0) return '部分提货';
    if (t.indexOf('待提货') >= 0) return '待提货';
    if (t.indexOf('未预约') >= 0) return '未预约';
    return '';
  }

  function spGetShipMode(tr) {
    if (tr.querySelector('.loc-pw-ship-mode--split')) return 'split';
    if (tr.querySelector('.loc-pw-ship-mode--merge')) return 'merge';
    return 'normal';
  }

  function spGetRowPalletCount(tr) {
    if (!tr) return 0;
    var attr = tr.getAttribute('data-sp-pallets');
    if (attr != null && attr !== '') {
      var n = parseInt(attr, 10);
      if (!isNaN(n)) return n;
    }
    var raw = tr.cells[COL_ACTUAL_PALLETS] ? tr.cells[COL_ACTUAL_PALLETS].textContent.trim() : '';
    if (!raw || raw === '—' || raw === '-') return 0;
    var parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  function spCanPalletSplit(tr) {
    if (!tr) return false;
    if (spGetShipMode(tr) === 'split') return false;
    return spGetRowPalletCount(tr) > 1;
  }

  function spPltStatusCls(status) {
    if (status === '已上架') return 'loc-pw-plt-st--done';
    if (status === '待上架') return 'loc-pw-plt-st--wait';
    return 'loc-pw-plt-st--default';
  }

  function spBuildFallbackPallets(zt, tr) {
    var n = spGetRowPalletCount(tr);
    if (n <= 0) n = 2;
    var container = tr.cells[COL_CONTAINER] ? tr.cells[COL_CONTAINER].textContent.trim() : '—';
    var location = tr.cells[COL_LOCATION] ? tr.cells[COL_LOCATION].textContent.trim() : '—';
    var sysNo = tr.cells[COL_SYS] ? tr.cells[COL_SYS].textContent.trim() : '—';
    if (container === '—' || !container) container = '—';
    if (location === '—' || !location) location = 'A-01-01';
    if (sysNo === '—' || !sysNo) sysNo = '—';
    var list = [];
    for (var i = 1; i <= n; i++) {
      list.push({
        pltNo: 'PLT-' + zt.replace(/[^A-Za-z0-9]/g, '') + '-' + String(i).padStart(2, '0'),
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

  function spGetPalletLabelsForZt(zt) {
    if (SP_PALLET_LABELS[zt]) {
      return SP_PALLET_LABELS[zt].map(function (p) { return Object.assign({}, p); });
    }
    return spBuildFallbackPallets(zt, spFindRow(zt));
  }

  function spSetHidden(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }

  function spGetZtMetaText(tr) {
    var meta = tr.querySelector('.loc-pw-bol-meta');
    return meta ? meta.textContent.trim() : '—';
  }

  function spGetSplitGroupId(zt, tr) {
    var g = tr.getAttribute('data-sp-split-group');
    if (g) return g;
    var m = zt.match(/^(.+)-\d+$/);
    return m ? m[1] : zt;
  }

  function spGetSplitGroupRows(groupId) {
    return Array.prototype.slice.call(
      document.querySelectorAll('tr[data-sp-split-group="' + groupId.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]')
    );
  }

  function spGetCheckedZtRows() {
    var out = [];
    document.querySelectorAll('.data-table tbody tr').forEach(function (tr) {
      if (tr.classList.contains('loc-pw-tr-merge-parent') || tr.classList.contains('loc-pw-tr-merge-child')) return;
      var cb = tr.querySelector('td input[type="checkbox"]');
      if (cb && cb.checked && tr.getAttribute('data-sp-zt')) out.push(tr);
    });
    return out;
  }

  function spRenderPalletPickModal(zt) {
    var pallets = spGetPalletLabelsForZt(zt);
    var total = pallets.length;
    var title = document.getElementById('sp-pallet-pick-title');
    var tip = document.getElementById('sp-pallet-pick-tip');
    var ztRo = document.getElementById('sp-pallet-pick-zt-ro');
    var tbody = document.getElementById('sp-pallet-pick-tbody');
    if (title) title.textContent = '拆分自提 · ' + zt;
    if (ztRo) ztRo.value = zt;
    if (tip) {
      tip.innerHTML = '自提单 <strong>' + esc(zt) + '</strong> · 实收板数 <strong>' + total + '</strong> 板。请勾选本次拆分的板标（至少 1 板、至多 ' + (total - 1) + ' 板，须保留至少 1 板在原单）。';
    }
    if (!tbody) return;
    tbody.innerHTML = pallets.map(function (p) {
      return '<tr>' +
        '<td><input type="checkbox" class="sp-pallet-pick-cb" value="' + esc(p.pltNo) + '"></td>' +
        '<td><strong>' + esc(p.pltNo) + '</strong></td>' +
        '<td><span class="loc-pw-plt-st ' + spPltStatusCls(p.status) + '">' + esc(p.status) + '</span></td>' +
        '<td>' + esc(p.location) + '</td>' +
        '<td>' + esc(p.warehouseZone) + '</td>' +
        '<td>' + esc(p.warehouseName) + '</td>' +
        '<td>' + esc(p.pieces) + '</td>' +
        '<td>' + esc(p.container) + '</td>' +
        '<td>' + esc(p.sysNo) + '</td>' +
        '</tr>';
    }).join('');
  }

  function spFillCancelSplitModal(tr) {
    var zt = tr.getAttribute('data-sp-zt') || '';
    var groupId = spGetSplitGroupId(zt, tr);
    var siblings = spGetSplitGroupRows(groupId);
    if (siblings.length < 2) return false;
    spSetHidden('sp-cancel-split-group', groupId);
    var sum = document.getElementById('sp-cancel-split-summary');
    if (sum) {
      sum.innerHTML = '原自提单 <strong>' + esc(groupId) + '</strong> · 当前拆分为 <strong>' + siblings.length + '</strong> 个子单，取消后将合并恢复为 1 条完整自提单。';
    }
    var tbody = document.getElementById('sp-cancel-split-tbody');
    if (tbody) {
      tbody.innerHTML = siblings.map(function (r) {
        var z = r.getAttribute('data-sp-zt') || '—';
        var cust = r.cells[4] ? r.cells[4].textContent.replace(/\s+/g, ' ').trim() : '—';
        return '<tr><td><strong>' + esc(z) + '</strong></td><td>' + esc(spGetZtMetaText(r)) + '</td><td>' + esc(cust) + '</td><td>' + esc(spGetRowStatus(r)) + '</td></tr>';
      }).join('');
    }
    return true;
  }

  window.spOpenSplit = function (zt) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr = spFindRow(zt);
    if (!tr) return showToast('未找到该自提单', 'warning');
    if (spGetRowStatus(tr) !== '未预约') {
      return showToast('仅「未预约」可拆分自提', 'warning');
    }
    if (spGetShipMode(tr) !== 'normal') {
      return showToast('仅「标准自提」模式可拆分', 'warning');
    }
    if (!spCanPalletSplit(tr)) {
      return showToast('实收板数为 1 板时不允许拆分', 'warning');
    }
    spSetHidden('sp-split-zt', zt);
    spRenderPalletPickModal(zt);
    showModal('modal-split');
  };

  window.spConfirmPalletPick = function () {
    var zt = ((document.getElementById('sp-split-zt') || {}).value || '').trim();
    var tr = spFindRow(zt);
    if (!tr) {
      closeModal('modal-split');
      return showToast('未找到该自提单', 'warning');
    }
    var total = spGetPalletLabelsForZt(zt).length;
    var picked = [];
    document.querySelectorAll('#sp-pallet-pick-tbody .sp-pallet-pick-cb:checked').forEach(function (cb) {
      picked.push(cb.value);
    });
    if (!picked.length) return showToast('请至少勾选 1 个板标', 'warning');
    if (picked.length >= total) {
      return showToast('须在原单保留至少 1 板，不能勾选全部板标', 'warning');
    }
    closeModal('modal-split');
    showToast('拆分自提已提交（演示）：' + zt + ' · ' + picked.join('、'), 'success');
  };

  window.spOpenCancelSplit = function (zt) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr;
    if (zt) {
      tr = spFindRow(zt);
      if (!tr) return showToast('未找到该自提单', 'warning');
      if (spGetShipMode(tr) !== 'split') {
        return showToast('仅「拆分自提」的子单可取消拆分', 'warning');
      }
    } else {
      var rows = spGetCheckedZtRows().filter(function (r) { return spGetShipMode(r) === 'split'; });
      if (rows.length !== 1) {
        return showToast('请勾选且仅勾选 1 条「拆分自提」子单', 'warning');
      }
      tr = rows[0];
    }
    if (!spFillCancelSplitModal(tr)) return showToast('未找到关联拆分子单', 'warning');
    showModal('modal-sp-cancel-split');
  };

  window.spConfirmCancelSplit = function () {
    var groupId = ((document.getElementById('sp-cancel-split-group') || {}).value || '').trim();
    if (!groupId) {
      closeModal('modal-sp-cancel-split');
      return showToast('未找到拆分组', 'warning');
    }
    var siblings = spGetSplitGroupRows(groupId);
    if (siblings.length < 2) {
      closeModal('modal-sp-cancel-split');
      return showToast('未找到关联拆分子单', 'warning');
    }
    closeModal('modal-sp-cancel-split');
    showToast('已取消拆分（演示）：' + siblings.length + ' 个子单 → 恢复为 ' + groupId, 'success');
  };
})();
