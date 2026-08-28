/**
 * 自提预约数据：管理列表回显、改约标色、预约文件弹窗与下载次数
 */
(function () {
  var C = window.SpPickupCore;
  if (!C) return;

  var COL_APPT_TIME = 16;
  var COL_APPT_REMARK = 21;
  var COL_APPT_FILES = 22;
  var SP_APPT_STORE_KEY = 'meekoo_sp_appt_by_zt_v2';
  var SP_APPT_SEED_KEY = 'meekoo_sp_appt_seeded_v2';

  function esc(s) {
    return C.esc(s);
  }

  function spReadApptStore() {
    try {
      var raw = localStorage.getItem(SP_APPT_STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function spWriteApptStore(store) {
    try {
      localStorage.setItem(SP_APPT_STORE_KEY, JSON.stringify(store || {}));
    } catch (e) {}
  }

  function spGetAppt(zt) {
    var store = spReadApptStore();
    return store[zt] ? Object.assign({}, store[zt]) : null;
  }

  function spSaveAppt(zt, data) {
    if (!zt) return;
    var store = spReadApptStore();
    store[zt] = Object.assign({}, store[zt] || {}, data, { zt: zt });
    spWriteApptStore(store);
  }

  function spFindZtByPickCode(code) {
    var c = C.normalizePickCode(code);
    if (!c) return '';
    if (window.SpPickupBookData && SpPickupBookData.resolveZt) {
      var zt = SpPickupBookData.resolveZt(c);
      if (zt) return zt;
    }
    var tr = null;
    document.querySelectorAll('tr[data-sp-zt]').forEach(function (row) {
      if (tr) return;
      var cell = row.cells[3];
      if (!cell) return;
      var el = cell.querySelector('.sp-pick-code');
      var txt = el ? el.textContent.trim() : cell.textContent.trim();
      if (C.normalizePickCode(txt) === c) tr = row;
    });
    return tr ? tr.getAttribute('data-sp-zt') || '' : '';
  }

  function spFormatSlotLabel(slotVal) {
    if (!slotVal) return '';
    var m = String(slotVal).match(/^(\d{2})(\d{2})-(\d{2})(\d{2})$/);
    if (!m) return String(slotVal);
    return m[1] + ':' + m[2] + '-' + m[3] + ':' + m[4];
  }

  function spFormatApptTimeDisplay(appt) {
    if (!appt) return '—';
    var d = String(appt.date || '').trim();
    var slot = spFormatSlotLabel(appt.slot);
    if (d && slot) return d + ' ' + slot;
    if (appt.apptTime) return appt.apptTime;
    return d || '—';
  }

  function spUniqueFields(arr) {
    var out = [];
    (arr || []).forEach(function (f) {
      if (f && out.indexOf(f) < 0) out.push(f);
    });
    return out;
  }

  function spFilesSignature(files) {
    return (files || []).map(function (f) {
      return (f && f.name ? f.name : '') + ':' + (f.downloadCount || 0);
    }).join('|');
  }

  function spSeedApptDemo() {
    if (localStorage.getItem(SP_APPT_SEED_KEY) === '1') return;
    spSaveAppt('ZT2604200001', {
      pickCode: 'SP88A00Q',
      date: '2026-04-22',
      slot: '1000-1010',
      apptTime: '2026-04-22 10:00-10:10',
      remark: '三方 LTL 下午到仓，请预留月台',
      method: 'ltl',
      ltlCo: 'XPO',
      files: [
        { name: 'bol-0406-ltl.pdf', downloadCount: 1 },
        { name: 'dock-pass-0406.pdf', downloadCount: 0 }
      ],
      modifiedFields: ['apptTime', 'remark'],
      bookedOnce: true
    });
    spSaveAppt('ZT2604260004', {
      pickCode: 'SP88C92A',
      date: '2026-04-26',
      slot: '0900-0910',
      apptTime: '2026-04-26 09:00-09:10',
      remark: '上午提货，请提前备货',
      method: 'self',
      files: [{ name: 'appt-0402.pdf', downloadCount: 2 }],
      modifiedFields: [],
      bookedOnce: true
    });
    spSaveAppt('ZT2604250001', {
      pickCode: 'SP88E93C',
      date: '2026-04-25',
      slot: '1400-1410',
      apptTime: '2026-04-25 14:00-14:10',
      remark: '已全部提完',
      method: 'self',
      files: [{ name: 'bol-done.pdf', downloadCount: 5 }],
      modifiedFields: ['apptTime'],
      bookedOnce: true
    });
    localStorage.setItem(SP_APPT_SEED_KEY, '1');
  }

  function spShouldHighlightRow(tr) {
    var st = C.getRowStatus(tr);
    if (st === '已提货') return false;
    var zt = tr.getAttribute('data-sp-zt');
    var appt = spGetAppt(zt);
    return !!(appt && appt.modifiedFields && appt.modifiedFields.length);
  }

  function spApplyModifiedRowClass(tr, highlight) {
    if (!tr) return;
    tr.classList.toggle('sp-appt-row--modified', !!highlight);
  }

  function spBuildApptFileCellHtml(zt, appt) {
    var files = (appt && appt.files) ? appt.files : [];
    if (!files.length) return '—';
    var ztJs = String(zt || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return '<a class="td-link sp-list-file-link" href="#" title="查看客户预约文件" onclick="spOpenApptFiles(\'' + ztJs + '\');return false;">预约文件(' + files.length + ')</a>';
  }

  function spSyncApptRow(tr) {
    if (!tr || !tr.getAttribute('data-sp-zt')) return;
    if (tr.classList.contains('loc-pw-tr-merge-child')) return;
    var zt = tr.getAttribute('data-sp-zt');
    var appt = spGetAppt(zt);
    if (C.getRowStatus(tr) === '已提货' && appt && appt.modifiedFields && appt.modifiedFields.length) {
      spSaveAppt(zt, { modifiedFields: [] });
      appt = spGetAppt(zt);
    }

    var timeCell = tr.cells[COL_APPT_TIME];
    if (timeCell) {
      timeCell.textContent = appt ? spFormatApptTimeDisplay(appt) : (timeCell.textContent.trim() || '—');
    }

    var remarkCell = tr.cells[COL_APPT_REMARK];
    if (remarkCell) {
      var remark = appt && appt.remark ? String(appt.remark).trim() : '';
      if (remark) {
        var short = remark.length > 36 ? remark.slice(0, 36) + '…' : remark;
        remarkCell.innerHTML = '<span class="sp-appt-remark-text" title="' + esc(remark) + '">' + esc(short) + '</span>';
      } else {
        remarkCell.textContent = '—';
      }
    }

    var fileCell = tr.cells[COL_APPT_FILES];
    if (fileCell) {
      fileCell.classList.add('sp-appt-files-cell');
      fileCell.innerHTML = spBuildApptFileCellHtml(zt, appt);
    }

    spApplyModifiedRowClass(tr, spShouldHighlightRow(tr));
  }

  function spInitApptDisplay() {
    spSeedApptDemo();
    document.querySelectorAll('tr[data-sp-zt]').forEach(spSyncApptRow);
  }

  function spClearApptBooking(zt, keepPickCode) {
    var prev = spGetAppt(zt) || {};
    spSaveAppt(zt, {
      pickCode: keepPickCode || prev.pickCode || '',
      date: '',
      slot: '',
      apptTime: '—',
      remark: '',
      method: 'self',
      ltlCo: '',
      files: [],
      modifiedFields: [],
      bookedOnce: false
    });
    var tr = C.findRow(zt);
    if (tr) spSyncApptRow(tr);
  }

  /**
   * 预约页提交后写入管理列表
   * @param {string} zt
   * @param {object} payload
   */
  function spApplyBookingFromClient(zt, payload) {
    payload = payload || {};
    var prev = spGetAppt(zt) || {};
    var isEdit = !!prev.bookedOnce;
    var modifiedFields = isEdit ? (prev.modifiedFields || []).slice() : [];
    var apptTime = spFormatApptTimeDisplay({ date: payload.date, slot: payload.slot });

    if (isEdit) {
      var prevTime = spFormatApptTimeDisplay(prev);
      if (prevTime !== apptTime && modifiedFields.indexOf('apptTime') < 0) modifiedFields.push('apptTime');
      var prevRemark = String(prev.remark || '').trim();
      var newRemark = String(payload.remark || '').trim();
      if (prevRemark !== newRemark && modifiedFields.indexOf('remark') < 0) modifiedFields.push('remark');
      if (spFilesSignature(prev.files) !== spFilesSignature(payload.files) && modifiedFields.indexOf('files') < 0) {
        modifiedFields.push('files');
      }
    }

    var files = (payload.files || []).map(function (f) {
      var old = (prev.files || []).find(function (x) { return x.name === f.name; });
      return {
        name: f.name,
        downloadCount: old ? (old.downloadCount || 0) : 0
      };
    });

    spSaveAppt(zt, {
      pickCode: payload.pickCode || prev.pickCode || '',
      date: payload.date || '',
      slot: payload.slot || '',
      apptTime: apptTime,
      remark: payload.remark || '',
      method: payload.method || 'self',
      ltlCo: payload.ltlCo || '',
      files: files,
      modifiedFields: spUniqueFields(modifiedFields),
      bookedOnce: true
    });

    var tr = C.findRow(zt);
    if (tr) {
      var timeCell = tr.cells[COL_APPT_TIME];
      if (timeCell) timeCell.textContent = apptTime;
      if (payload.pickCode && tr.cells[3]) {
        tr.cells[3].innerHTML = '<span class="sp-pick-code">' + esc(payload.pickCode) + '</span>';
      }
      spSyncApptRow(tr);
    }
  }

  var SP_APPT_FILE_CTX = { zt: '', files: [] };

  function spEnsureApptFilesModal() {
    if (document.getElementById('modal-sp-appt-files')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div id="modal-sp-appt-files" class="modal-overlay" onclick="closeModalOutside(event,\'modal-sp-appt-files\')">' +
      '<div class="modal" style="width:560px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;">' +
      '<div class="modal-header"><span class="modal-title" id="sp-appt-files-title">客户预约文件</span>' +
      '<button class="modal-close" type="button" onclick="closeModal(\'modal-sp-appt-files\')">✕</button></div>' +
      '<div class="modal-body" style="overflow-y:auto;">' +
      '<div class="sp-appt-files-summary" id="sp-appt-files-summary"></div>' +
      '<div class="sp-appt-files-list" id="sp-appt-files-body"></div></div>' +
      '<div class="modal-footer">' +
      '<button class="btn btn-default" type="button" onclick="closeModal(\'modal-sp-appt-files\')">关闭</button>' +
      '</div></div></div>';
    document.body.appendChild(wrap.firstChild);
  }

  window.spOpenApptFiles = function (zt) {
    zt = String(zt || '').trim();
    if (!zt) return;
    spEnsureApptFilesModal();
    var appt = spGetAppt(zt) || {};
    var files = (appt.files || []).slice();
    SP_APPT_FILE_CTX = { zt: zt, files: files };
    var title = document.getElementById('sp-appt-files-title');
    var sum = document.getElementById('sp-appt-files-summary');
    var body = document.getElementById('sp-appt-files-body');
    if (title) title.textContent = '客户预约文件 · ' + zt;
    if (sum) {
      sum.innerHTML = files.length
        ? '共 <strong>' + files.length + '</strong> 个文件'
        : '';
      sum.style.display = files.length ? '' : 'none';
    }
    if (body) {
      if (!files.length) {
        body.innerHTML = '<div class="sp-appt-files-empty">暂无客户预约文件</div>';
      } else {
        body.innerHTML = files.map(function (f, idx) {
          var dl = f.downloadCount || 0;
          return '<div class="sp-appt-files-item">' +
            '<span class="sp-appt-files-ico" aria-hidden="true">📄</span>' +
            '<span class="sp-appt-files-name" title="' + esc(f.name) + '">' + esc(f.name) + '</span>' +
            '<span class="sp-appt-files-dl-count">已下载 ' + dl + ' 次</span>' +
            '<a class="td-link" href="#" onclick="spDownloadApptFile(' + idx + ');return false;">下载</a>' +
            '</div>';
        }).join('');
      }
    }
    showModal('modal-sp-appt-files');
  };

  window.spDownloadApptFile = function (idx) {
    var zt = SP_APPT_FILE_CTX.zt;
    var appt = spGetAppt(zt);
    if (!appt || !appt.files || !appt.files[idx]) return;
    appt.files[idx].downloadCount = (appt.files[idx].downloadCount || 0) + 1;
    spSaveAppt(zt, { files: appt.files });
    showToast('下载 ' + appt.files[idx].name + '（演示）', 'success');
    spOpenApptFiles(zt);
    var tr = C.findRow(zt);
    if (tr) spSyncApptRow(tr);
  };

  window.SpPickupAppt = {
    COL_APPT_TIME: COL_APPT_TIME,
    COL_APPT_REMARK: COL_APPT_REMARK,
    COL_APPT_FILES: COL_APPT_FILES,
    getAppt: spGetAppt,
    saveAppt: spSaveAppt,
    findZtByPickCode: spFindZtByPickCode,
    formatApptTimeDisplay: spFormatApptTimeDisplay,
    formatSlotLabel: spFormatSlotLabel,
    applyBookingFromClient: spApplyBookingFromClient,
    clearApptBooking: spClearApptBooking,
    syncApptRow: spSyncApptRow,
    initApptDisplay: spInitApptDisplay
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (document.querySelector('tr[data-sp-zt]')) spInitApptDisplay();
    });
  } else if (document.querySelector('tr[data-sp-zt]')) {
    spInitApptDisplay();
  }
})();
