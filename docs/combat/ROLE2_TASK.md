# 任务卡 · 角色核二班（缘分全接 + 身板轴三重 + 毒结算 + 条件抽字段）

2026-11-02 主窗派发。**开工令：统筹已把当前 42 文件提交（等统筹 SHA 再动）。** 独占 `src/game/sim.ts`。

## 阶段

### P1 缘分初识全接（12 条）
`affinityBonds.ts` 表上未接的初识效果逐条进结算：门桩（桩挡次 +1）、丝饮（噬血 +1）、双尺（距 3+ 伤 +1）、岁笙（剑势开场 +1）、裂刃（首手撕挡 2）、壁岸（撞壁回血 +1）、掌春（收势全队回 1）、剑阁（破绽穿挡 +1）、枪行（远档伤 +1）、桩门（蓄力叠层 +1 限棍）、钩行（缴械续 +1 息）、争锋（一人起势另一人当手 −1 剑势）。全部只放大当事人已有主语，数值进 caps。进阶字段 `bondStages` 接：同路 = 基效 ×1.5 取整，生死 = ×2 或解锁连携（已发牌的不重复发）。

### P2 身板轴 + 三重接线
`professions.ts` / 配装结算读：`CLIMB_BODY_QI_MAX`（上限 +2）、`CLIMB_BODY_QI_REGEN`（回 +1）、`CLIMB_BODY_HP`（HP +20%）、`CLIMB_BODY_OPEN_QI`（开局 +2）——按角色身板定位（术士 / 武夫 / 行者）挂。三重幅度接线：`CLIMB_TRIPLE_BLEED_BONUS`（+2）、`CLIMB_TRIPLE_EXPOSE_BONUS`（+2）、断劲 +1、钩拉近上限 4 格——牌意 10 张达档时生效。

### P3 毒结算
`poison` 钩进结算：毒层独立（不进裂创），叠在敌上，回合结束按层扣 1（无视挡），层不衰减。三件道具接效果：淬毒（消耗品，本场攻击附毒 2 层）、毒经（心法，攻击牌附毒 1 层）、毒功（外功，附毒 2 层）。毒件入 `ALL_ITEMS` 当铺随机货。数值进 caps，标黄。

### P4 条件抽字段配合
`drawWhen` 已落钩。数值核填字段时若钩语义缺（如 `notAttacked` / `staked` / `exposed`），补钩：本手未攻击 / 落桩成功 / 已有破绽 / 前进成功 / 有封。补完告诉数值核可填。

### P5 黄金与验收
全绿 + 黄金列原因。缘分 / 职业 / 毒各配定向测试。

## 边界

准许：`sim.ts`、`types.ts`、`climbCaps.ts`（只加新行）、`affinityBonds.ts`、`professions.ts`、`weaponKit.ts`、`content/items.ts`、新建 `src/game/poison.ts`、`role.test.ts` 扩、黄金、SYNC 自己节。
禁止：`content/cards/*` 牌面数字（数值核的）、`render/**`、`dom/**`、`storyBeats`、冻结区、读招、git commit。

## 验收

`npm run test:combat` + `typecheck:combat` 绿；12 条初识各有测试；毒三档各一测试；身板轴三档各一测试；黄金原因清单。
