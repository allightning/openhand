# 石台 2.0 工作成果报告

2026-10-23 核玩一。结算核。未 commit，未开页面。

## 做完的样子

行路局 `makeBattle` 写入 `boardSize: 9`、`wallEnds` 按 `run.wallSide`（缺省 `high`）、`openingDist`（缺省 5，上限 5）。玩家钉在低侧 0，敌在间距那一格，不掷左右。高侧出界扣撞壁并停在末格；低侧出界停在 0，不扣血、不写撞壁、不触发震壁。`wallSide: "none"` 两端都停边格。

登门局写入 `boardSize: 7`、`wallEnds: "both"`，不盖 `openingDist`。两端出界仍扣撞壁。`qiCommit`、下注、期末、复活、`foe-recap` 与 HEAD 逐字段相同。

`BOARD_SIZE = 7` 仍是缺省。没写字段的对局按 7 格、两端墙结算。组局函数 `assembleBattleBoard` 是这一包里唯一的 `ruleset.mode` 分叉。`knockAway` 和其余走位只读 `boardSize` / `wallEnds`。

## 分阶段

### P1 · 9 格 + 格后单墙

- 几何收进 `src/game/board.ts`：`boardLen`、`offBoardSide`、`wallOnSide`、`assembleBattleBoard`。
- `knockAway` 出界时，该侧没有墙就 `break`，人留在边格。有墙才走原来的撞壁结算（含拳系震壁 +6 且晕 1 段）。没有加棍晕、没有加枪回马枪。
- 走位、占格、兵刃圈、冲锋、撤、换位、落桩的板长全部改读 `boardLen(b)`。

### P2 · 站位参数化

- `Run.openingDist?`、`Run.wallSide?`。`Battle` 上对应 `boardSize`、`wallEnds`、`openingDist`。`makeBattle` 形参未改。
- 盖了 `openingDist` 的行路局，`applyClimbOpeningPositions` 用「玩家 0、敌在间距」。没盖章的旧对象仍走关卡距（`climbOpening.test.ts` 馆 2 距 3 仍绿）。活路径会盖章，所以馆 1–4 不再被拉到距 3。
- 双人：`twinPosts`。7 格仍是 3 和 6；9 格是 4 和 8。
- 图鉴杂兵槽 4/5、罗汉槽 5 经 `catalogCell` 按板长封顶，不拉到新的高侧边。入场再封一次。
- 桩、助战落点、共鸣开场桩、`labV21` 贴墙距离改读板长和 `wallEnds`。登门 7 格两端墙时，贴墙格仍是 0 和 6。

### P3 · 位移矩阵

`src/game/board9.test.ts`，28 则全绿。覆盖：

- 九格可站；撤步能落到第 9 格
- 高侧撞壁 8、低侧停边不扣、低侧墙才扣、无墙场两端都不扣
- 推宫五档落点、破门撞壁仍是 10、敌拉、钩挂拉 2（伤仍是 3）、冲锋五档、贴身换位与隔位近一步
- 桩落到第 8 格、桩挡击退并猎桩 4、高阶桩砸两次、贴身砸身侧桩
- 召唤体站在第 9 格仍当墙，拳系震壁 +6 且晕 1 段（伤 14）
- 双人缩放；开局间距盖章后不跟馆序
- 登门 7 格两端推上墙都是停末格并扣 8

`package.json` 的 `test:combat` 加了这个文件，否则验收命令不会跑它。

### P4 · 黄金

`UPDATE_GOLDEN=1` 重录三份基线。同一注入种子跑两次，diff 为空（`goldenReplay.test.ts` 两则绿）。

| 对照 HEAD | 结果 |
|---|---|
| `qiCommit`、`guardWager`、`guardWagerMiss`、`finale`、`revive`、DOM `foe-recap` | 逐字段相同 |
| 行路随机 12 条开局 | 仍全是玩家 0 / 敌 5 |
| 行路随机帧 | 481 → 503 |
| 行路帧里站上第 8、9 格 | 0 → 2 |
| 行路帧里碰到第 7 格 | 5 → 1 |
| 行路 present 里「撞壁」 | 4 → 0 |
| 登门随机 8 条 | 整段不同，但第 0 帧手牌已经不同（旧 `elbow,strike,push2,advance,qiFlood`，新 `comboPalm,elbow,mend,setup,brace`） |
| 登门 present「撞壁」 | 2 → 0，随手牌走，不是墙规则关掉 |

