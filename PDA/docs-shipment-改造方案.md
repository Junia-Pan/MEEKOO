# PDA 货件详情页改造方案

> 页面：`PDA/docs-shipment.html` + `PDA/pda-docs-shared.js`
> 日期：2026-08-20
> 前提：业务未提供明确需求，本方案基于代码分析和 WMS PDA 使用场景自主设计

---

## 一、现状诊断

### 1.1 架构现状

页面采用纯前端单文件架构：
- HTML 内联 IIFE 负责渲染逻辑
- `pda-docs-shared.js` 充当数据层（硬编码 PALLETS + SHIPMENT_META）
- `pda.css` 5300+ 行共用样式文件
- 无后端 API 调用、无框架依赖

### 1.2 三个核心问题

| 问题 | 表现 | 影响 |
|------|------|------|
| 数据层假 | `buildDemoShipment()` 对任何未命中 REF 生成虚拟数据，页面永远不显示"未找到" | 原型可用，但上线后用户无法区分真实数据和演示数据 |
| 纯只读 | 无任何操作入口，不能打标签、不能报异常、不能确认出库 | PDA 的核心价值是"扫→看→做"，当前只有"看" |
| 孤岛页 | 板标行不可点击跳转，工单号不可跳转，返回只能回列表 | 用户无法从详情页触达后续操作流程 |

### 1.3 次要问题

- 无加载态（loading skeleton）/ 无错误重试 / 无空状态设计
- Tab 切换不持久化到 URL，刷新丢失
- 板标列表无搜索/排序，数量多时难定位
- 字符串拼接 HTML（虽做了 escapeHtml，但维护性差）
- 无复制到剪贴板功能（PDA 常见需求）
- 缺少超期/紧急度提示（下单天数、ISA 到期提醒）

---

## 二、改造目标

将这个"精美的原型页面"改造为"可用的 PDA 工具页面"：

1. **数据可信**：去掉 demo 回退，建立 API 适配层，支持 Mock/真实接口切换
2. **操作可用**：增加底部动作栏，根据货件状态动态展示操作按钮，跳转到对应 PDA 流程页
3. **导航通畅**：板标行可点击跳转到补打详情页，工单号可跳转，Tab 状态持久化
4. **体验完善**：加载态/错误态/空状态三态完备，板标列表支持搜索，关键字段支持复制

**核心约束**：保持单文件架构，不引入框架，渐进式增强。

---

## 三、分阶段改造方案

### Phase 1：数据层重构（基础）

**目标**：去掉 demo 回退，建立 API 适配层，补齐三态。

#### 改造项

| 项 | 说明 |
|----|------|
| 1.1 去掉 `buildDemoShipment` | `getShipmentByRef` 未命中时返回 `null`，页面走 `#dtNotFound` 空状态 |
| 1.2 新增 `ShipmentAPI` 适配器 | 封装 `fetchShipment(ref)` 方法，内部判断是否走 Mock 还是真实 API |
| 1.3 新增 Mock 开关 | URL 参数 `?mock=1` 或 `localStorage` 控制，默认走真实接口（上线后） |
| 1.4 新增加载态 | 页面打开时显示 skeleton 占位（Hero + logistics + info-grid 区域灰色块） |
| 1.5 新增错误态 | 接口失败时显示错误页 + 重试按钮 |
| 1.6 完善 empty 态 | 未命中时 `#dtNotFound` 增加提示文案 + 返回搜索按钮 |
| 1.7 数据缓存 | 同一 REF 在会话内缓存，避免重复请求 |

#### 涉及文件

- `pda-docs-shared.js`：删除 `buildDemoShipment`、`defaultDemoMeta`、`formatDemoRef`，新增 `ShipmentAPI` 对象
- `docs-shipment.html`：IIFE 中将 `loadShipment` 改为 async，增加 loading/error 分支

#### 代码结构示例

