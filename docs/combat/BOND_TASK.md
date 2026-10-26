# 任务卡 · 牌意连携核（配装破档 + 连携 15 重写）

2026-10-23 主窗派发。wave 2 第三包。**开工令：MECH_REPORT 已交**（要摸 sim 加牌意结算，排在机制核后）。设计真源：`docs/combat/BOND_RARITY_PLAN_20261021.md` + Notion 牌意破档页。

## 开场词（整段贴进新对话第一条）

```
你是 Openhand「牌意连携核」窗。任务卡 docs/combat/BOND_TASK.md 是口径。先读它，再读 docs/combat/BOND_RARITY_PLAN_20261021.md，再读 .cursor/lanes/SYNC.md 与 .cursor/rules/combat-ironclad.mdc。开工令：docs/combat/MECH_REPORT_20261023.md 已交；未交先等（sleep 300 重查，最多 2 小时），超时不动代码写报告收工。

三个阶段：
P1 注册表——新建 src/game/schoolBonds.ts：六系 + 杂家各一行数据（系 id / 档位 4·7·10 / 每档被动效果钩 / 文案键）。一重 = 数值放大本系主语，二重 = 开场效果；三重规则微调不做（默认不动，标黄留口）。杂家 any ≥8/14 两档。
P2 结算——配装同系牌数在配装变更与开局时结算，达档挂常驻被动；被动效果走既有状态/光环通道，不在 sim 加特例 if（进数据表 + 通用读取点）。数值先登记 climbCaps（只加新常量行，不动既有值）。
P3 连携重写——15 张连携由人名轴改武器系轴：换入同系角色触发（bondSchool 字段卡池窗已立）。逐张重写效果与文案（带数字），删人名判定。文案过文风铁律。

红线：不改既有 131 张牌数值（数值核）、不碰飞刀/蓄力新文件（机制核）、不碰渲染（表现跟进核）、不 git commit、不开页面测试、冻结区读招不碰。

收尾交付：①docs/combat/BOND_REPORT_20261023.md——档位表、被动清单、连携 15 新旧对照、测试证据；②创新思路。SYNC 只改自己那节。
```

## 边界

准许：`src/game/schoolBonds.ts`（新建）、`sim.ts`（仅牌意通用读取点）、`climbCaps.ts`（只加新行）、连携相关 content 行、`loadout.ts` / `climbLoadout.ts`、新建 `schoolBonds.test.ts`、黄金基线（列原因）、RULES 对应行、SYNC 自己节。
禁止：既有牌数值、机制核新文件、`render/**`、音频、遭遇、冻结区、读招。
