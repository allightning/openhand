# 阶段 3 · 战斗壳拆解包（UI）

日期：2026-10-21。旧核沉 `engine/break`、引擎 `ruleset.mode` 归零、DOM 事件序列不在本包。

## 行数

| | 行 |
|---|---|
| 开工 `src/combatLab/main.ts` | 4151 |
| 收工 `src/combatLab/main.ts` | 99 |
| 壳层状态 `flow/shellState.ts` | 294 |

`main.ts` 只做三件事：页面入口（样式、上次配装、键盘）、`api.enterMode`（唯一生产 `setLabRuleset`）、开机 `api.render()`。局内状态在 `S` 上，跨文件调用走 `api`，出招回放函数体原序搬走。

## 分区

状态依赖都在 `flow/shellState.ts` 的 `S`。函数不再闭包模块 `let`。

| 域 | 文件 | 装什么 |
|---|---|---|
| render | `shellChrome.ts` `shellFrames.ts` `shellPaint.ts` `renderSetup.ts` `renderBattle.ts` `battleFrame.ts` | 顶栏、浮层、装配屏、战斗页 HTML |
| flow | `playbackFlow.ts` `foeRecapFlow.ts` `campFlow.ts` `battleFlow.ts` `settingsFlow.ts` `audioFlow.ts` `screenFlow.ts` `hallFlow.ts` `demoFlow.ts` `campaignFlow.ts` `gauntletFlow.ts` `gauntletSettleFlow.ts` | 回放、营地、开战/收势、馆间屏 |
| dom | `bindDom.ts` 调 `bindDomPart0`–`6`；另有 `bindSetup.ts` `bindQi.ts` | 事件。`bindEvents` 按语句段切开，同一局部变量的声明和引用留在同一段 |

仍超过 80 行、本班没有再切的函数：`playFoeRecapThen`（129，逐段定时器共用一个下标，再切会动铁律 §4 时序）、`renderBattle`（257，门控和按钮共用同一批局部量）、`renderBattleProd`（99）、`openSettings`（88）、`renderSetup`（87）、`bindQiCommitEvents`（136）、`bindPickPanelEvents`（84）、`bindDomPart9/13/16`（132/105/179，段内局部函数跨语句）。文件都已 ≤300 行。

## 旧 `src/main.ts`

已删除。页面入口是 `combatLab/main.ts`。`typecheck:combat` 无 import 回环。

冻结区 `src/map/luoyangV5.test.ts`、`luoyangV6.test.ts`、`luoyangV7.test.ts` 仍 `readFileSync("../main.ts")`。本包不准改 `src/map`，这三处没清。`test:combat` 不跑它们。

## `isBreakAlign` 逐处下文

读招窗没有另给清单。本包按 `rg` 归类。业务分叉改读 `shellRunContext().ruleset.mode`（与 `isBreakAlign()` 同值：都是 `getLabRuleset()==="break"`）。入口选核留着。

### 入口选核该留

| 位置 | 下文 |
|---|---|
| `labRuleset.ts` 定义 | 留。调用清零前这是读核 |
| `factory.ts:128` | 留。登门开战把心法加的劲补满 |
| `factory.ts:141` | 留。行路开局站位 |
| `factory.ts:143` | 留。行路同系三人发光环牌 |
| `dom/bindDomPart5.ts` 收势 | 留。`deferStatusTicks: !isBreakAlign()`，行路延后状态跳 |

生产 `setLabRuleset` 只在 `main.ts` 的 `api.enterMode`。馆/示范/登门/行路流程改调 `api.enterMode`。

### 业务分叉已收成 ctx

| 位置 | 下文 |
|---|---|
| `flow/playbackFlow.ts` 敌先机开场句 | 改读 ctx |
| `render/renderBattle.ts` 收势按钮提示 | 改读 ctx |
| `dom/bindDomPart2.ts` 登门外功/心法先选人 | 改读 ctx |
| `gauntletUi.ts` 赌馆文案、选路副题、歇脚副题、外功槽、同道屏、黑市一句 | 改读 ctx |
| `gauntletUi.ts` 馆数徽 | 两支都是 `第 N/final 馆`，死叉已删 |
| `prodBattleUi.ts` 充能条、充能轨、战斗页 `breakAlign` | 改读 ctx |
| `labV2Ui.ts` 特效层滤字 | 改读 ctx |
| `devPanel.ts` 模式横幅、敌人档案 | 改读 ctx |
| `rewardArt.ts` 营地牌面 | 改读 ctx，传给 `cardDisplayText` |
| `breakAlign.ts` 外功/心法/道具提示 | 改读 ctx |

### 不在本包准许文件，未改

| 位置 | 下文 |
|---|---|
| `gauntlet.ts` 20 处 | 经济、配装、奖励、敌人表。归行路窗 / 阶段 3 下半，本包不准碰 |
| `labCombat.ts` 3 处 | 换人扣劲、重绑心法、连携牌。归换人核，本包不准碰 |
| `draft.ts` 1 处 | 外功槽按馆切。本包不准碰 |
| `lab.test.ts` 1 处、`labRuleset.test.ts` 3 处 | 测试夹具，不归并 |

事页选项 `(applyStoryChoice \| applyEncounterChoice)` 原来少传 rng，两个函数都已要求第三个参数，类型不过。壳层补上 `Math.random`，公式没改。

## 界面收口

- 配装：谱 / 功法 / 心法 / 武器仍分页（测试要这四个 `data-loadout-page`）。功法页签文案改为「功法」。谱和功法的出战区按上限补 `gauntlet-stash-slot is-empty` 空槽。类名没换。
- 侧栏状态 chip：仍是 `status-col` / `status-chip`。间距收到 `gap:0.08rem`，写在现有节点的 style 上。`lab.css` 不在准许文件里。
- `battleSheet`：统筹窗没有删掉这个模块。它还在用：抽牌堆 / 本馆笺（`render/shellFrames.ts`、`dom/bindDomPart0.ts`、`flow/shellState.ts`）。`battleSheet.test.ts` 仍绿。没有可删的残留引用。

## 验收

- `npm run test:combat`：76 文件，795 通过。黄金对局两条都过（逐拍相同；对照基线 diff 为空）。
- `npm run typecheck:combat`：exit 0。
- 未 commit。未开页面。未改 `src/game/**`。