```javascript
// pda-docs-shared.js 新增
var ShipmentAPI = {
  _cache: {},
  useMock: function() {
    return localStorage.getItem('meekoo_pda_mock') === '1' ||
           new URLSearchParams(location.search).has('mock');
  },
  fetchShipment: function(ref) {
    var key = ref.toUpperCase();
    if (this._cache[key]) return Promise.resolve(this._cache[key]);

    if (this.useMock()) {
      // 保留现有 PALLETS + SHIPMENT_META 作为 Mock 数据源
      var pallets = findPalletsByRef(ref);
      if (!pallets.length) return Promise.resolve(null);
      var shipment = enrichShipment(ref, pallets, pallets[0].customer, pallets[0].container, false);
      this._cache[key] = shipment;
      return Promise.resolve(shipment);
    }

    // 真实接口（预留）
    return fetch('/api/pda/shipment/' + encodeURIComponent(ref))
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (!data) return null;
        var shipment = enrichShipmentFromApi(data);
        this._cache[key] = shipment;
        return shipment;
      }.bind(this));
  }
};
```

---

### Phase 2：操作层建设（核心价值）

**目标**：增加底部动作栏，根据货件状态动态展示操作按钮，打通 PDA 流程页跳转。

#### 改造项

| 项 | 说明 |
|----|------|
| 2.1 底部动作栏容器 | 在 `.pda-docs-ship-body` 之后新增 `#dtActionBar`，固定底部，毛玻璃背景 |
| 2.2 状态驱动按钮 | 根据 `shipment.shipStatus` + `milestoneState` 计算可用操作列表 |
| 2.3 操作跳转映射 | 每个按钮跳转到对应 PDA 流程页，携带 `?ref=` 和 `?pltNo=` 参数 |

#### 状态-操作映射表

| 货件状态 | 可用操作 | 跳转目标 |
|----------|----------|----------|
| 已入库 / 在库 | 补打标签、转库位、标记异常 | `reprint.html?ref=` / `relocation.html?ref=` / `problem.html?ref=` |
| 待出库 / 备货中 | 补打标签、确认出库 | `reprint.html?ref=` / `outbound-pick.html?ref=` |
| 已装车 | 确认发车 | `outbound-dispatch.html?ref=` |
| 问题件 | 查看工单、标记异常 | `problem.html?ref=` + 工单号 |
| 已签收 | 无操作 | 仅展示 |

#### 涉及文件

- `docs-shipment.html`：HTML 增加 `#dtActionBar` 容器
- `pda-docs-shared.js`：新增 `getActionsForShipment(shipment)` 函数，返回操作列表
- `pda.css`：新增 `.pda-docs-ship-action-bar` 样式（约 40 行）

#### 代码示例

```javascript
function getActionsForShipment(shipment) {
  var status = shipment.shipStatus;
  var actions = [];

  if (status === '问题件') {
    actions.push({ key: 'ticket', label: '查看工单', href: 'problem.html?ref=' + shipment.ref, primary: false });
    actions.push({ key: 'problem', label: '标记异常', href: 'problem.html?ref=' + shipment.ref, primary: false });
    return actions;
  }

  // 非问题件通用操作
  actions.push({ key: 'reprint', label: '补打标签', href: 'reprint.html?ref=' + shipment.ref, primary: false });

  if (status === '已入库' || status === '在库') {
    actions.push({ key: 'relocate', label: '转库位', href: 'relocation.html?ref=' + shipment.ref, primary: false });
    actions.push({ key: 'problem', label: '报异常', href: 'problem.html?ref=' + shipment.ref, primary: false });
  }

  if (status === '待出库' || status === '备货中') {
    actions.push({ key: 'outbound', label: '确认出库', href: 'outbound-pick.html?ref=' + shipment.ref, primary: true });
  }

  if (status === '已装车') {
    actions.push({ key: 'dispatch', label: '确认发车', href: 'outbound-dispatch.html?ref=' + shipment.ref, primary: true });
  }

  return actions;
}
```

---

