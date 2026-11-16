# 统筹收口报告 · 2026-11-14

## 第五刀（表现壳四班微班，HEAD）

| 项 | 值 |
|---|---|
| commit 短散列 | `0a10860`（全 `0a10860fb36b92f5d072e9435605fda2fb812ded`） |
| 提交词 | 壳四班：门厅缺格词条句。 |
| 文件数 | 5（新增 2 / 修改 3，59 insertions） |
| 测试绿数 | `test:combat` 100 文件 / 997 绿；`typecheck:combat` exit 0 |
| HEAD | `0a10860`，main 比 `origin/main` 超前 52 |
| push | 未 push |

构成：`hallEnv.ts` 的 `gap_end` 一句「这一馆石台缺了末端一格。跨得过去，站不住。」；`shellWire.test.ts` 馆 4、馆 7 含「缺了末端一格」；`SHELL4_REPORT_20261115.md`；`SHELL4_TASK.md`；上一节统筹报告同刀。`gap_mid` 没写。未改 `src/game`。

冻结区零改动。黄金未改。

本节追加于提交之后，按惯例本文件改动留给下一波。

---

## 第四刀（数值核十二班，HEAD）

| 项 | 值 |
|---|---|
| commit 短散列 | `0c66ea8`（全 `0c66ea8d85a4b7647c7824ef34fcd39a354d9980`） |
| 提交词 | 数值十二班：缺格投馆四七。 |
| 文件数 | 5（新增 1 / 修改 4，77 insertions / 8 deletions） |
| 测试绿数 | `test:combat` 100 文件 / 996 绿；`typecheck:combat` exit 0 |
| HEAD | `0c66ea8`，main 比 `origin/main` 超前 51 |
| push | 未 push |

构成：`envSchedule.ts` 馆 4、馆 7 投 `gap_end`；`guardBreak.test.ts` 全表断言；`RULES.md` 环境投放行；`NUMGEN12_REPORT_20261115.md`；上一节统筹报告同刀。`gap_mid` 不投。馆 1/2 与馆 10 不投。

复核时第一跑 `labHand.test.ts`「超上限仍可出牌，但不能收势；点弃才压到上限」红一次（`playable` 为 undefined），该文件不在本刀。隔离表现壳改动后再跑，100 / 996 绿。

未入库：表现壳微班在复核途中写下 `hallEnv.ts`、`shellWire.test.ts`、`SHELL4_TASK.md`、`SHELL4_REPORT_20261115.md`。已从暂存处放回工作区，不进这一刀。

冻结区零改动。黄金未改。

本节追加于提交之后，按惯例本文件改动留给下一波。

---

## 第三刀（机制八班 + 壳三班 + 夜校十六班，HEAD）

| 项 | 值 |
|---|---|
| commit 短散列 | `bb365ac`（全 `bb365acb5dd8ab9e3c14ac1a844f89de2f0c1951`） |
| 提交词 | 机制八班缺格结算，壳三班投放接线，夜校十六班 35 终验。 |
| 文件数 | 40（新增 13 / 修改 27，1388 insertions / 142 deletions） |
| 测试绿数 | `test:combat` 100 文件 / 996 绿；`typecheck:combat` exit 0 |
| HEAD | `bb365ac`，main 比 `origin/main` 超前 50 |
| push | 未 push |

构成：机制核八班（`rules/envTags.ts`、`sim.ts`、`board.ts`、`wallLinks.ts`、`gapField.test.ts`、`MECH8_REPORT_20261115.md`）；表现壳三班（听劲倒计时、馆开局投放接线，`reactChoice.ts`、`gauntletPaths.ts`、`hallEnv.ts`、`shellWire.test.ts`、`SHELL_REPORT_20261115.md`）；夜校十六班（`night16*`、`package.json`、`NIGHT16_REPORT_20261115.md`）。同刀带上 `RULES.md` 缺格一句、上一节统筹报告、以及下一波任务卡 `NUMGEN12_TASK.md`。

夜校十六班 35 终验：破甲+裂石馆 4 / 6 / 9 为 10% / 10% / 0%，复现不了淬毒 60%。档 3 前移到馆 4 起之后，馆 5 是 95%。

