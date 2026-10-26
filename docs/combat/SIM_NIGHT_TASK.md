# 任务卡 · 平衡工作台·夜校（全十馆基线 + 首次校准报告）

2026-10-23 主窗派发。夜间第二窗。**开工令：CLOSEGATE_REPORT 全绿。** 只碰 `scripts/climbSim/**` 与报告文档。

## 开场词（整段贴进新对话第一条）

```
你是 Openhand「平衡工作台·夜校」窗。任务卡 docs/combat/SIM_NIGHT_TASK.md 是口径。先读它，再读 docs/combat/CLIMB_SIM_TASK.md（你的平台就是上一班建的），再读 docs/combat/EXCHANGE_V2_20261023.md（锚点全在里面），再读 .cursor/lanes/SYNC.md。

开工令：docs/combat/CLOSEGATE_REPORT_20261023.md 存在且记全绿。没齐：sleep 300 重查，最多等 3 小时。超时不动代码，把现状写进 docs/combat/SIM_NIGHT_REPORT_20261023.md 标「等待超时」收工。全程不许改 src/** 一个字符。

开工后，用现有 sim:climb 平台在「9 格 + 131 新卡池」的新树上跑首次全量校准：
P1 全十馆基线——六系策略 × 随机对照，整局连打（带伤过馆），种子固定。输出：每馆手数曲线 vs 锚（杂兵 4-5 / 精英 5-6 / 座前 7-9）、通关率、血线曲线、死在哪馆分布、空手率、牌使用率（<5% 观察名单）。
P2 偏差分析——逐馆对锚：哪馆超时哪馆过快，哪系最强最弱，哪些牌 0 使用。只分析不改数。
P3 旋钮建议——按 EXCHANGE_V2 的标黄四旋钮（叠层 2、先机、蓄力利息 25%、钉 0.2）给回拍建议：数据支持现值还是该动，动多少。这是主窗明早要的第一份材料。
P4 报告——docs/combat/sim-reports/20261023-night.md 全量数据 + SIM_NIGHT_REPORT_20261023.md 摘要与建议。

红线：不改 src、不改旋钮文件默认值（建议写在报告里）、不 git commit、不开页面测试。

收尾交付：①SIM_NIGHT_REPORT + sim-reports 全量；②创新思路（校准方法上你发明的做法）。SYNC 只改测试那节。
```

## 边界

准许：`scripts/climbSim/**`、`docs/combat/sim-reports/`、`SIM_NIGHT_REPORT_20261023.md`、SYNC 测试节。
禁止：`src/**`、`package.json` 既有 script 改动（可加新 script 行）、冻结区、读招、git commit。
