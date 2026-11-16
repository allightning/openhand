# 机制核 · 2026-11-16 九班：深水区四拍之三（缩放 + 换牌 + 裂创帽）

## 开场词

机制核。先读 `.cursor/lanes/SYNC.md`、`.cursor/rules/combat-ironclad.mdc`、`.cursor/rules/combat-fact-discipline.mdc`、`docs/combat/RULES.md`（2026-11-16 深水区四拍条 = 真源，已先行）、`docs/combat/NUMGEN15_REPORT_20261116.md`（A 案实施清单与坡蹲裂创账）。`sim.ts` 你独占；可动 `src/game/**` 与测试。不 commit、不开页面、不碰冻结区与读招内核。

## P1 套件牌缩放 A 案（用户拍「开工」）

按 NUMGEN15 清单落：
1. `commitFoeKit`（`sim.ts:4879` 一带）：`kit.cards` 的意图先过 `scaleIntent` 再写入 `b.intents`。
2. `watchStanceShift`（`sim.ts:343` 一带）：换谱后的队列同样过 `scaleIntent`。
3. 两处乘完都走 `applyTurnDamageGovernor`，与 `planFromFirst` 对齐。
4. **裂创层数不乘**；`scaleIntent` 不补 `pestle`（莽谱杵维持裸面，报备）。
5. 测试：`fightScale.dmg ≠ 1` 时 `commitFoeKit` 直伤变、`bleed` 层不变；换势队列同理。

## P2 馆 ≤2 不见刀创（用户拍「换牌」）

NUMGEN15 P2：坡蹲裂创源 = 贴身后续段刀创（2 层）+ 距 1 且回合数 % 3 的跟手刀创（3 层）。两处都要改：`followFromKit` 与 `reactToPlayer`（`sim.ts:4499` 一带与 `enemyKit.ts:354` 一带）在馆 ≤2 不许出刀创，后续段改回打击，跟手也不许换刀创。馆 ≥3 不动。测试：馆 2 整局 `youBleed` 恒 0；馆 3 裂创照出。

## P3 敌我裂创同帽 6（用户拍「统一 6」）

`sim.ts:4188` 一带写死的 9 改读 `CLIMB_BLEED_CAP`（敌我同帽 6）。测试：敌叠层到 6 停。

## 验收

- `npm run test:combat` + `npm run typecheck:combat` 双闸（基线 101 文件 / 1001 绿）。
- 黄金若红按纪律重录 + 原因清单（A 案动换势那一手的段伤，预期少数爬塔场可能变；P2/P3 动馆 2 与裂创，逐场写清）。
- 注意：A 案接完**系数 1.0 基线变重是预期**（池面裸数字洗进系数体系），不是回归——回拧系数是数值核下一班（NUMGEN16）的活，你不做。
- SYNC 机制核节更新。

## 报告

`docs/combat/MECH9_REPORT_20261116.md`：三 P 各落了什么、测试数、黄金处置、给 NUMGEN16 的回话（哪些馆换势手变重了、量级多少）。
