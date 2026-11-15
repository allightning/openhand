# 数值核 · 2026-11-15 十二班：投放表补缺格行

## 开场词

数值核。先读 `.cursor/lanes/SYNC.md`、`.cursor/rules/combat-ironclad.mdc`、`docs/combat/MECH8_REPORT_20261115.md`（机制核八班：缺格结算已落地，`gap_end` 跟墙侧缺末端一格，`gap_mid` 结算认但不投）。只动 `src/game/content/envSchedule.ts` 与测试，不 commit、不开页面。

## 执行

1. **投放表补缺格行**：`gap_end` 投**馆 4 与馆 7**。口径（主窗定）：避开灼烧馆 3/6/8 与无墙馆 5/9（缺格不与灼烧同馆——中格会叠；无墙场缺格墙位语义绕），前期馆 1/2 不投（教学期），座前馆 10 不投。`gap_mid` 不投。
2. **顺手修过时注释**：`envSchedule.ts` 里「结算未接、gapFieldFor 返空」一句已过时（机制核八班接齐，见 MECH8 报告「给数值核」节）。
3. 测试：投放表断言补馆 4、馆 7 = `gap_end`，馆 1/2/3/5/6/8/9/10 无 `gap_*`。
4. `npm run test:combat` + `npm run typecheck:combat` 双闸（基线 100 文件 / 996 绿）。黄金若红按纪律重录 + 原因清单。

## 报告

`docs/combat/NUMGEN12_REPORT_20261115.md`：落码文件、投放全表（哪个馆什么词条，一张表）、测试绿数、黄金处置。SYNC 数值核节更新（本班/已收/回主窗）。
