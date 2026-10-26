# 合并收口报告 · 2026-10-23

统筹窗。口径 `CLOSEGATE_TASK.md`。未改机制、数值、牌面，未新增内容，未碰冻结区与读招内核，未 commit，未开页面。本窗对 `src/**` 的改动行数是 0。

## 等待

| 时刻 | 事 |
|---|---|
| 01:02 | 石台报告在（00:59，6.8k）。卡池报告不在。按卡睡 300 秒。 |
| 01:07 | 卡池报告仍不在。`content/cards/*.ts` 停在 00:59:55。再睡 300 秒。 |
| 01:12 | `REGEN_REPORT_20261023.md` 已在（01:11，6.5k）。两报告齐，开工。 |

未满 2 小时。没有走「等待超时」。

## 00:56 的 46 红，开工时已经不在

主窗 00:56 记的是 46 红 / 800 绿 / 14 文件。那份 vitest 原文没有落盘，本窗不能把没看见的失败名编成 46 行。

两报告齐之后的第一跑（01:13:12）：**849 绿 / 1 红**。那 1 红是 `story2.test.ts`「赌馆 4、黑市 3、复活 2、分叉 3」里 `s2-wager-fold-go` 的正则，当时写成 `/[X?]|80%/`，折页文案是「彩金不动，下场照旧」。01:13:18 叙事窗自己把正则补上这几个词。同刻 `typecheck:combat` 报 `renderSetup.ts` 三处（未使用导入、`renderGauntletHome` 找不到）；01:13:57 壳屏窗自己改完该文件。

复跑（01:16:53 与 01:18:46 各一次）：**81 文件 / 858 绿**。`typecheck:combat` exit 0。本窗没改 `story2.test.ts`，也没改 `renderSetup.ts`。

下面的台账是：任务卡点名的主簇，加上相对 HEAD 的测试 diff 里能对上的断言。分类在复核 diff 之后做的。处理栏「归属窗已改」指石台窗或卡池窗在交报告前后改的。本窗复核过，没再改一行。

## A 类台账

A = 测试或引用该跟着卡池删改挂、起手更换、9 格站位走。全部复核为 A。没有「看完 diff 仍拿不准、改归 B」的测试红。

| 文件 | 断言 | 原因 | 类 | 处理 |
|---|---|---|---|---|
| `autoLoadouts.test.ts` | `t1-four-palm` … `t12-trio-heroes` 共 12 条 `normalize 合法` | 配队 20 张里有已删 id（`weave` `follow` `combo` `chain` `echo` `haste2` `lateMirror` 等） | A | 归属窗改 `autoLoadouts.ts` 的牌 id。测试文件相对 HEAD 无 diff。复核绿 |
| `cardDistinct.test.ts` | 「除允许的换页对以外，没有同字段换名复制」 | `defend2` 费 1→2 后，字段键与 `statusStaff2`（格挡 12）相同；`retreat` 费 0→1 后，字段键与 `close` 相同。抽 1、贴身、撤步都写在 `defId` 分支里，键函数看不见 | A | 允许这两对。两张牌的结算仍不同。复核绿 |
| `climbPreviewBar.test.ts` | 悬停攻击牌 | 开局手牌不再保证有能打中的攻击 | A | 手牌注入 `strike`，人在 0、敌在 1。复核绿 |
| `climbPreviewBar.test.ts` | 够不着时亮距离 | 同上，刀程要用刀牌 | A | 注入 `cut`，人在 0、敌在 4。复核绿 |
| `climbPreviewBar.test.ts` | 石台格数 | 行路板长 9 | A | `data-pos` 7→9，文案「九步石台」。复核绿 |
| `climbUnify.test.ts` | 「S4 爬塔搓手改格挡、不加连势」 | `weave` 已删 | A | 整条删除。复核绿 |
| `climbUnify.test.ts` | 「S10 枪 a 命中锁步」「神兵枪 a 命中封技」 | 起手不再稳定摸到枪攻 | A | 注入 `thrust`。复核绿 |
| `climbUnify.test.ts` | 气脉文案还断言搓手「格挡 6」 | `weave` 已删 | A | 删掉该行。复核绿 |
| `climbUnify.test.ts` | 「破绽穿挡」 | 起手攻击系别变了 | A | 注入 `cut`，贴身站位。复核绿 |
| `demoSoftlock.test.ts` | 文件内 20 则，相对 HEAD 无 diff | 00:56 主簇点过名。软锁用例吃的是配队与起手 | A | 配队引用改完后转绿。本窗未改此文件 |
| `gauntletWaveSwap.test.ts` | 「换人后敌招有计划，收势能过回合」 | 换牌后手牌可能超上限，收势闸先挡住。这条测 phase | A | 先弃到可收势，并把人/敌放到 3/4。复核绿 |
| `lab.test.ts` | school filter：`pierce` 对剑 | `pierce` 改挂拳 | A | 剑允许 `direct`，不允许 `pierce`。复核绿 |
| `lab.test.ts` | `pruneDeckForWeapon` 剑保留 `strike` | `strike` 显式 `school: "any"` | A | 期望从 `["defend"]` 改为 `["strike","defend"]`。复核绿 |
| `lab.test.ts` | `drunkFist` | 交叉改挂拳→刀 | A | 刀允许、拳不允许。复核绿 |
| `labBreakMomentum.test.ts` | 剑拆势出破绽 | `pierce` 已不在剑 | A | 改打 `direct`。复核绿 |
| `labBreakMomentum.test.ts` | 棍拆势出晕 | `bleedcut` 改挂刀 | A | 改打 `split`。复核绿 |
| `sim.test.ts` | 「push from the sixth step hits the wall for 8」 | 行路 9 格、高侧单墙。从第 6 格（下标 5）推 2 步落到第 8 格 | A | 改名为停在板上，敌血不掉，笔记里没有撞壁。复核绿 |
| `sim.test.ts` | 「push then two strikes」敌血 38 | 少了那一次撞壁 8 | A | 期望 46。与石台报告同一句。复核绿 |
| `sim.test.ts` | `follow` / `combo` / `chain` 连打 | 三张已删 | A | 用例改为 `mirror` 过回合、`ironform` 留挡。复核绿 |
| `sim.test.ts` | `weave` 叠连击再对招 | `weave` 已删 | A | 整条删除。留挡断言并进上一条。复核绿 |
| `sim.test.ts` | 换人后弃掉 `strike` | 起手与系别过滤 | A | 后场牌改成 `push`（拳牌，换上刀后应离开手牌）。复核绿 |
| `breakDemo.test.ts` | 第 4 课允许 `rift` | 课牌改成通用 `drawcut` | A | 断言改为 `drawcut`。复核绿 |
| `labV31.test.ts` | 「搓手 0 费，下张牌耗劲 -1」 | `weave` 已删，且不做 0 费 | A | 整条删除。复核绿 |
| `rogueRoster.test.ts` | 起手「四攻 + …（钩用推代进步）」 | 五系起手 `direct`→`strike`，钩 `push`→`sidestep` | A | 标题与断言改成劈掌 + 钩用换位。复核绿 |
| `schoolKitCards.test.ts` | `hitSpear` 的系、枪的站位 | `hitSpear` 改挂剑 | A | 系断言改剑；出牌距离改到剑程。复核绿 |
| `labV22.test.ts` / `labV33.test.ts` / `party.test.ts` / `codexCatalog.test.ts` | 各 1 处断言（谱系过滤、拆招、兵器卷、图鉴） | 随改挂与文案 | A | 归属窗已改。复核绿 |
| `goldenReplay.test.ts` | 定向探针要求手牌里有 `strike2` / `hookDisarm` | 起手不再保证这两张 | A | `ensureHand` 缺了就插进手牌。探针数字仍由测试断言，见黄金节。复核绿 |

