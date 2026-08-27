/**
 * 本地 / 外州私仓发货列表：按状态渲染行操作、状态流转（演示）
 */
(function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function locPwJsQuote(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function locPwFindRow(bol) {
    return document.querySelector('tr[data-loc-pw-bol="' + bol.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
  }

  /** 演示 BOL：BOLO + yymmdd + 4 位流水；拆分后缀由调用方加 -1/-2 */
  function locPwMakeDemoBol(seq4) {
    var d = new Date();
    var yy = String(d.getFullYear()).slice(-2);
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    var seq = String(seq4 == null ? '1' : seq4).replace(/\D/g, '');
    if (!seq) seq = '1';
    seq = seq.slice(-4).padStart(4, '0');
    return 'BOLO' + yy + mm + dd + seq;
  }

  function locPwGetRowStatus(tr) {
    var badge = tr.querySelector('.status-badge');
    return badge ? badge.textContent.trim() : '';
  }

  function locPwGetShipMode(tr) {
    if (tr.querySelector('.loc-pw-ship-mode--split')) return 'split';
    if (tr.querySelector('.loc-pw-ship-mode--merge')) return 'merge';
    return 'normal';
  }

  /** 合并打板：货件属性标识，不等于发货模式「合并发货」 */
  function locPwIsMergePallet(tr) {
    return !!(tr && tr.getAttribute('data-loc-pw-merge-pallet') === '1');
  }

  /** 合并发货子行：仅可查看 / 下载 BOL / 发邮件，不可改状态 */
  function locPwIsMergeChild(tr) {
    return !!(tr && tr.classList.contains('loc-pw-tr-merge-child'));
  }

  function locPwRejectMergeChildAction(tr, actionLabel) {
    if (!locPwIsMergeChild(tr)) return false;
    showToast('合并发货子 BOL 不可' + (actionLabel || '执行此操作') + '，请在父单操作', 'warning');
    return true;
  }

  function locPwGetShipOriginBol(ship) {
    if (!ship) return '';
    return String(ship.originBol || '').trim();
  }

  /** 货件标题旁：合并发货时展示原 BOL（合板组号不在此展示） */
  function locPwShipHeaderMetaHtml(ship, currentBol) {
    var originBol = locPwGetShipOriginBol(ship);
    currentBol = String(currentBol || '').trim();
    if (!originBol || originBol === currentBol) return '';
    return '<span class="loc-pw-ship-header-meta">' +
      '<span class="loc-pw-origin-bol-tag" title="合并发货前的原 BOL">原 BOL ' + esc(originBol) + '</span>' +
      '</span>';
  }

  /** 演示：退仓发起前状态（撤销退仓时恢复） */
  var LOC_PW_RETURN_FROM = {};

  function locPwGetDepartVoucherFiles(bol) {
    var ms = locPwGetBolMilestones(bol);
    return (ms.departed && ms.departed.departVoucherFiles) ? ms.departed.departVoucherFiles : [];
  }

  function locPwCloneDepartVoucherFiles(files) {
    return (files || []).map(function (f) {
      return {
        name: (f && f.name) ? f.name : String(f),
        remark: (f && f.remark) ? f.remark : '',
        at: (f && f.at) ? f.at : '',
        by: (f && f.by) ? f.by : '',
        size: (f && f.size != null) ? f.size : null
      };
    });
  }

  function locPwFormatFileSize(bytes) {
    var n = Number(bytes);
    if (!isFinite(n) || n < 0) return '';
    if (n < 1024) return Math.round(n) + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10 * 1024 ? 1 : 0) + ' KB';
    return (n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0) + ' MB';
  }

  function locPwBuildDepartVoucherMetaText(f, opts) {
    opts = opts || {};
    var sizeText = locPwFormatFileSize(f && f.size);
    if (opts.pending) return sizeText || '—';
    var parts = [];
    if (f && f.by) parts.push(f.by);
    if (f && f.at) parts.push(f.at);
    if (sizeText) parts.push(sizeText);
    return parts.length ? parts.join(' · ') : '—';
  }

  function locPwPersistDepartVoucherKept(bol) {
    bol = bol || LOC_PW_DEPART_VOUCHER_DRAFT.bol;
    if (!bol) return;
    var kept = (LOC_PW_DEPART_VOUCHER_DRAFT.kept || []).map(function (f) {
      return { name: f.name, remark: f.remark || '', at: f.at || '', by: f.by || '', size: f.size != null ? f.size : null };
    });
    locPwSetDepartVoucherFiles(bol, kept);
    var tr = locPwFindRow(bol);
    if (tr) locPwSyncRowAttachFileCells(tr);
    var detailBol = ((document.getElementById('loc-pw-bol-detail-bol') || {}).value || '').trim();
    if (detailBol === bol) locPwRenderBolDetail(bol);
  }

  function locPwSetDepartVoucherFiles(bol, files) {
    var ms = locPwGetBolMilestones(bol);
    var base = ms.departed ? Object.assign({}, ms.departed) : { at: locPwFormatNow(), by: '演示用户' };
    base.departVoucherFiles = files;
    locPwSaveBolMilestone(bol, 'departed', base);
  }

  function locPwSetFileDropName(nameElId, files) {
    var el = document.getElementById(nameElId);
    if (!el) return;
    var list = files && files.length ? Array.prototype.slice.call(files) : [];
    if (!list.length) {
      el.style.display = 'none';
      el.textContent = '';
      return;
    }
    el.style.display = '';
    el.textContent = list.length === 1
      ? ('已选：' + list[0].name)
      : ('已选 ' + list.length + ' 个文件：' + list.map(function (f) { return f.name; }).join('、'));
  }

  function locPwAssignFilesToInput(input, files) {
    if (!input) return;
    var list = Array.prototype.slice.call(files || []).filter(Boolean);
    if (!input.multiple && list.length > 1) list = [list[0]];
    try {
      var dt = new DataTransfer();
      list.forEach(function (f) { dt.items.add(f); });
      input.files = dt.files;
    } catch (e) {
      /* DataTransfer 不可用时仍尽量走 change（部分浏览器仅支持点选） */
    }
    if (typeof input.onchange === 'function') input.onchange();
    else input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function locPwBindFileDrop(dropId, inputId, opts) {
    opts = opts || {};
    var drop = document.getElementById(dropId);
    var input = document.getElementById(inputId);
    if (!drop || !input || drop.dataset.bound === '1') return;
    drop.dataset.bound = '1';
    drop.addEventListener('click', function (e) {
      if (e.target === input) return;
      input.click();
    });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        input.click();
      }
    });
    input.addEventListener('change', function () {
      if (opts.nameElId) locPwSetFileDropName(opts.nameElId, input.files);
      if (typeof opts.onChange === 'function') opts.onChange(input);
    });
    ['dragenter', 'dragover'].forEach(function (evt) {
      drop.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        drop.classList.add('is-drag');
      });
    });
    drop.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!drop.contains(e.relatedTarget)) drop.classList.remove('is-drag');
    });
    drop.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      drop.classList.remove('is-drag');
      var files = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : null;
      if (!files || !files.length) return;
      locPwAssignFilesToInput(input, files);
    });
  }

  function locPwInitFileDrops() {
    locPwBindFileDrop('loc-pw-outbound-doc-drop', 'loc-pw-outbound-doc-file', {
      onChange: function () { locPwOnDepartVoucherFilePick(); }
    });
    locPwBindFileDrop('loc-pw-departed-voucher-drop', 'loc-pw-departed-voucher-file', {
      nameElId: 'loc-pw-departed-voucher-name'
    });
    locPwBindFileDrop('loc-pw-upload-pod-drop', 'loc-pw-upload-pod-file', {
      nameElId: 'loc-pw-upload-pod-name'
    });
    locPwBindFileDrop('loc-pw-edit-voucher-drop', 'loc-pw-edit-voucher-file', {
      nameElId: 'loc-pw-edit-voucher-name'
    });
    locPwBindFileDrop('loc-pw-return-voucher-drop', 'loc-pw-return-voucher', {
      nameElId: 'loc-pw-return-voucher-name'
    });
  }

  function locPwClearFileInput(inputId, nameElId) {
    var fi = document.getElementById(inputId);
    if (fi) fi.value = '';
    if (nameElId) locPwSetFileDropName(nameElId, null);
  }

  /** 运输中修改发车凭证：弹窗内草稿（已有 + 待保存新文件） */
  var LOC_PW_DEPART_VOUCHER_DRAFT = { bol: '', kept: [], pending: [] };
  var LOC_PW_FILE_PREVIEW_URL = '';

  function locPwRevokeFilePreviewUrl() {
    if (!LOC_PW_FILE_PREVIEW_URL) return;
    try { URL.revokeObjectURL(LOC_PW_FILE_PREVIEW_URL); } catch (e) { /* ignore */ }
    LOC_PW_FILE_PREVIEW_URL = '';
  }

  function locPwGetFilePreviewKind(name) {
    var n = String(name || '').toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|bmp)$/.test(n)) return 'image';
    if (/\.pdf$/.test(n)) return 'pdf';
    return 'other';
  }

  function locPwCanPreviewFileName(name) {
    var kind = locPwGetFilePreviewKind(name);
    return kind === 'image' || kind === 'pdf';
  }

  function locPwBuildDemoImagePreviewDataUrl(name) {
    var text = String(name || '发车凭证');
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">' +
      '<rect width="100%" height="100%" fill="#F1F5F9"/>' +
      '<rect x="80" y="60" width="800" height="600" rx="12" fill="#fff" stroke="#CBD5E1"/>' +
      '<text x="480" y="340" text-anchor="middle" font-size="28" fill="#64748B" font-family="sans-serif">演示预览</text>' +
      '<text x="480" y="390" text-anchor="middle" font-size="20" fill="#94A3B8" font-family="sans-serif">' + text.replace(/[<>&"']/g, '') + '</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  window.locPwCloseFilePreview = function () {
    locPwRevokeFilePreviewUrl();
    var body = document.getElementById('loc-pw-file-preview-body');
    if (body) body.innerHTML = '';
    closeModal('modal-loc-pw-file-preview');
  };

  window.locPwOpenFilePreview = function (name, opts) {
    opts = opts || {};
    locPwRevokeFilePreviewUrl();
    var kind = locPwGetFilePreviewKind(name);
    var title = document.getElementById('loc-pw-file-preview-title');
    var body = document.getElementById('loc-pw-file-preview-body');
    if (title) title.textContent = '预览 · ' + (name || '文件');
    if (!body) return;
    var html = '';
    if (opts.file instanceof File) {
      var mime = String(opts.file.type || '');
      if (kind === 'other' && mime.indexOf('image/') !== 0 && mime !== 'application/pdf') {
        return showToast('该文件类型暂不支持预览', 'warning');
      }
      var url = URL.createObjectURL(opts.file);
      LOC_PW_FILE_PREVIEW_URL = url;
      if (kind === 'image' || mime.indexOf('image/') === 0) {
        html = '<img src="' + url + '" alt="' + esc(name) + '">';
      } else {
        html = '<iframe src="' + url + '" title="' + esc(name) + '"></iframe>';
      }
    } else if (kind === 'image') {
      html = '<img src="' + locPwBuildDemoImagePreviewDataUrl(name) + '" alt="' + esc(name) + '">';
    } else if (kind === 'pdf') {
      html = '<div class="loc-pw-file-preview-fallback">' +
        '<p class="loc-pw-file-preview-fallback-ico" aria-hidden="true">📄</p>' +
        '<p><strong>' + esc(name) + '</strong></p>' +
        '<p>演示环境暂无 PDF 原件，保存后可下载查看。</p></div>';
    } else {
      return showToast('该文件类型暂不支持预览', 'warning');
    }
    body.innerHTML = html;
    locPwShowStackedModal('modal-loc-pw-file-preview');
  };

  function locPwRenderDepartVoucherDraftList() {
    var keptEl = document.getElementById('loc-pw-outbound-doc-kept');
    var pendingEl = document.getElementById('loc-pw-outbound-doc-pending');
    var keptEmpty = document.getElementById('loc-pw-outbound-doc-kept-empty');
    var kept = LOC_PW_DEPART_VOUCHER_DRAFT.kept || [];
    var pending = LOC_PW_DEPART_VOUCHER_DRAFT.pending || [];

    if (keptEl) {
      keptEl.innerHTML = kept.map(function (f, i) {
        return '<div class="loc-pw-voucher-file-row">' +
          '<div class="loc-pw-voucher-file-main">' +
          '<span class="loc-pw-voucher-file-name" title="' + esc(f.name) + '">📄 ' + esc(f.name) + '</span>' +
          '<span class="loc-pw-voucher-file-meta">' + esc(locPwBuildDepartVoucherMetaText(f)) + '</span>' +
          '</div>' +
          '<div class="loc-pw-voucher-file-actions">' +
          (locPwCanPreviewFileName(f.name) ? '<button type="button" class="btn btn-default btn-xs" onclick="locPwPreviewDepartVoucherKept(' + i + ')">预览</button>' : '') +
          '<button type="button" class="btn btn-default btn-xs" onclick="showToast(\'下载 ' + esc(f.name) + '\')">下载</button>' +
          '<button type="button" class="btn btn-default btn-xs loc-pw-voucher-file-remove" onclick="locPwRemoveDepartVoucherKept(' + i + ')">删除</button>' +
          '</div></div>';
      }).join('');
    }
    if (keptEmpty) keptEmpty.style.display = kept.length ? 'none' : '';

    if (pendingEl) {
      pendingEl.innerHTML = pending.map(function (f, i) {
        return '<div class="loc-pw-voucher-file-row loc-pw-voucher-file-row--pending">' +
          '<div class="loc-pw-voucher-file-main">' +
          '<span class="loc-pw-voucher-file-name" title="' + esc(f.name) + '">📄 ' + esc(f.name) + '</span>' +
          '<span class="loc-pw-voucher-file-meta">' + esc(locPwBuildDepartVoucherMetaText(f, { pending: true })) + '</span>' +
          '</div>' +
          '<div class="loc-pw-voucher-file-actions">' +
          (locPwCanPreviewFileName(f.name) ? '<button type="button" class="btn btn-default btn-xs" onclick="locPwPreviewDepartVoucherPending(' + i + ')">预览</button>' : '') +
          '<button type="button" class="btn btn-default btn-xs loc-pw-voucher-file-remove" onclick="locPwRemoveDepartVoucherPending(' + i + ')">移除</button>' +
          '</div></div>';
      }).join('');
    }
  }

  /** 列表列索引（含「客户」列；与 thead 对齐） */
  var LOC_PW_COL = {
    internalRemark: 32,
    holdReason: 33,
    departVoucher: 35,
    refNo: 3, customer: 5, container: 6, arrivalDate: 7, address: 10, actCtns: 11,
    city: 14, state: 15, zipCode: 16,
    companyName: 18, contact: 19, mobile: 20, email: 21,
    estPlts: 22, actPlts: 23, apptReq: 29, apptFile: 30,
    signTime: 37, pod: 38, shipmentId: 39, sysNo: 40
  };

  /** 演示：BOL 暂缓处理记录 */
  var LOC_PW_BOL_HOLD = {
    'BOLO2607090411': { holdReason: '地址异常', holdRemark: '客户要求暂缓，待确认送仓时间', heldAt: '2026-04-28 09:30', fromStatus: '处理中' }
  };

  var LOC_PW_STATUS_HOLD = '暂缓处理';

  /** 演示：BOL 流转里程碑（预约 / 装车 / 发车 / 签收） */
  var LOC_PW_BOL_MILESTONES = {
    'BOLO2607090403': {
      booked: {
        at: '2026-04-28 10:30:45', by: '王芳',
        warehouse: 'LAX-WH', loadType: 'LTL发车', eta: '2026-04-30T16:00',
        vehicle: '53尺车', platform: 'B-02', carrier: 'XPO', actualCarrier: '', pickupTime: '2026-04-29T07:00',
        plateNo: '', driverInfo: '', payableFreight: '', remark: '需协调卸货口'
      }
    },
    'BOLO2607090402-1': {
      booked: {
        at: '2026-04-27 09:00:12', by: '李晓华',
        warehouse: 'ONT-WH', loadType: 'LTL发车', eta: '2026-04-29T14:00',
        vehicle: '53尺车', platform: 'A-01', carrier: 'XPO', actualCarrier: 'XPO Freight', pickupTime: '2026-04-28T07:30',
        plateNo: 'CA-8K1234', driverInfo: 'Tom Driver 626-555-0101', payableFreight: '280.00', remark: ''
      },
      loaded: {
        at: '2026-04-28 08:15:33', by: '李晓华',
        warehouse: 'ONT-WH', departTime: '2026-04-28T09:00', loadType: 'LTL发车', eta: '2026-04-29T14:00',
        vehicle: '53尺车', platform: 'A-01', carrier: 'XPO', actualCarrier: 'XPO Freight', pickupTime: '2026-04-28T07:30',
        plateNo: 'CA-8K1234', driverInfo: 'Tom Driver 626-555-0101', remark: ''
      }
    },
    'BOLO2607090402-2': {
      booked: {
        at: '2026-04-27 09:05:18', by: '李晓华',
        warehouse: 'ONT-WH', loadType: 'LTL发车', eta: '2026-04-29T16:00',
        vehicle: '53尺车', platform: 'A-01', carrier: 'XPO', actualCarrier: 'XPO Freight', pickupTime: '2026-04-28T08:00',
        plateNo: 'CA-8K5678', driverInfo: 'Mike Chen 909-555-2208', payableFreight: '360.00', remark: ''
      },
      loaded: {
        at: '2026-04-28 08:20:41', by: '李晓华',
        warehouse: 'ONT-WH', departTime: '2026-04-28T10:00', loadType: 'LTL发车', eta: '2026-04-29T16:00',
        vehicle: '53尺车', platform: 'A-01', carrier: 'XPO', actualCarrier: 'XPO Freight', pickupTime: '2026-04-28T08:00',
        plateNo: 'CA-8K5678', driverInfo: 'Mike Chen 909-555-2208', remark: ''
      },
      departed: {
        at: '2026-04-28 08:00:07', by: '李晓华', departRemark: '已离仓，在途 ONT8',
        warehouse: 'ONT-WH', loadType: 'LTL发车', eta: '2026-04-29T16:00',
        vehicle: '53尺车', platform: 'A-01', carrier: 'XPO', actualCarrier: 'XPO Freight', pickupTime: '2026-04-28T08:00',
        plateNo: 'CA-8K5678', driverInfo: 'Mike Chen 909-555-2208', payableFreight: '360.00', remark: '',
        departVoucherFiles: [{ name: 'DEPART-BOLO2607090402-2-001.jpg', by: '李晓华', at: '2026-04-28 08:00', size: 1843200 }]
      }
    },
    'BOLO2607090408': {
      booked: {
        at: '2026-04-29 08:00:22', by: '系统',
        warehouse: 'ONT-WH', loadType: 'FTL发车', eta: '2026-04-30T12:00',
        vehicle: '53尺车', platform: 'C-03', carrier: 'FedEx', actualCarrier: 'FedEx Freight', pickupTime: '2026-04-29T08:30',
        plateNo: 'CA-9F2201', driverInfo: 'Alex Wang 626-555-8800', payableFreight: '520.00', remark: ''
      },
      loaded: {
        at: '2026-04-29 09:30:55', by: '系统',
        warehouse: 'ONT-WH', departTime: '2026-04-29T10:00', loadType: 'FTL发车', eta: '2026-04-30T12:00',
        vehicle: '53尺车', platform: 'C-03', carrier: 'FedEx', actualCarrier: 'FedEx Freight', pickupTime: '2026-04-29T08:30',
        plateNo: 'CA-9F2201', driverInfo: 'Alex Wang 626-555-8800', remark: ''
      },
      departed: {
        at: '2026-04-29 10:15:08', by: '系统', departRemark: '已发车',
        warehouse: 'ONT-WH', loadType: 'FTL发车', eta: '2026-04-30T12:00',
        vehicle: '53尺车', platform: 'C-03', carrier: 'FedEx', actualCarrier: 'FedEx Freight', pickupTime: '2026-04-29T08:30',
        plateNo: 'CA-9F2201', driverInfo: 'Alex Wang 626-555-8800', payableFreight: '520.00', remark: '',
        departVoucherFiles: [{ name: 'DEPART-BOLO2607090408-001.jpg', by: '系统', at: '2026-04-29 10:15', size: 956000 }]
      },
      signed: {
        at: '2026-04-30 14:20:36', by: '系统', signTime: '2026-04-30 14:20:36', remark: '仓库已签收',
        podFiles: [{ name: 'POD-BOLO2607090408.pdf' }]
      }
    }
  };

  var LOC_PW_MILESTONE_STORAGE_KEY = 'meekoo_loc_pw_bol_milestones_v20260805c';
  var LOC_PW_FLOW_STEPS = ['待处理', '处理中', '待取货', '运输中', '已签收'];
  /** 演示：待处理→处理中写入的预约备注（安排出库时回显，回退待处理时清空） */
  var LOC_PW_BOL_APPT_REMARK = {
    'BOLO2607090406': '客户要求工作日 9–17 点送仓，门口限高 13.5ft'
  };
  var LOC_PW_MS_SCHEDULE_LABELS = {
    warehouse: '备货仓', departTime: '预计发车时间', loadType: '发车类型', eta: '预计送达时间',
    vehicle: '运输车型', platform: '月台', carrier: '派送供应商', actualCarrier: '实际承运卡司',
    pickupTime: '卡司提货时间', plateNo: '车牌号', driverInfo: '司机信息', payableFreight: '应付运费',
    remark: '预约备注'
  };
  var LOC_PW_MS_SCHEDULE_KEYS_BY_STAGE = {
    booked: ['warehouse', 'eta', 'loadType', 'vehicle', 'platform', 'carrier', 'actualCarrier', 'pickupTime', 'plateNo', 'driverInfo', 'payableFreight', 'remark'],
    loaded: ['warehouse', 'departTime', 'loadType', 'eta', 'vehicle', 'platform', 'carrier', 'actualCarrier', 'pickupTime', 'plateNo', 'driverInfo', 'remark'],
    departed: ['warehouse', 'eta', 'loadType', 'vehicle', 'platform', 'carrier', 'actualCarrier', 'pickupTime', 'plateNo', 'driverInfo', 'payableFreight', 'remark']
  };
  var LOC_PW_MS_STAGE_LABELS = {
    booked: '安排出库', loaded: '已装车', departed: '已发车', signed: '已签收'
  };

  function locPwGetApptRemark(bol) {
    return LOC_PW_BOL_APPT_REMARK[bol] != null ? String(LOC_PW_BOL_APPT_REMARK[bol]) : '';
  }

  function locPwSetApptRemark(bol, remark) {
    var val = String(remark == null ? '' : remark).trim();
    if (val) LOC_PW_BOL_APPT_REMARK[bol] = val;
    else delete LOC_PW_BOL_APPT_REMARK[bol];
  }

  function locPwClearApptRemark(bol) {
    delete LOC_PW_BOL_APPT_REMARK[bol];
  }

  /** 演示：BOL 货件明细（详情弹窗 / 邮件） */
  var LOC_PW_BOL_SHIPMENTS = {
    'BOLO2607099001': [
      { shipmentId: 'TLP2606230401-0001', sysNo: 'TLP2606230401', originBol: 'BOLO2607090401', customer: 'ABC Trading Co.', refNo: 'ref-001-customerX', container: 'MSKU1234567', arrivalDate: '2026-04-26', devanningTime: '2026-04-27 09:15:30', address: '1234 Warehouse Blvd', city: 'Ontario', state: 'CA', zipCode: '91761', country: 'US', estPlts: 1, actPlts: 1, estCtns: 16, actCtns: 15, apptRequirement: '需提前预约卸货口', apptFiles: [{ name: 'appt-0401-A.pdf' }, { name: 'dock-req-0401.xlsx' }], contact: 'Tom', phone: '626-111-0001', email: 'tom.x@example.com', destWarehouse: 'ONT8', palletDimWeight: [{ dim: '48×40×72', weight: 850, ctn: 15 }] },
      { shipmentId: 'TLP2606230401-0002', sysNo: 'TLP2606230401', originBol: 'BOLO2607090401', customer: 'ABC Trading Co.', refNo: 'ref-001b-customerX', container: 'MSKU1234567', arrivalDate: '2026-04-26', devanningTime: '2026-04-27 09:15:30', address: '1234 Warehouse Blvd', city: 'Ontario', state: 'CA', zipCode: '91761', country: 'US', estPlts: 1, actPlts: 1, estCtns: 14, actCtns: 13, apptRequirement: '需提前预约卸货口', apptFiles: [{ name: 'appt-0401-A2.pdf' }], contact: 'Tom', phone: '626-111-0001', email: 'tom.x@example.com', destWarehouse: 'ONT8', palletDimWeight: [{ dim: '48×40×60', weight: 720, ctn: 13 }] },
      { shipmentId: 'TLP2606230391-0001', sysNo: 'TLP2606230391', originBol: 'BOLO2607090391', customer: 'Beta Logistics Inc.', refNo: 'ref-002-customerY', container: 'MSKU2233445', arrivalDate: '2026-04-26', devanningTime: '2026-04-27 10:20:45', address: '892 Carrier Row', city: 'Long Beach', state: 'CA', zipCode: '90802', country: 'US', estPlts: 2, actPlts: 2, estCtns: 26, actCtns: 25, apptRequirement: '—', apptFiles: [], contact: 'Jane', phone: '562-222-0002', email: 'jane.y@example.com', destWarehouse: 'LGB8', palletDimWeight: [{ dim: '47.1×40.0×67.1', weight: 1506.8, ctn: 13 }, { dim: '47.0×40.4×39.3', weight: 778.2, ctn: 12 }] },
      { shipmentId: 'TLP2606230392-0001', sysNo: 'TLP2606230392', originBol: 'BOLO2607090392-1', customer: 'Gamma Retail LLC', refNo: 'ref-003-customerZ', container: 'MSKU3390008', arrivalDate: '2026-04-26', devanningTime: '2026-04-28 08:45:12', address: '4560 Milliken Ave', city: 'Ontario', state: 'CA', zipCode: '91761', country: 'US', estPlts: 1, actPlts: 1, estCtns: 20, actCtns: 20, apptRequirement: '—', apptFiles: [], contact: 'Mike', phone: '626-333-0003', email: 'mike.z@example.com', destWarehouse: 'ONT8', palletDimWeight: [{ dim: '48×40×96', weight: 920, ctn: 20 }] }
    ],
    'BOLO2607090401': [
      { shipmentId: 'TLP2606230401-0001', sysNo: 'TLP2606230401', customer: 'ABC Trading Co.', refNo: 'ref-001-customerX', container: 'MSKU1234567', arrivalDate: '2026-04-26', devanningTime: '2026-04-27 09:15:30', address: '1234 Warehouse Blvd', city: 'Ontario', state: 'CA', zipCode: '91761', country: 'US', estPlts: 1, actPlts: 1, estCtns: 16, actCtns: 15, apptRequirement: '需提前预约卸货口', apptFiles: [{ name: 'appt-0401-A.pdf' }, { name: 'dock-req-0401.xlsx' }], contact: 'Tom', phone: '626-111-0001', email: 'tom.x@example.com', destWarehouse: 'ONT8', palletDimWeight: [{ dim: '48×40×72', weight: 850, ctn: 15 }] },
      { shipmentId: 'TLP2606230401-0002', sysNo: 'TLP2606230401', customer: 'ABC Trading Co.', refNo: 'ref-001b-customerX', container: 'MSKU1234567', arrivalDate: '2026-04-26', devanningTime: '2026-04-27 09:15:30', address: '1234 Warehouse Blvd', city: 'Ontario', state: 'CA', zipCode: '91761', country: 'US', estPlts: 1, actPlts: 1, estCtns: 14, actCtns: 13, apptRequirement: '需提前预约卸货口', apptFiles: [{ name: 'appt-0401-A2.pdf' }], contact: 'Tom', phone: '626-111-0001', email: 'tom.x@example.com', destWarehouse: 'ONT8', palletDimWeight: [{ dim: '48×40×60', weight: 720, ctn: 13 }] }
    ],
    'BOLO2607090391': [
      { shipmentId: 'TLP2606230391-0001', sysNo: 'TLP2606230391', customer: 'Beta Logistics Inc.', refNo: 'ref-002-customerY', container: 'MSKU2233445', arrivalDate: '2026-04-26', devanningTime: '2026-04-27 10:20:45', address: '892 Carrier Row', city: 'Long Beach', state: 'CA', zipCode: '90802', country: 'US', estPlts: 2, actPlts: 2, estCtns: 26, actCtns: 25, apptRequirement: '—', apptFiles: [], contact: 'Jane', phone: '562-222-0002', email: 'jane.y@example.com', destWarehouse: 'LGB8', palletDimWeight: [{ dim: '47.1×40.0×67.1', weight: 1506.8, ctn: 13 }, { dim: '47.0×40.4×39.3', weight: 778.2, ctn: 12 }] }
    ],
    'BOLO2607090392-1': [
      { shipmentId: 'TLP2606230392-0001', sysNo: 'TLP2606230392', customer: 'Gamma Retail LLC', refNo: 'ref-003-customerZ', container: 'MSKU3390008', arrivalDate: '2026-04-26', devanningTime: '2026-04-28 08:45:12', address: '4560 Milliken Ave', city: 'Ontario', state: 'CA', zipCode: '91761', country: 'US', estPlts: 1, actPlts: 1, estCtns: 20, actCtns: 20, apptRequirement: '—', apptFiles: [], contact: 'Mike', phone: '626-333-0003', email: 'mike.z@example.com', destWarehouse: 'ONT8', palletDimWeight: [{ dim: '48×40×96', weight: 920, ctn: 20 }] }
    ],
    'BOLO2607090405': [
      { shipmentId: 'TLP2606230405-0001', sysNo: 'TLP2606230405', customer: 'Delta Home Goods', refNo: 'ref-norm01', container: 'MSKU4400123', arrivalDate: '2026-04-25', devanningTime: '2026-04-26 07:30:00', address: '1800 Logistics Dr', city: 'City of Industry', state: 'CA', zipCode: '91748', country: 'US', estPlts: 2, actPlts: 2, ctns: 28, apptRequirement: '—', apptFiles: [], contact: 'Kevin', phone: '909-555-1200', email: 'kevin@example.com', destWarehouse: 'SBD1' }
    ],
    'BOLO2607090412': [
      { shipmentId: 'TLP2606230412-0001', sysNo: 'TLP2606230412', customer: 'Nova Parts Inc.', refNo: 'ref-pending-01', container: 'MSKU8811001', arrivalDate: '2026-04-30', devanningTime: '2026-05-01 08:20:00', address: '5100 Etiwanda Ave', city: 'Jurupa Valley', state: 'CA', zipCode: '91752', country: 'US', estPlts: 2, actPlts: 2, ctns: 20, apptRequirement: '—', apptFiles: [], contact: 'Nick', phone: '951-555-2210', email: 'nick@novaparts.example.com', destWarehouse: 'ONT8', palletDimWeight: [{ dim: '48×40×60', weight: 850, ctn: 11 }, { dim: '48×40×58', weight: 850, ctn: 9 }] }
    ],
    'BOLO2607090413': [
      { shipmentId: 'TLP2606230413-0001', sysNo: 'TLP2606230413', customer: 'Pacific Home Co.', refNo: 'ref-pending-02', container: 'MSKU8822002', arrivalDate: '2026-04-30', devanningTime: '2026-05-01 10:05:00', address: '7600 Jurupa Ave', city: 'Riverside', state: 'CA', zipCode: '92509', country: 'US', estPlts: 1, actPlts: 1, ctns: 12, apptRequirement: '需预约卸货', apptFiles: [{ name: 'appt-0413.pdf' }], contact: 'Pat', phone: '951-555-3344', email: 'pat@pacifichome.example.com', destWarehouse: 'ONT8' }
    ],
    'BOLO2607090406': [
      { shipmentId: 'TLP2606230406-0001', sysNo: 'TLP2606230406', customer: 'Zeta Outdoor Ltd.', refNo: 'CRN-2026-018', container: 'MSKU7700888', arrivalDate: '2026-04-28', devanningTime: '2026-04-29 09:30:00', address: '2450 E Philadelphia St, Building C, Dock 12', city: 'Ontario', state: 'CA', zipCode: '91761', country: 'US', estPlts: 1, actPlts: 1, ctns: 11, apptRequirement: '同址合板：工作日 9–17 点送仓', apptFiles: [{ name: 'appt-0406-A.pdf' }, { name: 'dock-pass-0406.pdf' }], contact: 'Lisa', phone: '909-555-8806', email: 'lisa@zetaoutdoor.example.com', destWarehouse: 'ONT8', palletDimWeight: [{ dim: '48×40×72', weight: 620, ctn: 11 }] },
      { shipmentId: 'TLP2606230406-0002', sysNo: 'TLP2606230406', customer: 'Zeta Outdoor Ltd.', refNo: 'CRN-2026-019', container: 'MSKU7700888', arrivalDate: '2026-04-28', devanningTime: '2026-04-29 09:30:00', address: '2450 E Philadelphia St, Building C, Dock 12', city: 'Ontario', state: 'CA', zipCode: '91761', country: 'US', estPlts: 1, actPlts: 1, ctns: 10, apptRequirement: '同址合板：工作日 9–17 点送仓', apptFiles: [{ name: 'appt-0406-B.pdf' }], contact: 'Lisa', phone: '909-555-8806', email: 'lisa@zetaoutdoor.example.com', destWarehouse: 'ONT8', palletDimWeight: [{ dim: '47×40×60', weight: 540, ctn: 10 }] },
      { shipmentId: 'TLP2606230406-0003', sysNo: 'TLP2606230406', customer: 'Zeta Outdoor Ltd.', refNo: 'CRN-2026-020', container: 'MSKU7700888', arrivalDate: '2026-04-28', devanningTime: '2026-04-29 09:30:00', address: '2450 E Philadelphia St, Building C, Dock 12', city: 'Ontario', state: 'CA', zipCode: '91761', country: 'US', estPlts: 1, actPlts: 1, ctns: 11, apptRequirement: '同址合板：工作日 9–17 点送仓', apptFiles: [{ name: 'appt-0406-C.pdf' }], contact: 'Lisa', phone: '909-555-8806', email: 'lisa@zetaoutdoor.example.com', destWarehouse: 'ONT8', palletDimWeight: [{ dim: '48×40×68', weight: 580, ctn: 11 }] }
    ],
    'BOLO2607090403': [
      { shipmentId: 'TLP2606230403-0001', sysNo: 'TLP2606230403', customer: 'Echo Supply Co.', refNo: 'ref-009ff', container: 'MSKU3390001', arrivalDate: '2026-04-27', devanningTime: '2026-04-28 08:15:30', address: '5678 Commerce Way', city: 'Rancho Cucamonga', state: 'CA', zipCode: '91730', country: 'US', estPlts: 3, actPlts: 3, estCtns: 36, actCtns: 35, apptRequirement: '—', apptFiles: [], contact: 'Mike', phone: '909-000-3300', email: 'mike@example.com', destWarehouse: 'ONT8', palletDimWeight: [{ dim: '47.1×40.0×67.1', weight: 1506.8, ctn: 12 }, { dim: '47.0×40.4×39.3', weight: 778.2, ctn: 11 }, { dim: '47.7×42.2×67.5', weight: 1512.4, ctn: 12 }] }
    ],
    'BOLO2607090402-1': [
      { shipmentId: 'TLP2606230402-0001', sysNo: 'TLP2606230402', customer: 'Fox Brands Ltd.', refNo: 'HK-2026-0402', container: 'MSKU2234567', arrivalDate: '2026-04-26', devanningTime: '2026-04-27 11:00:18', address: '1234 Warehouse Blvd', city: 'Ontario', state: 'CA', zipCode: '91761', country: 'US', estPlts: 1, actPlts: 1, ctns: 8, apptRequirement: '—', apptFiles: [], contact: 'Lucy', phone: '626-000-0001', email: 'lucy@example.com', destWarehouse: 'ONT8' }
    ],
    'BOLO2607090402-2': [
      { shipmentId: 'TLP2606230402-0001', sysNo: 'TLP2606230402', customer: 'Fox Brands Ltd.', refNo: 'HK-2026-0402', container: 'MSKU2234567', arrivalDate: '2026-04-26', devanningTime: '2026-04-27 11:00:18', address: '1234 Warehouse Blvd', city: 'Ontario', state: 'CA', zipCode: '91761', country: 'US', estPlts: 2, actPlts: 2, ctns: 14, apptRequirement: '—', apptFiles: [], contact: 'Lucy', phone: '626-000-0001', email: 'lucy@example.com', destWarehouse: 'ONT8' }
    ],
    'BOLO2607090408': [
      { shipmentId: 'TLP2606230408-0001', sysNo: 'TLP2606230408', customer: 'Gamma Retail LLC', refNo: 'ref-sig01', container: 'MSKU8899001', arrivalDate: '2026-04-28', devanningTime: '2026-04-29 09:40:55', address: '9100 Industrial Pkwy', city: 'Fontana', state: 'CA', zipCode: '92335', country: 'US', estPlts: 1, actPlts: 1, ctns: 18, apptRequirement: '—', apptFiles: [], contact: 'Amy', phone: '909-100-7788', email: 'amy@example.com', destWarehouse: 'ONT8' }
    ],
    'BOLO2607090410': [
      { shipmentId: 'TLP2606230410-0001', sysNo: 'TLP2606230410', customer: 'Hotel Essentials Inc.', refNo: 'ref-ret01', container: 'MSKU5566778', arrivalDate: '2026-04-29', devanningTime: '2026-04-30 10:05:22', address: '2200 E Mission Blvd', city: 'Pomona', state: 'CA', zipCode: '91766', country: 'US', estPlts: 2, actPlts: 2, ctns: 22, apptRequirement: '—', apptFiles: [], contact: 'Chris', phone: '909-200-4411', email: 'chris@example.com', destWarehouse: 'ONT8' }
    ],
    'BOLO2607090411': [
      { shipmentId: 'TLP2606230411-0001', sysNo: 'TLP2606230411', customer: 'Ivy Imports', refNo: 'ref-iss01', container: 'MSKU6677889', arrivalDate: '2026-04-27', devanningTime: '2026-04-28 14:30:08', address: '3300 E Francis St', city: 'Ontario', state: 'CA', zipCode: '91761', country: 'US', estPlts: 2, actPlts: 2, ctns: 24, apptRequirement: '需换标后送仓', apptFiles: [{ name: 'appt-0411.pdf' }], contact: 'Sarah', phone: '626-400-8899', email: 'sarah@example.com', destWarehouse: 'ONT8' }
    ]
  };

  /** 演示：拆柜异常反馈 / 拆柜照片（字段对齐提拆派计划拆柜报告） */
  (function locPwEnrichDevanningDemo() {
    var demo = {
      'BOLO2607099001': {
        'TLP2606230401-0001': {
          abnormalFeedback: '纸箱轻微破损，已重新打板加固；柜内有少量洒落泡沫颗粒。',
          devanningPhotos: [
            { name: '拆柜照片-1.jpg', uploadedAt: '2026-04-27 09:20:00' },
            { name: '拆柜照片-2.jpg', uploadedAt: '2026-04-27 09:21:15' }
          ]
        }
      },
      'BOLO2607090411': {
        'TLP2606230411-0001': {
          abnormalFeedback: '外箱受潮变形，标签脱落需换标；货量与预报略有差异。',
          devanningPhotos: [
            { name: '拆柜照片-湿损-1.jpg', uploadedAt: '2026-04-28 14:35:00' },
            { name: '拆柜照片-湿损-2.jpg', uploadedAt: '2026-04-28 14:36:20' },
            { name: '拆柜照片-标签.jpg', uploadedAt: '2026-04-28 14:37:05' }
          ]
        }
      },
      'BOLO2607090413': {
        'TLP2606230413-0001': {
          abnormalFeedback: '拆柜顺利，无异常。',
          devanningPhotos: []
        }
      }
    };
    Object.keys(LOC_PW_BOL_SHIPMENTS).forEach(function (bol) {
      (LOC_PW_BOL_SHIPMENTS[bol] || []).forEach(function (s) {
        var extra = demo[bol] && demo[bol][s.shipmentId];
        if (extra) {
          if (extra.abnormalFeedback != null) s.abnormalFeedback = extra.abnormalFeedback;
          if (extra.devanningPhotos) s.devanningPhotos = extra.devanningPhotos.slice();
        }
        if (s.abnormalFeedback == null) s.abnormalFeedback = '';
        if (!Array.isArray(s.devanningPhotos)) s.devanningPhotos = [];
      });
    });
  })();

  (function locPwEnrichInternalRemarkDemo() {
    var demo = {
      'TLP2606230412-0001': '客户要求优先送仓',
      'TLP2606230406-0001': '优先送仓',
      'TLP2606230406-0002': '需电话联系',
      'TLP2606230401-0001': '合板货件 A',
      'TLP2606230401-0002': '合板货件 B',
      'TLP2606230391-0001': '注意卸货口限制',
      'TLP2606230411-0001': '地址异常待确认'
    };
    Object.keys(LOC_PW_BOL_SHIPMENTS).forEach(function (bol) {
      (LOC_PW_BOL_SHIPMENTS[bol] || []).forEach(function (s) {
        if (demo[s.shipmentId]) s.internalRemark = demo[s.shipmentId];
        else if (s.internalRemark == null) s.internalRemark = '';
      });
    });
  })();

  var LOC_PW_COMM_LOGS = {};
  var LOC_PW_COMM_STORAGE_KEY = 'meekoo_loc_pw_comm_logs';
  var LOC_PW_EMAIL_SEQ = 1;

  function locPwLoadCommLogs() {
    try {
      var raw = localStorage.getItem(LOC_PW_COMM_STORAGE_KEY);
      if (raw) LOC_PW_COMM_LOGS = JSON.parse(raw) || {};
    } catch (_) {
      LOC_PW_COMM_LOGS = {};
    }
    var maxSeq = 0;
    Object.keys(LOC_PW_COMM_LOGS).forEach(function (bol) {
      (LOC_PW_COMM_LOGS[bol] || []).forEach(function (l) {
        var m = String(l.id || '').match(/EML-2026-(\d+)/);
        if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10) || 0);
      });
    });
    if (maxSeq >= LOC_PW_EMAIL_SEQ) LOC_PW_EMAIL_SEQ = maxSeq + 1;
  }

  function locPwSaveCommLogs() {
    try {
      localStorage.setItem(LOC_PW_COMM_STORAGE_KEY, JSON.stringify(LOC_PW_COMM_LOGS));
    } catch (_) {}
  }

  function locPwNextEmailId() {
    return 'EML-2026-' + String(LOC_PW_EMAIL_SEQ++).padStart(4, '0');
  }

  function locPwFormatNow() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  function locPwFormatMilestoneDateTime(val) {
    if (!val) return '—';
    var s = String(val).trim().replace('T', ' ');
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) return s.slice(0, 19);
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) return s + ':00';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + ' 00:00:00';
    return s.slice(0, 19) || '—';
  }

  function locPwScheduleSuffixToKey(suffix) {
    return suffix.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
  }

  function locPwLoadMilestones() {
    try {
      var raw = localStorage.getItem(LOC_PW_MILESTONE_STORAGE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw) || {};
      Object.keys(saved).forEach(function (bol) {
        var demoBol = LOC_PW_BOL_MILESTONES[bol] || {};
        var savedBol = saved[bol] || {};
        var next = Object.assign({}, demoBol);
        Object.keys(savedBol).forEach(function (stage) {
          next[stage] = Object.assign({}, demoBol[stage] || {}, savedBol[stage] || {});
        });
        LOC_PW_BOL_MILESTONES[bol] = next;
      });
    } catch (_) {}
  }

  function locPwPersistMilestones() {
    try {
      localStorage.setItem(LOC_PW_MILESTONE_STORAGE_KEY, JSON.stringify(LOC_PW_BOL_MILESTONES));
    } catch (_) {}
  }

  function locPwGetBolMilestones(bol) {
    return LOC_PW_BOL_MILESTONES[bol] || {};
  }

  function locPwSaveBolMilestone(bol, stage, data) {
    if (!bol || !stage) return;
    if (!LOC_PW_BOL_MILESTONES[bol]) LOC_PW_BOL_MILESTONES[bol] = {};
    LOC_PW_BOL_MILESTONES[bol][stage] = Object.assign({ at: locPwFormatNow(), by: '当前用户' }, data || {});
    locPwPersistMilestones();
  }

  function locPwClearBolBookedMilestone(bol) {
    if (!LOC_PW_BOL_MILESTONES[bol]) return;
    delete LOC_PW_BOL_MILESTONES[bol].booked;
    locPwPersistMilestones();
  }

  function locPwClearBolLoadedMilestone(bol) {
    if (!LOC_PW_BOL_MILESTONES[bol]) return;
    delete LOC_PW_BOL_MILESTONES[bol].loaded;
    locPwPersistMilestones();
  }

  function locPwCollectScheduleForm(prefix) {
    var data = {};
    LOC_PW_SCHEDULE_FIELD_SUFFIXES.forEach(function (suffix) {
      var el = document.getElementById('loc-pw-' + prefix + '-' + suffix);
      data[locPwScheduleSuffixToKey(suffix)] = el ? String(el.value || '').trim() : '';
    });
    if (prefix === 'booked' || prefix === 'start-processing') {
      delete data.departTime;
    }
    if (prefix === 'loaded') {
      delete data.payableFreight;
    }
    if (prefix === 'departed') {
      var dr = document.getElementById('loc-pw-departed-depart-remark');
      data.departRemark = dr ? String(dr.value || '').trim() : '';
      delete data.departTime;
    }
    return data;
  }

  function locPwGetFlowStepIndex(status) {
    var map = {
      '待处理': 0,
      '处理中': 1,
      '暂缓处理': 1,
      '待取货': 2,
      '运输中': 3,
      '已签收': 4
    };
    return map[status] != null ? map[status] : 0;
  }

  function locPwGetFlowStepState(stepIdx, statusIdx) {
    if (statusIdx >= LOC_PW_FLOW_STEPS.length - 1) return 'done';
    if (stepIdx < statusIdx) return 'done';
    if (stepIdx === statusIdx) return 'current';
    return 'pending';
  }

  function locPwGetLatestMilestoneStage(ms) {
    if (ms.signed) return 'signed';
    if (ms.departed) return 'departed';
    if (ms.loaded) return 'loaded';
    if (ms.booked) return 'booked';
    return null;
  }

  function locPwBuildMilestoneMetaHtml(stageData) {
    if (!stageData) return '';
    var parts = [];
    if (stageData.at) parts.push(locPwFormatMilestoneDateTime(stageData.at));
    if (stageData.by) parts.push(stageData.by);
    return parts.length ? '<span class="loc-pw-ms-meta">' + esc(parts.join(' · ')) + '</span>' : '';
  }

  function locPwBuildMilestoneScheduleGrid(stageKey, stageData) {
    var keys = LOC_PW_MS_SCHEDULE_KEYS_BY_STAGE[stageKey] || LOC_PW_MS_SCHEDULE_KEYS_BY_STAGE.booked;
    var data = stageData || {};
    return keys.map(function (key) {
      var val = data[key];
      var display;
      if (val == null || String(val).trim() === '') display = '—';
      else if (key === 'departTime' || key === 'eta' || key === 'pickupTime') display = locPwFormatDisplayDateTime(val);
      else display = val;
      var full = (key === 'remark') ? ' loc-pw-ms-kv--full' : '';
      return '<div class="loc-pw-ms-kv' + full + '"><span class="loc-pw-ms-k">' + esc(LOC_PW_MS_SCHEDULE_LABELS[key] || key) + '</span><span class="loc-pw-ms-v">' + esc(display) + '</span></div>';
    }).join('');
  }

  function locPwBuildMilestoneAttachFilesHtml(files, label) {
    var list = (files && files.length) ? files : [];
    if (!list.length) {
      return '<div class="loc-pw-ms-kv loc-pw-ms-kv--pod"><span class="loc-pw-ms-k">' + esc(label) + '</span><span class="loc-pw-ms-v">—</span></div>';
    }
    var chips = list.map(function (f) {
      var name = (f && f.name) ? f.name : String(f);
      var previewBtn = locPwCanPreviewFileName(name)
        ? '<button type="button" class="btn btn-default btn-xs loc-pw-appt-file-preview-btn" onclick="locPwOpenFilePreview(\'' + locPwJsQuote(name) + '\',{demo:true});return false;">预览</button>'
        : '';
      return '<span class="loc-pw-appt-file-chip-wrap">' + previewBtn +
        '<a class="loc-pw-appt-file-chip" href="#" onclick="showToast(\'下载 ' + esc(name) + '\');return false;" title="' + esc(name) + '">' +
        '<span class="loc-pw-appt-file-ico" aria-hidden="true">📄</span><span class="loc-pw-appt-file-name">' + esc(name) + '</span></a></span>';
    }).join('');
    return '<div class="loc-pw-ms-kv loc-pw-ms-kv--pod"><span class="loc-pw-ms-k">' + esc(label) + '</span><div class="loc-pw-appt-file-list">' + chips + '</div></div>';
  }

  function locPwBuildMilestonePodHtml(podFiles) {
    return locPwBuildMilestoneAttachFilesHtml(podFiles, 'POD 附件');
  }

  function locPwBuildMilestoneDepartVoucherHtml(voucherFiles) {
    return locPwBuildMilestoneAttachFilesHtml(voucherFiles, '发车凭证');
  }

  function locPwBuildBolFlowProgressHtml(status) {
    var statusIdx = locPwGetFlowStepIndex(status);
    var steps = LOC_PW_FLOW_STEPS.map(function (label, i) {
      var state = locPwGetFlowStepState(i, statusIdx);
      var dot = state === 'done' ? '✓' : String(i + 1);
      return '<div class="loc-pw-flow-step loc-pw-flow-step--' + state + '">' +
        '<div class="loc-pw-flow-step-dot">' + dot + '</div>' +
        '<div class="loc-pw-flow-step-lbl">' + esc(label) + '</div></div>' +
        (i < LOC_PW_FLOW_STEPS.length - 1 ? '<div class="loc-pw-flow-connector loc-pw-flow-connector--' + (state === 'done' ? 'done' : 'pending') + '"></div>' : '');
    }).join('');
    return '<div class="loc-pw-bol-flow loc-pw-bol-flow--inline"><div class="loc-pw-bol-flow-steps">' + steps + '</div></div>';
  }

  function locPwBuildBolMilestoneStageHtml(stageKey, stageData, expanded) {
    if (!stageData) return '';
    var label = LOC_PW_MS_STAGE_LABELS[stageKey] || stageKey;
    var body = '';
    if (stageKey === 'signed') {
      body = '<div class="loc-pw-ms-grid">' +
        '<div class="loc-pw-ms-kv"><span class="loc-pw-ms-k">签收时间</span><span class="loc-pw-ms-v">' + esc(stageData.signTime ? locPwFormatMilestoneDateTime(stageData.signTime) : '—') + '</span></div>' +
        locPwBuildMilestonePodHtml(stageData.podFiles) +
        '<div class="loc-pw-ms-kv loc-pw-ms-kv--full"><span class="loc-pw-ms-k">签收备注</span><span class="loc-pw-ms-v">' + esc(stageData.remark || '—') + '</span></div>' +
        '</div>';
    } else {
      body = '<div class="loc-pw-ms-grid">' + locPwBuildMilestoneScheduleGrid(stageKey, stageData) +
        (stageKey === 'departed'
          ? '<div class="loc-pw-ms-kv loc-pw-ms-kv--full"><span class="loc-pw-ms-k">发车备注</span><span class="loc-pw-ms-v">' + esc(stageData.departRemark || '—') + '</span></div>'
          : '') +
        (stageKey === 'departed' ? locPwBuildMilestoneDepartVoucherHtml(stageData.departVoucherFiles) : '') +
        '</div>';
    }
    var openAttr = expanded ? ' aria-expanded="true"' : ' aria-expanded="false"';
    var panelHidden = expanded ? '' : ' hidden';
    var arrow = expanded ? '▲' : '▼';
    return '<div class="loc-pw-ms-stage loc-pw-ms-stage--' + stageKey + '">' +
      '<button type="button" class="loc-pw-ms-stage-toggle"' + openAttr + ' onclick="locPwToggleMilestonePanel(this)">' +
      '<span class="loc-pw-ms-stage-arrow" aria-hidden="true">' + arrow + '</span>' +
      '<span class="loc-pw-ms-stage-lbl">' + esc(label) + '</span>' +
      locPwBuildMilestoneMetaHtml(stageData) +
      '</button>' +
      '<div class="loc-pw-ms-stage-panel"' + panelHidden + '>' + body + '</div></div>';
  }

  function locPwBuildBolMilestonesHtml(bol, status) {
    var ms = locPwGetBolMilestones(bol);
    var latest = locPwGetLatestMilestoneStage(ms);
    var stages = ['booked', 'loaded', 'departed', 'signed'].filter(function (k) { return ms[k]; }).reverse();
    if (!stages.length) {
      if (status === '待处理' || status === '处理中' || status === LOC_PW_STATUS_HOLD) {
        var emptyTip = status === '待处理'
          ? '暂无流转记录，确认安排后进入「处理中」'
          : '暂无流转记录，安排出库后将在此展示';
        return '<div class="loc-pw-bol-milestones loc-pw-bol-milestones--empty">' +
          '<div class="loc-pw-bol-milestones-hd">流转信息</div>' +
          '<div class="loc-pw-bol-milestones-empty">' + emptyTip + '</div></div>';
      }
      return '';
    }
    var panels = stages.map(function (k) {
      return locPwBuildBolMilestoneStageHtml(k, ms[k], k === latest);
    }).join('');
    return '<div class="loc-pw-bol-milestones">' +
      '<div class="loc-pw-bol-milestones-hd">流转信息</div>' +
      '<div class="loc-pw-bol-milestones-list">' + panels + '</div></div>';
  }

  window.locPwToggleMilestonePanel = function (btn) {
    var stage = btn.closest('.loc-pw-ms-stage');
    if (!stage) return;
    var panel = stage.querySelector('.loc-pw-ms-stage-panel');
    if (!panel) return;
    var arrow = btn.querySelector('.loc-pw-ms-stage-arrow');
    var open = panel.hasAttribute('hidden');
    if (open) {
      panel.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
      if (arrow) arrow.textContent = '▲';
    } else {
      panel.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
      if (arrow) arrow.textContent = '▼';
    }
  };

  function locPwGetShipmentEmailLogs(bol, shipmentId) {
    return (LOC_PW_COMM_LOGS[bol] || []).filter(function (l) {
      return l.shipmentId === shipmentId;
    });
  }

  function locPwGetEmailLogsForShipments(bol, shipments) {
    var all = LOC_PW_COMM_LOGS[bol] || [];
    if (!shipments || !shipments.length) return all.slice();
    var ids = {};
    shipments.forEach(function (s) {
      if (s && s.shipmentId) ids[String(s.shipmentId)] = true;
    });
    return all.filter(function (l) {
      return l.shipmentId && ids[String(l.shipmentId)];
    });
  }

  function locPwHasSentEmail(logs, type) {
    return logs.some(function (l) {
      return l.type === type && (l.status === 'success' || l.status === 'partial');
    });
  }

  function locPwGetVendorEmails(vendor) {
    var raw = LOC_PW_VENDOR_EMAILS[vendor];
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(function (e) { return String(e || '').trim(); }).filter(Boolean);
    return String(raw).split(/[;,]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function locPwGetVendorEmail(vendor, fallback) {
    if (fallback) return fallback;
    var emails = locPwGetVendorEmails(vendor);
    return emails.length ? emails.join('; ') : '—';
  }

  function locPwSimulateInquiryVendorResults(vendors, body) {
    var allFailReason = body.length < 10 ? '正文过短（演示失败）' : '';
    var results = [];
    vendors.forEach(function (vendor) {
      var emails = locPwGetVendorEmails(vendor);
      if (!emails.length) emails = ['—'];
      emails.forEach(function (email) {
        if (allFailReason) {
          results.push({ vendor: vendor, email: email, status: 'failed', failReason: allFailReason });
        } else if (vendor === 'Pacific Freight') {
          results.push({ vendor: vendor, email: email, status: 'failed', failReason: 'SMTP 连接超时（演示）' });
        } else {
          results.push({ vendor: vendor, email: email, status: 'success', failReason: '' });
        }
      });
    });
    return results;
  }

  function locPwAggregateVendorStatus(vendorResults) {
    if (!vendorResults || !vendorResults.length) return 'failed';
    var ok = vendorResults.filter(function (v) { return v.status === 'success'; }).length;
    if (ok === vendorResults.length) return 'success';
    if (ok === 0) return 'failed';
    return 'partial';
  }

  function locPwGetLogVendorResults(log) {
    if (log.vendorResults && log.vendorResults.length) return locPwNormalizeVendorResults(log.vendorResults);
    var vendors = String(log.recipients || '').split(/[、,;]/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!vendors.length) return [];
    return vendors.map(function (vendor) {
      return {
        vendor: vendor,
        email: locPwGetVendorEmail(vendor),
        status: log.status === 'success' ? 'success' : (log.status === 'failed' ? 'failed' : 'pending'),
        failReason: log.failReason || ''
      };
    });
  }

  function locPwNormalizeVendorResults(vendorResults) {
    return (vendorResults || []).map(function (vr) {
      return {
        vendor: vr.vendor,
        email: locPwGetVendorEmail(vr.vendor, vr.email),
        status: vr.status,
        failReason: vr.failReason || ''
      };
    });
  }

  function locPwVendorCellHtml(vr) {
    return esc(vr.email || '—');
  }

  function locPwEmailRecordStatusMeta(status) {
    if (status === 'success') return { text: '成功', cls: 'loc-pw-eml-st--ok' };
    if (status === 'partial') return { text: '部分失败', cls: 'loc-pw-eml-st--partial' };
    if (status === 'failed') return { text: '失败', cls: 'loc-pw-eml-st--fail' };
    return { text: '发送中', cls: 'loc-pw-eml-st--pending' };
  }

  function locPwEmailStatusLabel(logs, type) {
    var typeLogs = type === 'inquiry'
      ? logs.filter(function (l) { return l.type === 'inquiry'; })
      : (type === 'appointment'
        ? logs.filter(function (l) { return l.type !== 'inquiry'; })
        : logs.filter(function (l) { return l.type === type; }));
    if (!typeLogs.length) return { text: '未发送', cls: 'loc-pw-eml-st--none' };
    var last = typeLogs[typeLogs.length - 1];
    var st = last.status;
    if (last.vendorResults && last.vendorResults.length && st !== 'partial') {
      st = locPwAggregateVendorStatus(last.vendorResults);
    } else if (type === 'appointment' || locPwIsAppointmentLog(last)) {
      var rrs = locPwGetLogRecipientResults(last);
      if (rrs.length && st !== 'partial') {
        st = locPwAggregateRecipientStatus(rrs);
      }
    }
    if (st === 'success') return { text: '已发送', cls: 'loc-pw-eml-st--ok' };
    if (st === 'partial') {
      if (type === 'appointment') {
        var apptRrs = locPwGetLogRecipientResults(last);
        var apptOk = apptRrs.filter(function (r) { return r.status === 'success'; }).length;
        return { text: '部分失败 (' + apptOk + '/' + apptRrs.length + ')', cls: 'loc-pw-eml-st--partial' };
      }
      var vr = locPwGetLogVendorResults(last);
      var ok = vr.filter(function (v) { return v.status === 'success'; }).length;
      return { text: '部分失败 (' + ok + '/' + vr.length + ')', cls: 'loc-pw-eml-st--partial' };
    }
    if (st === 'failed') return { text: '发送失败', cls: 'loc-pw-eml-st--fail' };
    return { text: '发送中', cls: 'loc-pw-eml-st--pending' };
  }

  function locPwFillEmailForm(prefix, type, bol, ship, extra) {
    if (typeof locPwEmailTplGet !== 'function' || typeof locPwEmailTplFill !== 'function') return;
    var tpl = locPwEmailTplGet(type);
    if (tpl.enabled === false) {
      showToast('该模板已停用，请至邮件模板配置启用', 'warning');
    }
    var vars = locPwEmailTplBuildVars(bol, ship, extra || {});
    var subEl = document.getElementById('loc-pw-' + prefix + '-subject');
    var bodyEl = document.getElementById('loc-pw-' + prefix + '-body');
    if (subEl) subEl.value = locPwEmailTplFill(tpl.subject, vars);
    if (bodyEl) bodyEl.value = locPwEmailTplFill(tpl.body, vars);
  }

  var LOC_PW_INQUIRY_VENDORS = ['XPO Logistics', 'Swift Carriers', 'Pacific Freight'];
  var LOC_PW_VENDOR_EMAILS = {
    'XPO Logistics': ['quotes@xpo.com', 'ops@xpo.com'],
    'Swift Carriers': ['dispatch@swiftcarriers.com'],
    'Pacific Freight': ['quotes@pacificfreight.com', 'cs@pacificfreight.com', 'dispatch@pacificfreight.com']
  };
  var LOC_PW_DELIVERY_INSTRUCTIONS = [
    'RESIDENTIAL',
    'APPT',
    'FCFS',
    'Limited Access',
    'One-hour notice',
    'LIFT-GATE (A 53\' truck cannot access the location.)',
    'DOCK TO DOCK (A 53\' truck can access the location.)',
    'DOCK TO DOCK (A 53\' truck cannot access the location.)',
    'THE CONSIGNEE HAS FORKLIFT AND PALLET JACK ONSITE',
    'NO DOCK (THE CONSIGNEE HAS FORKLIFT AND PALLET JACK ONSITE)'
  ];
  var LOC_PW_DEFAULT_PICKUP_ADDRESS = (typeof locPwEmailTplDefaultPickupAddress === 'string')
    ? locPwEmailTplDefaultPickupAddress
    : '1495 E Locust St. Ontario, CA 91761';

  var locPwInquiryVendorMs = null;
  var locPwInquiryDeliveryInstrMs = null;
  var locPwInquiryMsDocBound = false;
  var locPwInquiryEmailFieldsState = { deliveryInstruction: false };
  var locPwApptRecipientsList = [];

  function locPwTplHas(type, key) {
    if (typeof locPwEmailTplHasPlaceholder === 'function') {
      return locPwEmailTplHasPlaceholder(type, key);
    }
    return true;
  }

  function locPwToggleEmailField(fieldId, reqId, show) {
    var field = document.getElementById(fieldId);
    if (field) field.style.display = show ? '' : 'none';
    if (reqId) {
      var req = document.getElementById(reqId);
      if (req) req.style.display = show ? '' : 'none';
    }
  }

  function locPwApplyInquiryEmailFieldsFromTemplate() {
    var showDI = locPwTplHas('inquiry', 'DeliveryInstruction');
    locPwInquiryEmailFieldsState = { deliveryInstruction: showDI };
    locPwToggleEmailField('loc-pw-inquiry-field-delivery-instr', null, showDI);
  }

  function locPwParseEmailTokens(str) {
    return String(str || '').split(/[,;\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function locPwIsValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function locPwRenderApptRecipients() {
    var wrap = document.getElementById('loc-pw-appt-recipients-tags');
    if (!wrap) return;
    wrap.innerHTML = locPwApptRecipientsList.map(function (email) {
      return '<span class="loc-pw-email-tag" data-email="' + esc(email) + '">' +
        '<span>' + esc(email) + '</span>' +
        '<button type="button" class="loc-pw-email-tag-remove" data-email="' + esc(email) + '" aria-label="移除 ' + esc(email) + '">×</button>' +
        '</span>';
    }).join('');
  }

  function locPwApptRecipientsAdd(raw) {
    var emails = locPwParseEmailTokens(raw);
    var addedAny = false;
    var invalidAny = false;
    emails.forEach(function (email) {
      if (!locPwIsValidEmail(email)) {
        invalidAny = true;
        return;
      }
      if (locPwApptRecipientsList.indexOf(email) === -1) {
        locPwApptRecipientsList.push(email);
        addedAny = true;
      }
    });
    locPwRenderApptRecipients();
    return { addedAny: addedAny, invalidAny: invalidAny };
  }

  function locPwApptRecipientsSet(list) {
    locPwApptRecipientsList = (list || []).filter(function (e) { return locPwIsValidEmail(e); });
    locPwRenderApptRecipients();
  }

  function locPwApptRecipientsGet() {
    return locPwApptRecipientsList.slice();
  }

  function locPwInitApptRecipientsInput() {
    var input = document.getElementById('loc-pw-appt-recipients-input');
    var tagsWrap = document.getElementById('loc-pw-appt-recipients-tags');
    if (!input || input._locPwBound) return;
    input._locPwBound = true;

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        var val = input.value.trim().replace(/,+$/, '');
        if (!val) return;
        var result = locPwApptRecipientsAdd(val);
        if (result.invalidAny && !result.addedAny) showToast('请输入有效邮箱地址', 'warning');
        input.value = '';
      } else if (e.key === 'Backspace' && !input.value && locPwApptRecipientsList.length) {
        locPwApptRecipientsList.pop();
        locPwRenderApptRecipients();
      }
    });

    input.addEventListener('blur', function () {
      var val = input.value.trim();
      if (!val) return;
      locPwApptRecipientsAdd(val);
      input.value = '';
    });

    input.addEventListener('paste', function () {
      setTimeout(function () {
        var val = input.value.trim();
        if (!val) return;
        locPwApptRecipientsAdd(val);
        input.value = '';
      }, 0);
    });

    if (tagsWrap) {
      tagsWrap.addEventListener('click', function (e) {
        var btn = e.target.closest('.loc-pw-email-tag-remove');
        if (!btn) return;
        var email = btn.getAttribute('data-email');
        locPwApptRecipientsList = locPwApptRecipientsList.filter(function (x) { return x !== email; });
        locPwRenderApptRecipients();
      });
    }
  }

  function locPwCreateMsSelect(config) {
    var selected = [];
    var inited = false;

    function setOpen(open) {
      var control = document.getElementById(config.controlId);
      var dropdown = document.getElementById(config.dropdownId);
      if (!control || !dropdown) return;
      control.classList.toggle('is-open', open);
      control.setAttribute('aria-expanded', open ? 'true' : 'false');
      dropdown.classList.toggle('is-hidden', !open);
    }

    function refresh() {
      var tagsEl = document.getElementById(config.tagsId);
      var dropdown = document.getElementById(config.dropdownId);
      var clearBtn = config.clearId ? document.getElementById(config.clearId) : null;
      if (!tagsEl || !dropdown) return;
      if (!selected.length) {
        tagsEl.innerHTML = '<span class="ms-select-placeholder">' + esc(config.placeholder) + '</span>';
        if (clearBtn) clearBtn.classList.add('is-hidden');
      } else {
        tagsEl.innerHTML = selected.map(function (name) {
          var labelHtml = typeof config.renderTagLabel === 'function'
            ? config.renderTagLabel(name)
            : '<span>' + esc(name) + '</span>';
          return '<span class="ms-select-tag" data-value="' + esc(name) + '">' +
            labelHtml +
            '<button type="button" class="ms-select-tag-remove" data-value="' + esc(name) + '" aria-label="移除 ' + esc(name) + '">×</button>' +
            '</span>';
        }).join('');
        if (clearBtn) clearBtn.classList.remove('is-hidden');
      }
      dropdown.innerHTML = config.options.map(function (name) {
        var checked = selected.indexOf(name) !== -1;
        var labelHtml = typeof config.renderOptionLabel === 'function'
          ? config.renderOptionLabel(name)
          : '<span class="ms-select-option-label">' + esc(name) + '</span>';
        return '<li class="ms-select-option' + (checked ? ' is-selected' : '') + '" role="option" data-value="' + esc(name) + '" aria-selected="' + checked + '">' +
          labelHtml +
          '<span class="ms-select-option-check">' + (checked ? '✓' : '') + '</span>' +
          '</li>';
      }).join('');
    }

    function notifyChange() {
      if (typeof config.onChange === 'function') config.onChange();
    }

    function toggleValue(val) {
      var idx = selected.indexOf(val);
      if (idx === -1) selected.push(val);
      else selected.splice(idx, 1);
      refresh();
      notifyChange();
    }

    return {
      init: function () {
        if (inited) return;
        var root = document.getElementById(config.rootId);
        var control = document.getElementById(config.controlId);
        var dropdown = document.getElementById(config.dropdownId);
        var tagsEl = document.getElementById(config.tagsId);
        var clearBtn = config.clearId ? document.getElementById(config.clearId) : null;
        if (!root || !control || !dropdown || !tagsEl) return;
        inited = true;
        refresh();

        control.addEventListener('click', function (e) {
          if (e.target.closest('.ms-select-tag-remove') || e.target.closest('.ms-select-clear')) return;
          setOpen(!control.classList.contains('is-open'));
        });

        control.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!control.classList.contains('is-open'));
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        });

        if (clearBtn) {
          clearBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            selected = [];
            refresh();
            notifyChange();
          });
        }

        tagsEl.addEventListener('click', function (e) {
          var btn = e.target.closest('.ms-select-tag-remove');
          if (!btn) return;
          e.stopPropagation();
          toggleValue(btn.getAttribute('data-value'));
        });

        dropdown.addEventListener('click', function (e) {
          var opt = e.target.closest('.ms-select-option');
          if (!opt) return;
          e.stopPropagation();
          toggleValue(opt.getAttribute('data-value'));
        });

        if (!locPwInquiryMsDocBound) {
          locPwInquiryMsDocBound = true;
          document.addEventListener('click', function (e) {
            document.querySelectorAll('#modal-loc-pw-inquiry-email .ms-select-control.is-open').forEach(function (ctrl) {
              var msRoot = ctrl.closest('.ms-select');
              if (msRoot && !msRoot.contains(e.target)) {
                ctrl.classList.remove('is-open');
                ctrl.setAttribute('aria-expanded', 'false');
                var dd = msRoot.querySelector('.ms-select-dropdown');
                if (dd) dd.classList.add('is-hidden');
              }
            });
          });
        }
      },
      getSelected: function () { return selected.slice(); },
      setSelected: function (list) {
        selected = (list || []).slice();
        refresh();
        setOpen(false);
      },
      close: function () { setOpen(false); }
    };
  }

  function locPwInitInquiryMsSelects() {
    if (!locPwInquiryVendorMs) {
      locPwInquiryVendorMs = locPwCreateMsSelect({
        rootId: 'loc-pw-inquiry-vendors-ms',
        controlId: 'loc-pw-inquiry-vendors-control',
        tagsId: 'loc-pw-inquiry-vendors-tags',
        dropdownId: 'loc-pw-inquiry-vendors-dropdown',
        clearId: 'loc-pw-inquiry-vendors-clear',
        placeholder: '请选择供应商',
        options: LOC_PW_INQUIRY_VENDORS,
        renderOptionLabel: function (name) {
          var emails = locPwGetVendorEmails(name);
          var sub = emails.length ? emails.join('; ') : '—';
          return '<span class="ms-select-option-label">' +
            '<span class="ms-select-option-name">' + esc(name) + '</span>' +
            '<span class="ms-select-option-sub" title="' + esc(sub) + '">' + esc(sub) + '</span>' +
            '</span>';
        },
        renderTagLabel: function (name) {
          var emails = locPwGetVendorEmails(name);
          var hint = !emails.length ? '—' : (emails.length === 1 ? emails[0] : (emails.length + ' 个邮箱'));
          var title = emails.join('; ');
          return '<span class="ms-select-tag-text" title="' + esc(title) + '">' +
            '<span class="ms-select-tag-name">' + esc(name) + '</span>' +
            '<span class="ms-select-tag-sub">' + esc(hint) + '</span>' +
            '</span>';
        },
        onChange: locPwSyncInquiryEmailForm
      });
    }
    if (!locPwInquiryDeliveryInstrMs) {
      locPwInquiryDeliveryInstrMs = locPwCreateMsSelect({
        rootId: 'loc-pw-inquiry-delivery-instr-ms',
        controlId: 'loc-pw-inquiry-delivery-instr-control',
        tagsId: 'loc-pw-inquiry-delivery-instr-tags',
        dropdownId: 'loc-pw-inquiry-delivery-instr-dropdown',
        clearId: 'loc-pw-inquiry-delivery-instr-clear',
        placeholder: '请选择 Delivery Instruction',
        options: LOC_PW_DELIVERY_INSTRUCTIONS,
        onChange: locPwSyncInquiryEmailForm
      });
    }
    locPwInquiryVendorMs.init();
    locPwInquiryDeliveryInstrMs.init();
  }

  function locPwGetInquiryVendorsSelected() {
    return locPwInquiryVendorMs ? locPwInquiryVendorMs.getSelected() : [];
  }

  function locPwSetInquiryVendorsSelected(list) {
    if (locPwInquiryVendorMs) locPwInquiryVendorMs.setSelected(list);
  }

  function locPwGetInquiryDeliveryInstrSelected() {
    return locPwInquiryDeliveryInstrMs ? locPwInquiryDeliveryInstrMs.getSelected() : [];
  }

  function locPwSetInquiryDeliveryInstrSelected(list) {
    if (locPwInquiryDeliveryInstrMs) locPwInquiryDeliveryInstrMs.setSelected(list);
  }

  function locPwGetInquiryPickupAddress() {
    return LOC_PW_DEFAULT_PICKUP_ADDRESS;
  }

  function locPwSyncInquiryEmailForm() {
    var bol = ((document.getElementById('loc-pw-inquiry-bol') || {}).value || '').trim();
    var shipmentId = ((document.getElementById('loc-pw-inquiry-shipment') || {}).value || '').trim();
    if (!bol || !shipmentId) return;
    var ship = locPwGetShipmentsForBol(bol).find(function (s) { return s.shipmentId === shipmentId; });
    locPwFillEmailForm('inquiry', 'inquiry', bol, ship, {
      vendors: locPwGetInquiryVendorsSelected().join('、'),
      pickupAddress: locPwGetInquiryPickupAddress(),
      deliveryInstruction: locPwGetInquiryDeliveryInstrSelected().join('; ')
    });
  }

  window.locPwSyncInquiryEmailForm = locPwSyncInquiryEmailForm;

  function locPwRecipientCellHtml(rr) {
    return '<div class="loc-pw-email-recipient-cell">' + esc(rr.email || '—') + '</div>';
  }

  function locPwSimulateApptRecipientResults(emails, body) {
    var allFailReason = body.length < 10 ? '正文过短（演示失败）' : '';
    return emails.map(function (email, idx) {
      if (allFailReason) {
        return { email: email, status: 'failed', failReason: allFailReason };
      }
      if (idx === 1 && emails.length > 1) {
        return { email: email, status: 'failed', failReason: '邮箱地址无效（演示）' };
      }
      return { email: email, status: 'success', failReason: '' };
    });
  }

  function locPwSplitRecipientTokens(raw) {
    return String(raw || '').split(/[、,;]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function locPwRecipientsLookLikeEmails(raw) {
    var tokens = locPwSplitRecipientTokens(raw);
    if (!tokens.length) return false;
    return tokens.every(function (t) { return locPwIsValidEmail(t); });
  }

  function locPwIsInquiryLog(log) {
    if (!log) return false;
    if (log.type === 'inquiry') return true;
    if (log.type === 'appointment') return false;
    if (log.vendorResults && log.vendorResults.length) return true;
    if (log.recipientResults && log.recipientResults.length) return false;
    if (log.recipients && !locPwRecipientsLookLikeEmails(log.recipients)) return true;
    return false;
  }

  function locPwIsAppointmentLog(log) {
    if (!log) return false;
    if (log.type === 'appointment') return true;
    if (log.type === 'inquiry') return false;
    if (log.recipientResults && log.recipientResults.length) return true;
    if (log.recipients && locPwRecipientsLookLikeEmails(log.recipients)) return true;
    return false;
  }

  function locPwGetLogRecipientResults(log) {
    if (log.recipientResults && log.recipientResults.length) return log.recipientResults;
    var emails = locPwSplitRecipientTokens(log.recipients);
    if (!emails.length) return [];
    return emails.map(function (email) {
      return {
        email: email,
        status: log.status === 'success' ? 'success' : (log.status === 'failed' ? 'failed' : 'pending'),
        failReason: log.failReason || ''
      };
    });
  }

  function locPwFormatRecipientSummary(recipientResults) {
    if (!recipientResults || !recipientResults.length) return '—';
    var ok = recipientResults.filter(function (r) { return r.status === 'success'; }).length;
    var fail = recipientResults.length - ok;
    if (!fail) return recipientResults.length + ' 个收件人 · 全部成功';
    if (!ok) return recipientResults.length + ' 个收件人 · 全部失败';
    return recipientResults.length + ' 个 · ' + ok + ' 成功 ' + fail + ' 失败';
  }

  function locPwBuildAppointmentRowSummary(log) {
    var recipientResults = locPwGetLogRecipientResults(log);
    if (!recipientResults.length) {
      var tokens = locPwSplitRecipientTokens(log.recipients);
      if (!tokens.length) return '—';
      recipientResults = tokens.map(function (email) {
        return {
          email: email,
          status: log.status === 'success' ? 'success' : (log.status === 'failed' ? 'failed' : 'pending'),
          failReason: log.failReason || ''
        };
      });
    }
    return locPwFormatRecipientSummary(recipientResults);
  }

  function locPwFormatDecimal2(val) {
    var n = parseFloat(val);
    if (isNaN(n)) return val != null && val !== '' ? String(val) : '—';
    return n.toFixed(2);
  }

  function locPwFormatDimDecimal2(dimStr) {
    if (dimStr == null || dimStr === '') return '—';
    var parts = String(dimStr).split(/[×xX]/);
    if (parts.length <= 1) return locPwFormatDecimal2(dimStr);
    return parts.map(function (p) { return locPwFormatDecimal2(p.trim()); }).join('×');
  }

  function locPwGetShipmentQty(ship) {
    var actCtns = ship.actCtns != null ? ship.actCtns : (ship.ctns != null ? ship.ctns : null);
    var estCtns = ship.estCtns != null ? ship.estCtns : actCtns;
    return {
      estPlts: ship.estPlts != null ? ship.estPlts : '—',
      actPlts: ship.actPlts != null ? ship.actPlts : '—',
      estCtns: estCtns != null ? estCtns : '—',
      actCtns: actCtns != null ? actCtns : '—'
    };
  }

  function locPwSumPalletWeight(pallets) {
    if (!pallets || !pallets.length) return null;
    var sum = 0;
    var has = false;
    pallets.forEach(function (p) {
      var w = parseFloat(p.weight);
      if (!isNaN(w)) {
        sum += w;
        has = true;
      }
    });
    return has ? sum : null;
  }

  function locPwGetEstPalletDetails(ship) {
    var qty = locPwGetShipmentQty(ship);
    var n = Math.max(0, parseInt(qty.estPlts, 10) || 0);
    if (ship.palletDimWeight && ship.palletDimWeight.length) {
      return ship.palletDimWeight.slice(0, n || ship.palletDimWeight.length);
    }
    if (!n) return [];
    var totalCtn = parseInt(qty.estCtns, 10) || 0;
    var baseCtn = totalCtn ? Math.floor(totalCtn / n) : 0;
    var list = [];
    for (var i = 0; i < n; i++) {
      var ctn = totalCtn ? (i === n - 1 ? totalCtn - baseCtn * (n - 1) : baseCtn) : 0;
      list.push({ dim: '48×40×96', weight: 850, ctn: ctn });
    }
    return list;
  }

  function locPwGetShipmentTotalWeight(ship) {
    if (ship.estWeight != null || ship.actWeight != null) {
      return {
        estWeight: ship.estWeight != null ? locPwFormatDecimal2(ship.estWeight) : '—',
        actWeight: ship.actWeight != null ? locPwFormatDecimal2(ship.actWeight) : '—'
      };
    }
    var estSum = locPwSumPalletWeight(locPwGetEstPalletDetails(ship));
    var actSum = locPwSumPalletWeight(locPwGetShipmentPalletDetails(ship));
    return {
      estWeight: estSum != null ? locPwFormatDecimal2(estSum) : '—',
      actWeight: actSum != null ? locPwFormatDecimal2(actSum) : '—'
    };
  }

  function locPwGetShipmentPalletDetails(ship) {
    var qty = locPwGetShipmentQty(ship);
    var n = Math.max(0, parseInt(qty.actPlts, 10) || 0);
    if (ship.palletDimWeight && ship.palletDimWeight.length) {
      return ship.palletDimWeight.slice(0, n || ship.palletDimWeight.length);
    }
    if (!n) return [];
    var totalCtn = parseInt(qty.actCtns, 10) || 0;
    var baseCtn = totalCtn ? Math.floor(totalCtn / n) : 0;
    var list = [];
    for (var i = 0; i < n; i++) {
      var ctn = totalCtn ? (i === n - 1 ? totalCtn - baseCtn * (n - 1) : baseCtn) : 0;
      list.push({ dim: '48×40×96', weight: 850, ctn: ctn });
    }
    return list;
  }

  function locPwFormatPalletDimWeightText(ship) {
    var qty = locPwGetShipmentQty(ship);
    var pallets = locPwGetShipmentPalletDetails(ship);
    if (!pallets.length) return ship.dimensionWeight || '—';
    var lines = [
      '预估板数:' + qty.estPlts + ' · 实际板数:' + qty.actPlts,
      '预报件数:' + qty.estCtns + ' · 实收件数:' + qty.actCtns
    ];
    pallets.forEach(function (p, idx) {
      lines.push('Pallet ' + (idx + 1) + ':' + locPwFormatDimDecimal2(p.dim) + 'IN ' + locPwFormatDecimal2(p.weight) + 'LBS ctn:' + p.ctn);
    });
    return lines.join('\n');
  }

  function locPwShipmentFieldHtml(label, value, mode) {
    var v = (value != null && value !== '') ? String(value) : '—';
    if (mode === 'wrap') {
      return '<div class="loc-pw-sf loc-pw-sf--full loc-pw-sf--wrap"><span class="lbl">' + esc(label) + '</span>' +
        '<div class="val">' + esc(v) + '</div></div>';
    }
    return '<div class="loc-pw-sf loc-pw-sf--inline" title="' + esc(label) + ': ' + esc(v) + '">' +
      '<span class="lbl">' + esc(label) + '</span><span class="val">' + esc(v) + '</span></div>';
  }

  function locPwIsLocalPage() {
    return (typeof window !== 'undefined' && window.LOC_PW_PAGE_VARIANT === 'local');
  }

  function locPwMatchPalletLabelToShip(p, ship) {
    if (!p || !ship) return false;
    // 货件ID 优先（同系统单号多货件时靠后缀区分，如 TLP…-0001）
    if (ship.shipmentId && p.shipmentId && String(ship.shipmentId).trim() === String(p.shipmentId).trim()) return true;
    if (ship.sysNo && p.sysNo && String(ship.sysNo).trim() === String(p.sysNo).trim()) {
      // 板标未带货件ID 时才用系统单号；若板标已带货件ID 则不得仅凭系统单号命中
      if (!p.shipmentId) return true;
    }
    if (ship.container && p.container && String(ship.container).trim() === String(p.container).trim()) {
      // 同柜合板时优先靠 sysNo/shipmentId 区分；都缺时才退回柜号
      if (!ship.sysNo && !p.sysNo && !ship.shipmentId && !p.shipmentId) return true;
    }
    return false;
  }

  function locPwBuildFallbackPalletLabelsForShip(bol, ship) {
    var qty = locPwGetShipmentQty(ship);
    var n = Math.max(0, parseInt(qty.actPlts, 10) || 0);
    if (!n) n = 1;
    var key = (ship.sysNo || bol || 'BOL').replace(/[^A-Za-z0-9]/g, '');
    var dw = ship.palletDimWeight || [];
    var list = [];
    for (var i = 1; i <= n; i++) {
      var d = dw[i - 1] || {};
      list.push({
        pltNo: 'PLT-' + key + '-' + String(i).padStart(2, '0'),
        pieces: d.ctn != null ? d.ctn : (qty.actCtns && n ? Math.floor(qty.actCtns / n) : '—'),
        container: ship.container,
        sysNo: ship.sysNo,
        shipmentId: ship.shipmentId,
        dim: d.dim,
        weight: d.weight
      });
    }
    return list;
  }

  function locPwEnrichPalletLabelsWithDimWeight(labels, ship) {
    var dw = ship.palletDimWeight || [];
    return labels.map(function (p, i) {
      var d = dw[i] || {};
      return Object.assign({}, p, {
        pieces: p.pieces != null ? p.pieces : (d.ctn != null ? d.ctn : '—'),
        dim: p.dim || d.dim || '',
        weight: p.weight != null && p.weight !== '' ? p.weight : (d.weight != null ? d.weight : '')
      });
    });
  }

  function locPwGetShipmentPalletLabels(bol, ship) {
    var all = locPwGetPalletLabelsForBol(bol);
    /* 拆分/详情：只保留本 BOL 实际出库板标（有 assignedBol 时按归属过滤） */
    all = all.filter(function (p) {
      var owner = String(p.assignedBol || '').trim();
      return !owner || owner === String(bol || '').trim();
    });
    var filtered = all.filter(function (p) { return locPwMatchPalletLabelToShip(p, ship); });
    var qty = locPwGetShipmentQty(ship);
    var n = Math.max(0, parseInt(qty.actPlts, 10) || 0);
    if (!filtered.length) {
      filtered = locPwBuildFallbackPalletLabelsForShip(bol, ship);
    } else if (n && filtered.length > n) {
      filtered = filtered.slice(0, n);
    }
    return locPwEnrichPalletLabelsWithDimWeight(filtered, ship);
  }

  function locPwBuildPalletLabelTableHtml(labels, ship, opts) {
    opts = opts || {};
    if (!labels.length) return '';
    var enriched = locPwEnrichPalletLabelsWithDimWeight(labels, ship || {});
    var splitView = !!opts.splitView;
    var currentBol = String(opts.splitBol || '').trim();
    var thead = '<thead><tr><th>#</th><th>板标号</th>' +
      (splitView ? '<th>归属</th>' : '') +
      '<th>尺寸 (IN)</th><th>重量 (LBS)</th><th>件数</th></tr></thead>';
    var rows = enriched.map(function (p, idx) {
      var ownerBol = String(p.assignedBol || '').trim();
      var isSelf = !splitView || !ownerBol || ownerBol === currentBol;
      var ownerHtml = '';
      if (splitView) {
        ownerHtml = isSelf
          ? '<td><span class="loc-pw-plt-owner loc-pw-plt-owner--self">本 BOL</span></td>'
          : '<td><span class="loc-pw-plt-owner loc-pw-plt-owner--other" title="归属拆分子单 ' + esc(ownerBol) + '">其他 · ' + esc(ownerBol) + '</span></td>';
      }
      return '<tr class="' + (splitView && !isSelf ? 'loc-pw-plt-row--other' : (splitView ? 'loc-pw-plt-row--self' : '')) + '">' +
        '<td class="loc-pw-plt-td-idx">' + (idx + 1) + '</td>' +
        '<td><strong>' + esc(p.pltNo || '—') + '</strong></td>' +
        ownerHtml +
        '<td>' + esc(p.dim ? locPwFormatDimDecimal2(p.dim) : '—') + '</td>' +
        '<td>' + esc(p.weight != null && p.weight !== '' ? locPwFormatDecimal2(p.weight) : '—') + '</td>' +
        '<td>' + esc(p.pieces != null ? p.pieces : '—') + '</td></tr>';
    }).join('');
    return '<div class="loc-pw-plt-detail-scroll">' +
      '<table class="loc-pw-plt-detail-table' + (splitView ? ' loc-pw-plt-detail-table--split' : '') + '">' +
      thead + '<tbody>' + rows + '</tbody></table></div>';
  }

  function locPwBuildPalletDimWeightHtml(ship) {
    return locPwBuildQtyOverviewHtml(ship);
  }

  window.locPwToggleShipDetail = function (btn) {
    var wrap = btn.closest('.loc-pw-ship-detail-wrap');
    if (!wrap) return;
    var panel = wrap.querySelector('.loc-pw-ship-detail-panel');
    if (!panel) return;
    var arrow = btn.querySelector('.loc-pw-ship-detail-toggle-arrow');
    var lbl = btn.querySelector('.loc-pw-ship-detail-toggle-lbl');
    var expandLbl = btn.getAttribute('data-expand-lbl') || '查看详情';
    var collapseLbl = btn.getAttribute('data-collapse-lbl') || '收起';
    var open = panel.hasAttribute('hidden');
    if (open) {
      panel.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
      if (arrow) arrow.textContent = '▲';
      if (lbl) lbl.textContent = collapseLbl;
    } else {
      panel.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
      if (arrow) arrow.textContent = '▼';
      if (lbl) lbl.textContent = expandLbl;
    }
  };

  window.locPwToggleShipCard = function (btn) {
    var card = btn && btn.closest ? btn.closest('.loc-pw-shipment-card') : null;
    if (!card) return;
    var body = card.querySelector('.loc-pw-shipment-card-body');
    if (!body) return;
    var arrow = btn.querySelector('.loc-pw-shipment-card-toggle-arrow');
    var open = body.hasAttribute('hidden');
    if (open) {
      body.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
      btn.title = '收起货件';
      card.classList.remove('loc-pw-shipment-card--collapsed');
      if (arrow) arrow.textContent = '▼';
    } else {
      body.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
      btn.title = '展开货件';
      card.classList.add('loc-pw-shipment-card--collapsed');
      if (arrow) arrow.textContent = '▶';
    }
  };

  function locPwFormatQtyPlts(val) {
    var n = parseFloat(val);
    return isNaN(n) ? (val != null && val !== '' ? String(val) : '—') : locPwFormatDecimal2(n);
  }

  function locPwFormatQtyCtns(val) {
    var n = parseFloat(val);
    if (isNaN(n)) return val != null && val !== '' ? String(val) : '—';
    return Number.isInteger(n) ? String(Math.trunc(n)) : locPwFormatDecimal2(n);
  }

  function locPwFormatQtyLineText(plts, ctns, wt) {
    return locPwFormatQtyPlts(plts) + '板，' + locPwFormatQtyCtns(ctns) + '件，' + wt + 'LBS';
  }

  function locPwBuildActQtyLineValHtml(actPlts, actCtns, actWeight, splitRatio) {
    var ctnsPart = locPwFormatQtyCtns(actCtns) + '件，' + (actWeight != null ? actWeight : '—') + 'LBS';
    if (splitRatio && splitRatio.current != null && splitRatio.total != null && splitRatio.total > 0) {
      return '<span class="loc-pw-act-plts loc-pw-act-plts--split" title="当前出库板数 / 原 BOL 总板数">' +
        esc(String(Math.round(splitRatio.current))) + '/' + esc(String(Math.round(splitRatio.total))) +
        '</span>板，' + esc(ctnsPart);
    }
    return esc(locPwFormatQtyLineText(actPlts, actCtns, actWeight));
  }

  function locPwBuildQtyLinesHtml(ship, opts) {
    opts = opts || {};
    var qty = locPwGetShipmentQty(ship);
    var wt = locPwGetShipmentTotalWeight(ship);
    var estLine = locPwFormatQtyLineText(qty.estPlts, qty.estCtns, wt.estWeight);
    var actValHtml = locPwBuildActQtyLineValHtml(qty.actPlts, qty.actCtns, wt.actWeight, opts.splitRatio);
    return '<div class="loc-pw-qty-lines">' +
      '<div class="loc-pw-qty-line loc-pw-qty-line--est">' +
      '<span class="loc-pw-qty-line-tag">预估</span>' +
      '<span class="loc-pw-qty-line-val">' + esc(estLine) + '</span>' +
      '</div>' +
      '<div class="loc-pw-qty-line loc-pw-qty-line--act">' +
      '<span class="loc-pw-qty-line-tag">实际</span>' +
      '<span class="loc-pw-qty-line-val">' + actValHtml + '</span>' +
      '</div></div>';
  }

  function locPwBuildQtyOverviewHtml(ship) {
    return '<div class="loc-pw-qty-overview">' +
      '<div class="loc-pw-qty-overview-hd">货量总览</div>' +
      locPwBuildQtyLinesHtml(ship) + '</div>';
  }

  function locPwBuildQtyPanelPalletHtml(labels, ship, opts) {
    opts = opts || {};
    if (!labels.length) return '';
    var splitView = !!opts.splitView;
    var currentBol = String(opts.splitBol || '').trim();
    var selfCount = 0;
    if (splitView && currentBol) {
      labels.forEach(function (p) {
        var owner = String(p.assignedBol || '').trim();
        if (!owner || owner === currentBol) selfCount += 1;
      });
    }
    var countHtml = splitView
      ? '<span class="loc-pw-ship-extra-count">本单 ' + selfCount + ' / 共 ' + labels.length + ' 板</span>'
      : '<span class="loc-pw-ship-extra-count">' + labels.length + ' 板</span>';
    var hd = '<div class="loc-pw-qty-panel-plt-hd">板标明细' + countHtml + '</div>';
    var table = locPwBuildPalletLabelTableHtml(labels, ship, opts);
    if (labels.length <= 3 || (splitView && labels.length <= 6)) {
      return '<div class="loc-pw-qty-panel-plt">' + hd + table + '</div>';
    }
    var expandLbl = splitView
      ? ('查看板标明细（本单 ' + selfCount + ' / 共 ' + labels.length + ' 板）')
      : ('查看板标明细（' + labels.length + ' 板）');
    return '<div class="loc-pw-qty-panel-plt">' + hd +
      '<div class="loc-pw-ship-detail-wrap loc-pw-ship-detail-wrap--plt">' +
      '<button type="button" class="loc-pw-ship-detail-toggle" aria-expanded="false" onclick="locPwToggleShipDetail(this)"' +
      ' data-expand-lbl="' + esc(expandLbl) + '" data-collapse-lbl="收起板标明细">' +
      '<span class="loc-pw-ship-detail-toggle-arrow" aria-hidden="true">▼</span>' +
      '<span class="loc-pw-ship-detail-toggle-lbl">' + esc(expandLbl) + '</span>' +
      '</button>' +
      '<div class="loc-pw-ship-detail-panel" hidden>' + table + '</div>' +
      '</div></div>';
  }

  function locPwBuildApptFilesChipsHtml(files) {
    return (files || []).map(function (f) {
      var name = (f && f.name) ? f.name : String(f);
      return '<a class="loc-pw-appt-req-file" href="#" onclick="showToast(\'下载 ' + esc(name) + '\');return false;" title="' + esc(name) + '">' +
        '📄 ' + esc(name) + '</a>';
    }).join('');
  }

  function locPwBuildApptFilesBlockHtml(files) {
    var list = (files && files.length) ? files : [];
    var body = list.length
      ? '<div class="loc-pw-appt-req-files loc-pw-appt-req-files--inline">' + locPwBuildApptFilesChipsHtml(list) + '</div>'
      : '<div class="loc-pw-ship-extra-empty">—</div>';
    return '<div class="loc-pw-ship-extra-block loc-pw-ship-extra-block--files">' +
      '<div class="loc-pw-ship-extra-hd">预约文件<span class="loc-pw-ship-extra-count">' + list.length + ' 个</span></div>' +
      body +
      '</div>';
  }

  function locPwBuildApptSectionHtml(ship) {
    var reqHtml = locPwBuildApptRequirementPanelHtml(ship);
    var files = (ship.apptFiles && ship.apptFiles.length) ? ship.apptFiles : [];
    return '<div class="loc-pw-shipment-appt-section loc-pw-shipment-appt-section--pair">' +
      reqHtml + locPwBuildApptFilesBlockHtml(files) + '</div>';
  }

  function locPwDevanningPhotoPlaceholderSrc(name, idx) {
    var hues = [210, 24, 160, 280, 40];
    var h = hues[(idx || 0) % hues.length];
    var shortName = String(name || '拆柜照片').replace(/[<>&"']/g, '').slice(0, 14);
    return 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">' +
      '<rect width="160" height="160" fill="hsl(' + h + ' 42% 90%)"/>' +
      '<rect x="28" y="36" width="104" height="78" rx="8" fill="hsl(' + h + ' 38% 78%)"/>' +
      '<circle cx="56" cy="62" r="10" fill="hsl(' + h + ' 35% 62%)"/>' +
      '<path d="M40 104 L68 76 L92 96 L112 70 L132 104 Z" fill="hsl(' + h + ' 40% 55%)"/>' +
      '<text x="80" y="142" text-anchor="middle" fill="hsl(' + h + ' 30% 38%)" font-size="11" font-family="sans-serif">' + shortName + '</text>' +
      '</svg>'
    );
  }

  function locPwBuildDevanningFeedbackPanelHtml(ship) {
    var raw = ship && ship.abnormalFeedback;
    var has = raw != null && String(raw).trim() !== '' && String(raw) !== '—';
    if (!has) {
      return '<div class="loc-pw-appt-req-panel loc-pw-devan-fb-panel loc-pw-appt-req-panel--empty">' +
        '<div class="loc-pw-appt-req-hd loc-pw-devan-fb-hd">拆柜异常反馈</div>' +
        '<div class="loc-pw-appt-req-empty">—</div></div>';
    }
    return '<div class="loc-pw-appt-req-panel loc-pw-devan-fb-panel">' +
      '<div class="loc-pw-appt-req-hd loc-pw-devan-fb-hd">拆柜异常反馈</div>' +
      '<div class="loc-pw-appt-req-body loc-pw-appt-req-body--inline">' + esc(String(raw)) + '</div></div>';
  }

  function locPwBuildDevanningPhotosBlockHtml(photos) {
    var list = (photos && photos.length) ? photos : [];
    var body;
    if (!list.length) {
      body = '<div class="loc-pw-ship-extra-empty">—</div>';
    } else {
      body = '<div class="issue-photo-grid issue-photo-grid--readonly loc-pw-devan-photo-grid">' +
        list.map(function (p, i) {
          var name = (p && p.name) ? String(p.name) : ('拆柜照片-' + (i + 1) + '.jpg');
          var src = (p && p.url) ? String(p.url) : locPwDevanningPhotoPlaceholderSrc(name, i);
          var safeName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          return '<button type="button" class="issue-photo-card loc-pw-devan-photo-card" title="' + esc(name) + '"' +
            ' onclick="locPwPreviewDevanningPhoto(\'' + safeName + '\')">' +
            '<img src="' + esc(src) + '" alt="' + esc(name) + '">' +
            '<span class="issue-photo-name">' + esc(name) + '</span></button>';
        }).join('') + '</div>';
    }
    return '<div class="loc-pw-ship-extra-block loc-pw-ship-extra-block--files loc-pw-devan-photos-block">' +
      '<div class="loc-pw-ship-extra-hd">拆柜照片<span class="loc-pw-ship-extra-count">' + list.length + ' 张</span></div>' +
      body +
      '</div>';
  }

  function locPwBuildDevanningExceptionHtml(ship) {
    return '<div class="loc-pw-shipment-appt-section loc-pw-shipment-appt-section--pair loc-pw-shipment-devan-section">' +
      locPwBuildDevanningFeedbackPanelHtml(ship) +
      locPwBuildDevanningPhotosBlockHtml(ship && ship.devanningPhotos) +
      '</div>';
  }

  window.locPwPreviewDevanningPhoto = function (name) {
    showToast('查看拆柜照片（演示）：' + (name || '—'));
  };

  function locPwBuildQtySectionHtml(bol, ship, opts) {
    opts = opts || {};
    var labels = locPwGetShipmentPalletLabels(bol, ship);
    return '<div class="loc-pw-qty-panel">' +
      '<div class="loc-pw-qty-panel-hd">货量总览</div>' +
      locPwBuildQtyLinesHtml(ship, { splitRatio: opts.splitRatio }) +
      locPwBuildQtyPanelPalletHtml(labels, ship) +
      '</div>';
  }

  /** 合板货件卡：仅预估板数 / 预报件数（实际与板标下沉到整单） */
  function locPwBuildMergePalletShipForecastHtml(ship) {
    var qty = locPwGetShipmentQty(ship);
    var wt = locPwGetShipmentTotalWeight(ship);
    return '<div class="loc-pw-qty-panel loc-pw-qty-panel--forecast-only">' +
      '<div class="loc-pw-qty-panel-hd">预报数据</div>' +
      '<div class="loc-pw-forecast-grid">' +
      '<div class="loc-pw-forecast-cell"><span class="lbl">预估板数</span><span class="val">' + esc(locPwFormatQtyPlts(qty.estPlts)) + '</span></div>' +
      '<div class="loc-pw-forecast-cell"><span class="lbl">预报件数</span><span class="val">' + esc(locPwFormatQtyCtns(qty.estCtns)) + '</span></div>' +
      '<div class="loc-pw-forecast-cell"><span class="lbl">预报重量</span><span class="val">' + esc(wt.estWeight) + (wt.estWeight !== '—' ? ' LBS' : '') + '</span></div>' +
      '</div></div>';
  }

  function locPwResolveShipForPalletLabel(shipments, p) {
    var list = shipments || [];
    for (var i = 0; i < list.length; i++) {
      if (locPwMatchPalletLabelToShip(p, list[i])) return list[i];
    }
    return null;
  }

  function locPwCollectMergePalletLabels(bol, shipments) {
    var ships = shipments || locPwGetShipmentsForBol(bol);
    var bolKey = String(bol || '').trim();
    var all = locPwGetPalletLabelsForBol(bol).filter(function (p) {
      var owner = String(p.assignedBol || '').trim();
      return !owner || owner === bolKey;
    });
    var out = [];
    if (all.length) {
      all.forEach(function (p) {
        var ship = locPwResolveShipForPalletLabel(ships, p);
        if (!ship && ships.length) return;
        var enriched = locPwEnrichPalletLabelsWithDimWeight([Object.assign({}, p)], ship || {})[0];
        enriched._ship = ship;
        out.push(enriched);
      });
      if (out.length) return out;
    }
    ships.forEach(function (ship) {
      var originKey = locPwGetShipOriginBol(ship) || bol;
      var fromOrigin = locPwGetPalletLabelsForBol(originKey).filter(function (p) {
        var owner = String(p.assignedBol || '').trim();
        if (owner && owner !== bolKey && owner !== String(originKey).trim()) return false;
        return locPwMatchPalletLabelToShip(p, ship);
      });
      var list = fromOrigin.length ? locPwEnrichPalletLabelsWithDimWeight(fromOrigin, ship) : locPwGetShipmentPalletLabels(bol, ship);
      list.forEach(function (p) {
        p._ship = ship;
        out.push(p);
      });
    });
    return out;
  }

  function locPwParseWeightNum(val) {
    if (val == null || val === '' || val === '—') return null;
    var n = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(n) ? null : n;
  }

  function locPwAggregateShipmentsQtyWeight(shipments, labels) {
    var estPlts = 0;
    var actPlts = 0;
    var estCtns = 0;
    var actCtns = 0;
    var estW = 0;
    var actW = 0;
    var hasEstW = false;
    var hasActW = false;
    (shipments || []).forEach(function (ship) {
      var qty = locPwGetShipmentQty(ship);
      estPlts += parseFloat(qty.estPlts) || 0;
      actPlts += parseFloat(qty.actPlts) || 0;
      estCtns += parseFloat(qty.estCtns) || 0;
      actCtns += parseFloat(qty.actCtns) || 0;
      var wt = locPwGetShipmentTotalWeight(ship);
      var ew = locPwParseWeightNum(wt.estWeight);
      var aw = locPwParseWeightNum(wt.actWeight);
      if (ew != null) { estW += ew; hasEstW = true; }
      if (aw != null) { actW += aw; hasActW = true; }
    });
    if (labels && labels.length) {
      actPlts = labels.length;
      var pieceSum = 0;
      var hasPiece = false;
      var wSum = 0;
      var hasW = false;
      labels.forEach(function (p) {
        var pc = parseFloat(p.pieces);
        if (!isNaN(pc)) { pieceSum += pc; hasPiece = true; }
        var w = parseFloat(p.weight);
        if (!isNaN(w)) { wSum += w; hasW = true; }
      });
      if (hasPiece) actCtns = pieceSum;
      if (hasW) { actW = wSum; hasActW = true; }
    }
    return {
      estPlts: estPlts,
      actPlts: actPlts,
      estCtns: estCtns,
      actCtns: actCtns,
      estWeight: hasEstW ? locPwFormatDecimal2(estW) : '—',
      actWeight: hasActW ? locPwFormatDecimal2(actW) : '—'
    };
  }

  function locPwBuildQtyLinesFromAgg(agg, opts) {
    opts = opts || {};
    var estLine = locPwFormatQtyLineText(agg.estPlts, agg.estCtns, agg.estWeight);
    var actValHtml = locPwBuildActQtyLineValHtml(agg.actPlts, agg.actCtns, agg.actWeight, opts.splitRatio);
    return '<div class="loc-pw-qty-lines">' +
      '<div class="loc-pw-qty-line loc-pw-qty-line--est">' +
      '<span class="loc-pw-qty-line-tag">预估</span>' +
      '<span class="loc-pw-qty-line-val">' + esc(estLine) + '</span>' +
      '</div>' +
      '<div class="loc-pw-qty-line loc-pw-qty-line--act">' +
      '<span class="loc-pw-qty-line-tag">实际</span>' +
      '<span class="loc-pw-qty-line-val">' + actValHtml + '</span>' +
      '</div></div>';
  }

  function locPwResolveSplitRatioForBol(bol, tr, actPltsFallback) {
    if (!locPwShouldShowSplitActPltsRatio(tr)) return null;
    var current = locPwGetRowActPltsCurrent(tr);
    if (!(current > 0) && actPltsFallback != null) {
      current = parseFloat(actPltsFallback) || 0;
    }
    var total = locPwGetSplitOriginPalletTotal(tr);
    if (!(total > 0)) return null;
    return { current: current, total: total };
  }

  function locPwBuildMergePalletBolPalletSectionHtml(bol, shipments, opts) {
    opts = opts || {};
    var labelBol = opts.labelBol || bol;
    var ships = shipments || locPwGetShipmentsForBol(bol);
    var labels = locPwCollectMergePalletLabels(labelBol, ships);
    if (!labels.length && labelBol !== bol) {
      labels = locPwCollectMergePalletLabels(bol, ships);
    }
    var agg = locPwAggregateShipmentsQtyWeight(ships, labels);
    /* 合板实际板数以板标（合并打板）为准 */
    if (labels.length) agg.actPlts = labels.length;
    var splitRatio = opts.splitRatio || null;
    if (splitRatio && splitRatio.total > 0) {
      agg.actPlts = splitRatio.current;
    }
    var pltHtml = labels.length
      ? locPwBuildQtyPanelPalletHtml(labels, null)
      : '<div class="loc-pw-qty-panel-plt"><div class="loc-pw-qty-panel-plt-hd">板标明细</div>' +
        '<div class="loc-pw-ship-extra-empty">暂无板标</div></div>';
    return '<div class="loc-pw-qty-panel loc-pw-merge-pallet-section">' +
      '<div class="loc-pw-qty-panel-hd">货量总览</div>' +
      locPwBuildQtyLinesFromAgg(agg, { splitRatio: splitRatio }) +
      pltHtml +
      '</div>';
  }

  function locPwBolEmailStatusSummary(bol, shipments, type) {
    var total = (shipments || []).length;
    if (!total) return { text: '未发送', cls: 'loc-pw-eml-st--none' };
    var sent = 0;
    var failed = 0;
    shipments.forEach(function (s) {
      var st = locPwEmailStatusLabel(locPwGetShipmentEmailLogs(bol, s.shipmentId), type);
      if (st.cls === 'loc-pw-eml-st--ok') sent++;
      else if (st.cls === 'loc-pw-eml-st--partial') sent++;
      else if (st.cls === 'loc-pw-eml-st--fail') failed++;
    });
    if (sent === total) return { text: '已发送', cls: 'loc-pw-eml-st--ok' };
    if (sent > 0) return { text: sent + '/' + total + ' 已发', cls: 'loc-pw-eml-st--partial' };
    if (failed > 0) return { text: '发送失败', cls: 'loc-pw-eml-st--fail' };
    return { text: '未发送', cls: 'loc-pw-eml-st--none' };
  }

  function locPwBuildMergePalletBolEmailBarHtml(bol, shipments, canEmail) {
    var inqSt = locPwBolEmailStatusSummary(bol, shipments, 'inquiry');
    var apptSt = locPwBolEmailStatusSummary(bol, shipments, 'appointment');
    var safeBolJs = String(bol).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var firstId = shipments[0] && shipments[0].shipmentId ? String(shipments[0].shipmentId) : '';
    var safeShipJs = firstId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var statusHtml = '<div class="loc-pw-bol-email-status">' +
      '<span class="loc-pw-eml-st ' + inqSt.cls + '">询价' + inqSt.text + '</span>' +
      '<span class="loc-pw-shipment-email-dot">·</span>' +
      '<span class="loc-pw-eml-st ' + apptSt.cls + '">预约' + apptSt.text + '</span>' +
      '</div>';
    var actions = canEmail
      ? '<div class="loc-pw-bol-email-actions">' +
        '<button type="button" class="btn btn-default btn-xs" onclick="locPwOpenInquiryEmail(\'' + safeBolJs + '\',\'' + safeShipJs + '\')">📧 询价邮件</button>' +
        '<button type="button" class="btn btn-default btn-xs" onclick="locPwOpenApptEmail(\'' + safeBolJs + '\',\'' + safeShipJs + '\')">📅 预约邮件</button>' +
        '</div>'
      : '';
    return '<div class="loc-pw-bol-email-bar">' + statusHtml + actions + '</div>';
  }

  function locPwBuildMergePalletShipCardHtml(bol, s, idx, opts) {
    opts = opts || {};
    var custRef = locPwGetShipmentRef(s);
    var metaBol = opts.hideOriginMeta ? (locPwGetShipOriginBol(s) || bol) : bol;
    var expanded = opts.expanded != null ? !!opts.expanded : idx === 0;
    var titleHtml =
      '<span class="loc-pw-shipment-card-title-main">货件 ' + (idx + 1) + '</span>' +
      '<span class="loc-pw-shipment-card-ids" title="客户单号">' +
      '<span class="loc-pw-shipment-ref">' + esc(custRef) + '</span>' +
      '</span>' +
      locPwShipHeaderMetaHtml(s, metaBol);
    return '<div class="loc-pw-shipment-card loc-pw-shipment-card--merge-pallet' +
      (expanded ? '' : ' loc-pw-shipment-card--collapsed') +
      '" id="loc-pw-ship-card-' + idx + '">' +
      '<div class="loc-pw-shipment-card-hd">' +
      '<div class="loc-pw-shipment-card-hd-main">' +
      '<button type="button" class="loc-pw-shipment-card-toggle" aria-expanded="' + (expanded ? 'true' : 'false') + '" ' +
      'title="' + (expanded ? '收起货件' : '展开货件') + '" onclick="locPwToggleShipCard(this)">' +
      '<span class="loc-pw-shipment-card-toggle-arrow" aria-hidden="true">' + (expanded ? '▼' : '▶') + '</span>' +
      '<span class="loc-pw-shipment-card-title">' + titleHtml + '</span>' +
      '</button>' +
      '</div></div>' +
      '<div class="loc-pw-shipment-card-body"' + (expanded ? '' : ' hidden') + '>' +
      locPwBuildRefBarHtml(s) +
      locPwBuildApptSectionHtml(s) +
      locPwBuildDevanningExceptionHtml(s) +
      locPwBuildMergePalletShipForecastHtml(s) +
      '</div></div>';
  }

  /** 合并发货：按原 BOL 分组货件 */
  function locPwGroupShipmentsByOriginBol(shipments, parentBol) {
    var order = [];
    var map = {};
    (shipments || []).forEach(function (s) {
      var key = locPwGetShipOriginBol(s) || parentBol;
      if (!map[key]) {
        map[key] = [];
        order.push(key);
      }
      map[key].push(s);
    });
    return order.map(function (originBol) {
      return { originBol: originBol, shipments: map[originBol] };
    });
  }

  function locPwBuildMergeShipOriginGroupHtml(parentBol, originBol, groupShips, canEmail) {
    var originTr = locPwFindRow(originBol);
    var mergeTag = originTr && locPwIsMergePallet(originTr)
      ? '<span class="loc-pw-merge-pallet-tag" title="该原 BOL 为合板">合板</span>'
      : '';
    var plts = groupShips.reduce(function (n, s) { return n + (parseInt(locPwGetShipmentQty(s).actPlts, 10) || 0); }, 0);
    if (originTr && locPwIsMergePallet(originTr)) {
      var gLabels = locPwCollectMergePalletLabels(originBol, groupShips);
      if (gLabels.length) plts = gLabels.length;
    }
    if (originTr) {
      var outbound = locPwGetRowActPltsCurrent(originTr);
      if (outbound > 0) plts = outbound;
    }
    var ctns = groupShips.reduce(function (n, s) { return n + (parseInt(locPwGetShipmentQty(s).actCtns, 10) || 0); }, 0);
    var hd = '<div class="loc-pw-merge-ship-group-hd">' +
      '<div class="loc-pw-merge-ship-group-title">' +
      '<span class="loc-pw-merge-ship-group-bol">' + esc(originBol) + '</span>' +
      mergeTag +
      '<span class="loc-pw-merge-ship-group-meta">' + groupShips.length + ' 个货件 · ' + plts + ' 板 · ' + ctns + ' 件</span>' +
      '</div>' +
      locPwBuildMergePalletBolEmailBarHtml(parentBol, groupShips, canEmail) +
      '</div>';
    var cards = groupShips.map(function (s, i) {
      return locPwBuildMergePalletShipCardHtml(parentBol, s, i, { hideOriginMeta: true });
    }).join('');
    /* 合并发货详情：各组只展示该原 BOL 实际出库板标，不展开拆分全量、不标红比例 */
    var pallet = locPwBuildMergePalletBolPalletSectionHtml(originBol, groupShips, {
      labelBol: originBol
    });
    var records = locPwBuildBolEmailRecordsSectionHtml(parentBol, groupShips);
    return '<div class="loc-pw-merge-ship-group" data-origin-bol="' + esc(originBol) + '">' +
      hd + cards + pallet + records + '</div>';
  }

  function locPwBuildMergeShipBolDetailHtml(parentBol, shipments, canEmail) {
    var groups = locPwGroupShipmentsByOriginBol(shipments, parentBol);
    return groups.map(function (g) {
      return locPwBuildMergeShipOriginGroupHtml(parentBol, g.originBol, g.shipments, canEmail);
    }).join('');
  }

  function locPwPopulateEmailShipSelect(prefix, bol, selectedId) {
    var field = document.getElementById('loc-pw-' + prefix + '-ship-field');
    var sel = document.getElementById('loc-pw-' + prefix + '-ship-select');
    if (!field || !sel) return;
    var ships = locPwGetShipmentsForBol(bol);
    if (ships.length <= 1) {
      field.style.display = 'none';
      sel.innerHTML = '';
      return;
    }
    field.style.display = '';
    var cur = selectedId || (ships[0] && ships[0].shipmentId) || '';
    sel.innerHTML = ships.map(function (s) {
      var id = String(s.shipmentId || '');
      var label = id + ' · ' + locPwGetShipmentRef(s);
      return '<option value="' + esc(id) + '"' + (id === cur ? ' selected' : '') + '>' + esc(label) + '</option>';
    }).join('');
  }

  window.locPwOnEmailShipChange = function (prefix) {
    var bolEl = document.getElementById('loc-pw-' + prefix + '-bol');
    var sel = document.getElementById('loc-pw-' + prefix + '-ship-select');
    if (!bolEl || !sel) return;
    var bol = (bolEl.value || '').trim();
    var shipmentId = (sel.value || '').trim();
    locPwSetHidden('loc-pw-' + prefix + '-shipment', shipmentId);
    var ship = locPwGetShipmentsForBol(bol).find(function (s) { return s.shipmentId === shipmentId; });
    var shipRef = ship ? locPwGetShipmentRef(ship) : shipmentId;
    if (prefix === 'inquiry') {
      var sum = document.getElementById('loc-pw-inquiry-summary');
      if (sum && ship) sum.innerHTML = locPwBuildEmailShipSummaryHtml(ship);
      locPwFillEmailForm('inquiry', 'inquiry', bol, ship, {});
      locPwSyncInquiryEmailForm();
      var title = document.getElementById('loc-pw-inquiry-title');
      if (title) title.textContent = '发送询价邮件 · ' + shipRef;
    } else if (prefix === 'appt') {
      var defaultRecipients = ship && ship.email && locPwIsValidEmail(ship.email) ? [ship.email] : [];
      locPwApptRecipientsSet(defaultRecipients);
      var recipInput = document.getElementById('loc-pw-appt-recipients-input');
      if (recipInput) recipInput.value = '';
      locPwFillEmailForm('appt', 'appointment', bol, ship, {});
      var apptSum = document.getElementById('loc-pw-appt-summary');
      if (apptSum && ship) apptSum.innerHTML = locPwBuildEmailShipSummaryHtml(ship);
      var apptTitle = document.getElementById('loc-pw-appt-title');
      if (apptTitle) apptTitle.textContent = '发送预约邮件 · ' + shipRef;
    }
  };

  function locPwBuildApptRequirementPanelHtml(ship) {
    var reqRaw = ship.apptRequirement;
    var hasReq = reqRaw != null && reqRaw !== '' && String(reqRaw) !== '—';
    if (!hasReq) {
      return '<div class="loc-pw-appt-req-panel loc-pw-appt-req-panel--empty">' +
        '<div class="loc-pw-appt-req-hd">预约要求</div>' +
        '<div class="loc-pw-appt-req-empty">—</div></div>';
    }
    return '<div class="loc-pw-appt-req-panel">' +
      '<div class="loc-pw-appt-req-hd">预约要求</div>' +
      '<div class="loc-pw-appt-req-body loc-pw-appt-req-body--inline">' + esc(String(reqRaw)) + '</div></div>';
  }

  function locPwRefBarCellHtml(label, value, linkType, extraCls) {
    var v = (value != null && value !== '') ? String(value) : '—';
    var valHtml;
    if (linkType === 'email' && v !== '—') {
      valHtml = '<a class="loc-pw-ref-val loc-pw-ref-val--link" href="mailto:' + esc(v) + '" title="' + esc(v) + '">' + esc(v) + '</a>';
    } else if (linkType === 'tel' && v !== '—') {
      valHtml = '<a class="loc-pw-ref-val loc-pw-ref-val--link" href="tel:' + esc(v.replace(/\s/g, '')) + '" title="' + esc(v) + '">' + esc(v) + '</a>';
    } else {
      valHtml = '<span class="loc-pw-ref-val">' + esc(v) + '</span>';
    }
    var cellCls = (linkType ? ' loc-pw-ref-cell--' + linkType : '') + (extraCls ? ' ' + extraCls : '');
    return '<div class="loc-pw-ref-cell' + cellCls + '" title="' + esc(label) + ': ' + esc(v) + '">' +
      '<span class="loc-pw-ref-lbl">' + esc(label) + '</span>' + valHtml + '</div>';
  }

  function locPwGetShipmentRef(ship) {
    var ref = ship && (ship.refNo || ship.ref);
    if (ref && String(ref).trim() && ref !== '—') return String(ref).trim();
    return ship && ship.shipmentId ? String(ship.shipmentId).trim() : '—';
  }

  function locPwBuildEmailShipSummaryHtml(ship) {
    if (!ship) return '';
    var qty = locPwGetShipmentQty(ship);
    return 'REF <strong>' + esc(locPwGetShipmentRef(ship)) + '</strong> · 客户 <strong>' + esc(ship.customer) + '</strong> · 实收 ' + esc(qty.actPlts) + ' 板 / ' + esc(qty.actCtns) + ' 件';
  }

  function locPwGetShipmentInternalRemark(ship) {
    if (!ship) return '';
    var v = ship.internalRemark;
    if (v == null || v === '' || String(v).trim() === '' || v === '—' || v === '-') return '';
    return String(v).trim();
  }

  function locPwFormatBolInternalRemarkList(bol) {
    var shipments = locPwGetShipmentsForBol(bol);
    if (!shipments.length) return '—';
    var parts = shipments.map(function (s) {
      var ref = locPwGetShipmentRef(s);
      var remark = locPwGetShipmentInternalRemark(s);
      var label = ref || '—';
      return label + '：' + (remark || '—');
    });
    return parts.join('；');
  }

  function locPwFormatShipmentAddress(ship) {
    if (!ship) return '—';
    function val(key) {
      var v = ship[key];
      if (v == null || v === '' || String(v).trim() === '' || v === '—') return '';
      return String(v).trim();
    }
    var parts = [];
    var addr = val('address');
    if (addr) parts.push(addr);
    var city = val('city');
    var state = val('state');
    var zip = val('zipCode');
    var country = val('country');
    var cityLine = city;
    if (state || zip) {
      var stateZip = [state, zip].filter(Boolean).join(' ');
      cityLine = city ? (city + ', ' + stateZip) : stateZip;
    }
    if (cityLine) parts.push(cityLine);
    if (country) parts.push(country);
    return parts.length ? parts.join(', ') : '—';
  }

  function locPwBuildRefBarHtml(ship) {
    return '<div class="loc-pw-basic-info">' +
      '<div class="loc-pw-basic-info-hd">基础信息</div>' +
      '<div class="loc-pw-ref-bar loc-pw-ref-bar--ids">' +
      locPwRefBarCellHtml('货件ID', ship.shipmentId) +
      locPwRefBarCellHtml('Customer Ref No', locPwGetShipmentRef(ship)) +
      locPwRefBarCellHtml('客户', ship.customer) +
      locPwRefBarCellHtml('柜号', ship.container) +
      '</div>' +
      '<div class="loc-pw-ref-bar loc-pw-ref-bar--ids loc-pw-ref-bar--ids-2">' +
      locPwRefBarCellHtml('系统单号', ship.sysNo) +
      locPwRefBarCellHtml('拆柜时间', locPwFormatMilestoneDateTime(ship.devanningTime || ship.devanningDate)) +
      '</div>' +
      '<div class="loc-pw-ref-bar loc-pw-ref-bar--addr">' +
      locPwRefBarCellHtml('地址', locPwFormatShipmentAddress(ship), null, 'loc-pw-ref-cell--wide') +
      '</div>' +
      '<div class="loc-pw-ref-bar loc-pw-ref-bar--internal-remark">' +
      locPwRefBarCellHtml('内部备注', locPwGetShipmentInternalRemark(ship) || '—', null, 'loc-pw-ref-cell--wide') +
      '</div>' +
      '<div class="loc-pw-contact-bar">' +
      locPwRefBarCellHtml('公司名称', ship.companyName) +
      locPwRefBarCellHtml('联系人', ship.contact) +
      locPwRefBarCellHtml('电话', ship.phone, 'tel') +
      locPwRefBarCellHtml('Email', ship.email, 'email') +
      '</div></div>';
  }

  function locPwBuildEmailRecordsCollapsibleHtml(bol, logs) {
    if (!logs.length) {
      return '<div class="loc-pw-ship-records-wrap loc-pw-ship-records-wrap--empty"><span class="loc-pw-ship-records-empty">暂无发送记录</span></div>';
    }
    return '<div class="loc-pw-ship-records-wrap">' +
      '<button type="button" class="loc-pw-ship-records-toggle" aria-expanded="false" onclick="locPwToggleShipRecords(this)">' +
      '<span class="loc-pw-ship-records-toggle-arrow" aria-hidden="true">▼</span>' +
      '<span class="loc-pw-ship-records-toggle-lbl">查看发送记录（' + logs.length + ' 条）</span>' +
      '</button>' +
      '<div class="loc-pw-ship-records-panel" hidden>' +
      locPwBuildEmailRecordsHtml(bol, logs) +
      '</div></div>';
  }

  /** BOL / 原 BOL 维度：发送记录区块（放在板标信息下方） */
  function locPwBuildBolEmailRecordsSectionHtml(bol, shipments) {
    var logs = locPwGetEmailLogsForShipments(bol, shipments);
    var hd = '<div class="loc-pw-bol-records-section-hd">发送记录' +
      '<span class="loc-pw-ship-extra-count">' + logs.length + ' 条</span></div>';
    var body = logs.length
      ? locPwBuildEmailRecordsHtml(bol, logs)
      : '<div class="loc-pw-ship-extra-empty">暂无发送记录</div>';
    return '<div class="loc-pw-bol-records-section">' + hd + body + '</div>';
  }

  window.locPwToggleShipRecords = function (btn) {
    var panel = btn.nextElementSibling;
    if (!panel) return;
    var arrow = btn.querySelector('.loc-pw-ship-records-toggle-arrow');
    var lbl = btn.querySelector('.loc-pw-ship-records-toggle-lbl');
    var open = panel.hasAttribute('hidden');
    if (open) {
      panel.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
      if (arrow) arrow.textContent = '▲';
      if (lbl) lbl.textContent = '收起发送记录';
    } else {
      panel.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
      if (arrow) arrow.textContent = '▼';
      var n = panel.querySelectorAll('.loc-pw-email-record-row').length;
      if (lbl) lbl.textContent = '查看发送记录（' + n + ' 条）';
    }
  };

  window.locPwFormatShipmentDimensionWeight = locPwFormatPalletDimWeightText;

  function locPwBuildApptFilesHtml(files) {
    var list = (files && files.length) ? files : [];
    if (!list.length) {
      return '<div class="loc-pw-appt-files"><span class="lbl">预约文件</span><span class="loc-pw-appt-files-empty">—</span></div>';
    }
    var maxShow = 3;
    var chips = list.slice(0, maxShow).map(function (f) {
      var name = (f && f.name) ? f.name : String(f);
      return '<a class="loc-pw-appt-file-chip" href="#" onclick="showToast(\'下载 ' + esc(name) + '\');return false;" title="' + esc(name) + '">' +
        '<span class="loc-pw-appt-file-ico" aria-hidden="true">📄</span><span class="loc-pw-appt-file-name">' + esc(name) + '</span></a>';
    }).join('');
    var more = list.length > maxShow
      ? '<span class="loc-pw-appt-files-more" title="共 ' + list.length + ' 个文件">+' + (list.length - maxShow) + '</span>'
      : '';
    return '<div class="loc-pw-appt-files"><span class="lbl">预约文件</span><div class="loc-pw-appt-file-list">' + chips + more + '</div></div>';
  }

  var LOC_PW_EMAIL_RECORDS_INLINE_LIMIT = 2;

  function locPwAggregateRecipientStatus(recipientResults) {
    if (!recipientResults || !recipientResults.length) return 'failed';
    var ok = recipientResults.filter(function (r) { return r.status === 'success'; }).length;
    if (ok === recipientResults.length) return 'success';
    if (ok === 0) return 'failed';
    return 'partial';
  }

  function locPwFormatVendorSummary(vendorResults) {
    if (!vendorResults || !vendorResults.length) return '—';
    var ok = vendorResults.filter(function (v) { return v.status === 'success'; }).length;
    var fail = vendorResults.filter(function (v) { return v.status === 'failed'; }).length;
    var total = vendorResults.length;
    if (!fail) return total + ' 个邮箱 · 全部成功';
    if (!ok) return total + ' 个邮箱 · 全部失败';
    var failedNames = [];
    vendorResults.forEach(function (v) {
      if (v.status === 'failed' && v.vendor && failedNames.indexOf(v.vendor) === -1) {
        failedNames.push(v.vendor);
      }
    });
    var hint = failedNames.slice(0, 2).join('、');
    if (failedNames.length > 2) hint += ' 等';
    return total + ' 个邮箱 · ' + ok + ' 成功 ' + fail + ' 失败' + (hint ? '（' + hint + '）' : '');
  }

  function locPwFormatEmailRecordSentMeta(log) {
    var sender = String(log && log.sentBy != null ? log.sentBy : '').trim() || '—';
    var sentAt = locPwFormatMilestoneDateTime(log && log.sentAt);
    return { sender: sender, sentAt: sentAt };
  }

  function locPwBuildEmailRecordRowHtml(bol, l) {
    var typeKey = locPwIsInquiryLog(l) ? 'inquiry' : 'appointment';
    var typeLabel = typeKey === 'inquiry' ? '询价' : '预约';
    var sentMeta = locPwFormatEmailRecordSentMeta(l);
    var safeId = String(l.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var safeBol = String(bol).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var safeShipJs = String(l.shipmentId || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var summary = '—';
    var overall = locPwEmailRecordStatusMeta(l.status);
    var failTip = '';

    if (locPwIsInquiryLog(l)) {
      var vendorResults = locPwGetLogVendorResults(l);
      if (vendorResults.length) {
        overall = locPwEmailRecordStatusMeta(locPwAggregateVendorStatus(vendorResults));
        summary = locPwFormatVendorSummary(vendorResults);
      } else {
        summary = l.recipients || '—';
        if (l.failReason) failTip = '<span class="loc-pw-email-record-fail" title="' + esc(l.failReason) + '">· ' + esc(l.failReason) + '</span>';
      }
    } else {
      var apptResults = locPwGetLogRecipientResults(l);
      if (apptResults.length) {
        overall = locPwEmailRecordStatusMeta(locPwAggregateRecipientStatus(apptResults));
      }
      summary = locPwBuildAppointmentRowSummary(l);
    }

    return '<div class="loc-pw-email-record-row" data-record-type="' + typeKey + '">' +
      '<span class="loc-pw-email-record-meta-wrap" title="' + esc(sentMeta.sender + ' · ' + sentMeta.sentAt) + '">' +
      '<span class="loc-pw-email-record-sender">' + esc(sentMeta.sender) + '</span>' +
      '<span class="loc-pw-email-record-sep">·</span>' +
      '<span class="loc-pw-email-record-time">' + esc(sentMeta.sentAt) + '</span>' +
      '<span class="loc-pw-email-record-kind loc-pw-email-record-kind--' + typeKey + '">' + typeLabel + '</span>' +
      (l.shipmentId ? '<span class="loc-pw-email-record-ship" title="货件ID">' + esc(l.shipmentId) + '</span>' : '') +
      '</span>' +
      '<span class="loc-pw-email-record-summary" title="' + esc(summary) + '">' + esc(summary) + '</span>' +
      '<span class="loc-pw-eml-st ' + overall.cls + '">' + overall.text + '</span>' +
      failTip +
      '<button type="button" class="btn btn-default btn-xs" onclick="locPwViewEmailRecord(\'' + safeBol + '\',\'' + safeId + '\',\'' + typeKey + '\',\'' + safeShipJs + '\')">查看</button>' +
      '</div>';
  }

  function locPwApplyEmailRecordsFilter(root, filter) {
    if (!root) return;
    filter = filter || 'all';
    root.setAttribute('data-records-filter', filter);
    root.querySelectorAll('.loc-pw-email-records-tab').forEach(function (tab) {
      var active = tab.getAttribute('data-tab') === filter;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    root.querySelectorAll('.loc-pw-email-record-row').forEach(function (row) {
      var type = row.getAttribute('data-record-type');
      row.style.display = (filter === 'all' || type === filter) ? '' : 'none';
    });
  }

  function locPwBuildEmailRecordsBodyHtml(bol, logs) {
    var reversed = logs.slice().reverse();
    var visible = reversed.slice(0, LOC_PW_EMAIL_RECORDS_INLINE_LIMIT);
    var hidden = reversed.slice(LOC_PW_EMAIL_RECORDS_INLINE_LIMIT);
    var rows = visible.map(function (l) { return locPwBuildEmailRecordRowHtml(bol, l); }).join('');
    var hiddenRows = hidden.map(function (l) { return locPwBuildEmailRecordRowHtml(bol, l); }).join('');
    var moreHtml = hidden.length
      ? '<button type="button" class="loc-pw-email-records-more" onclick="locPwToggleEmailRecords(this)" aria-expanded="false">' +
        '还有 ' + hidden.length + ' 条 <span class="toggle-arrow">▼</span></button>' +
        '<div class="loc-pw-email-records-hidden" hidden>' + hiddenRows + '</div>'
      : '';
    return '<div class="loc-pw-email-records-body">' + rows + moreHtml + '</div>';
  }

  function locPwBuildEmailRecordsHtml(bol, logs) {
    if (!logs.length) {
      return '<div class="loc-pw-email-records loc-pw-email-records--empty">暂无发送记录</div>';
    }
    var inqCount = logs.filter(function (l) { return locPwIsInquiryLog(l); }).length;
    var apptCount = logs.filter(function (l) { return locPwIsAppointmentLog(l); }).length;
    var tabs = '<div class="loc-pw-email-records-tabs" role="tablist">' +
      '<button type="button" class="loc-pw-email-records-tab active" role="tab" data-tab="all" aria-selected="true" onclick="locPwSwitchEmailRecordsTab(this,\'all\')">全部 (' + logs.length + ')</button>' +
      '<button type="button" class="loc-pw-email-records-tab" role="tab" data-tab="inquiry" aria-selected="false" onclick="locPwSwitchEmailRecordsTab(this,\'inquiry\')">询价 (' + inqCount + ')</button>' +
      '<button type="button" class="loc-pw-email-records-tab" role="tab" data-tab="appointment" aria-selected="false" onclick="locPwSwitchEmailRecordsTab(this,\'appointment\')">预约 (' + apptCount + ')</button>' +
      '</div>';
    return '<div class="loc-pw-email-records" data-records-filter="all">' +
      '<div class="loc-pw-email-records-hd">' +
      '<span class="loc-pw-email-records-title">发送记录</span>' +
      tabs +
      '</div>' +
      locPwBuildEmailRecordsBodyHtml(bol, logs) +
      '</div>';
  }

  window.locPwSwitchEmailRecordsTab = function (btn, filter) {
    var root = btn && btn.closest ? btn.closest('.loc-pw-email-records') : null;
    locPwApplyEmailRecordsFilter(root, filter);
  };

  window.locPwToggleEmailRecords = function (btn) {
    var hidden = btn.nextElementSibling;
    if (!hidden) return;
    var open = hidden.hasAttribute('hidden');
    if (open) {
      hidden.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
      btn.innerHTML = '收起 <span class="toggle-arrow">▲</span>';
    } else {
      hidden.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
      var n = hidden.querySelectorAll('.loc-pw-email-record-row').length;
      btn.innerHTML = '还有 ' + n + ' 条 <span class="toggle-arrow">▼</span>';
    }
  };

  function locPwFindEmailRecord(bol, recordId, expectedType, shipmentId) {
    var list = LOC_PW_COMM_LOGS[bol] || [];
    var candidates = list.filter(function (l) { return l.id === recordId; });
    if (!candidates.length) return null;
    return candidates.find(function (l) {
      if (shipmentId && l.shipmentId !== shipmentId) return false;
      if (expectedType === 'inquiry') return locPwIsInquiryLog(l);
      if (expectedType === 'appointment') return locPwIsAppointmentLog(l);
      return true;
    }) || null;
  }

  function locPwGetEmailRecordTypeLabel(rec) {
    return locPwIsInquiryLog(rec) ? '询价' : '预约';
  }

  function locPwBuildInquirySendResultTableHtml(vrs) {
    if (!vrs.length) return '';
    var ok = vrs.filter(function (v) { return v.status === 'success'; }).length;
    var fail = vrs.length - ok;
    return '<div class="loc-pw-email-preview-vendors">' +
      '<div class="loc-pw-email-preview-sub"><strong>发送结果</strong> · ' + vrs.length + ' 个邮箱（' + ok + ' 成功' + (fail ? ' · ' + fail + ' 失败' : '') + '）</div>' +
      '<div class="loc-pw-email-vendor-table-wrap"><table class="data-table loc-pw-email-vendor-table loc-pw-email-vendor-table--inquiry">' +
      '<thead><tr><th>供应商</th><th>Email</th><th style="width:68px">状态</th><th>失败原因</th></tr></thead><tbody>' +
      vrs.map(function (vr) {
        var vSt = locPwEmailRecordStatusMeta(vr.status);
        return '<tr><td>' + esc(vr.vendor || '—') + '</td>' +
          '<td>' + locPwVendorCellHtml(vr) + '</td>' +
          '<td><span class="loc-pw-eml-st ' + vSt.cls + '">' + vSt.text + '</span></td>' +
          '<td class="loc-pw-email-vendor-fail">' + esc(vr.failReason || '—') + '</td></tr>';
      }).join('') +
      '</tbody></table></div></div>';
  }

  function locPwBuildAppointmentSendResultTableHtml(rrs) {
    if (!rrs.length) return '';
    var rOk = rrs.filter(function (r) { return r.status === 'success'; }).length;
    var rFail = rrs.length - rOk;
    return '<div class="loc-pw-email-preview-vendors">' +
      '<div class="loc-pw-email-preview-sub"><strong>发送结果</strong> · ' + rrs.length + ' 个（' + rOk + ' 成功' + (rFail ? ' · ' + rFail + ' 失败' : '') + '）</div>' +
      '<div class="loc-pw-email-vendor-table-wrap"><table class="data-table loc-pw-email-vendor-table loc-pw-email-vendor-table--appointment">' +
      '<thead><tr><th>Email</th><th style="width:68px">状态</th><th>失败原因</th></tr></thead><tbody>' +
      rrs.map(function (rr) {
        var rSt = locPwEmailRecordStatusMeta(rr.status);
        return '<tr><td>' + locPwRecipientCellHtml(rr) + '</td>' +
          '<td><span class="loc-pw-eml-st ' + rSt.cls + '">' + rSt.text + '</span></td>' +
          '<td class="loc-pw-email-vendor-fail">' + esc(rr.failReason || '—') + '</td></tr>';
      }).join('') +
      '</tbody></table></div></div>';
  }

  window.locPwViewEmailRecord = function (bol, recordId, expectedType, shipmentId) {
    expectedType = expectedType || '';
    shipmentId = shipmentId || '';
    var rec = locPwFindEmailRecord(bol, recordId, expectedType, shipmentId);
    if (!rec) return showToast('未找到发送记录', 'warning');
    var typeLabel = locPwGetEmailRecordTypeLabel(rec);
    var typeKey = locPwIsInquiryLog(rec) ? 'inquiry' : 'appointment';
    var title = document.getElementById('loc-pw-email-preview-title');
    var box = document.getElementById('loc-pw-email-preview-body');
    if (title) title.textContent = '发送记录 · ' + typeLabel + ' · ' + recordId;
    if (box) {
      var overall = locPwEmailRecordStatusMeta(rec.status);
      var detailHtml = '';
      var showRecipientsLine = true;
      if (locPwIsInquiryLog(rec)) {
        var vrs = locPwGetLogVendorResults(rec);
        if (vrs.length) {
          overall = locPwEmailRecordStatusMeta(locPwAggregateVendorStatus(vrs));
          showRecipientsLine = false;
          detailHtml = locPwBuildInquirySendResultTableHtml(vrs);
        }
      } else if (locPwIsAppointmentLog(rec)) {
        var rrs = locPwGetLogRecipientResults(rec);
        if (rrs.length) {
          overall = locPwEmailRecordStatusMeta(locPwAggregateRecipientStatus(rrs));
          showRecipientsLine = false;
          detailHtml = locPwBuildAppointmentSendResultTableHtml(rrs);
        }
      }
      var recipientsLine = showRecipientsLine
        ? '<div class="loc-pw-email-preview-sub"><strong>收件人：</strong>' + esc(rec.recipients) + '</div>'
        : '';
      var sentMeta = locPwFormatEmailRecordSentMeta(rec);
      box.innerHTML = '<div class="loc-pw-email-preview-meta">' +
        esc(sentMeta.sender) + ' · ' + esc(sentMeta.sentAt) + ' · ' +
        '<span class="loc-pw-email-record-kind loc-pw-email-record-kind--' + typeKey + '">' + typeLabel + '</span> · ' +
        '<span class="loc-pw-eml-st ' + overall.cls + '">' + overall.text + '</span>' +
        '</div>' +
        detailHtml +
        recipientsLine +
        '<div class="loc-pw-email-preview-sub"><strong>标题：</strong>' + esc(rec.subject || '—') + '</div>' +
        '<div class="loc-pw-email-preview-content">' + esc(rec.bodySnapshot || '—').replace(/\n/g, '<br>') + '</div>';
    }
    locPwShowStackedModal('modal-loc-pw-email-preview');
  };

  window.locPwRefillApptTemplate = function (silent) {
    var bol = ((document.getElementById('loc-pw-appt-bol') || {}).value || '').trim();
    var shipmentId = ((document.getElementById('loc-pw-appt-shipment') || {}).value || '').trim();
    var ship = locPwGetShipmentsForBol(bol).find(function (s) { return s.shipmentId === shipmentId; });
    locPwFillEmailForm('appt', 'appointment', bol, ship, {});
    if (!silent) showToast('已重新填充预约模板', 'success');
  };

  /** 演示：BOL 关联板标明细（字段对齐板标查询 · 按板标明细） */
  var LOC_PW_PALLET_LABELS = {
    'BOLO2607099001': [
      { pltNo: 'PLT-LAX-301', status: '已上架', location: 'A-12-03', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 15, container: 'MSKU1234567', sysNo: 'TLP2606230401', shipmentId: 'TLP2606230401-0001' },
      { pltNo: 'PLT-LAX-301B', status: '已上架', location: 'A-12-03', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 13, container: 'MSKU1234567', sysNo: 'TLP2606230401', shipmentId: 'TLP2606230401-0002' },
      { pltNo: 'PLT-LAX-302', status: '已上架', location: 'A-12-04', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 20, container: 'MSKU2233445', sysNo: 'TLP2606230391', shipmentId: 'TLP2606230391-0001' },
      { pltNo: 'PLT-LAX-303', status: '待上架', location: 'B-05-02', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 12, container: 'MSKU3390008', sysNo: 'TLP2606230392', shipmentId: 'TLP2606230392-0001', assignedBol: 'BOLO2607090392-1' },
      { pltNo: 'PLT-LAX-304', status: '已上架', location: 'B-05-03', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 13, container: 'MSKU3390008', sysNo: 'TLP2606230392', shipmentId: 'TLP2606230392-0001', assignedBol: 'BOLO2607090392-2' }
    ],
    'BOLO2607090401': [
      { pltNo: 'PLT-LAX-301', status: '已上架', location: 'A-12-03', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 15, container: 'MSKU1234567', sysNo: 'TLP2606230401', shipmentId: 'TLP2606230401-0001' },
      { pltNo: 'PLT-LAX-301B', status: '已上架', location: 'A-12-03', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 13, container: 'MSKU1234567', sysNo: 'TLP2606230401', shipmentId: 'TLP2606230401-0002' }
    ],
    'BOLO2607090391': [
      { pltNo: 'PLT-LAX-302', status: '已上架', location: 'A-12-04', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 20, container: 'MSKU2233445', sysNo: 'TLP2606230391', shipmentId: 'TLP2606230391-0001' }
    ],
    'BOLO2607090392-1': [
      { pltNo: 'PLT-LAX-303', status: '待上架', location: 'B-05-02', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 12, container: 'MSKU3390008', sysNo: 'TLP2606230392', shipmentId: 'TLP2606230392-0001', assignedBol: 'BOLO2607090392-1' }
    ],
    'BOLO2607090402': [
      { pltNo: 'PLT-LAX-401', status: '已上架', location: 'A-01-02', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 8, container: 'MSKU2234567', sysNo: 'TLP2606230402', shipmentId: 'TLP2606230402-0001' },
      { pltNo: 'PLT-LAX-402', status: '已上架', location: 'A-01-03', warehouseZone: 'A区拣货区', warehouseName: 'LA1150', pieces: 14, container: 'MSKU2234567', sysNo: 'TLP2606230402', shipmentId: 'TLP2606230402-0001' }
    ],
    'BOLO2607090405': [
      { pltNo: 'PLT-LAX-205', status: '已上架', location: 'D-01-01', warehouseZone: 'D区待发区', warehouseName: 'LA1150', pieces: 14, container: 'MSKU4400123', sysNo: 'TLP2606230405', shipmentId: 'TLP2606230405-0001' },
      { pltNo: 'PLT-LAX-206', status: '已上架', location: 'D-01-02', warehouseZone: 'D区待发区', warehouseName: 'LA1150', pieces: 14, container: 'MSKU4400123', sysNo: 'TLP2606230405', shipmentId: 'TLP2606230405-0001' }
    ],
    'BOLO2607090406': [
      { pltNo: 'PLT-LAX-207', status: '已上架', location: 'E-01-02', warehouseZone: 'E区备货区', warehouseName: 'LA1150', pieces: 11, container: 'MSKU7700888', sysNo: 'TLP2606230406', shipmentId: 'TLP2606230406-0001', dim: '48×40×72', weight: 620 },
      { pltNo: 'PLT-LAX-208', status: '已上架', location: 'E-01-03', warehouseZone: 'E区备货区', warehouseName: 'LA1150', pieces: 10, container: 'MSKU7700888', sysNo: 'TLP2606230406', shipmentId: 'TLP2606230406-0002', dim: '47×40×60', weight: 540 },
      { pltNo: 'PLT-LAX-209', status: '待上架', location: 'E-01-04', warehouseZone: 'E区备货区', warehouseName: 'LA1150', pieces: 11, container: 'MSKU7700888', sysNo: 'TLP2606230406', shipmentId: 'TLP2606230406-0003', dim: '48×40×68', weight: 580 }
    ],
    'BOLO2607090403': [
      { pltNo: 'PLT-LAX-310', status: '已上架', location: 'B-02-01', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 12, container: 'MSKU3390001', sysNo: 'TLP2606230403', shipmentId: 'TLP2606230403-0001' },
      { pltNo: 'PLT-LAX-311', status: '待上架', location: 'B-02-02', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 11, container: 'MSKU3390001', sysNo: 'TLP2606230403', shipmentId: 'TLP2606230403-0001' },
      { pltNo: 'PLT-LAX-312', status: '已上架', location: 'B-02-03', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 12, container: 'MSKU3390001', sysNo: 'TLP2606230403', shipmentId: 'TLP2606230403-0001' }
    ],
    'BOLO2607090408': [
      { pltNo: 'PLT-LAX-501', status: '已上架', location: 'C-03-01', warehouseZone: 'C区暂存区', warehouseName: 'LA1150', pieces: 18, container: 'MSKU8899001', sysNo: 'TLP2606230408', shipmentId: 'TLP2606230408-0001' }
    ],
    'BOLO2607090410': [
      { pltNo: 'PLT-LAX-601', status: '待上架', location: 'B-03-02', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 11, container: 'MSKU5566778', sysNo: 'TLP2606230410', shipmentId: 'TLP2606230410-0001' },
      { pltNo: 'PLT-LAX-602', status: '已上架', location: 'B-03-03', warehouseZone: 'B区存货区', warehouseName: 'LA1150', pieces: 11, container: 'MSKU5566778', sysNo: 'TLP2606230410', shipmentId: 'TLP2606230410-0001' }
    ]
  };

  var LOC_PW_RETURN_VOUCHER_MAX = 10 * 1024 * 1024;

  function locPwGetRowCellText(tr, idx) {
    if (!tr) return '—';
    var cells = tr.querySelectorAll('td');
    if (!cells[idx]) return '—';
    var t = cells[idx].textContent.trim();
    return t || '—';
  }

  function locPwResetReturnForm() {
    var ids = ['loc-pw-return-date', 'loc-pw-return-reason', 'loc-pw-return-detail', 'loc-pw-return-act-arrival'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') el.value = '';
      else el.value = '';
    });
    var vch = document.getElementById('loc-pw-return-voucher');
    if (vch) vch.value = '';
    locPwSetFileDropName('loc-pw-return-voucher-name', null);
  }

  function locPwFillReturnSummary(bol, tr, statusOverride) {
    var sum = document.getElementById('loc-pw-return-summary');
    if (!sum) return;
    var status = statusOverride || (tr ? locPwGetRowStatus(tr) : '—');
    var custRef = locPwGetRowCellText(tr, LOC_PW_COL.refNo);
    var container = locPwGetRowCellText(tr, LOC_PW_COL.container);
    var sysNo = locPwGetRowCellText(tr, LOC_PW_COL.sysNo);
    if (status === '退仓待执行') {
      sum.innerHTML = 'BOL <strong>' + esc(bol) + '</strong> · Customer Ref No <strong>' + esc(custRef) + '</strong> · 柜号 <strong>' + esc(container) + '</strong> · 系统单号 <strong>' + esc(sysNo) + '</strong>';
      return;
    }
    sum.innerHTML = 'BOL <strong>' + esc(bol) + '</strong> · Customer Ref No <strong>' + esc(custRef) + '</strong> · 柜号 <strong>' + esc(container) + '</strong> · 系统单号 <strong>' + esc(sysNo) + '</strong> · 状态 <strong>' + esc(status) + '</strong>。该 BOL 下货件将整单一起退仓。';
  }

  function locPwApplyReturnModalPhase(phase) {
    var completeOnly = phase === 'complete-only';
    locPwSetHidden('loc-pw-return-phase', phase);
    var notify = document.getElementById('loc-pw-return-notify-section');
    var initBtn = document.getElementById('loc-pw-return-btn-initiate');
    var blockTitle = document.getElementById('loc-pw-return-complete-title');
    var tip = document.getElementById('loc-pw-return-warn-tip');
    if (notify) notify.style.display = completeOnly ? 'none' : '';
    if (initBtn) initBtn.style.display = completeOnly ? 'none' : '';
    if (blockTitle) blockTitle.textContent = completeOnly ? '退仓完成信息' : '确认退仓完成时填写';
    if (tip) {
      tip.innerHTML = completeOnly
        ? '<strong>单项退仓完成：</strong>确认货件已到仓后办结；办结后 BOL 状态将流转为「处理中」，可重新安排出库。'
        : '<strong>单项退仓：</strong>仅针对当前选中的 BOL，该 BOL 下货件整单一起退仓；通知仓库后将进入「退仓待执行」。';
    }
  }

  function locPwValidateReturnForm(requireOnExecute) {
    var dt = ((document.getElementById('loc-pw-return-date') || {}).value || '').trim();
    var actRaw = ((document.getElementById('loc-pw-return-act-arrival') || {}).value || '').trim();
    var actArrival = actRaw.replace('T', ' ').trim();
    var reason = ((document.getElementById('loc-pw-return-reason') || {}).value || '').trim();
    var detail = ((document.getElementById('loc-pw-return-detail') || {}).value || '').trim();
    var fi = document.getElementById('loc-pw-return-voucher');
    var file = fi && fi.files && fi.files[0] ? fi.files[0] : null;
    if (file && file.size > LOC_PW_RETURN_VOUCHER_MAX) {
      showToast('退仓凭证不能超过 10MB', 'warning');
      return null;
    }
    if (requireOnExecute) {
      if (!actArrival) { showToast('请填写实际到仓时间', 'warning'); return null; }
      if (!reason) { showToast('请选择退仓原因', 'warning'); return null; }
      if (!detail) { showToast('请填写详细说明', 'warning'); return null; }
      return { dt: dt, actArrival: actArrival, reason: reason, detail: detail, fileName: file ? (file.name || '附件') : '' };
    }
    if (!dt) { showToast('请选择期望到仓日期', 'warning'); return null; }
    if (!reason) { showToast('请选择退仓原因', 'warning'); return null; }
    if (!detail) { showToast('请填写详细说明', 'warning'); return null; }
    return { dt: dt, actArrival: actArrival, reason: reason, detail: detail, fileName: file ? (file.name || '附件') : '' };
  }

  function locPwPltStatusCls(status) {
    if (status === '已上架') return 'loc-pw-plt-st--done';
    if (status === '待上架') return 'loc-pw-plt-st--wait';
    return 'loc-pw-plt-st--default';
  }

  function locPwBuildFallbackPallets(bol, tr) {
    var n = locPwGetRowPalletCount(tr);
    if (n <= 0) n = 2;
    var cells = tr ? tr.querySelectorAll('td') : [];
    var container = cells[LOC_PW_COL.container] ? cells[LOC_PW_COL.container].textContent.trim() : '—';
    var location = cells[8] ? cells[8].textContent.trim() : '—';
    var sysNo = cells[LOC_PW_COL.sysNo] ? cells[LOC_PW_COL.sysNo].textContent.trim() : '—';
    if (container === '—' || !container) container = '—';
    if (location === '—' || !location) location = 'A-01-01';
    if (sysNo === '—' || !sysNo) sysNo = '—';
    var list = [];
    for (var i = 1; i <= n; i++) {
      list.push({
        pltNo: 'PLT-' + bol.replace(/[^A-Za-z0-9]/g, '') + '-' + String(i).padStart(2, '0'),
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

  /** 解析「5」或「5/10」；拆分发货时分子=当前出库，分母=原 BOL 总板数 */
  function locPwParseActPltsParts(text) {
    var s = String(text == null ? '' : text).trim();
    if (!s || s === '—' || s === '-') return { current: null, total: null };
    var m = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
    if (m) {
      return { current: parseFloat(m[1]), total: parseFloat(m[2]) };
    }
    var n = parseFloat(s.replace(/[^\d.\-]/g, ''));
    return { current: isNaN(n) ? null : n, total: null };
  }

  function locPwGetRowActPltsCurrent(tr) {
    if (!tr) return 0;
    var attr = tr.getAttribute('data-loc-pw-pallets');
    if (attr != null && attr !== '') {
      var n = parseInt(attr, 10);
      if (!isNaN(n)) return n;
    }
    var cell = tr.cells && tr.cells[LOC_PW_COL.actPlts];
    var parts = locPwParseActPltsParts(cell ? cell.textContent : '');
    return parts.current != null ? parts.current : 0;
  }

  function locPwIsSplitShipRow(tr) {
    if (!tr) return false;
    if (locPwGetShipMode(tr) === 'split') return true;
    return tr.getAttribute('data-loc-pw-origin-mode') === 'split';
  }

  /** 独立拆分发货才标红「当前/总计」；已并入合并发货则只显示实际出库板数 */
  function locPwShouldShowSplitActPltsRatio(tr) {
    if (!tr || !locPwIsSplitShipRow(tr)) return false;
    if (tr.classList.contains('loc-pw-tr-merge-child') || tr.classList.contains('loc-pw-tr-merge-parent')) {
      return false;
    }
    return true;
  }

  /** 拆分原 BOL 总板数：优先 data-loc-pw-origin-pallets，否则汇总同组当前板数 */
  function locPwGetSplitOriginPalletTotal(tr) {
    if (!tr) return 0;
    var originAttr = tr.getAttribute('data-loc-pw-origin-pallets');
    if (originAttr != null && originAttr !== '') {
      var o = parseInt(originAttr, 10);
      if (!isNaN(o) && o > 0) return o;
    }
    var bol = tr.getAttribute('data-loc-pw-bol');
    var groupId = locPwGetSplitGroupId(bol, tr);
    var rows = locPwGetSplitGroupRows(groupId);
    var maxOrigin = 0;
    var sumCurrent = 0;
    rows.forEach(function (r) {
      var oa = r.getAttribute('data-loc-pw-origin-pallets');
      if (oa != null && oa !== '') {
        var ov = parseInt(oa, 10);
        if (!isNaN(ov) && ov > maxOrigin) maxOrigin = ov;
      }
      sumCurrent += locPwGetRowActPltsCurrent(r);
    });
    if (maxOrigin > 0) return maxOrigin;
    return sumCurrent;
  }

  function locPwFormatActPltsCellHtml(current, total, isSplit) {
    if (current == null || isNaN(current)) return '—';
    var cur = String(Math.round(current));
    if (isSplit && total != null && !isNaN(total) && total > 0) {
      return '<span class="loc-pw-act-plts loc-pw-act-plts--split" title="当前出库板数 / 原 BOL 总板数（合板取合并打板实际板数）">' +
        esc(cur) + '/' + esc(String(Math.round(total))) + '</span>';
    }
    return esc(cur);
  }

  /**
   * 列表「实际板数」：
   * - 合板：取合并打板实际板数（data-loc-pw-pallets）
   * - 独立拆分发货：当前/总计（标红）
   * - 已并入合并发货：只显示实际出库板数（不标红）
   */
  function locPwSyncActPltsCell(tr) {
    if (!tr || !tr.cells || !tr.cells[LOC_PW_COL.actPlts]) return;
    var cell = tr.cells[LOC_PW_COL.actPlts];
    var showRatio = locPwShouldShowSplitActPltsRatio(tr);
    var current = locPwGetRowActPltsCurrent(tr);
    if (locPwIsMergePallet(tr) && tr.getAttribute('data-loc-pw-pallets')) {
      var mp = parseInt(tr.getAttribute('data-loc-pw-pallets'), 10);
      if (!isNaN(mp) && !showRatio) {
        current = mp;
      }
    }
    var total = null;
    if (showRatio) {
      total = locPwGetSplitOriginPalletTotal(tr);
      if (!tr.getAttribute('data-loc-pw-origin-pallets') && total > 0) {
        tr.setAttribute('data-loc-pw-origin-pallets', String(total));
      }
    }
    cell.innerHTML = locPwFormatActPltsCellHtml(current, total, showRatio);
  }

  function locPwInitActPltsDisplay() {
    document.querySelectorAll('tr[data-loc-pw-bol]').forEach(locPwSyncActPltsCell);
  }

  function locPwGetRowPalletCount(tr) {
    return locPwGetRowActPltsCurrent(tr);
  }

  function locPwGetPalletLabelsForBol(bol) {
    if (LOC_PW_PALLET_LABELS[bol]) {
      return LOC_PW_PALLET_LABELS[bol].map(function (p) {
        return Object.assign({}, p);
      });
    }
    return locPwBuildFallbackPallets(bol, locPwFindRow(bol));
  }

  function locPwCanPalletSplit(tr) {
    if (!tr) return false;
    if (locPwGetShipMode(tr) === 'split') return false;
    return locPwGetRowPalletCount(tr) > 1;
  }

  function locPwStatusBadgeHtml(status) {
    return '<span class="status-badge s-' + esc(status) + '"><span class="status-dot"></span>' + esc(status) + '</span>';
  }

  function locPwSyncHoldReasonCell(tr) {
    if (!tr || !tr.cells) return;
    var td = tr.cells[LOC_PW_COL.holdReason];
    if (!td) return;
    var bol = tr.getAttribute('data-loc-pw-bol');
    var hold = bol ? locPwGetBolHold(bol) : null;
    if (hold && hold.holdReason) {
      var tip = hold.holdRemark ? ' title="' + esc(hold.holdRemark) + '"' : '';
      td.innerHTML = '<span class="loc-pw-hold-reason-cell"' + tip + '>' + esc(hold.holdReason) + '</span>';
    } else {
      td.textContent = '—';
    }
  }

  function locPwSyncInternalRemarkCell(tr) {
    if (!tr || !tr.cells) return;
    var td = tr.cells[LOC_PW_COL.internalRemark];
    if (!td) return;
    var bol = tr.getAttribute('data-loc-pw-bol');
    if (!bol) {
      td.textContent = '—';
      td.title = '';
      return;
    }
    var text = locPwFormatBolInternalRemarkList(bol);
    td.textContent = text;
    td.title = text !== '—' ? text : '';
  }

  function locPwSetRowStatus(bol, status) {
    var tr = locPwFindRow(bol);
    if (!tr) return;
    var cells = tr.querySelectorAll('td');
    var statusTd = cells[4];
    if (statusTd) statusTd.innerHTML = locPwStatusBadgeHtml(status);
    locPwSyncHoldReasonCell(tr);
    locPwFillActions(tr);
    locPwInitBolLinks();
    locPwRefreshTabCounts();
    locPwApplyTabFilter();
  }

  function locPwActionOnclick(kind, bol) {
    var safeBol = String(bol == null ? '' : bol).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var map = {
      booked: 'locPwOpenBooked',
      editBolInfo: 'locPwOpenEditBolInfo',
      loaded: 'locPwOpenLoaded',
      departed: 'locPwOpenDeparted',
      uploadPod: 'locPwOpenUploadPod',
      uploadOutboundDoc: 'locPwOpenUploadOutboundDoc',
      editVoucher: 'locPwOpenEditVoucher',
      cancelBooked: 'locPwOpenCancelBooked',
      undoLoaded: 'locPwOpenUndoLoaded',
      returnInitiate: 'locPwOpenReturn',
      returnExecute: 'locPwOpenReturnComplete',
      returnRevoke: 'locPwRevokeReturn',
      split: 'locPwOpenSplit',
      cancelMerge: 'locPwOpenCancelMerge',
      cancelSplit: 'locPwOpenCancelSplit',
      markHold: 'locPwOpenHold',
      releaseHold: 'locPwReleaseHold',
      bolDetail: 'locPwOpenBolDetail',
      log: 'showLocPwRowLog'
    };
    return (map[kind] || 'void') + "('" + safeBol + "')";
  }

  function locPwBuildActionsHtml(bol, status, shipMode, tr) {
    var primary = null;
    var more = [];

    if (status === '待处理') {
      primary = { label: '处理中', kind: 'booked' };
      if (shipMode === 'normal') {
        if (locPwCanPalletSplit(tr)) {
          more.push({ label: '拆分发货', kind: 'split' });
        }
      } else if (shipMode === 'split') {
        more.push({ label: '取消拆分', kind: 'cancelSplit' });
      } else if (shipMode === 'merge' && tr.classList.contains('loc-pw-tr-merge-parent')) {
        more.push({ label: '取消合并', kind: 'cancelMerge' });
      }
      more.push({ label: '暂缓处理', kind: 'markHold' }, { label: '日志', kind: 'log' });
    } else if (status === '处理中') {
      primary = { label: '安排出库', kind: 'booked' };
      more.push({ label: '修改BOL', kind: 'editBolInfo' });
      more.push({ label: '暂缓处理', kind: 'markHold' }, { label: '日志', kind: 'log' });
    } else if (status === LOC_PW_STATUS_HOLD) {
      primary = { label: '解除暂缓', kind: 'releaseHold', primary: true };
      more.push({ label: '日志', kind: 'log' });
    } else if (status === '待取货') {
      primary = { label: '已发车', kind: 'departed' };
      more.push({ label: '修改BOL', kind: 'editBolInfo' }, { label: '暂缓处理', kind: 'markHold' }, { label: '日志', kind: 'log' });
    } else if (status === '运输中') {
      primary = { label: '上传POD', kind: 'uploadPod' };
      more.push(
        { label: '修改BOL', kind: 'editBolInfo' },
        { label: '修改发车凭证', kind: 'uploadOutboundDoc' },
        { label: '退仓', kind: 'returnInitiate' },
        { label: '日志', kind: 'log' }
      );
    } else if (status === '已签收') {
      primary = { label: '修改凭证', kind: 'editVoucher' };
      more.push(
        { label: '修改BOL', kind: 'editBolInfo' },
        { label: '退仓', kind: 'returnInitiate' },
        { label: '日志', kind: 'log' }
      );
    } else if (status === '退仓待执行') {
      primary = { label: '退仓完成', kind: 'returnExecute', primary: true };
      more.push({ label: '撤销退仓', kind: 'returnRevoke' }, { label: '日志', kind: 'log' });
    }

    if (!primary) {
      return '<span class="loc-pw-tree-child-action-muted">—</span>';
    }

    var html = '<div class="loc-pw-row-actions">';
    var btnCls = primary.primary ? 'btn btn-primary btn-xs' : 'btn btn-default btn-xs';
    html += '<button class="' + btnCls + '" type="button" onclick="' + locPwActionOnclick(primary.kind, bol) + '">' + esc(primary.label) + '</button>';

    if (more.length) {
      html += '<div class="btn-with-dropdown"><button class="btn btn-default btn-xs" type="button" onclick="toggleDropdown(this)">更多 ▾</button><div class="dropdown-menu">';
      more.forEach(function (item) {
        html += '<div class="dropdown-item" onclick="' + locPwActionOnclick(item.kind, bol) + '">' + esc(item.label) + '</div>';
      });
      html += '</div></div>';
    } else {
      html += '<span></span>';
    }
    html += '</div>';
    return html;
  }

  function locPwFillActions(tr) {
    var host = tr.querySelector('.loc-pw-action-host');
    if (!host) return;
    var bol = tr.getAttribute('data-loc-pw-bol');
    if (!bol) return;
    host.innerHTML = locPwBuildActionsHtml(bol, locPwGetRowStatus(tr), locPwGetShipMode(tr), tr);
  }

  function locPwInitAllActions() {
    document.querySelectorAll('tr[data-loc-pw-bol]').forEach(locPwFillActions);
  }

  var locPwCurrentTab = '全部';

  function locPwRefreshTabCounts() {
    var statuses = ['待处理', '处理中', '待取货', '运输中', '已签收', LOC_PW_STATUS_HOLD, '退仓待执行'];
    var counts = {};
    statuses.forEach(function (s) { counts[s] = 0; });
    var total = 0;
    document.querySelectorAll('tr[data-loc-pw-bol]').forEach(function (tr) {
      if (tr.classList.contains('loc-pw-tr-merge-child')) return;
      var s = locPwGetRowStatus(tr);
      if (counts[s] != null) counts[s]++;
      total++;
    });
    var tabs = document.querySelectorAll('.table-card .tabs .tab');
    if (!tabs.length) return;
    var labels = ['全部', '待处理', '处理中', '待取货', '运输中', '已签收', LOC_PW_STATUS_HOLD, '退仓待执行'];
    tabs.forEach(function (tab, i) {
      var label = labels[i];
      var n = label === '全部' ? total : (counts[label] || 0);
      var countEl = tab.querySelector('.tab-count');
      if (countEl) countEl.textContent = String(n);
    });
  }

  function locPwSyncMergeChildren(parentTr) {
    if (!parentTr || !parentTr.classList.contains('loc-pw-tr-merge-parent')) return;
    var gid = parentTr.getAttribute('data-merge-group');
    if (!gid) return;
    var collapsed = parentTr.classList.contains('loc-pw-tr-merge-parent--collapsed');
    var parentVisible = parentTr.style.display !== 'none';
    document.querySelectorAll('tr.loc-pw-tr-merge-child[data-merge-group="' + gid + '"]').forEach(function (ch) {
      if (!parentVisible) {
        ch.style.display = 'none';
      } else {
        ch.style.display = '';
        ch.hidden = collapsed;
      }
    });
  }

  function locPwInitMergeTrees() {
    document.querySelectorAll('tr.loc-pw-tr-merge-parent').forEach(function (tr) {
      var btn = tr.querySelector('.loc-pw-merge-tree-toggle');
      var collapsed = tr.classList.contains('loc-pw-tr-merge-parent--collapsed');
      if (btn) {
        btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        btn.textContent = collapsed ? '+' : '−';
        btn.title = collapsed ? '展开子行' : '收起子行';
      }
      locPwSyncMergeChildren(tr);
    });
  }

  function locPwRowMatchesTab(tr, tab) {
    if (tab === '全部') return true;
    return locPwGetRowStatus(tr) === tab;
  }

  function locPwApplyTabFilter() {
    var tab = locPwCurrentTab || '全部';
    var visibleCount = 0;
    document.querySelectorAll('tr[data-loc-pw-bol]').forEach(function (tr) {
      var match = locPwRowMatchesTab(tr, tab);
      tr.style.display = match ? '' : 'none';
      if (match) visibleCount++;
      if (tr.classList.contains('loc-pw-tr-merge-parent')) locPwSyncMergeChildren(tr);
    });
    var info = document.getElementById('loc-pw-pagination-info') ||
      document.querySelector('.table-card .pagination-info');
    if (info) info.textContent = '共 ' + visibleCount + ' 条（示例）';
    locPwRefreshQueryStats();
  }

  function locPwGetColIndexByHeader(labelRe) {
    var table = document.querySelector('.table-wrap table.data-table');
    if (!table) return -1;
    var ths = table.querySelectorAll('thead th');
    for (var i = 0; i < ths.length; i++) {
      var t = String(ths[i].textContent || '').replace(/\s+/g, ' ').trim();
      if (labelRe.test(t)) return i;
    }
    return -1;
  }

  function locPwParseStatNum(text) {
    var n = parseFloat(String(text == null ? '' : text).replace(/,/g, '').replace(/[^\d.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function locPwFormatStatInt(n) {
    return String(Math.round(n));
  }

  function locPwFormatStatDec(n, digits) {
    return String(Number(n.toFixed(digits == null ? 2 : digits)));
  }

  /** 汇总可见列表合计 + 勾选行合计（合并子行不重复计入） */
  function locPwRefreshQueryStats() {
    var qtyEl = document.getElementById('loc-pw-stat-qty');
    var volEl = document.getElementById('loc-pw-stat-vol');
    var gwEl = document.getElementById('loc-pw-stat-gw');
    var pltsEl = document.getElementById('loc-pw-stat-plts');
    var selRowsEl = document.getElementById('loc-pw-stat-sel-rows');
    var selQtyEl = document.getElementById('loc-pw-stat-sel-qty');
    var selVolEl = document.getElementById('loc-pw-stat-sel-vol');
    var selGwEl = document.getElementById('loc-pw-stat-sel-gw');
    var selPltsEl = document.getElementById('loc-pw-stat-sel-plts');
    if (!qtyEl && !volEl && !gwEl && !pltsEl && !selQtyEl) return;

    var qtyIdx = locPwGetColIndexByHeader(/^QTY/i);
    var volIdx = locPwGetColIndexByHeader(/^Vol/i);
    var gwIdx = locPwGetColIndexByHeader(/^GW/i);
    var pltsIdx = locPwGetColIndexByHeader(/^实际板数/);

    var totalQty = 0;
    var totalVol = 0;
    var totalGw = 0;
    var totalPlts = 0;
    var selQty = 0;
    var selVol = 0;
    var selGw = 0;
    var selPlts = 0;
    var selRows = 0;

    document.querySelectorAll('tr[data-loc-pw-bol]').forEach(function (tr) {
      if (tr.style.display === 'none' || tr.hidden) return;
      if (tr.classList.contains('loc-pw-tr-merge-child')) return;
      var cells = tr.children;
      var qty = qtyIdx >= 0 && cells[qtyIdx] ? locPwParseStatNum(cells[qtyIdx].textContent) : 0;
      var vol = volIdx >= 0 && cells[volIdx] ? locPwParseStatNum(cells[volIdx].textContent) : 0;
      var gw = gwIdx >= 0 && cells[gwIdx] ? locPwParseStatNum(cells[gwIdx].textContent) : 0;
      var plts = 0;
      if (pltsIdx >= 0 && cells[pltsIdx]) {
        var pltsParts = locPwParseActPltsParts(cells[pltsIdx].textContent);
        plts = pltsParts.current != null ? pltsParts.current : 0;
      }
      totalQty += qty;
      totalVol += vol;
      totalGw += gw;
      totalPlts += plts;
      var cb = tr.querySelector('td:first-child input[type="checkbox"]');
      if (cb && cb.checked) {
        selRows += 1;
        selQty += qty;
        selVol += vol;
        selGw += gw;
        selPlts += plts;
      }
    });

    if (qtyEl) qtyEl.textContent = locPwFormatStatInt(totalQty);
    if (volEl) volEl.textContent = locPwFormatStatDec(totalVol, 2);
    if (gwEl) gwEl.textContent = locPwFormatStatDec(totalGw, 1);
    if (pltsEl) pltsEl.textContent = locPwFormatStatInt(totalPlts);

    if (selRowsEl) selRowsEl.textContent = String(selRows);
    var hasSel = selRows > 0;
    var setSel = function (el, text) {
      if (!el) return;
      el.textContent = hasSel ? text : '—';
      el.classList.toggle('inactive', !hasSel);
    };
    setSel(selQtyEl, locPwFormatStatInt(selQty));
    setSel(selVolEl, locPwFormatStatDec(selVol, 2));
    setSel(selGwEl, locPwFormatStatDec(selGw, 1));
    setSel(selPltsEl, locPwFormatStatInt(selPlts));
  }

  function locPwGetListRowCheckbox(tr) {
    return tr ? tr.querySelector('td:first-child input[type="checkbox"]') : null;
  }

  function locPwInitListCheckboxes() {
    var table = document.querySelector('.table-wrap table.data-table');
    if (!table || table.getAttribute('data-loc-pw-cb-bound') === '1') return;
    table.setAttribute('data-loc-pw-cb-bound', '1');
    table.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || t.type !== 'checkbox') return;
      if (t.closest('thead')) {
        var checked = t.checked;
        table.querySelectorAll('tbody tr[data-loc-pw-bol]').forEach(function (tr) {
          if (tr.style.display === 'none' || tr.hidden) return;
          if (tr.classList.contains('loc-pw-tr-merge-child')) return;
          var cb = locPwGetListRowCheckbox(tr);
          if (cb) cb.checked = checked;
        });
      }
      locPwRefreshQueryStats();
    });
  }

  function locPwSetHidden(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }

  function locPwSetRo(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }

  /** 叠在 BOL 详情等已有弹窗之上 */
  function locPwBringModalToFront(modalId) {
    var el = document.getElementById(modalId);
    if (!el) return;
    var topZ = 1000;
    document.querySelectorAll('.modal-overlay.show').forEach(function (ov) {
      var z = parseInt(window.getComputedStyle(ov).zIndex, 10);
      if (!isNaN(z) && z > topZ) topZ = z;
    });
    el.style.zIndex = String(topZ + 100);
  }

  function locPwShowStackedModal(modalId) {
    locPwBringModalToFront(modalId);
    showModal(modalId);
  }

  window.showLocPwRowLog = function (ref) {
    var t = document.getElementById('loc-pw-row-log-title');
    if (t) t.textContent = '操作日志 · ' + ref;
    showModal('modal-loc-pw-row-log');
  };

  var LOC_PW_SCHEDULE_FIELD_SUFFIXES = [
    'warehouse', 'depart-time', 'load-type', 'eta', 'vehicle', 'platform',
    'carrier', 'actual-carrier', 'pickup-time', 'plate-no', 'driver-info', 'payable-freight', 'remark'
  ];

  function locPwActualCarrierInputId(prefixOrId) {
    if (String(prefixOrId || '').indexOf('loc-pw-') === 0) return prefixOrId;
    return 'loc-pw-' + prefixOrId + '-actual-carrier';
  }

  function locPwSyncActualCarrierCs(prefixOrId) {
    if (!window.MeekooCreatableSelect) return;
    MeekooCreatableSelect.sync(locPwActualCarrierInputId(prefixOrId));
  }

  function locPwSetActualCarrierValue(inputId, value) {
    if (window.MeekooCreatableSelect) {
      MeekooCreatableSelect.setValue(inputId, value);
      return;
    }
    var el = document.getElementById(inputId);
    if (el) el.value = value == null ? '' : value;
  }

  function locPwBindActualCarrierCreatableSelects() {
    if (window.MeekooCreatableSelect) MeekooCreatableSelect.bind();
  }

  function locPwResetScheduleForm(prefix) {
    LOC_PW_SCHEDULE_FIELD_SUFFIXES.forEach(function (suffix) {
      var el = document.getElementById('loc-pw-' + prefix + '-' + suffix);
      if (el) el.value = '';
    });
    locPwSyncActualCarrierCs(prefix);
  }

  function locPwFillScheduleForm(prefix, data) {
    if (!data) return;
    LOC_PW_SCHEDULE_FIELD_SUFFIXES.forEach(function (suffix) {
      var el = document.getElementById('loc-pw-' + prefix + '-' + suffix);
      if (!el) return;
      var key = locPwScheduleSuffixToKey(suffix);
      if (data[key] == null || data[key] === '') return;
      if (suffix === 'actual-carrier') {
        locPwSetActualCarrierValue(el.id, data[key]);
        return;
      }
      el.value = data[key];
    });
  }

  function locPwGetPriorScheduleData(bol) {
    var ms = locPwGetBolMilestones(bol);
    if (!ms.departed && !ms.loaded && !ms.booked) return null;
    return Object.assign({}, ms.booked || {}, ms.loaded || {}, ms.departed || {});
  }

  function locPwValidateScheduleForm(prefix) {
    var warehouse = ((document.getElementById('loc-pw-' + prefix + '-warehouse') || {}).value || '').trim();
    var eta = ((document.getElementById('loc-pw-' + prefix + '-eta') || {}).value || '').trim();
    var depart = ((document.getElementById('loc-pw-' + prefix + '-depart-time') || {}).value || '').trim();
    var loadType = ((document.getElementById('loc-pw-' + prefix + '-load-type') || {}).value || '').trim();
    // 安排出库 / 已发车：备货仓、预计送达时间、发车类型必填
    if (!warehouse) { showToast('请选择备货仓', 'warning'); return false; }
    if (prefix === 'loaded' && !depart) { showToast('请填写预计发车时间', 'warning'); return false; }
    if (!loadType) { showToast('请选择发车类型', 'warning'); return false; }
    if (!eta) { showToast('请填写预计送达时间', 'warning'); return false; }
    if (prefix === 'departed') {
      // 已发车：派送供应商、实际承运卡司必填；应付运费仅外州私仓必填
      var carrier = ((document.getElementById('loc-pw-departed-carrier') || {}).value || '').trim();
      var actualCarrier = ((document.getElementById('loc-pw-departed-actual-carrier') || {}).value || '').trim();
      var payableFreight = ((document.getElementById('loc-pw-departed-payable-freight') || {}).value || '').trim();
      if (!carrier) { showToast('请选择派送供应商', 'warning'); return false; }
      if (!actualCarrier) { showToast('请选择实际承运卡司', 'warning'); return false; }
      if (!locPwIsLocalPage() && !payableFreight) {
        showToast('请填写应付运费', 'warning');
        return false;
      }
    }
    return true;
  }

  function locPwResetBookedForm() {
    locPwResetScheduleForm('booked');
  }

  window.locPwOpenBooked = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    locPwOpenBookedModal(bol);
  };

  window.locPwOpenStartProcessingModal = function (bol) {
    var tr = locPwFindRow(bol);
    if (locPwRejectMergeChildAction(tr, '处理中')) return;
    locPwSetHidden('loc-pw-start-processing-bol', bol);
    locPwResetScheduleForm('start-processing');
    var booked = locPwGetBolMilestones(bol).booked || {};
    locPwFillScheduleForm('start-processing', booked);
    var remarkEl = document.getElementById('loc-pw-start-processing-remark');
    if (remarkEl && !String(remarkEl.value || '').trim()) remarkEl.value = locPwGetApptRemark(bol);
    locPwBindActualCarrierCreatableSelects();
    locPwSyncActualCarrierCs('start-processing');
    var title = document.getElementById('loc-pw-start-processing-title');
    if (title) title.textContent = '处理中 · ' + bol;
    locPwShowStackedModal('modal-loc-pw-start-processing');
  };

  window.locPwConfirmStartProcessing = function () {
    var bol = ((document.getElementById('loc-pw-start-processing-bol') || {}).value || '').trim();
    if (!bol) return;
    if (locPwRejectMergeChildAction(locPwFindRow(bol), '处理中')) return;
    var schedule = locPwCollectScheduleForm('start-processing');
    locPwSetApptRemark(bol, schedule.remark || '');
    locPwSaveBolMilestone(bol, 'booked', Object.assign({}, locPwGetBolMilestones(bol).booked || {}, schedule));
    closeModal('modal-loc-pw-start-processing');
    closeModal('modal-loc-pw-bol-detail');
    locPwSetRowStatus(bol, '处理中');
    showToast('已进入处理中（演示）：' + bol, 'success');
  };

  window.locPwOpenBookedModal = function (bol) {
    var tr = locPwFindRow(bol);
    if (locPwRejectMergeChildAction(tr, '处理中/安排出库')) return;
    var status = tr ? locPwGetRowStatus(tr) : '';
    if (status === '待处理') {
      locPwOpenStartProcessingModal(bol);
      return;
    }
    locPwSetHidden('loc-pw-booked-bol', bol);
    locPwResetBookedForm();
    locPwFillScheduleForm('booked', locPwGetBolMilestones(bol).booked);
    var remarkEl = document.getElementById('loc-pw-booked-remark');
    if (remarkEl && !String(remarkEl.value || '').trim()) remarkEl.value = locPwGetApptRemark(bol);
    var title = document.getElementById('loc-pw-booked-title');
    if (title) title.textContent = '安排出库 · ' + bol;
    locPwShowStackedModal('modal-loc-pw-booked');
  };

  window.locPwConfirmBooked = function () {
    var bol = ((document.getElementById('loc-pw-booked-bol') || {}).value || '').trim();
    if (!locPwValidateScheduleForm('booked')) return;
    var schedule = locPwCollectScheduleForm('booked');
    locPwSetApptRemark(bol, schedule.remark || '');
    locPwSaveBolMilestone(bol, 'booked', schedule);
    closeModal('modal-loc-pw-booked');
    closeModal('modal-loc-pw-bol-detail');
    locPwSetRowStatus(bol, '待取货');
    showToast('安排出库已保存（演示）：' + bol, 'success');
  };

  var LOC_PW_EDIT_BOL_FIELD_SUFFIXES = [
    'warehouse', 'load-type', 'eta', 'vehicle', 'platform',
    'carrier', 'actual-carrier', 'pickup-time', 'plate-no', 'driver-info',
    'payable-freight', 'remark'
  ];

  /** 已签收仅允许改运力相关字段 */
  var LOC_PW_EDIT_BOL_SIGNED_FIELDS = [
    'carrier', 'actualCarrier', 'pickupTime', 'plateNo', 'driverInfo', 'payableFreight'
  ];

  function locPwEditBolAllowedStatuses() {
    return { '处理中': 1, '待取货': 1, '运输中': 1, '已签收': 1 };
  }

  function locPwEditBolVisibleFields(status) {
    if (status === '已签收') return LOC_PW_EDIT_BOL_SIGNED_FIELDS.slice();
    var fields = [
      'eta', 'loadType', 'vehicle', 'platform',
      'carrier', 'actualCarrier', 'pickupTime', 'plateNo', 'driverInfo',
      'payableFreight', 'remark'
    ];
    // 处理中 / 待取货展示备货仓；运输中不可改 → 不展示
    if (status === '处理中' || status === '待取货') fields.unshift('warehouse');
    if (status === '运输中') fields.push('departRemark');
    return fields;
  }

  function locPwEditBolRequiredKeys(status) {
    var req = {};
    if (status === '待取货') {
      req.eta = 1;
      req.loadType = 1;
    } else if (status === '运输中') {
      req.eta = 1;
      req.loadType = 1;
      req.carrier = 1;
      req.actualCarrier = 1;
      if (!locPwIsLocalPage()) req.payableFreight = 1;
    } else if (status === '已签收') {
      req.carrier = 1;
      req.actualCarrier = 1;
      if (!locPwIsLocalPage()) req.payableFreight = 1;
    }
    return req;
  }

  function locPwApplyEditBolInfoFieldVisibility(status) {
    var modal = document.getElementById('modal-loc-pw-edit-bol-info');
    var visible = {};
    locPwEditBolVisibleFields(status).forEach(function (k) { visible[k] = 1; });
    var showSchedule = status === '处理中' || status === '待取货' || status === '运输中' || status === '已签收';
    var scheduleWrap = document.getElementById('loc-pw-edit-bol-info-schedule-wrap');
    if (scheduleWrap) scheduleWrap.style.display = showSchedule ? '' : 'none';

    if (modal) {
      Array.prototype.forEach.call(modal.querySelectorAll('[data-edit-bol-field]'), function (el) {
        var key = el.getAttribute('data-edit-bol-field');
        el.style.display = visible[key] ? '' : 'none';
      });
    }

    var wh = document.getElementById('loc-pw-edit-bol-info-warehouse');
    // 处理中可改；待取货置灰；运输中/已签收不展示
    if (wh) wh.disabled = (status === '待取货');

    var required = locPwEditBolRequiredKeys(status);
    if (modal) {
      Array.prototype.forEach.call(modal.querySelectorAll('[data-edit-bol-req]'), function (el) {
        var key = el.getAttribute('data-edit-bol-req');
        el.style.display = required[key] ? '' : 'none';
      });
    }
  }

  function locPwCollectEditBolInfoForm() {
    var data = {};
    LOC_PW_EDIT_BOL_FIELD_SUFFIXES.forEach(function (suffix) {
      var el = document.getElementById('loc-pw-edit-bol-info-' + suffix);
      data[locPwScheduleSuffixToKey(suffix)] = el ? String(el.value || '').trim() : '';
    });
    var dr = document.getElementById('loc-pw-edit-bol-info-depart-remark');
    data.departRemark = dr ? String(dr.value || '').trim() : '';
    return data;
  }

  function locPwFillEditBolInfoForm(data) {
    data = data || {};
    LOC_PW_EDIT_BOL_FIELD_SUFFIXES.forEach(function (suffix) {
      var el = document.getElementById('loc-pw-edit-bol-info-' + suffix);
      if (!el) return;
      var key = locPwScheduleSuffixToKey(suffix);
      var val = data[key] == null ? '' : data[key];
      if (suffix === 'actual-carrier') {
        locPwSetActualCarrierValue(el.id, val);
        return;
      }
      el.value = val;
    });
    var dr = document.getElementById('loc-pw-edit-bol-info-depart-remark');
    if (dr) dr.value = data.departRemark || '';
  }

  function locPwPickBookedPatch(form) {
    return {
      warehouse: form.warehouse || '',
      loadType: form.loadType || '',
      eta: form.eta || '',
      vehicle: form.vehicle || '',
      platform: form.platform || '',
      carrier: form.carrier || '',
      actualCarrier: form.actualCarrier || '',
      pickupTime: form.pickupTime || '',
      plateNo: form.plateNo || '',
      driverInfo: form.driverInfo || '',
      payableFreight: form.payableFreight || '',
      remark: form.remark || ''
    };
  }

  function locPwPickLoadedPatch(form) {
    return {
      warehouse: form.warehouse || '',
      loadType: form.loadType || '',
      eta: form.eta || '',
      vehicle: form.vehicle || '',
      platform: form.platform || '',
      carrier: form.carrier || '',
      actualCarrier: form.actualCarrier || '',
      pickupTime: form.pickupTime || '',
      plateNo: form.plateNo || '',
      driverInfo: form.driverInfo || '',
      remark: form.remark || ''
    };
  }

  function locPwPickDepartedPatch(form) {
    return {
      warehouse: form.warehouse || '',
      loadType: form.loadType || '',
      eta: form.eta || '',
      vehicle: form.vehicle || '',
      platform: form.platform || '',
      carrier: form.carrier || '',
      actualCarrier: form.actualCarrier || '',
      pickupTime: form.pickupTime || '',
      plateNo: form.plateNo || '',
      driverInfo: form.driverInfo || '',
      payableFreight: form.payableFreight || '',
      remark: form.remark || '',
      departRemark: form.departRemark || ''
    };
  }

  function locPwPickSignedPatch(form) {
    return {
      carrier: form.carrier || '',
      actualCarrier: form.actualCarrier || '',
      pickupTime: form.pickupTime || '',
      plateNo: form.plateNo || '',
      driverInfo: form.driverInfo || '',
      payableFreight: form.payableFreight || ''
    };
  }

  function locPwValidateEditBolInfo(status, form) {
    var required = locPwEditBolRequiredKeys(status);
    if (required.eta && !form.eta) { showToast('请填写预计送达时间', 'warning'); return false; }
    if (required.loadType && !form.loadType) { showToast('请选择发车类型', 'warning'); return false; }
    if (required.carrier && !form.carrier) { showToast('请选择派送供应商', 'warning'); return false; }
    if (required.actualCarrier && !form.actualCarrier) { showToast('请选择实际承运卡司', 'warning'); return false; }
    if (required.payableFreight && !form.payableFreight) { showToast('请填写应付运费', 'warning'); return false; }
    return true;
  }

  function locPwMergeDepartedPreserveVouchers(ms, patch) {
    var departedPatch = Object.assign({}, ms.departed || {}, patch);
    if (ms.departed && ms.departed.departVoucherFiles) {
      departedPatch.departVoucherFiles = ms.departed.departVoucherFiles;
    }
    return departedPatch;
  }

  window.locPwOpenEditBolInfo = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    if (!bol) return showToast('请从行操作进入修改 BOL', 'warning');
    var tr = locPwFindRow(bol);
    if (!tr) return showToast('未找到该 BOL', 'warning');
    if (tr.classList.contains('loc-pw-tr-merge-child')) {
      return showToast('请选择合并发货父行或独立 BOL', 'warning');
    }
    var status = locPwGetRowStatus(tr);
    if (!locPwEditBolAllowedStatuses()[status]) {
      return showToast('仅「处理中」「待取货」「运输中」「已签收」可修改 BOL 信息', 'warning');
    }
    locPwSetHidden('loc-pw-edit-bol-info-bol', bol);
    locPwSetHidden('loc-pw-edit-bol-info-status', status);
    locPwApplyEditBolInfoFieldVisibility(status);
    var ms = locPwGetBolMilestones(bol);
    var data = Object.assign({}, ms.booked || {}, ms.loaded || {}, ms.departed || {});
    if (!data.remark) data.remark = locPwGetApptRemark(bol) || '';
    locPwFillEditBolInfoForm(data);
    locPwBindActualCarrierCreatableSelects();
    locPwSyncActualCarrierCs('edit-bol-info');
    var title = document.getElementById('loc-pw-edit-bol-info-title');
    if (title) title.textContent = '修改BOL · ' + bol + '（' + status + '）';
    locPwShowStackedModal('modal-loc-pw-edit-bol-info');
  };

  window.locPwConfirmEditBolInfo = function () {
    var bol = ((document.getElementById('loc-pw-edit-bol-info-bol') || {}).value || '').trim();
    var status = ((document.getElementById('loc-pw-edit-bol-info-status') || {}).value || '').trim();
    if (!bol) return;
    if (!locPwEditBolAllowedStatuses()[status]) {
      return showToast('仅「处理中」「待取货」「运输中」「已签收」可修改 BOL 信息', 'warning');
    }
    var form = locPwCollectEditBolInfoForm();
    if (!locPwValidateEditBolInfo(status, form)) return;

    var ms = locPwGetBolMilestones(bol);

    if (status === '处理中') {
      locPwSetApptRemark(bol, form.remark);
      locPwSaveBolMilestone(bol, 'booked', Object.assign({}, ms.booked || {}, locPwPickBookedPatch(form)));
    } else if (status === '待取货') {
      locPwSetApptRemark(bol, form.remark);
      // 仅更新 booked；不新建 loaded，避免时间线误出「已装车」
      locPwSaveBolMilestone(bol, 'booked', Object.assign({}, ms.booked || {}, locPwPickBookedPatch(form)));
      if (ms.loaded) {
        locPwSaveBolMilestone(bol, 'loaded', Object.assign({}, ms.loaded || {}, locPwPickLoadedPatch(form)));
      }
    } else if (status === '运输中') {
      locPwSetApptRemark(bol, form.remark);
      // 备货仓不展示、不可改：补丁里去掉 warehouse，保留原里程碑值
      var bookedPatchInTransit = locPwPickBookedPatch(form);
      delete bookedPatchInTransit.warehouse;
      locPwSaveBolMilestone(bol, 'booked', Object.assign({}, ms.booked || {}, bookedPatchInTransit));
      if (ms.loaded) {
        var loadedPatchInTransit = locPwPickLoadedPatch(form);
        delete loadedPatchInTransit.warehouse;
        locPwSaveBolMilestone(bol, 'loaded', Object.assign({}, ms.loaded || {}, loadedPatchInTransit));
      }
      var departedPatchInTransit = locPwPickDepartedPatch(form);
      delete departedPatchInTransit.warehouse;
      locPwSaveBolMilestone(bol, 'departed', locPwMergeDepartedPreserveVouchers(ms, departedPatchInTransit));
    } else if (status === '已签收') {
      var signedPatch = locPwPickSignedPatch(form);
      if (ms.booked) locPwSaveBolMilestone(bol, 'booked', Object.assign({}, ms.booked, signedPatch));
      if (ms.loaded) locPwSaveBolMilestone(bol, 'loaded', Object.assign({}, ms.loaded, signedPatch));
      locPwSaveBolMilestone(bol, 'departed', locPwMergeDepartedPreserveVouchers(ms, signedPatch));
    }

    closeModal('modal-loc-pw-edit-bol-info');
    var detailBol = ((document.getElementById('loc-pw-bol-detail-bol') || {}).value || '').trim();
    if (detailBol === bol) locPwRenderBolDetail(bol);
    showToast('BOL 信息已更新（演示）：' + bol, 'success');
  };

  window.locPwRemoveDepartVoucherKept = function (index) {
    var kept = LOC_PW_DEPART_VOUCHER_DRAFT.kept || [];
    var f = kept[index];
    if (!f) return;
    var bol = LOC_PW_DEPART_VOUCHER_DRAFT.bol || '';
    var pendingCount = (LOC_PW_DEPART_VOUCHER_DRAFT.pending || []).length;
    var msg = '确定删除发车凭证「' + f.name + '」？';
    if (kept.length === 1 && !pendingCount) {
      msg += '\n这是当前最后一份凭证，删除后将暂无发车凭证且立即生效（无法撤销），请确认后尽快补传。';
    } else {
      msg += '\n删除后立即生效，无法撤销。';
    }
    function doRemove() {
      kept.splice(index, 1);
      locPwPersistDepartVoucherKept(bol);
      locPwRenderDepartVoucherDraftList();
      showToast('已删除发车凭证：' + f.name, 'success');
    }
    if (typeof openSharedConfirm === 'function') {
      openSharedConfirm('删除发车凭证', msg).then(function (ok) {
        if (ok) doRemove();
      });
      return;
    }
    if (!window.confirm(msg)) return;
    doRemove();
  };

  window.locPwPreviewDepartVoucherKept = function (index) {
    var f = (LOC_PW_DEPART_VOUCHER_DRAFT.kept || [])[index];
    if (!f) return;
    if (!locPwCanPreviewFileName(f.name)) return showToast('该文件类型暂不支持预览', 'warning');
    locPwOpenFilePreview(f.name, { demo: true });
  };

  window.locPwRemoveDepartVoucherPending = function (index) {
    if (!LOC_PW_DEPART_VOUCHER_DRAFT.pending) return;
    LOC_PW_DEPART_VOUCHER_DRAFT.pending.splice(index, 1);
    locPwRenderDepartVoucherDraftList();
  };

  window.locPwPreviewDepartVoucherPending = function (index) {
    var f = (LOC_PW_DEPART_VOUCHER_DRAFT.pending || [])[index];
    if (!f) return;
    if (!(f.file instanceof File)) return showToast('该文件类型暂不支持预览', 'warning');
    locPwOpenFilePreview(f.name, { file: f.file });
  };

  window.locPwOnDepartVoucherFilePick = function () {
    var fi = document.getElementById('loc-pw-outbound-doc-file');
    if (!fi || !fi.files || !fi.files.length) return;
    Array.prototype.forEach.call(fi.files, function (file) {
      LOC_PW_DEPART_VOUCHER_DRAFT.pending.push({
        name: file.name || '发车凭证',
        file: file,
        size: file.size,
        by: '演示用户'
      });
    });
    fi.value = '';
    locPwRenderDepartVoucherDraftList();
  };

  window.locPwOpenUploadOutboundDoc = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr = locPwFindRow(bol);
    if (!tr) return showToast('未找到该 BOL', 'warning');
    if (locPwRejectMergeChildAction(tr, '修改发车凭证')) return;
    if (locPwGetRowStatus(tr) !== '运输中') {
      return showToast('仅「运输中」可修改发车凭证', 'warning');
    }
    locPwSetHidden('loc-pw-outbound-doc-bol', bol);
    var fi = document.getElementById('loc-pw-outbound-doc-file');
    var remark = document.getElementById('loc-pw-outbound-doc-remark');
    if (fi) fi.value = '';
    if (remark) remark.value = '';
    var existing = locPwGetDepartVoucherFiles(bol);
    LOC_PW_DEPART_VOUCHER_DRAFT = {
      bol: bol,
      kept: locPwCloneDepartVoucherFiles(existing),
      pending: []
    };
    locPwRenderDepartVoucherDraftList();
    var title = document.getElementById('loc-pw-outbound-doc-title');
    if (title) {
      title.textContent = (existing.length ? '修改发车凭证' : '上传发车凭证') + ' · ' + bol;
    }
    locPwShowStackedModal('modal-loc-pw-outbound-doc');
  };

  window.locPwConfirmUploadOutboundDoc = function () {
    var bol = ((document.getElementById('loc-pw-outbound-doc-bol') || {}).value || '').trim();
    if (!bol) return;
    var tr = locPwFindRow(bol);
    if (locPwRejectMergeChildAction(tr, '修改发车凭证')) return;
    if (!tr || locPwGetRowStatus(tr) !== '运输中') {
      return showToast('仅「运输中」可修改发车凭证', 'warning');
    }
    var kept = LOC_PW_DEPART_VOUCHER_DRAFT.kept || [];
    var pending = LOC_PW_DEPART_VOUCHER_DRAFT.pending || [];
    if (!pending.length) {
      closeModal('modal-loc-pw-outbound-doc');
      return showToast('没有待保存的新文件（已有凭证的删除已即时生效）', 'info');
    }
    var remark = ((document.getElementById('loc-pw-outbound-doc-remark') || {}).value || '').trim();
    var now = locPwFormatNow();
    var finalFiles = kept.map(function (f) {
      return { name: f.name, remark: f.remark || '', at: f.at || '', by: f.by || '', size: f.size != null ? f.size : null };
    });
    pending.forEach(function (f) {
      finalFiles.push({
        name: f.name,
        remark: remark,
        at: now,
        by: f.by || '演示用户',
        size: f.size != null ? f.size : (f.file && f.file.size != null ? f.file.size : null)
      });
    });
    locPwSetDepartVoucherFiles(bol, finalFiles);
    closeModal('modal-loc-pw-outbound-doc');
    var rowTr = locPwFindRow(bol);
    if (rowTr) locPwSyncRowAttachFileCells(rowTr);
    var detailBol = ((document.getElementById('loc-pw-bol-detail-bol') || {}).value || '').trim();
    if (detailBol === bol) locPwRenderBolDetail(bol);
    showToast('新发车凭证已保存（演示）：' + bol + ' · 新增 ' + pending.length + ' 个，共 ' + finalFiles.length + ' 个文件', 'success');
  };

  window.locPwOpenLoaded = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    locPwSetHidden('loc-pw-loaded-bol', bol);
    locPwSetRo('loc-pw-loaded-bol-ro', bol);
    locPwResetScheduleForm('loaded');
    locPwFillScheduleForm('loaded', locPwGetPriorScheduleData(bol) || locPwGetBolMilestones(bol).loaded);
    var title = document.getElementById('loc-pw-loaded-title');
    if (title) title.textContent = '已装车 · ' + bol;
    showModal('modal-loc-pw-loaded');
  };

  window.locPwConfirmLoaded = function () {
    var bol = ((document.getElementById('loc-pw-loaded-bol') || {}).value || '').trim();
    if (!locPwValidateScheduleForm('loaded')) return;
    locPwSaveBolMilestone(bol, 'loaded', locPwCollectScheduleForm('loaded'));
    closeModal('modal-loc-pw-loaded');
    locPwSetRowStatus(bol, '待取货');
    showToast('装车信息已确认（演示）：' + bol, 'success');
  };

  window.locPwOpenDeparted = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    locPwSetHidden('loc-pw-departed-bol', bol);
    locPwResetScheduleForm('departed');
    var ms = locPwGetBolMilestones(bol);
    locPwFillScheduleForm('departed', locPwGetPriorScheduleData(bol));
    var departRemark = document.getElementById('loc-pw-departed-depart-remark');
    if (departRemark) departRemark.value = (ms.departed && ms.departed.departRemark) || '';
    var voucherFi = document.getElementById('loc-pw-departed-voucher-file');
    if (voucherFi) voucherFi.value = '';
    locPwSetFileDropName('loc-pw-departed-voucher-name', null);
    var title = document.getElementById('loc-pw-departed-title');
    if (title) title.textContent = '已发车 · ' + bol;
    showModal('modal-loc-pw-departed');
  };

  window.locPwConfirmDeparted = function () {
    var bol = ((document.getElementById('loc-pw-departed-bol') || {}).value || '').trim();
    if (!locPwValidateScheduleForm('departed')) return;
    var voucherFi = document.getElementById('loc-pw-departed-voucher-file');
    if (!voucherFi || !voucherFi.files || !voucherFi.files.length) {
      return showToast('请上传发车凭证', 'warning');
    }
    var voucherFile = voucherFi.files[0];
    var voucherName = voucherFile.name || '发车凭证';
    var milestoneData = locPwCollectScheduleForm('departed');
    milestoneData.departVoucherFiles = [{
      name: voucherName,
      by: '演示用户',
      at: locPwFormatNow(),
      size: voucherFile.size != null ? voucherFile.size : null
    }];
    locPwSaveBolMilestone(bol, 'departed', milestoneData);
    closeModal('modal-loc-pw-departed');
    locPwSetRowStatus(bol, '运输中');
    var trDeparted = locPwFindRow(bol);
    if (trDeparted) locPwSyncRowAttachFileCells(trDeparted);
    showToast('已发车已确认（演示）：' + bol + ' · ' + voucherName + '，状态已更新为运输中', 'success');
  };

  window.locPwOpenCancelBooked = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    locPwSetHidden('loc-pw-cancel-booked-bol', bol);
    locPwSetRo('loc-pw-cancel-booked-bol-ro', bol);
    var rs = document.getElementById('loc-pw-cancel-booked-reason');
    var dt = document.getElementById('loc-pw-cancel-booked-detail');
    if (rs) rs.value = '';
    if (dt) dt.value = '';
    var title = document.getElementById('loc-pw-cancel-booked-title');
    if (title) title.textContent = '取消预约 · ' + bol;
    showModal('modal-loc-pw-cancel-booked');
  };

  window.locPwConfirmCancelBooked = function () {
    var bol = ((document.getElementById('loc-pw-cancel-booked-bol') || {}).value || '').trim();
    var reason = ((document.getElementById('loc-pw-cancel-booked-reason') || {}).value || '').trim();
    var detail = ((document.getElementById('loc-pw-cancel-booked-detail') || {}).value || '').trim();
    if (!reason) return showToast('请选择取消原因', 'warning');
    if (!detail) return showToast('请填写说明', 'warning');
    closeModal('modal-loc-pw-cancel-booked');
    locPwClearBolBookedMilestone(bol);
    locPwSetRowStatus(bol, '处理中');
    showToast('已取消安排（演示）：' + bol + '，状态已回退为处理中', 'success');
  };

  window.locPwOpenUndoLoaded = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    locPwSetHidden('loc-pw-undo-loaded-bol', bol);
    locPwSetRo('loc-pw-undo-loaded-bol-ro', bol);
    var rs = document.getElementById('loc-pw-undo-loaded-reason');
    var dt = document.getElementById('loc-pw-undo-loaded-detail');
    if (rs) rs.value = '';
    if (dt) dt.value = '';
    var title = document.getElementById('loc-pw-undo-loaded-title');
    if (title) title.textContent = '撤销装车 · ' + bol;
    showModal('modal-loc-pw-undo-loaded');
  };

  window.locPwConfirmUndoLoaded = function () {
    var bol = ((document.getElementById('loc-pw-undo-loaded-bol') || {}).value || '').trim();
    var reason = ((document.getElementById('loc-pw-undo-loaded-reason') || {}).value || '').trim();
    var detail = ((document.getElementById('loc-pw-undo-loaded-detail') || {}).value || '').trim();
    if (!reason) return showToast('请选择撤销原因', 'warning');
    if (!detail) return showToast('请填写说明', 'warning');
    closeModal('modal-loc-pw-undo-loaded');
    locPwClearBolLoadedMilestone(bol);
    locPwSetRowStatus(bol, '待取货');
    showToast('撤销装车已确认（演示）：' + bol + '，状态已回退为待取货', 'success');
  };

  function locPwUpdatePalletPickListStats() {
    var cbs = document.querySelectorAll('#loc-pw-pallet-pick-tbody .loc-pw-pallet-pick-cb');
    var total = cbs.length;
    var selected = 0;
    for (var i = 0; i < cbs.length; i++) {
      if (cbs[i].checked) selected++;
    }
    var stats = document.getElementById('loc-pw-pallet-pick-list-stats');
    if (stats) stats.textContent = '总板数 ' + total + ' · 已勾选 ' + selected;
  }

  function locPwBindPalletPickCheckboxStats() {
    document.querySelectorAll('#loc-pw-pallet-pick-tbody .loc-pw-pallet-pick-cb').forEach(function (cb) {
      cb.addEventListener('change', locPwUpdatePalletPickListStats);
    });
  }

  function locPwRenderPalletPickModal(bol) {
    var pallets = locPwGetPalletLabelsForBol(bol);
    var total = pallets.length;
    var maxPick = Math.max(total - 1, 1);
    var title = document.getElementById('loc-pw-pallet-pick-title');
    var tip = document.getElementById('loc-pw-pallet-pick-tip');
    var bolRo = document.getElementById('loc-pw-pallet-pick-bol-ro');
    var qtyInput = document.getElementById('loc-pw-pallet-pick-qty');
    var qtyHint = document.getElementById('loc-pw-pallet-pick-qty-hint');
    var tbody = document.getElementById('loc-pw-pallet-pick-tbody');
    if (title) title.textContent = '拆分发货 · ' + bol;
    if (bolRo) bolRo.value = bol;
    if (tip) {
      tip.textContent = '可输入本次拆分板数（填完或按回车后按列表顺序自动勾选），也可手工勾选板标；至少勾选 1 板，且须在原 BOL 保留至少 1 板。';
    }
    if (qtyInput) {
      qtyInput.value = '';
      qtyInput.min = '1';
      qtyInput.max = String(maxPick);
      qtyInput.setAttribute('data-max-pick', String(maxPick));
    }
    if (qtyHint) qtyHint.textContent = '最多输入 ' + maxPick;
    if (!tbody) return;
    tbody.innerHTML = pallets.map(function (p) {
      return '<tr>' +
        '<td><input type="checkbox" class="loc-pw-pallet-pick-cb" value="' + esc(p.pltNo) + '"></td>' +
        '<td><strong>' + esc(p.pltNo) + '</strong></td>' +
        '<td>' + esc(p.pieces) + '</td>' +
        '<td><span class="loc-pw-plt-st ' + locPwPltStatusCls(p.status) + '">' + esc(p.status) + '</span></td>' +
        '<td>' + esc(p.location) + '</td>' +
        '<td>' + esc(p.warehouseZone) + '</td>' +
        '<td>' + esc(p.warehouseName) + '</td>' +
        '<td>' + esc(p.container) + '</td>' +
        '<td>' + esc(p.sysNo) + '</td>' +
        '</tr>';
    }).join('');
    locPwBindPalletPickCheckboxStats();
    locPwUpdatePalletPickListStats();
  }

  /** 输入完成后按列表当前顺序勾选前 N 板（覆盖已有勾选） */
  window.locPwApplyPalletPickByCount = function () {
    var input = document.getElementById('loc-pw-pallet-pick-qty');
    if (!input) return;
    var raw = String(input.value == null ? '' : input.value).trim();
    if (raw === '') return;
    var cbs = document.querySelectorAll('#loc-pw-pallet-pick-tbody .loc-pw-pallet-pick-cb');
    var total = cbs.length;
    var maxPick = total > 0 ? total - 1 : 0;
    var n = parseInt(raw, 10);
    if (!/^\d+$/.test(raw) || !Number.isFinite(n) || n < 1 || n > maxPick) {
      return showToast('请输入 1～' + maxPick + ' 的整数板数', 'warning');
    }
    for (var i = 0; i < cbs.length; i++) {
      cbs[i].checked = i < n;
    }
    input.value = String(n);
    locPwUpdatePalletPickListStats();
  };

  window.locPwOpenSplit = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    if (!bol) {
      var rows = locPwGetCheckedBolRows();
      if (rows.length !== 1) {
        return showToast('请勾选且仅勾选 1 条「普通发货」记录进行拆分', 'warning');
      }
      bol = rows[0].getAttribute('data-loc-pw-bol');
    }
    var tr = locPwFindRow(bol);
    if (!tr) return showToast('未找到该 BOL', 'warning');
    var splitStatus = locPwGetRowStatus(tr);
    if (splitStatus !== '待处理') {
      return showToast('仅「待处理」可拆分发货', 'warning');
    }
    if (locPwGetShipMode(tr) !== 'normal') {
      return showToast('仅「普通发货」模式可拆分发货', 'warning');
    }
    if (!locPwCanPalletSplit(tr)) {
      return showToast('实际板数为 1 板时不允许拆分发货', 'warning');
    }
    locPwSetHidden('loc-pw-split-bol', bol);
    locPwRenderPalletPickModal(bol);
    showModal('modal-split');
  };

  window.locPwConfirmPalletPick = function () {
    var bol = ((document.getElementById('loc-pw-split-bol') || {}).value || '').trim();
    var tr = locPwFindRow(bol);
    if (!tr) {
      closeModal('modal-split');
      return showToast('未找到该 BOL', 'warning');
    }
    var total = locPwGetPalletLabelsForBol(bol).length;
    var picked = [];
    document.querySelectorAll('#loc-pw-pallet-pick-tbody .loc-pw-pallet-pick-cb:checked').forEach(function (cb) {
      picked.push(cb.value);
    });
    if (!picked.length) return showToast('请至少勾选 1 个板标', 'warning');
    if (picked.length >= total) {
      return showToast('须在原 BOL 保留至少 1 板，不能勾选全部板标', 'warning');
    }
    closeModal('modal-split');
    showToast('拆分发货已提交（演示）：' + bol + ' · ' + picked.join('、'), 'success');
  };

  window.locPwOpenReturn = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr = locPwFindRow(bol);
    if (!tr) return showToast('未找到该 BOL', 'warning');
    var status = locPwGetRowStatus(tr);
    if (status !== '运输中' && status !== '已签收') {
      return showToast('仅「运输中」或「已签收」的 BOL 可单项退仓。当前为「' + status + '」。', 'warning');
    }
    LOC_PW_RETURN_FROM[bol] = status;
    locPwSetHidden('loc-pw-return-bol', bol);
    locPwResetReturnForm();
    locPwFillReturnSummary(bol, tr);
    locPwApplyReturnModalPhase('notify');
    var title = document.getElementById('loc-pw-return-title');
    if (title) title.textContent = '单项退仓 · ' + bol;
    showModal('modal-loc-pw-return');
  };

  window.locPwOpenReturnComplete = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr = locPwFindRow(bol);
    if (!tr) return showToast('未找到该 BOL', 'warning');
    if (locPwGetRowStatus(tr) !== '退仓待执行') {
      return showToast('仅「退仓待执行」可操作退仓完成', 'warning');
    }
    locPwSetHidden('loc-pw-return-bol', bol);
    locPwResetReturnForm();
    locPwFillReturnSummary(bol, tr, '退仓待执行');
    locPwApplyReturnModalPhase('complete-only');
    var title = document.getElementById('loc-pw-return-title');
    if (title) title.textContent = '单项退仓完成 · ' + bol;
    showModal('modal-loc-pw-return');
  };

  window.locPwConfirmReturnInitiate = function () {
    var bol = ((document.getElementById('loc-pw-return-bol') || {}).value || '').trim();
    var tr = locPwFindRow(bol);
    if (!tr) { closeModal('modal-loc-pw-return'); return showToast('未找到该 BOL', 'warning'); }
    var form = locPwValidateReturnForm(false);
    if (!form) return;
    closeModal('modal-loc-pw-return');
    locPwSetRowStatus(bol, '退仓待执行');
    showToast('通知仓库退仓已提交（演示）：' + bol + ' → 退仓待执行', 'success');
  };

  window.locPwConfirmReturnExecute = function () {
    var bol = ((document.getElementById('loc-pw-return-bol') || {}).value || '').trim();
    var tr = locPwFindRow(bol);
    if (!tr) { closeModal('modal-loc-pw-return'); return showToast('未找到该 BOL', 'warning'); }
    if (locPwGetRowStatus(tr) !== '退仓待执行') {
      return showToast('仅「退仓待执行」可确认退仓完成', 'warning');
    }
    var form = locPwValidateReturnForm(true);
    if (!form) return;
    closeModal('modal-loc-pw-return');
    locPwSetRowStatus(bol, '处理中');
    showToast('确认退仓完成已提交（演示）：' + bol + ' → 处理中' + (form.fileName ? ' · ' + form.fileName : ''), 'success');
  };

  window.locPwRevokeReturn = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr = locPwFindRow(bol);
    if (!tr) return showToast('未找到该 BOL', 'warning');
    if (locPwGetRowStatus(tr) !== '退仓待执行') {
      return showToast('仅「退仓待执行」可撤销退仓', 'warning');
    }
    var msg = '将撤回 BOL「' + bol + '」的退仓指令，恢复为「' + (LOC_PW_RETURN_FROM[bol] || '运输中') + '」。';
    if (typeof openSharedConfirm !== 'function') {
      if (!window.confirm(msg)) return;
      locPwSetRowStatus(bol, LOC_PW_RETURN_FROM[bol] || '运输中');
      return showToast('已撤销退仓（演示）', 'success');
    }
    openSharedConfirm('撤销退仓指令', msg).then(function (ok) {
      if (!ok) return;
      locPwSetRowStatus(bol, LOC_PW_RETURN_FROM[bol] || '运输中');
      showToast('已撤销退仓（演示）', 'success');
    });
  };

  window.locPwDownloadPod = function (bol) {
    bol = String(bol || '').trim();
    if (!bol) return;
    showToast('POD 已下载（演示）：' + bol, 'success');
  };

  function locPwFormatDisplayDateTime(val) {
    if (!val) return '—';
    return String(val).trim().replace('T', ' ').slice(0, 16);
  }

  function locPwSetPodDownloadCell(tr, bol) {
    locPwSyncRowAttachFileCells(tr);
  }

  window.locPwOpenUploadPod = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    locPwSetHidden('loc-pw-upload-pod-bol', bol);
    var tr = locPwFindRow(bol);
    var custRef = tr ? locPwGetRowCustRef(tr) : '';
    locPwSetRo('loc-pw-upload-pod-bol-ro', custRef || '—');
    var title = document.getElementById('loc-pw-upload-pod-title');
    if (title) title.textContent = '上传 POD · ' + bol;
    var fi = document.getElementById('loc-pw-upload-pod-file');
    if (fi) fi.value = '';
    locPwSetFileDropName('loc-pw-upload-pod-name', null);
    var remarkEl = document.getElementById('loc-pw-upload-pod-remark');
    if (remarkEl) remarkEl.value = '';
    var st = document.getElementById('loc-pw-upload-pod-sign-time');
    if (st) st.value = '';
    showModal('modal-loc-pw-upload-pod');
  };

  window.locPwConfirmUploadPod = function () {
    var bol = ((document.getElementById('loc-pw-upload-pod-bol') || {}).value || '').trim();
    var st = ((document.getElementById('loc-pw-upload-pod-sign-time') || {}).value || '').trim();
    var fi = document.getElementById('loc-pw-upload-pod-file');
    if (!st) return showToast('请填写签收时间', 'warning');
    if (!fi || !fi.files || !fi.files.length) return showToast('请选择要上传的 POD 附件', 'warning');
    var name = fi.files[0].name || '附件';
    closeModal('modal-loc-pw-upload-pod');
    var remarkEl = document.getElementById('loc-pw-upload-pod-remark');
    locPwSaveBolMilestone(bol, 'signed', {
      signTime: st,
      podFiles: [{ name: name }],
      remark: remarkEl ? String(remarkEl.value || '').trim() : ''
    });
    locPwSetRowStatus(bol, '已签收');
    var tr = locPwFindRow(bol);
    if (tr && tr.cells) {
      if (tr.cells[LOC_PW_COL.signTime]) tr.cells[LOC_PW_COL.signTime].textContent = locPwFormatDisplayDateTime(st);
      locPwSetPodDownloadCell(tr, bol);
    }
    showToast('POD 已提交（演示）：' + bol + ' · ' + name + '，状态已更新为已签收', 'success');
  };

  window.locPwOpenEditVoucher = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    locPwSetHidden('loc-pw-edit-voucher-bol', bol);
    locPwSetRo('loc-pw-edit-voucher-bol-ro', bol);
    var title = document.getElementById('loc-pw-edit-voucher-title');
    if (title) title.textContent = '修改签收凭证 · ' + bol;
    var st = document.getElementById('loc-pw-edit-voucher-sign-time');
    if (st) st.value = '2026-05-01T14:00';
    var fi = document.getElementById('loc-pw-edit-voucher-file');
    if (fi) fi.value = '';
    locPwSetFileDropName('loc-pw-edit-voucher-name', null);
    var rs = document.getElementById('loc-pw-edit-voucher-reason');
    if (rs) rs.value = '';
    showModal('modal-loc-pw-edit-voucher');
  };

  window.locPwConfirmEditVoucher = function () {
    var bol = ((document.getElementById('loc-pw-edit-voucher-bol') || {}).value || '').trim();
    var st = ((document.getElementById('loc-pw-edit-voucher-sign-time') || {}).value || '').trim();
    var rs = ((document.getElementById('loc-pw-edit-voucher-reason') || {}).value || '').trim();
    if (!st) return showToast('请填写签收时间', 'warning');
    if (!rs) return showToast('请填写修改说明', 'warning');
    closeModal('modal-loc-pw-edit-voucher');
    showToast('签收凭证已更新（演示）：' + bol, 'success');
  };

  function locPwGetCheckedBolRows() {
    return Array.prototype.filter.call(
      document.querySelectorAll('tr[data-loc-pw-bol]'),
      function (tr) {
        var cb = tr.querySelector('td input[type="checkbox"]');
        return cb && cb.checked;
      }
    );
  }

  window.locPwShowStatusRollback = function (target, triggerEl) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    target = String(target || '').trim();
    if (!target) return showToast('请选择回退目标状态', 'warning');

    window.__locPwSrTargetStatus = target;
    var bolLabel = '—';
    var rows = locPwGetCheckedBolRows();
    if (rows.length === 1) {
      bolLabel = rows[0].getAttribute('data-loc-pw-bol') || '—';
    } else if (rows.length > 1) {
      bolLabel = '已选 ' + rows.length + ' 条';
    }

    var pillBol = document.getElementById('loc-pw-sr-bol-pill');
    if (pillBol) pillBol.textContent = 'BOL号：' + bolLabel;
    var pillTarget = document.getElementById('loc-pw-sr-target-pill');
    if (pillTarget) pillTarget.textContent = '回退至：' + target;
    var ta = document.getElementById('loc-pw-sr-reason');
    if (ta) ta.value = '';

    showModal('modal-loc-pw-status-rollback');
  };

  window.locPwConfirmStatusRollback = function () {
    var reason = ((document.getElementById('loc-pw-sr-reason') || {}).value || '').trim();
    if (!reason) return showToast('请填写回退原因', 'warning');
    var target = window.__locPwSrTargetStatus || '';
    var rows = locPwGetCheckedBolRows();
    if (!rows.length) return showToast('请先勾选要回退的 BOL', 'warning');
    rows.forEach(function (tr) {
      var bol = tr.getAttribute('data-loc-pw-bol');
      if (!bol) return;
      if (target === '待处理') locPwClearApptRemark(bol);
      locPwSetRowStatus(bol, target);
    });
    closeModal('modal-loc-pw-status-rollback');
    showToast('状态已回退至「' + target + '」（演示）' + (target === '待处理' ? '，预约备注已清空' : ''), 'success');
  };

  function locPwGetTransferTargetLabel() {
    return window.__locPwTransferTarget || '外州私仓';
  }

  function locPwGetSplitGroupId(bol, tr) {
    if (tr && tr.getAttribute('data-loc-pw-split-group')) {
      return tr.getAttribute('data-loc-pw-split-group');
    }
    var m = String(bol || '').match(/^(.+)-\d+$/);
    return m ? m[1] : bol;
  }

  function locPwGetSplitGroupRows(groupId) {
    return Array.prototype.filter.call(
      document.querySelectorAll('tr[data-loc-pw-bol]'),
      function (tr) {
        if (locPwGetShipMode(tr) !== 'split') return false;
        var bol = tr.getAttribute('data-loc-pw-bol');
        return locPwGetSplitGroupId(bol, tr) === groupId;
      }
    );
  }

  function locPwGetMergeChildRows(parentTr) {
    var gid = parentTr.getAttribute('data-merge-group');
    if (!gid) return [];
    return Array.prototype.slice.call(
      document.querySelectorAll('tr.loc-pw-tr-merge-child[data-merge-group="' + gid + '"]')
    );
  }

  function locPwGetBolMetaText(tr) {
    var meta = tr.querySelector('.loc-pw-bol-meta');
    return meta ? meta.textContent.trim() : '—';
  }

  function locPwPromoteMergeChildToRow(ch, idx) {
    ch.classList.remove('loc-pw-tr-merge-child');
    ch.removeAttribute('hidden');
    ch.removeAttribute('data-merge-group');
    var cbTd = ch.cells[0];
    if (cbTd) cbTd.innerHTML = '<input type="checkbox">';
    if (ch.cells[1]) {
      var origin = ch.getAttribute('data-loc-pw-origin-mode') || '';
      if (!origin) {
        if (ch.querySelector('.loc-pw-ship-mode--split')) origin = 'split';
        else origin = 'normal';
      }
      if (origin === 'split') {
        ch.cells[1].innerHTML = '<span class="loc-pw-ship-mode loc-pw-ship-mode--split">拆分发货</span>';
      } else {
        ch.cells[1].innerHTML = '<span class="loc-pw-ship-mode loc-pw-ship-mode--normal">普通发货</span>';
      }
    }
    ch.removeAttribute('data-loc-pw-origin-mode');
    var originBol = (ch.getAttribute('data-loc-pw-origin-bol') || ch.getAttribute('data-loc-pw-bol') || '').trim();
    var sysNo = locPwGetRowCellText(ch, LOC_PW_COL.sysNo);
    var bol = originBol || locPwMakeDemoBol(sysNo && sysNo !== '—' ? sysNo.replace(/\D/g, '').slice(-4) : String(idx + 1));
    ch.setAttribute('data-loc-pw-bol', bol);
    ch.removeAttribute('data-loc-pw-origin-bol');
    var bolPrimary = ch.querySelector('.loc-pw-bol-primary');
    if (bolPrimary) {
      bolPrimary.textContent = bol;
      bolPrimary.classList.remove('loc-pw-tr-merge-child-muted');
    }
    var actionTd = ch.querySelector('.td-action');
    if (actionTd) {
      actionTd.classList.add('loc-pw-action-host');
      actionTd.innerHTML = '';
    }
    locPwFillActions(ch);
    locPwSyncActPltsCell(ch);
  }

  function locPwApplyCancelMerge(parentTr) {
    var bol = parentTr.getAttribute('data-loc-pw-bol') || '';
    var children = locPwGetMergeChildRows(parentTr);
    var tbody = parentTr.parentNode;
    children.forEach(function (ch, idx) {
      locPwPromoteMergeChildToRow(ch, idx);
    });
    if (parentTr.parentNode) parentTr.parentNode.removeChild(parentTr);
    locPwRefreshTabCounts();
    locPwApplyTabFilter();
    locPwInitBolLinks();
    return { bol: bol, count: children.length };
  }

  function locPwApplyCancelSplit(groupId, rows) {
    if (!rows.length) return null;
    var keep = rows[0];
    var bol = groupId;
    var originTotal = locPwGetSplitOriginPalletTotal(keep);
    if (!(originTotal > 0)) {
      originTotal = rows.reduce(function (n, r) { return n + locPwGetRowActPltsCurrent(r); }, 0);
    }
    keep.setAttribute('data-loc-pw-bol', bol);
    keep.removeAttribute('data-loc-pw-split-group');
    keep.removeAttribute('data-loc-pw-origin-pallets');
    if (originTotal > 0) keep.setAttribute('data-loc-pw-pallets', String(originTotal));
    var modeEl = keep.querySelector('.loc-pw-ship-mode');
    if (modeEl) {
      modeEl.className = 'loc-pw-ship-mode loc-pw-ship-mode--normal';
      modeEl.textContent = '普通发货';
    }
    var bolPrimary = keep.querySelector('.loc-pw-bol-primary');
    if (bolPrimary) bolPrimary.textContent = bol;
    var bolMeta = keep.querySelector('.loc-pw-bol-meta');
    if (bolMeta) bolMeta.remove();
    var custSub = keep.querySelector('.loc-pw-cust-ref-sub');
    if (custSub) custSub.remove();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i].parentNode) rows[i].parentNode.removeChild(rows[i]);
    }
    locPwSyncActPltsCell(keep);
    locPwFillActions(keep);
    locPwRefreshTabCounts();
    locPwApplyTabFilter();
    return { bol: bol, count: rows.length };
  }

  function locPwGetRowCustRef(tr) {
    if (!tr) return '—';
    var cell = tr.cells[LOC_PW_COL.refNo];
    if (!cell) return '—';
    var strong = cell.querySelector('.loc-pw-cust-ref-strong');
    if (strong) {
      var main = strong.textContent.trim();
      return main || '—';
    }
    var mergeRefs = cell.querySelector('.loc-pw-merge-parent-refs');
    if (mergeRefs) {
      var items = mergeRefs.querySelectorAll(':scope > span');
      if (items.length) {
        var parts = [];
        items.forEach(function (el) {
          var s = (el.textContent || '').trim();
          if (s) parts.push(s);
        });
        if (parts.length) return parts.join(', ');
      }
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
    return locPwGetRowCellText(tr, LOC_PW_COL.refNo);
  }

  function locPwGetRowFullAddress(tr) {
    if (!tr) return '—';
    function part(idx) {
      var t = locPwGetRowCellText(tr, idx);
      return t === '—' ? '' : t;
    }
    var country = 'US';
    var bol = tr.getAttribute('data-loc-pw-bol');
    if (bol) {
      var ships = locPwGetShipmentsForBol(bol);
      if (ships.length && ships[0].country) {
        var c = String(ships[0].country).trim();
        if (c && c !== '—') country = c;
      }
    }
    var parts = [
      part(LOC_PW_COL.address),
      part(LOC_PW_COL.city),
      part(LOC_PW_COL.state),
      part(LOC_PW_COL.zipCode),
      country
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }

  function locPwIsMergeEligibleRow(tr) {
    if (!tr) return false;
    if (tr.classList.contains('loc-pw-tr-merge-parent') || tr.classList.contains('loc-pw-tr-merge-child')) {
      return false;
    }
    var mode = locPwGetShipMode(tr);
    if (mode !== 'normal' && mode !== 'split') return false;
    if (locPwGetRowStatus(tr) !== '待处理') return false;
    return true;
  }

  function locPwRenderMergeShipTable(rows) {
    var totalPlts = 0;
    var totalCtns = 0;
    var bodyHtml = rows.map(function (tr) {
      var bol = tr.getAttribute('data-loc-pw-bol') || '—';
      var actPltsRaw = locPwGetRowCellText(tr, LOC_PW_COL.actPlts);
      var actCtnsRaw = locPwGetRowCellText(tr, LOC_PW_COL.actCtns);
      var actPltsParts = locPwParseActPltsParts(actPltsRaw);
      var actPlts = actPltsParts.current != null ? actPltsParts.current : NaN;
      var actCtns = parseInt(actCtnsRaw, 10);
      if (!isNaN(actPlts)) totalPlts += actPlts;
      if (!isNaN(actCtns)) totalCtns += actCtns;
      return '<tr>' +
        '<td><strong>' + esc(bol) + '</strong></td>' +
        '<td class="loc-pw-merge-cell-wrap">' + esc(locPwGetRowCustRef(tr)) + '</td>' +
        '<td class="loc-pw-merge-cell-wrap">' + esc(locPwGetRowFullAddress(tr)) + '</td>' +
        '<td>' + esc(actPltsRaw) + '</td>' +
        '<td>' + esc(actCtnsRaw) + '</td>' +
        '<td>' + esc(locPwGetRowCellText(tr, LOC_PW_COL.container)) + '</td>' +
        '<td class="loc-pw-merge-cell-wrap">' + esc(locPwGetRowCellText(tr, LOC_PW_COL.customer)) + '</td>' +
        '</tr>';
    }).join('');
    var footHtml = '<tr>' +
      '<td colspan="3" style="text-align:right;color:var(--text-secondary);">合计</td>' +
      '<td>' + esc(String(totalPlts)) + '</td>' +
      '<td>' + esc(String(totalCtns)) + '</td>' +
      '<td colspan="2"></td>' +
      '</tr>';
    return { bodyHtml: bodyHtml, footHtml: footHtml, totalPlts: totalPlts, totalCtns: totalCtns };
  }

  function locPwFillMergeModal(rows) {
    var rendered = locPwRenderMergeShipTable(rows);
    var tbody = document.getElementById('loc-pw-merge-tbody');
    var tfoot = document.getElementById('loc-pw-merge-tfoot');
    if (tbody) tbody.innerHTML = rendered.bodyHtml;
    if (tfoot) tfoot.innerHTML = rendered.footHtml;
    var remark = document.getElementById('loc-pw-merge-remark');
    if (remark) remark.value = '';
  }

  window.locPwOpenMerge = function () {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var checked = locPwGetCheckedBolRows();
    if (!checked.length) return showToast('请先勾选要合并的 BOL', 'warning');
    var ineligible = checked.filter(function (tr) { return !locPwIsMergeEligibleRow(tr); });
    if (ineligible.length) {
      return showToast('仅「待处理」的普通发货/拆分发货可合并（可混选）；请勿勾选合并父子行或处理中及之后状态', 'warning');
    }
    if (checked.length < 2) {
      return showToast('请勾选至少 2 条货件进行合并', 'warning');
    }
    window.__locPwMergeBols = checked.map(function (tr) { return tr.getAttribute('data-loc-pw-bol'); });
    locPwFillMergeModal(checked);
    showModal('modal-loc-pw-merge');
  };

  window.locPwConfirmMerge = function () {
    var bols = window.__locPwMergeBols || [];
    if (!bols.length) {
      closeModal('modal-loc-pw-merge');
      return showToast('未找到待合并货件', 'warning');
    }
    var newBol = locPwMakeDemoBol(String(Date.now()).slice(-4));
    var remarkEl = document.getElementById('loc-pw-merge-remark');
    var remark = remarkEl ? remarkEl.value.trim() : '';
    closeModal('modal-loc-pw-merge');
    var msg = '合并成功（演示），新 BOL：' + newBol + '（含 ' + bols.length + ' 个 BOL）';
    if (remark) msg += '，已记录备注';
    showToast(msg, 'success');
  };

  window.locPwOpenTransferWarehouse = function () {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var rows = locPwGetCheckedBolRows();
    if (!rows.length) return showToast('请先勾选要转入的 BOL', 'warning');
    var invalidStatus = rows.filter(function (tr) { return locPwGetRowStatus(tr) !== '处理中'; });
    if (invalidStatus.length) {
      return showToast('仅「处理中」且「普通发货」的货件可转私仓，请取消勾选不符合条件的 BOL', 'warning');
    }
    var invalidMode = rows.filter(function (tr) { return locPwGetShipMode(tr) !== 'normal'; });
    if (invalidMode.length) {
      return showToast('仅「普通发货」模式可转私仓，合并/拆分发货请先取消后再操作', 'warning');
    }
    var target = locPwGetTransferTargetLabel();
    window.__locPwTransferBols = rows.map(function (tr) { return tr.getAttribute('data-loc-pw-bol'); });
    var title = document.getElementById('loc-pw-transfer-title');
    if (title) title.textContent = '转' + target;
    var tip = document.getElementById('loc-pw-transfer-tip');
    if (tip) {
      tip.innerHTML = '仅「<strong>普通发货</strong>」且状态为「<strong>处理中</strong>」的货件可转入<strong>' + esc(target) + '</strong>；确认转入后将从当前列表移除（演示）。';
    }
    var sum = document.getElementById('loc-pw-transfer-summary');
    if (sum) {
      var lines = rows.map(function (tr) {
        var bol = tr.getAttribute('data-loc-pw-bol');
        return 'BOL <strong>' + esc(bol) + '</strong> · 柜号 <strong>' + esc(locPwGetRowCellText(tr, LOC_PW_COL.container)) + '</strong>';
      });
      sum.innerHTML = '共 <strong>' + rows.length + '</strong> 条：' + lines.join('；');
    }
    showModal('modal-loc-pw-transfer');
  };

  window.locPwConfirmTransferWarehouse = function () {
    var bols = window.__locPwTransferBols || [];
    var target = locPwGetTransferTargetLabel();
    bols.forEach(function (bol) {
      var tr = locPwFindRow(bol);
      if (tr && tr.parentNode) tr.parentNode.removeChild(tr);
    });
    closeModal('modal-loc-pw-transfer');
    locPwRefreshTabCounts();
    locPwApplyTabFilter();
    showToast('已转入' + target + '（演示）：' + bols.join('、'), 'success');
  };

  function locPwFillCancelMergeModal(tr) {
    var bol = tr.getAttribute('data-loc-pw-bol') || '';
    var children = locPwGetMergeChildRows(tr);
    if (!children.length) return false;
    locPwSetHidden('loc-pw-cancel-merge-bol', bol);
    var sum = document.getElementById('loc-pw-cancel-merge-summary');
    if (sum) {
      sum.innerHTML = 'BOL <strong>' + esc(bol) + '</strong> · 发货模式 <strong>合并发货</strong> · 含 <strong>' + children.length + '</strong> 个 BOL';
    }
    var tbody = document.getElementById('loc-pw-cancel-merge-tbody');
    if (tbody) {
      tbody.innerHTML = children.map(function (ch) {
        return '<tr><td>' + esc(locPwGetRowCellText(ch, LOC_PW_COL.refNo)) + '</td><td>' + esc(locPwGetRowCellText(ch, LOC_PW_COL.container)) + '</td><td>' + esc(locPwGetRowCellText(ch, LOC_PW_COL.sysNo)) + '</td><td>' + esc(locPwGetRowStatus(ch)) + '</td></tr>';
      }).join('');
    }
    return true;
  }

  function locPwFillCancelSplitModal(tr) {
    var bol = tr.getAttribute('data-loc-pw-bol') || '';
    var groupId = locPwGetSplitGroupId(bol, tr);
    var siblings = locPwGetSplitGroupRows(groupId);
    if (siblings.length < 2) return false;
    locPwSetHidden('loc-pw-cancel-split-group', groupId);
    var sum = document.getElementById('loc-pw-cancel-split-summary');
    if (sum) {
      sum.innerHTML = '原货件 <strong>' + esc(groupId) + '</strong> · 当前拆分为 <strong>' + siblings.length + '</strong> 个子单，取消后将合并恢复为 1 条完整 BOL。';
    }
    var tbody = document.getElementById('loc-pw-cancel-split-tbody');
    if (tbody) {
      tbody.innerHTML = siblings.map(function (r) {
        var b = r.getAttribute('data-loc-pw-bol') || '—';
        return '<tr><td><strong>' + esc(b) + '</strong></td><td>' + esc(locPwGetBolMetaText(r)) + '</td><td>' + esc(locPwGetRowCellText(r, LOC_PW_COL.refNo)) + '</td><td>' + esc(locPwGetRowStatus(r)) + '</td></tr>';
      }).join('');
    }
    return true;
  }

  window.locPwOpenCancelMerge = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr;
    if (bol) {
      tr = locPwFindRow(bol);
      if (!tr) return showToast('未找到该 BOL', 'warning');
      if (locPwGetRowStatus(tr) !== '待处理') {
        return showToast('仅「待处理」的合并发货可取消合并', 'warning');
      }
      if (!tr.classList.contains('loc-pw-tr-merge-parent') || locPwGetShipMode(tr) !== 'merge') {
        return showToast('仅「合并发货」的父行可取消合并', 'warning');
      }
    } else {
      var rows = locPwGetCheckedBolRows();
      if (rows.length !== 1) {
        return showToast('请勾选且仅勾选 1 条「合并发货」记录', 'warning');
      }
      tr = rows[0];
      if (locPwGetRowStatus(tr) !== '待处理') {
        return showToast('仅「待处理」的合并发货可取消合并', 'warning');
      }
      if (!tr.classList.contains('loc-pw-tr-merge-parent') || locPwGetShipMode(tr) !== 'merge') {
        return showToast('仅「合并发货」的父行可取消合并', 'warning');
      }
    }
    if (!locPwFillCancelMergeModal(tr)) return showToast('未找到合并子货件明细', 'warning');
    showModal('modal-loc-pw-cancel-merge');
  };

  window.locPwConfirmCancelMerge = function () {
    var bol = ((document.getElementById('loc-pw-cancel-merge-bol') || {}).value || '').trim();
    var tr = locPwFindRow(bol);
    if (!tr || !tr.classList.contains('loc-pw-tr-merge-parent')) {
      closeModal('modal-loc-pw-cancel-merge');
      return showToast('未找到合并记录', 'warning');
    }
    var result = locPwApplyCancelMerge(tr);
    closeModal('modal-loc-pw-cancel-merge');
    showToast('已取消合并（演示）：' + result.bol + ' → 恢复为 ' + result.count + ' 个独立货件', 'success');
  };

  window.locPwOpenCancelSplit = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr;
    if (bol) {
      tr = locPwFindRow(bol);
      if (!tr) return showToast('未找到该 BOL', 'warning');
      if (locPwGetRowStatus(tr) !== '待处理') {
        return showToast('仅「待处理」的拆分发货可取消拆分', 'warning');
      }
      if (locPwGetShipMode(tr) !== 'split') {
        return showToast('仅「拆分发货」的 BOL 可取消拆分', 'warning');
      }
    } else {
      var rows = locPwGetCheckedBolRows();
      if (rows.length !== 1) {
        return showToast('请勾选且仅勾选 1 条「拆分发货」记录', 'warning');
      }
      tr = rows[0];
      if (locPwGetRowStatus(tr) !== '待处理') {
        return showToast('仅「待处理」的拆分发货可取消拆分', 'warning');
      }
      if (locPwGetShipMode(tr) !== 'split') {
        return showToast('仅「拆分发货」的 BOL 可取消拆分', 'warning');
      }
    }
    if (!locPwFillCancelSplitModal(tr)) return showToast('未找到关联拆分子单', 'warning');
    showModal('modal-loc-pw-cancel-split');
  };

  window.locPwConfirmCancelSplit = function () {
    var groupId = ((document.getElementById('loc-pw-cancel-split-group') || {}).value || '').trim();
    if (!groupId) {
      closeModal('modal-loc-pw-cancel-split');
      return showToast('未找到拆分组', 'warning');
    }
    var siblings = locPwGetSplitGroupRows(groupId);
    if (siblings.length < 2) {
      closeModal('modal-loc-pw-cancel-split');
      return showToast('未找到关联拆分子单', 'warning');
    }
    var result = locPwApplyCancelSplit(groupId, siblings);
    closeModal('modal-loc-pw-cancel-split');
    showToast('已取消拆分（演示）：' + result.count + ' 个子单 → 恢复为 ' + result.bol, 'success');
  };

  function locPwGetShipmentsForBol(bol) {
    if (LOC_PW_BOL_SHIPMENTS[bol]) {
      return LOC_PW_BOL_SHIPMENTS[bol].map(function (s) { return Object.assign({}, s); });
    }
    var tr = locPwFindRow(bol);
    if (!tr) return [];
    return [{
      shipmentId: locPwGetRowCellText(tr, LOC_PW_COL.shipmentId),
      sysNo: locPwGetRowCellText(tr, LOC_PW_COL.sysNo),
      customer: locPwGetRowCellText(tr, LOC_PW_COL.customer),
      refNo: locPwGetRowCellText(tr, LOC_PW_COL.refNo),
      container: locPwGetRowCellText(tr, LOC_PW_COL.container),
      arrivalDate: locPwGetRowCellText(tr, LOC_PW_COL.arrivalDate),
      devanningTime: '—',
      address: locPwGetRowCellText(tr, LOC_PW_COL.address),
      city: locPwGetRowCellText(tr, LOC_PW_COL.city),
      state: locPwGetRowCellText(tr, LOC_PW_COL.state),
      zipCode: locPwGetRowCellText(tr, LOC_PW_COL.zipCode),
      country: 'US',
      estPlts: parseInt(locPwGetRowCellText(tr, LOC_PW_COL.estPlts), 10) || 0,
      actPlts: (function () {
        var parts = locPwParseActPltsParts(locPwGetRowCellText(tr, LOC_PW_COL.actPlts));
        return parts.current != null ? parts.current : 0;
      })(),
      estCtns: parseInt(locPwGetRowCellText(tr, 10), 10) || 0,
      actCtns: parseInt(locPwGetRowCellText(tr, 10), 10) || 0,
      apptRequirement: locPwGetRowCellText(tr, LOC_PW_COL.apptReq),
      apptFiles: [],
      abnormalFeedback: '',
      devanningPhotos: [],
      companyName: locPwGetRowCellText(tr, LOC_PW_COL.companyName),
      contact: locPwGetRowCellText(tr, LOC_PW_COL.contact),
      phone: locPwGetRowCellText(tr, LOC_PW_COL.mobile),
      email: locPwGetRowCellText(tr, LOC_PW_COL.email),
      destWarehouse: 'ONT8'
    }];
  }

  function locPwGetBolHold(bol) {
    return LOC_PW_BOL_HOLD[bol] || null;
  }

  function locPwClearBolAppointmentData(bol) {
    var ships = LOC_PW_BOL_SHIPMENTS[bol];
    if (ships) {
      ships.forEach(function (s) {
        s.apptFiles = [];
      });
    }
    locPwClearBolBookedMilestone(bol);
  }

  function locPwRenderBolDetail(bol, opts) {
    opts = opts || {};
    var tr = locPwFindRow(bol);
    var status = tr ? locPwGetRowStatus(tr) : '—';
    var shipMode = tr ? locPwGetShipMode(tr) : 'normal';
    var shipments = locPwGetShipmentsForBol(bol);
    var hold = locPwGetBolHold(bol);
    var isMergePallet = !!(tr && locPwIsMergePallet(tr));
    var modeLabel = shipMode === 'merge' ? '合并发货' : (shipMode === 'split' ? '拆分发货' : '普通发货');
    if (isMergePallet) modeLabel += ' · 合板';
    var totalPlts = shipments.reduce(function (n, s) { return n + (parseInt(locPwGetShipmentQty(s).actPlts, 10) || 0); }, 0);
    if (isMergePallet) {
      var mergeLabels = locPwCollectMergePalletLabels(bol, shipments);
      if (mergeLabels.length) totalPlts = mergeLabels.length;
    }
    if (tr && locPwIsSplitShipRow(tr)) {
      totalPlts = locPwGetRowActPltsCurrent(tr);
    }
    var splitRatio = locPwResolveSplitRatioForBol(bol, tr, totalPlts);
    var totalCtns = shipments.reduce(function (n, s) { return n + (parseInt(locPwGetShipmentQty(s).actCtns, 10) || 0); }, 0);
    var canEmail = status === '待处理' || status === '处理中';

    var title = document.getElementById('loc-pw-bol-detail-title');
    if (title) title.textContent = 'BOL 详情';
    var meta = document.getElementById('loc-pw-bol-detail-meta');
    if (meta) {
      var emailBar = isMergePallet ? locPwBuildMergePalletBolEmailBarHtml(bol, shipments, canEmail) : '';
      meta.innerHTML = '<div class="loc-pw-bol-summary">' +
        '<div class="loc-pw-bol-summary-info">' +
        '<div class="loc-pw-bol-summary-top">' +
        '<span class="loc-pw-bol-summary-id">' + esc(bol) + '</span>' +
        locPwStatusBadgeHtml(status) +
        '</div>' +
        '<div class="loc-pw-bol-summary-sub">' +
        esc(modeLabel) + ' · ' + (shipMode === 'merge' && tr ? locPwGetMergeChildRows(tr).length + ' 个 BOL · ' : '') + shipments.length + ' 个货件 · ' + totalPlts + ' 板 · ' + totalCtns + ' 件' +
        '</div>' +
        emailBar +
        '</div>' +
        '<div class="loc-pw-bol-summary-flow">' + locPwBuildBolFlowProgressHtml(status) + '</div></div>';
    }
    var issueBar = document.getElementById('loc-pw-bol-detail-issue-bar');
    if (issueBar) {
      if (hold) {
        issueBar.style.display = '';
        var holdExtra = '';
        if (hold.fromStatus === '待取货') {
          holdExtra = ' · 原状态「待取货」，出库安排信息已清空';
        }
        holdExtra += ' · 解除后将恢复为待处理';
        issueBar.innerHTML = '⚠️ 暂缓处理 · ' + esc(hold.holdReason || '—') +
          (hold.holdRemark ? ' · ' + esc(hold.holdRemark) : '') +
          holdExtra +
          (hold.heldAt ? ' · ' + esc(hold.heldAt) : '');
      } else {
        issueBar.style.display = 'none';
        issueBar.innerHTML = '';
      }
    }
    var milestonesEl = document.getElementById('loc-pw-bol-detail-milestones');
    if (milestonesEl) {
      milestonesEl.innerHTML = locPwBuildBolMilestonesHtml(bol, status);
    }
    var list = document.getElementById('loc-pw-bol-detail-shipments');
    if (list) {
      if (isMergePallet) {
        list.innerHTML = shipments.map(function (s, idx) {
          return locPwBuildMergePalletShipCardHtml(bol, s, idx);
        }).join('') +
          locPwBuildMergePalletBolPalletSectionHtml(bol, shipments, { splitRatio: splitRatio }) +
          locPwBuildBolEmailRecordsSectionHtml(bol, shipments);
      } else if (shipMode === 'merge') {
        list.innerHTML = locPwBuildMergeShipBolDetailHtml(bol, shipments, canEmail);
      } else {
        list.innerHTML = shipments.map(function (s, idx) {
          var logs = locPwGetShipmentEmailLogs(bol, s.shipmentId);
          var inqSt = locPwEmailStatusLabel(logs, 'inquiry');
          var apptSt = locPwEmailStatusLabel(logs, 'appointment');
          var safeBolJs = String(bol).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          var safeShipJs = String(s.shipmentId).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          var emailLbl = '<div class="loc-pw-shipment-email-lbl">' +
            '<span class="loc-pw-eml-st ' + inqSt.cls + '">询价' + inqSt.text + '</span>' +
            '<span class="loc-pw-shipment-email-dot">·</span>' +
            '<span class="loc-pw-eml-st ' + apptSt.cls + '">预约' + apptSt.text + '</span>' +
            '</div>';
          var actions = canEmail
            ? '<div class="loc-pw-shipment-actions">' +
              '<button type="button" class="btn btn-default btn-xs" onclick="locPwOpenInquiryEmail(\'' + safeBolJs + '\',\'' + safeShipJs + '\')">📧 询价邮件</button>' +
              '<button type="button" class="btn btn-default btn-xs" onclick="locPwOpenApptEmail(\'' + safeBolJs + '\',\'' + safeShipJs + '\')">📅 预约邮件</button>' +
              '</div>'
            : '';
          var custRef = locPwGetShipmentRef(s);
          var expanded = idx === 0 || shipments.length === 1;
          var titleHtml =
            '<span class="loc-pw-shipment-card-title-main">货件 ' + (idx + 1) + '</span>' +
            '<span class="loc-pw-shipment-card-ids" title="客户单号">' +
            '<span class="loc-pw-shipment-ref">' + esc(custRef) + '</span>' +
            '</span>' +
            locPwShipHeaderMetaHtml(s, bol);
          var shipSplitRatio = (idx === 0 && splitRatio) ? splitRatio : null;
          return '<div class="loc-pw-shipment-card' + (expanded ? '' : ' loc-pw-shipment-card--collapsed') +
            '" id="loc-pw-ship-card-' + idx + '">' +
            '<div class="loc-pw-shipment-card-hd">' +
            '<div class="loc-pw-shipment-card-hd-main">' +
            '<button type="button" class="loc-pw-shipment-card-toggle" aria-expanded="' + (expanded ? 'true' : 'false') + '" ' +
            'title="' + (expanded ? '收起货件' : '展开货件') + '" onclick="locPwToggleShipCard(this)">' +
            '<span class="loc-pw-shipment-card-toggle-arrow" aria-hidden="true">' + (expanded ? '▼' : '▶') + '</span>' +
            '<span class="loc-pw-shipment-card-title">' + titleHtml + '</span>' +
            '</button>' +
            emailLbl +
            '</div>' +
            actions +
            '</div>' +
            '<div class="loc-pw-shipment-card-body"' + (expanded ? '' : ' hidden') + '>' +
            locPwBuildRefBarHtml(s) +
            locPwBuildApptSectionHtml(s) +
            locPwBuildDevanningExceptionHtml(s) +
            locPwBuildQtySectionHtml(bol, s, { splitRatio: shipSplitRatio }) +
            locPwBuildEmailRecordsCollapsibleHtml(bol, logs) +
            '</div></div>';
        }).join('');
      }
    }
    var isMergeChild = locPwIsMergeChild(tr);
    var footerBooked = document.getElementById('loc-pw-bol-detail-btn-booked');
    var footerHold = document.getElementById('loc-pw-bol-detail-btn-hold');
    var footerRelease = document.getElementById('loc-pw-bol-detail-btn-release');
    var footerOutbound = document.getElementById('loc-pw-bol-detail-btn-outbound-doc');
    if (footerBooked) {
      footerBooked.style.display = (!isMergeChild && (status === '待处理' || status === '处理中')) ? '' : 'none';
      footerBooked.textContent = status === '待处理' ? '处理中' : '安排出库';
    }
    if (footerHold) {
      footerHold.style.display = (!isMergeChild && (status === '待处理' || status === '处理中' || status === '待取货')) ? '' : 'none';
    }
    if (footerRelease) footerRelease.style.display = (!isMergeChild && status === LOC_PW_STATUS_HOLD) ? '' : 'none';
    if (footerOutbound) footerOutbound.style.display = (!isMergeChild && status === '运输中') ? '' : 'none';
    locPwSetHidden('loc-pw-bol-detail-bol', bol);
    showModal('modal-loc-pw-bol-detail');
  }

  window.locPwOpenBolDetail = function (bol, opts) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    bol = String(bol || '').trim();
    if (!bol) return;
    locPwRenderBolDetail(bol, opts || {});
  };

  window.locPwOpenInquiryEmail = function (bol, shipmentId) {
    var ships = locPwGetShipmentsForBol(bol);
    if (!shipmentId && ships[0]) shipmentId = ships[0].shipmentId;
    locPwSetHidden('loc-pw-inquiry-bol', bol);
    locPwSetHidden('loc-pw-inquiry-shipment', shipmentId);
    locPwPopulateEmailShipSelect('inquiry', bol, shipmentId);
    var ship = ships.find(function (s) { return s.shipmentId === shipmentId; });
    var shipRef = ship ? locPwGetShipmentRef(ship) : shipmentId;
    var sum = document.getElementById('loc-pw-inquiry-summary');
    if (sum && ship) {
      sum.innerHTML = locPwBuildEmailShipSummaryHtml(ship);
    }
    locPwInitInquiryMsSelects();
    locPwApplyInquiryEmailFieldsFromTemplate();
    locPwSetInquiryVendorsSelected([]);
    locPwSetInquiryDeliveryInstrSelected([]);
    locPwSyncInquiryEmailForm();
    var title = document.getElementById('loc-pw-inquiry-title');
    if (title) title.textContent = '发送询价邮件 · ' + shipRef;
    locPwShowStackedModal('modal-loc-pw-inquiry-email');
  };

  window.locPwConfirmInquiryEmail = function () {
    var bol = ((document.getElementById('loc-pw-inquiry-bol') || {}).value || '').trim();
    var shipmentId = ((document.getElementById('loc-pw-inquiry-shipment') || {}).value || '').trim();
    var subject = ((document.getElementById('loc-pw-inquiry-subject') || {}).value || '').trim();
    var body = ((document.getElementById('loc-pw-inquiry-body') || {}).value || '').trim();
    var checked = locPwGetInquiryVendorsSelected();
    if (!checked.length) return showToast('请至少选择一个供应商', 'warning');
    if (!subject) return showToast('请填写邮件标题', 'warning');
    if (!body) return showToast('请填写邮件正文', 'warning');
    if (!LOC_PW_COMM_LOGS[bol]) LOC_PW_COMM_LOGS[bol] = [];
    var vendorResults = locPwSimulateInquiryVendorResults(checked, body);
    var status = locPwAggregateVendorStatus(vendorResults);
    var okCount = vendorResults.filter(function (v) { return v.status === 'success'; }).length;
    var failedRows = vendorResults.filter(function (v) { return v.status === 'failed'; });
    var failedVendorNames = [];
    failedRows.forEach(function (v) {
      if (v.vendor && failedVendorNames.indexOf(v.vendor) === -1) failedVendorNames.push(v.vendor);
    });
    LOC_PW_COMM_LOGS[bol].push({
      id: locPwNextEmailId(),
      type: 'inquiry',
      shipmentId: shipmentId,
      subject: subject,
      bodySnapshot: body,
      recipients: checked.join('、'),
      vendorResults: vendorResults,
      sentAt: locPwFormatNow(),
      sentBy: '演示用户',
      status: status,
      failReason: status === 'failed' && failedRows[0] ? failedRows[0].failReason : ''
    });
    locPwSaveCommLogs();
    closeModal('modal-loc-pw-inquiry-email');
    var toastMsg;
    var toastType = 'success';
    if (status === 'success') {
      toastMsg = '询价邮件已全部发送（演示）：' + checked.join('、') + ' · ' + vendorResults.length + ' 个邮箱';
    } else if (status === 'partial') {
      toastMsg = '已发送 ' + okCount + '/' + vendorResults.length + ' 个邮箱，失败供应商：' +
        failedVendorNames.join('、');
      toastType = 'warning';
    } else {
      toastMsg = '询价邮件发送失败（演示）：' + (failedRows[0] ? failedRows[0].failReason : '全部失败');
      toastType = 'warning';
    }
    showToast(toastMsg, toastType);
    locPwRenderBolDetail(bol);
  };

  window.locPwOpenApptEmail = function (bol, shipmentId) {
    var ships = locPwGetShipmentsForBol(bol);
    if (!shipmentId && ships[0]) shipmentId = ships[0].shipmentId;
    locPwSetHidden('loc-pw-appt-bol', bol);
    locPwSetHidden('loc-pw-appt-shipment', shipmentId);
    locPwPopulateEmailShipSelect('appt', bol, shipmentId);
    var ship = ships.find(function (s) { return s.shipmentId === shipmentId; });
    var shipRef = ship ? locPwGetShipmentRef(ship) : shipmentId;
    locPwInitApptRecipientsInput();
    var defaultRecipients = ship && ship.email && locPwIsValidEmail(ship.email) ? [ship.email] : [];
    locPwApptRecipientsSet(defaultRecipients);
    var recipInput = document.getElementById('loc-pw-appt-recipients-input');
    if (recipInput) recipInput.value = '';
    locPwFillEmailForm('appt', 'appointment', bol, ship, {});
    var sum = document.getElementById('loc-pw-appt-summary');
    if (sum && ship) {
      sum.innerHTML = locPwBuildEmailShipSummaryHtml(ship);
    }
    var title = document.getElementById('loc-pw-appt-title');
    if (title) title.textContent = '发送预约邮件 · ' + shipRef;
    locPwShowStackedModal('modal-loc-pw-appt-email');
  };

  window.locPwConfirmApptEmail = function () {
    var bol = ((document.getElementById('loc-pw-appt-bol') || {}).value || '').trim();
    var shipmentId = ((document.getElementById('loc-pw-appt-shipment') || {}).value || '').trim();
    var recipInput = document.getElementById('loc-pw-appt-recipients-input');
    if (recipInput && recipInput.value.trim()) locPwApptRecipientsAdd(recipInput.value.trim());
    var recipients = locPwApptRecipientsGet();
    var subject = ((document.getElementById('loc-pw-appt-subject') || {}).value || '').trim();
    var body = ((document.getElementById('loc-pw-appt-body') || {}).value || '').trim();
    if (!recipients.length) return showToast('请填写至少一个收件人邮箱', 'warning');
    if (!subject) return showToast('请填写邮件标题', 'warning');
    if (!body) return showToast('请填写邮件正文', 'warning');
    if (!LOC_PW_COMM_LOGS[bol]) LOC_PW_COMM_LOGS[bol] = [];
    var recipientResults = locPwSimulateApptRecipientResults(recipients, body);
    var status = locPwAggregateRecipientStatus(recipientResults);
    var okCount = recipientResults.filter(function (r) { return r.status === 'success'; }).length;
    var failedRecipients = recipientResults.filter(function (r) { return r.status === 'failed'; });
    LOC_PW_COMM_LOGS[bol].push({
      id: locPwNextEmailId(),
      type: 'appointment',
      shipmentId: shipmentId,
      subject: subject,
      bodySnapshot: body,
      recipients: recipients.join('、'),
      recipientResults: recipientResults,
      sentAt: locPwFormatNow(),
      sentBy: '演示用户',
      status: status,
      failReason: status === 'failed' && failedRecipients[0] ? failedRecipients[0].failReason : ''
    });
    locPwSaveCommLogs();
    closeModal('modal-loc-pw-appt-email');
    var apptToastMsg;
    var apptToastType = 'success';
    if (status === 'success') {
      apptToastMsg = '预约邮件已全部发送（演示）：' + recipients.length + ' 个收件人';
    } else if (status === 'partial') {
      apptToastMsg = '已发送 ' + okCount + '/' + recipients.length + '，失败：' +
        failedRecipients.map(function (r) { return r.email; }).join('、');
      apptToastType = 'warning';
    } else {
      apptToastMsg = '预约邮件发送失败（演示）：' + (failedRecipients[0] ? failedRecipients[0].failReason : '全部失败');
      apptToastType = 'warning';
    }
    showToast(apptToastMsg, apptToastType);
    locPwRenderBolDetail(bol);
  };

  function locPwHoldRestoreStatus() {
    return '待处理';
  }

  window.locPwOpenHold = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr = locPwFindRow(bol);
    if (!tr) return showToast('未找到该 BOL', 'warning');
    if (locPwRejectMergeChildAction(tr, '暂缓处理')) return;
    var status = locPwGetRowStatus(tr);
    if (status !== '待处理' && status !== '处理中' && status !== '待取货') {
      return showToast('仅「待处理」「处理中」或「待取货」可标记暂缓处理', 'warning');
    }
    window.__locPwHoldBol = bol;
    var restoreLabel = locPwHoldRestoreStatus({ fromStatus: status });
    var sum = document.getElementById('loc-pw-hold-summary');
    if (sum) {
      sum.innerHTML = 'BOL <strong>' + esc(bol) + '</strong> · 标记暂缓处理后 BOL 将暂停流转，解除暂缓后将恢复为「' + esc(restoreLabel) + '」';
    }
    var warn = document.getElementById('loc-pw-hold-appt-warn');
    if (warn) warn.style.display = status === '待取货' ? '' : 'none';
    var title = document.getElementById('loc-pw-hold-title');
    if (title) title.textContent = '暂缓处理 · ' + bol;
    locPwShowStackedModal('modal-loc-pw-hold');
  };

  window.locPwConfirmHold = function () {
    var bol = window.__locPwHoldBol || '';
    if (!bol) return showToast('未找到 BOL', 'warning');
    var tr = locPwFindRow(bol);
    if (!tr) return showToast('未找到该 BOL', 'warning');
    if (locPwRejectMergeChildAction(tr, '暂缓处理')) return;
    var fromStatus = locPwGetRowStatus(tr);
    if (fromStatus !== '待处理' && fromStatus !== '处理中' && fromStatus !== '待取货') {
      return showToast('当前状态不可标记暂缓处理', 'warning');
    }
    var modal = document.getElementById('modal-loc-pw-hold');
    if (!modal) return;
    var reasonSel = document.getElementById('loc-pw-hold-reason');
    var remarkTa = document.getElementById('loc-pw-hold-remark');
    var reason = (reasonSel && reasonSel.value ? String(reasonSel.value) : '').trim();
    var remark = (remarkTa && remarkTa.value ? String(remarkTa.value) : '').trim();
    if (!reason) return showToast('请选择原因', 'warning');
    if (!remark) return showToast('请填写说明', 'warning');
    LOC_PW_BOL_HOLD[bol] = {
      holdReason: reason,
      holdRemark: remark,
      heldAt: locPwFormatNow(),
      fromStatus: fromStatus
    };
    if (fromStatus === '待取货') {
      locPwClearBolAppointmentData(bol);
    }
    closeModal('modal-loc-pw-hold');
    if (reasonSel) reasonSel.value = '';
    if (remarkTa) remarkTa.value = '';
    locPwSetRowStatus(bol, LOC_PW_STATUS_HOLD);
    var toastMsg = '已标记暂缓处理（演示）';
    if (fromStatus === '待取货') toastMsg += '，出库安排信息已清空';
    showToast(toastMsg, 'warning');
    if (document.getElementById('modal-loc-pw-bol-detail') && document.getElementById('modal-loc-pw-bol-detail').classList.contains('open')) {
      locPwRenderBolDetail(bol);
    }
  };

  window.locPwReleaseHold = function (bol) {
    if (typeof _closeAllDropdowns === 'function') _closeAllDropdowns();
    var tr = locPwFindRow(bol);
    if (locPwRejectMergeChildAction(tr, '解除暂缓')) return;
    if (!tr || locPwGetRowStatus(tr) !== LOC_PW_STATUS_HOLD) {
      return showToast('仅「暂缓处理」可解除暂缓', 'warning');
    }
    var hold = locPwGetBolHold(bol);
    var restoreStatus = locPwHoldRestoreStatus(hold);
    var doRelease = function () {
      delete LOC_PW_BOL_HOLD[bol];
      locPwSetRowStatus(bol, restoreStatus);
      showToast('已解除暂缓，状态已恢复为' + restoreStatus + '（演示）', 'success');
      if (document.getElementById('modal-loc-pw-bol-detail') && document.getElementById('modal-loc-pw-bol-detail').classList.contains('open')) {
        locPwRenderBolDetail(bol);
      }
    };
    if (typeof openSharedConfirm === 'function') {
      openSharedConfirm('解除暂缓确认', '确定解除暂缓 BOL ' + bol + '？解除后 BOL 将恢复为「待处理」。').then(function (ok) {
        if (ok) doRelease();
      });
      return;
    }
    doRelease();
  };

  window.locPwOpenMarkIssue = window.locPwOpenHold;
  window.locPwConfirmMarkIssue = window.locPwConfirmHold;
  window.locPwRestoreFromIssue = window.locPwReleaseHold;

  function locPwInitBolLinks() {
    document.querySelectorAll('tr[data-loc-pw-bol] .loc-pw-bol-primary').forEach(function (el) {
      var tr = el.closest('tr[data-loc-pw-bol]');
      if (!tr) return;
      var bol = tr.getAttribute('data-loc-pw-bol');
      if (!bol) return;
      el.classList.add('loc-pw-bol-link');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.title = '查看 BOL 详情';
      el.onclick = function (e) {
        e.stopPropagation();
        locPwOpenBolDetail(bol);
      };
    });
  }

  function locPwInitStickyLeftCols() {
    var cls = [
      'loc-pw-sticky-l loc-pw-sticky-l--check',
      'loc-pw-sticky-l loc-pw-sticky-l--mode',
      'loc-pw-sticky-l loc-pw-sticky-l--bol',
      'loc-pw-sticky-l loc-pw-sticky-l--ref'
    ];
    document.querySelectorAll('tr[data-loc-pw-bol]').forEach(function (tr) {
      for (var i = 0; i < 4; i++) {
        var td = tr.cells[i];
        if (!td) continue;
        cls[i].split(/\s+/).forEach(function (c) {
          if (c) td.classList.add(c);
        });
      }
    });
  }

  function locPwCollectBolApptFileGroups(bol) {
    var ships = locPwGetShipmentsForBol(bol) || [];
    var groups = [];
    ships.forEach(function (s) {
      var files = (s.apptFiles || []).filter(Boolean);
      if (!files.length) return;
      groups.push({
        shipmentId: s.shipmentId || '',
        refNo: locPwGetShipmentRef(s),
        files: files.map(function (f) {
          return { name: (f && f.name) ? f.name : String(f) };
        })
      });
    });
    return groups;
  }

  function locPwGetPodFiles(bol) {
    var ms = locPwGetBolMilestones(bol);
    return (ms.signed && ms.signed.podFiles) ? ms.signed.podFiles : [];
  }

  function locPwGetListAttachFiles(bol, kind) {
    return kind === 'pod' ? locPwGetPodFiles(bol) : locPwGetDepartVoucherFiles(bol);
  }

  function locPwGetListAttachLabel(kind) {
    return kind === 'pod' ? 'POD' : '发车凭证';
  }

  function locPwBuildListAttachCountHtml(bol, kind, count) {
    if (!count) return '—';
    return '<a class="td-link loc-pw-list-attach-entry" href="#" title="查看' + esc(locPwGetListAttachLabel(kind)) + '" onclick="locPwOpenListAttachFiles(\'' + locPwJsQuote(bol) + '\',\'' + kind + '\');return false;">' +
      esc(locPwGetListAttachLabel(kind)) + '(' + count + ')</a>';
  }

  function locPwSyncRowAttachFileCells(tr) {
    var bol = tr.getAttribute('data-loc-pw-bol');
    if (!bol || !tr.cells) return;
    var dvCell = tr.cells[LOC_PW_COL.departVoucher];
    if (dvCell) {
      dvCell.classList.add('loc-pw-list-attach-cell');
      dvCell.innerHTML = locPwBuildListAttachCountHtml(bol, 'departVoucher', locPwGetDepartVoucherFiles(bol).length);
    }
    var podCell = tr.cells[LOC_PW_COL.pod];
    if (podCell) {
      podCell.classList.add('loc-pw-list-attach-cell');
      podCell.innerHTML = locPwBuildListAttachCountHtml(bol, 'pod', locPwGetPodFiles(bol).length);
    }
  }

  function locPwHydrateListAttachFileCells() {
    document.querySelectorAll('tr[data-loc-pw-bol]').forEach(locPwSyncRowAttachFileCells);
  }

  var LOC_PW_LIST_ATTACH_CTX = { bol: '', kind: '', files: [] };

  function locPwEnsureListAttachFilesModal() {
    if (document.getElementById('modal-loc-pw-list-attach-files')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div id="modal-loc-pw-list-attach-files" class="modal-overlay" onclick="closeModalOutside(event,\'modal-loc-pw-list-attach-files\')">' +
      '<div class="modal" style="width:560px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;">' +
      '<div class="modal-header"><span class="modal-title" id="loc-pw-list-attach-title">附件</span>' +
      '<button class="modal-close" type="button" onclick="closeModal(\'modal-loc-pw-list-attach-files\')">✕</button></div>' +
      '<div class="modal-body" style="overflow-y:auto;">' +
      '<div class="loc-pw-list-appt-modal-toolbar" id="loc-pw-list-attach-summary"></div>' +
      '<div class="loc-pw-list-appt-modal-list" id="loc-pw-list-attach-body"></div></div>' +
      '<div class="modal-footer">' +
      '<button class="btn btn-primary" type="button" id="loc-pw-list-attach-batch-dl" onclick="locPwBatchDownloadListAttachFiles()">批量下载</button>' +
      '<button class="btn btn-default" type="button" onclick="closeModal(\'modal-loc-pw-list-attach-files\')">关闭</button>' +
      '</div></div></div>';
    document.body.appendChild(wrap.firstChild);
  }

  window.locPwBatchDownloadListAttachFiles = function () {
    var files = LOC_PW_LIST_ATTACH_CTX.files || [];
    if (!files.length) return showToast('暂无文件', 'warning');
    files.forEach(function (f, i) {
      var name = (f && f.name) ? f.name : String(f);
      setTimeout(function () {
        showToast('下载 ' + name + (files.length > 1 ? '（' + (i + 1) + '/' + files.length + '）' : ''), i === files.length - 1 ? 'success' : 'info');
      }, i * 180);
    });
  };

  window.locPwOpenListAttachFiles = function (bol, kind) {
    bol = String(bol || '').trim();
    kind = kind === 'pod' ? 'pod' : 'departVoucher';
    var files = locPwGetListAttachFiles(bol, kind);
    var label = locPwGetListAttachLabel(kind);
    locPwEnsureListAttachFilesModal();
    LOC_PW_LIST_ATTACH_CTX = { bol: bol, kind: kind, files: files };
    var title = document.getElementById('loc-pw-list-attach-title');
    var sum = document.getElementById('loc-pw-list-attach-summary');
    var body = document.getElementById('loc-pw-list-attach-body');
    var batchBtn = document.getElementById('loc-pw-list-attach-batch-dl');
    if (title) title.textContent = label + '（' + files.length + '）· ' + bol;
    if (sum) {
      sum.innerHTML = files.length
        ? '<span class="loc-pw-list-appt-modal-meta">共 <strong>' + files.length + '</strong> 个文件</span>'
        : '';
      sum.style.display = files.length ? '' : 'none';
    }
    if (batchBtn) batchBtn.style.display = files.length ? '' : 'none';
    if (body) {
      if (!files.length) {
        body.innerHTML = '<div class="loc-pw-list-appt-modal-empty">暂无' + esc(label) + '</div>';
      } else {
        body.innerHTML = '<div class="loc-pw-list-appt-modal-group">' + files.map(function (f) {
          var name = (f && f.name) ? f.name : String(f);
          var previewBtn = locPwCanPreviewFileName(name)
            ? '<button type="button" class="btn btn-default btn-xs" onclick="locPwOpenFilePreview(\'' + locPwJsQuote(name) + '\',{demo:true});return false;">预览</button>'
            : '';
          return '<div class="loc-pw-list-appt-modal-item">' +
            '<span class="loc-pw-list-appt-modal-ico" aria-hidden="true">📄</span>' +
            '<span class="loc-pw-list-appt-modal-name" title="' + esc(name) + '">' + esc(name) + '</span>' +
            previewBtn +
            '<a class="td-link" href="#" onclick="showToast(\'下载 ' + esc(name) + '\');return false;">下载</a>' +
            '</div>';
        }).join('') + '</div>';
      }
    }
    locPwShowStackedModal('modal-loc-pw-list-attach-files');
  };

  function locPwCountBolApptFiles(bol) {
    return locPwCollectBolApptFileGroups(bol).reduce(function (n, g) {
      return n + (g.files ? g.files.length : 0);
    }, 0);
  }

  function locPwBuildListApptEntryHtml(bol) {
    var n = locPwCountBolApptFiles(bol);
    if (!n) return '—';
    var safeBol = String(bol || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return '<a class="td-link loc-pw-list-appt-entry" href="#" title="查看预约文件" onclick="locPwOpenListApptFiles(\'' + safeBol + '\');return false;">预约文件(' + n + ')</a>';
  }

  function locPwFindListApptFileColIndex() {
    var ths = document.querySelectorAll('.table-wrap .data-table thead th');
    if (!ths.length) ths = document.querySelectorAll('.data-table thead th');
    for (var i = 0; i < ths.length; i++) {
      if ((ths[i].textContent || '').replace(/\s+/g, '') === '预约文件') return i;
    }
    return typeof LOC_PW_COL.apptFile === 'number' ? LOC_PW_COL.apptFile : -1;
  }

  function locPwHydrateListApptFileCells() {
    var col = locPwFindListApptFileColIndex();
    if (col < 0) return;
    document.querySelectorAll('tr[data-loc-pw-bol]').forEach(function (tr) {
      var bol = tr.getAttribute('data-loc-pw-bol');
      if (!bol) return;
      var td = tr.children[col];
      if (!td) return;
      td.classList.add('loc-pw-list-appt-cell');
      td.innerHTML = locPwBuildListApptEntryHtml(bol);
    });
  }

  function locPwEnsureListApptFilesModal() {
    var existing = document.getElementById('modal-loc-pw-list-appt-files');
    if (existing && !document.getElementById('loc-pw-list-appt-batch-dl')) {
      existing.remove();
      existing = null;
    }
    if (existing) return;
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div id="modal-loc-pw-list-appt-files" class="modal-overlay" onclick="closeModalOutside(event,\'modal-loc-pw-list-appt-files\')">' +
      '<div class="modal" style="width:560px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column;">' +
      '<div class="modal-header"><span class="modal-title" id="loc-pw-list-appt-title">预约文件</span>' +
      '<button class="modal-close" type="button" onclick="closeModal(\'modal-loc-pw-list-appt-files\')">✕</button></div>' +
      '<div class="modal-body" style="overflow-y:auto;">' +
      '<div class="loc-pw-list-appt-modal-toolbar" id="loc-pw-list-appt-summary"></div>' +
      '<div class="loc-pw-list-appt-modal-list" id="loc-pw-list-appt-body"></div></div>' +
      '<div class="modal-footer">' +
      '<button class="btn btn-primary" type="button" id="loc-pw-list-appt-batch-dl" onclick="locPwBatchDownloadListApptFiles()">批量下载</button>' +
      '<button class="btn btn-default" type="button" onclick="closeModal(\'modal-loc-pw-list-appt-files\')">关闭</button>' +
      '</div></div></div>';
    document.body.appendChild(wrap.firstChild);
  }

  var LOC_PW_LIST_APPT_CTX = { bol: '', files: [] };

  function locPwFlattenApptFileGroups(groups) {
    var out = [];
    (groups || []).forEach(function (g) {
      (g.files || []).forEach(function (f) {
        if (f && f.name) out.push({ name: f.name, refNo: g.refNo || '', shipmentId: g.shipmentId || '' });
      });
    });
    return out;
  }

  window.locPwBatchDownloadListApptFiles = function () {
    var files = LOC_PW_LIST_APPT_CTX.files || [];
    if (!files.length) return showToast('暂无预约文件', 'warning');
    // 演示：实际可打包 zip；此处按序触发下载提示
    files.forEach(function (f, i) {
      setTimeout(function () {
        showToast('下载 ' + f.name + (files.length > 1 ? '（' + (i + 1) + '/' + files.length + '）' : ''), i === files.length - 1 ? 'success' : 'info');
      }, i * 180);
    });
  };

  window.locPwOpenListApptFiles = function (bol) {
    bol = String(bol || '').trim();
    if (!bol) return;
    locPwEnsureListApptFilesModal();
    var groups = locPwCollectBolApptFileGroups(bol);
    var files = locPwFlattenApptFileGroups(groups);
    var total = files.length;
    LOC_PW_LIST_APPT_CTX = { bol: bol, files: files };
    var title = document.getElementById('loc-pw-list-appt-title');
    var sum = document.getElementById('loc-pw-list-appt-summary');
    var body = document.getElementById('loc-pw-list-appt-body');
    var batchBtn = document.getElementById('loc-pw-list-appt-batch-dl');
    if (title) title.textContent = '预约文件（' + total + '）';
    // 入口已是 BOL 行，摘要不再重复 BOL，只保留数量说明
    if (sum) {
      sum.innerHTML = total
        ? '<span class="loc-pw-list-appt-modal-meta">共 <strong>' + total + '</strong> 个文件</span>'
        : '';
      sum.style.display = total ? '' : 'none';
    }
    if (batchBtn) batchBtn.style.display = total ? '' : 'none';
    if (body) {
      if (!total) {
        body.innerHTML = '<div class="loc-pw-list-appt-modal-empty">暂无预约文件</div>';
      } else {
        var multi = groups.length > 1;
        body.innerHTML = groups.map(function (g) {
          var head = multi
            ? '<div class="loc-pw-list-appt-modal-ship">' + esc(g.refNo || g.shipmentId || '货件') +
              (g.shipmentId ? '<span class="loc-pw-list-appt-modal-ship-id">' + esc(g.shipmentId) + '</span>' : '') +
              '</div>'
            : '';
          var items = g.files.map(function (f) {
            return '<div class="loc-pw-list-appt-modal-item">' +
              '<span class="loc-pw-list-appt-modal-ico" aria-hidden="true">📄</span>' +
              '<span class="loc-pw-list-appt-modal-name" title="' + esc(f.name) + '">' + esc(f.name) + '</span>' +
              '<a class="td-link" href="#" onclick="showToast(\'下载 ' + esc(f.name) + '\');return false;">下载</a>' +
              '</div>';
          }).join('');
          return '<div class="loc-pw-list-appt-modal-group">' + head + items + '</div>';
        }).join('');
      }
    }
    showModal('modal-loc-pw-list-appt-files');
  };

  function locPwBoot() {
    locPwLoadCommLogs();
    locPwLoadMilestones();
    locPwInitInquiryMsSelects();
    locPwInitApptRecipientsInput();
    locPwInitStickyLeftCols();
    locPwInitAllActions();
    document.querySelectorAll('tr[data-loc-pw-bol]').forEach(locPwSyncHoldReasonCell);
    document.querySelectorAll('tr[data-loc-pw-bol]').forEach(locPwSyncInternalRemarkCell);
    locPwInitBolLinks();
    locPwHydrateListApptFileCells();
    locPwHydrateListAttachFileCells();
    locPwRefreshTabCounts();
    locPwInitMergeTrees();
    locPwInitActPltsDisplay();
    locPwInitListCheckboxes();
    locPwBindActualCarrierCreatableSelects();
    locPwInitFileDrops();
    locPwApplyTabFilter();
  }

  window.toggleLocPwMergeTree = function (btn) {
    if (!btn || !btn.closest) return;
    var tr = btn.closest('tr.loc-pw-tr-merge-parent');
    if (!tr) return;
    tr.classList.toggle('loc-pw-tr-merge-parent--collapsed');
    var collapsed = tr.classList.contains('loc-pw-tr-merge-parent--collapsed');
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    btn.textContent = collapsed ? '+' : '−';
    btn.title = collapsed ? '展开子行' : '收起子行';
    locPwSyncMergeChildren(tr);
  };

  window.locPwSwitchTab = function (el, label) {
    locPwCurrentTab = label || '全部';
    document.querySelectorAll('.table-card .tabs .tab').forEach(function (tab) {
      tab.classList.remove('active');
    });
    if (el) el.classList.add('active');
    locPwApplyTabFilter();
  };

  function locPwExportList() {
    var table = document.querySelector('.table-wrap table.data-table');
    if (!table) return showToast('未找到列表表格', 'warning');
    var ths = Array.from(table.querySelectorAll('thead th'));
    var labels = ths.map(function (th) {
      return String(th.textContent || '').replace(/\s+/g, ' ').trim();
    }).filter(function (t, i) {
      return t && !/^(操作)?$/.test(t) && !(i === 0 && ths[i].querySelector('input[type=checkbox]'));
    });
    var rows = Array.from(table.querySelectorAll('tbody tr')).filter(function (tr) {
      return !tr.hidden && tr.querySelectorAll('td').length > 1;
    }).map(function (tr) {
      var tds = Array.from(tr.querySelectorAll('td'));
      var obj = {};
      var col = 0;
      tds.forEach(function (td, i) {
        if (i === 0 && td.querySelector('input[type=checkbox]')) return;
        if (td.classList.contains('td-action') || td.classList.contains('loc-pw-action-host')) return;
        var label = labels[col];
        if (!label) return;
        obj[label] = String(td.textContent || '').replace(/\s+/g, ' ').trim();
        col += 1;
      });
      return obj;
    }).filter(function (r) { return Object.keys(r).length; });
    if (!rows.length) return showToast('暂无可导出数据', 'warning');
    var escCsv = function (v) {
      var s = String(v == null ? '' : v);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var keys = labels.slice(0, Math.max.apply(null, rows.map(function (r) { return Object.keys(r).length; })));
    var csv = [keys.join(',')].concat(rows.map(function (r) {
      return keys.map(function (k) { return escCsv(r[k] || ''); }).join(',');
    })).join('\r\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (window.LOC_PW_PAGE_VARIANT === 'out-of-state' ? '外州私仓' : '本地私仓') + '-列表信息-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 800);
    showToast('列表信息已导出', 'success');
  }

  window.locPwExportList = locPwExportList;
  window.locPwInitAllActions = locPwInitAllActions;
  window.locPwSetRowStatus = locPwSetRowStatus;
  window.locPwRefreshTabCounts = locPwRefreshTabCounts;
  window.locPwApplyTabFilter = locPwApplyTabFilter;
  window.locPwRefreshQueryStats = locPwRefreshQueryStats;
  window.locPwBoot = locPwBoot;
})();
