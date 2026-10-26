# 任务卡 · 数值核（生成器落码 + 131 重填 + 敌曲线 + 黄金重录）

2026-10-23 主窗派发。wave 2 第二包。**开工令：CLOSEGATE_REPORT 全绿 + REGEN_REPORT 已交。** 不碰 `sim.ts`（机制核独占期）；只改数据与脚本。

## 开场词（整段贴进新对话第一条）

```
你是 Openhand「数值核」窗。任务卡 docs/combat/NUMGEN_TASK.md 是口径。先读它，再读 docs/combat/EXCHANGE_V2_20261023.md 全文（九币价 + 标尺牌 + 利息公式都在里面），再读 .cursor/lanes/SYNC.md 与 .cursor/rules/combat-ironclad.mdc。开工令：CLOSEGATE_REPORT 全绿且 REGEN_REPORT 已交；不齐先等（sleep 300 重查，最多 2 小时），超时不动代码写报告收工。

四个阶段：
P1 生成器——新建 scripts/numgen/：输入 EXCHANGE_V2 九币价 + 标尺牌表 + CARD_REGISTRY 每牌效果钩；每张牌算当量 = Σ(效果×币价) − 条件折扣，对费用×5 报偏差。先出全池偏差报告 docs/combat/NUMGEN_AUDIT_20261023.md，不改一张牌。
P2 重填——偏差 ±15% 内的按生成值直接改牌面数字；±15% 外的不改，列超带名单（牌 id / 现值 / 生成值 / 偏差）进报告。改完跑 test:combat，连锁红的测试按新牌面更新断言（只改断言不改机制）。
P3 敌曲线——按 EXCHANGE_V2 §6 全表落敌人数据：馆 1-3 杂兵 100-125 / 4-6 精英 195-235 / 7-9 精英 253-305 / 座前 400-520；敌伤按玩家血条 15-30% 比例。只改数据表（foeCatalog / labEnemyStress 数值行），不改意图结构。
P4 黄金重录——UPDATE_GOLDEN=1 重录，逐条列变更原因；跑同种子两次 diff 为空。

红线：不碰 sim.ts / types.ts / climbCaps.ts（机制核的）；不改效果钩与机制结构；超带名单不许自动削；不 git commit、不开页面测试、冻结区读招不碰。

收尾交付：①docs/combat/NUMGEN_REPORT_20261023.md——生成器设计、超带名单、敌曲线落地表、黄金变更清单、全绿证据；②创新思路。SYNC 只改自己那节。
```

## 边界

准许：`scripts/numgen/**`（新建）、`src/game/content/cards*` 与 `legacy*` 的**数值行**、`foeCatalog.ts`、`labEnemyStress.ts` 数值行、相关测试断言、`docs/combat/NUMGEN_*`、黄金基线、RULES 数值行、SYNC 自己节。
禁止：`sim.ts`、`types.ts`、`climbCaps.ts`、机制结构、效果钩、`render/**`、音频、遭遇、冻结区、读招。