`sim.test.ts`「lets 深息 stop your 裂创」也在 diff 里，归 B，不放进上表。

## B 类

一条。本窗没改 `sim.ts`，也没改这条测试。

| 项 | 内容 |
|---|---|
| 文件 | `src/game/sim.ts` 约 1994 行，`defId === "mend" \|\| defId === "mend2"` |
| 牌面 | `mend2` 深息：「回复 8 点生命，并清裂创。」整改表删 `salve` 的理由是与深息重复；金创原文是「清掉你身上的裂创。」 |
| 实际 | `clearBleed` 把敌方 `b.bleed` 置 0。金创、烙口、裹伤的旧分支清的是 `b.youBleed`（你的裂创）。这三张已从牌池删掉，分支还在 `sim.ts` 里，牌 id 打不出去。 |
| 测试 | 标题仍是 stop your 裂创。断言从 `youBleed` 改成了 `b.bleed === 0`，所以这条现在是绿的。绿的是「清掉你叠在敌身上的裂创」。 |
| 为何可疑 | 回血和「清裂创」写在同一句里，被删的那张牌清的是你身上的层。敌方 `bleed` 与 `youBleed` 各记一处。HEAD 上这段就已经清敌方 `bleed`，这次卡池把它从「金创专测」换成「深息也这么测」，错配被写进测试。 |
| 本窗 | 不改结算。主窗拍：深息清的是 `youBleed`，还是敌方 `bleed`。拍完再改 `sim.ts` 和这条断言。 |

定向黄金里没有看不懂的拍，所以没有第二条 B，也没有拒绝重录的块。

## 全绿证据

01:18:46，工作区当时仍有叙事窗、壳屏窗的未提交改动。命令在该树上跑。

```
npm run test:combat
Test Files  81 passed (81)
Tests       858 passed (858)
Duration    3.33s

npm run typecheck:combat
exit 0
```

黄金对局「同一注入种子跑两次，逐拍相同」在 01:16 那次里通过（438ms）。「对照已录基线」同时通过。本窗没有设 `UPDATE_GOLDEN=1`。

## 黄金变更清单（相对 HEAD，前窗已录）

