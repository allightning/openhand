# 任务卡 · 合并收口窗（夜间值守：等报告 → 修 46 红 → 全绿报告）

2026-10-23 主窗派发。统筹性质，唯一特许跨窗修测试的窗口。

## 开场词（整段贴进新对话第一条）

```
你是 Openhand「合并收口」窗。任务卡 docs/combat/CLOSEGATE_TASK.md 是口径，逐条照做。先读它，再读 .cursor/lanes/SYNC.md「2026-10-23 在飞的六包 MEGA」与「主窗验收（00:56）」，再读 .cursor/rules/combat-ironclad.mdc。

第一步是等待，不是改码：检查 docs/combat/BOARD9_REPORT_20261023.md 和 docs/combat/REGEN_REPORT_20261023.md 是否都存在。缺任意一个：跑 sleep 300 再查，最多等 2 小时。两窗报告齐了才许动代码。等满 2 小时仍缺：一行代码都不许改，把当前红清单写进 docs/combat/CLOSEGATE_REPORT_20261023.md 标「等待超时」就收工。

开工后：跑 npm run test:combat，把 46 红逐条归两类——A 类「测试该跟着改」（卡池删改挂后引用旧牌 id / 旧起手；9 格板后站位断言），B 类「源代码可疑」（机制行为看着就是错的）。A 类直接修测试与引用；B 类不许改源代码，列进报告给主窗。修完跑 npm run test:combat 与 npm run typecheck:combat 全绿。黄金若红且 diff 全是 9 格 / 卡池合理变化：UPDATE_GOLDEN=1 重录并在报告逐条列变更原因；diff 里有看不懂的，归 B 类不许录。

红线：不改机制、不改数值、不改牌面、不新增内容、不碰冻结区与读招内核、不 git commit、不开页面测试。两窗报告齐之前连测试文件都不许碰（会撞车）。

收尾交付：①docs/combat/CLOSEGATE_REPORT_20261023.md——46 红分类台账（每条：文件、原因、A/B、处理）、全绿证据、黄金变更清单；②创新思路——这次合并冲突的根因分析，给主窗的流程建议。SYNC 只改统筹那一节的本班 / 已收 / 回主窗。
```

## 背景（主窗已查，供参考不供照搬）

00:56 验收：800 绿 / 46 红 / 14 文件。红名单主簇：`autoLoadouts.test.ts`（12 队 normalize）、`cardDistinct.test.ts`、`climbPreviewBar.test.ts`、`climbUnify.test.ts`、`demoSoftlock.test.ts`、`gauntletWaveSwap.test.ts`、`lab.test.ts`（school filter / drunkFist / auto loadouts）、`labBreakMomentum.test.ts`。主因判断：卡池 2.0 删改挂 + 起手牌换（direct→strike、push→sidestep）的连锁引用；少量 9 格站位断言。

## 纪律

- 先读后修：每条红先判断 A/B，再动手。A/B 存疑一律归 B。
- B 类清单原样列：文件、断言、实际行为、为什么可疑。不许顺手修源。
- 小步快跑：每修一族跑一次该文件测试，不攒 46 条一起验。
- 两窗报告 = 开工令。报告缺 = 只能等。
