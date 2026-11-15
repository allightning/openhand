# 数值核十二班报告（NUMGEN12，2026-11-15）

任务卡 `docs/combat/NUMGEN12_TASK.md`。缺格结算以 `docs/combat/MECH8_REPORT_20261115.md` 为准，本班只补投放行。
**闸门：`test:combat` 100 文件 / 996 绿；`typecheck:combat` exit 0。黄金对局 2/2 绿，无变化，未重录。未 commit，未开页面。**

## 改了什么

- `src/game/content/envSchedule.ts`：`CLIMB_ENV_SCHEDULE` 加 `4: "gap_end"`、`7: "gap_end"`。注释里「结算未接、gapFieldFor 返空」已删，改成 MECH8 已接、`gap_mid` 认但不投。
- `src/combatLab/guardBreak.test.ts`：馆 4、馆 7 断言 `gap_end`；馆 1/2/3/5/6/8/9/10 断言没有 `gap_*`；`gap_mid` 不出现在表值里。
- `docs/combat/RULES.md` 骨架表「环境投放」行：铁律要求改规则先改文档。任务卡文件范围没写这一行，这一格是真源，不改会继续写着「投放表仍不补缺格行」。

未动 `sim.ts`、夜校 `scripts/climbSim/flags.ts`、表现壳文案。

## 馆 → 词条

| 馆 | 词条 |
|---|---|
| 1 | （不投，教学期） |
| 2 | （不投，教学期） |
| 3 | `burn` |
| 4 | `gap_end` |
| 5 | `nowall` |
| 6 | `burn` |
| 7 | `gap_end` |
| 8 | `burn` |
| 9 | `nowall` |
| 10 | （不投，座前） |

`gap_mid` 不在表里。缺格不与灼烧（3/6/8）、无墙（5/9）同馆。

## 黄金

`src/game/goldenReplay.test.ts` 2/2 绿，含同种子两次逐拍相同。基线没变，未设 `UPDATE_GOLDEN`。

## 给主窗

门厅词条句在 `src/combatLab/render/hallEnv.ts` 只写了灼烧和无墙。馆 4、馆 7 进战斗会带上 `gap_end`（壳已改查 `envTagForHall`），门厅那一句目前是空的。夜校 `flags.ts` 仍是馆 3/6 灼烧、馆 8 无墙，也没有缺格行。

## 创新思路

一馆一词条。缺格和灼烧分开投，结算不用再做互斥。`gap_mid` 结算已经认，表里仍不出现，避免「字段能算」被读成「已经在打」。
