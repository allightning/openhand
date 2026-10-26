# 任务卡 · 卡池 2.0（155 张全审计 + 整改全落 + rarity + 按系拆库 + 图鉴同步）

2026-10-23 主窗派发。核玩窗二，MEGA 版，五个阶段。独占 `src/game/content/**`、`cardTextV2.ts`、`codex.ts`、`codexCatalog.ts`。不碰 `sim.ts`（核玩一）、不碰渲染（UI 窗）。

## 做完的样子

卡池按整改表收敛到 131 张；每张牌带 `rarity` 三档字段；连携 15 张挂 `bondSchool`；`cards.ts` 按系拆成目录；图鉴每张牌带数、文案过文风铁律；产出全量审计报告供主窗回写 Notion 库存表。

## 阶段

### P1 · 全量审计（先出报告再动刀）
- 写脚本（`scripts/cardAudit/`，新建目录归本包）对 155 张逐张输出：id / 系 / 费用 / 效果钩 / kind / 文案是否带数 / 合同红原因 / 整改表处置（删 / 改挂 / 交叉 / 调价 / 留）。
- 报告落 `docs/combat/CARD_AUDIT_20261023.md`。整改表来源：`docs/combat/CARD_POOL_PLAN_20261021.md` + Notion 卡池整改逐张表（读不到 Notion 就以仓库计划稿为准并注明）。
- 审计报告贴进 SYNC 回本班，作为主窗对账依据。

### P2 · 整改全落
- 删 24（连势家族 7 + 通用瘦身 17）、改挂 15、交叉系 8（ultSaber/ultSword 按表）、绝招归位 4 费、组合牌 2→3、起手五系 direct→strike、钩 push→sidestep。
- 删牌不留兼容壳；有引用的测试同步删改。
- 目标分布：131 张 = any 43 / 拳 16 / 刀 17 / 剑 15 / 枪 11 / 棍 14 / 钩 15。

### P3 · rarity + 连携轴 + 拆库
- `CardDef` 加 `rarity: "common" | "adept" | "supreme"`。判定：凡 = 数值件、精 = 引擎件、绝 = 规则改变者（绝招 8 + 光环 6）。连携 15 单列不进分布。判不定的进 `CARD_HOLDS` 写原因，不自己拍。
- 连携 15 张加 `bondSchool`（武器系 id），换人结算不接（数值包后）。
- `cards.ts` 拆成 `content/cards/` 按系文件（palm/saber/sword/spear/staff/hook/any/fuse），`cards.ts` 只留投影与汇总；`legacy.ts` 同理按需拆。导出链（`content.ts` re-export）不断。
- `CARD_REGISTRY` 投影逻辑、`CARD_HOLDS` 结构不动签名。

### P4 · 图鉴与文案同步
- `cardTextV2.ts`、`codex.ts`、`codexCatalog.ts` 逐张核对：牌面文案带数（费用、伤害、层数、档位数），与被删 / 改挂 / 调费的牌同步。
- 牌面 flavor 过文风铁律（禁堆词、禁不是A而是B、禁后半句否定撑场）。只改文案不改数字。
- 图鉴 rarity 展示：codexCatalog 读出 rarity 并给显示文案（凡 / 精 / 绝），显示位置与样式归 UI 窗，本包只供数据与文案键。

### P5 · 测试与对账
- `contentValidation.test.ts` 全套：131 对账、rarity 分布 凡 44 / 精 58 / 绝 14 + 连携 15、HOLDS = 20、删牌无引用、改挂后各系张数对上、bondSchool 全覆盖。
- 跑 `scripts/audit-content.ts` / `audit-pool.ts` / `audit-plan.ts` / `audit-rarity.ts`（npx tsx）四脚本，输出贴 SYNC。
- 回主窗写：删 24 名单、改挂 15 名单、判不定进 HOLDS 名单、rarity 分布实测、四脚本对账结果。

## 边界

**准许：** `src/game/content/**`、`src/game/content.ts`、`contentValidation.test.ts`、`cardTextV2.ts`、`codex.ts`、`src/combatLab/codexCatalog.ts`、新建 `scripts/cardAudit/**`、`docs/combat/CARD_AUDIT_20261023.md`、`docs/combat/RULES.md` 卡池行、SYNC 自己那一节。
**禁止：** `sim.ts`、`types.ts`、其余 `src/game/**`、`prodBattleUi`/`foePlayback`/`render/**（UI）、`sfxMap`/`labAudio`（音频）、`storyBeats`/`climbPlaces`/`gauntletPaths`（遭遇）、新牌、新机制、改动未在整改表里的任何数字、git commit、冻结区、读招。

## 验收

`npm run test:combat` + `npm run typecheck:combat` 绿；P5 断言全过；131 对账与整改表一致；审计报告可复跑（脚本种子无关、纯静态）。

## 交付（收尾必交）

1. **工作成果报告** `docs/combat/REGEN_REPORT_20261023.md`：删改挂名单、rarity 分布实测、四脚本对账、131 对账证据。
2. **创新思路**：审计脚本怎么设计的、rarity 判例法（哪些牌是凡/精/绝的标杆判例）、拆库的目录理念，哪些值得固化。
3. SYNC 自己那节更新。
