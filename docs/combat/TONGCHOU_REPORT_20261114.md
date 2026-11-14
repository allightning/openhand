# 统筹收口报告 · 2026-11-14（夜校十四班波）

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
