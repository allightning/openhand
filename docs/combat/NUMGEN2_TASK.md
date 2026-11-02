# 任务卡 · 数值核二班（数值阶段落码 + 座前敌 ID + 条件抽分流 + 超带处置）

2026-11-02 主窗派发。W2。**开工令：`GUASHOW_REPORT_20261102.md` 存在且全绿**（机制核在动 caps；等待协议：sleep 300 重查，最多 3 小时，超时写报告收工）。不碰 `sim.ts`。

## 口径

数值真源：Notion 设计页 12「数值阶段」= 仓库 `NUMERIC_STAGE_V1_20261102.md`。抽牌条件框架：`DRAW_PRICING_20261026.md`。超带名单：`NUMGEN_AUDIT_20261023.md`。只改数据与常量，不改机制结构。

## 阶段

### P1 数值阶段落码
- 核对并落：`climbCaps` 与规则层常量——层帽八顶（裂创 6 / 破绽 4 / 剑势 6 / 连击 6 / 霸体 3 / 蓄力 6 黄 / 钉 6 / 挡 12）；反应窗耗蓝（机制核已落则只核对：大 2 / 小 1）；彩金曲线（8/9/10 → 12/14/16 → 18/20/22 → 座前 40）；黑市 8/18/40；注码带 10-30%；情报价 15%/30%；毒 6/20/36；身板轴（蓝厚 +2 上限 +1 回 / 血厚 HP +20% / 快热开局 +2）；三重幅度（裂创帽 +2 / 破绽帽 +2 / 断劲 +1 / 噬血 40% / 钩拉近上限 4 格）。
- 经济落点：`rules/wagerRules`、`marketRules`、黑市/情报货表；只改数字不改结构。

### P2 座前独立敌 ID + 敌曲线补
- `mob_monk_05` 与馆 5 共用问题：拆出独立座前敌 ID，HP 落 400-520（现 311 缺口）；江湖/朝廷座前同步复核（305/348 也要进 400-520）。
- 敌伤复核：目录伤 × dmgCoef ≈ 各馆每手伤锚（15-30% 血条），后期 37-45 需调。

### P3 条件抽分流
- 按 `DRAW_PRICING` 条件菜单逐张分流纯抽类（advance / brace / defend2 / haste / inbreath / statusPalm 等）：弃 1 抽 2 / 系内条件抽 / 收势抽 / 自锁 / 血代价 / 每手帽。先出分流表进报告，再改码；机制钩缺的（如收势抽）报主窗，不自己加机制。

### P4 超带名单处置
- 偏肥控（hitStaff / hookDisarm / staffBind / skillLock）：控制 1.5 劲复核，按生成器建议改数字或列保留理由。
- 偏瘦白板（close / retreat / plant / sidestep / unbind）：位移佐料化（+位移 1 格，0.4 劲价）。
- 绝招档：逐张审，不自动削。

### P5 黄金与验收
- 重录黄金（列原因），同种子两次 diff 空；`npm run test:combat` + `typecheck:combat` 绿。

## 开场词（整段贴进新对话第一条）

```
你是 Openhand「数值核」窗。任务卡 docs/combat/NUMGEN2_TASK.md 是口径。先读它，再读 docs/combat/NUMERIC_STAGE_V1_20261102.md、DRAW_PRICING_20261026.md、NUMGEN_AUDIT_20261023.md，再读 .cursor/lanes/SYNC.md 与 .cursor/rules/combat-ironclad.mdc。开工令：docs/combat/GUASHOW_REPORT_20261102.md 存在且全绿；没有就 sleep 300 重查（最多 3 小时），超时不动代码写报告收工。

五个阶段按序：P1 数值阶段落码（层帽八顶 / 耗蓝 / 彩金曲线 / 黑市 8/18/40 / 注码带 / 情报价 / 毒 / 身板轴 / 三重幅度，只改数字不改结构）。P2 座前独立敌 ID（mob_monk_05 拆分，座前进 400-520；江湖朝廷座前同步复核；敌伤按血条 15-30% 复核）。P3 条件抽分流（纯抽类按 DRAW_PRICING 菜单逐张加条件，先出分流表再改码，机制钩缺的报主窗）。P4 超带名单处置（偏肥控复核 / 偏瘦白板位移佐料化 / 绝招逐张审不自动削）。P5 黄金重录列原因，全绿。

红线：不碰 sim.ts、不改机制结构、不 git commit、不开页面测试、冻结区读招不碰。
收尾交付：①docs/combat/NUMGEN2_REPORT_20261102.md（常量变更表 / 座前 ID / 分流表 / 超带处置 / 全绿证据）②创新思路。SYNC 只改自己那节。
```

## 边界

准许：`climbCaps.ts`（机制核落完耗蓝后）、`foeCatalog.ts`、`labEnemyStress.ts`、`rules/wagerRules.ts`、`marketRules.ts`、`content/cards/*` 数字行与条件行、`contentValidation.test.ts`、黄金基线、`scripts/numgen/`、SYNC 自己节。
禁止：`sim.ts`、`types.ts`、机制结构、UI、音频、遭遇、冻结区、读招、git commit。
