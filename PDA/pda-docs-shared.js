/* Meekoo PDA · 单据查询共享数据与工具 */
(function (global) {
  var REPRINT_LOG_KEY = 'meekoo_pda_reprint_logs';

  /** 货件级元数据（与 admin 状态体系一致） */
  var SHIPMENT_META = {
    'CRN-2026-018': {
      shipStatus: '待出库',
      currentPlan: { id: 'PLAN-20260518-03', status: '待备货' },
      currentLoadOrder: { id: 'LD-20260520-07', status: '备货中' },
      milestones: {
        orderedAt: '2026-04-15 10:30:00',
        arrivedAt: '2026-04-25 09:30:00',
        arrivedWarehouse: '洛杉矶仓',
        devanningReportAt: '2026-04-25 16:20:00',
        inboundAt: '2026-04-26 08:15:00',
        outboundAt: '',
        outboundLoadNo: '',
        signedAt: ''
      },
      events: [
        {
          type: 'move_type_change',
          at: '2026-04-20 14:10:00',
          operator: '李晓华',
          title: '转 Move Type',
          desc: 'FBA卡派 → 私卡'
        }
      ],
      alerts: []
    },
    'CRN-770018': {
      shipStatus: '在库',
      currentPlan: null,
      currentLoadOrder: null,
      milestones: {
        orderedAt: '2026-04-12 09:05:00',
        arrivedAt: '2026-04-18 09:00:00',
        arrivedWarehouse: '洛杉矶仓',
        devanningReportAt: '2026-04-18 14:30:00',
        inboundAt: '2026-04-18 16:12:00',
        outboundAt: '',
        outboundLoadNo: '',
        signedAt: ''
      },
      events: [
        {
          type: 'ticket',
          at: '2026-04-19 11:20:00',
          operator: '系统',
          title: '工单 TK-2026-0402',
          desc: '到仓少件，处理中',
          refId: 'TK-2026-0402'
        }
      ],
      alerts: [{ kind: 'ticket', text: '工单 TK-2026-0402 处理中' }]
    },
    'CRN-660092': {
      shipStatus: '已入库',
      currentPlan: { id: 'PLAN-20260510-01', status: '已完成' },
      currentLoadOrder: null,
      milestones: {
        orderedAt: '2026-04-09 08:00:00',
        arrivedAt: '2026-04-14 10:20:00',
        arrivedWarehouse: '洛杉矶仓',
        devanningReportAt: '2026-04-14 15:00:00',
        inboundAt: '2026-04-15 09:12:00',
        outboundAt: '',
        outboundLoadNo: '',
        signedAt: ''
      },
      events: [],
      alerts: []
    }
  };

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
      zone: 'A区',
      location: 'A-12-03',
      status: '已上架',
      inboundAt: '2026-04-26 08:12:00',
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
      zone: 'A区',
      location: 'A-12-04',
      status: '已上架',
      inboundAt: '2026-04-26 08:15:00',
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
      zone: 'B区',
      location: 'B-05-02',
      status: '待出库',
      inboundAt: '2026-04-18 16:05:00',
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
      zone: 'B区',
      location: 'B-05-03',
      status: '已上架',
      inboundAt: '2026-04-18 16:12:00',
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
      zone: 'A区',
      location: 'A-09-01',
      status: '已上架',
      inboundAt: '2026-04-15 09:12:00',
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
      zone: 'C区',
      location: 'C-01-04',
      status: '待出库',
      inboundAt: '2026-04-15 09:18:00',
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
    if (!s) return 'pda-docs-ship-st--default';
    if (s === '问题件') return 'pda-docs-ship-st--issue';
    if (s === '已取消' || s === '取消') return 'pda-docs-ship-st--cancel';
    if (s === '在库' || s === '已入库' || s === '留仓' || s === '已到仓' || s === '拆柜中') return 'pda-docs-ship-st--instock';
    if (s === '待出库' || s === '备货中' || s === '已预排' || s === '已装车') return 'pda-docs-ship-st--wait';
    if (s === '运输中') return 'pda-docs-ship-st--transit';
    if (s === '已出库' || s === '已送达' || s === '已签收') return 'pda-docs-ship-st--out';
    if (s === '已预报' || s === '未到仓') return 'pda-docs-ship-st--forecast';
    return 'pda-docs-ship-st--default';
  }

  function ctxStatusCls(s) {
    if (!s) return 'pda-docs-ship-ctx-st--default';
    if (s.indexOf('完成') >= 0 || s.indexOf('已') === 0 && s.indexOf('已取消') < 0) return 'pda-docs-ship-ctx-st--done';
    if (s.indexOf('中') >= 0 || s.indexOf('待') >= 0) return 'pda-docs-ship-ctx-st--active';
    return 'pda-docs-ship-ctx-st--default';
  }

  function fmtDateTime(iso) {
    var t = String(iso || '').trim();
    if (!t) return '—';
    var d = new Date(t.replace(' ', 'T'));
    if (isNaN(d.getTime())) {
      if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t;
      return t;
    }
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function zoneFromLocation(loc) {
    var m = String(loc || '').match(/^([A-Z])-/i);
    return m ? m[1].toUpperCase() + '区' : '—';
  }

  function enrichPallet(p) {
    return {
      pltNo: p.pltNo,
      sysNo: p.sysNo,
      container: p.container,
      customer: p.customer,
      ref: p.ref,
      fba: p.fba,
      destCode: p.destCode,
      destType: p.destType,
      pieces: p.pieces,
      zone: p.zone || zoneFromLocation(p.location),
      location: p.location || '—',
      status: p.status,
      inboundAt: p.inboundAt || '',
      reprintCount: p.reprintCount,
      lastReprintAt: p.lastReprintAt
    };
  }

  function defaultDemoMeta(displayRef) {
    return {
      shipStatus: '待出库',
      currentPlan: { id: 'PLAN-20260518-03', status: '待备货' },
      currentLoadOrder: { id: 'LD-20260520-07', status: '备货中' },
      milestones: {
        orderedAt: '2026-04-15 10:30:00',
        arrivedAt: '2026-04-25 09:30:00',
        arrivedWarehouse: '洛杉矶仓',
        devanningReportAt: '2026-04-25 16:20:00',
        inboundAt: '2026-04-26 08:15:00',
        outboundAt: '',
        outboundLoadNo: 'LD-20260520-07',
        signedAt: ''
      },
      events: [
        {
          type: 'move_type_change',
          at: '2026-04-20 14:10:00',
          operator: '李晓华',
          title: '转 Move Type',
          desc: 'FBA卡派 → 私卡'
        },
        {
          type: 'issue',
          at: '2026-04-21 09:00:00',
          operator: '张伟',
          title: '标记问题件',
          desc: '地址异常，已解除'
        }
      ],
      alerts: []
    };
  }

  function lookupMeta(ref) {
    var key = normalizeRef(ref).toUpperCase();
    var meta = null;
    Object.keys(SHIPMENT_META).forEach(function (k) {
      if (k.toUpperCase() === key) meta = SHIPMENT_META[k];
    });
    return meta;
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

  function enrichShipment(ref, pallets, customer, container, demo, metaOverride) {
    var first = pallets[0] || {};
    var enrichedPallets = pallets.map(enrichPallet);
    var totalPieces = enrichedPallets.reduce(function (sum, p) {
      return sum + (p.pieces || 0);
    }, 0);
    var meta = metaOverride || lookupMeta(ref) || (demo ? defaultDemoMeta(ref) : null);
    var shipStatus = (meta && meta.shipStatus) || '已入库';
    return {
      ref: ref,
      customer: customer || first.customer || '—',
      sysNo: first.sysNo || '—',
      container: container || first.container || '—',
      shipStatus: shipStatus,
      moveType: moveTypeLabel(first.destType),
      fbaCode: fbaCodeLabel(first),
      currentPlan: meta ? meta.currentPlan : null,
      currentLoadOrder: meta ? meta.currentLoadOrder : null,
      milestones: meta ? meta.milestones : {},
      events: meta ? (meta.events || []) : [],
      alerts: meta ? (meta.alerts || []) : [],
      pallets: enrichedPallets,
      palletCount: enrichedPallets.length,
      totalPieces: totalPieces,
      demo: !!demo
    };
  }

  function normalizeRef(raw) {
    return (raw || '').trim();
  }

  /** 识别非 Customer REF No 的扫码（用于拦截） */
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
      var hour = 8 + (i % 4);
      var min = 10 + i * 3;
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
        zone: tpl.zone || zoneFromLocation(tpl.location),
        location: tpl.location,
        status: tpl.status,
        inboundAt: '2026-04-26 ' + String(hour).padStart(2, '0') + ':' + String(min).padStart(2, '0') + ':00',
        reprintCount: tpl.reprintCount,
        lastReprintAt: tpl.lastReprintAt
      });
    }
    return enrichShipment(
      displayRef,
      pallets,
      pallets[0].customer || '演示客户',
      pallets[0].container || 'COSU628190',
      true,
      defaultDemoMeta(displayRef)
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
    if (!ref) return { ok: false, message: '请输入 Customer REF No' };
    var unsupported = detectUnsupportedScan(ref);
    if (unsupported) {
      return { ok: false, message: '仅支持 Customer REF No，不支持' + unsupported };
    }
    return { ok: true, ref: ref };
  }

  /** 单据页查询路由：Customer REF No → 货件详情（未命中则用演示数据） */
  function routeDocsQuery(raw) {
    var check = validateDocsQuery(raw);
    if (!check.ok) return { ok: false, message: check.message };
    var shipment = getShipmentByRef(check.ref);
    if (!shipment) return { ok: false, message: '请输入 Customer REF No' };
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
    ctxStatusCls: ctxStatusCls,
    fmtDateTime: fmtDateTime,
    zoneFromLocation: zoneFromLocation,
    SHIPMENT_META: SHIPMENT_META,
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
