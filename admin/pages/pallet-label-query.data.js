/* 板标查询 · 演示数据 */
window.PALLET_QUERY_DATA = [
  {
    pltNo: 'PLT-LAX-018', sysNo: 'SYS20260515018', container: 'COSU628190',
    customer: '华东跨境贸易', ref: 'CRN-2026-018', fba: 'FBA15Z8XYZ',
    destCode: 'SMF3', destType: 'FBA', pieces: 22, location: 'A-12-03', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', status: '已上架',
    mergeGroupId: 'mg-fba-smf3-1', palletScope: 'single', bol: 'BOL-8849201', loadNo: 'LD-20260518-001',
    measure: null, reprintCount: 1, lastReprintAt: '2026-05-15 14:22',
    ticketCount: 0,
    reprintLogs: [{ time: '2026-05-15 14:22', reason: '标签污损', operator: '小明', printer: 'PRN-LAX-01' }],
    cargo: [
      { shipmentId: 'HK-2026-0401', moveType: 'FBA卡派', ref: 'CRN-2026-018', status: '已到仓', fbaId: 'FBA15Z8XYZ', po: 'PO-1001', fbaCode: 'SMF3', cbm: '1.180', lbs: '182.00', carton: '24.40×18.90×16.50' },
      { shipmentId: 'HK-2026-0402', moveType: 'FBA卡派', ref: 'CRN-2026-018', status: '已到仓', fbaId: 'FBA15Z8XYZ', po: 'PO-1002', fbaCode: 'SMF3', cbm: '0.990', lbs: '121.00', carton: '22.80×17.70×15.70' }
    ]
  },
  {
    pltNo: 'PLT-LAX-019', sysNo: 'SYS20260515019', container: 'COSU628190',
    customer: '华东跨境贸易', ref: 'CRN-2026-018', fba: 'FBA15Z8XYZ',
    destCode: 'ONT8', destType: 'FBA', pieces: 18, location: 'A-12-04', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', status: '已上架',
    mergeGroupId: 'mg-fba-ont8-2', palletScope: 'merge', bol: 'BOL-8849201', loadNo: 'LD-20260518-001',
    measure: null, reprintCount: 0, lastReprintAt: '',
    ticketCount: 1, ticketIds: ['TK-2026-0402'], reprintLogs: [],
    cargo: [
      { shipmentId: 'HK-2026-0410', moveType: 'FBA卡派', ref: 'CRN-2026-018', status: '已到仓', fbaId: 'FBA15Z8XYZ', po: 'PO-1003', fbaCode: 'ONT8', cbm: '1.420', lbs: '205.00', carton: '25.10×19.20×17.00' }
    ]
  },
  {
    pltNo: 'PLT-LAX-201', sysNo: 'SYS20260517201', container: 'TGHU7654321',
    customer: 'Sunrise Import Inc.', ref: 'CRN-770018', fba: '',
    destCode: 'SO-20260517-03', destType: '私卡派', pieces: 14, location: 'B-05-02', warehouseZone: 'B区存货区', warehouseName: 'LA1150', status: '待出库',
    mergeGroupId: 'mg-pvt-cross', palletScope: 'merge', bol: 'BOL-7723105', loadNo: '',
    measure: { l: 48, w: 40, h: 72, gw: 680 }, reprintCount: 0, lastReprintAt: '',
    ticketCount: 0, reprintLogs: [],
    cargo: [
      { shipmentId: 'HK-2026-0501', moveType: '私卡派', ref: 'CRN-770018', status: '待出库', fbaId: '—', po: '—', fbaCode: '—', cbm: '2.150', lbs: '680.00', carton: '48.00×40.00×72.00' }
    ]
  },
  {
    pltNo: 'PLT-LAX-202', sysNo: 'SYS20260517202', container: 'TGHU7654321',
    customer: 'Sunrise Import Inc.', ref: 'CRN-770018', fba: '',
    destCode: 'UPS', destType: '快递', pieces: 30, location: 'B-05-03', warehouseZone: 'B区存货区', warehouseName: 'LA1150', status: '已上架',
    mergeGroupId: null, palletScope: 'single', bol: '', loadNo: '',
    measure: null, reprintCount: 2, lastReprintAt: '2026-05-17 10:08', ticketCount: 0,
    reprintLogs: [
      { time: '2026-05-17 10:08', reason: '标签破损', operator: '小李', printer: 'PRN-LAX-02' },
      { time: '2026-05-16 15:40', reason: '打印失败', operator: '小李', printer: 'PRN-LAX-02' }
    ],
    cargo: [
      { shipmentId: 'HK-2026-0502', moveType: '快递', ref: 'CRN-770018', status: '已上架', fbaId: '—', po: '—', fbaCode: '—', cbm: '—', lbs: '—', carton: '—' }
    ]
  },
  {
    pltNo: 'PLT-LAX-109', sysNo: 'SYS20260510109', container: 'OOLU2468101',
    customer: 'ABC Trading Co.', ref: 'CRN-660092', fba: 'FBA66QTY',
    destCode: 'LGB8', destType: 'FBA', pieces: 8, location: 'A-09-01', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', status: '已上架',
    mergeGroupId: null, palletScope: 'single', bol: '', loadNo: '',
    measure: null, reprintCount: 0, lastReprintAt: '', ticketCount: 0, reprintLogs: [],
    cargo: [
      { shipmentId: 'HK-2026-0301', moveType: 'FBA卡派', ref: 'CRN-660092', status: '已上架', fbaId: 'FBA66QTY', po: 'PO-8801', fbaCode: 'LGB8', cbm: '0.880', lbs: '98.00', carton: '20.00×16.00×14.50' }
    ]
  },
  {
    pltNo: 'PLT-LAX-110', sysNo: 'SYS20260510110', container: 'OOLU2468101',
    customer: 'ABC Trading Co.', ref: 'CRN-660092', fba: '',
    destCode: 'SO-20260517-02', destType: '自提', pieces: 5, location: 'C-01-04', warehouseZone: 'C区暂存区', warehouseName: 'LA1150', status: '待出库',
    mergeGroupId: null, palletScope: 'single', bol: '', loadNo: '',
    measure: null, reprintCount: 0, lastReprintAt: '',
    ticketCount: 1, ticketIds: ['TK-2026-0388'], reprintLogs: [],
    cargo: [
      { shipmentId: 'HK-2026-0302', moveType: '自提', ref: 'CRN-660092', status: '待出库', fbaId: '—', po: '—', fbaCode: '—', cbm: '0.420', lbs: '55.00', carton: '18.00×14.00×12.00' }
    ]
  }
];
