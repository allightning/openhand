# 任务卡 · 壳屏 2.0（门厅 / 配装 / 图鉴 / 事页 / 死亡 / 设置 大修）

2026-10-23 主窗派发。夜间第四窗。与收口/夜校/叙事并行：不碰战斗板（prodBattleUi/foePlayback 是战斗板 2.0 与明日表现跟进核的地盘）、不碰 `codexCatalog.ts`（卡池窗在飞）。

## 开场词（整段贴进新对话第一条）

```
你是 Openhand「壳屏 2.0（表现壳）」窗。任务卡 docs/combat/SHELL2_TASK.md 是口径。先读它，再读 .cursor/lanes/SYNC.md，再读 .cursor/rules/combat-ironclad.mdc §4（按钮不重叠、音乐单播、白描文风、阶段条不占位）。

开工先跑 npm run test:combat 里 UI 相关文件：红且是卡池连锁的，等 CLOSEGATE_REPORT 全绿再开工（sleep 300 重查，最多 2 小时）；其余情况直接开。

六个屏逐个过大修，每屏三件事——信息层级（第一眼看到什么）、按钮布局（不重叠是铁律级）、空态与长态（没数据/数据爆长时什么样）：
1 门厅——进游戏第一屏。开打入口、路线选择、队伍速览。
2 配装屏——三人 × 牌池的装配。卡池 2.0 后 131 张的浏览（按系分组、凡精绝视觉区分——rarity 字段卡池窗在加，你只读字段，字段没有就先按系分组）。
3 图鉴屏——牌 / 敌 / 状态 / 兵器查数值。只改渲染与排版，不许改 codexCatalog.ts（卡池窗在飞），数据缺字段列报告。
4 事页屏——白描 + 选项的排版。选项上的机制数字要一眼可读。
5 死亡屏——死亡评论 + 复活赛入口。
6 设置屏——音量 / 试听 / 既有项整理。

每屏配 DOM 断言（存在性 + 关键按钮不重叠，扩 noOverlap.test.ts 的覆盖到六屏）。样式守墨黑/宣纸米/朱砂，只改 lab.css 非战斗选择器。

红线：不改 src/game/**、不改 prodBattleUi/foePlayback（战斗板地盘）、不改 codexCatalog.ts、不改结算与数字、不 git commit、不开页面测试（验收全靠 DOM 断言）、dom/bindDom* 归音频不碰。

收尾交付：①docs/combat/SHELL2_REPORT_20261023.md——六屏各改了什么、noOverlap 扩展覆盖、缺字段清单；②创新思路。SYNC 只改 UI 那节。
```

## 边界

准许：`src/combatLab/render/**`（战斗板除外）、`lab.css` 非战斗选择器、render 相关测试、`noOverlap.test.ts`（扩）、`docs/combat/SHELL2_*`、SYNC UI 节。
禁止：`src/game/**`、`prodBattleUi.ts`、`foePlayback.ts`、`codexCatalog.ts`、`dom/bindDom*`、音频文件、结算数字、git commit、冻结区、读招。
