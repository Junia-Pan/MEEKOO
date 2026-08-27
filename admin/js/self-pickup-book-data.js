/**
 * 自提预约演示：提货码 ↔ 自提单 / 货件明细（book-code、book-fill 共用）
 */
(function () {
  var SP_BOOK_CATALOG = [
    { key: 'mx-1', fba: 'FBA15HJ20260401-A', cust: 'ref-001-customerX', customer: '华东跨境贸易', cntr: 'MSKU1234567', sysNo: 'EXP-2026-0401', qty: '15', plt: '2', vol: '0.60', gw: '110', whIn: '2026-04-26', zt: 'ZT-2026-M0401', pallets: ['PLT-LAX-301', 'PLT-LAX-302'], palletGroup: 'mix-1', bookable: true, status: '未预约', pickCode: 'SPM4XK01' },
    { key: 'mx-2', fba: 'FBA15HJ20260401-B', cust: 'ref-002-customerY', customer: '华东跨境贸易', cntr: 'MSKU2233445', sysNo: 'EXP-2026-0402', qty: '25', plt: '2', vol: '0.90', gw: '125', whIn: '2026-04-26', zt: 'ZT-2026-M0401', pallets: ['PLT-LAX-301', 'PLT-LAX-302'], palletGroup: 'mix-1', bookable: true, status: '未预约', pickCode: 'SPM4XK01' },
    { key: 'mx-3', fba: 'FBA15HJ20260401-C', cust: 'ref-003-customerZ', customer: '华东跨境贸易', cntr: 'MSKU3390008', sysNo: 'EXP-2026-0403', qty: '20', plt: '2', vol: '1.35', gw: '125', whIn: '2026-04-26', zt: 'ZT-2026-M0401', pallets: ['PLT-LAX-301', 'PLT-LAX-302'], palletGroup: 'mix-1', bookable: true, status: '未预约', pickCode: 'SPM4XK01' },
    { key: 'n-0405', fba: 'FBA15HJ20260405', cust: 'ref-norm-sp01', customer: '华东跨境贸易', cntr: 'MSKU4400123', sysNo: 'EXP-2026-0405', qty: '28', plt: '2', vol: '1.25', gw: '165', whIn: '2026-04-27', zt: 'ZT-2026-0405', pallets: ['PLT-LAX-205', 'PLT-LAX-206'], palletGroup: '', bookable: true, status: '未预约', pickCode: 'SP05N8K2' },
    { key: 'ov-0406', fba: 'FBA15HJ20260406', cust: 'ref-overdue-01', customer: '深圳星航供应链', cntr: 'TCLU5566778', sysNo: 'EXP-2026-0406', qty: '16', plt: '2', vol: '0.88', gw: '142', whIn: '2026-04-20', zt: 'ZT-2026-0406', pallets: ['PLT-LAX-501', 'PLT-LAX-502'], palletGroup: '', bookable: true, status: '已预约', pickCode: 'SP88A00Q' },
    { key: 'p-0401', fba: 'FBA15HJ20260401', cust: 'ref-0090ed', customer: '杭州优品出海', cntr: 'MSKU1234567', sysNo: 'EXP-2026-0401', qty: '48', plt: '8', vol: '1.20', gw: '180', whIn: '2026-04-26', zt: 'ZT-2026-0401', pallets: ['PLT-LAX-101'], palletGroup: '', bookable: false, status: '部分提货', pickCode: 'SP88B91Q' },
    { key: 's-0402a', fba: 'FBA15HJ20260402', cust: 'HK-2026-0402', customer: '深圳星航供应链', cntr: 'MSKU2234567', sysNo: 'EXP-2026-0402', qty: '8', plt: '1', vol: '0.85', gw: '120', whIn: '2026-04-26', zt: 'ZT-2026-0402-1', pallets: ['PLT-LAX-401'], palletGroup: '', bookable: true, status: '已预约', pickCode: 'SP88C92A' },
    { key: 's-0402b', fba: 'FBA15HJ20260402', cust: 'HK-2026-0402', customer: '深圳星航供应链', cntr: 'MSKU2234567', sysNo: 'EXP-2026-0402', qty: '14', plt: '2', vol: '1.10', gw: '168', whIn: '2026-04-26', zt: 'ZT-2026-0402-2', pallets: ['PLT-LAX-402'], palletGroup: '', bookable: true, status: '已预约', pickCode: 'SP88D92B' },
    { key: 'p-0403', fba: 'FBA15HJ20260403', cust: 'ref-done-01', customer: 'MEEKOO 优选科技', cntr: 'MSKU3390001', sysNo: 'EXP-2026-0403', qty: '48', plt: '8', vol: '1.05', gw: '165', whIn: '2026-04-25', zt: 'ZT-2026-0403', pallets: ['PLT-LAX-310'], palletGroup: '', bookable: false, status: '已提货', pickCode: 'SP88E93C' },
    { key: 'm-0500a', fba: 'FBA15HJ20260501', cust: 'ref-merge-a01', customer: '华东跨境贸易', cntr: 'MSKU5500001', sysNo: 'EXP-2026-0501', qty: '20', plt: '2', vol: '1.00', gw: '130', whIn: '2026-04-28', zt: 'ZT-2026-M0500', pallets: [], palletGroup: '', bookable: true, status: '未预约', pickCode: 'SPM5H00A' },
    { key: 'm-0500b', fba: 'FBA15HJ20260502', cust: 'ref-merge-b02', customer: '华东跨境贸易', cntr: 'MSKU5500002', sysNo: 'EXP-2026-0502', qty: '22', plt: '2', vol: '1.10', gw: '150', whIn: '2026-04-28', zt: 'ZT-2026-M0500', pallets: [], palletGroup: '', bookable: true, status: '未预约', pickCode: 'SPM5H00A' }
  ];

  var SP_PICK_CODE_ZT = {
    SPM4XK01: 'ZT-2026-M0401',
    SP05N8K2: 'ZT-2026-0405',
    SP88A00Q: 'ZT-2026-0406',
    SP88B91Q: 'ZT-2026-0401',
    SP88C92A: 'ZT-2026-0402-1',
    SP88D92B: 'ZT-2026-0402-2',
    SP88E93C: 'ZT-2026-0403',
    SPM5H00A: 'ZT-2026-M0500'
  };

  function spBookNormCode(code) {
    if (window.SpPickupCore && SpPickupCore.normalizePickCode) {
      return SpPickupCore.normalizePickCode(code);
    }
    var c = String(code || '').trim().toUpperCase();
    return /^SP[0-9A-Z]{6}$/.test(c) ? c : '';
  }

  function spBookParsePickCodes(raw) {
    return String(raw || '').split(/[\n,;，；\s]+/).map(function (x) {
      return spBookNormCode(x);
    }).filter(Boolean);
  }

  function spBookFindByPickCode(code) {
    var c = spBookNormCode(code);
    if (!c) return [];
    var zt = SP_PICK_CODE_ZT[c];
    var hits = SP_BOOK_CATALOG.filter(function (row) {
      return spBookNormCode(row.pickCode) === c || (zt && row.zt === zt);
    });
    if (!hits.length && zt) {
      hits = SP_BOOK_CATALOG.filter(function (row) { return row.zt === zt; });
    }
    return hits;
  }

  function spBookExpandPalletGroup(rows) {
    var extra = [];
    var have = {};
    rows.forEach(function (r) { have[r.key] = true; });
    rows.forEach(function (r) {
      if (!r.palletGroup) return;
      SP_BOOK_CATALOG.forEach(function (sib) {
        if (sib.palletGroup === r.palletGroup && !have[sib.key]) {
          extra.push(sib);
          have[sib.key] = true;
        }
      });
    });
    return rows.concat(extra);
  }

  function spBookResolveZt(code) {
    var c = spBookNormCode(code);
    if (!c) return '';
    if (SP_PICK_CODE_ZT[c]) return SP_PICK_CODE_ZT[c];
    var hits = spBookFindByPickCode(c);
    return hits.length ? hits[0].zt : '';
  }

  window.SpPickupBookData = {
    CATALOG: SP_BOOK_CATALOG,
    PICK_CODE_ZT: SP_PICK_CODE_ZT,
    normCode: spBookNormCode,
    parsePickCodes: spBookParsePickCodes,
    findByPickCode: spBookFindByPickCode,
    expandPalletGroup: spBookExpandPalletGroup,
    resolveZt: spBookResolveZt
  };
})();
