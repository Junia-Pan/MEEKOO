/**
 * 提拆派报价原型 — 列表/编辑共用（匹配 PRD 3.1 配置期唯一性、4.2.2 生命周期）
 */
(function (global) {
  const STORAGE_KEY = 'meekoo_pricing_pickup_quotes_v1';

  /** 原型演示用「当前时间」，便于固定展示「生效中」只读（PR-202605-001） */
  const DEMO_NOW = new Date('2026-06-01T12:00:00');

  const QUOTE_CUSTOMER_OPTIONS = [
    { id: 'tx', name: '腾信物流' },
    { id: 'dm', name: '大迈供应链' },
    { id: 'abc', name: 'ABC Trading Co.' },
    { id: 'xyz', name: 'XYZ Imports' },
    { id: 'hd', name: '华东跨境贸易' },
    { id: 'gf', name: 'Global Freight LLC' },
  ];

  const DEFAULT_QUOTES = {
    'PR-202605-001': {
      id: 'PR-202605-001',
      name: '2026标准价目表',
      customerScope: 'all',
      customerIds: [],
      start: '2026-01-01T00:00:00',
      end: '2026-12-31T23:59:59',
      currency: 'USD',
      enabled: true,
      createdAt: '2025-12-20 14:30',
      modifiedAt: '2025-12-25 10:15',
      publishedAt: '2025-12-20T14:30:00',
    },
    'PR-202605-002': {
      id: 'PR-202605-002',
      name: '大客户协议价',
      customerScope: 'specific',
      customerIds: ['tx', 'dm', 'abc'],
      start: '2026-01-01T00:00:00',
      end: '2026-06-30T23:59:59',
      currency: 'USD',
      enabled: true,
      createdAt: '2025-12-22 09:00',
      modifiedAt: '-',
      publishedAt: '2025-12-22T09:00:00',
    },
    'PR-202605-003': {
      id: 'PR-202605-003',
      name: '临时活动促销价',
      customerScope: 'all',
      customerIds: [],
      start: '2026-05-01T00:00:00',
      end: '2026-05-31T23:59:59',
      currency: 'USD',
      enabled: false,
      createdAt: '2026-04-20 16:45',
      modifiedAt: '2026-05-18 09:20',
      publishedAt: '2026-04-20T16:45:00',
    },
  };

  function parseTs(iso) {
    if (!iso) return NaN;
    return new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).getTime();
  }

  function formatDisplayTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /** 时间段有交集；一方失效 = 另一方生效时不视为重叠 */
  function timeRangesOverlap(startA, endA, startB, endB) {
    const a0 = parseTs(startA);
    const a1 = parseTs(endA);
    const b0 = parseTs(startB);
    const b1 = parseTs(endB);
    if ([a0, a1, b0, b1].some(isNaN)) return false;
    if (a1 === b0 || b1 === a0) return false;
    return a0 < b1 && b0 < a1;
  }

  function customerSetsOverlap(idsA, idsB) {
    const setB = new Set(idsB || []);
    return (idsA || []).some(function (id) { return setB.has(id); });
  }

  function loadQuotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_QUOTES));
      const parsed = JSON.parse(raw);
      const merged = JSON.parse(JSON.stringify(DEFAULT_QUOTES));
      Object.keys(parsed).forEach(function (id) {
        merged[id] = Object.assign({}, merged[id] || {}, parsed[id], { id: id });
      });
      return merged;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_QUOTES));
    }
  }

  function saveQuotes(quotes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
  }

  function getCustomerOption(id) {
    return QUOTE_CUSTOMER_OPTIONS.find(function (c) { return c.id === id; });
  }

  function formatCustomerLabel(quote) {
    if (!quote || quote.customerScope === 'all') return '全部客户';
    const names = (quote.customerIds || []).map(function (id) {
      const c = getCustomerOption(id);
      return c ? c.name : id;
    });
    if (!names.length) return '指定客户（未选）';
    if (names.length <= 2) return names.join('、');
    return names[0] + '、' + names[1] + ' 等' + names.length + ' 家';
  }

  function isQuoteEnabled(quote) {
    return !!(quote && quote.enabled);
  }

  /** 生效中：启用且 DEMO_NOW 在 [生效, 失效] 内 */
  function isQuoteEffective(quote, at) {
    if (!quote || !quote.enabled) return false;
    const t = (at || DEMO_NOW).getTime();
    const s = parseTs(quote.start);
    const e = parseTs(quote.end);
    return t >= s && t <= e;
  }

  /** 当前是否早于生效时间（仅此阶段可编辑原单） */
  function isQuoteBeforeEffectiveStart(quote, at) {
    if (!quote || !quote.start) return true;
    return (at || DEMO_NOW).getTime() < parseTs(quote.start);
  }

  /** 编辑页只读：已生效（当前时间 ≥ 生效时间），与启用/停用无关 */
  function isQuoteEditReadonly(quote, at) {
    if (!quote) return false;
    return !isQuoteBeforeEffectiveStart(quote, at);
  }

  /**
   * @param {object} candidate { customerScope, customerIds, start, end }
   * @param {string} [excludeId]
   * @returns {{ conflict: object, reason: string } | null}
   */
  function findUniquenessConflict(candidate, excludeId) {
    const quotes = loadQuotes();
    const willCheckAsEnabled = candidate.checkAsEnabled !== false;
    if (!willCheckAsEnabled) return null;

    for (const id of Object.keys(quotes)) {
      if (id === excludeId) continue;
      const other = quotes[id];
      if (!other.enabled) continue;
      if (!timeRangesOverlap(candidate.start, candidate.end, other.start, other.end)) continue;

      if (candidate.customerScope === 'all' && other.customerScope === 'all') {
        return {
          conflict: other,
          reason: '与启用中的「全部客户」报价时间段重叠',
        };
      }
      if (candidate.customerScope === 'specific' && other.customerScope === 'specific') {
        if (customerSetsOverlap(candidate.customerIds, other.customerIds)) {
          return {
            conflict: other,
            reason: '与启用中的指定客户报价存在客户重复且时间段重叠',
          };
        }
      }
    }
    return null;
  }

  function buildConflictMessage(hit) {
    if (!hit) return '';
    const q = hit.conflict;
    return hit.reason + '：\n报价 ' + q.id + '（' + q.name + '）\n'
      + '生效 ' + formatDisplayTime(q.start) + ' ～ ' + formatDisplayTime(q.end);
  }

  function nextQuoteId(quotes) {
    let max = 202605000;
    Object.keys(quotes).forEach(function (id) {
      const m = id.match(/PR-(\d+)/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return 'PR-' + (max + 1);
  }

  global.PricingPickupQuote = {
    STORAGE_KEY: STORAGE_KEY,
    DEMO_NOW: DEMO_NOW,
    QUOTE_CUSTOMER_OPTIONS: QUOTE_CUSTOMER_OPTIONS,
    DEFAULT_QUOTES: DEFAULT_QUOTES,
    loadQuotes: loadQuotes,
    saveQuotes: saveQuotes,
    parseTs: parseTs,
    formatDisplayTime: formatDisplayTime,
    timeRangesOverlap: timeRangesOverlap,
    formatCustomerLabel: formatCustomerLabel,
    isQuoteEnabled: isQuoteEnabled,
    isQuoteEffective: isQuoteEffective,
    isQuoteBeforeEffectiveStart: isQuoteBeforeEffectiveStart,
    isQuoteEditReadonly: isQuoteEditReadonly,
    findUniquenessConflict: findUniquenessConflict,
    buildConflictMessage: buildConflictMessage,
    nextQuoteId: nextQuoteId,
    getCustomerOption: getCustomerOption,
  };
})(typeof window !== 'undefined' ? window : global);
