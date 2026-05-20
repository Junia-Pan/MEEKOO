(function () {
  var PALLETS = window.PALLET_QUERY_DATA || [];
  var IN_STOCK_STATUSES = { '已上架': true, '待出库': true };
  var lastResults = [];
  var currentPltNo = '';
  var pageState = { page: 1, pageSize: 10 };
  var paginationWired = false;
  var LIST_COL_COUNT = 14;
  var DEST_COL_COUNT = 9;
  var listTab = 'dest';
  var destFilterKey = '';

  function isInStock(p) {
    return !!(p && IN_STOCK_STATUSES[p.status]);
  }

  function getInStockPallets() {
    return PALLETS.filter(isInStock);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function moveTypeLabel(t) {
    if (t === 'FBA') return 'FBA卡派';
    if (t === '私卡派') return '私卡派';
    if (t === '快递') return '快递';
    if (t === '自提') return '自提';
    return t || '—';
  }

  function formatFbaCode(row) {
    var t = row && row.destType ? String(row.destType) : '';
    if (t === '自提' || t === '私卡派') return '—';
    var code = row && row.destCode;
    return code ? String(code) : '—';
  }

  function moveTagCls(t) {
    if (t === 'FBA') return 'move-tag--fba';
    if (t === '私卡派' || t === '自提') return 'move-tag--pvt';
    if (t === '快递') return 'move-tag--exp';
    return '';
  }

  function statusCls(s) {
    if (s === '已上架') return 'plt-st--done';
    if (s === '待出库') return 'plt-st--wait';
    if (s === '已装车') return 'plt-st--loaded';
    return 'plt-st--default';
  }

  function matchPallet(type, p, v) {
    switch (type) {
      case 'plt': return p.pltNo.toUpperCase() === v;
      case 'ref': return (p.ref || '').toUpperCase() === v;
      case 'fba': return (p.fba || '').toUpperCase() === v;
      case 'cnt': return (p.container || '').toUpperCase() === v;
      default: return false;
    }
  }

  function findPallets(type, raw, source) {
    var v = (raw || '').trim().toUpperCase();
    if (!v) return [];
    var pool = source || getInStockPallets();
    return pool.filter(function (p) { return matchPallet(type, p, v); });
  }

  function getPallet(pltNo) {
    for (var i = 0; i < PALLETS.length; i++) if (PALLETS[i].pltNo === pltNo) return PALLETS[i];
    return null;
  }

  function ensureStatRow() {
    if (document.getElementById('plt-stat-row')) return;
    var anchor = document.querySelector('#view-list .search-card');
    if (!anchor || !anchor.parentNode) return;
    var row = document.createElement('div');
    row.className = 'plt-stat-row';
    row.id = 'plt-stat-row';
    anchor.parentNode.insertBefore(row, anchor);
  }

  function renderStats(list) {
    ensureStatRow();
    var row = document.getElementById('plt-stat-row');
    if (!row) return;
    var shelved = 0;
    var waitOut = 0;
    var pieces = 0;
    list.forEach(function (p) {
      pieces += p.pieces || 0;
      if (p.status === '已上架') shelved++;
      else if (p.status === '待出库') waitOut++;
    });
    row.innerHTML =
      '<div class="plt-stat-card"><span class="plt-stat-lbl">在库板数</span><strong class="plt-stat-val">' + list.length + '</strong></div>' +
      '<div class="plt-stat-card"><span class="plt-stat-lbl">已上架</span><strong class="plt-stat-val plt-stat-val--done">' + shelved + '</strong></div>' +
      '<div class="plt-stat-card"><span class="plt-stat-lbl">待出库</span><strong class="plt-stat-val plt-stat-val--wait">' + waitOut + '</strong></div>' +
      '<div class="plt-stat-card"><span class="plt-stat-lbl">在库总件数</span><strong class="plt-stat-val">' + pieces + '</strong></div>';
  }

  function summaryRowKey(p) {
    return [
      p.container || '',
      p.customer || '',
      p.destType || '',
      p.ref || '',
      p.destCode || '',
      p.sysNo || ''
    ].join('\x00');
  }

  function getDisplayList() {
    if (!destFilterKey) return lastResults;
    return lastResults.filter(function (p) { return summaryRowKey(p) === destFilterKey; });
  }

  function clearDestFilter() {
    destFilterKey = '';
    updateDestFilterHint();
  }

  function updateDestFilterHint() {
    var hint = document.getElementById('list-filter-hint');
    if (!hint) return;
    if (!destFilterKey || listTab !== 'detail') {
      hint.style.display = 'none';
      hint.innerHTML = '';
      return;
    }
    var parts = destFilterKey.split('\x00');
    var container = parts[0] || '—';
    var customer = parts[1] || '—';
    var destType = parts[2] || '';
    var destCode = parts[4] || '—';
    hint.style.display = 'flex';
    hint.innerHTML =
      '<span>当前汇总行筛选：柜号 <strong>' + esc(container) + '</strong> · 客户 <strong>' + esc(customer) +
      '</strong> · FBA Code <strong>' + esc(formatFbaCode({ destType: destType, destCode: destCode })) + '</strong>（' + esc(moveTypeLabel(destType)) + '）</span>' +
      '<button type="button" onclick="clearDestFilterAndRefresh()">清除</button>';
  }

  window.clearDestFilterAndRefresh = function () {
    clearDestFilter();
    pageState.page = 1;
    refreshListView(getListOpts());
  };

  function aggregateDestSummary(list) {
    var map = {};
    list.forEach(function (p) {
      var key = summaryRowKey(p);
      if (!map[key]) {
        map[key] = {
          key: key,
          container: p.container || '—',
          customer: p.customer || '—',
          destType: p.destType || '',
          destCode: p.destCode || '—',
          ref: p.ref || '—',
          sysNo: p.sysNo || '—',
          pltCount: 0,
          pieces: 0
        };
      }
      var row = map[key];
      row.pltCount++;
      row.pieces += p.pieces || 0;
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) {
      var c = String(a.container).localeCompare(String(b.container));
      if (c) return c;
      c = String(a.customer).localeCompare(String(b.customer));
      if (c) return c;
      c = String(a.destCode).localeCompare(String(b.destCode));
      return c || String(a.ref).localeCompare(String(b.ref));
    });
  }

  function getListTab() {
    return listTab;
  }

  function switchListTab(tab) {
    listTab = tab === 'dest' ? 'dest' : 'detail';
    pageState.page = 1;
    document.querySelectorAll('#plt-list-tabs .tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-list-tab') === listTab);
    });
    var destPanel = document.getElementById('list-panel-dest');
    var detailPanel = document.getElementById('list-panel-detail');
    if (destPanel) destPanel.style.display = listTab === 'dest' ? '' : 'none';
    if (detailPanel) detailPanel.style.display = listTab === 'detail' ? '' : 'none';
    if (listTab === 'dest') clearDestFilter();
    updateDestFilterHint();
    refreshListView(getListOpts());
  }

  function refreshListView(opts) {
    opts = opts || getListOpts();
    renderDestSummary(lastResults, opts);
    renderList(getDisplayList(), opts);
  }

  function getActiveListTotal() {
    if (listTab === 'dest') return aggregateDestSummary(lastResults).length;
    return getDisplayList().length;
  }

  function optsEmptyText(opts) {
    opts = opts || { mode: 'default' };
    return opts.mode === 'filter' ? '当前在库板标中未找到匹配项' : '暂无在库板标';
  }

  function loadDefaultList() {
    pageState.page = 1;
    clearDestFilter();
    lastResults = getInStockPallets().slice();
    renderStats(lastResults);
    refreshListView({ mode: 'default' });
    showList();
  }

  function runQuery() {
    pageState.page = 1;
    clearDestFilter();
    var type = document.getElementById('q-type').value;
    var kw = (document.getElementById('q-keyword').value || '').trim();
    if (!kw) {
      loadDefaultList();
      return;
    }
    lastResults = findPallets(type, kw, getInStockPallets());
    renderStats(lastResults);
    refreshListView({ mode: 'filter', keyword: kw });
    if (lastResults.length === 1 && listTab === 'detail') openDetail(lastResults[0].pltNo);
  }

  function resetQuery() {
    document.getElementById('q-keyword').value = '';
    document.getElementById('q-type').value = 'plt';
    loadDefaultList();
  }

  window.viewDestDetail = function (key) {
    try { key = decodeURIComponent(String(key || '')); } catch (_) { key = String(key || ''); }
    destFilterKey = key;
    listTab = 'detail';
    document.querySelectorAll('#plt-list-tabs .tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-list-tab') === 'detail');
    });
    var destPanel = document.getElementById('list-panel-dest');
    var detailPanel = document.getElementById('list-panel-detail');
    if (destPanel) destPanel.style.display = 'none';
    if (detailPanel) detailPanel.style.display = '';
    var pag = document.getElementById('plt-pagination');
    if (pag) pag.style.display = '';
    pageState.page = 1;
    updateDestFilterHint();
    refreshListView(getListOpts());
  };

  function getTotalPages(total) {
    return Math.max(1, Math.ceil(total / pageState.pageSize));
  }

  function ensurePagination() {
    var bar = document.getElementById('plt-pagination');
    if (!bar) {
      var card = document.querySelector('#view-list .plt-list-card');
      if (!card) return;
      bar = document.createElement('div');
      bar.className = 'pagination';
      bar.id = 'plt-pagination';
      card.appendChild(bar);
    }
    if (bar.querySelector('#plt-page-info')) {
      wirePagination();
      return;
    }
    bar.innerHTML =
      '<div class="pagination-info" id="plt-page-info">\u5171 0 \u6761</div>' +
      '<div class="pagination-right">' +
        '\u6bcf\u9875 <select class="page-size-select" id="plt-page-size"><option value="10">10</option><option value="20">20</option><option value="50">50</option></select> \u6761' +
        '<button type="button" class="page-btn" id="plt-prev" disabled>\u2039 \u4e0a\u4e00\u9875</button>' +
        '<span id="plt-page-btns"></span>' +
        '<button type="button" class="page-btn" id="plt-next" disabled>\u4e0b\u4e00\u9875 \u203a</button>' +
        '<span class="text-muted">\u7b2c</span>' +
        '<input class="page-input" id="plt-page-input" value="1" min="1">' +
        '<span class="text-muted" id="plt-page-total">/ 1 \u9875</span>' +
      '</div>';
    wirePagination();
  }

  function wirePagination() {
    if (paginationWired) return;
    paginationWired = true;
    var root = document.getElementById('plt-pagination');
    if (!root) return;
    document.getElementById('plt-page-size').addEventListener('change', function (e) {
      pageState.pageSize = Number(e.target.value) || 10;
      pageState.page = 1;
      refreshListView(getListOpts());
    });
    document.getElementById('plt-prev').addEventListener('click', function () {
      if (pageState.page > 1) {
        pageState.page--;
        refreshListView(getListOpts());
      }
    });
    document.getElementById('plt-next').addEventListener('click', function () {
      var max = getTotalPages(getActiveListTotal());
      if (pageState.page < max) {
        pageState.page++;
        refreshListView(getListOpts());
      }
    });
    document.getElementById('plt-page-input').addEventListener('change', function (e) {
      var max = getTotalPages(getActiveListTotal());
      var n = parseInt(e.target.value, 10);
      if (!n || n < 1) n = 1;
      if (n > max) n = max;
      pageState.page = n;
      e.target.value = String(n);
      refreshListView(getListOpts());
    });
    document.getElementById('plt-page-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
        e.target.dispatchEvent(new Event('change'));
      }
    });
    root.addEventListener('click', function (e) {
      var btn = e.target.closest('.page-btn[data-page]');
      if (!btn) return;
      pageState.page = Number(btn.getAttribute('data-page')) || 1;
      refreshListView(getListOpts());
    });
  }

  function getListOpts() {
    var kw = (document.getElementById('q-keyword').value || '').trim();
    return kw ? { mode: 'filter', keyword: kw } : { mode: 'default' };
  }

  function ensureDestTableHeaders() {
    var thead = document.querySelector('#list-panel-dest .data-table thead tr');
    if (!thead || thead.getAttribute('data-cols') === String(DEST_COL_COUNT)) return;
    thead.setAttribute('data-cols', String(DEST_COL_COUNT));
    thead.innerHTML =
      '<th>\u67DC\u53F7</th><th>\u5BA2\u6237</th><th>Move Type</th><th>\u4EF6\u6570</th><th>\u677F\u6570</th>' +
      '<th>FBA Code</th><th>Customer Ref No</th><th>\u7CFB\u7EDF\u5355\u53F7</th><th class="th-action">\u64CD\u4F5C</th>';
  }

  function ensureTableHeaders() {
    var thead = document.querySelector('#list-panel-detail .data-table thead tr');
    if (!thead || thead.getAttribute('data-cols') === String(LIST_COL_COUNT)) return;
    thead.setAttribute('data-cols', String(LIST_COL_COUNT));
    thead.innerHTML =
      '<th>\u677F\u6807\u53F7</th><th>\u72B6\u6001</th><th>\u5E93\u4F4D</th>' +
      '<th>\u4ED3\u5E93\u5206\u533A</th><th>\u4ED3\u5E93\u540D\u79F0</th><th>\u4EF6\u6570</th>' +
      '<th>Customer Ref No</th><th>FBA ID</th><th>\u76EE\u7684\u5730</th><th>Move Type</th>' +
      '<th>\u67DC\u53F7</th><th>\u5BA2\u6237</th><th>\u7CFB\u7EDF\u5355\u53F7</th><th class="th-action">\u64CD\u4F5C</th>';
  }

  function ensureTableToolbar() {
    var btn = document.getElementById('plt-btn-export');
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', exportPltList);
    }
  }

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function exportPltList() {
    var d = new Date();
    var stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    var headers;
    var rows;
    var count;
    var namePrefix = '\u677F\u6807\u67E5\u8BE2_';

    if (listTab === 'dest') {
      var summary = aggregateDestSummary(lastResults);
      if (!summary.length) {
        showToast('\u6682\u65E0\u6570\u636E\u53EF\u5BFC\u51FA', 'warning');
        return;
      }
      headers = [
        '\u67DC\u53F7', '\u5BA2\u6237', 'Move Type', '\u4EF6\u6570', '\u677F\u6570',
        'FBA Code', 'Customer Ref No', '\u7CFB\u7EDF\u5355\u53F7'
      ];
      rows = summary.map(function (r) {
        return [
          r.container, r.customer, moveTypeLabel(r.destType), r.pieces, r.pltCount,
          formatFbaCode(r), r.ref, r.sysNo
        ].map(csvCell).join(',');
      });
      count = summary.length;
      namePrefix = '\u677F\u6807\u67E5\u8BE2_\u6309\u76EE\u7684\u5730\u6C47\u603B_';
    } else {
      var list = getDisplayList();
      if (!list.length) {
        showToast('\u6682\u65E0\u6570\u636E\u53EF\u5BFC\u51FA', 'warning');
        return;
      }
      headers = [
        '\u677F\u6807\u53F7', '\u72B6\u6001', '\u5E93\u4F4D', '\u4ED3\u5E93\u5206\u533A', '\u4ED3\u5E93\u540D\u79F0', '\u4EF6\u6570',
        'Customer Ref No', 'FBA ID', '\u76EE\u7684\u5730', 'Move Type', '\u67DC\u53F7', '\u5BA2\u6237', '\u7CFB\u7EDF\u5355\u53F7'
      ];
      rows = list.map(function (p) {
        return [
          p.pltNo, p.status, p.location, p.warehouseZone || '', p.warehouseName || '',
          p.pieces, p.ref, p.fba || '', formatFbaCode(p), moveTypeLabel(p.destType), p.container, p.customer, p.sysNo || ''
        ].map(csvCell).join(',');
      });
      count = list.length;
    }

    var csv = '\uFEFF' + headers.map(csvCell).join(',') + '\n' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = namePrefix + stamp + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showToast('\u5BFC\u51FA\u6210\u529F\uFF08' + count + ' \u6761\uFF09', 'success');
  }

  window.exportPltList = exportPltList;

  function renderPaginationBar(total) {
    ensurePagination();
    var bar = document.getElementById('plt-pagination');
    if (!bar) return;
    bar.style.display = total > 0 ? '' : 'none';
    var totalPages = getTotalPages(total);
    if (pageState.page > totalPages) pageState.page = totalPages;
    if (pageState.page < 1) pageState.page = 1;

    document.getElementById('plt-page-info').textContent = '\u5171 ' + total + ' \u6761';
    var sel = document.getElementById('plt-page-size');
    if (sel) sel.value = String(pageState.pageSize);

    var prev = document.getElementById('plt-prev');
    var next = document.getElementById('plt-next');
    if (prev) prev.disabled = pageState.page <= 1;
    if (next) next.disabled = pageState.page >= totalPages;

    var input = document.getElementById('plt-page-input');
    if (input) input.value = String(pageState.page);
    var totalEl = document.getElementById('plt-page-total');
    if (totalEl) totalEl.textContent = '/ ' + totalPages + ' \u9875';

    var btns = document.getElementById('plt-page-btns');
    if (!btns) return;
    var start = Math.max(1, pageState.page - 2);
    var end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    var html = '';
    for (var i = start; i <= end; i++) {
      html += '<button type="button" class="page-btn' + (i === pageState.page ? ' active' : '') +
        '" data-page="' + i + '">' + i + '</button>';
    }
    btns.innerHTML = html;
  }

  function renderDestSummary(list, opts) {
    opts = opts || { mode: 'default' };
    var tbody = document.getElementById('plt-dest-tbody');
    if (!tbody) return;
    var rows = aggregateDestSummary(list);
    if (!rows.length) {
      renderPaginationBar(0);
      tbody.innerHTML = '<tr><td colspan="' + DEST_COL_COUNT + '" class="plt-empty-hint">' +
        esc(optsEmptyText(opts)) + '</td></tr>';
      return;
    }
    renderPaginationBar(rows.length);
    var pageList = rows.slice(
      (pageState.page - 1) * pageState.pageSize,
      pageState.page * pageState.pageSize
    );
    tbody.innerHTML = pageList.map(function (r) {
      var keyArg = encodeURIComponent(r.key);
      return '<tr>' +
        '<td style="font-variant-numeric:tabular-nums">' + esc(r.container) + '</td>' +
        '<td>' + esc(r.customer) + '</td>' +
        '<td><span class="move-tag ' + moveTagCls(r.destType) + '">' + esc(moveTypeLabel(r.destType)) + '</span></td>' +
        '<td style="font-variant-numeric:tabular-nums;font-weight:600">' + esc(r.pieces) + '</td>' +
        '<td style="font-variant-numeric:tabular-nums">' + esc(r.pltCount) + '</td>' +
        '<td>' + esc(formatFbaCode(r)) + '</td>' +
        '<td>' + esc(r.ref) + '</td>' +
        '<td style="font-variant-numeric:tabular-nums">' + esc(r.sysNo) + '</td>' +
        '<td class="td-action"><div class="td-action-inner"><button type="button" class="btn btn-default btn-xs" onclick="viewDestDetail(decodeURIComponent(\'' + keyArg + '\'))">查看明细</button></div></td>' +
        '</tr>';
    }).join('');
  }

  function renderList(list, opts) {
    opts = opts || { mode: 'default' };
    var tbody = document.getElementById('plt-tbody');
    if (!tbody) return;
    if (!list.length) {
      if (listTab === 'detail') renderPaginationBar(0);
      else if (listTab === 'dest') { /* dest pagination handled in renderDestSummary */ }
      tbody.innerHTML = '<tr><td colspan="' + LIST_COL_COUNT + '" class="plt-empty-hint">' +
        esc(destFilterKey ? '\u8BE5\u6C47\u603B\u884C\u6682\u65E0\u5339\u914D\u5728\u5E93\u677F\u6807' : optsEmptyText(opts)) + '</td></tr>';
      return;
    }
    if (listTab === 'detail') renderPaginationBar(list.length);
    var pageList = list.slice(
      (pageState.page - 1) * pageState.pageSize,
      pageState.page * pageState.pageSize
    );
    tbody.innerHTML = pageList.map(function (p) {
      var pltEsc = esc(p.pltNo).replace(/'/g, "\\'");
      return '<tr>' +
        '<td><strong style="font-variant-numeric:tabular-nums">' + esc(p.pltNo) + '</strong></td>' +
        '<td><span class="plt-st ' + statusCls(p.status) + '">' + esc(p.status) + '</span></td>' +
        '<td>' + esc(p.location) + '</td>' +
        '<td>' + esc(p.warehouseZone || '\u2014') + '</td>' +
        '<td>' + esc(p.warehouseName || '\u2014') + '</td>' +
        '<td>' + esc(p.pieces) + '</td>' +
        '<td>' + esc(p.ref) + '</td>' +
        '<td>' + esc(p.fba || '—') + '</td>' +
        '<td>' + esc(formatFbaCode(p)) + '</td>' +
        '<td><span class="move-tag ' + moveTagCls(p.destType) + '">' + esc(moveTypeLabel(p.destType)) + '</span></td>' +
        '<td style="font-variant-numeric:tabular-nums">' + esc(p.container) + '</td>' +
        '<td>' + esc(p.customer) + '</td>' +
        '<td style="font-variant-numeric:tabular-nums">' + esc(p.sysNo || '—') + '</td>' +
        '<td class="td-action"><div class="td-action-inner">' +
          '<button type="button" class="btn btn-default btn-xs" onclick="openDetail(\'' + pltEsc + '\')">查看</button>' +
          '<button type="button" class="btn btn-default btn-xs" onclick="openReprintModal(\'' + pltEsc + '\')">去重打</button>' +
        '</div></td></tr>';
    }).join('');
  }

  function infoCell(label, value, mono) {
    var style = mono ? ' style="font-variant-numeric:tabular-nums"' : '';
    return '<div class="info-cell"><div class="info-label">' + esc(label) + '</div>' +
      '<div class="info-value"' + style + '>' + value + '</div></div>';
  }

  function renderDetail(p) {
    document.getElementById('d-plt-no').textContent = p.pltNo;
    document.getElementById('d-plt-sub').textContent = [p.status, p.location, p.pieces + ' 件'].join(' · ');

    var measureStr = '—';
    if (p.measure) measureStr = p.measure.l + '×' + p.measure.w + '×' + p.measure.h + ' IN · ' + p.measure.gw + ' LBS';
    var mergeStr = p.mergeGroupId
      ? (p.mergeGroupId + '（' + (p.palletScope === 'merge' ? '合并板' : '单板') + '）')
      : '—';
    var ticketHtml = p.ticketCount > 0
      ? '<a class="link-ticket" href="exception-ticket-management.html" title="' + esc((p.ticketIds || []).join(', ')) + '">' + p.ticketCount + ' 条工单</a>'
      : '无';

    document.getElementById('d-info-grid').innerHTML =
      infoCell('系统单号', esc(p.sysNo), true) +
      infoCell('柜号', esc(p.container), true) +
      infoCell('客户', esc(p.customer)) +
      infoCell('Customer Ref No', esc(p.ref)) +
      infoCell('FBA ID', esc(p.fba || '—')) +
      infoCell('目的地 / FBA Code', esc(formatFbaCode(p))) +
      infoCell('Move Type', '<span class="move-tag ' + moveTagCls(p.destType) + '">' + esc(moveTypeLabel(p.destType)) + '</span>') +
      infoCell('库位', esc(p.location)) +
      infoCell('仓库分区', esc(p.warehouseZone || '—')) +
      infoCell('仓库名称', esc(p.warehouseName || '—')) +
      infoCell('件数', esc(p.pieces)) +
      infoCell('板标状态', '<span class="plt-st ' + statusCls(p.status) + '">' + esc(p.status) + '</span>') +
      infoCell('合并板组', esc(mergeStr)) +
      infoCell('BOL', esc(p.bol || '—'), true) +
      infoCell('装车单', esc(p.loadNo || '—'), true) +
      infoCell('私卡测量', esc(measureStr)) +
      infoCell('重打次数', esc(p.reprintCount || 0) + (p.lastReprintAt ? '（最近 ' + esc(p.lastReprintAt) + '）' : '')) +
      infoCell('关联工单', ticketHtml);

    var logs = p.reprintLogs || [];
    var logBox = document.getElementById('d-reprint-list');
    var logEmpty = document.getElementById('d-reprint-empty');
    if (logs.length) {
      logEmpty.style.display = 'none';
      logBox.style.display = 'flex';
      logBox.innerHTML = logs.map(function (l) {
        return '<div class="plt-reprint-row"><div><strong>' + esc(l.reason) + '</strong> · ' +
          esc(l.operator) + ' · ' + esc(l.printer) + '</div><time>' + esc(l.time) + '</time></div>';
      }).join('');
    } else {
      logBox.innerHTML = '';
      logBox.style.display = 'none';
      logEmpty.style.display = 'block';
    }

    document.getElementById('d-cargo-tbody').innerHTML = (p.cargo || []).map(function (c) {
      return '<tr><td>' + esc(c.shipmentId) + '</td><td>' + esc(c.moveType) + '</td><td>' + esc(c.ref) + '</td>' +
        '<td>' + esc(c.status) + '</td><td>' + esc(c.fbaId) + '</td><td>' + esc(c.po) + '</td><td>' + esc(c.fbaCode) + '</td>' +
        '<td style="font-variant-numeric:tabular-nums">' + esc(c.cbm) + '</td>' +
        '<td style="font-variant-numeric:tabular-nums">' + esc(c.lbs) + '</td>' +
        '<td style="font-variant-numeric:tabular-nums">' + esc(c.carton) + '</td></tr>';
    }).join('');
  }

  window.openDetail = function (pltNo) {
    var p = getPallet(pltNo);
    if (!p) { showToast('未找到该板标', 'warning'); return; }
    currentPltNo = pltNo;
    renderDetail(p);
    document.getElementById('view-list').style.display = 'none';
    document.getElementById('view-detail').style.display = 'flex';
    var bc = document.getElementById('breadcrumb');
    if (bc) {
      bc.innerHTML = '<span>首页</span><span class="sep">›</span><span>服务</span><span class="sep">›</span>' +
        '<a href="javascript:showList()" style="color:var(--text-secondary);text-decoration:none;">板标查询</a>' +
        '<span class="sep">›</span><span class="current">' + esc(pltNo) + '</span>';
    }
    var firstTab = document.querySelector('#view-detail .detail-tab');
    if (firstTab) switchDetailTab(firstTab, 'dt-overview');
  };

  window.showList = function () {
    currentPltNo = '';
    document.getElementById('view-detail').style.display = 'none';
    document.getElementById('view-list').style.display = 'block';
    var bc = document.getElementById('breadcrumb');
    if (bc) bc.innerHTML = '<span>首页</span><span class="sep">›</span><span>服务</span><span class="sep">›</span><span class="current">板标查询</span>';
    if (!lastResults.length) loadDefaultList();
    else {
      renderStats(lastResults);
      refreshListView(document.getElementById('q-keyword').value.trim()
        ? { mode: 'filter', keyword: document.getElementById('q-keyword').value.trim() }
        : { mode: 'default' });
    }
  };

  window.openReprintModal = function (pltNo) {
    var no = pltNo || currentPltNo;
    if (!no) return;
    document.getElementById('reprint-plt-no').textContent = no;
    showModal('modal-reprint');
  };

  window.copyReprintPlt = function () {
    var text = document.getElementById('reprint-plt-no').textContent;
    if (!text || text === '—') return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('已复制：' + text, 'success');
      }).catch(function () { fallbackCopy(text); });
    } else fallbackCopy(text);
  };

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('已复制：' + text, 'success');
    } catch (e) {
      showToast('复制失败，请手动选择复制', 'warning');
    }
    document.body.removeChild(ta);
  }

  window.runQuery = runQuery;
  window.resetQuery = resetQuery;

  document.getElementById('q-keyword').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); runQuery(); }
  });

  function initPageLabels() {
    var kw = document.getElementById('q-keyword');
    if (kw) kw.placeholder = '筛选板标号、Ref、FBA ID、柜号（留空显示全部在库）';
    document.querySelectorAll('[onclick="runQuery()"]').forEach(function (btn) {
      btn.textContent = '筛选';
    });
    var resetBtn = document.querySelector('[onclick="resetQuery()"]');
    if (resetBtn) resetBtn.textContent = '重置';
  }

  initPageLabels();
  ensureDestTableHeaders();
  ensureTableHeaders();
  ensureTableToolbar();

  var listTabs = document.getElementById('plt-list-tabs');
  if (listTabs && !listTabs.dataset.bound) {
    listTabs.dataset.bound = '1';
    listTabs.addEventListener('click', function (e) {
      var tab = e.target.closest('.tab[data-list-tab]');
      if (!tab) return;
      switchListTab(tab.getAttribute('data-list-tab'));
    });
  }

  var params = new URLSearchParams(location.search);
  var initType = params.get('type');
  var initKw = params.get('q') || params.get('plt');
  if (initKw) {
    if (initType) document.getElementById('q-type').value = initType;
    else if (/^PLT/i.test(initKw)) document.getElementById('q-type').value = 'plt';
    document.getElementById('q-keyword').value = initKw;
    runQuery();
  } else {
    loadDefaultList();
  }
})();
