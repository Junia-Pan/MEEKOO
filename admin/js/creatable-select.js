/**
 * 可搜索、可新增的下拉（实际承运卡司等）
 * 用法：页面放置 .mk-cs[data-mk-cs-for="inputId"]，hidden#inputId 存值；调用 MeekooCreatableSelect.bind()
 */
(function (global) {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  var DEFAULT_ACTUAL_CARRIERS = [
    'MEEKOO Truck', 'West Trucking', 'Fast Line', 'XPO Freight',
    'FedEx Freight', 'Sky Truck', 'Coastal Freight', 'Desert Line', 'Ontario Haul'
  ];

  var stores = {
    actualCarrier: DEFAULT_ACTUAL_CARRIERS.slice()
  };

  function normalizeValue(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s || s === '-' || s === '—') return '';
    return s;
  }

  function getStoreKey(root) {
    return (root && root.getAttribute('data-mk-cs-store')) || 'actualCarrier';
  }

  function getPlaceholder(root) {
    return (root && root.getAttribute('data-mk-cs-placeholder')) || '请选择实际承运卡司';
  }

  function ensureStore(key) {
    if (!stores[key]) stores[key] = [];
    return stores[key];
  }

  function findOption(storeKey, name) {
    var raw = normalizeValue(name);
    if (!raw) return null;
    var list = ensureStore(storeKey);
    var lower = raw.toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i]).toLowerCase() === lower) return list[i];
    }
    return null;
  }

  function addOption(storeKey, name) {
    var raw = normalizeValue(name);
    if (!raw) return '';
    var existing = findOption(storeKey, raw);
    if (existing) return existing;
    var list = ensureStore(storeKey);
    list.push(raw);
    list.sort(function (a, b) {
      return String(a).localeCompare(String(b), 'en', { sensitivity: 'base' });
    });
    return raw;
  }

  function rootForInput(inputId) {
    return document.querySelector('.mk-cs[data-mk-cs-for="' + inputId + '"]');
  }

  function sync(inputId) {
    var root = rootForInput(inputId);
    var hidden = document.getElementById(inputId);
    if (!root || !hidden) return;
    var textEl = root.querySelector('.mk-cs-text');
    if (!textEl) return;
    var val = normalizeValue(hidden.value);
    if (val) {
      textEl.textContent = val;
      textEl.classList.remove('is-placeholder');
    } else {
      textEl.textContent = getPlaceholder(root);
      textEl.classList.add('is-placeholder');
    }
  }

  function setValue(inputId, value) {
    var hidden = document.getElementById(inputId);
    if (!hidden) return;
    var root = rootForInput(inputId);
    var storeKey = getStoreKey(root);
    var raw = normalizeValue(value);
    if (raw) raw = addOption(storeKey, raw);
    hidden.value = raw;
    sync(inputId);
  }

  function getValue(inputId) {
    var hidden = document.getElementById(inputId);
    return hidden ? normalizeValue(hidden.value) : '';
  }

  function closeAll(exceptRoot) {
    document.querySelectorAll('.mk-cs').forEach(function (root) {
      if (exceptRoot && root === exceptRoot) return;
      var panel = root.querySelector('.mk-cs-panel');
      var trigger = root.querySelector('.mk-cs-trigger');
      if (panel) panel.classList.add('is-hidden');
      if (trigger) trigger.classList.remove('is-open');
    });
  }

  function renderOptions(root, query) {
    var listEl = root.querySelector('.mk-cs-list');
    if (!listEl) return;
    var storeKey = getStoreKey(root);
    var list = ensureStore(storeKey);
    var q = String(query || '').trim();
    var qLower = q.toLowerCase();
    var matched = list.filter(function (name) {
      return !qLower || String(name).toLowerCase().indexOf(qLower) !== -1;
    });
    var html = matched.map(function (name) {
      return '<li class="mk-cs-option" role="option" data-value="' + esc(name) + '">' + esc(name) + '</li>';
    }).join('');
    var exact = findOption(storeKey, q);
    if (q && !exact) {
      html += '<li class="mk-cs-option is-create" role="option" data-create="1" data-value="' + esc(q) + '">＋ 新增「' + esc(q) + '」</li>';
    }
    if (!html) {
      html = '<li class="mk-cs-empty">输入名称后可直接新增</li>';
    }
    listEl.innerHTML = html;
  }

  function openPanel(root) {
    if (!root) return;
    var trigger = root.querySelector('.mk-cs-trigger');
    if (trigger && trigger.disabled) return;
    closeAll(root);
    var panel = root.querySelector('.mk-cs-panel');
    var search = root.querySelector('.mk-cs-search');
    if (!panel) return;
    panel.classList.remove('is-hidden');
    if (trigger) trigger.classList.add('is-open');
    if (search) {
      search.value = '';
      renderOptions(root, '');
      setTimeout(function () { search.focus(); }, 0);
    } else {
      renderOptions(root, '');
    }
  }

  function bind() {
    if (document.documentElement.getAttribute('data-mk-cs-bound') === '1') {
      document.querySelectorAll('.mk-cs[data-mk-cs-for]').forEach(function (root) {
        sync(root.getAttribute('data-mk-cs-for'));
      });
      return;
    }
    document.documentElement.setAttribute('data-mk-cs-bound', '1');

    document.addEventListener('click', function (e) {
      var root = e.target && e.target.closest ? e.target.closest('.mk-cs') : null;
      if (!root) {
        closeAll();
        return;
      }
      var trigger = e.target.closest('.mk-cs-trigger');
      if (trigger && root.contains(trigger)) {
        e.preventDefault();
        if (trigger.disabled) return;
        var panel = root.querySelector('.mk-cs-panel');
        if (panel && panel.classList.contains('is-hidden')) openPanel(root);
        else closeAll();
        return;
      }
      var opt = e.target.closest('.mk-cs-option');
      if (opt && root.contains(opt) && opt.getAttribute('data-value')) {
        e.preventDefault();
        var inputId = root.getAttribute('data-mk-cs-for');
        var storeKey = getStoreKey(root);
        var val = opt.getAttribute('data-value') || '';
        if (opt.getAttribute('data-create') === '1') {
          val = addOption(storeKey, val);
          if (typeof showToast === 'function') showToast('已新增：' + val, 'success');
        }
        setValue(inputId, val);
        closeAll();
      }
    });

    document.addEventListener('input', function (e) {
      var search = e.target && e.target.classList && e.target.classList.contains('mk-cs-search') ? e.target : null;
      if (!search) return;
      var root = search.closest('.mk-cs');
      if (!root) return;
      renderOptions(root, search.value);
    });

    document.addEventListener('keydown', function (e) {
      var search = e.target && e.target.classList && e.target.classList.contains('mk-cs-search') ? e.target : null;
      if (!search) return;
      var root = search.closest('.mk-cs');
      if (!root) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAll();
        return;
      }
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var q = String(search.value || '').trim();
      if (!q) return;
      var storeKey = getStoreKey(root);
      var inputId = root.getAttribute('data-mk-cs-for');
      var exact = findOption(storeKey, q);
      if (exact) {
        setValue(inputId, exact);
      } else {
        var created = addOption(storeKey, q);
        setValue(inputId, created);
        if (typeof showToast === 'function') showToast('已新增：' + created, 'success');
      }
      closeAll();
    });

    document.querySelectorAll('.mk-cs[data-mk-cs-for]').forEach(function (root) {
      sync(root.getAttribute('data-mk-cs-for'));
    });
  }

  function boot() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bind);
    } else {
      bind();
    }
  }

  global.MeekooCreatableSelect = {
    setValue: setValue,
    getValue: getValue,
    sync: sync,
    bind: bind,
    addOption: addOption,
    findOption: findOption,
    normalizeValue: normalizeValue
  };

  boot();
})(typeof window !== 'undefined' ? window : this);
