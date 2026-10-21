# 阶段 4 任务卡：牌型盘点与 kind 冻结

盘点日：按现行 `CARDS`（含 `ROGUE_CARD_DEFS`）、`TECHNIQUES`、`HEARTS`、`MIND_ARTS`、`ENEMIES`。结算仍读 `legacy.ts`，本卡只定注册表合同。

## 牌面数量

| 表 | 条数 | 现行类型 |
|---|---|---|
| 牌 | 155 | `attack` 63，`skill` 92。没有第三种 `type` |
| 外功 | 32 | 无出牌类型 |
| 旧心法 `HEARTS` | 3 | 无出牌类型 |
| 心法 `MIND_ARTS` | 10 | 无出牌类型 |
| 敌人 | 171 | 一条意图队列，不是一张牌 |

未标 `school` 的牌 57 张。注册表记 `any`（通用），不新造系。

## 七类能不能做成 kind

不能。这七类会叠在同一张牌上，互斥枚举装不下。155 张里叠了两类的有 16 张，例如 `ultSaber`（绝招+位移）、`comboPalm`（位移+连携）、`wardPalm`（位移+架）、`fusePalmHook`（位移+连携）。

| 类 | 现行张数 | 落点 |
|---|---|---|
| 绝招 | 8 | 钩子 `ultimate`。门槛数字进 `values`。牌本身仍是攻或技 |
| 位移 | 35 | 钩子 `knock` / `pull` / `step`。可叠在攻或技上 |
| 换人 | 1（`sidestep`） | 钩子 `swap`。换人动作不是牌型 |
| 共鸣 | 0 | 系统在 `labResonance`，没有共鸣牌。钩子 `resonance` 留着，现行牌不挂 |
| 连携 | 22 | 异系融合 `fuse`，同门组合 `combo`。仍是攻或技 |
| 光环 | 6 | 钩子 `aura`。`type` 仍是 skill |
| 架 | 6 | 钩子 `ward`。`type` 仍是 skill，带格挡 |

## 冻结

`CardDef.kind = "attack" | "skill" | "stance"`。

- `attack` / `skill` 对齐现行 `CardType`。
- `stance` 留在枚举里，给以后的持续姿态。架和光环不用它，它们用钩子。现行 155 张都不是 stance。

敌人、外功、心法不复用这组 kind（把外功标成 attack 是错的）。字段仍是 `id / cost / school / kind / effectHooks / values / text`：

- 敌人 kind：`mob | elite | boss`。档位 cost：1 / 2 / 3。名单与 `labEnemyStress` 的首领、精英一致，首领优先于精英（`twin` 记首领）。
- 外功 kind：`technique`。cost = 1，即 `techRank` 没写档时的底档。
- 心法 kind：`mind`。旧心法 kind：`heart`。cost = 1，一份一份装，没有出牌费用。

## id

现行三套并存：牌是 camelCase，生成敌是 `mob_road_01`，绝式是 kebab-case。本阶段不改名，否则结算引用和存档一起断。校验：非空、无空白、表内键与 id 一致、跨表不撞。新牌再走 kebab-case。

## 数值门

只卡 `climbCaps` / `breakCaps` 里已经有的键，不另造伤、治疗、击退的区间。

| values 键 | 上界 |
|---|---|
| block | `CLIMB_BLOCK_CAP` 12 |
| bleed | `CLIMB_BLEED_CAP` 6 |
| expose | `min(CLIMB_EXPOSE_CAP, BREAK_EXPOSE_BEFORE_BLOCK)` |
| foeStun | `CLIMB_STUN_N` 1 |
| stake | `CLIMB_STAKE_CAP` 2 |
| swordChain | `BREAK_SWORD_CHAIN_PER` |
| saberOnHit | `BREAK_SABER_ON_HIT` |

牌面 `text` 必须含阿拉伯数字。外功、心法、敌人的说明文字不按牌面这条卡。

敌人意图队列有多段伤、挡，不塞进单个 `values.damage`。意图 kind 进 `effectHooks`。`sig` 的 id 必须在 `SIGNATURE_BREAK`，`remnant` 必须在外功表。现行敌人定义不挂牌 id；校验函数接收牌 id 列表，缺了就红。

## 未准入（不改结算）

同一套校验拦住，不放宽，也不改旧表费用和文案：

- 0 费 17 张：`backpalm`、`weave`、`retreat`、`cauterize`、`peonyBrew`，以及六系架、六系光环。改成 1 费会改出牌。
- `lateWard` 格挡 16，超过层帽 12。
- `close`、`plant` 牌面没有阿拉伯数字。

这 20 张仍记在 `CARD_HOLDS`（校验红），同时留在 `CARD_REGISTRY`。注册条数 = 旧表 155。不改旧表费用和文案，结算数字不变。图鉴读注册表上的原数字，0 费仍显示 0 费。

## 符与道具

- 助战符 6：`SUMMON_DEFS` 的 `aid*`。kind `charm`。cost 1。钩子 `summon`，加上现行技能数字（破绽 2、裂创 3、挑退 1、眩晕 1、缴械 2、气血底）。
- 道具 6：金疮、袖箭、回气、连环、破禁、死士。kind `item`。cost 1。数字来自 `labV21Constants` / 死士文案里的 8。破禁原文没有阿拉伯数字，注册文案补上「1 回合」（本回合就是 1）。旧提示字符串不改。

## 文件

- 合同：`cards.ts` / `enemies.ts` / `techniques.ts` / `mindArts.ts` / `charms.ts` / `items.ts`
- 旧表：`legacy.ts`。`src/game/content.ts` 只 re-export，结算 import 路径不变。
- `rogueCards.ts` 仍是融合牌构造器，被旧表引用，不能再反向 re-export 注册表。
- 图鉴 `codexCatalog` 的劲、牌面伤、外功文案、心法数字、符、道具从注册表读。名称仍用旧表（合同没有 name）。
