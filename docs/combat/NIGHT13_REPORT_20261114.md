# 夜校十三班报告 · 2026-11-14

种子 20261023 · 旋钮 1.0（汇率1 敌血1 敌伤1 我伤1 回劲1） · 对局9（BOARD_SIZE 7 / CLIMB_BOARD_SIZE 9） · 卡池 131张/费和228。散点每格 20 局。src 结算未改。

## P1 洗牌与开手套件

真局 `startLabBattle` 调 `makeBattle(..., ordered=false)`：`deal` / 回收 / 爬塔重建抽堆都走 `shuffle`，用 `battleRng`。夜校此前 `makeBattle` 默认 `ordered=true`，开手不洗，注入牌贴在抽堆末。本班开战 `ordered=false`，注入后再用同一种子洗抽堆（含后场）。

`applyEliteKit` 改走 `commitFoeKit`（站位之后），龟/游走开手吃变体池 + 保底逼近。不改 src。

## P2 注入前移

馆 1 仍 0 精。馆 2 = 档 1 + 1 精。馆 3–4 = 档 2 + 2 精。后续不变。

| 馆 | 档 | 精 | 绝 | 注入 |
|---|---|---|---|---|
| 1 | 1 | 0 | 0 | — |
| 2 | 1 | 1 | 0 | expose |
| 3 | 2 | 2 | 0 | expose expose |
| 4 | 2 | 2 | 0 | saberBleed expose |
| 6 | 2 | 4 | 0 | statusSaber2 saberBleed saberBleed expose |
| 8 | 3 | 4 | 2 | bleedcut statusSaber2 bleedcut saberBleed ultSaber ultSaber |
| 10 | 3 | 4 | 3 | saberBleed bleedcut statusSaber2 expose ultSaber ultSaber ultSaber |

## P3 锯齿散点

馆 1 先验敌伤 21.6，伤系 0.3 已进。目标：1–2 ≥60%，3 ≥30%，4 ≥50%，5 ≥40%，6 ≥35%，7 ≥20%，8 ≥35%，9 ≥25%，10 ≥10%。

| 馆 | 敌 | 伤系 | 梯伤 | 血 | 人数 | 档 | 注入 | 胜率 | 目标 | 到否 | 场均手 | 敌伤 | 我伤 | 血池消耗比 | 敌伤每手 | 变体 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 剪径 | 0.3 | 1.18 | 60 | 1 | 1 | — | 90.0% | ≥60% | 到 | 9.8 | 21.6 | 122.2 | 0.361 | 2.21 | 无×20 |
| 2 | 坡蹲 | 0.3 | 1.32 | 60 | 3 | 1 | expose | 30.0% | ≥60% | 未到 | 28.3 | 155.9 | 179.9 | 0.866 | 5.52 | 无×20 |
| 3 | 蓄势路匪 | 0.3 | 1.5 | 90 | 3 | 2 | expose expose | 45.0% | ≥30% | 到 | 29.6 | 232.4 | 246.5 | 0.861 | 7.85 | 无×20 |
| 4 | 伏草客 | 0.7 | 1.7 | 90 | 3 | 2 | saberBleed expose | 5.0% | ≥50% | 未到 | 20.3 | 254.8 | 243.1 | 0.944 | 12.55 | 无×20 |
| 5 | 截镖 | 0.7 | 1.9 | 90 | 3 | 2 | expose saberBleed expose bleedcut | 80.0% | ≥40% | 到 | 29.7 | 128.2 | 433.1 | 0.475 | 4.32 | 无×20 |
| 6 | 裂旗劫手 | 0.7 | 2.1 | 90 | 3 | 2 | statusSaber2 saberBleed saberBleed expose | 0.0% | ≥35% | 未到 | 16.7 | 224.8 | 154.7 | 0.833 | 13.46 | mob_escortBand_02:turtle-shell×20 |
| 7 | 同道再聚 | 1 | 2.4 | 140 | 3 | 3 | statusSaber2 statusSaber2 bleedcut expose ultSaber ultSaber | 70.0% | ≥20% | 到 | 19.6 | 250.2 | 473.0 | 0.596 | 12.76 | mob_escortBand_03:turtle-shell×20 |
| 8 | 岸匪 | 1 | 2.2 | 140 | 3 | 3 | bleedcut statusSaber2 bleedcut saberBleed ultSaber ultSaber | 5.0% | ≥35% | 未到 | 19.5 | 368.6 | 405.8 | 0.878 | 18.91 | mob_escortBand_04:turtle-shell×20 |
| 9 | 水匪哨 | 1 | 2.4 | 140 | 3 | 3 | expose saberBleed saberBleed saberBleed ultSaber ultSaber | 0.0% | ≥25% | 未到 | 29.9 | 369.9 | 352.8 | 0.881 | 12.39 | mob_escortBand_05:turtle-shell×20 |
| 10 | 夺玺者 | 1 | 2.6 | 140 | 3 | 3 | saberBleed bleedcut statusSaber2 expose ultSaber ultSaber ultSaber | 0.0% | ≥10% | 未到 | 30.4 | 332.3 | 720.9 | 0.791 | 10.93 | usurper:turtle-shell×20 |

