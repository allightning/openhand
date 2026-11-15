# 表现壳 · 2026-11-15 三班：接线两件

## 开场词

表现壳。先读 `.cursor/lanes/SYNC.md`、`.cursor/rules/combat-ironclad.mdc`。数值核十一班落了两件只接通结算、没接壳的东西，本班接线。只碰 `src/combatLab/**`（渲染、事件、屏切换），不写规则判断、不藏数值常量；不 commit、不开页面（测试跑 `npm run test:combat`）。

## P1 听劲 · 反应窗思考时间读数

数值核落了 `windowThinkBonusSec`（心法「听劲」：玩家反应窗思考时间 +2 秒，见 `src/game/reactionWindows.ts`）。圆窗倒计时目前读固定 5 秒。改：倒计时读 `reactionWindows` 提供的实际秒数（含听劲加成），UI 不变只改读数来源。图鉴「听劲」条目确认文案带数字。

## P2 环境投放表接壳

数值核落了 `src/game/content/envSchedule.ts`（`envTagForHall`：灼烧馆 3/6/8、无墙馆 5/9）。本班：
- 馆开局（爬塔进馆建 battle 的壳层入口）按馆号查 `envTagForHall` 写入 `run.envTag`——注意夜校有自己的临时表，口径不一致处**以 `envSchedule.ts` 为真源**，发现遭遇/壳层别处还有手写 envTag 的一律改查表。
- 门厅 / 遭遇进馆前显示本馆词条名（灼烧格 / 无墙场），一句白描，禁铁律 §4 禁词。
- 战斗板环境已有渲染（灼烧格、无墙），确认接表后正确出现即可，不重画。

## 验收

1. `npm run test:combat` + `npm run typecheck:combat` 全绿（基线 98 / 985）。
2. 新增/更新壳层测试：听劲秒数读数、馆 3 进馆带 burn、馆 5 进馆带 nowall、馆 1 无词条。
3. 更新 SYNC 表现壳节（本班/已收/回主窗）。

## 报告

`docs/combat/SHELL_REPORT_20261115.md`：两件各自落了什么文件、发现的口径不一致清单（哪些手写 envTag 被收编）、测试绿数。
