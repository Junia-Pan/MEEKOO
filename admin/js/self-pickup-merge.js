/**
 * 自提单：合并自提 / 取消合并（与本地私仓卡派合并发货交互对齐）
 */
(function () {
  var C = window.SpPickupCore;
  if (!C) return;

  var COL_QTY = 11;
  var COL_SHIPMENT = C.COL_SHIPMENT || 24;

  function spSetHidden(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }

  function spModeLabel(mode) {
    if (mode === 'merge') return '合并自提';
    if (mode === 'split') return '拆分自提';
    return '标准自提';
  }

  function spIsNotStarted(tr) {
    var st = C.getRowStatus(tr);
    return st === '未预约' || st === '待提货' || st === '预约已过期';
  }

  function spIsMergeEligibleRow(tr) {
    if (!tr) return false;
    if (tr.classList.contains('loc-pw-tr-merge-parent') || tr.classList.contains('loc-pw-tr-merge-child')) {
      return false;
    }
    var mode = C.getShipMode(tr);
    if (mode !== 'normal' && mode !== 'split') return false;
    if (C.getRowStatus(tr) !== '未预约') return false;
    return true;
  }

  function spGetMergeChildRows(parentTr) {
    var gid = parentTr.getAttribute('data-merge-group');
    if (!gid) return [];
    return Array.prototype.slice.call(
      document.querySelectorAll('tr.loc-pw-tr-merge-child[data-merge-group="' + gid.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]')
    );
  }

  function spCountMergeShipments(parentTr, children) {
    var seen = {};
    var count = 0;
    function addFromRow(tr) {
      var raw = C.getRowCellText(tr, COL_SHIPMENT);
      raw.split(/[,，、]/).forEach(function (part) {
        var id = part.trim();
        if (!id || id === '—' || id === '-') return;
        if (!seen[id]) {
          seen[id] = true;
          count++;
        }
      });
    }
    if (children && children.length) {
      children.forEach(addFromRow);
    } else if (parentTr) {
      addFromRow(parentTr);
    }
    return count;
  }

  function spFormatMergeBolMeta(ztCount, shipmentCount) {
    var ztPart = String(ztCount || 0) + ' 个自提单';
    var shipPart = String(shipmentCount || 0) + ' 个货件';
    return ztPart + ' · ' + shipPart;
  }

  function spSyncMergeParentBolMeta(parentTr) {
    if (!parentTr || !parentTr.classList.contains('loc-pw-tr-merge-parent')) return;
    var meta = parentTr.querySelector('.loc-pw-bol-meta');
    if (!meta) return;
    var children = spGetMergeChildRows(parentTr);
    var ztCount = children.length || 0;
    var shipmentCount = spCountMergeShipments(parentTr, children);
    meta.textContent = spFormatMergeBolMeta(ztCount, shipmentCount);
  }

  function spInitMergeParentBolMeta() {
    document.querySelectorAll('tr.loc-pw-tr-merge-parent').forEach(spSyncMergeParentBolMeta);
  }

  function spRenderMergeTable(rows) {
    var totalPlts = 0;
    var totalCtns = 0;
    var bodyHtml = rows.map(function (tr) {
      var zt = tr.getAttribute('data-sp-zt') || '—';
      var plts = C.getRowPalletCount(tr);
      var ctnsRaw = C.getRowCellText(tr, COL_QTY);
      var ctns = parseInt(String(ctnsRaw).replace(/[^\d]/g, ''), 10);
      if (!isNaN(plts)) totalPlts += plts;
      if (!isNaN(ctns)) totalCtns += ctns;
      return '<tr>' +
        '<td><strong>' + C.esc(zt) + '</strong></td>' +
        '<td>' + C.esc(spModeLabel(C.getShipMode(tr))) + '</td>' +
        '<td class="loc-pw-merge-cell-wrap">' + C.esc(C.getRowCustRef(tr)) + '</td>' +
        '<td>' + C.esc(String(plts || '—')) + '</td>' +
        '<td>' + C.esc(ctnsRaw) + '</td>' +
        '<td class="loc-pw-merge-cell-wrap">' + C.esc(C.getRowCellText(tr, C.COL_CONTAINER || 7)) + '</td>' +
        '<td class="loc-pw-merge-cell-wrap">' + C.esc(C.getRowCellText(tr, COL_SHIPMENT)) + '</td>' +
        '</tr>';
    }).join('');
    var footHtml = '<tr>' +
      '<td colspan="3" style="text-align:right;color:var(--text-secondary);">合计</td>' +
      '<td>' + C.esc(String(totalPlts)) + '</td>' +
      '<td>' + C.esc(String(totalCtns)) + '</td>' +
      '<td colspan="2"></td>' +
      '</tr>';
    return { bodyHtml: bodyHtml, footHtml: footHtml };
  }

  function spFillMergeModal(rows) {
    var rendered = spRenderMergeTable(rows);
    var tbody = document.getElementById('sp-merge-tbody');
    var tfoot = document.getElementById('sp-merge-tfoot');
    if (tbody) tbody.innerHTML = rendered.bodyHtml;
    if (tfoot) tfoot.innerHTML = rendered.footHtml;
    var remark = document.getElementById('sp-merge-remark');
    if (remark) remark.value = '';
  }

  function spFillCancelMergeModal(tr) {
    var zt = tr.getAttribute('data-sp-zt') || '';
    var children = spGetMergeChildRows(tr);
    if (!children.length) return false;
    spSetHidden('sp-cancel-merge-zt', zt);
    var sum = document.getElementById('sp-cancel-merge-summary');
    if (sum) {
      sum.innerHTML = '自提单 <strong>' + C.esc(zt) + '</strong> · 自提模式 <strong>合并自提</strong> · 含 <strong>' + children.length + '</strong> 个自提单';
    }
    var tbody = document.getElementById('sp-cancel-merge-tbody');
    if (tbody) {
      tbody.innerHTML = children.map(function (ch) {
        var origin = ch.getAttribute('data-sp-origin-mode') || '';
        var modeText = origin === 'split' ? '拆分自提' : '标准自提';
        if (!origin) modeText = spModeLabel(C.getShipMode(ch));
        return '<tr><td><strong>' + C.esc(ch.getAttribute('data-sp-zt') || '—') + '</strong></td><td>' + C.esc(modeText) + '</td><td>' + C.esc(C.getRowCustRef(ch)) + '</td><td>' + C.esc(C.getRowStatus(ch) || '—') + '</td></tr>';
      }).join('');
    }
    return true;
  }

  function spSyncMergeChildren(parentTr) {
    if (!parentTr || !parentTr.classList.contains('loc-pw-tr-merge-parent')) return;
    var gid = parentTr.getAttribute('data-merge-group');
    if (!gid) return;
    var collapsed = parentTr.classList.contains('loc-pw-tr-merge-parent--collapsed');
    var parentVisible = parentTr.style.display !== 'none';
    document.querySelectorAll('tr.loc-pw-tr-merge-child[data-merge-group="' + gid.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]').forEach(function (ch) {
      if (!parentVisible) {
        ch.style.display = 'none';
      } else {
        ch.style.display = '';
        ch.hidden = collapsed;
      }
    });
  }

  function spInitMergeTrees() {
    document.querySelectorAll('tr.loc-pw-tr-merge-parent').forEach(function (tr) {
      var btn = tr.querySelector('.loc-pw-merge-tree-toggle');
      var collapsed = tr.classList.contains('loc-pw-tr-merge-parent--collapsed');
      if (btn) {
        btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        btn.textContent = collapsed ? '+' : '−';
        btn.title = collapsed ? '展开子行' : '收起子行';
      }
      spSyncMergeChildren(tr);
    });
  }

  window.toggleSpMergeTree = function (btn) {
    if (!btn || !btn.closest) return;
    var tr = btn.closest('tr.loc-pw-tr-merge-parent');
    if (!tr) return;
    tr.classList.toggle('loc-pw-tr-merge-parent--collapsed');
    var collapsed = tr.classList.contains('loc-pw-tr-merge-parent--collapsed');
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    btn.textContent = collapsed ? '+' : '−';
    btn.title = collapsed ? '展开子行' : '收起子行';
    spSyncMergeChildren(tr);
  };

  window.spOpenMerge = function () {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var checked = C.getCheckedZtRows();
    if (!checked.length) return showToast('请先勾选要合并的自提单', 'warning');
    var ineligible = checked.filter(function (tr) { return !spIsMergeEligibleRow(tr); });
    if (ineligible.length) {
      return showToast('仅「未预约」的标准自提或拆分自提可合并；请勿勾选合并父子行或已预约 / 已提货单据', 'warning');
    }
    if (checked.length < 2) {
      return showToast('请勾选至少 2 条自提单进行合并', 'warning');
    }
    window.__spMergeZts = checked.map(function (tr) { return tr.getAttribute('data-sp-zt'); });
    spFillMergeModal(checked);
    showModal('modal-sp-merge');
  };

  window.spConfirmMerge = function () {
    var zts = window.__spMergeZts || [];
    if (!zts.length) {
      closeModal('modal-sp-merge');
      return showToast('未找到待合并自提单', 'warning');
    }
    var newZt = 'ZT-2026-M' + String(Date.now()).slice(-4);
    var remarkEl = document.getElementById('sp-merge-remark');
    var remark = remarkEl ? remarkEl.value.trim() : '';
    closeModal('modal-sp-merge');
    var msg = '合并成功（演示），新自提单：' + newZt + '（含 ' + zts.length + ' 个自提单）';
    if (remark) msg += '，已记录备注';
    showToast(msg, 'success');
  };

  window.spOpenCancelMerge = function (zt) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr;
    if (zt) {
      tr = C.findRow(zt);
      if (!tr) return showToast('未找到该自提单', 'warning');
      if (!tr.classList.contains('loc-pw-tr-merge-parent') || C.getShipMode(tr) !== 'merge') {
        return showToast('仅「合并自提」的父行可取消合并', 'warning');
      }
      if (!spIsNotStarted(tr) || C.getRowStatus(tr) === '部分提货' || C.getRowStatus(tr) === '已提货') {
        return showToast('已开始提货后不可取消合并', 'warning');
      }
    } else {
      var rows = C.getCheckedZtRows();
      if (rows.length !== 1) {
        return showToast('请勾选且仅勾选 1 条「合并自提」父行', 'warning');
      }
      tr = rows[0];
      if (!tr.classList.contains('loc-pw-tr-merge-parent') || C.getShipMode(tr) !== 'merge') {
        return showToast('仅「合并自提」的父行可取消合并', 'warning');
      }
      if (!spIsNotStarted(tr) || C.getRowStatus(tr) === '部分提货' || C.getRowStatus(tr) === '已提货') {
        return showToast('已开始提货后不可取消合并', 'warning');
      }
    }
    if (!spFillCancelMergeModal(tr)) return showToast('未找到合并子单明细', 'warning');
    showModal('modal-sp-cancel-merge');
  };

  window.spConfirmCancelMerge = function () {
    var zt = ((document.getElementById('sp-cancel-merge-zt') || {}).value || '').trim();
    var tr = C.findRow(zt);
    if (!tr || !tr.classList.contains('loc-pw-tr-merge-parent')) {
      closeModal('modal-sp-cancel-merge');
      return showToast('未找到合并记录', 'warning');
    }
    var children = spGetMergeChildRows(tr);
    closeModal('modal-sp-cancel-merge');
    showToast('已取消合并（演示）：' + zt + ' → 恢复为 ' + children.length + ' 个独立自提单', 'success');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      spInitMergeTrees();
      spInitMergeParentBolMeta();
    });
  } else {
    spInitMergeTrees();
    spInitMergeParentBolMeta();
  }
})();