登门随机对局的diff 来自卡池重排正在改 `CARDS`，不是 7 格两端墙的结算式。两端撞壁的定向断言在 `board9.test.ts` 里，数字仍是 8。

## 证据

- `npm run typecheck:combat` exit 0
- `src/game/board9.test.ts` 28 绿
- 黄金同种子两次 diff 为空
- 本机 `test:combat` 在合并树上约 44 红 / 800+ 绿。红的主体是卡池半成品（配队库、牌面去重、软锁手牌不配套、撤步被改成 1 费所以「0 费退 2」没走出）。主窗已写明交报告前不要修这些红。本窗没有去改它们。
- `sim.test.ts` 还剩 1 红：`深息`（`mend2`）断言清掉 `youBleed`。结算里 `clearBleed` 清的是敌方 `bleed`。这不是石台规则，没改。

## 影响面

- **行路结算：** 板长 9，缺省只高侧有墙。从第 6 格推 2 步落到第 8 格，不再撞壁。教程「推宫再两记劈掌」敌血从 38 改为 46（少了那 8 点撞壁）。
- **行路开局：** 经过 `makeBattle` 的局都盖了 `openingDist`。`applyClimbOpeningPositions` 不再用馆序距 3/4。前期馆从距 3（人在 1、敌在 4）变成距 5（人在 0、敌在 5）。平衡工作台下次重跑会看到更远的开局。`makeBattle` 仍是原来的形参。
- **登门结算：** 7 格、两端墙。定向推击与 HEAD 合同一致。随机黄金对局被卡池手牌带偏，不能拿来当「墙坏了」的证据。
- **表现层未动：** `prodBattleUi` / `foePlayback` 仍用常量 `BOARD_SIZE`（7）。结算可以站到第 9 格，画面还会按 7 格夹。这是 UI 窗的活。
- **没动：** 牌面数字、敌血、蓝、桩耐久规则、蓄力、飞刀、职业、环境词条数值、读招震壁公式、`src/combatLab/**`、`src/game/content/**`、冻结区。

## 创新思路（建议固化，本窗没有改铁律正文）

1. **石台几何单独一个纯模块，mode 只许出现在组局。** `assembleBattleBoard` 写 `boardSize` / `wallEnds` / `openingDist`，之后结算零 mode。值得写进 `ARCHITECTURE.md` 共享层：石台和 types 放一起，禁止在 `knockAway` 里新增 `ruleset.mode`。
2. **缺省字段等于登门合同。** 没写 `boardSize` 就是 7，没写 `wallEnds` 就是 `both`。旧测试和手搓的 `Battle` 不用改；行路必须在组局写上。建议铁律加一句：结算不得靠「是不是行路」猜板长。
3. **贴边和贴墙分开。** 王座、敌方 AI 的「在两端」仍是第 1 格和末格。撞壁、震壁、`labV21` 的「敌贴墙」只认 `wallEnds` 那一侧。无墙场可以站在边格但不算贴墙。环境词条包不要把这两件事合成一个 if。
4. **开局间距盖在对局上，关卡表只做没盖章时的旧路。** 活路径不读馆序；`climbOpening.test.ts` 那种没经过 `makeBattle` 的对象还能测旧公式。关卡驱动以后只写 `run.openingDist`，不要再在结算里读 `labGauntletStage`。
5. **图鉴槽位是距离，不是旧墙下标。** 4 和 5 在 9 格上仍然是 4 和 5，只用板长封顶。双人位才按末格缩放。不要把杂兵开局拉到第 8 格，那会破「间距 ≤ 5」。
6. **位移矩阵用表驱动。** 同一动词一行一个距离，落点和是否撞壁写在表里。加环境词条时往表上加行，不要再复制一段 `makeBattle`。
