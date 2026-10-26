# 任务卡 · 战斗板 2.0（9 格视觉 + 格后墙 + 环境视觉语言 + HUD 可读性大修）

2026-10-23 主窗派发。UI 窗，MEGA 版，五个阶段。独占 `prodBattleUi.ts`、`foePlayback.ts`、`render/**`、`lab.css`。不碰 `src/game/**` 与 `dom/**`（音频窗接事件时会碰 dom，错开文件即可）。

## 做完的样子

9 格石台与格后墙视觉上定稿；灼烧 / 无墙 / 缺格有一套完整视觉语言（空样式待数值）；意图条、阶段条、状态 chip、预演条、牌手区在 9 格下全部重排合格；有自动化「按钮不重叠」守卫。

## 阶段

### P1 · 9 格石台 + 格后墙
- 行路 9 格全能站人、无 `cell.wall`；墙画在高侧格外（独立墙标元素，不占格）。登门仍 7 格末格「壁」。
- 读 `Battle.boardSize` / `wallEnds` / `wallSide`；字段未接前按缺省 9 格高侧单墙渲染并在回主窗注明。
- 敌 / 我 / 桩 / 召唤 / 陷阱 / ghost 落点 / 威胁圈 / 红格全部对齐新板长。

### P2 · 环境词条视觉语言（空样式）
- 三套 class 与样式：`env-burn`（灼烧格：淡红底 + 朱点，不做动画）、`env-nowall`（无墙场：墙标虚化成断口）、`env-gap-end` / `env-gap-mid`（缺格：格子画成断台，缺格不可站、不可落点的视觉）。
- 不接数值、不接出现逻辑；样式开关挂 `data-env` 属性，等结算字段。
- 图鉴 / 预演条显示环境名的文案键留位（文案由遭遇窗出）。

### P3 · HUD 可读性大修
- 意图条：全段亮出在 9 格 + 更宽板下的排版；段多时不许挤压牌手区。
- 阶段条：占位、不随出现消失撑布局（铁律 §4），检查现有实现并固化测试。
- 状态 chip：间距、换行、超一串时的收叠策略。
- 预演条：只排版（括号构成、合计对齐），不改 `damageBreakdown` 公式。
- 牌手区：9 格变宽后手牌 / 弃牌 / 收势 / 置换区不重叠、不被推出视口。

### P4 · 无重叠自动化守卫
- 新建 `src/combatLab/noOverlap.test.ts`：对战斗屏关键按钮组（牌手、弃牌、收势、意图条、换人）解析渲染 DOM，断言包围盒两两不重叠（现有渲染是字符串模板，用布局约定 + 类名网格断言；无法测真像素的用选择器共容器断言 + CSS 网格断言）。
- 按钮重叠 = 铁律级失败，测试必须能红。

### P5 · 基线与报告
- DOM 事件序列基线（goldenReplay.dom.json）若因渲染结构变化需更新，走 `UPDATE_GOLDEN=1` 并在报告注明每处变更原因。
- 回主窗写：墙标画法、9 格横排方案、三词条 class 清单、HUD 改了哪五处、noOverlap 覆盖了哪几组按钮。

## 边界

**准许：** `src/combatLab/prodBattleUi.ts`、`foePlayback.ts`、`render/**`、`lab.css`（战斗板与 HUD 选择器）、`prodBattleUi.test.ts`、新建 `noOverlap.test.ts`、`board9dom.test.ts`、SYNC 自己那一节。
**禁止：** `src/game/**`、`dom/bindDom*`（音频窗接事件用，错开）、`storyBeats`/`climbPlaces`/`gauntletPaths`（遭遇）、`sfxMap`/`labAudio`（音频）、结算与数字、新界面新屏、git commit、冻结区、读招、开页面测试（验收全靠测试与 DOM 断言）。

## 验收

`npm run test:combat` + `npm run typecheck:combat` 绿；noOverlap 守卫在；行路 9 格 + 高侧墙渲染断言、登门 7 格末格壁断言；DOM 基线更新有变更原因清单。

## 交付（收尾必交）

1. **工作成果报告** `docs/combat/UI9_REPORT_20261023.md`：墙标画法、横排方案、HUD 五处改动、守卫覆盖清单、基线变更原因。
2. **创新思路**：环境视觉语言的设计理念、noOverlap 怎么在无浏览器下成立的、可读性取舍，哪些值得固化进 CSS/渲染规范。
3. SYNC 自己那节更新。
