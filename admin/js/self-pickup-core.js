/**
 * 自提单共享：板标明细与行查询（拆分 / 提货共用）
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
    'ZT-2026-0401': [
      { pltNo: 'PLT-LAX-101', status: '已上架', location: 'A-01-01', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU1234567', sysNo: 'EXP-2026-0401' },
      { pltNo: 'PLT-LAX-102', status: '已上架', location: 'A-01-02', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU1234567', sysNo: 'EXP-2026-0401' },
      { pltNo: 'PLT-LAX-103', status: '已上架', location: 'A-01-03', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU1234567', sysNo: 'EXP-2026-0401' },
      { pltNo: 'PLT-LAX-104', status: '已上架', location: 'A-01-04', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU1234567', sysNo: 'EXP-2026-0401' },
      { pltNo: 'PLT-LAX-105', status: '已上架', location: 'A-01-05', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU1234567', sysNo: 'EXP-2026-0401' },
      { pltNo: 'PLT-LAX-106', status: '待上架', location: 'A-02-01', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU1234567', sysNo: 'EXP-2026-0401' },
      { pltNo: 'PLT-LAX-107', status: '待上架', location: 'A-02-02', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU1234567', sysNo: 'EXP-2026-0401' },
      { pltNo: 'PLT-LAX-108', status: '待上架', location: 'A-02-03', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU1234567', sysNo: 'EXP-2026-0401' }
    ],
    'ZT-2026-0402': [
      { pltNo: 'PLT-LAX-401', status: '已上架', location: 'A-01-02', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 8, container: 'MSKU2234567', sysNo: 'EXP-2026-0402' },
      { pltNo: 'PLT-LAX-402', status: '已上架', location: 'A-01-03', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 14, container: 'MSKU2234567', sysNo: 'EXP-2026-0402' }
    ],
    'ZT-2026-0402-1': [
      { pltNo: 'PLT-LAX-401', status: '已上架', location: 'A-01-02', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 8, container: 'MSKU2234567', sysNo: 'EXP-2026-0402' }
    ],
    'ZT-2026-0402-2': [
      { pltNo: 'PLT-LAX-402', status: '已上架', location: 'A-01-03', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 14, container: 'MSKU2234567', sysNo: 'EXP-2026-0402' }
    ],
    'ZT-2026-0403': [
      { pltNo: 'PLT-LAX-310', status: '已上架', location: 'B-02-01', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU3390001', sysNo: 'EXP-2026-0403' },
      { pltNo: 'PLT-LAX-311', status: '已上架', location: 'B-02-02', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU3390001', sysNo: 'EXP-2026-0403' },
      { pltNo: 'PLT-LAX-312', status: '已上架', location: 'B-02-03', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU3390001', sysNo: 'EXP-2026-0403' },
      { pltNo: 'PLT-LAX-313', status: '已上架', location: 'B-02-04', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU3390001', sysNo: 'EXP-2026-0403' },
      { pltNo: 'PLT-LAX-314', status: '已上架', location: 'B-02-05', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU3390001', sysNo: 'EXP-2026-0403' },
      { pltNo: 'PLT-LAX-315', status: '已上架', location: 'B-02-06', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU3390001', sysNo: 'EXP-2026-0403' },
      { pltNo: 'PLT-LAX-316', status: '已上架', location: 'B-03-01', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU3390001', sysNo: 'EXP-2026-0403' },
      { pltNo: 'PLT-LAX-317', status: '已上架', location: 'B-03-02', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 6, container: 'MSKU3390001', sysNo: 'EXP-2026-0403' }
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

  window.SpPickupCore = {
    COL_PROGRESS: 6,
    COL_ACTUAL_TIME: 18,
    esc: esc,
    findRow: spFindRow,
    getRowStatus: spGetRowStatus,
    getShipMode: spGetShipMode,
    getRowPalletCount: spGetRowPalletCount,
    getPalletLabelsForZt: spGetPalletLabelsForZt,
    pltStatusCls: spPltStatusCls,
    getCheckedZtRows: function () {
      var out = [];
      document.querySelectorAll('.data-table tbody tr').forEach(function (tr) {
        if (tr.classList.contains('loc-pw-tr-merge-parent') || tr.classList.contains('loc-pw-tr-merge-child')) return;
        var cb = tr.querySelector('td input[type="checkbox"]');
        if (cb && cb.checked && tr.getAttribute('data-sp-zt')) out.push(tr);
      });
      return out;
    }
  };
})();
