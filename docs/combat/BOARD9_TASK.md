# 任务卡 · 石台 2.0（9 格 + 格后单墙 + 站位系统 + 全位移测试矩阵）

2026-10-23 主窗派发。核玩窗一，MEGA 版，四个阶段。独占 `src/game/sim.ts`、`src/game/types.ts`。规则变更，不是无行为重构。

## 做完的样子

行路 9 格全能站人；墙不占格，在高侧格外；高侧出界才撞墙，低侧出界停在边格不扣伤。登门仍 7 格、两端撞墙，结算与改前逐帧一致。全板所有「写死 7 / pos 6」的站位逻辑全部参数化。位移相关结算有一套完整定向测试矩阵。

## 阶段

### P1 · 9 格 + 格后单墙结算
- `BOARD_SIZE = 7` 常量保留作缺省（登门与旧测试用）。行路局在 `makeBattle` 组对象时写入 `boardSize: 9`、`wallEnds: "high"`；登门局写入 `boardSize: 7`、`wallEnds: "both"`。
- 组局选值是唯一的 `ruleset.mode` 判断点；`knockAway` 及一切结算只读 `b.boardSize` / `b.wallEnds`，不新增 mode 判断。
- 出界：下一步 `<0` 或 `>=boardSize` 时，该侧在 `wallEnds` 里才扣 `wallHit` 并停住；不在则停边格、不扣血、不写撞壁。
- 默认开局仍玩家 pos 0 / 敌 pos 5（距离 5，满足 ≤5）。不随机左右。
- 不动拳 labV2「震壁 +6 且晕」（读招路径原样留）；不加棍晕、枪回马枪。

### P2 · 站位系统参数化
- 全仓 grep `BOARD_SIZE`、`pos: 数字`、`=== 6`、`>= 6`，凡与板长耦合的站位全部改读 `b.boardSize`：`sim.ts` twin/shadow 硬编码 pos 3/6、`foeCatalog.ts` 的 pos 4/5、`stake.ts`、`labResonance.ts`、`labAssist.ts`、`labV21.ts`（只读适配，不改读招行为）。
- `makeBattle` 形参不改（模拟器窗在调用）。新增字段走 `Battle` 对象与 `run` 配置。
- 初始距离留字段：`run.openingDist?: number`（缺省 5，上限 5）。不接关卡表、不掷随机，关卡驱动等遭遇窗词条包后由主窗派。
- 墙侧留字段：`run.wallSide?: "high" | "low" | "none"`（缺省 high）。`none` 时两端出界都停边格不扣血——这是「无墙场」的结算底座，视觉与词条出现逻辑不归本包。

### P3 · 全位移定向测试矩阵
对以下每一条写定向测试（新文件 `src/game/board9.test.ts`，可拆）：
- 高侧撞墙扣血、低侧出界不扣血、无墙场（wallSide none）两端都不扣
- 推 / 拉 / 换位 / 冲锋在 9 格板各距离档的落点
- 助战召唤体当墙（现有机制在 9 格复验）
- 桩挡路、桩落点在 9 格板（含高阶桩、贴身砸桩）
- twin/shadow 双人站位随板长缩放
- 撞壁牌（push / push2 / legacy 撞壁文案牌）在 9 格的数值不变性
- 登门 7 格回归：两端撞墙、末格墙行为与改前一致

### P4 · 黄金与基线
- 登门帧必须与改前一致；行路帧允许 `UPDATE_GOLDEN=1` 重录（板长与墙侧变化）。
- 重录后跑同种子两次 diff 为空。
- 输出《石台 2.0 影响报告》写进 SYNC 回主窗：站位变了哪些定向场景、撞墙次数变化、登门 diff 是否为空。

## 边界

**准许：** `src/game/sim.ts`、`types.ts`、`stake.ts`、`labResonance.ts`、`labAssist.ts`、`foeCatalog.ts`、`sim.test.ts`、新建 `board9.test.ts`、`labV21.ts`（只读适配行）、黄金三基线、`docs/combat/RULES.md` 石台行、SYNC 自己那一节。
**禁止：** `makeBattle` 形参；`src/combatLab/**`（UI 窗的地盘，含 prodBattleUi/foePlayback）；`src/game/content/**`（核玩二）；敌血、牌面、蓝条、桩机制、蓄力、飞刀、职业、环境词条数值；git commit；冻结区；读招内核（breakCampaign/qiCommit/labV2/labV21 行为/trainingHall）。

## 验收

`npm run test:combat` + `npm run typecheck:combat` 绿；P3 矩阵全绿；登门 7 格回归 diff 为空；行路 9 格三断言（可站满、高侧撞、低侧停）成立。

## 交付（收尾必交）

1. **工作成果报告** `docs/combat/BOARD9_REPORT_20261023.md`：每阶段做了什么、测试证据（绿数、diff 为空）、影响面清单。
2. **创新思路**：执行层你自己定的取舍（字段设计、矩阵组织、参数化手法），哪些值得固化进 `docs/combat/ARCHITECTURE.md` 或铁律，逐条列。
3. SYNC 自己那节更新本班 / 已收 / 回主窗。
