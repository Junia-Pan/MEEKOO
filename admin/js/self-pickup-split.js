/**
 * 自提单：按板标勾选拆分（合并打板也按板拆，不按货件拆）
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

  function spCanPalletSplit(tr) {
    if (!tr) return false;
    if (tr.getAttribute('data-sp-split-group')) return false;
    return C.getRowPalletCount(tr) > 1;
  }

  function spRenderPalletPickModal(zt) {
    var pallets = C.getPalletLabelsForZt(zt);
    var total = pallets.length;
    var tr = C.findRow(zt);
    var isMix = tr && tr.getAttribute('data-sp-pallet-bound') === '1';
    var title = document.getElementById('sp-pallet-pick-title');
    var tip = document.getElementById('sp-pallet-pick-tip');
    var ztRo = document.getElementById('sp-pallet-pick-zt-ro');
    var tbody = document.getElementById('sp-pallet-pick-tbody');
    if (title) title.textContent = '拆分自提 · ' + zt;
    if (ztRo) ztRo.value = zt;
    if (tip) {
      tip.innerHTML = isMix
        ? '合并打板自提单 <strong>' + C.esc(zt) + '</strong> · 共 <strong>' + total + '</strong> 板。板上分不清货件，只拆板：请勾选本次拆出的板标（至少 1 板、至多 ' + (total - 1) + ' 板）。拆出后货件组仍挂在两张自提单上。'
        : '自提单 <strong>' + C.esc(zt) + '</strong> · 实际板数 <strong>' + total + '</strong> 板。请勾选本次拆分的板标（至少 1 板、至多 ' + (total - 1) + ' 板，须保留至少 1 板在原单）。';
    }
    if (!tbody) return;
    tbody.innerHTML = pallets.map(function (p) {
      return '<tr>' +
        '<td><input type="checkbox" class="sp-pallet-pick-cb" value="' + C.esc(p.pltNo) + '"></td>' +
        '<td><strong>' + C.esc(p.pltNo) + '</strong></td>' +
        '<td><span class="loc-pw-plt-st ' + C.pltStatusCls(p.status) + '">' + C.esc(p.status) + '</span></td>' +
        '<td>' + C.esc(p.location) + '</td>' +
        '<td>' + C.esc(p.warehouseZone) + '</td>' +
        '<td>' + C.esc(p.warehouseName) + '</td>' +
        '<td>' + C.esc(p.pieces) + '</td>' +
        '<td>' + C.esc(p.container) + '</td>' +
        '<td>' + C.esc(isMix ? '—' : p.sysNo) + '</td>' +
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
      sum.innerHTML = '原自提单 <strong>' + C.esc(groupId) + '</strong> · 当前拆分为 <strong>' + siblings.length + '</strong> 个子单，取消后将合并恢复为 1 条完整自提单。';
    }
    var tbody = document.getElementById('sp-cancel-split-tbody');
    if (tbody) {
      tbody.innerHTML = siblings.map(function (r) {
        var z = r.getAttribute('data-sp-zt') || '—';
        var cust = r.cells[4] ? r.cells[4].textContent.replace(/\s+/g, ' ').trim() : '—';
        return '<tr><td><strong>' + C.esc(z) + '</strong></td><td>' + C.esc(spGetZtMetaText(r)) + '</td><td>' + C.esc(cust) + '</td><td>' + C.esc(C.getRowStatus(r)) + '</td></tr>';
      }).join('');
    }
    return true;
  }

  window.spOpenSplit = function (zt) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr = C.findRow(zt);
    if (!tr) return showToast('未找到该自提单', 'warning');
    if (C.getRowStatus(tr) !== '未预约') {
      return showToast('仅「未预约」可拆分自提', 'warning');
    }
    if (tr.getAttribute('data-sp-split-group')) {
      return showToast('已是拆分子单，请先取消拆分或与其它单合并', 'warning');
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
    showToast('拆分自提已提交（演示）：拆出 ' + picked.length + ' 板 · ' + picked.join('、') + '；货件组仍挂在两张自提单', 'success');
  };

  window.spOpenCancelSplit = function (zt) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr;
    if (zt) {
      tr = C.findRow(zt);
      if (!tr) return showToast('未找到该自提单', 'warning');
      if (!tr.getAttribute('data-sp-split-group')) {
        return showToast('仅拆分子单可取消拆分', 'warning');
      }
    } else {
      var rows = C.getCheckedZtRows().filter(function (r) {
        return !!r.getAttribute('data-sp-split-group');
      });
      if (rows.length !== 1) {
        return showToast('请勾选且仅勾选 1 条拆分子单', 'warning');
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
