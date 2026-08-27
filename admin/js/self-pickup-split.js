/**
 * 自提单：按板标勾选拆分（与本地私仓卡派拆分发货交互一致）
 * 合板单允许拆（只拆板，不拆货件）；混货板上货件组在子单中仍完整展示。
 */
(function () {
  var C = window.SpPickupCore;
  if (!C) return;

  function spSetHidden(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }

  function spGetZtMetaText(tr) {
    var meta = tr.querySelector('.loc-pw-bol-meta');
    if (meta) return meta.textContent.trim();
    var n = C.getRowPalletCount(tr);
    return n > 0 ? n + ' 板' : '—';
  }

  function spCanPalletSplit(tr) {
    if (!tr) return false;
    if (C.getShipMode(tr) === 'split') return false;
    if (C.getShipMode(tr) === 'merge') return false;
    if (tr.classList.contains('loc-pw-tr-merge-child')) return false;
    return C.getRowPalletCount(tr) > 1;
  }

  function spCanCancelSplit(tr) {
    var st = C.getRowStatus(tr);
    return st === '未预约' || st === '待提货';
  }

  function spUpdatePalletPickListStats() {
    var cbs = document.querySelectorAll('#sp-pallet-pick-tbody .sp-pallet-pick-cb');
    var total = cbs.length;
    var selected = 0;
    for (var i = 0; i < cbs.length; i++) {
      if (cbs[i].checked) selected++;
    }
    var stats = document.getElementById('sp-pallet-pick-list-stats');
    if (stats) stats.textContent = '总板数 ' + total + ' · 已勾选 ' + selected;
  }

  function spBindPalletPickCheckboxStats() {
    document.querySelectorAll('#sp-pallet-pick-tbody .sp-pallet-pick-cb').forEach(function (cb) {
      cb.addEventListener('change', spUpdatePalletPickListStats);
    });
  }

  function spRenderPalletPickModal(zt) {
    var pallets = C.getPalletLabelsForZt(zt);
    var total = pallets.length;
    var maxPick = Math.max(total - 1, 1);
    var title = document.getElementById('sp-pallet-pick-title');
    var tip = document.getElementById('sp-pallet-pick-tip');
    var ztRo = document.getElementById('sp-pallet-pick-zt-ro');
    var qtyInput = document.getElementById('sp-pallet-pick-qty');
    var qtyHint = document.getElementById('sp-pallet-pick-qty-hint');
    var tbody = document.getElementById('sp-pallet-pick-tbody');
    if (title) title.textContent = '拆分自提 · ' + zt;
    if (ztRo) ztRo.value = zt;
    if (tip) {
      tip.textContent = '可输入本次拆分板数（填完或按回车后按列表顺序自动勾选），也可手工勾选板标；至少勾选 1 板，且须在原自提单保留至少 1 板。';
    }
    if (qtyInput) {
      qtyInput.value = '';
      qtyInput.min = '1';
      qtyInput.max = String(maxPick);
      qtyInput.setAttribute('data-max-pick', String(maxPick));
    }
    if (qtyHint) qtyHint.textContent = '最多输入 ' + maxPick;
    if (!tbody) return;
    tbody.innerHTML = pallets.map(function (p) {
      return '<tr>' +
        '<td><input type="checkbox" class="sp-pallet-pick-cb" value="' + C.esc(p.pltNo) + '"></td>' +
        '<td><strong>' + C.esc(p.pltNo) + '</strong></td>' +
        '<td>' + C.esc(p.pieces) + '</td>' +
        '<td><span class="loc-pw-plt-st ' + C.pltStatusCls(p.status) + '">' + C.esc(p.status) + '</span></td>' +
        '<td>' + C.esc(p.location) + '</td>' +
        '<td>' + C.esc(p.warehouseZone) + '</td>' +
        '<td>' + C.esc(p.warehouseName) + '</td>' +
        '<td>' + C.esc(p.container) + '</td>' +
        '<td>' + C.esc(p.sysNo) + '</td>' +
        '</tr>';
    }).join('');
    spBindPalletPickCheckboxStats();
    spUpdatePalletPickListStats();
  }

  /** 输入完成后按列表当前顺序勾选前 N 板（覆盖已有勾选） */
  window.spApplyPalletPickByCount = function () {
    var input = document.getElementById('sp-pallet-pick-qty');
    if (!input) return;
    var raw = String(input.value == null ? '' : input.value).trim();
    if (raw === '') return;
    var cbs = document.querySelectorAll('#sp-pallet-pick-tbody .sp-pallet-pick-cb');
    var total = cbs.length;
    var maxPick = total > 0 ? total - 1 : 0;
    var n = parseInt(raw, 10);
    if (!/^\d+$/.test(raw) || !Number.isFinite(n) || n < 1 || n > maxPick) {
      return showToast('请输入 1～' + maxPick + ' 的整数板数', 'warning');
    }
    for (var i = 0; i < cbs.length; i++) {
      cbs[i].checked = i < n;
    }
    input.value = String(n);
    spUpdatePalletPickListStats();
  };

  function spFillCancelSplitModal(tr) {
    var zt = tr.getAttribute('data-sp-zt') || '';
    var groupId = C.getSplitGroupId(zt, tr);
    var siblings = C.getSplitGroupRows(groupId);
    if (siblings.length < 2) return false;
    spSetHidden('sp-cancel-split-group', groupId);
    var sum = document.getElementById('sp-cancel-split-summary');
    if (sum) {
      sum.innerHTML = '原自提单 <strong>' + C.esc(groupId) + '</strong> · 当前拆分为 <strong>' + siblings.length + '</strong> 个子单，取消后将合并恢复为 1 条完整自提单。';
    }
    var tbody = document.getElementById('sp-cancel-split-tbody');
    if (tbody) {
      tbody.innerHTML = siblings.map(function (r) {
        var z = r.getAttribute('data-sp-zt') || '—';
        return '<tr><td><strong>' + C.esc(z) + '</strong></td><td>' + C.esc(spGetZtMetaText(r)) + '</td><td>' + C.esc(C.getRowCustRef(r)) + '</td><td>' + C.esc(C.getRowStatus(r)) + '</td></tr>';
      }).join('');
    }
    return true;
  }

  window.spOpenSplit = function (zt) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    if (!zt) {
      var rows = C.getCheckedZtRows();
      if (rows.length !== 1) {
        return showToast('请勾选且仅勾选 1 条「标准自提」记录进行拆分', 'warning');
      }
      zt = rows[0].getAttribute('data-sp-zt');
    }
    var tr = C.findRow(zt);
    if (!tr) return showToast('未找到该自提单', 'warning');
    if (C.getRowStatus(tr) !== '未预约') {
      return showToast('仅「未预约」可拆分自提', 'warning');
    }
    if (C.getShipMode(tr) !== 'normal') {
      return showToast('仅「标准自提」模式可拆分（合板单可拆；合并自提请先取消合并）', 'warning');
    }
    if (!spCanPalletSplit(tr)) {
      return showToast('实际板数为 1 板时不允许拆分', 'warning');
    }
    spSetHidden('sp-split-zt', zt);
    spRenderPalletPickModal(zt);
    showModal('modal-split');
  };

  window.spConfirmPalletPick = function () {
    var zt = ((document.getElementById('sp-split-zt') || {}).value || '').trim();
    var tr = C.findRow(zt);
    if (!tr) {
      closeModal('modal-split');
      return showToast('未找到该自提单', 'warning');
    }
    var total = C.getPalletLabelsForZt(zt).length;
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
      tr = C.findRow(zt);
      if (!tr) return showToast('未找到该自提单', 'warning');
      if (!spCanCancelSplit(tr)) {
        return showToast('仅「未预约 / 待提货」的拆分自提可取消拆分', 'warning');
      }
      if (C.getShipMode(tr) !== 'split') {
        return showToast('仅「拆分自提」的子单可取消拆分', 'warning');
      }
    } else {
      var rows = C.getCheckedZtRows().filter(function (r) { return C.getShipMode(r) === 'split'; });
      if (rows.length !== 1) {
        return showToast('请勾选且仅勾选 1 条「拆分自提」记录', 'warning');
      }
      tr = rows[0];
      if (!spCanCancelSplit(tr)) {
        return showToast('仅「未预约 / 待提货」的拆分自提可取消拆分', 'warning');
      }
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
    var siblings = C.getSplitGroupRows(groupId);
    if (siblings.length < 2) {
      closeModal('modal-sp-cancel-split');
      return showToast('未找到关联拆分子单', 'warning');
    }
    closeModal('modal-sp-cancel-split');
    showToast('已取消拆分（演示）：' + siblings.length + ' 个子单 → 恢复为 ' + groupId, 'success');
  };

  if (typeof C.initActPltsDisplay === 'function') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', C.initActPltsDisplay);
    } else {
      C.initActPltsDisplay();
    }
  }
})();
