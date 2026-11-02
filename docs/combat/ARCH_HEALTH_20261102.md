# 架构体检 · 2026-11-02

静态清点。本窗未改 `src/`，未跑 `test:combat`，未重录黄金。过招核当时仍占着 `sim.ts`，数字是这一时刻的盘面。

口径：`.cursor/rules/combat-architecture.mdc`、`docs/combat/ARCHITECTURE.md` §1 与 §5。新模块按「零 import 壳层、零 DOM、rng 必传、共享路径 `ruleset.mode` = 0、文件 ≤300、函数 ≤80、无 `@deprecated`、入参不改」逐条对。

## 结论

机制核已落盘的五件新模块，分层六项是干净的，**不可变更新这一项全红**。任务卡点名的 `reactionWindows.ts` / `intentStance.ts` / `foeArchetype.ts` 仓库里没有。`sim.ts` 5049 行，阶段 5 的拆分账在这里，本窗不动它。

## 新模块

| 文件 | 行 | 壳层 import | DOM | rng | `ruleset.mode` | `isBreakAlign` | `@deprecated` | 超 80 行函数 | 入参 |
|---|---:|---|---|---|---|---|---|---|---|
| `src/game/rules/reactionWindow.ts` | 36 | 无 | 无 | 无随机 | 0 | 0 | 无 | 无 | 改 `Battle` |
| `src/game/rules/wallLinks.ts` | 57 | 无 | 无 | 无随机 | 0 | 0 | 无 | 无 | `hookSmashSwap` 改站位和血 |
| `src/game/rules/envTags.ts` | 28 | 无 | 无 | 无随机 | 0 | 0 | 无 | 无 | `tickBurnCells` 改血 |
| `src/game/rules/dartPin.ts` | 31 | 无 | 无 | 无随机 | 0 | 0 | 无 | 无 | `addPin` / `applyPinBudget` 改 `foePin` |
| `src/game/rules/staffCharge.ts` | 16 | 无 | 无 | 无随机 | 0 | 0 | 无 | 无 | `gainCharge` / `consumeChargeBurst` 改 `chargeStacks` |

全库生产代码 `@deprecated` = 0。`src/game` 生产代码 import `combatLab` = 0（测试文件除外）。这五件没有 `Math.random`，也没有 `rng` 参数：它们是确定函数，rng 规矩用不上。

### 违规：五件都改入参

规则要求入 `state` 出新 `state`。这五件的写法是改传入的 `Battle`，再返回旁路（播报、数字、void）。

| 函数 | 改了什么 |
|---|---|
| `openSpearReverseWindow` | `b.reactionWindow` |
| `takeSpearReverse` | `b.energy`、窗上的 `leftover`、再清掉窗 |
| `declineReaction` | 清 `b.reactionWindow` |
| `hookSmashSwap` | `b.player.pos`、`b.enemy.pos`、`b.enemy.hp` |
| `tickBurnCells` | 站在灼烧格上的单位 `hp` |
| `addPin` / `applyPinBudget` | `b.foePin` |
| `gainCharge` / `consumeChargeBurst` | `b.chargeStacks` |

`answerReaction`（`sim.ts` 3334 行）先 `cloneBattle` 再把克隆交给 `takeSpearReverse`。`offerSpearReverse`、`hookSmashSwap`、`tickBurnCells` 直接改当场那份 `Battle`。同一组函数，有的调用方先克隆，有的不克隆。

建议（过招核下一刀，本窗不改）：函数返回补丁 `{ battle 字段, notes }`，由 `sim` 里一处写回。新窗不要再加第六个「改入参」函数。

### 合同风险：缺格返回空数组

`gapFieldFor` 在 `gap_end` / `gap_mid` 时返回 `[]`。`sim.ts` 用返回值的真假决定要不要写入 `gapCells`。空数组为真，词条会写成 `gapCells: []`。缺格位移仍是机制核的未完项（机制核回主窗已记「缺格位移可跨过未接」）。建议返回 `undefined` 表示「格子还没算」，有格点再给非空数组。本窗不改。

### 未落盘

`docs/combat/GUASHOW_TASK.md` 准许的这三个文件不存在：

- `src/game/reactionWindows.ts`（七窗数据表）
- `src/game/intentStance.ts`（架势分类、亮招、亮虚招、读懂）
- `src/game/foeArchetype.ts`（五原型、配牌）

现有 `reactionWindow.ts` 只服务回马枪一种窗。`offerSpearReverse` 仍写在 `sim.ts` 3309 行，按兵种和意图种类分支。六扇新窗如果继续长在 `sim.ts` 里，5049 行的文件会再涨一截。建议：一张表（谓词、耗蓝、效果），`sim` 只留一个 `maybeOpenWindow`。

## sim.ts 记账

`wc -l` = **5049**。花括号配对清点，函数约 196 个，**9 个超过 80 行**：

