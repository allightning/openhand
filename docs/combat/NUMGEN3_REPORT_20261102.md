# 数值核三班 · 2026-11-02

基线 `0774620`。对照 `NUMERIC_STAGE_V1_20261102.md` 经济表。没改 `sim.ts`，没改 `content/cards` 里的结算句。未 commit。未开页面。

## 黑市情报

黑市摊开时多两件货。价用当前彩金，不跟馆序底彩。

| 货 | id | 价 | 买下记下 |
|---|---|---|---|
| 底细 | `intel:detail` | `intelPrice(pot, "detail")` = 15% | `intelTier: "detail"`，`pendingIntel` |
| 命门 | `intel:core` | `intelPrice(pot, "core")` = 30% | `intelTier: "core"`，`pendingIntel` |

江湖黑市没开时不摆。跳过黑市也不摆。已经是命门再买底细，档留在命门。

买下会点亮原来的 `pendingIntel`。配招摊开、墙、窗、怕的打法，结算不读 `intelTier`。**待角色核接线。**

## 毒三档

三件都在 `ITEM_REGISTRY`。价来自 `climbCaps`。钩子表加了名字 `poison`，`sim.ts` 和道具使用都不读它。没放进当铺随机货 `ALL_ITEMS`，避免买下来扣了颗数却没有效果。

| 名 | id | 标价 |
|---|---|---|
| 淬毒 | `cuandu` | 6 |
| 毒经 | `dujing` | 20 |
| 毒功 | `dugong` | 36 |

**待角色核接线。**

## 已在 climbCaps、结算还没读

噬血 40% 不在这张表里。`CLIMB_LIFESTEAL_PCT` 结算在读。

| 组 | 常量 | 数 | 谁该接 |
|---|---|---|---|
| 身板 · 蓝厚 | `CLIMB_BODY_QI_MAX` | 上限 +2 | 角色核 |
| 身板 · 蓝厚 | `CLIMB_BODY_QI_REGEN` | 回劲 +1 | 角色核 |
| 身板 · 血厚 | `CLIMB_BODY_HP` | HP +20% | 角色核 |
| 身板 · 快热 | `CLIMB_BODY_OPEN_QI` | 开局劲 +2 | 角色核 |
| 三重 · 裂创帽 | `CLIMB_TRIPLE_BLEED_BONUS` | +2（6→8） | 角色核 |
| 三重 · 破绽帽 | `CLIMB_TRIPLE_EXPOSE_BONUS` | +2（4→6） | 角色核 |
| 三重 · 断劲 | `CLIMB_TRIPLE_CUT_QI` | +1（3→4） | 角色核 |
| 三重 · 拉近 | `CLIMB_PULL_MAX` | 至多 4 格 | 角色核 |

这八个常量全库只有 `climbCaps.ts` 自己引用。基础帽仍是裂创 6、破绽 4，断劲基础仍是 3。

## 全绿

`npm run test:combat`：85 文件 / 907 绿。`npm run typecheck:combat`：exit 0。

黑市件数断言 3→5、残血 4→6，多出来的是底细和命门。买下后彩金按 15% / 30% 扣，档从底细升到命门。
