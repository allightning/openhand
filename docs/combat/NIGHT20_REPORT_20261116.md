# 夜校二十班报告 · 2026-11-16

种子 20261023 · 旋钮 1.0（汇率1 敌血1 敌伤1 我伤1 回劲1） · 对局9（BOARD_SIZE 7 / CLIMB_BOARD_SIZE 9） · 131张/费和228。入口 `npm run sim:climb:night20`。src 未改。血和兵器档仍读 `hpOf` / `growthOf`。

## P1 注入口径

旧尺是 `injectForSchool`：按 `growthOf` 抽精 / 绝，三人都注。产品尺只注刀的场上人。

换算：打完第 k 馆，免费奖励按任务口径抽未持有的凡 2 + 精 1（池 = `breakRewardCardPool`，档位用当时的 `stage = k+1`）。同名不重抽。配方 `climbRecipeFromPiles` 把每个 id 乘 3，所以注一次就是 3 张，再注同名不加量。

代码里的免费领取不是这个结构：`gauntletRewardTakeCount` 在期末前一馆之前领 2 张，之后领 3 张（`rewardRules.ts`）。这里按任务的凡 2 + 精 1，不按那个领取数。

绝牌：`rewardGate` 在 `fought >= 7` 才开，也就是馆 8 开打前。馆 7 的对局不注绝。只注 1 张未持有的绝。

黑市：每馆彩金 `climbHallPot`，保守花一半。先买未持有的凡（8），再买精（18），不买第二张绝。买的也是当时奖励池里的牌。免费从馆 5 起不再增加，池里未持有的凡、精已经抽完，半彩一列因此是 0。表上的「剩」是花不出去的半彩。岸匪这条路的黑市默认不摆（`marketRules.ts` 在 bandit 且未开市时直接返回当铺），当铺也只从同一池抽 1 张。

| 馆 | 旧尺张 | 旧尺 | 免费 | 免费牌 | 半彩 | 半彩牌 | 绝 | 累计彩金 | 剩 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | — | 0 | — | 0 | — | — | 0 | 0 |
| 2 | 1 | expose | 3 | brace stepSaber saberBleed | 0 | — | — | 8 | 4 |
| 3 | 1 | expose | 6 | brace stepSaber saberBleed rift statusSaber bleedcut | 0 | — | — | 17 | 8 |
| 4 | 2 | saberBleed expose | 7 | brace stepSaber saberBleed rift statusSaber bleedcut expose | 0 | — | — | 27 | 13 |
| 5 | 3 | expose saberBleed bleedcut | 10 | brace stepSaber saberBleed rift statusSaber bleedcut expose advance2 sidestep statusSaber2 | 0 | — | — | 39 | 19 |
| 6 | 3 | statusSaber2 saberBleed expose | 10 | brace stepSaber saberBleed rift statusSaber bleedcut expose advance2 sidestep statusSaber2 | 0 | — | — | 53 | 26 |
| 7 | 4 | statusSaber2 bleedcut expose ultSaber | 10 | brace stepSaber saberBleed rift statusSaber bleedcut expose advance2 sidestep statusSaber2 | 0 | — | — | 69 | 34 |
| 8 | 4 | bleedcut statusSaber2 saberBleed ultSaber | 10 | brace stepSaber saberBleed rift statusSaber bleedcut expose advance2 sidestep statusSaber2 | 0 | — | ultSaber | 87 | 43 |
| 9 | 3 | expose saberBleed ultSaber | 10 | brace stepSaber saberBleed rift statusSaber bleedcut expose advance2 sidestep statusSaber2 | 0 | — | ultSaber | 107 | 53 |
| 10 | 5 | saberBleed bleedcut statusSaber2 expose ultSaber | 10 | brace stepSaber saberBleed rift statusSaber bleedcut expose advance2 sidestep statusSaber2 | 0 | — | ultSaber | 129 | 64 |

## P2 产品尺复测

各 20 局。盐 = 兵器档 + 3。敌总血 = 开局主敌 `maxHp` + 波次 `climbWaveBattleHp`。我伤÷敌总血用场均我伤。

| 馆 | 敌 | 产品尺 | 旧尺 | 线 | 到否 | 场均手 | 敌伤 | 我伤 | 敌总血 | 我伤÷敌总血 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 剪径 | 90.0% | 90.0% | ≥60% | 到 | 9.8 | 21.6 | 122.2 | 111.0 | 1.10 |
| 2 | 坡蹲 | 75.0% | 42.5% | ≥60% | 到 | 23.2 | 128.4 | 244.7 | 242.0 | 1.01 |
| 3 | 蓄势路匪 | 70.0% | 45.0% | ≥30% | 到 | 27.8 | 196.3 | 266.8 | 280.0 | 0.95 |
| 4 | 伏草客 | 45.0% | 50.0% | ≥50% | 未到 | 24.1 | 345.0 | 335.4 | 392.0 | 0.86 |
| 5 | 截镖 | 65.0% | 60.0% | ≥40% | 到 | 32.5 | 202.9 | 384.6 | 451.0 | 0.85 |
| 6 | 裂旗劫手 | 35.0% | 10.0% | ≥35% | 到 | 20.8 | 363.6 | 321.1 | 404.0 | 0.79 |
| 7 | 同道再聚 | 70.0% | 80.0% | ≥20% | 到 | 23.9 | 263.9 | 485.4 | 508.0 | 0.96 |
| 8 | 岸匪 | 0.0% | 10.0% | ≥35% | 未到 | 18.8 | 374.8 | 369.0 | 780.0 | 0.47 |
| 9 | 水匪哨 | 0.0% | 0.0% | ≥25% | 未到 | 29.3 | 373.4 | 404.1 | 921.0 | 0.44 |
| 10 | 夺玺者 | 5.0% | 0.0% | ≥10% | 未到 | 27.3 | 368.7 | 545.0 | 1300.0 | 0.42 |

数字说了什么：产品尺到线 1、2、3、5、6、7。尺子抬过线的馆：2、6。仍未到的是真墙候选：4、8、9、10。20 局，种子 20261023，疑似。旧尺列是十八班同盐读数，馆 2 那格是 40 局。

## P3 未到线

缺口 = 敌总血 − 场均我伤。伤源只写十九班拆过的馆，其余写未验。不出方案。

| 馆 | 敌 | 敌总血 | 主敌 | 波次 | 我伤 | 缺口 | 伤源 |
|---|---|---|---|---|---|---|---|
| 4 | 伏草客 | 392.0 | 196.0 | 196.0 | 335.4 | 56.6 | 未验 |
| 8 | 岸匪 | 780.0 | 277.0 | 503.0 | 369.0 | 411.0 | 直伤 |
| 9 | 水匪哨 | 921.0 | 307.0 | 614.0 | 404.1 | 516.9 | 直伤 |
| 10 | 夺玺者 | 1300.0 | 460.0 | 840.0 | 545.0 | 755.0 | 直伤 |

未 commit。