| 函数 | 起始行 | 行数 |
|---|---:|---:|
| `applyCard` | 1896 | 764 |
| `hitEnemy` | 1487 | 156 |
| `resolveIntent` | 3536 | 132 |
| `pickIntent` | 3908 | 121 |
| `statusChips` | 4929 | 121 |
| `endTurn` | 4808 | 120 |
| `knockAway` | 1644 | 100 |
| `planFromFirstAtPos` | 4273 | 95 |
| `applyClimbPhaseBeat` | 4682 | 93 |

这是阶段 5 的账。阶段 1 只把登门分支搬出共享路径，不在这一步按牌号拆 `applyCard`。

同一文件里的既有债，新模块没碰，记账在此：

- `battleRng`（294 行）模块级 `let`，默认 `Math.random`。黄金对局靠 `setBattleRng` 换种子。rng 默认值还在引擎里。
- `ruleset.mode` **38 处**（原始行号见施工单）。相对 2026-10-21 对账的 37 处多 1。新五件文件里是 0。

## 共享路径 mode 与 isBreakAlign

`ruleset.mode` 出现次数（生产代码，注释已剥）：

| 文件 | 次数 |
|---|---:|
| `sim.ts` | 38 |
| `labV2.ts` | 13 |
| `labV21.ts` | 5 |
| `simV2Hooks.ts` | 2 |
| 合计 | **58** |

`runContext.ts` 的 9 处 `mode ===` 在组 caps 的工厂里，参数是 `mode`，结算函数不该再读 `ruleset.mode`。工厂这一侧是对的。

`isBreakAlign(` 生产代码 **32** 处：`src/game` 16，`src/combatLab` 16。引擎里的 16 处全在 `rules/`，走 `gauntletPorts()`。新五件是 0。逐行清单在施工单。

`gauntletPorts.ts` 的 `let ports` 是模块级可变单例。阶段 2 对账已记。规则函数读它，签名上仍没有 ctx。

## 超 300 行（战斗核，本窗不拆）

逻辑文件：`sim.ts` 5049、`labV2.ts` 489、`simV2Hooks.ts` 435、`labV21.ts` 351、`intentWeakness.ts` 315。最后一件是读招账，本窗不拆。

数据 / 文案 / 类型，超行豁免，只记账：`types.ts` 1023、`midCases.ts` 796、`party.ts` 771、`midPuzzles.ts` 558、`quest.ts` 531、`bag.ts` 509、`enemyKit.ts` 426、`foeCatalog.ts` 404、`rogueRoster.ts` 380、`weapons.ts` 355、`midBeats.ts` 344、`viewTalk.ts` 329、`codex.ts` 306。`run.ts`、`settings.ts` 的 DOM 在 `layerBoundary` 的冻结豁免里。

## 黄金扩编证据（P2 未开工）

开工令是 `docs/combat/GUASHOW_REPORT_20261102.md` 存在且全绿。该文件不存在，仓库里也没有别的 `GUASHOW_REPORT*`。

因此本窗没有打开、没有改这些文件：

- `src/game/goldenReplay.baseline.json`
- `src/game/goldenReplay.present.json`
- `src/game/goldenReplay.dom.json`
- `src/game/goldenReplay.test.ts`

现有定向键 11 个：`spearDebt`、`stakeBlast`、`stunLock`、`comboReplay`、`lifesteal`、`endureCc`、`guardWager`、`guardWagerMiss`、`finale`、`revive`、`qiCommit`。七窗、虚招、破防、五原型、亮招 / 亮虚招 / 读懂、灼烧 / 无墙 / 缺格都不在这张表里。

过招报告全绿之后再补。补的时候只加定向键和 DOM 序列，同一种子的随机 20 局逐拍保持空 diff。场景用摆好的石台直接打到那一拍，不把十馆随机跑进来。

## 创新思路

1. **窗是一张表，sim 只留一个暂停点。** 每行：id、耗蓝、谓词、效果。`maybeOpenWindow` 按段走表。七窗加行，不加函数。虚招在谓词前一刀切掉，所有窗共用，不必每窗各写一遍。
2. **补丁写回只留一处。** 新机制返回 `{ notes, fields }`。`sim` 的 `applyPatch` 写字段。五件旧函数等过招核收口时一并改，不要在 5049 行的文件里先拆牌面。
3. **mode 用允许名单卡住，拆一处删一行。** 测试失败条件：`ruleset.mode` 出现在名单外。名单初始就是现在这四个文件。搬进 `engine/break` 的分支从名单删掉。下次体检不用再全库重数。
4. **定向黄金跟随机 20 局分开键。** 过招场景是「摆位 → 出一段 → 看窗开没开」。写进 `directed` 新键，并给 DOM 序列一条。随机种子那 20 局不重录。
5. **`isBreakAlign` 先收口 14 个规则调用，再拆 sim。** 规则侧 14 处改吃 `RunContext`。`gauntletPorts.isBreakAlign` 随后删除。sim 的 38 处另开一步，两步都看黄金 diff。不要合成一个大提交。
6. **缺格用三态，不用空数组。** `undefined` = 没这个词条，非空数组 = 哪些格不能站。词条在、格子未算，用显式标记，避免 `[]` 被当成「有缺格」。
