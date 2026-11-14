# 夜校八班报告 · 2026-11-02

种子 20261023 · 旋钮 1.0（汇率1 敌血1 敌伤1 我伤1 回劲1） · 对局9（BOARD_SIZE 7 / CLIMB_BOARD_SIZE 9） · 卡池 131张/费和228。每格 20 局，单馆，刀配装。src 结算未改，旋钮默认未改。

门：docs/combat/MECH5_REPORT_20261102.md 齐且绿。

## P1 换人带牌

换上来的人用自己的兵器档：白孟和拳、霍长川枪。起手是该系基础卡，同档精/绝从当铺池按种子抽，开战后再塞进后场抽堆。

## P2 僵局策略

敌挡 >10，或连续 3 手敌血没掉：这一手收势。连收 2 手攒劲，下一手优先打费高的攻击。六班换人冷却照旧。

## P3 成长档散点

血档 / 牌组档 / 三人血池沿用七班。馆 1 只有刀主。馆 2 起满编。馆 4、馆 9 标「对龟」。接力减半跟 MECH5 结算，本班不改 src。

| 馆 | 标记 | 敌 | 血 | 人数 | 档 | 刀注入 | 同伴注入 | 胜率 | 目标 | 到否 | 场均手 | 敌伤 | 我伤 | 血池消耗比 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | — | 剪径 | 60 | 1 | 1 | — | 白 — / 霍 — | 100.0% | ≥50% | 到 | 6.0 | 33.0 | 111.0 | 0.550 |
| 2 | — | 坡蹲 | 60 | 3 | 1 | — | 白 — / 霍 — | 0.0% | ≥50% | 未到 | 19.0 | 172.0 | 147.0 | 0.956 |
| 3 | — | 蓄势路匪 | 90 | 3 | 2 | expose expose | 白 palmSeal push / 霍 bleedcut expose | 0.0% | ≥50% | 未到 | 17.0 | 254.0 | 129.0 | 0.941 |
| 4 | 对龟 | 伏草客 | 90 | 3 | 2 | saberBleed expose | 白 bleedcut expose / 霍 spearLock expose | 0.0% | ≥30% | 未到 | 11.0 | 256.0 | 159.0 | 0.948 |
| 5 | — | 截镖 | 90 | 3 | 2 | expose saberBleed expose bleedcut | 白 palmSeal palmSeal palmSeal palmSeal / 霍 expose spearLock expose bleedcut | 0.0% | ≥30% | 未到 | 40.0 | 47.0 | 156.0 | 0.174 |
| 6 | — | 裂旗劫手 | 90 | 3 | 2 | statusSaber2 saberBleed saberBleed expose | 白 bleedcut push push palmSeal / 霍 expose spearLock spearLock expose | 0.0% | ≥30% | 未到 | 8.0 | 176.0 | 138.0 | 0.652 |
| 7 | — | 同道再聚 | 140 | 3 | 3 | statusSaber2 statusSaber2 bleedcut expose ultSaber ultSaber | 白 bleedcut palmSeal palmSeal push ultPalm ultPalm / 霍 spearLock spearLock bleedcut expose ultSpear ultSpear | 95.0% | ≥15% | 到 | 26.6 | 175.7 | 459.3 | 0.418 |
| 8 | — | 岸匪 | 140 | 3 | 3 | bleedcut statusSaber2 bleedcut saberBleed ultSaber ultSaber | 白 expose bleedcut palmSeal bleedcut ultPalm ultPalm / 霍 bleedcut expose bleedcut spearLock ultSpear ultSpear | 0.0% | ≥15% | 未到 | 9.0 | 387.0 | 34.0 | 0.921 |
| 9 | 对龟 | 水匪哨 | 140 | 3 | 3 | expose saberBleed saberBleed saberBleed ultSaber ultSaber | 白 bleedcut palmSeal expose palmSeal ultPalm ultPalm / 霍 expose spearLock spearLock spearLock ultSpear ultSpear | 0.0% | ≥15% | 未到 | 40.0 | 41.0 | 0.0 | 0.098 |
| 10 | — | 夺玺者 | 140 | 3 | 3 | saberBleed bleedcut statusSaber2 expose ultSaber ultSaber ultSaber | 白 palmSeal bleedcut push palmSeal ultPalm ultPalm ultPalm / 霍 spearLock bleedcut expose expose ultSpear ultSpear ultSpear | 0.0% | 不设 | — | 40.0 | 0.0 | 0.0 | 0.000 |

### 对龟

馆 4 对龟（伏草客）：胜率 0.0%，场均手 11.0，敌伤 256.0，我伤 159.0，血池消耗比 0.948。
馆 9 对龟（水匪哨）：胜率 0.0%，场均手 40.0，敌伤 41.0，我伤 0.0，血池消耗比 0.098。

馆 1–10 换人合计 982。

## P4 敌窗

馆段全到才算到：馆 1–3 都 ≥50%，馆 4–6 都 ≥30%，馆 7–9 都 ≥15%。到的段和馆 6–10 重叠的才测。开窗给馆 ≥6 挂拆招 / 缠手 / 读破。关窗是 foeWindowP = 0，不进旋钮默认。

到的馆段：无。

馆 6–10 没有落在已到的馆段里。敌窗没测。

未 commit。
