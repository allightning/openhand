# 阶段 1 施工单 · RunContext + engine/climb

2026-11-02 架构窗。只出顺序，不动代码，不建目录。

真源：`docs/combat/ARCHITECTURE.md` §1、§4 阶段 1。现状对账：RunContext 已在 `src/game/runContext.ts`（174 行）。`engine/climb/`、`engine/break/` 目录不存在。登门终态核 `qiCommit` 仍在 `src/combatLab/qiCommit.ts`。旧读招结算仍在 `sim.ts` 的 `ruleset.mode === "break"` 分支里。两套登门结算保持并列，施工时不合并。

开工门：`docs/combat/GUASHOW_REPORT_20261102.md` 全绿，且没有别的窗正在改 `sim.ts`。阶段 1 是单窗、单 PR、内部按下面的步分提交。黄金同种子 diff 必须保持空。diff 三次修不回去就停，把现场留给主窗。

## 已有的归口

`makeContext` 已经把 mode 收成 caps：`breakdown` / `intent` / `stake` / `combo` / `enemy` / `economy` / `content`。工厂内部 9 处 `mode ===`（`runContext.ts` 86、91、95、99、103、131、135、136、140 行）。这是允许的翻译层。

结算路径还在读 `ruleset.mode`，所以阶段 1 没有收口。把 `if (ruleset.mode)` 改成 `if (ctx.ruleset.mode)` 不算完成。

## isBreakAlign 实测

命令：`rg -n "isBreakAlign\\(" src -g '*.ts' -g '!**/*.test.ts'`。

生产代码 32 处。测试另有 4 处：`combatLab/lab.test.ts:58`，`combatLab/labRuleset.test.ts:10,12,18`。验收清的是生产代码；测试随定义一起改。

### 壳层 16（收到入口）

| 文件 | 行 | 归口 |
|---|---|---|
| `combatLab/labRuleset.ts` | 34 | 定义。存储的 mode 只在这里读，直到调用链把 `RunContext` 传满 |
| `combatLab/gauntlet.ts` | 126, 152, 153, 211, 218, 314, 317 | 开局血、武器档、敌压。改读 `runContext().ruleset.mode` |
| `combatLab/factory.ts` | 128, 141, 143 | 组局。选核之后不再问第二次 |
| `combatLab/labCombat.ts` | 47, 66, 73 | 战斗屏。吃已经选好的 ctx |
| `combatLab/draft.ts` | 30 | 外功槽。吃 ctx |
| `combatLab/dom/bindDomPart5.ts` | 67 | 结束回合的参数。吃 ctx |

### 引擎 rules/ 16（改吃 ctx，删掉端口上的这个方法）

| 文件 | 行 | 归口 |
|---|---|---|
| `game/rules/gauntletKit.ts` | 68, 69 | 68 是包装函数定义，69 转到端口。两处一起删 |
| `game/rules/gauntletPorts.ts` | 9, 49 | 9 是端口类型，49 是 `gauntletFieldMate`。字段改由 ctx 决定 |
| `game/rules/lifelineRules.ts` | 92, 114, 132, 224 | 复活 / 外功槽 / 同道池。函数加 `ctx` |
| `game/rules/rewardRoll.ts` | 127, 278, 286, 292 | 道具帽与超级奖励。函数加 `ctx` |
| `game/rules/marketRules.ts` | 87, 125 | 黑市文案与山寨线。函数加 `ctx` |
| `game/rules/rewardRules.ts` | 133 | 锻造等级。函数加 `ctx` |
| `game/rules/wagerRules.ts` | 38 | 盘口。函数加 `ctx` |

这 14 个调用外加 2 处定义，就是引擎里的 16。新机制五件（`reactionWindow` / `wallLinks` / `envTags` / `dartPin` / `staffCharge`）是 0，施工单不要为它们再加分支。

`let ports` 先留着：文案、牌表、梯子仍从壳注入。本阶段只拿掉 `isBreakAlign` 这一项。

## mode 实测（58）

共享结算路径上的 `ruleset.mode`。`runContext.ts` 工厂里的参数 `mode` 不在这 58 里。

### sim.ts 38 处（原始行号）

组局与开场：159，356，573，578，597，603，623，625，766。

603 是 `assembleBattleBoard(rc.ruleset.mode, run)`。石台几何留在共享 `board.ts`。选哪套墙由核的入口调用 `assembleClimbBoard` / `assembleBreakBoard`，共享函数不再接 mode。

伤害与出牌：1352，1357，1359，1383，1392，2072，2242，2503，2568，2741，2742，2745，2904。

意图与 AI：3799，3805，4080，4168，4190，4203，4277，4293，4308，4339，4364。

