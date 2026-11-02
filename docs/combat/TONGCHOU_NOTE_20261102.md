# 统筹记录 2026-11-02

用户已授权提交。未 push。统筹未改 `src/**`。冻结区 `src/map`、`src/story`、`docs/frozen` 开工时无 diff，三刀都没带上。

开工时整棵未提交树：`npm run test:combat` 82 文件 / 869 绿，`npm run typecheck:combat` exit 0。按包切开后，机制核与数值核各自再跑过这两条，仍是 82 / 869、exit 0，才提交。

## 三刀

| 包 | SHA | 内容 |
|---|---|---|
| 机制核 | `001854d54ee42be7589db14f1be0ff4c429a206f` | 39 文件。蓄力帽 6，爆发当量按一手 25、净损 15、利息 25% 占位。飞刀 `dart`、底速 9、钉帽 6，代表牌在 `MECH_CARDS`，不进 131。灼烧扣 4 占位，无墙把 `wallEnds` 收成 `none`。棍撞墙晕 1，枪回马耗蓝 2，钩抡撞换位并记成拉近。`test:combat` 纳入 `mech.test.ts`（11 则）。黄金基线未改。 |
| 数值核 | `816da57bd96cb58b777a651fbf235897fe923a23` | 14 文件。`scripts/numgen`。实改五张：醉拳伤 10→9，金吾卫令格挡 5→4，金汤格挡 16→15，推掌撞壁 8→9，拖刀裂创牌伤 7→6。敌目录血按锚点除以馆梯乘子回写，同 ID 跨馆跟低档。卡池仍 131。 |
| 文档与规则 | 本文件所在的提交 | `RULES.md`、羁绊稀有度计划、机制核报告、数值核报告与审计、W1–W5 任务卡、过招与抽牌设计稿、本记录。完整 SHA 在 `.cursor/lanes/SYNC.md` 统筹节。 |

铁律 `.cursor/rules/combat-ironclad.mdc` 与车道板 `.cursor/lanes/SYNC.md` 在 `.cursor/`，已被 gitignore，不进这三刀。纪律写在本记录和 SYNC 统筹节。

## 黄金原因清单

数值核重录 `goldenReplay.baseline.json`、`goldenReplay.dom.json`、`goldenReplay.present.json`。同种子两次逐拍相同，已绿。

- `play:jinwuToken` 格挡 5→4，随后荆棘 10→9。播报「金吾卫令：格挡 5」改成 4。原因是 `jinwuToken`。
- 播报「金汤：格挡 16」改成 15。原因是 `lateWard`。
- `board9` 断言撞壁 8→9，召唤撞壁合计 14→15。原因是 `push` 撞壁 8→9。
- 黄金棍局敌人有效 HP 仍是 146。敌曲线改的是生成杂兵目录，这条对局没吃到。

## 提交纪律

2026-11-02 起，统筹按下面五条执行。

1. 任一窗的交付，`test:combat` 与 `typecheck:combat` 都绿，当天提交。不把多窗的包攒成一刀。
2. 黄金基线（`goldenReplay.baseline.json` / `.dom.json` / `.present.json`）有变更，提交说明里必须附原因清单：哪一条播报或哪一个断言变了，对应哪张牌、哪条曲线或哪条石台改动。没有清单，不提交。
3. 冻结区 `src/map`、`src/story`、`docs/frozen` 零改动是硬闸。有 diff 就从暂存区剔除，把路径报给主窗，不入库。
4. 别的窗留下的红测试、未使用的 import、写到一半的文件，统筹不修，报主窗。
5. 不 push。push 只在用户另说的时候做。

## 波段看门

W1 过招、W2 数值二班、W3 角色、W4 表现壳、W5 夜校二跑。看门已经立上：某波报告进仓库后，统筹复跑全绿，再提交，把该波 SHA 记进 SYNC 统筹节。

本轮 W1–W5 的执行报告还没到（只有任务卡）。没有波段 SHA。

提交过程中其他窗还在写，下面这些不在开工基线的三包里，未入库，统筹没改它们：

- 夜校脚本：`scripts/climbSim/flags.ts`、`kitInject.ts`（开工时已在工作区，三刀没有夜校包，文件边界归夜校）。提交期间又出现 `envScore.ts`、`foeRead.ts`、`intentScore.ts`、`reactPolicy.ts`，以及 `fight.ts`、`hand.ts`、`policy.ts`、`schools.ts`、`tiers.ts` 的后续改动。
- 剧情：`src/combatLab/storyBeats.ts` 的后续改动。
- 文档：`docs/combat/DENGMEI_DESIGN_20261102.md`、`ARCH_HEALTH_20261102.md`、`ENGINE_SPLIT_PLAN_20261102.md`。
