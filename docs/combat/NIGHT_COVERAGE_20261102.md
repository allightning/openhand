# 夜校对照 · 已拍机制覆盖（2026-11-02）

盘点对象：铁律 + `docs/combat` 已拍条文。代码只读 `src/game` / `src/combatLab` 的 **export**。旋钮默认未改。角色核 `ROLE_REPORT_20261102.md` 已落后重核。

数据源：`scripts/climbSim/coverage.ts`。

口径：

- **有导出** = 结算能 import 到同名函数或表行，机制主语已进代码。
- **部分导出** = 有函数，但只接了已拍的一部分（缘分四条初识；亮招没有买档）。
- **只在文档** = 搜不到对应 export。

## 对照表

| 机制 | 规格 | 覆盖 | 导出函数 | 缺口 |
|---|---|---|---|---|
| 反应窗 · 回马枪 | REACTION_WINDOWS / RULES；血<50% + 背墙，拒 3 格 | 有导出 | `WINDOWS（spearReverse）`、`matchWindow`、`openWindow`、`takeWindow`、`answerReaction`、`openSpearReverseWindow`、`takeSpearReverse` | 新参走 takeWindow。openSpearReverseWindow / takeSpearReverse 是旧口（停 2 格）。holdReaction 才暂停。 |
| 反应窗 · 截拳 | REACTION_WINDOWS；敌蓄力 + 距 ≤2 | 有导出 | `WINDOWS（palmCut）`、`matchWindow`、`openWindow`、`takeWindow` | 表已有行。夜校策略不按窗种估值，只看 leftover×8 + 冲锋伤。 |
| 反应窗 · 断息 | REACTION_WINDOWS；敌回复 / 回蓝 | 有导出 | `WINDOWS（dartBreath）`、`matchWindow`、`openWindow`、`takeWindow` | 同截拳。飞刀未进武器轴时夜校摸到代表牌也打不出，窗对照更空。 |
| 反应窗 · 弹反 | REACTION_WINDOWS；贴脸第 3 段 | 有导出 | `WINDOWS（saberParry）`、`matchWindow`、`openWindow`、`takeWindow` | 同截拳。 |
| 反应窗 · 偷势 | REACTION_WINDOWS；射程内叠层系、我尚未叠层 | 有导出 | `WINDOWS（swordSteal）`、`matchWindow`、`openWindow`、`takeWindow` | 同截拳。 |
| 反应窗 · 瘸跛 | REACTION_WINDOWS；敌从 ≤2 格外撤 | 有导出 | `WINDOWS（hookLimp）`、`matchWindow`、`openWindow`、`takeWindow` | 同截拳。瘸跛+缴械吸血档未单独导出。 |
| 反应窗 · 透棍 | REACTION_WINDOWS；敌已有挡再加挡 | 有导出 | `WINDOWS（staffPierce）`、`matchWindow`、`openWindow`、`takeWindow` | 同截拳。 |
| 反应窗 · 敌方三件 | 拆招 / 缠手 / 读破；精英 6 馆起或座前，教头 | 部分导出 | `noteFoeWindow`、`buildFoeKit（coach 才挂 foeWindows）` | 挂在教头原型。玩家侧没有对等的导出策略。 |
| 职业 · 桩师 | 铁律：落桩挡路 → 进阶裂桩爆炸；ROLE_TASK | 有导出 | `fieldProfession`、`advanceProfession`、`addStake`、`smashStake` | `run.professions` 不写就没有职业。进阶后走原裂桩爆炸。沈夯头衔仍叫桩师，和职业 id `staker` 不是同一层。 |
| 职业 · 相士 | ROLE_TASK：开战风声；每程 1 次记亮招；主动看破还原虚招 | 有导出 | `openRumor`、`markEnemyOpen`、`seeThrough`、`advanceProfession` | 同伴 id `seer`（镜亭）不是职业。职业挂 `run.professions[场上] = diviner`。 |
| 职业 · 赌徒 | ROLE_TASK：回合开始加注近乎对半；主动出千必正 | 有导出 | `rollWager`、`cheatWager`、`advanceProfession` | 馆间赌馆仍走 `wagerRules`，和职业加注不是同一口。 |
| 缘分 | BONDS：8 对 / 6 群像 / 2 旧怨；初识→同路→生死；连携改生成物 | 部分导出 | `PAIR_BONDS`、`GROUP_BONDS`、`GRUDGE_BONDS`、`acquaintHeal`、`grudgeQi`、`bleedCapBonus`、`bleedStackBonus`、`fuseForSwap` | 温补 / 医杀 / 夜霜 / 刀社已进结算。其余初识在表上，ROLE2 才逐条接线。`bondSlot` 仍返回 null。 |
| 换武器 | WEAPON_PROFICIENCY：仅馆间；弹出不符卡；基础卡 6 张保底 | 有导出 | `swapHallWeapon`、`WEAPON_SPECTRUM`、`BASIC_KIT`、`canWear`、`spectrumOf` | 战斗中 `fighting=true` 拒绝。旧口 `battleEquippedSchool` 仍是兵器档。 |
| 亮招 | 过招 L3 / 页 9：stanceRevealN 按段解锁；情报可买前几段 | 部分导出 | `noteSegmentRead`、`publishStance`、`buildStanceBoard`、`markEnemyOpen`、`renderRevealRow` | 相士 `markEnemyOpen` 可把整手写成亮招。没有黑市「买亮招档」导出。 |
| 虚招 | 页 9：标签假、出手才真；完全同形；虚段不触发反应窗 | 部分导出 | `segmentFeint`、`buildStanceBoard（feint[]）`、`matchWindow（tick.feint → null）`、`seeThrough` | `feintMask` 开战从配牌抄。相士进阶后 `seeThrough` 开 `feintOpen`，当手虚招不再挡窗。 |

## 夜校能接什么

现在能 import：七窗、`advanceProfession` / `markEnemyOpen` / `seeThrough` / `rollWager`、缘分四条初识、`swapHallWeapon`。还接不上：其余八条缘分初识（等 ROLE2）、毒三档结算（等 ROLE2 P3）、黑市买亮招档。

未改 `src/**`。未改旋钮默认。未 commit。
