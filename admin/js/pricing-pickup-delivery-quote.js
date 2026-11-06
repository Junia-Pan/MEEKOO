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

  /** 未填失效时间：列表与提示展示为长期有效 */
  function formatEndDisplay(iso) {
    if (!iso) return '长期有效';
    return formatDisplayTime(iso);
  }

  /** 表单展示：yyyy-mm-dd HH:mm；有秒时保留秒，避免回写丢掉 23:59:59 */
  function toInputDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d.getTime())) return '';
    const p = function (n) { return String(n).padStart(2, '0'); };
    const base = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    if (d.getSeconds()) return base + ':' + p(d.getSeconds());
    return base;
  }

  /** 表单录入 → 存储。空串表示未填；无法解析返回 null */
  function fromInputDateTime(text) {
    const s = String(text || '').trim();
    if (!s) return '';
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    const month = Number(m[2]);
    const day = Number(m[3]);
    const hh = Number(m[4]);
    const mm = Number(m[5]);
    const ss = Number(m[6] || '0');
    if (month < 1 || month > 12 || day < 1 || day > 31 || hh > 23 || mm > 59 || ss > 59) return null;
    const iso = m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':' + String(ss).padStart(2, '0');
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    if (d.getFullYear() !== Number(m[1]) || d.getMonth() + 1 !== month || d.getDate() !== day) return null;
    return iso;
  }

  /** 未填失效时间视为没有上限 */
  function endTs(iso) {
    if (iso == null || iso === '') return Infinity;
    const t = parseTs(iso);
    return isNaN(t) ? NaN : t;
  }

  /** 时间段有交集；一方失效 = 另一方生效时不视为重叠；未填失效时间视为一直有效 */
  function timeRangesOverlap(startA, endA, startB, endB) {
    const a0 = parseTs(startA);
    const a1 = endTs(endA);
    const b0 = parseTs(startB);
    const b1 = endTs(endB);
    if ([a0, b0].some(isNaN)) return false;
    if (a1 !== Infinity && isNaN(a1)) return false;
    if (b1 !== Infinity && isNaN(b1)) return false;
    if (a1 === b0 || b1 === a0) return false;
    return a0 < b1 && b0 < a1;
  }

  function customerSetsOverlap(idsA, idsB) {
    const setB = new Set(idsB || []);
    return (idsA || []).some(function (id) { return setB.has(id); });
  }

  /** 上一份的客户是否已被新报价全部覆盖 */
  function customersFullyCovered(prevIds, nextIds) {
    const next = new Set(nextIds || []);
    return (prevIds || []).every(function (id) { return next.has(id); });
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
    if (!quote || quote.customerScope === 'all') return '所有客户';
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

  /** 生效中：启用且 DEMO_NOW 在有效期内；未填失效时间则只要已到生效时间 */
  function isQuoteEffective(quote, at) {
    if (!quote || !quote.enabled) return false;
    const t = (at || DEMO_NOW).getTime();
    const s = parseTs(quote.start);
    if (isNaN(s) || t < s) return false;
    if (!quote.end) return true;
    const e = parseTs(quote.end);
    return !isNaN(e) && t <= e;
  }

  /** 当前是否早于生效时间（仅此阶段可编辑原单） */
  function isQuoteBeforeEffectiveStart(quote, at) {
    if (!quote || !quote.start) return true;
    return (at || DEMO_NOW).getTime() < parseTs(quote.start);
  }

  /** 编辑页只读：仅启用中不可改（与是否已过生效时间无关）；停用后可改原单 */
  function isQuoteEditReadonly(quote, at) {
    if (!quote) return false;
    return isQuoteEnabled(quote);
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
          reason: '与启用中的「所有客户」报价时间段重叠',
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
      + '生效 ' + formatDisplayTime(q.start) + ' ～ ' + formatEndDisplay(q.end);
  }

  /** 指定客户是否为同一客户（单选：集合完全一致） */
  function sameCustomerIds(idsA, idsB) {
    const a = (idsA || []).slice().sort();
    const b = (idsB || []).slice().sort();
    return a.length > 0 && a.length === b.length && a.every(function (id, i) { return id === b[i]; });
  }

  /**
   * 启用时区分「可自动接替」与「必须拦截」。
   * 可接替：同为所有客户，或指定客户且为同一客户；
   * 本次生效时间更晚；双方都填失效时本单生效 ≤ 上一份失效。
   * 未填失效时间视为长期有效。
   */
  function planQuoteEnable(candidate, excludeId) {
    const quotes = loadQuotes();
    const successors = [];
    const conflicts = [];
    Object.keys(quotes).forEach(function (id) {
      if (id === excludeId) return;
      const other = quotes[id];
      if (!other.enabled) return;
      const sameAll = candidate.customerScope === 'all' && other.customerScope === 'all';
      const sameSpecific = candidate.customerScope === 'specific' && other.customerScope === 'specific';
      if (!sameAll && !sameSpecific) return;
      if (sameSpecific && !sameCustomerIds(candidate.customerIds, other.customerIds)) return;
      if (!timeRangesOverlap(candidate.start, candidate.end, other.start, other.end)) return;

      const startsLater = parseTs(candidate.start) > parseTs(other.start);
      let noGap = true;
      if (other.end && candidate.end) {
        noGap = parseTs(candidate.start) <= parseTs(other.end);
      }
      if (startsLater && noGap) {
        successors.push(other);
        return;
      }

      let reason = '与启用中的报价时间段重叠';
      if (!startsLater) {
        reason = '生效时间不晚于上一份报价，无法自动接替';
      } else if (!noGap) {
        reason = '本单生效晚于上一份失效，接替后会出现无报价的空档';
      }
      conflicts.push({ conflict: other, reason: reason });
    });
    successors.sort(function (a, b) {
      return parseTs(a.start) - parseTs(b.start) || String(a.id).localeCompare(String(b.id));
    });
    return { successors: successors, conflicts: conflicts };
  }

  /**
   * @param {object} quote
   * @param {object[]} successors
   * @param {{ action?: 'enable'|'publish', executeNow?: boolean }} [options]
   */
  function buildEnableConfirmMessage(quote, successors, options) {
    const action = (options && options.action) === 'publish' ? 'publish' : 'enable';
    const executeNow = options && options.executeNow === false ? false : (action === 'enable' ? true : !!(options && options.executeNow));
    const startText = formatDisplayTime(quote.start);
    const quoteName = (quote && quote.name) ? String(quote.name) : '';
    const lines = [];
    if (successors && successors.length) {
      if (action === 'publish' && !executeNow) {
        lines.push('启用后将调整以下报价单失效时间（本次发布仅预告，不改旧单）：');
      } else {
        lines.push('将调整以下报价单失效时间：');
      }
      successors.forEach(function (prev) {
        lines.push('报价编号：' + prev.id + '，报价名称：' + (prev.name || '') + '，失效时间变更为→ ' + startText);
      });
      lines.push('');
    }
    lines.push('确认要启用报价“' + quoteName + '”？');
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function buildEnableBlockMessage(conflicts) {
    return (conflicts || []).map(function (hit) { return buildConflictMessage(hit); }).join('\n\n');
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
    formatEndDisplay: formatEndDisplay,
    toInputDateTime: toInputDateTime,
    fromInputDateTime: fromInputDateTime,
    timeRangesOverlap: timeRangesOverlap,
    formatCustomerLabel: formatCustomerLabel,
    isQuoteEnabled: isQuoteEnabled,
    isQuoteEffective: isQuoteEffective,
    isQuoteBeforeEffectiveStart: isQuoteBeforeEffectiveStart,
    isQuoteEditReadonly: isQuoteEditReadonly,
    findUniquenessConflict: findUniquenessConflict,
    planQuoteEnable: planQuoteEnable,
    buildConflictMessage: buildConflictMessage,
    buildEnableConfirmMessage: buildEnableConfirmMessage,
    buildEnableBlockMessage: buildEnableBlockMessage,
    nextQuoteId: nextQuoteId,
    getCustomerOption: getCustomerOption,
  };
})(typeof window !== 'undefined' ? window : global);
