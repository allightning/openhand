---
name: combat-architecture
description: Combat Lab 加新内容或重构时的落位指南与架构自检。Use when adding new cards, enemies, techniques, mind arts, items, wagers, rewards, UI screens, or encounters, when deciding where new code belongs (src/game vs src/combatLab), or when the user mentions 新牌、新敌人、新外功、新界面、新遭遇、落位、放哪、架构、重构.
---

# Combat Lab 架构落位与自检

详案真源：[docs/combat/ARCHITECTURE.md](../../../docs/combat/ARCHITECTURE.md)。铁律：`.cursor/rules/combat-architecture.mdc`。

## 分层一句话

- `src/game/` = 规则核：纯函数 + 数据表。**禁** import `src/combatLab/**`；**禁** `document` / `window` / `localStorage`。
- `src/combatLab/` = 产品壳：渲染、事件、屏切换、持久化。**不**写规则判断、**不**藏数值常量。
- 拿不准归属：换个 UI 它还在不在？在 = 引擎，不在 = 壳。

## 落位决策表

| 要加什么 | 落点 | 配套动作 |
|---|---|---|
| 新牌 / 外功 / 心法 / 符 | `src/game/content/` 注册表加一行数据（注册表未落地前：`labContent.ts` / `rogueCards.ts`） | 数值先登记 Notion 待定页；跑校验测试 |
| 新敌人 / 意图编排 | `src/game/content/enemies.ts`（落地前：`labEnemyStress.ts`） | 壳层 `foes.ts` 只做拼装 |
| 新常量 / 层帽 / 数值 | 行路 `climbCaps.ts`、登门 `breakCaps.ts`（PR #1 合并前行路常量仍在 `src/combatLab/climbCaps.ts`） | 先改 Notion / 文档再改码；登门数值不许塞进 climbCaps |
| 新赌注 / 奖励 / 黑市货 | `src/game/rules/` 对应文件（目录随阶段 0 提前建好） | 纯函数，入 ctx 出结果；**gauntlet.ts 只减不增，不留 TODO-C 口子** |
| 新界面 / 新屏 | `src/combatLab/render/renderXxx.ts`（落地前：`main.ts` 加一个 case） | main.ts 不写渲染细节 |
| 新遭遇 / 事页 | `src/combatLab/storyBeats.ts` | 白描 6–10 句 + 2–3 选项，选项带机制数字（铁律 §3） |

## 加内容自检清单

- [ ] 数值已登记 Notion 待定页，常量落在 `climbCaps.ts`，没有自己在 UI / 文案里编数字
- [ ] 新内容是数据表一行，不是在 sim / main 里加的特例 if；新规则直接进 `src/game/rules/`，没往 gauntlet.ts 里塞
- [ ] 规则函数是纯函数：入 `state` + `ctx`，出新 state；没改全局、没读时间；**rng 在引擎内必传无默认值**（默认值只允许壳层注入）
- [ ] 嵌套 state 结构化不可变更新：拷贝边界 = 被修改的字段路径，没浅拷贝后共享突变
- [ ] 共享结算路径没有 `ruleset.mode` 判断（mode 只在壳层入口选核 + content 参数化字段）；没有新增 `isBreakAlign()` 调用点
- [ ] 引擎代码没碰 DOM / localStorage；壳层代码没写规则判断
- [ ] 文件没超 300 行（纯数据表 / 文案表豁免）、函数没超 80 行；超了先拆再提交
- [ ] 没留 `@deprecated` 兼容壳；顺手的死代码直接删
- [ ] 跑过 `npm run test:combat` + `npm run typecheck:combat`，全绿
- [ ] 没碰冻结区：`src/map/**`、`src/story/**`、`docs/frozen/**`

## 重构时额外检查

- [ ] 开工前先 grep 重新基线化（行数 / import 数 / isBreakAlign 数）写进任务卡，不拿旧数字估工作量
- [ ] 每切一个模块跑一次测试，不攒着一起验
- [ ] 阶段 1/2/3 验收必过**黄金对局回放**：固定 seed 逐拍快照（伤害 / 格挡 / 位移 / 状态 / 牌堆 / 蓝），diff 为空才算过
- [ ] 拆 main.ts 渲染域时，保持「这一招打完才改这一招的血 / 挡 / 位移」时序（铁律 §4）
- [ ] 搬文件用「canonical 进引擎 + 壳层 re-export」打法（参照 PR #1），import 路径不断
- [ ] 触发中止条件（黄金 diff 3 次修复不收敛）就回滚该阶段，报主窗，不硬闯

## 验证命令

```bash
npm run typecheck:combat && npm run test:combat
rg "getLabTuning|getLabRuleset|isBreakAlign" src/game   # 阶段 1 完成后应无结果
rg "ruleset\.mode" src/game                              # 共享结算路径应为 0，只许入口 / content 参数化
rg "document|window|localStorage" src/game --type ts -l  # 应只剩注释或无结果
rg "Math\.random" src/game                               # 引擎内 rng 必传，应无结果
```