### Phase 3：视图层优化（体验提升）

**目标**：补齐交互细节，提升 PDA 使用体验。

#### 改造项

| 项 | 说明 |
|----|------|
| 3.1 板标行可点击 | `palletRowHtml` 生成的行包裹 `<a>` 或加 `onclick`，跳转到 `reprint.html?pltNo=xxx` |
| 3.2 板标列表搜索 | 板标 Tab 顶部增加搜索框，实时过滤板标号/BOL/库位 |
| 3.3 板标列表排序 | 默认按入库时间倒序，增加按板数/件数排序切换 |
| 3.4 Tab 状态持久化 | `switchTab` 时写入 `location.hash`（`#tab=pallet`），页面加载时读取 |
| 3.5 复制到剪贴板 | REF 号、BOL 号、系统单号长按或点击复制按钮，toast 提示 |
| 3.6 超期提醒条 | Hero 卡片下方增加条件渲染的超期提醒（下单天数 > 阈值 或 ISA 即将到期） |
| 3.7 流转卡片增加操作人 | `renderStepCards` 中里程碑卡片增加 `operator` 字段显示 |
| 3.8 异常事件独立 Tab | 将异常事件从"流转详情"Tab 底部提取为独立的"异常"Tab，数量 > 0 时红色徽标 |

#### 涉及文件

- `docs-shipment.html`：HTML 结构调整（新增搜索框、异常 Tab、动作栏容器）
- `pda-docs-shared.js`：新增 `filterPallets`、`sortPallets`、`copyToClipboard` 工具函数
- `pda.css`：新增搜索框、异常 Tab 徽标、超期提醒条样式（约 80 行）

---

### Phase 4：导航与集成（生态打通）

**目标**：打通 PDA 内部页面跳转链路，建立上下文感知。

#### 改造项

| 项 | 说明 |
|----|------|
| 4.1 返回来源感知 | 返回按钮根据 `document.referrer` 或 URL 参数 `?from=` 决定跳转目标（列表 / 工作台） |
| 4.2 工单号可点击 | 拦截提示区 `#dtBlock` 中的工单号变为链接，跳转到工单详情页 |
| 4.3 拆分子单可跳转 | 拆分提示区 `#dtSplit` 中的兄弟子单 BOL 可点击，跳转到对应子单详情 |
| 4.4 扫码入口 | 导航栏增加扫码按钮，调用 PDA 扫码组件或跳转到扫码页 |
| 4.5 页面间数据传递 | 统一 URL 参数约定：`?ref=` (货件)、`?pltNo=` (板标)、`?bol=` (BOL)、`?from=` (来源) |

#### 涉及文件

- `docs-shipment.html`：修改返回按钮逻辑、拦截区/拆分区点击事件
- `pda-docs-shared.js`：新增 `parseNavParams` 工具函数

---

## 四、改造优先级矩阵

| 优先级 | 改造项 | 阶段 | 理由 |
|--------|--------|------|------|
| P0 必做 | 去掉 demo 回退 | Phase 1 | 上线前必须，否则用户看到假数据 |
| P0 必做 | API 适配器 | Phase 1 | 对接后端的前置条件 |
| P0 必做 | 加载态 / 错误态 | Phase 1 | 基本可用性保证 |
| P0 必做 | 底部动作栏 | Phase 2 | PDA 页面的核心价值 |
| P1 重要 | 板标行可点击 | Phase 3 | 打通页面间导航 |
| P1 重要 | Tab 状态持久化 | Phase 3 | 刷新不丢状态 |
| P1 重要 | 工单号跳转 | Phase 4 | 异常处理闭环 |
| P2 建议 | 板标搜索/排序 | Phase 3 | 数量多时提升效率 |
| P2 建议 | 复制到剪贴板 | Phase 3 | PDA 常见操作 |
| P2 建议 | 超期提醒 | Phase 3 | 业务感知增强 |
| P2 建议 | 异常独立 Tab | Phase 3 | 信息结构优化 |
| P3 可选 | 扫码入口 | Phase 4 | 需要硬件支持 |
| P3 可选 | 字符串拼接→DOM API | Phase 3 | 代码质量，不影响功能 |