异常清单：无。冻结区 `src/map/**`、`src/story/**`、`docs/frozen/**` 零改动。黄金基线三份未动。主窗已写明夜校 `flags.ts` 仍是馆 3/6 灼烧、馆 8 无墙，和投放表（3/6/8 灼烧、5/9 无墙）不一致；本刀未改 `flags.ts`，留给下一夜班。

本节追加于提交之后，按惯例本文件改动留给下一波。

---

## 第二刀（夜校十五班 + 数值核十一班，HEAD）

| 项 | 值 |
|---|---|
| commit 短散列 | `30c33dc`（全 `30c33dc8545a7dcbd2284a01c6ed6dee64b478a3`） |
| 提交词 | 夜校十五班与数值十一班：破甲裂石，接力转正，环境投放，深息清我方，反应窗流四件。 |
| 文件数 | 29（新增 9 / 修改 20，1063 insertions / 30 deletions） |
| 测试绿数 | `test:combat` 98 文件 / 985 绿；`typecheck:combat` exit 0 |
| HEAD | `30c33dc`，main 比 `origin/main` 超前 49 |
| push | 未 push |

构成：夜校十五班（`scripts/climbSim/night15*`、`package.json`、`NIGHT15_REPORT_20261114.md`）；数值核十一班（`src/game` 落码——`rules/guardBreak.ts`、`content/envSchedule.ts`、`climbCaps`、`reactionWindows`、`mindArts`、`items`、`techniques`、`legacy`、`hooks`、`sim`、`types` 等 + `guardBreak.test.ts` + 测试修订 + `NUMGEN11_REPORT_20261114.md`）；`RULES.md`；上一节的统筹报告（按本波指示同刀入库）。

**flake 挂账：** 23:43 主窗复闸第一跑出现 1 失败 / 984，此后 17 跑全绿未复现（本窗提交前复跑亦绿）。疑似与本窗 / 数值核窗写盘竞争有关，未定位到具体测试，标疑似继续盯。

异常清单：无。冻结区 `src/map/**`、`src/story/**`、`docs/frozen/**` 零改动；黄金基线三份未动；SYNC 两节（夜校 / 数值核）在 `.cursor`，gitignore 不入库。

本节追加于提交之后，按惯例本文件改动留给下一波。

---

## 第一刀（夜校十四班波，`0e86dc1`）

## 提交

| 项 | 值 |
|---|---|
| commit 短散列 | `0e86dc1`（全 `0e86dc19c3ad7dcf0ec7c44567ff4df61cf839a9`） |
| 提交词 | 夜校十四班：三变体矩阵，毒供给实验；派十五班与数值十一班。 |
| 文件数 | 11（新增 6 / 修改 5） |
| 测试绿数 | `test:combat` 97 文件 / 970 绿；`typecheck:combat` exit 0 |
| HEAD | `0e86dc1`，main 比 `origin/main` 超前 48 |
| push | 未 push |

## 文件清单

夜校十四班交付（6）：

- `scripts/climbSim/night14Main.ts`（新）
- `scripts/climbSim/night14Report.ts`（新）
- `scripts/climbSim/night14Run.ts`（新）
- `scripts/climbSim/boot.ts`（改）
- `scripts/climbSim/fight.ts`（改）
- `package.json`（改，`sim:climb:night14` 入口）

主窗派发与文档（5）：

- `docs/combat/NIGHT14_REPORT_20261114.md`（新，夜校十四班报告）
- `docs/combat/NIGHT15_TASK.md`（新，夜校十五班任务卡）
- `docs/combat/NUMGEN11_TASK.md`（新，数值核十一班任务卡）
- `docs/combat/RULES.md`（改）
- `docs/combat/TONGCHOU_TASK.md`（改，本窗任务卡）

## 异常清单

无。无不该提交的文件混入：

- 冻结区 `src/map/**`、`src/story/**`、`docs/frozen/**` 零改动。
- 黄金基线三份（`goldenReplay.baseline.json` / `.dom.json` / `.present.json`）未动。
- `.cursor/**`（SYNC、铁律）按惯例 gitignore，不在本刀。
- 全部文件归属夜校十四班或主窗派发件，与提交词一致；`src` 结算未改。

## 处置

- SYNC「核玩 → 测试与提交（统筹）」节已更新：本班记录、 dated 条目、波段看门、回主窗已入库名单均加 `0e86dc1`。
- 本报告按任务卡不提交，留给下一波。
