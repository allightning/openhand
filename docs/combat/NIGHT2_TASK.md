# 任务卡 · 夜校二班（平台升级 + 二跑校准 + 标黄回拍）

2026-11-02 主窗派发。只碰 `scripts/climbSim/**` 与报告文档。P1 现在开，P3 等 W1/W2 报告。

## 开场词（整段贴进新对话第一条）

```
你是 Openhand「夜校」窗。任务卡 docs/combat/NIGHT2_TASK.md 是口径。先读它，再读 docs/combat/CLIMB_SIM_TASK.md、NUMERIC_STAGE_V1_20261102.md 第五节、REACTION_WINDOWS.md，再读 .cursor/lanes/SYNC.md。全程不许改 src/** 一个字符。

P1 平台升级（现在开）：自动手加新机制——蓄力策略（棍：能蓄则蓄、层满爆发 vs 每手正常打的对比策略）、飞刀策略（按距离切形态、钉优先给位移多的敌）、反应窗策略（触发时按「效果估值 vs 耗蓝」决定按不按）、环境词条（灼烧格规避、无墙场推系降权）、敌原型生成接入（按机制核 foeArchetype 读配招）、亮招/读懂信息使用（亮招段优先应对）。每策略独立可开关，跑对照。
P2 等待协议：docs/combat/GUASHOW_REPORT_20261102.md 与 NUMGEN2_REPORT_20261102.md 都齐且绿才进 P3；sleep 600 重查，最多 6 小时；超时把 P1 结果先交报告。
P3 二跑全量校准：七系 × 随机对照，整局连打。锚：杂兵 4-5 / 精英 5-6 / 座前 7-9 手、胜率 33% 参照、空手率 <5%、牌使用率（<5% 观察名单，注意区分「没摸到」与「摸到不用」）、40 分钟换算。
P4 标黄回拍五项（NUMERIC_STAGE 第五节顺序）：蓄力帽 6（264 当量是否超模，备选 4）、灼烧 4、窗耗蓝大 2 小 1、钉 0.2、彩金净耗 15-20%。每项给「维持 / 改 X」的回拍建议，数据说话。

收尾交付：①docs/combat/NIGHT2_REPORT_20261102.md（平台新策略说明 / 全量表 / 五项回拍建议）②docs/combat/sim-reports/20261102-night2.md 全量 ③创新思路。SYNC 只改测试那节。
```

## 边界

准许：`scripts/climbSim/**`、`docs/combat/sim-reports/`、`NIGHT2_REPORT_20261102.md`、SYNC 测试节。
禁止：`src/**`、改旋钮默认值（建议只写报告）、git commit、开页面测试。
