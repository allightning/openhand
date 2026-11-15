# 表现壳 · 2026-11-15 四班（微班）：门厅缺格词条句

## 开场词

表现壳。先读 `.cursor/lanes/SYNC.md`、`.cursor/rules/combat-ironclad.mdc`。数值核十二班把 `gap_end` 投了馆 4 与馆 7，门厅词条句 `src/combatLab/render/hallEnv.ts` 的 `HALL_ENV_LINE` 只有灼烧和无墙，馆 4/7 进馆前那句是空的。只碰 `src/combatLab/**`，不 commit、不开页面。

## 执行

1. `HALL_ENV_LINE` 补 `gap_end` 一句。文案（主窗定，白描 + 禁铁律 §4 禁词）：「这一馆石台缺了末端一格。跨得过去，站不住。」`gap_mid` 不投不写。
2. 测试补一条：馆 4（或馆 7）门厅词条句含「缺了末端一格」（挂在 `shellWire.test.ts` 或同义文件）。
3. `npm run test:combat` + `npm run typecheck:combat` 双闸（基线 100 文件 / 996 绿）。
4. SYNC 表现壳节更新（本班/已收/回主窗）。

## 报告

`docs/combat/SHELL4_REPORT_20261115.md`：落了什么、测试绿数。半页足够。
