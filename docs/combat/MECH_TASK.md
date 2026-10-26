# 任务卡 · 机制核（蓄力 → 飞刀 → 环境词条结算）

2026-10-23 主窗派发。wave 2 第一包。**开工令：CLOSEGATE_REPORT 全绿。** 独占 `src/game/sim.ts`、`src/game/types.ts`、`src/combatLab/climbCaps.ts`、新机制 content 新文件。

## 开场词（整段贴进新对话第一条）

```
你是 Openhand「机制核」窗。任务卡 docs/combat/MECH_TASK.md 是口径。先读它，再读 .cursor/lanes/SYNC.md，再读 .cursor/rules/combat-ironclad.mdc 与 docs/combat/EXCHANGE_V2_20261023.md §4。开工令：docs/combat/CLOSEGATE_REPORT_20261023.md 存在且全绿；不绿先等（sleep 300 重查，最多 2 小时），超时不动代码写报告收工。

三个阶段按序做，每阶段跑 npm run test:combat 与 typecheck:combat：
P1 棍蓄力——蓄力层 status（帽先 6 占位）：指定蓄力牌打出后不攻击、改叠层；爆发牌消费全部层打高伤。常量进 climbCaps。牌面数值用 EXCHANGE_V2 §4.3 利息公式（蓄 1 手爆发 ≈ 38-45 伤当量，利息默认 25%/手标黄）。先落机制与 2-3 张代表牌，不全池铺。
P2 飞刀——WeaponId 加 dart；双形态：敌距 1-2 近战、3-6 远战，无距离衰减、无死区；副钉：每层减敌下次位移 1 步、可叠；底速 9 全场最快；伤害压低（射程价 1.8-2.4 劲，EXCHANGE_V2 §4.2）。牌池先 5-8 张代表牌进新文件，不进既有 cards 表。
P3 环境词条结算——灼烧格：回合结束站其上者扣 X（X 进 climbCaps 占位）；无墙场：接 wallSide "none"；缺格：不可站、不可停留、位移可跨过。词条由 run.envTag 传入（遭遇窗已挂字段），出现概率不接。
P4 墙联动包（2026-10-25 拍定，RULES 撞墙分工条）——棍：敌撞墙扣血 + 晕段；**枪回马枪**：我方后手 + 背墙，敌位移逼近至距我 2 格时敌段暂停弹判定窗（画面停触发帧，不提前跳终态），耗蓝 X（X 进 caps）→ 敌停 2 格、废剩余全部位移；**钩抡撞**：背墙 + 敌贴身「墙-我-敌」一线，拉近变抡撞：换位（落点不可站则停可站格）+ 撞墙伤 + 视为成功拉近。**反应窗是结算新能力**：敌段中途可暂停-选择-继续，预留给以后敌方反应窗。

红线：不改既有 131 张牌数值（数值核的活）、不碰读招与冻结区、不 git commit、不开页面测试、不改 UI 渲染（表现跟进核的活；新 status 只供数据）。新机制全部数据表驱动，sim 里不加内容特例 if。

收尾交付：①docs/combat/MECH_REPORT_20261023.md——三阶段各落了什么、常量清单、测试证据；②创新思路。SYNC 只改自己那节。
```

## 边界

准许：`sim.ts`、`types.ts`、`climbCaps.ts`、新建 `src/game/content/cards/staffCharge.ts` / `dart.ts`（或卡池窗拆分后的等价新文件）、`src/game/board9.test.ts`（扩）、新建 `mech*.test.ts`、黄金基线（机制变化重录，列原因）、RULES 对应行、SYNC 自己节。
禁止：既有 cards/legacy 数值、`content/cards.ts` 既有行（飞刀牌走新文件注册链）、`render/**`、`prodBattleUi`、`sfxMap/labAudio`、`storyBeats`、冻结区、读招。
