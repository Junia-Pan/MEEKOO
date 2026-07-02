/**

 * 私仓 BOL 邮件模板（全局询价 / 预约两套，localStorage 演示持久化）

 */

(function (global) {

  var STORAGE_KEY = 'meekoo_loc_pw_email_templates';



  var DEFAULTS = {

    inquiry: {

      enabled: true,

      subject: '[询价] {BOL号} · {REF} · {客户}',

      body: 'Pickup contact: {PickupContact}\nPickup Address: {PickupAddress}\nDelivery contact & Company name: {DeliveryContact}\nDelivery address: {DeliveryAddress}\nReference No: {ReferenceNo}\nCarton: {Carton}\nPallet count: {PalletCount}\nDimension & Weight: {DimensionWeight}\nDelivery Instruction: {DeliveryInstruction}'

    },

    appointment: {

      enabled: true,

      subject: '[预约送仓] {BOL号} · {REF}',

      body: '您好，\n\n请协助预约以下货件送仓：\n\nBOL号：{BOL号}\nREF：{REF}\n客户：{客户}\n柜号：{柜号}\n板数：{板数} · 件数：{件数}\n预约要求：{预约要求}\n\n联系人：{联系人} {电话} {Email}\n\n谢谢！'

    }

  };



  var VARIABLE_GROUPS = {

    inquiry: {

      sendTime: [

        { key: 'DeliveryInstruction', tag: '{DeliveryInstruction}', label: 'Delivery Instruction', desc: '发信时多选（选填）' }

      ],

      auto: [

        { key: 'DeliveryContact', tag: '{DeliveryContact}', label: 'Delivery contact & Company', desc: '货件联系人 / 客户 / 电话' },

        { key: 'DeliveryAddress', tag: '{DeliveryAddress}', label: 'Delivery address', desc: '货件派送地址' },

        { key: 'ReferenceNo', tag: '{ReferenceNo}', label: 'Reference No', desc: '货件 Ref No' },

        { key: 'Carton', tag: '{Carton}', label: 'Carton', desc: '货件件数' },

        { key: 'PalletCount', tag: '{PalletCount}', label: 'Pallet count', desc: '货件板数' },

        { key: 'DimensionWeight', tag: '{DimensionWeight}', label: 'Dimension & Weight', desc: '货件尺寸重量' },

        { key: 'BOL号', tag: '{BOL号}', label: 'BOL 号', desc: '自动带入' },

        { key: 'REF', tag: '{REF}', label: 'REF', desc: '货件 Ref No' },

        { key: '客户', tag: '{客户}', label: '客户', desc: '自动带入' }

      ],

      fixed: []

    },

    appointment: {

      sendTime: [],

      auto: [

        { key: 'BOL号', tag: '{BOL号}', label: 'BOL 号', desc: '自动带入' },

        { key: 'REF', tag: '{REF}', label: 'REF', desc: '货件 Ref No' },

        { key: '客户', tag: '{客户}', label: '客户', desc: '自动带入' },

        { key: 'RefNo', tag: '{RefNo}', label: 'Ref No', desc: '自动带入' },

        { key: '柜号', tag: '{柜号}', label: '柜号', desc: '自动带入' },

        { key: '板数', tag: '{板数}', label: '板数', desc: '自动带入' },

        { key: '件数', tag: '{件数}', label: '件数', desc: '自动带入' },

        { key: '预约要求', tag: '{预约要求}', label: '预约要求', desc: '自动带入' },

        { key: '联系人', tag: '{联系人}', label: '联系人', desc: '自动带入' },

        { key: '电话', tag: '{电话}', label: '电话', desc: '自动带入' },

        { key: 'Email', tag: '{Email}', label: 'Email', desc: '自动带入' }

      ],

      fixed: []

    }

  };



  var VARIABLE_HINTS = (function () {

    var keys = [];

    Object.keys(VARIABLE_GROUPS).forEach(function (type) {

      ['sendTime', 'auto', 'fixed'].forEach(function (cat) {

        (VARIABLE_GROUPS[type][cat] || []).forEach(function (item) {

          if (keys.indexOf(item.tag) === -1) keys.push(item.tag);

        });

      });

    });

    return keys;

  })();



  var DEFAULT_PICKUP_CONTACT = 'Meekoo Group Inc  626-242-3347';

  var DEFAULT_PICKUP_ADDRESS = '1495 E Locust St. Ontario, CA 91761';



  function formatDeliveryAddress(ship) {

    var parts = [];

    if (ship.address) parts.push(ship.address);

    var cityLine = [ship.city, ship.state, ship.zipCode].filter(Boolean).join(', ');

    if (cityLine) parts.push(cityLine);

    return parts.length ? parts.join(', ') : '—';

  }



  function formatDeliveryContact(ship) {

    var parts = [];

    if (ship.contact) parts.push(ship.contact);

    if (ship.customer) parts.push(ship.customer);

    var line = parts.join(' / ');

    if (ship.phone) line = line ? line + ' ' + ship.phone : ship.phone;

    return line || '—';

  }



  function parsePlaceholders(text) {

    var out = [];

    var re = /\{([^}]+)\}/g;

    var m;

    while ((m = re.exec(String(text || ''))) !== null) {

      if (out.indexOf(m[1]) === -1) out.push(m[1]);

    }

    return out;

  }



  function getTemplateText(type) {

    var tpl = getTemplate(type);

    return (tpl.subject || '') + '\n' + (tpl.body || '');

  }



  function getTemplatePlaceholders(type) {

    return parsePlaceholders(getTemplateText(type));

  }



  function hasPlaceholder(type, key) {

    return getTemplateText(type).indexOf('{' + key + '}') !== -1;

  }



  function getVariableGroups(type) {

    return VARIABLE_GROUPS[type] || { sendTime: [], auto: [], fixed: [] };

  }



  function getSendTimeFieldSummary(type) {

    var placeholders = getTemplatePlaceholders(type);

    var groups = getVariableGroups(type);

    var labels = (groups.sendTime || []).filter(function (item) {

      return placeholders.indexOf(item.key) !== -1;

    }).map(function (item) { return item.label; });

    return labels.length ? labels.join(' · ') : '—';

  }



  function loadAll() {

    try {

      var raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) return null;

      return JSON.parse(raw);

    } catch (_) {

      return null;

    }

  }



  function saveAll(data) {

    try {

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    } catch (_) {}

  }



  function getTemplate(type) {

    var all = loadAll() || {};

    var base = DEFAULTS[type] || { subject: '', body: '', enabled: true };

    var saved = all[type] || {};

    return {

      enabled: saved.enabled != null ? saved.enabled : base.enabled,

      subject: saved.subject != null ? saved.subject : base.subject,

      body: saved.body != null ? saved.body : base.body,

      updatedAt: saved.updatedAt || null,

      updatedBy: saved.updatedBy || null

    };

  }



  function saveTemplate(type, payload) {

    var all = loadAll() || {};

    all[type] = {

      enabled: !!payload.enabled,

      subject: String(payload.subject || ''),

      body: String(payload.body || ''),

      updatedAt: new Date().toISOString(),

      updatedBy: String(payload.updatedBy || '管理员')

    };

    saveAll(all);

  }



  function resetTemplate(type) {

    var all = loadAll() || {};

    delete all[type];

    saveAll(all);

  }



  function fillTemplate(text, vars) {

    var out = String(text == null ? '' : text);

    Object.keys(vars || {}).forEach(function (key) {

      var val = vars[key] == null ? '' : String(vars[key]);

      out = out.split('{' + key + '}').join(val);

    });

    return out;

  }



  function buildVars(bol, ship, extra) {

    ship = ship || {};

    extra = extra || {};

    var refNo = ship.refNo || ship.shipmentId || '—';

    return {

      'BOL号': bol || '—',

      'REF': refNo,

      '货件ID': refNo,

      '客户': ship.customer || '—',

      'RefNo': ship.refNo || '—',

      '柜号': ship.container || '—',

      '板数': ship.actPlts != null ? ship.actPlts : '—',

      '预估板数': ship.estPlts != null ? ship.estPlts : '—',

      '实际板数': ship.actPlts != null ? ship.actPlts : '—',

      '件数': ship.actCtns != null ? ship.actCtns : (ship.ctns != null ? ship.ctns : '—'),

      '预报件数': ship.estCtns != null ? ship.estCtns : (ship.actCtns != null ? ship.actCtns : (ship.ctns != null ? ship.ctns : '—')),

      '实收件数': ship.actCtns != null ? ship.actCtns : (ship.ctns != null ? ship.ctns : '—'),

      'Address': ship.address || '—',

      'City': ship.city || '—',

      'State': ship.state || '—',

      'ZipCode': ship.zipCode || '—',

      '里程': ship.miles != null ? ship.miles : '—',

      '联系人': ship.contact || '—',

      '电话': ship.phone || '—',

      'Email': ship.email || '—',

      '目的仓': extra.destWarehouse || ship.destWarehouse || '—',

      '预约要求': ship.apptRequirement || '—',

      '预约送仓时段': extra.apptSlot || '—',

      '供应商': extra.vendors || '—',

      'PickupContact': extra.pickupContact || DEFAULT_PICKUP_CONTACT,

      'PickupAddress': extra.pickupAddress || DEFAULT_PICKUP_ADDRESS,

      'DeliveryContact': extra.deliveryContact || formatDeliveryContact(ship),

      'DeliveryAddress': extra.deliveryAddress || formatDeliveryAddress(ship),

      'ReferenceNo': ship.refNo || '—',

      'Carton': ship.actCtns != null ? ship.actCtns : (ship.ctns != null ? ship.ctns : '—'),

      'PalletCount': ship.actPlts != null ? ship.actPlts : '—',

      'DimensionWeight': (typeof locPwFormatShipmentDimensionWeight === 'function'
        ? locPwFormatShipmentDimensionWeight(ship)
        : null) || ship.dimensionWeight || extra.dimensionWeight || '—',

      'DeliveryInstruction': extra.deliveryInstruction || '—'

    };

  }



  function resetTemplates() {

    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}

  }



  global.locPwEmailTplGet = getTemplate;

  global.locPwEmailTplSave = saveTemplate;

  global.locPwEmailTplFill = fillTemplate;

  global.locPwEmailTplBuildVars = buildVars;

  global.locPwEmailTplReset = resetTemplates;

  global.locPwEmailTplResetOne = resetTemplate;

  global.locPwEmailTplDefaults = DEFAULTS;

  global.locPwEmailTplVariableHints = VARIABLE_HINTS;

  global.locPwEmailTplVariableGroups = VARIABLE_GROUPS;

  global.locPwEmailTplGetVariableGroups = getVariableGroups;

  global.locPwEmailTplParsePlaceholders = parsePlaceholders;

  global.locPwEmailTplGetPlaceholders = getTemplatePlaceholders;

  global.locPwEmailTplHasPlaceholder = hasPlaceholder;

  global.locPwEmailTplGetSendTimeSummary = getSendTimeFieldSummary;

  global.locPwEmailTplDefaultPickupAddress = DEFAULT_PICKUP_ADDRESS;

})(typeof window !== 'undefined' ? window : globalThis);


