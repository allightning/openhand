# 数值核十一班报告（NUMGEN11，2026-11-14）

任务卡 `docs/combat/NUMGEN11_TASK.md`，全部内容用户 2026-11-14 已拍板。五件 + P3.5 全落。
**闸门：`test:combat` 98 文件 / 985 绿；`typecheck:combat` exit 0。黄金对局 2/2 绿，无变化，未重录。未 commit，未开页面。**

---

## P1 破挡构筑件两件（心法「破甲」/ 外功「裂石」)

**落码文件：**
- `src/game/climbCaps.ts`：`CLIMB_PIERCE_BLOCK_MIND=2`、`CLIMB_SHRED_BLOCK=3`、`CLIMB_SHRED_BLOCK_GATE=6`（注释写明天花板与门禁纪律）。
- `src/game/rules/guardBreak.ts`（新，47 行）：`mindPierceBlock`（读心法加成、封顶 2）、`shredBlockOnStrike`（平直判定、出招时门禁、`回合:牌:序` 键保证每招一次，同招多段不重复）。
- `src/game/sim.ts`（任务卡开场词授权的破挡最小钩子，仅此一处通用分支）：`hitEnemy` 里裂石调用插在柏青裂甲分支**之前**（门禁读出招时挡，两件同位相加）；挡吃伤行改 `敌挡 − 穿挡` 后结算，note「破甲穿挡 N」只报真正穿过去的伤。
- `src/game/mindArts.ts` + `src/game/content/mindArts.ts`：破甲心法（穿 2）入表，`MindArtDef`/`MindArtBonuses` 加 `pierceBlock` 字段并透传。
- `src/game/content/legacy.ts` + `techniques.ts` + `hooks.ts`：裂石入外功表（通用、无系），hook `shredBlock`，values 引 caps。
- `src/game/types.ts`：TechniqueId +`lieshi`，Battle +`shredBlockKey`。
- `src/combatLab/autoLoadouts.ts`：裂石进 t2 玄甲桩城 porter 池（§27.4 覆盖断言要求每个外功至少在一条预设配装池里）。

**汇率账（构筑层不进牌面汇率，单独审）：**
- 破甲穿 2 = 逐击 +2 伤当量（仅敌有挡）。锚 = 剑破绽穿 4（专精、耗 1 层破绽 ≈ 2 伤叠层成本）。通用 = 专精一半，**未越天花板**，符合「通用薄专精厚」。
- 一手 2–3 击 ≈ 4–6 伤当量 ≈ 0.8–1.2 劲/手（汇率 5 伤 = 1 劲），代价是一个心法槽 + 条件限定（敌有挡）。判定：合理。
- 裂石碎 3 ≈ 2.5 伤当量/招（6 挡 = 5 伤），锚 = 柏青裂甲 3（角色机制，同为平直 3），两件同位相加一致。门禁 ≥6 保身份（专打硬功）：杂兵低挡不触发，精英 / 座前高挡才亮。**门禁不放宽；偏弱只动价格与获取口。**

**测试：** `src/combatLab/guardBreak.test.ts`——穿 2 / 无破甲对照 / 叠两份封 2（天花板）/ 与破绽各算各的（穿 2 + 破绽 4 = 6）/ 裂石门禁 6 触发与 5 不触发 / 与柏青叠 6 / 每招一次（规则单测）。

---

## P2 接力 0.5 摘黄转正

**落码文件：** `src/game/climbCaps.ts`（`CLIMB_RELAY_SEG_MUL=0.5` 注释摘「黄」，写「2026-11-14 用户拍定转正」）；`docs/combat/RULES.md` 骨架表补接力行（馆 2 起第二人及以后意图段 ×0.5、向下取整、保底 1，不改敌血敌伤）。

数值不动，机制核五班落的结算不变。测试一条常量断言（=0.5）。

---

## P3 环境投放表（灼烧 3/6/8、无墙 5/9；缺格不投）

**落码文件：**
- `src/game/content/envSchedule.ts`（新）：`CLIMB_ENV_SCHEDULE = {3:burn, 5:nowall, 6:burn, 8:burn, 9:nowall}` + `envTagForHall(stage)`。注释写明缺格不投的原因：结算未接（`rules/envTags.ts` 的 `gapFieldFor` 返空），投放空标签等于骗玩家。
- `src/game/climbCaps.ts`：`CLIMB_BURN_DMG=4` 注释去「占位」，改「投放拍定，数值维持」。
- `docs/combat/RULES.md` 骨架表补环境投放行。

**挂账（回主窗）：** 生产侧没有任何代码写 `run.envTag`——表已落 content，需要壳层 / 遭遇窗接 `envTagForHall`（`ladderEnvTag` 一行委托 + 组局桥），本班不动壳层。夜校 `scripts/climbSim/flags.ts` 的临时表（灼 3/6、无墙 8）与拍板不一致，需夜校同步。

---

## P3.5 毒注释修复

`src/game/climbCaps.ts` 毒三常量注释由「道具表已登记，结算不读」改为「这里是黑市标价；附毒层与回合结束结算在 `poison.ts`」。毒结算 = `poison.ts` 的 `grantPoisonItem` / `poisonOnHit` / `tickPoison`，注释此前过时。

---

## P4 深息清裂创 = A 分支（清我方）—— 30 确认

**30 走了 A 分支，确认。** `b.bleed`（敌方裂创）→ `b.youBleed`（我方裂创），仅 mend2 分支两行；`mend`（吐纳）无 `clearBleed`，不受影响。统筹 B 类挂账（SYNC 回主窗那条「深息清哪边」）就此销账。

