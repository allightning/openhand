# 任务卡 · 表现跟进核（蓄力条 / 钉 / 双形态 / 环境实样式 / 牌意档位）

2026-10-23 主窗派发。wave 2 第四包。**开工令：MECH_REPORT 已交**（字段从机制核来）。独占 `render/**`、`prodBattleUi.ts`、`lab.css`。

## 开场词（整段贴进新对话第一条）

```
你是 Openhand「表现跟进核」窗。任务卡 docs/combat/UIFOLLOW_TASK.md 是口径。先读它，再读 .cursor/lanes/SYNC.md 与 .cursor/rules/combat-ironclad.mdc（§4 表现层铁律：按钮不重叠、出招打完才改画面、阶段条不占位撑布局）。开工令：docs/combat/MECH_REPORT_20261023.md 已交；未交先等（sleep 300 重查，最多 2 小时），超时不动代码写报告收工。

五个显示件，按机制核落的字段接：
1 蓄力条——棍蓄力层的层数 / 爆发就绪态，挂在玩家 HUD；层数变动随出招节奏跳（打完这招才跳）。
2 钉——敌身上的钉层 chip（带数字），位移被减时的闪句位置。
3 双形态——飞刀当前形态标（近/远），换形时的表现（打完才换标，不提前）。
4 环境实样式——把战斗板 2.0 预留的 env-burn / env-nowall / env-gap-end / env-gap-mid 空样式接上 run.envTag 实字段；灼烧格跳血走回合结束节奏。
5 牌意档位——配装同系 4/7/10 达档显示（配装屏 + 战斗内常驻被动 chip），数据从 schoolBonds 读。

每个显示件配 DOM 断言测试；按钮区过 noOverlap 守卫。字段缺哪个先按占位渲染并在报告注明，不许去改结算。

红线：不改 src/game/**（含 caps）、不改结算与数字、不加新机制、不 git commit、不开页面测试、冻结区读招不碰、dom/bindDom* 归音频窗不碰。

收尾交付：①docs/combat/UIFOLLOW_REPORT_20261023.md——五件各怎么接的、DOM 断言证据、noOverlap 结果；②创新思路。SYNC 只改自己那节。
```

## 边界

准许：`src/combatLab/render/**`、`prodBattleUi.ts`、`lab.css`、相关 render 测试、`noOverlap.test.ts`（扩）、SYNC 自己节。
禁止：`src/game/**`、`dom/bindDom*`、`sfxMap/labAudio`、`storyBeats`、结算与数字、冻结区、读招。