## P3 馆 9 复测

水匪哨 · mob_escortBand_05:turtle-shell · 胜 0/3 · 超时0伤 0/3 · 场均手 35.3 · 我伤 328.7 · 最近 0.7 · 弃远攻 18.7 · 开手进势手合计 57

- 局1 胜=否 手38 我伤258 最近0 弃12 开手队列 advance3→strike8→guard6→breathe→guard8→retreat1→breathe
- 局2 胜=否 手33 我伤313 最近1 弃11 开手队列 advance3→strike8→guard6→breathe→guard8→retreat1→breathe
- 局3 胜=否 手35 我伤415 最近1 弃33 开手队列 advance3→strike8→guard6→breathe→guard8→retreat1→breathe

## P3 破挡伤占比

裂创跳血 + 毒跳血 + 破绽穿挡，除以总我伤。馆 5 散点无精英变体；馆 9 散点盖 foeRound，多为龟谱。

| 馆 | 敌 | 变体 | 龟局 | 总我伤 | 裂创 | 毒 | 穿挡 | 破挡占比 |
|---|---|---|---|---|---|---|---|---|
| 5 | 截镖 | 无 | 0/20 | 8663 | 1202 | 0 | 0 | 0.139 |
| 9 | 水匪哨 | mob_escortBand_05:turtle-shell | 20/20 | 7056 | 934 | 0 | 0 | 0.132 |

## P3 敌窗 6–10

散点到的馆：1、3、5、7。

| 馆 | 开胜率 | 关胜率 | 胜差 | 开手数 | 关手数 | 开敌伤 | 关敌伤 | 开我伤 | 关我伤 | 开拆/缠/读 | 关拆/缠/读 | 开挂窗 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 6 | 0.0% | 0.0% | 0.0 | 17.9 | 16.3 | 233.9 | 226.1 | 180.8 | 139.9 | 11/3/5 | 0/0/0 | 20/20 |
| 7 | 70.0% | 85.0% | -15.0 | 21.7 | 20.8 | 298.4 | 261.2 | 472.4 | 506.3 | 11/7/2 | 0/0/0 | 20/20 |
| 8 | 0.0% | 5.0% | -5.0 | 16.2 | 19.3 | 363.6 | 358.6 | 343.7 | 412.9 | 14/3/3 | 0/0/0 | 20/20 |
| 9 | 0.0% | 0.0% | 0.0 | 27.6 | 29.6 | 352.8 | 363.1 | 325.2 | 355.2 | 12/6/2 | 0/0/0 | 20/20 |
| 10 | 0.0% | 5.0% | -5.0 | 33.8 | 33.4 | 341.9 | 323.4 | 828.4 | 813.1 | 29/3/8 | 0/0/0 | 20/20 |

未 commit。
