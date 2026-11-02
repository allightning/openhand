# 任务卡 · 表现壳二班（意图聚合条 + 反应窗圆窗 + 环境实样式 + 档位显示）

2026-11-02 主窗派发。W4。独占 `render/**`、`prodBattleUi.ts`、`lab.css`。数据字段来自过招核（W1），缺则占位渲染并注明。

## 开场词（整段贴进新对话第一条）

```
你是 Openhand「表现壳」窗。任务卡 docs/combat/UIFOLLOW2_TASK.md 是口径。先读它，再读 .cursor/lanes/SYNC.md、.cursor/rules/combat-ironclad.mdc §4、Notion 设计页 9「过招系统」与 10「反应窗」。开工先跑 npm run test:combat 确认全绿，不绿停下报主窗。字段缺哪个先按占位渲染并在报告注明，不许去改结算。

五个显示件，按 W1 落的字段接：
1 意图聚合条——「伤势 ×2 · 进势 ×1」：架势六类图标 + 段数，替换旧逐段亮出；蓄势要有「他在运气」的视觉；诡势 = 未知标记。
2 反应窗圆窗——圆形弹窗：边沿进度条（默认 5 秒，设置档 3/5/10）、内写招式名 + 耗蓝；成功专属演出（敌位移硬停 + 石台震一下）；触发时画面停触发帧。
3 亮招 / 亮虚招 / 读懂——亮招段解锁显示（「伤势 → 伤势 → ?」按段亮类型）；亮虚招还原演出（假架势翻成真架势）；读懂的招在播报区亮名。
4 环境实样式——env-burn / env-nowall / env-gap-end / env-gap-mid 空样式接 envTag 实字段；灼烧跳血走回合结束节奏。
5 档位与状态——蓄力条（层数 / 爆发就绪）、钉层 chip、飞刀双形态标、牌意 4/7/10 达档显示（配装屏 + 战斗内 chip）。

每个显示件配 DOM 断言；按钮区过 noOverlap 守卫（扩到聚合条与圆窗）；阶段条不占位撑布局；出招打完才改画面。

红线：不改 src/game/**、不改结算与数字、不加新机制、不 git commit、不开页面测试、dom/bindDom* 归音频不碰、storyBeats 归剧情不碰。
收尾交付：①docs/combat/UIFOLLOW2_REPORT_20261102.md（五件各怎么接的 / DOM 断言 / noOverlap）②创新思路。SYNC 只改 UI 那节。
```

## 边界

准许：`src/combatLab/render/**`、`prodBattleUi.ts`、`lab.css`、render 相关测试、`noOverlap.test.ts` 扩、`docs/combat/UIFOLLOW2_*`、SYNC UI 节。
禁止：`src/game/**`、`dom/bindDom*`、`sfxMap/labAudio`、`storyBeats`、结算数字、git commit、冻结区、读招。