基线三份在 00:56（石台）和 01:09（卡池，手牌定稿之后）各录过一次。当前文件是后一次。本窗核对了 HEAD → 工作区的 diff，认为都能用 9 格或卡池解释，因此不重录、不回滚。

开局：20 条随机局的人/敌仍是 0 / 5。你的血、敌的血、开局劲力相对 HEAD 不变。变的是手牌。

行路站位：站上第 8 或第 9 格的帧，0 → 28。行路帧数 481 → 504。登门帧里第 8、9 格仍是 0（登门板长仍是 7）。

播报「撞壁」合计 8 → 3。

| 场景 | 8→3 里的变化 | 原因 |
|---|---|---|
| `climb-hook-2` `climb-palm-1` `climb-palm-2` | 各有撞壁 → 0 | 行路高侧墙在第 9 格外，原先打在第 7 格上的击退够不着 |
| `comboReplay` | 2 → 1 | 见下 |
| `break-hook-1` | 2 → 0 | 登门仍是 7 格两端墙。手牌换了，击退次数变了 |
| `break-palm-2` | 0 → 2 | 同上，新的手牌打出了撞壁 |

定向（机制断言仍由测试代码卡住）：

| 键 | 相对 HEAD | 原因 |
|---|---|---|
| `finale` `guardWager` `guardWagerMiss` `qiCommit` `revive` | 逐字段相同 | 不吃起手、不吃板长 |
| `lifesteal` `endureCc` `spearDebt` `stakeBlast` `stunLock` | 播报相同。手牌与 `drawN` 变 | `ensureHand` 把探针牌插在前面，其余槽换成新起手（常见填充是 `advance2`）。抽牌堆张数跟着牌池走。噬血后气血仍上升，霸体两拍仍是 0，断劲工资仍是 3 |
| `comboReplay` | 重放后连击层仍是 1。敌血 98 → 112，敌位 6 → 8，晕 2 → 1 | 旧播报：重放击退到第 7 步，震壁撞壁 14 写了两次。新播报：击退到第 8 步、第 9 步，撞壁 14 一次。少掉的 14 正好是 112−98。9 格高侧墙，第二次击退才撞上 |

随机 20 局的中后段血、挡、劲、手牌几乎拍拍都不同。第 0 帧手牌已经换完（删掉的 `follow` `combo` `chain` `weave` `tide` `haste2`，改挂后的 `direct` `bleedcut` `lateBleed`，起手 `strike` / `sidestep`）。后面的数值差是这些牌打出来的，加上行路多出来的两格。`foeBlock`、`youExpose`、`youStun`、`endure` 在随机局上没有字段级分歧。

`goldenReplay.dom.json` 仍是 27 个场景键。画面数跟着上面的帧走。本窗没单独改这个文件。

## 创新思路

这次 46 红来自同一处空档：石台改几何、卡池改 id，两边的验收都写「全量 test:combat 绿」，红落在第三摊。测试文件和黄金基线没有主人。

1. **共享基线由收口窗录，录一轮。** 00:56 石台录过，01:09 卡池再录。第二次覆盖对上了定稿后的手牌；若卡池先录、石台后录，9 格会被手牌半成品盖住。建议：内容窗与几何窗都不要跑 `UPDATE_GOLDEN`。收口窗等两份报告都在、相关源文件 mtime 静默超过一轮测试时间，再录。定向探针（连击层、噬血、霸体、工资）继续写在测试代码里，随机 20 局才进 json。
2. **删改挂用一张表驱动引用，不要让每个测试自己记 id。** `rectify.ts` 已经是删/改挂/调价的纯数据。起手、配队、拆势课、示范课仍各自写死 `pierce` / `weave` / `rift`。下次改池，先让这些调用点读表，收口窗的 A 类会从几十条变成表对不上的几条。
3. **字段键证明不了两张牌是同一张。** `defend2` 的抽 1、`close` / `retreat` 的走位都在 `defId` 分支。调费之后键相撞，测试就去加白名单。白名单会把真复制放进去。建议键函数遇到「效果在分支里」的 id 时把 id 算进键，或者这些牌补上数据字段（`draw`、`steps`），结算改读字段。
4. **换测一张牌时，断言的字段要跟牌面句子走，不能跟当前碰巧能绿的字段走。** 深息这一条就是这样绿的。收口纪律建议写成：替换被删牌的用例时，先抄被删牌的断言字段；红了就标 B，不准改字段名把红消掉。
5. **全绿命令在别的窗还在写文件时没有意义。** 01:13 的 1 红和 3 个类型错误，五分钟后原作者自己没了。收口协议要加一条：开工前看 `src/combatLab` 与 `src/game` 的最新 mtime，未静默则继续等，避免把别人写到一半的屏当成 B 类源码。
6. **死分支跟删牌一起清。** `salve` / `cauterize` / `bindwound` 的 `youBleed = 0` 还在 `sim.ts`。卡池窗按规定不碰 `sim.ts`，分支就留下了。下一张机制卡若再挂 `clearBleed`，会走进深息这条敌方字段。删牌名单应该附带「sim 里按 defId 点名的分支」，由唯一能动 `sim.ts` 的窗收掉。