**落码文件：**
- `src/game/sim.ts`：mend2 分支两行（第二处触碰，任务卡指定）。
- `src/game/sim.test.ts`：该条测试改设 `youBleed=4 / bleed=3`，断言我方清、敌方不动、回 8；标题改准（原题「lets 深息 stop your 裂创」却在设 `b.bleed`，误导）。
- `src/combatLab/uniqueCards.test.ts`：同语义一条同步（设 `youBleed=3`、断言 `youBleed=0`；标题「吐纳」改「深息」——测的就是 mend2）。
- `docs/combat/RULES.md`：补「裂创自疗」行。

**黄金对局处置：** `goldenReplay.test.ts` 2/2 绿，**黄金无变化，未重录**。基线三处 play:mend2 事件双方裂创均为 0，A 分支不改变任何一拍。P1/P5 新件不在黄金配装，环境表未接生产，均不影响基线。

---

## P5 反应窗流四件（听劲 / 抢半招 / 明镜 / 醒神丸）

**落码文件：**
- `src/game/reactionWindows.ts`：`windowFightCap`（基础帽 2 + `windowCapBonus` + 明镜心法）、`windowPayoffMul`（抢半招 ×1.5，平直判定不吃档位）落到四个伤害窗（截拳 / 断息 / 弹反回敬 / 透棍真伤；回马 / 偷势 / 瘸跛无伤害不放大）、`windowThinkBonusSec`（听劲 +2 秒，引擎登记，**表现壳 `bindReact.ts` 读这个数，本班不动壳**）。
- `src/game/mindArts.ts` + `content/mindArts.ts`：明镜心法（每场窗帽 +1），`windowCap` 字段透传。
- `src/game/labV21.ts` + `labV21Constants.ts`：醒神丸分支（`windowCapBonus +1`、journal「醒神丸：本馆反应窗多 1 次」）+ LABEL/TIP（毒三件没加标签是已知坑，醒神丸不蹈）。
- `src/game/content/items.ts`（values 引 caps，text 带数字过 requireDigit）、`src/game/rules/gauntletModel.ts`（`ALL_ITEMS` +醒神丸，黑市 item 槽与奖励池自动接）、`content/legacy.ts` + `techniques.ts` + `hooks.ts`（听劲 / 抢半招 + `windowTime`/`windowDamage`/`windowCap`/`pierceBlock` 钩子）。
- `src/game/climbCaps.ts`：`CLIMB_WINDOW_THINK_BONUS=2`、`CLIMB_WINDOW_PAYOFF_BONUS=0.5`、`CLIMB_WINDOW_CAP_BONUS=1`。
- `src/combatLab/autoLoadouts.ts`：听劲进 t4 映月穿潮 scribe 池、抢半招进 t1 四门排山 bard 池。
- `src/game/contentValidation.test.ts`：物品数 9→10 + 醒神丸断言。

**汇率账：**
- 听劲 +2 秒 = 操作层，无汇率口径；代价 = 一个外功槽。
- 抢半招 +50%：截拳基准 5 → +2.5 伤/窗；断息按预回复量 +50%；弹反回敬 +raw×0.25；透棍真伤 +50%。每场帽 2 → 约多 5–8 伤当量/场 ≈ 1–1.6 劲/场。窗的功能腿（打断 / 控制）不放大。判定：数值腿偏细，身份在「窗流」组合拳——维持拍定，偏弱只动价格与获取口。
- 明镜帽 +1 = 每场多一窗 ≈ 截拳 10+ 当量（2 劲蓝 + 打断 + 5 伤）。心法槽换每场一扇。符合铁律「数量封顶、改造打开」（窗种不加，帽可构筑抬）。
- 醒神丸帽 +1 一次性：对标袖箭（8 伤无视挡）同档黑市位；颗数制 2 颗。
- **整套（2 外功 + 1 心法 + 道具）：帽 2→4、每窗 +50% 伤、思考 +2 秒 = 「反应窗流」构筑身份。** 整套强是设计意图（专精厚）；单件都压在通用件口径内。

---

## 闸门与纪律自查

| 闸 | 结果 |
|---|---|
| `npm run test:combat` | **98 文件 / 985 绿**（含新文件 `guardBreak.test.ts` 13 则） |
| `npm run typecheck:combat` | exit 0 |
| 黄金对局 | 2/2 绿，**无变化，未重录** |
| `npm run lint:prose` | script 不存在；新文案（破甲 / 裂石 / 听劲 / 抢半招 / 明镜 / 醒神丸）人工过铁律 §4：白描 + 数字，无禁词、无反转、无后半句否定撑场 |
| commit / 开页面 | 未 commit，未开页面 |

**sim.ts 触碰清单（全任务卡授权）：** ①mend2 分支两行（P4 指定）；②`hitEnemy` 通用破挡钩（任务卡开场词：「破挡牌结算若需新钩子，在既有通用牌结算分支加」）——裂石一行调用插在裂甲分支前 + 挡吃伤行改穿挡，纯插入式，无其他逻辑改动。

**执行层取舍（可固化）：**
1. 破甲实现为「逐击绕过、挡不碎」，与裂石「碎挡」区分开：穿 = 每次攻击绕过 2 点，碎 = 一次性削掉。note 只报真实穿过的伤（小攻击打大挡不谎报）。
2. 裂石 / 听劲 / 抢半招全部 `techniques.includes` 平直判定，不走 `techBonus` 档位放大（柏青裂甲同为平直 3）——加量违「通用薄」纪律。
3. 连击重放不触发裂石：`resolvingCard` 只在 playCard 的 applyCard 期间设置，重放共用同一结算键，一牌一次，符合「每招一次」。
4. 新内容入池零额外接线：外功经 techPool、心法经 rewardRoll、道具经 ALL_ITEMS + 黑市槽，加表即入池——唯一手工处是一键配装覆盖断言（§27.4）要求的三坑位。
