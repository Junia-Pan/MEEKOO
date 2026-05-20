/* Meekoo PDA · 单据查询共享数据与工具 */
(function (global) {
  var REPRINT_LOG_KEY = 'meekoo_pda_reprint_logs';

  var PALLETS = [
    {
      pltNo: 'PLT-LAX-018',
      sysNo: 'SYS20260515018',
      container: 'COSU628190',
      customer: '华东跨境贸易',
      ref: 'CRN-2026-018',
      fba: 'FBA15Z8XYZ',
      destCode: 'SMF3',
      destType: 'FBA',
      pieces: 22,
      location: 'A-12-03',
      status: '已上架',
      reprintCount: 1,
      lastReprintAt: '2026-05-15 14:22'
    },
    {
      pltNo: 'PLT-LAX-019',
      sysNo: 'SYS20260515019',
      container: 'COSU628190',
      customer: '华东跨境贸易',
      ref: 'CRN-2026-018',
      fba: 'FBA15Z8XYZ',
      destCode: 'ONT8',
      destType: 'FBA',
      pieces: 18,
      location: 'A-12-04',
      status: '已上架',
      reprintCount: 0,
      lastReprintAt: ''
    },
    {
      pltNo: 'PLT-LAX-201',
      sysNo: 'SYS20260517201',
      container: 'TGHU7654321',
      customer: 'Sunrise Import Inc.',
      ref: 'CRN-770018',
      fba: '',
      destCode: 'SO-20260517-03',
      destType: '私卡派',
      pieces: 14,
      location: 'B-05-02',
      status: '待出库',
      reprintCount: 0,
      lastReprintAt: ''
    },
    {
      pltNo: 'PLT-LAX-202',
      sysNo: 'SYS20260517202',
      container: 'TGHU7654321',
      customer: 'Sunrise Import Inc.',
      ref: 'CRN-770018',
      fba: '',
      destCode: 'UPS',
      destType: '快递',
      pieces: 30,
      location: 'B-05-03',
      status: '已上架',
      reprintCount: 2,
      lastReprintAt: '2026-05-17 10:08'
    },
    {
      pltNo: 'PLT-LAX-109',
      sysNo: 'SYS20260510109',
      container: 'OOLU2468101',
      customer: 'ABC Trading Co.',
      ref: 'CRN-660092',
      fba: 'FBA66QTY',
      destCode: 'LGB8',
      destType: 'FBA',
      pieces: 8,
      location: 'A-09-01',
      status: '已上架',
      reprintCount: 0,
      lastReprintAt: ''
    },
    {
      pltNo: 'PLT-LAX-110',
      sysNo: 'SYS20260510110',
      container: 'OOLU2468101',
      customer: 'ABC Trading Co.',
      ref: 'CRN-660092',
      fba: '',
      destCode: 'SO-20260517-02',
      destType: '自提',
      pieces: 5,
      location: 'C-01-04',
      status: '待出库',
      reprintCount: 0,
      lastReprintAt: ''
    }
  ];

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function destTypeCls(t) {
    if (t === 'FBA') return 'pda-rp-dest-fba';
    if (t === '私卡派' || t === '自提') return 'pda-rp-dest-so';
    if (t === '快递') return 'pda-rp-dest-exp';
    return 'pda-rp-dest-other';
  }

  function statusCls(s) {
    if (s === '已上架') return 'pda-rp-st-done';
    if (s === '待出库') return 'pda-rp-st-wait';
    if (s === '已装车') return 'pda-rp-st-loaded';
    return '';
  }

  function shipStatusCls(s) {
    if (s === '备货中') return 'pda-docs-ship-st--prep';
    if (s === '待出库') return 'pda-docs-ship-st--wait';
    if (s === '已出库' || s === '已装车') return 'pda-docs-ship-st--out';
    if (s === '问题件') return 'pda-docs-ship-st--issue';
    return 'pda-docs-ship-st--default';
  }

  function moveTypeLabel(destType) {
    if (destType === 'FBA') return 'FBA卡派';
    if (destType === '私卡派') return '私卡';
    if (destType === '快递') return '快递';
    if (destType === '自提') return '自提';
    return destType || '—';
  }

  function fbaCodeLabel(p) {
    if (!p) return '—';
    if (p.destType === 'FBA') return p.destCode || p.fba || '—';
    return p.destCode || '—';
  }

  function enrichShipment(ref, pallets, customer, container, demo) {
    var first = pallets[0] || {};
    var totalPieces = pallets.reduce(function (sum, p) {
      return sum + (p.pieces || 0);
    }, 0);
    var shipStatus = '备货中';
    if (pallets.some(function (p) { return p.status === '待出库'; })) shipStatus = '待出库';
    if (pallets.every(function (p) { return p.status === '已装车'; }) && pallets.length) shipStatus = '已出库';
    return {
      ref: ref,
      customer: customer || first.customer || '—',
      sysNo: first.sysNo || '—',
      container: container || first.container || '—',
      shipStatus: shipStatus,
      moveType: moveTypeLabel(first.destType),
      fbaCode: fbaCodeLabel(first),
      pallets: pallets,
      palletCount: pallets.length,
      totalPieces: totalPieces,
      demo: !!demo
    };
  }

  function normalizeRef(raw) {
    return (raw || '').trim();
  }

  /** 识别非 Customer Ref No 的扫码（用于拦截） */
  function detectUnsupportedScan(raw) {
    var v = normalizeRef(raw).toUpperCase();
    if (!v) return null;
    if (/^PLT[-_]?/.test(v)) return '板标号';
    if (/^SYS/.test(v) || /^SHP-/.test(v)) return '系统单号';
    if (/^FBA/.test(v)) return 'FBA ID';
    if (/^LOC[-_]?/.test(v) || /^[A-Z]-\d{1,3}-\d{1,3}$/.test(v)) return '库位号';
    if (/^RCP[-_]?/.test(v) || /^PLAN[-_]?/.test(v)) return '计划单号';
    if (/^[A-Z]{4}\d{6,8}$/.test(v)) return '柜号';
    return null;
  }

  function findPalletsByRef(raw) {
    var v = normalizeRef(raw).toUpperCase();
    if (!v) return [];
    return PALLETS.filter(function (p) {
      return (p.ref || '').toUpperCase() === v;
    });
  }

  function formatDemoRef(raw) {
    var ref = normalizeRef(raw);
    if (/^\d+$/.test(ref)) return 'CRN-2026-' + ref.padStart(3, '0').slice(-3);
    if (/^CRN[-_]?/i.test(ref)) return ref.toUpperCase().replace(/_/g, '-');
    return 'CRN-' + ref.toUpperCase();
  }

  /** 原型演示：未命中真实数据时生成可展示的货件详情 */
  function buildDemoShipment(raw) {
    var displayRef = formatDemoRef(raw);
    var base = findPalletsByRef('CRN-2026-018');
    if (!base.length) base = PALLETS.slice(0, 2);
    var n = parseInt(String(raw).replace(/\D/g, ''), 10) || 18;
    var demoCount = 6;
    var pallets = [];
    for (var i = 0; i < demoCount; i++) {
      var tpl = base[i % base.length];
      pallets.push({
        pltNo: 'PLT-LAX-' + String(100 + i + (n % 800)).padStart(3, '0'),
        sysNo: 'SYS20260515' + String(n).padStart(3, '0'),
        container: tpl.container,
        customer: tpl.customer,
        ref: displayRef,
        fba: tpl.fba,
        destCode: tpl.destCode,
        destType: tpl.destType,
        pieces: tpl.pieces,
        location: tpl.location,
        status: tpl.status,
        reprintCount: tpl.reprintCount,
        lastReprintAt: tpl.lastReprintAt
      });
    }
    return enrichShipment(
      displayRef,
      pallets,
      pallets[0].customer || '演示客户',
      pallets[0].container || 'COSU628190',
      true
    );
  }

  function getShipmentByRef(raw) {
    var ref = normalizeRef(raw);
    if (!ref) return null;
    var pallets = findPalletsByRef(ref);
    if (!pallets.length) return buildDemoShipment(ref);
    var first = pallets[0];
    return enrichShipment(ref, pallets, first.customer, first.container, false);
  }

  function validateDocsQuery(raw) {
    var ref = normalizeRef(raw);
    if (!ref) return { ok: false, message: '请输入 Customer Ref No' };
    var unsupported = detectUnsupportedScan(ref);
    if (unsupported) {
      return { ok: false, message: '仅支持 Customer Ref No，不支持' + unsupported };
    }
    return { ok: true, ref: ref };
  }

  /** 单据页查询路由：Customer Ref No → 货件详情（未命中则用演示数据） */
  function routeDocsQuery(raw) {
    var check = validateDocsQuery(raw);
    if (!check.ok) return { ok: false, message: check.message };
    var shipment = getShipmentByRef(check.ref);
    if (!shipment) return { ok: false, message: '请输入 Customer Ref No' };
    return { ok: true, page: 'docs-shipment.html', ref: shipment.ref };
  }

  function routeDocsScan(raw) {
    return routeDocsQuery(raw);
  }

  function getPallet(pltNo) {
    for (var i = 0; i < PALLETS.length; i++) {
      if (PALLETS[i].pltNo === pltNo) return PALLETS[i];
    }
    return null;
  }

  function readAllLogs() {
    try {
      var raw = localStorage.getItem(REPRINT_LOG_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeAllLogs(store) {
    try {
      localStorage.setItem(REPRINT_LOG_KEY, JSON.stringify(store));
    } catch (e) { /* ignore */ }
  }

  function seedReprintLogs() {
    var store = readAllLogs();
    var changed = false;
    PALLETS.forEach(function (p) {
      if (!store[p.pltNo] && p.reprintCount > 0 && p.lastReprintAt) {
        store[p.pltNo] = [{
          time: p.lastReprintAt,
          reason: '标签污损',
          remark: '',
          printer: 'PRN-LAX-01',
          operator: '系统演示'
        }];
        changed = true;
      }
      if (!store[p.pltNo]) store[p.pltNo] = [];
    });
    if (store['PLT-LAX-202'] && store['PLT-LAX-202'].length === 1) {
      store['PLT-LAX-202'].push({
        time: '2026-05-16 15:40',
        reason: '打印失败',
        remark: '',
        printer: 'PRN-LAX-02',
        operator: '小李'
      });
      changed = true;
    }
    if (changed) writeAllLogs(store);
    return store;
  }

  function getReprintLogs(pltNo) {
    seedReprintLogs();
    var store = readAllLogs();
    return (store[pltNo] || []).slice().sort(function (a, b) {
      return (b.time || '').localeCompare(a.time || '');
    });
  }

  function appendReprintLog(pltNo, entry) {
    seedReprintLogs();
    var store = readAllLogs();
    if (!store[pltNo]) store[pltNo] = [];
    store[pltNo].unshift(entry);
    writeAllLogs(store);
    var p = getPallet(pltNo);
    if (p) {
      p.reprintCount = store[pltNo].length;
      p.lastReprintAt = entry.time || '';
    }
  }

  global.PdaDocsShared = {
    PALLETS: PALLETS,
    escapeHtml: escapeHtml,
    destTypeCls: destTypeCls,
    statusCls: statusCls,
    shipStatusCls: shipStatusCls,
    moveTypeLabel: moveTypeLabel,
    fbaCodeLabel: fbaCodeLabel,
    enrichShipment: enrichShipment,
    normalizeRef: normalizeRef,
    detectUnsupportedScan: detectUnsupportedScan,
    findPalletsByRef: findPalletsByRef,
    getShipmentByRef: getShipmentByRef,
    validateDocsQuery: validateDocsQuery,
    buildDemoShipment: buildDemoShipment,
    formatDemoRef: formatDemoRef,
    routeDocsQuery: routeDocsQuery,
    routeDocsScan: routeDocsScan,
    getPallet: getPallet,
    getReprintLogs: getReprintLogs,
    appendReprintLog: appendReprintLog,
    seedReprintLogs: seedReprintLogs
  };
})(typeof window !== 'undefined' ? window : this);