---

## 五、技术实现要点

### 5.1 保持单文件架构

不引入 Vue/React/框架，改动集中在：
- `pda-docs-shared.js`：删除 demo 函数，新增 API 层和操作映射
- `docs-shipment.html`：IIFE 中增加 async/await、loading/error 分支、动作栏渲染
- `pda.css`：增量新增样式（约 120 行），不改动现有样式

### 5.2 API 适配器设计

```
ShipmentAPI
├── useMock()              // 判断是否走 Mock
├── fetchShipment(ref)     // 获取货件详情（async）
├── fetchPallets(ref)      // 获取板标列表（async）
└── _cache {}              // 会话级缓存
```

Mock 模式下保留现有 PALLETS + SHIPMENT_META 数据结构；真实模式下走 fetch，返回数据经 `enrichShipmentFromApi` 标准化后传入渲染层。

### 5.3 渲染层适配

`renderDetail(shipment)` 不需要大改，只需：
1. 在 `loadShipment` 前调用 `showLoading()` / `showError()` / `showEmpty()`
2. 在 `renderDetail` 末尾调用 `renderActionBar(shipment)`
3. `palletRowHtml` 增加外层 `<a>` 包裹

### 5.4 URL 参数约定

```
docs-shipment.html?q=CRN-2026-018&mock=1#tab=pallet
                ─┬─              ─┬─         ─┬─
                 └ 货件 REF       └ Mock 模式  └ Tab 状态
```

### 5.5 向后兼容

- `?mock=1` 参数下，保留现有 PALLETS + SHIPMENT_META 作为 Mock 数据源，原型展示场景不受影响
- 现有 3 条真实数据（CRN-2026-018 / CRN-770018 / CRN-660092）继续可用于演示
- CSS 增量新增，不改动现有样式规则

---

## 六、改造后页面流转图

```
                        ┌──────────────────────┐
                        │  wms-pda.html (首页)   │
                        │  扫码 / 搜索 / 列表    │
                        └──────────┬───────────┘
                                   │ ?q=CRN-xxx
                                   ▼
                        ┌──────────────────────┐
                        │  docs-shipment.html  │
                        │  ┌─ 概要区 ────────┐ │
                        │  │  REF + 状态     │ │
                        │  │  6节点流转条     │ │
                        │  │  超期提醒(新)    │ │
                        │  └─────────────────┘ │
                        │  ┌ Tab 栏 ─────────┐ │
                        │  │流转│板标│异常(新)│ │
                        │  └──┬────┬────┬─────┘ │
                        │     │    │    │       │
                        │  ┌──┴──┐ │ ┌──┴───┐  │
                        │  │板标行│ │ │工单号│  │
                        │  │可点击│ │ │可跳转│  │
                        │  └──┬──┘ │ └──┬───┘  │
                        │     │    │    │       │
                        │  ┌──┴────┴────┴────┐ │
                        │  │ 底部动作栏(新)    │ │
                        │  │补打│转库│出库    │ │
                        │  └──┬────┬────┬────┘ │
                        └─────┼────┼────┼──────┘
                              │    │    │
                    ┌─────────┘    │    └─────────┐
                    ▼              ▼              ▼
             reprint.html    relocation    outbound-pick
             ?pltNo=xxx     .html?ref=   .html?ref=
```

---

## 七、实施建议

1. **先做 Phase 1 + Phase 2**（P0 优先级），让页面从"原型"变成"工具"
2. Phase 3 可按需逐步推进，每个改造项独立、可单独交付
3. Phase 4 依赖其他 PDA 页面就绪后再做
4. 每次改动保持 `?mock=1` 可用，方便原型展示和回归测试
5. 建议在改造前为现有 3 条真实数据场景截图，作为回归基准