回合结束：4502，4504，4552，4560，4826。

`=== "break"` 的分支搬进 `engine/break/legacySim.ts`。`!== "break"` 的条件在行路文件里删掉，文件本身就是行路核。读招窗先前的分类（沉 break、收 ctx、死分支）仍以 `.cursor/lanes/5-读招.md` 为准；对不上的以这次行号重测为准，不要并进 `qiCommit`。

### 旧读招三文件 20 处

整文件搬进 `engine/break/`，文件内部的 mode 判断随「这个文件只服务旧核」删掉。

| 文件 | 行 |
|---|---|
| `labV2.ts`（13） | 73, 85, 122, 154, 160, 196, 209, 227, 241, 253, 274, 287, 349 |
| `labV21.ts`（5） | 114, 215, 305, 314, 318 |
| `simV2Hooks.ts`（2） | 77, 242 |

`labV2.ts:287` 自己标了「9 疑似不可达，阶段 3 确认」。搬的时候用黄金对局看这一臂走不走，走不到就删，走到就留在旧核里。

## 双核骨架（目标，现在不建）

```
src/game/
  runContext.ts          共享。只有 makeContext 读 mode
  types.ts  board.ts     共享。board 不再接 mode
  climbCaps.ts  breakCaps.ts
  content/
  engine/climb/
    battle.ts            行路组局（现 sim 开场段）
    play.ts              行路出牌（现 applyCard 的行路臂）
    intent.ts            行路意图
    turn.ts              行路回合结束
    mech/                现 rules/ 下五件新模块，签名改成返回补丁
    rules/               现 wager / reward / market / lifeline 的行路臂
  engine/break/
    legacySim.ts         sim.ts 里 === "break" 的臂，与 qiCommit 并列
    labV2.ts  labV21.ts  simV2Hooks.ts
    qiCommit.ts          从 combatLab 移入；不吸收 legacySim
```

壳层 `combatLab` 在入口选一个核，之后把 `RunContext` 传下去。壳不再调用 `isBreakAlign()`。

`sim.ts` 5049 行、`applyCard` 764 行是阶段 5 的内部分区。本施工单停在「登门臂离开共享文件」。按牌号拆 `applyCard` 会把黄金 diff 搅乱，不放在这一 PR。

## 提交顺序

1. **规则侧 ctx。** 上表 14 个调用改为参数 `ctx: RunContext`。行为用 `ctx.ruleset.mode === "break"` 先保持原样，这一提交只换来源，不搬文件。删 `GauntletPorts.isBreakAlign` 与 `gauntletKit.isBreakAlign`。黄金 diff 空。
2. **壳层入口。** `gauntlet` / `factory` / `labCombat` / `draft` / `bindDomPart5` 改为读已经造好的 ctx。`labRuleset.isBreakAlign` 只留给出入口的那一处，或随入口改完后删除。黄金 diff 空。
3. **旧核搬家。** `labV2.ts`、`labV21.ts`、`simV2Hooks.ts` 移到 `engine/break/`。import 路径改完，函数体先不动。黄金 diff 空。
4. **sim 的 break 臂。** 按上面四组行号把 `=== "break"` 分支移到 `engine/break/legacySim.ts`。行路文件删掉对应条件。每组一行提交，每组看一次黄金。38 处归零是这步的验收，不是一步提交。
5. **组局。** `assembleBattleBoard(mode)` 拆成两个入口函数。`board.ts` 只留几何。
6. **验收。** `npm run test:combat` 全绿，`npm run typecheck:combat` exit 0，黄金两则（随机 20 局 + 定向）逐拍 diff 空。然后：

```
rg "isBreakAlign|getLabTuning|getLabRuleset" src/game -g '*.ts' -g '!**/*.test.ts'
rg "ruleset\\.mode" src/game -g '*.ts' -g '!**/*.test.ts'
rg "Math\\.random" src/game/engine -g '*.ts'
```

三条都空。`Math.random` 的 `battleRng` 默认值留在壳层注入；引擎里的 `setBattleRng` 在这一步改成调用方必传 `rng`。这是第 4 步结束时的收尾，不单开机制。

`qiCommit` 搬家放到登门窗，不在本 PR。旧核与承诺核的黄金脚本仍各记各的。

## 明确不做

- 不改七窗、五原型、环境词条的结算。
- 不重录黄金，除非某一步 diff 不为空且能在三次内修回原行为。
- 不拆 `applyCard` 的牌号分支。
- 不删 `gauntletPorts` 整座单例。
- 不碰 `src/map`、`src/story`、`docs/frozen`、读招难度。
