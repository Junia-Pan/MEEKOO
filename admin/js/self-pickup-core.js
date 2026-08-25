/**
 * 自提单共享：板标明细与行查询（拆分 / 提货共用）
 */
(function () {
  var COL_ZT = 2;
  var COL_REF = 4;
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
    'ZT-2026-0406': [
      { pltNo: 'PLT-LAX-501', status: '已上架', location: 'C-03-02', warehouseZone: 'C区待发区', warehouseName: 'LA1150', pieces: 8, container: 'TCLU5566778', sysNo: 'EXP-2026-0406' },
      { pltNo: 'PLT-LAX-502', status: '已上架', location: 'C-03-03', warehouseZone: 'C区待发区', warehouseName: 'LA1150', pieces: 8, container: 'TCLU5566778', sysNo: 'EXP-2026-0406' }
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

  function spGetRowCellText(tr, idx) {
    if (!tr) return '—';
    var cell = tr.cells[idx];
    if (!cell) return '—';
    var t = cell.textContent.replace(/\s+/g, ' ').trim();
    return t || '—';
  }

  function spGetRowCustRef(tr) {
    if (!tr) return '—';
    var cell = tr.cells[COL_REF];
    if (!cell) return '—';
    var strong = cell.querySelector('.loc-pw-cust-ref-strong');
    if (strong) {
      var main = strong.textContent.trim();
      return main || '—';
    }
    var mergeRefs = cell.querySelector('.loc-pw-merge-parent-refs');
    if (mergeRefs) {
      var merged = mergeRefs.textContent.replace(/\s+/g, ' ').trim();
      return merged || '—';
    }
    var lines = cell.querySelectorAll('.loc-pw-cust-ref-line span');
    if (lines.length) {
      var parts = [];
      lines.forEach(function (el) {
        var s = el.textContent.trim();
        if (s) parts.push(s);
      });
      if (parts.length) return parts.join(', ');
    }
    return spGetRowCellText(tr, COL_REF);
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

  /** 提货码：统一 8 位 = SP + 6 位随机字母数字；同期不重复；用尽后优先复用日期最早的已释放码 */
  var SP_PICK_CODE_PREFIX = 'SP';
  var SP_PICK_CODE_BODY_LEN = 6;
  var SP_PICK_CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  var SP_PICK_CODE_STORE_KEY = 'meekoo_sp_pick_codes_v2';
  var SP_PICK_CODE_SPACE = Math.pow(SP_PICK_CODE_CHARS.length, SP_PICK_CODE_BODY_LEN);

  function spPickCodeNowIso() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function spIsPickCode(code) {
    return /^SP[0-9A-Za-z]{6}$/.test(String(code || '').trim());
  }

  function spNormalizePickCode(code) {
    var c = String(code || '').trim();
    return spIsPickCode(c) ? c : '';
  }

  function spReadPickCodeStore() {
    try {
      var raw = localStorage.getItem(SP_PICK_CODE_STORE_KEY);
      if (!raw) return { active: {}, released: [] };
      var data = JSON.parse(raw);
      return {
        active: data && data.active && typeof data.active === 'object' ? data.active : {},
        released: Array.isArray(data && data.released) ? data.released : []
      };
    } catch (e) {
      return { active: {}, released: [] };
    }
  }

  function spWritePickCodeStore(store) {
    try {
      localStorage.setItem(SP_PICK_CODE_STORE_KEY, JSON.stringify(store));
    } catch (e) {}
  }

  function spRandomPickCodeBody() {
    var out = '';
    var n = SP_PICK_CODE_CHARS.length;
    for (var i = 0; i < SP_PICK_CODE_BODY_LEN; i++) {
      out += SP_PICK_CODE_CHARS.charAt(Math.floor(Math.random() * n));
    }
    return out;
  }

  function spCollectOccupiedPickCodes(extraOccupied) {
    var set = {};
    var store = spReadPickCodeStore();
    Object.keys(store.active || {}).forEach(function (k) {
      var c = spNormalizePickCode(k);
      if (c) set[c] = true;
    });
    if (extraOccupied) {
      (Array.isArray(extraOccupied) ? extraOccupied : [extraOccupied]).forEach(function (item) {
        var c = spNormalizePickCode(item);
        if (c) set[c] = true;
      });
    }
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.sp-pick-code').forEach(function (el) {
        var c = spNormalizePickCode(el.textContent);
        if (c) set[c] = true;
      });
    }
    return set;
  }

  function spPickEarliestReleased(store, occupied) {
    var list = (store.released || []).slice().filter(function (row) {
      var c = spNormalizePickCode(row && row.code);
      return c && !occupied[c];
    });
    list.sort(function (a, b) {
      var da = String(a.apptDate || a.issuedAt || '');
      var db = String(b.apptDate || b.issuedAt || '');
      if (da !== db) return da < db ? -1 : 1;
      return String(a.code).localeCompare(String(b.code));
    });
    return list.length ? spNormalizePickCode(list[0].code) : '';
  }

  function spRemoveReleasedCode(store, code) {
    store.released = (store.released || []).filter(function (row) {
      return spNormalizePickCode(row && row.code) !== code;
    });
  }

  /**
   * 分配提货码。
   * @param {{ apptDate?: string, extraOccupied?: string[] }} opts
   */
  function spAllocatePickCode(opts) {
    opts = opts || {};
    var store = spReadPickCodeStore();
    var occupied = spCollectOccupiedPickCodes(opts.extraOccupied);
    var activeCount = Object.keys(store.active || {}).length;
    var preferRecycle = activeCount >= SP_PICK_CODE_SPACE;

    if (preferRecycle) {
      var recycled = spPickEarliestReleased(store, occupied);
      if (recycled) {
        spRemoveReleasedCode(store, recycled);
        store.active[recycled] = {
          issuedAt: spPickCodeNowIso(),
          apptDate: opts.apptDate || ''
        };
        spWritePickCodeStore(store);
        return recycled;
      }
    }

    var tries = Math.min(64, Math.max(16, Math.floor(Math.sqrt(SP_PICK_CODE_SPACE))));
    for (var i = 0; i < tries; i++) {
      var candidate = SP_PICK_CODE_PREFIX + spRandomPickCodeBody();
      if (occupied[candidate] || store.active[candidate]) continue;
      store.active[candidate] = {
        issuedAt: spPickCodeNowIso(),
        apptDate: opts.apptDate || ''
      };
      spRemoveReleasedCode(store, candidate);
      spWritePickCodeStore(store);
      return candidate;
    }

    var fallback = spPickEarliestReleased(store, occupied);
    if (fallback) {
      spRemoveReleasedCode(store, fallback);
      store.active[fallback] = {
        issuedAt: spPickCodeNowIso(),
        apptDate: opts.apptDate || ''
      };
      spWritePickCodeStore(store);
      return fallback;
    }

    // 极端兜底：仍拼一个未在 occupied 的随机码（不写入失败）
    for (var j = 0; j < 200; j++) {
      var last = SP_PICK_CODE_PREFIX + spRandomPickCodeBody();
      if (!occupied[last]) {
        store.active[last] = {
          issuedAt: spPickCodeNowIso(),
          apptDate: opts.apptDate || ''
        };
        spWritePickCodeStore(store);
        return last;
      }
    }
    return SP_PICK_CODE_PREFIX + spRandomPickCodeBody();
  }

  /** 作废/取消预约时释放提货码，供后续「最早复用」 */
  function spReleasePickCode(code, meta) {
    var c = spNormalizePickCode(code);
    if (!c) return;
    var store = spReadPickCodeStore();
    var prev = store.active[c] || {};
    delete store.active[c];
    spRemoveReleasedCode(store, c);
    store.released.push({
      code: c,
      issuedAt: prev.issuedAt || (meta && meta.issuedAt) || '',
      apptDate: (meta && meta.apptDate) || prev.apptDate || '',
      releasedAt: spPickCodeNowIso()
    });
    spWritePickCodeStore(store);
  }

  window.SpPickupCore = {
    COL_PROGRESS: 6,
    COL_REF: COL_REF,
    COL_ACTUAL_TIME: 18,
    esc: esc,
    findRow: spFindRow,
    getRowStatus: spGetRowStatus,
    getRowCustRef: spGetRowCustRef,
    getRowCellText: spGetRowCellText,
    getShipMode: spGetShipMode,
    getRowPalletCount: spGetRowPalletCount,
    getPalletLabelsForZt: spGetPalletLabelsForZt,
    pltStatusCls: spPltStatusCls,
    isPickCode: spIsPickCode,
    normalizePickCode: spNormalizePickCode,
    allocatePickCode: spAllocatePickCode,
    releasePickCode: spReleasePickCode,
    getCheckedZtRows: function () {
      var out = [];
      document.querySelectorAll('.data-table tbody tr').forEach(function (tr) {
        if (tr.classList.contains('loc-pw-tr-merge-child')) return;
        var cb = tr.querySelector('td input[type="checkbox"]');
        if (cb && cb.checked && tr.getAttribute('data-sp-zt')) out.push(tr);
      });
      return out;
    }
  };
})();
