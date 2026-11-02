# 数值核五班 · 2026-11-02

三件都落了。没改 `src/game/sim.ts`。未 commit。未开页面。

`MECH3_REPORT_20261102.md` 已齐。贴身钩是：距离大于 2 放回抽牌堆顶，距离 ≤2 才进手。刀势按这个填。

## P1 刀势进手

`statusSaber`：`drawWhen: "closeQuarters"`。文案：格挡 5。裂创 +1。距 2 格内才进手。抽 1。

`cardTextV2` 的 `CARD_TEXT_V2` 和 `CARD_TEXT_CLIMB` 两处都是这一句。牌面数字没动。

## P2 身板

`WEAPON_PROFICIENCY_20261102.md` 的 18 人表没有术士 / 武夫 / 行者列。按武器谱的路，写在每个人的数据行上：桩武贴身是武夫，养人控场是术士，谱里带飞刀、走长手或游走的是行者。行者 5 人，同一行的 `role` 写成 `skirmish`。开战读的是 `role`，`skirmish` 才挂行者（开局劲 +2）。其余人的 `role` 没动。

| 人 | 身板 |
|---|---|
| 沈夜行、闻人笙、石万山、吕赤锋、薄青、章守山、独孤破岁 | 武夫 |
| 白孟和、万俟晚、周暖香、陈沉缆、傅壁山、封堂 | 术士 |
| 霍长川、安岸火、厉霜行、公孙四丈、欧阳饮钩 | 行者 |

## P3 牌意常量

按 `SCHOOL_BOND_TIERS_20261102.md` 登记。10 档仍用已有的 `CLIMB_TRIPLE_*`，本班没动。

| 名 | 值 | 档 |
|---|---|---|
| `CLIMB_BOND4_PALM_KNOCK` | 1 | 拳 4，首次击退 |
| `CLIMB_BOND7_PALM_REPLAY` | 1 | 拳 7，连击重放花的层 |
| `CLIMB_BOND4_SABER_BLEED` | 1 | 刀 4，裂创首次 |
| `CLIMB_BOND7_SABER_MELEE` | 1 | 刀 7，贴身伤 |
| `CLIMB_BOND4_SWORD_OPEN` | 1 | 剑 4，剑势开场 |
| `CLIMB_BOND7_SWORD_EXPOSE` | 1 | 剑 7，破绽多留 |
| `CLIMB_BOND4_SPEAR_FAR` | 1 | 枪 4，远档伤 |
| `CLIMB_BOND7_SPEAR_NEXT` | 2 | 枪 7，断劲当手下段少的伤 |
| `CLIMB_BOND4_STAFF_CHARGE` | 1 | 棍 4，蓄力开场 |
| `CLIMB_BOND7_STAFF_WALL` | 2 | 棍 7，撞墙伤 |
| `CLIMB_BOND4_HOOK_DISARM` | 1 | 钩 4，缴械多留 |
| `CLIMB_BOND7_HOOK_LEECH` | 0.1 | 钩 7，噬血加 |
| `CLIMB_BOND7_HOOK_LEECH_CAP` | 0.5 | 钩 7，噬血帽 |
| `CLIMB_BOND4_DART_PIN` | 2 | 飞刀 4，钉上限加 |
| `CLIMB_BOND7_DART_PIN` | 1 | 飞刀 7，远战钉 |

`sim.ts` 的 import 仍是 `CLIMB_TIER_*`。本班不改这个文件。这些旧名不再各写一个数字，全部等于上表：`CLIMB_TIER_SABER_HIT = CLIMB_BOND7_SABER_MELEE`，`CLIMB_TIER_SPEAR_CUT_HURT = CLIMB_BOND7_SPEAR_NEXT`，其余一一对应。改 `CLIMB_BOND4_*` / `CLIMB_BOND7_*`，结算跟着走。预演里刀的贴身档读 `CLIMB_BOND7_SABER_MELEE`。

## 汇率

`npx tsx scripts/numgen/audit.ts --now` 重写了 `docs/combat/NUMGEN_AUDIT_20261102.md`。

汇总：基线 131，带内 19，偏肥 48，偏瘦 37，构筑层跳过 27。跳过仍是光环、连携、组合。`scripts/numgen/price.ts` 不读 `climbCaps`，牌意常量不进任何一张牌的构成。

`statusSaber` 填了贴身进手之后：当量 9.4，公平 5，+88.3%，构成是挡 4.2、裂创 2.0、条件抽 3.3。挡和裂创已经吃满 1 费。没有为了回带去削牌面。

## 跟着绿的几处

牌意档已经在结算里，旧断言按没档时的数字写的。没改结算句。

- 拳 7 档连击重放花 1 层：开局 3 层，花 1，命中再叠，收在 3。黄金回放帧的连击记成 2。
- 棍 4 档开场蓄力 +1：打出蓄力牌后是 2 层，两层爆发掉 88。
- 刀 7 档贴身 +1：预演构成补了「贴身档」，抹刀括号合计等于实际掉血。
- 进手条件挡住的牌，测试发牌把它转到牌堆底再继续抽，才能凑满 12 张。
- `UPDATE_GOLDEN=1` 重录了黄金基线。同一种子两次逐拍相同，对照已录基线逐拍为空。重录里有机制核已经接上的牌意档，也有刀势这句文案。

## 全绿

`npm run test:combat`：91 文件 / 950 绿。`npm run typecheck:combat`：exit 0。
