# 夜校对照 · 已拍机制覆盖（2026-11-02）

盘点对象：铁律 + `docs/combat` 已拍条文。代码只读 `src/game` / `src/combatLab` 的 **export**。旋钮默认未改。夜校二班脚本已进 `4b455ea` 之后才加本表。

数据源：`scripts/climbSim/coverage.ts`。

口径：

- **有导出** = 结算能 import 到同名函数或表行，机制主语已进代码。
- **部分导出** = 有函数，但主语不是已拍那一层（桩 ≠ 桩师职业；兵器档 ≠ 武器谱）。
- **只在文档** = 搜不到对应 export（`professions.ts` / `affinityBonds.ts` / `weaponKit.ts` 都还没有）。

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
| 职业 · 桩师 | 铁律：落桩挡路 → 进阶裂桩爆炸；ROLE_TASK | 部分导出 | `addStake`、`smashStake`、`interceptStakePos`、`climbSplitBlast` 常量 `CLIMB_STAKE_BLAST_DMG` | 现有是棍场地桩，不是职业身份。无 professions.ts，无进阶主动「本场可爆」。party 里「桩师」是沈夯头衔。 |
| 职业 · 相士 | ROLE_TASK：开战风声；每程 1 次记亮招；主动看破还原虚招 | 只在文档 | — | 无导出。seer 是同伴 id（镜亭 / 观气客），不是职业技能。 |
| 职业 · 赌徒 | ROLE_TASK：回合开始加注近乎对半；主动出千必正 | 只在文档 | — | 无导出。wagerRules 是馆间赌馆，不是职业加注。 |
| 缘分 | BONDS：8 对 / 6 群像 / 2 旧怨；初识→同路→生死；连携改生成物 | 只在文档 | — | 无 affinityBonds.ts。foeArchetype.bondSlot 固定返回 null。storyBeats 只有文案 BOND_STAGE_LINES。 |
| 换武器 | WEAPON_PROFICIENCY：仅馆间；弹出不符卡；基础卡 6 张保底 | 部分导出 | `battleEquippedSchool`、`initBattleMateWeapons`、`canMateEquipGear`、`gearIdsForMateSchools` | 现口是同伴主/副系兵器档，不是 18 人武器谱、不是馆间换装弹卡。无 weaponKit.ts。 |
| 亮招 | 过招 L3 / 页 9：stanceRevealN 按段解锁；情报可买前几段 | 部分导出 | `noteSegmentRead`、`publishStance`、`buildStanceBoard`、`renderRevealRow` | 结算只在段开始把 stanceRevealN 推到当前段。没有「买亮招档」的导出。夜校 intentScore 读剩余 intents，不读 stanceRevealN。 |
| 虚招 | 页 9：标签假、出手才真；完全同形；虚段不触发反应窗 | 部分导出 | `segmentFeint`、`buildStanceBoard（feint[]）`、`matchWindow（tick.feint → null）` | feintMask 开战从配牌抄上。没有「亮虚招情报 / 看破还原」导出。相士看破未落。 |

## 夜校能接什么

现在 `scripts/climbSim` 已经 import 得到的：`answerReaction`、`matchWindow` 链路上的窗、`holdReaction`、架势板字段、`feintMask`。还接不上的：职业三件、缘分、馆间换武器、买亮招、看破虚招。角色核 `ROLE_TASK` 落码后，对照表这五行才会从「只在文档 / 部分导出」挪走。

未改 `src/**`。未改旋钮默认。未 commit。
