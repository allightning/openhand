# 任务卡 · 架构二班（新模块体检 + 黄金扩编 + 阶段 1 预备）

2026-11-02 主窗派发。P1 现在开，P2 等 W1 报告，P3 只出方案不动手。

## 开场词（整段贴进新对话第一条）

```
你是 Openhand「架构」窗。任务卡 docs/combat/ARCH2_TASK.md 是口径。先读它，再读 docs/combat/ARCHITECTURE.md、.cursor/rules/combat-architecture.mdc、.cursor/lanes/SYNC.md。

P1 新模块体检（现在开）：审查机制核在飞的新模块（reactionWindows / intentStance / foeArchetype / wallLinks 等）与既有引擎的分层纯度——src/game 零 import combatLab、零 DOM/localStorage、rng 必传无默认、共享路径 mode 判断 = 0、文件 >300 行该拆、函数 >80 行该抽、无 @deprecated 壳、嵌套 state 结构化不可变。sim.ts 行数与函数行数实测记账。产出 docs/combat/ARCH_HEALTH_20261102.md（违规清单 + 修建议，自己不修业务代码）。
P2 黄金扩编（开工令：GUASHOW_REPORT 全绿后）：过招定向场景进黄金——七系反应窗各 1 触发、虚招不可被反应窗触发、破防窗口、敌配招五原型各 1、亮招/亮虚招/读懂显示状态、灼烧/无墙/缺格环境。DOM 基线同步。同种子两次 diff 空。
P3 阶段 1 预备（只出方案）：RunContext + engine/climb 拆分施工单——isBreakAlign 现存调用点清单（rg 实测）、mode 字段归口方案、双核目录骨架建议。写 docs/combat/ENGINE_SPLIT_PLAN_20261102.md，不动手改码。

红线：P1/P3 不改任何业务代码；P2 只动黄金基线与测试；不 git commit；不开页面测试；冻结区读招不碰。
收尾交付：①ARCH_HEALTH 报告 ②黄金扩编证据 ③ENGINE_SPLIT_PLAN ④创新思路。SYNC 只改自己那节。
```

## 边界

准许：`docs/combat/ARCH_HEALTH_20261102.md`、`ENGINE_SPLIT_PLAN_20261102.md`、黄金基线三份与 `goldenReplay.test.ts`（仅 P2）、新建定向测试、SYNC 自己节。
禁止：业务代码（P1/P3）、`sim.ts`、`content/**`、UI、git commit、冻结区。
