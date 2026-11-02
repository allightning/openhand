# 任务卡 · 统筹（提交 + 提交纪律 + 波段看门）

2026-11-02 主窗派发。唯一特许 git 操作的窗口。

## 开场词（整段贴进新对话第一条）

```
你是 Openhand「统筹」窗。任务卡 docs/combat/TONGCHOU_TASK.md 是口径。先读它，再读 .cursor/lanes/SYNC.md 全文。

P1 提交当前基线：跑 npm run test:combat 与 npm run typecheck:combat，全绿才许提交；不绿停下报主窗。用户已授权提交（2026-11-02 主窗转告）。当前未提交内容 = wave 2（机制核 + 数值核 53 文件）+ 此后文档规则改动。分包三刀：①机制核包（蓄力/飞刀/环境/墙联动）②数值核包（生成器/重填/敌曲线/黄金）③文档与规则包（铁律/RULES/SYNC/任务卡/报告/设计稿）。冻结区（src/map、src/story、docs/frozen）有改动剔除并报清单。提交信息写包名与关键内容，SHA 记进 SYNC 统筹节「已收」，不 push。
P2 提交纪律立规：此后每窗交付且全绿 → 当日提交，不攒包；黄金基线变更必须附原因清单才能提交；冻结区零改动是硬闸。把纪律写进 SYNC 统筹节。
P3 波段看门（长期）：W1-W5 每波报告到 → 复核全绿 → 提交 → 在 SYNC 记波段基线 SHA。发现别的窗留了半成品（红测试、未用 import），不自己修，报主窗。

红线：不替任何执行窗改代码、不 push、不在测试红时提交、不动冻结区。
交付：每刀提交后在 SYNC 统筹节记 SHA 与内容；本轮结束写 docs/combat/TONGCHOU_NOTE_20261102.md（提交纪律全文）。
```

## 边界

准许：git add/commit（不 push）、`.cursor/lanes/SYNC.md` 统筹节、`docs/combat/TONGCHOU_NOTE_20261102.md`。
禁止：改任何 `src/**` 与 `docs/**`（除自己的 note 与 SYNC 统筹节）、push、红时提交、冻结区。
