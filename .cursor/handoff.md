# Handoff — Combat Lab / 踢馆

日期：2026-09-24  

**现行板不在这里。** 开窗先读 `docs/combat/AGENT.md`，再读 `.cursor/lanes/SYNC.md`。本文件是日记，越长越不能当同步用。

## 2026-11-15 · 表现壳微班 · 缺格门厅句

身份是表现壳。未 commit。报告 `docs/combat/SHELL4_REPORT_20261115.md`。`HALL_ENV_LINE` 补 `gap_end`。`gap_mid` 没写。`test:combat` 100 文件 / 997 绿。`typecheck:combat` exit 0。

## 2026-11-15 · 表现壳 · 听劲秒数与馆词条

身份是表现壳。未 commit。报告 `docs/combat/SHELL_REPORT_20261115.md`。圆窗倒计时读 `windowThinkBonusSec`。馆开局按 `envTagForHall` 写词条。夜校临时表未改。`test:combat` 99 文件 / 990 绿。`typecheck:combat` exit 0。

## 2026-11-14 · 表现壳六班 · 换势、风声、重打开场

身份是表现壳。未 commit。报告 `docs/combat/UIFOLLOW6_REPORT_20261114.md`。换势键换成 story5 白描。`foeVariant` 风声在敌信息位。重打页座前优先。未改结算，未改 `storyBeats` 文案。`test:combat` 96 文件 / 966 绿。`typecheck:combat` exit 0。

## 2026-11-02 · 表现壳五班 · 翻牌开局与敌窗

身份是表现壳。未 commit。报告 `docs/combat/UIFOLLOW5_REPORT_20261102.md`。开局七张牌背，最多翻三张。敌侧圆窗读 `foeReact`，进度条满圈，带数字的那句进播报。牌意三档在蓄力条旁。未改结算，未改 `storyBeats`。`test:combat` 91 文件 / 950 绿。`typecheck:combat` exit 0。

## 2026-11-02 · 表现壳四班 · 换装与缘分职业

身份是表现壳。未 commit。报告 `docs/combat/UIFOLLOW4_REPORT_20261102.md`。馆间换装接 `swapHallWeapon`。战斗 HUD 画缘分、旧怨、职业三钮、`foePoison`。未改结算，未改 `storyBeats`。全套 5 红在 `src/game` 数值，不在本窗。

## 2026-11-02 · 表现壳三班 · 圆窗能点

身份是表现壳。未 commit。报告 `docs/combat/UIFOLLOW3_REPORT_20261102.md`。`test:combat` 87/921，`typecheck:combat` exit 0。点选进已有 `answerReaction`。3/5/10 写 `reactionSec`。成功沿用停步和石台震。未改结算公式，未改 `storyBeats`。

## 2026-09-24 · RunContext 阶段 B · 刀 18 已提交，收口终态

身份是**统筹窗**。分支 `refactor/run-context`。HEAD `c00da85`。未 push。

刀 17 `cc686c1`。刀 18 四笔：`b5a9817` 抽出 `labTypes`（这一笔的暂存区里已经有三文件和 `testContext` 的 git mv，所以搬家落在这一笔，当时文件内容还是旧相对路径）；`207af18` 三单例改从 `labTypes` 取类型并 re-export，`runContext` 删 `contextNow` / `climbContext` / `breakContext`，壳改 `./labX`，`testContext.ts` 改指向引擎工厂；`d06f110` 测试 import 改到壳；`c00da85` 删掉 `PERSIST_DEBT` 三文件。引擎测试 import `combatLab/testContext` 没被护栏拦住（护栏只扫非测试）。

`src/main.ts` 的 `contextNow` 13 处调用仍在，阶段 3，不在 `typecheck:combat`。六门在分笔前已绿：typecheck exit 0，test:combat 774，黄金绿，layerBoundary 绿。

## 2026-09-24 · RunContext 阶段 B · 刀 17 已提交，weaponArt 已显式 rc

身份是**统筹窗**。分支 `refactor/run-context`。HEAD `1dc0b64`（刀 16）。工作区是刀 17：`src/art/weaponArt.ts`、`src/art/weaponArt.test.ts`、`src/combatLab/prodBattleUi.ts`、`src/combatLab/gauntletUi.ts`、`src/combatLab/weaponSheet.ts`、`src/main.ts`。未 push。用户点名才提交。

`weaponArt`、`weaponArtMarkup`、`weaponDetail` 加必填 `rc: RunContext`。`weaponArtMarkup` 的 `rc` 在可选 `opts` 前面。函数体 `gearById(id, rc)`。删了 `contextNow` import。壳：`prodBattleUi` 1、`gauntletUi` 1、`weaponSheet` 2，都传 `shellRunContext()`。`main.ts` 自己的兵刃立绘 5 处传 `contextNow()`（3 markup + 1 detail + 1 art）。`weaponArt.test.ts` 传 `climbTestContext()`，断言未改。`rg contextNow src/art/weaponArt.ts` = 0。

验收已绿：`typecheck:combat` exit 0；`weaponArt.test.ts` 2 则 + `labHitFeedback` 19 则（含 weapon-plate）通过；`test:combat` 74 文件 / 774，黄金两则在套件内通过。建议提交信息 `refactor: inject rc into weapon art accessors`。`contextNow` 定义仍在 `runContext.ts`。`main.ts` 里 `gearById(..., contextNow())` 那 8 处本刀未动，留阶段 3。

下一步：用户说刀 17 QA 通过 → 只提交上述 6 个文件。

## 2026-09-24 · RunContext 阶段 B · 刀 16 已提交

刀 16 已提交 `1dc0b64`，信息 `refactor: use test context factory in remaining tests`。只 add 了 21 个测试文件。测试里的 `contextNow` 已是 0。下面是当时的盘点，现行状态看上一节。

已提交：刀 0 `f0d2012` 删 isLabV21；刀 1 `590be92` labAssist；刀 2 `fc15944` aura/variant；刀 3 `b31c2ae` cardText/equippedWeapon；刀 4 `c615178` codex/economy/rewards（含 hooks.ts，否则旧 arity 过不了类型）；刀 5 `1a28e34` weapons/enemyKit/hooks/quest；刀 6a `59bb69e` contentOverrides 进 rc；刀 6b `4341143` sim 不再 import labTuning；刀 7 `6b0d743` sim.test；刀 8 `6741762` labV31.test；刀 9 `b6aef13` labV33.test；刀 10 `a53e91d` climbPlaytest.test；刀 11 `3ae867b` climbUnify.test；刀 12 `a431255` labV32 + climbPhaseBeats；刀 13 `8ca49aa` labHand + gauntletWaveSwap + labBreakMomentum；刀 14 `dc6e296` enemyDiversity + labV2 + breakDemo；刀 15 `a32a567` goldenReplay + lab + demoSoftlock + labV21 + labHitFeedback。

刀 9 已提交：`labV33.test.ts` 38 处 `makeTestContext`，`mode:"break", lab:true`。信息 `refactor: use test context factory in labV33 tests`。只 add 了这一个文件。

刀 10 已提交：`climbPlaytest.test.ts` 21 处 `climbTestContext()`。信息 `refactor: use test context factory in climb playtest tests`。只 add 了这一个文件。

刀 11 已提交：`climbUnify.test.ts` 19 处 `climbTestContext()`。信息 `refactor: use test context factory in climb unify tests`。只 add 了这一个文件。

刀 12 已提交：`labV32.test.ts` 18 处 + `climbPhaseBeats.test.ts` 17 处。信息 `refactor: use test context factory in labV32/phaseBeats tests`。只 add 了这两个文件。

刀 13 已提交：`labHand.test.ts` 12 + `gauntletWaveSwap.test.ts` 11 + `labBreakMomentum.test.ts` 10。信息 `refactor: use test context factory in labHand/waveSwap/breakMomentum tests`。只 add 了这三个文件。

刀 14 已提交：`enemyDiversity.test.ts` 9 + `labV2.test.ts` 8 + `breakDemo.test.ts` 8。信息 `refactor: use test context factory in enemyDiversity/labV2/breakDemo tests`。只 add 了这三个文件。

刀 15（未提交，等 QA）：五文件合计 34 处，不是预估的 38。无 `contextNow` 依赖 `setContentOverride`。`lab.test.ts` 里「覆盖并进实体」那则本来就摊 `getContentOverrides()`，不是 `contextNow`，未改。`afterEach` 未拿来分组。

- `goldenReplay.test.ts` 7 处。import `./testContext`。`mash` 里 3 处在 `setLabRuleset(ruleset)` + `setLabMode(true)` + `startLabBattle` 之后，共用 `makeTestContext({ mode: ruleset, lab: true })`（行路、登门都走这条，无 tuning over）。断劲 / 裂桩 / 晕锁 4 处都是该段自己设 climb + lab true 再 `startLabBattle`，换成 `climbTestContext()`。两则仍绿。
- `lab.test.ts` 8 处。文件不设 ruleset，模块默认 climb。换人则：lab true + `{ rulesV2:false }`，1 处。预演则：lab true + `{ dmgCoef:1.35, paceBias:1, aiAggression:40 }`，4 处。教学则：调用前 `setLabMode(false)`，无 `startLabBattle`，3 处 `makeTestContext({ mode:"climb", lab:false })`。本文件 22 则全绿。
- `demoSoftlock.test.ts` 7 处。`beforeEach`：break、lab true、`{ rulesV2:true, v2Fx:true }`（与 DEFAULT 相同）。helper 与踢馆轮番都在这之后，且开战再开 lab。7 处 `breakTestContext()`。本文件 20 则全绿。
- `labV21.test.ts` 6 处。都在 `v2Battle()` 之后：登门、lab true、`{ rulesV2:true, v2Fx:false, v2VariantAi:true, v2Grudge:true }`。原有 `breakTestContext()` 不是 `contextNow`，未改。本文件 10 则全绿。
- `labHitFeedback.test.ts` 6 处。`beforeEach`：break、lab true、`{ rulesV2:true, v2Fx:true, enemySegBonus:0, v2VariantAi:false, enemyStressCap:0 }`，随后 `battle()` → `startLabBattle`。6 处带这份 over。本文件 19 则全绿。

验收已绿：五文件 contextNow=0，typecheck exit 0，test:combat 74 文件 / 774，黄金两则在套件内通过。建议提交信息 `refactor: use test context factory in goldenReplay/lab/softlock/v21/hitFeedback tests`，只 add 这五个文件。

引擎生产：`src/game` 非测试、排除 `runContext.ts` 后 `contextNow` 已是 0。三文件 import（labRuleset / labTuning / labContentOverrides）只剩 `runContext.ts` 与 `testContext.ts`。`RunContext` 必填：ruleset、tuning、lab、caps、contentOverrides、fightScale。`makeContext` 五个参数。`paceBias(rc)`、`aiAllowsReaction(rc, kind, defensive)` 在 runContext。壳用 `shellRunContext()`。`src/main.ts` 仍按旧签名，tsconfig.combat 已 exclude，留阶段 3。`src/map/**` 冻结不改。

测试替换规则（下一刀照做，不要无脑 climbTestContext()）：
1. 先数该文件 setLabMode / setLabRuleset / setLabTuning / setContentOverride，含文件级 beforeEach。逐则看 contextNow() 那一刻的 mode、lab、tuning。
2. setLabTuning 是 merge 到当前单例，不是整表替换。文件隔离时起点是 DEFAULT_LAB_TUNING。makeTestContext 的 tuning 也是 merge 到 DEFAULT，所以 over 只写该则相对 DEFAULT 的补丁，但必须含 beforeEach 里改过、且与 DEFAULT 不同的字段。
3. labActive 初值 false。climbTestContext()/breakTestContext() 把 lab 钉成 true。实验室关的行路用例用 `makeTestContext({ mode:"climb", lab:false })`。登门且实验室开用 mode break、lab true，再加 tuning。
4. setLab* 若驱动 startLabBattle / isBreakAlign / shellRunContext，原样保留。只替换「取上下文去结算」的 contextNow()。
5. setContentOverride：makeTestContext 没有 contentOverrides 字段。依赖覆盖时把 getContentOverrides() 摊进 rc（`{ ...makeTestContext(...), contentOverrides: getContentOverrides() }`），或先停下报告。不要改断言。
6. 删 contextNow import，从 `../game/testContext`（game 内则 `./testContext`）引入 makeTestContext。
7. 验收：该文件 contextNow=0；该文件测试全绿；`npm run typecheck:combat`；`npm run test:combat`（74 文件 / 774，黄金在套件内）。不改产品逻辑。不 commit，除非用户本条消息要求提交。

剩余 `contextNow(`（2026-09-24 刀 15 后）：测试里处数最多的是 party.test.ts 5，其次 schoolKitCards / movePathGate / labV34 / labV28 / climbPreviewBar 各 4，flowGuard 4（不在 test:combat 名单里）。以及更少的文件。`src/main.ts` 8 处、`src/art/weaponArt.ts` 3 处本阶段不处理。`runContext.ts` 的 `contextNow()` 定义本刀未删。看 lab 时以 `contextNow()` 那一刻为准：`afterEach` 里的 `setLabMode(false)` 不算；`startLabBattle` 入口会把 lab 打开。`setLabTuning` 的 over 要含 beforeEach 里相对 DEFAULT 改过的字段。

设计债（不在本重构修）：rewards 异系 replace/add 去向（rail 的 secondFamily 是 saber）；scaleClimbResource 仍原样返回 n。

刀 16（未提交，等 QA）：21 个测试文件、56 处。无 `setContentOverride` 依赖。`party` / `settings` / `flowGuard` / `bag` 共 13 处是实验室关的行路（文件不设 lab，调用前也没有 `startLabBattle`）。其余都是实验室开。分布见本班对话。21 文件 155 则全绿。`flowGuard` / `bag` 不在 `test:combat` 名单里，单独跑过。typecheck exit 0，test:combat 74 / 774，黄金两则在套件内通过。建议提交信息 `refactor: use test context factory in remaining tests`，只 add 这 21 个测试文件。

下一步：用户说刀 16 QA 通过 → 只提交这 21 个测试文件。`contextNow` 定义、`src/main.ts`、`src/art/weaponArt.ts` 另说。

## 2026-09-16 夜 · Notion 底稿重整 + MCP 修复

MCP：openhand 下空 `.cursor/mcp.json` 导致工作区挂不上 Notion；删掉后 Reload Window 恢复。Home 正常、工作区全断是项目级登记问题。

底稿：定稿先后改纯导航；晕进状态页、摸牌进资源页；去掉「刚拍上的」杂堆；各页一页一件事。未落 sim。

## 2026-09-16 · 落地前漏洞

用户：拍板的还不能送进游戏。核清 10 条会改玩法的漏洞，写入定稿先后。不落代码。

## 2026-09-16 · 数值暂缓

骨架和机制没进游戏，先不锁数字。定稿先后 2–7 暂缓。

## 2026-09-16 · 晕锁牌 / 霸体出招 / 配装×3 / 置换费−1（Notion）

用户拍四条。常驻霸体层表作废。未改 sim。

## 2026-09-16 · 开发 md 精简

新对话底子：`docs/combat/AGENT.md`。2026-09-21 已删 `docs/combat/archive/`、`notion-rewrite/`、空 `底稿/`；设计真源在 Notion。活着的：AGENT / PLAY / RULES / ROGUE_GRADIENT / SCOPE / ART_PIPELINE / TRAINING_HALL / CHANGELOG / bgm-prompts。

## 2026-09-15 · 骨架+六系暂时定；其余合同按骨架填草稿

用户拍：六系和骨架可以暂时定。核玩判断：没有第三件同等核心必须用户先写；敌速跟后手空条绑在一起，已按骨架填进敌人页待扫。

已填草稿（不对就改，对了就算拍）：状态上限套、晕 N=1、霸体层、牌费 1–3、断劲扣 3、每系就业格、敌速按馆拉开、段帽 5、杂兵无霸体、回气散 +3、种类帽 2、符对齐。仍要用户定产品：9/12 馆、带伤过馆。未改战斗代码。

新对话：先读 SYNC，再读铁律。不要从旧聊天记录猜规则。

## 2026-09-12 · 六系草稿写入 Notion（未改代码）

枪副现名 **断劲**（旧称折手 / 断筋）。方案 A：立刻扣敌劲，扣不动的挂下一次自然工资，不转血。缴械只跳下一次有伤。钩副 **噬血**。棍副裂桩分敌我。光环 = 2 同系小数字 + 3 同系小规则 + 光环牌。连携 15 对已按此改。

看：[六系机制·未定稿](https://app.notion.com/p/3d7427beba9c81f8b7f2c0490f938155)。状态词典 / 资源合同·敌劲 / 敌人合同 / 辐射薄切片 / 助战符已跟。库存表（卡/兵/人/功/状态行）仍是代码现行，没改行。等用户看完六系页再锁、再改代码。

## 四车道 + 统筹

**当前产品根本 = 肉鸽爬塔。** 统筹另开长对话（`.cursor/lanes/T-统筹.md`）：大方向、系统测试、唯一 commit。本 handoff 的「本班」以开窗车道为准。

### 本班：爬塔核玩（本对话 · 2026-09-10）

- 用户拍了：**方案 C**；蓝**跟人走不共用**。
- 已改：`climbVitals` 一档 10/6/4（肉盾 −1 / 控制 +1 上限）；换人扣上场者蓝；破绽穿挡 4；乱步/送手/失位分开且敌我对称；爬塔 chip/图鉴去掉硬拆套；状态表补吸血/禁技/迷眼。
- Notion 底稿已按定稿顺序从上到下重排，并补了缺页：状态词典、资源合同、敌人合同、跑局经济、道具与助战、辐射薄切片、遭遇填皮。地图：https://app.notion.com/p/3d8427beba9c811ea0fac9d77459bec6  底稿：https://app.notion.com/p/3d5427beba9c8117a108ca82fa2fd16c  **未改代码。**
- 先机加减招/外功：**本轮不改**，下一轮单独谈。
- 禁止 git commit。测试：`npm run test:combat` + `npm run typecheck:combat`。

执行车道用新聊天框，只贴一条开场提示词：

| 车道 | 提示词文件 |
|---|---|
| 统筹 | `.cursor/lanes/T-统筹.md` |
| 爬塔核玩 | `.cursor/lanes/1-核玩.md`（**只做肉鸽爬塔**；读招破招不归此窗） |
| 读招破招 | `.cursor/lanes/5-读招.md`（识招破招 / 训练馆硬核；不改爬塔经济） |
| 遭遇/剧情 | `.cursor/lanes/2-遭遇.md` |
| UI | `.cursor/lanes/3-ui.md` |
| 音乐音效 | `.cursor/lanes/4-音频.md` |
| 怎么开 | `.cursor/lanes/README.md` |

铁律：`.cursor/rules/combat-ironclad.mdc`。入口 `combat-lab.html`，`npm run lab`。测试由**统筹**跑 `npm run test:combat` + `npm run typecheck:combat` 做交叉验收。执行车道禁止 git commit；提交只走统筹窗。不开页面测试（除非用户当场要求手测）。

### 本班：读招破招（本对话）

- 车道：**读招破招**（识招破招 / 拆招战役 / 训练馆硬核）。爬塔经济与爽感不归本窗。
- 现状：`BREAK_MODE_OPEN = false`（S0）。门厅不渲染读招轨；内核与 break 单测仍可用 `setLabRuleset("break")`。
- 默认：用户没点名难度、新课、新破法时，只修明确 bug 与软锁。不把爬塔改成必须硬拆。
- 共享 `sim.ts`：改前说明是否碰到 climb；能 `isBreakAlign()` 分叉就分叉；禁止把爬塔开局削弱改回去。
- 禁止 git commit。越权需求写「待 · 爬塔核玩/遭遇/UI/音频」。
- **2026-09-10 分析（未改码）**：市面硬核对照见对话；画布 `break-hardcore-market.canvas.tsx`。结论：读招硬核必须另问「读对没有」，不能做成难一档的爬塔；半隐后段与铁律「意图全段亮出」冲突，先不落地。
- **2026-09-10 C 试行**：用户定读招暂不守铁律。R5/座前扣后段+起手式+盯梢；段上除 R1 不印答案。未碰 sim。待手测好不好玩。

### 统筹窗（另开长对话）

- 车道：**统筹**（产品 / 系统测试 / 唯一 commit）
- 目标：职责收口；对账；系统测试清单见 `T-统筹.md`；测试债写入本文件；用户同意后再提交
- 已改文件（本窗仅流程）：`.cursor/lanes/T-统筹.md`、`README.md`、`0-共用.md`、本 handoff
- 测试：待用户要求「跑一轮系统测试」时执行；此前他窗自报 689–690 绿，统筹未交叉复跑
- 待其他车道：见「派单板」
- 测试债：空（尚未做统筹交叉复跑）
- 待用户定：敌速分层；状态上限同一套；带伤过馆是否升铁律；劲力 6/5/3；`rewardBonus` 要不要改成开战手牌

### 派单板（统筹维护）

未派 / 等用户点头：

1. **待用户定 → 再派爬塔核玩**：敌速是否拉开（现梯内 mob 实战全 5，刀 6 导致快刀常亮、刀步无用武之地）。
2. **待用户定 → 再派爬塔核玩**：状态上限同一套（格挡/裂创/破绽/势）。
3. **待用户定 → 再派爬塔核玩**：`rewardBonus` 要不要从「营地多抽」改成开战手牌（遭遇已改口，未改掉落）。
4. **可派爬塔核玩（用户说「读底稿」之后）**：按 Notion 底稿落代码；顺手把 `STATUS_ENTRIES` 先机文案从刀 4 / 剑钩 7 改到与铁律一致。
5. **可派爬塔核玩**：核对爬塔预演「构成≠掉血」是否还有漏项（`damageBreakdown` 已补快刀）。
6. **可派遭遇（低优先）**：同道四人口气仍偏模板；少林/朝廷客栈导语再铺。
7. **可派音频（等素材）**：换人 / 助战 / 教学弹窗 / 先机播报 / 裂创跳点 / 下注确认 SFX。不新开曲库。
8. **不派本窗**：读招破招 / 拆招谜题 / 训练馆硬核。
9. **不派**：带伤过馆规则探究（用户明确暂不进铁律，能用即可）。

已收工（他窗，统筹未再手测页面）：遭遇加长与勘误；UI 防叠与预演接线、意图段隐藏；音频单曲门控。未要求故未 git commit。

### UI 窗 · 截图三病（2026-09-09 晚）

Demo 优先级：先看清、能点、不叠，再谈好看。
- 图一营地：底栏与卡拉开间距，黑市不再把货架顶进底钮。
- 图二配装：功法/空态改浅字，不再墨色压暗底。
- 图三战斗：顶栏改回三列网格；收势行与手牌分层，悬停不再盖钮；卡面条强制浅字。
- 全局顶栏改笺底墨字（与门厅一致），避免「连胜踢馆」隐在深底上。
- 未 commit。`typecheck:combat` + `test:combat` **696** 绿。

### UI 窗 · 配装改版（2026-09-10 晚）

- 营地：货卡/底钮铺在笺上，不再跟中轴抢、也不压在桌椅透视上。
- 配装：去掉右侧大立绘；谱 / 外功 / 心法 / 武器并列；行囊固定在左栏（与人物同宽），下面卖出 + 换页/叠功/合成(灰)/淬刃；顶上不要人名和小字。拖牌装卸，点一下选、再点确认。
- 地点底图与「别叫营地」：等遭遇交接后再配图。未 commit。`test:combat` **709** 绿。

### 爬塔核玩窗 · 角色数值草案（2026-09-10）

- 未改码。人数够。诊断：牌费已回 1–3，蓝仍停在 ×8 时代的 20/27/38，所以无脑点亮牌。
- 草案：`docs/combat/CLIMB_MATE_DRAFT_20260910.md`。§12 蓝耗深挖：中构筑/中策略标尺；新方案 C 回劲工资 / D 轻2重5 / E 人即工资 / F 跟馆 / G 余劲银行。建议先 C，可叠 E。
- 待用户拍：一档 7 还是 6；三档血收不收；卸力入骨加费还是拿掉抽牌。


- 删换名复制：融合正反 15 张、六系架·换页 6 张、中盘贯手/卸/推、镇殿锤、削册、稳铺、沉脉。旧 id `remapLegacyCardId`。
- 留下的拉开钩子：六系架各不同；直取伤4破绽1；扫堂眩晕；开缝吃印+破绽；纳息写入 energyNext；`def.plant` 走通用落桩。
- 同名消歧：回笼 / 锋丝。
- 测试：`typecheck:combat` 绿；`test:combat` **696** 绿。
- **Notion 已同步（2026-09-09）**：表 · 卡牌 155；28 张移到子页「卡牌回收·去重」；直取/开缝/六系架/回笼/锋丝/裂创用词已写回。状态/花名册/心法/兵器表未动。
- 换页数字升级（卸力入骨等）仍在；若还要砍「只加数字的换页」另说。

### 核玩窗（本对话）· 卡牌同效异名查重

- 未改码。183 张牌按结算字段聚类。
- 主因：①异系融合正反各一张同名同数（15 对 / 30 张）；②六系架/架·换页模板；③中后期通用牌与本系牌数字撞车；④词表双轨（流血/裂创、气脉/势、架/格挡）。
- 同名不同效：`聚气`（gather vs statusPalm2）、`锁喉丝`（statusHook2 vs 融合）。
- 待用户定：合牌 / 只统一用词 / 融合是否还要正反两张。

---

## 2026-09-09 上午 · 本长对话对账（统筹）

本窗（历史，已停功能开发）落地过：

- 铁律 `combat-ironclad.mdc`；兵刃底速拳8/剑7/刀钩6/枪棍5；刀步 +2 先机；`def.pace` 通用结算；预演构成与快刀口径；图鉴加细；遭遇/战斗文风第一轮；Notion 数值底稿；四车道提示词。
- **未做完且本窗不再做**：敌速分层、状态上限、把未 commit 的大堆整理成提交。

---

## 2026-09-09 凌晨 · Notion 细调底稿

明手 → 踢馆：识招破招 → 折叠「肉鸽踢馆」→ 子页 [肉鸽踢馆 · 数值与玩法底稿](https://app.notion.com/p/3d5427beba9c8117a108ca82fa2fd16c)

表已填代码现行：卡牌 **155**（2026-09-09 去重后）、状态 44、花名册 18、心法外功 42、兵器 60。用户改 Notion 后说「读底稿落代码」。

### 遭遇车道收工（2026-09-09 他窗）

- 目标：加长馆间导语与选项；三线地名氛围；数字按现行结算写清。未开新遭遇种类。
- 已改文件：`encounter.ts`、`encounter.test.ts`、`climbPlaces.ts`、`gauntletPaths.ts`、`gauntlet.ts`（LIFELINE/金创 tip）、`gauntletUi.ts`（终馆/带伤说明）、`gauntletHome.test.ts`、`trainingHall.ts`（营地课一句）
- 测试：`typecheck:combat` 绿；`test:combat` **690** 绿
- **文案勘误（未改公式）**：`rewardBonus` 历来是营地免费奖励多抽，旧文写成「开战手牌多 1 张」，已改口。支线短战写清 **+22 / −10 + 多抽 1**。终局私了写 **×0.7 / 带伤 ×0.55**。
- 还想加长：同道四人口气仍偏模板；少林/朝廷客栈导语可再铺。无尽三线仍短（故意，无遭遇）。

### 音频车道收工（2026-09-09 他窗）

- 车道：**音频**（已收工）
- 目标：同一时间只播一首音乐；切场景先停再播；胜负短句先停 BGM，播完再接营地曲。
- 已改文件：`src/combatLab/labAudio.ts`、`labAudio.test.ts`、`main.ts`（仅 `openGauntletCamp` 不再误停短句；`syncBgmWithScreen` 注释）
- 测试：`test:combat` **690** 绿 + `typecheck:combat` 绿
- **全局几路播放器**：音乐 1 路（`bgm` **或** 淡出残骸 **或** 胜负短句，互斥）；SFX 另开一次性 `Audio`（不算第二首 BGM）。没有新层叠音轨。
- **如何保证单曲**：`ensureBgm` 先停旧曲再 `beginTrack`；短句占用时只记 `pendingAfterSting` 不起第二首；`playSting` 先 `reapFadingOut`+杀 BGM；`debugMusicLane().musicSources` 门控 ≤1。
- **改了哪些切曲点**：进战/回营仍走 `syncBgmWithScreen`；胜负 `playSting` → 短句完再接营地；**直进营地不再 `stopSting`**（支线告捷也能听完短句）。离开告捷笺仍 `stopSting`（`continueAfterWinSettle` / 出门厅）。切场景淡出是先停再播，不是双文件交叉。
- **未接的 SFX 点**（现有 4 个文件已接出招 swing/drop、受击 clash、拆招 clash、收势 drop）：换人、助战/道具、教学弹窗开合、先机播报、裂创跳点、下注确认。等拟声素材，不新开曲库。
- 版权：见 `labAudio.ts` 头注释；局内无来源文。
- 待用户定：新拟声齐了再扩 SFX；爬塔落实前不新开曲库/层叠音轨

### UI 车道收工（2026-09-09 同窗并行）

- 车道：**UI**（本窗已收工；上方「本班」现为音频窗占用）
- 已改：`prodBattleUi.ts` 预演条接线 + 构成≠掉血标「待 · 核玩」；`labV2Ui.ts` 回放藏已兑段；`encyclopedia.ts` 图鉴头栏工具组分栏、状态上限行；`gauntletUi.ts`/`devPanel.ts`/`main.ts` 布局与 `data-sfx` 钩子；`lab.css`/`gauntlet.css` 防叠。
- 测试：`typecheck:combat` + `test:combat` **689** 绿
- 选择器：`#preview-slot`、`#btn-end`、`.lab-action-row`、`.lab-hand-row`、`.lab-intent-seg`/`data-hide-before`、`.lab-wiki-head-tools`、`.lab-wiki-foot`、`#gauntlet-loadout-back`、`.gauntlet-camp-foot`、`.gauntlet-wager-actions`
- 未重叠怎么验：手牌层 z-index 低于收势行；悬停卡 `::after` 不接点击；图鉴关钮与翻页分栏/换行；配装「回营地」sticky 且不在行囊 DOM 内；营地底栏/下注钮 wrap。结构断言在 `climbPreviewBar`/`campUx`/`codexCatalog`/`labHitFeedback`。
- 已知窄屏：配装 `<900px` 改单列，立绘压到约 9rem；战斗顶栏工具钮折行后变高，石台可用高略减。图鉴搜框与分页在很窄时各占一行，不叠但占竖向空间。
- 音效钩子（播曲归音频）：`data-sfx="end-turn"` 收势、`data-sfx="play-card"` 手牌、`data-sfx="ui-click"` 图鉴/配装分页与关闭

---

## 2026-09-09 凌晨 · Notion 细调底稿

明手 → 踢馆：识招破招 → 折叠「肉鸽踢馆」→ 子页 [肉鸽踢馆 · 数值与玩法底稿](https://app.notion.com/p/3d5427beba9c8117a108ca82fa2fd16c)

表已填代码现行：卡牌 **155**（2026-09-09 去重后）、状态 44、花名册 18、心法外功 42、兵器 60。用户改 Notion 后说「读底稿落代码」。

---

## 2026-09-09 凌晨 · 先机 A+B 落地（未 commit）

- 底速落码：拳 8 / 剑 7 / 刀钩 6 / 枪棍 5（`party.ts` WEAPON_PACE；RULES.md §一已记）。
- 刀步（stepSaber）：前进 1 + 先机 +2；`sim.ts` 通用结算新增 `def.pace` 通路。
- 测试 686 绿。受牵连测试已改：labV31 先机链、party.test、climbUnify（foePace 7）、enemyDiversity（后手削弱改单测）。
- **重大发现待用户定**：梯内 mob_* 的 foePace 全是 5（`foeCatalog` 的 4/6 没接进 `ENEMY_PACE`），期末主座 usurper 6。刀 6 = 永远领先 → 快刀常亮、刀步无使用场景；后手开局削弱梯内无敌可触发。是否给敌速做层次（接 catalog 4/5/6 或拉开 3–8）待用户定夺。

---

## 2026-09-08 夜 · 铁律成文

最高优先级铁律已写入 `.cursor/rules/combat-ironclad.mdc`（alwaysApply）。效力、冲突处理、剔除项见该文件 §0/§6。兵刃底速已落码：拳8/剑7/刀钩6/枪棍5。

---

## 2026-09-08 夜 · 文风定调（未 commit）

遭遇/剧情：江湖口述体，导语加长，少用「是/不是」「像」。选项正文拉长，**加黑句**把数字说清（手牌多 1 张、彩金 +8、多 1 名替补）。

战斗：短、按钮名+数字。新手关/训练馆/金创/先出手播报已改。牌面与图鉴数值未再改口吻。

验证：`test:combat` 684 绿。

---

## 2026-09-08 晚 · FCD BEA 开工（未 commit）

用户确认顺序 **F → C → D → B → E → A**。本波已落地（待手测）：

- **F** 构成并神兵 12 路；爬塔守势跟注不耗一手。
- **C** 配装顶栏谱/功法；行囊按页过滤；右侧立绘；爬塔外功/心法奖励先进囊（读招仍选人）。
- **D** 七步石台格加长廊质感；意图段标落点/圈；悬停意图仍刷威胁格。
- **B** 收势比先机差值：快则剩招不许位移补打；慢则改抢步；差两档少留一手。爬塔刀副机制=先机领先快刀 +2。回合末裂创 1600ms → 回合开始 1200ms。
- **E** 客栈/岔路/伏击导语加长，奖励是选择后果。
- **A** 爬塔同伴写 `mateDecks`；3/7 馆花名册分档四选一；档 2/3 给心法；收势先过门再锁 busy；胜负短句先停 BGM，短句播完再接营地曲。

验证：跑 `npm run typecheck:combat` + `npm run test:combat`。

未做完：敌人 AI 仍可能「原地扑」偏多（够不着才改抢步）；遭遇选项正文还可再加长。

---

## 2026-09-08 傍晚 · 开局不削弱 + 意图条同收势（未 commit）

爬塔开局不再削段/打折。先进战露出完整意图条（约 0.6s，不再盖「先机在握」），再按收势兑一条、播一条、条上少一条。读招仍保留开局削弱。

---


空招跳过回放时若整段都是「空」，`foePlaybackBusy` 没解开，进战停在「先机在握……」、手牌点不了。已在 `playFoeRecapThen` 空队列路径解开锁。爬塔开局 `seizeOpening` 与收势一样只兑一条，剩招改抢步而不是立刻重 roll。

配装分页：**未改代码**，草案 `docs/combat/LOADOUT_PAGES_DRAFT_20260908.md`。

---


测试向预演：短句后跟 **（构成 N：逐项加减）**。构成表补齐牌面/蓄劲/破绽/散步/失衡/登场/追击/贴刃/系贴身/挨打加伤/枪剑钩被动/亮刀/兵器/兵路/同门/神兵默认+2/他卸了等（裂创仍只跟注）。

爬塔收势：**每手只兑一条**；条上剩的留到下一次收势；兑空才重新 roll 一整手。意图条已标 **空** 的近战：不结算、不进回放（不占 1.6s 段）。下一条若仍够不着，改成 **抢步**。敌招段间隔 **1600ms**（+0.1s）。

验证：`test:combat` 676 + typecheck 绿。

---

## 2026-09-08 午 · 伤害口径 / 敌距 / 回放（未 commit）


手测暴露的是**旧结算漏接**，不是新机制该有的效果：

- 爬塔「斩」距 2 仍按牌面 9 打，文案却是 4；构成表另算一套。现已与拆招同一张 `saberReachDamage`（贴脸 10 / 距 2 为 4）。裂创只跟注，不计进直伤。局内 chip/预演一律「裂创」不用「流血」。
- 「埋招 +4」来自刀系被动：`foeHitLastTurn`（上回合被打中）。构成里改标 **挨打加伤**，避免和反击埋招混淆。
- 敌 `bleedcut` 以前不判兵刃距离，刀在 4 格外仍能打。现与玩家同一套 `enemyCanHitPlayerPos`。
- 敌回血/架招不再走挥刀声和打击特效；段间隔仍 1500ms。
- 爬塔收势后：先播敌招 → 停 1s 再跳裂创 → 若你眩晕再亮回合开始。眩晕层改在你收势时扣，避免敌杵晕后同一息被清掉。

验证：`test:combat` 674 + typecheck 绿。

---

- **爬塔牌面**：`labCard` 覆盖聚势/铺势/收势/搓手，不再写气脉。
- **预演 v2**：底条短句、无悬停留空；伤害构成进卡牌 tooltip（`damageBreakdown.ts`）。
- **眩晕幕**：回放含「晕」时先停 2500ms 并播报。玩家眩晕有锁手条。
- **神兵 12 路**：命中时按 `gear.skill` 分叉（震步/叠浪/破门/快刀/锁喉/三封/照影/格反/定桩/千斤/纤力/缴兵），不再一律 +2。
- 验证：`test:combat` 671 + typecheck 绿。

仍可加深：构成与 hitEnemy 尚未逐项共用记账（破绽层消耗仍只在结算里）；神兵部分效果偏简化。

---

用户要求小步=代理逐步做完验证再下一步，不要等用户点下一步。

- **验证**：`npm run test:combat` 667 绿 + `typecheck:combat` 绿。`climbUnify.test.ts` 钉 S1–S10。
- **S0** 读招入口关（此前）。
- **S1** 爬塔面伤不含 combo×2 / flow / mark。
- **S2** Lab UI/chip/预演「架势」→「格挡」。
- **S3** Lab 打击不加 mark；送手并入失位。
- **S4** 爬塔 `weave`：格挡 6 + 下张 -1，不加连势/蓄劲。autoLoadouts 仍保留 weave/finisher/gather **id**（配额 20 张不重复），未从配队库删名。
- **S5** 格挡帽 20；组合卡牌面与结算对齐。
- **S6** 15 无序连携 + 异系换人 `dealToHand`。
- **S7** ≥3 同系开战发 aura；打出后 `labAuraStrike=3` 本场攻击 +3。
- **S8** 闪/霸从馆 8。
- **S9** youStun 挡攻击；吸血/youExpose 已接。
- **S10** 剑 a 刺点抽 1；枪 a 命中 `foeRootTurns` 锁步；神兵命中 +2（文案级神技未逐条实装）。

未做完：charge→qi 全面改名；mark 字段删除；神兵 12 条差异化；预演拆解 tooltip；眩晕幕停顿；gather/finisher 牌面文案仍写气脉/铺势（Lab 结算已走势）。

---

## 2026-09-08 凌晨 · 费用回退 + 预演条恢复（待手测，未 commit）

- **「攻击费=面伤」废止**：该规则出自 `docs/combat/REDESIGN_DRAFT_20260907.md` §1.3（草案 v2 提出，用户表示未明确同意过）。`labV21EffectiveCost` 攻击牌特判已删，所有牌按牌面 `cost` 计费（爬塔仍 floor 1，「无 0 费牌」保留）。
- **卡面角标**：左上角红字恢复显示耗蓝（所有牌统一）；「劲力 N」通栏（`card-qi-cost`）已删（HTML+CSS）。
- **预演条恢复**：战斗底栏最上方 `#preview-slot`。悬停任意牌 → `previewCard` 全量预演，亮 notes（实际伤害/回血/格挡）+ 结果行（敌血/架势/落步）；非法牌亮原因（够不着/劲尽等）；无悬停常驻态势行（血/格挡/架势/劲力）。`main.ts` 的 `prev` 从 `moveGhostPreview`（仅位移牌）改为全量 `previewCard`，`paintHoverBoard` 同步刷预演条；击退/拉近牌现在也会画落点鬼影。
- 测试：`climbPreviewBar.test.ts`（新，5 例）；`labInkAssets.test.ts` 的「无 preview-slot」旧断言已反转。`test:combat` 657 绿 + `typecheck:combat` 绿。
- **效果可视化草案**：`docs/combat/EFFECT_FEEDBACK_DRAFT_20260908.md`（播报带数值 P0 / chip tooltip P0 / 落点飘字 P1 / 触发脉冲 P2），**未动代码**，等用户拍板。

手测：卡面左上角是耗蓝；悬停攻击牌底条亮伤害与敌血变化；悬停吐纳亮回血；够不着/劲尽亮原因；无悬停亮态势行。

## 2026-09-08 凌晨 · 机制审查 + 效果草案 v2（纯文档，未动代码）

- **机制总审查表**：`docs/combat/MECHANICS_AUDIT_20260908.md`——全部机制按代码现状带 file:line，含伤害流水线与 15 条「矛盾/未接线清单」（吸血未实装、破绽单向、玩家眩晕写错字段、神兵/枪a/剑a 未接线、被动三套不一致、组合卡牌面≠结算等）。等用户逐条审。
- **效果草案 v2**：`EFFECT_FEEDBACK_DRAFT_20260908.md` 已改写——事前只讲卡牌本体（伤害构成拆解 + 效果跟注，去掉双方状态行）；事中=机制停顿体现（眩晕幕 ≈2500ms、破绽播报告知加成、双向对称）。注意：v2 的预演条设计与 09-08 凌晨已落地的实现（态势行+notes）不同，**动工前需用户拍板**，拍板后改 `renderHoverPreview` + 新增 `damageBreakdown`。
- 破绽语义待用户拍板：代码现状「每击 +4 耗 1 层、仅玩家→敌」；用户记忆「敌架势越高伤越高、敌可给我方上破绽」——两者代码都不存在。

## 2026-09-08 凌晨 · 机制收编 v3 拍板 + S0 读招暂关（未 commit）

- **方案 v3**：`docs/combat/MECHANIC_UNIFY_TEAM_DESIGN_20260908.md`。爬塔为主；读招关闭；残留该删删该改改；连携 **15 无序对直写**；光环 **可更强**（≥3 同系偏晚）；敌人机制作馆梯度；原风险表改为拍板。
- **S0 已落地**：`BREAK_MODE_OPEN = false`。门厅不渲染读招轨（战役/破招新手关/训练馆/周挑战）。点击守卫。低阶教学去掉 `isBreakAlign` 误拦（爬塔门厅也能进低阶）。内核与 break 单测仍在。`test:combat` 657 + typecheck 绿。
- 下一步 **S1**：面伤公式对齐 Lab 结算（删 combo×2 / flow）。

---

## 2026-09-07 晚 · B5–B6 图鉴 + 攻略（待手测，未 commit）

- **B5**：图鉴按 **绝 / 技 / 兵**（另留状态、人物）。绝=六系绝招+收官+合招；技=其余牌+外功+心法；兵=兵器。可搜名称或 id；条目下有「本系招式」预览。门厅和战斗顶栏都有「图鉴」。
- **B6**：攻略改成五条：劲力、投喂、品阶、拆招、神兵。不再指向 RULES.md。

手测：顶栏图鉴（战斗里也能开）、搜 `ultPalm` / 兵器 id、攻略五条对得上当前数值。

---

`typecheck:combat` + `test:combat` 绿（59 文件 / 648 用例）。

- **B1 刷新遮挡**：黑市「刷新货架」挪到底栏 `gauntlet-camp-foot`（与配装/继续同排、sticky）；顶栏 `z-index: 90`，`#lab-overlay-mount` 从 header 下方起，不再盖住「全屏」。
- **B2 外功档进 sim**：`src/game/techRank.ts`。数值加成 ×(1+0.15×(档-1))；余劲携带 = 档（1/2/3）。开战经 `buildGauntletPreset` → `labMateTechRanks`。
- **B3 可视化**：chip「裂创」改「流血」；敌方补「失衡」；在场心法出 chip；战斗外功 chip 档>1 显示 `·2`/`·3`。
- **B4 将空**：意图条 pending 的空段标「将空」（不改 AI 锁队列）。

下一拨仍未做：图鉴重写+战斗内入口、攻略弹窗、敌人变招扩写。`main.ts`/`sim.ts` 不拆，等下次改 AI 再搬 `enemyPlan.ts`。

手测：客栈底栏刷新不被全屏挡住；喂到 2/3 档外功战斗数字变大；流血/心法/失衡 chip；位移离格后打击段出「将空」。

---

## 2026-09-07 · 爬塔数值/配装一批（待手测，未 commit）

已落地、`npm run test:combat` 绿：

- 爬塔气血/劲：`climbVitals.ts`。一档蓝再少约 5（输出/奶 20，盾 17、控 24）。回劲 `floor(max/3)+2*(tier-1)`，开战 75%。无 ×8。爬塔出牌最低 1 费；攻击费=红角实际出手伤。
- 心法数值已跟上档位（HP/蓝/回劲）。
- 兵器伤档 cap 0–4；神兵主=`*-a-5`、副=`*-b-5` 分别获得，配装可切换。
- 配装：仓库改名行囊；两张同名可合成（进退除外）；外功栏 3/4/5；重复外功进囊可喂养 1–3 档（**B2 已接战斗结算**）。
- 全屏设置进 `#app` 子树；门厅标题居中；播报去笺盒。
- `weaponId` 优先于 `mateWeapons` 进预设（读招精阶 3 测试不再被凡阶覆盖）。

未做 / 半截：

- 全卡重写与新机制（定身/封脉/斩杀等）未铺开。
- 图鉴/攻略未重写；战斗内无图鉴入口。
- 奖励仍会自动进牌库/主角外功（栏满才进囊），不是「全部先进行囊再拖」。
- 每人切兵器 UI 未做独立武器库。
- 卡牌绝档若换页表没有第三级则停在精。

手测：爬塔蓝条与攻击费、配装合成/喂养/神兵切换、全屏设置、读招仍 6/5/3。

## 2026-09-07 下午 · 工程门禁 / 续关 / 类型

玩法与资源包未动。冻结地图不维护。

- Pages CI：`typecheck:combat` + `test:combat`，再 `build:pages`。
- `npm run test:combat` 排除 100 局乱点（改走 `npm run test:balance`）。
- 活跃战斗 `tsc` 过：`Battle.v2BreakMomentum` 补回类型；读招开战 telemetry 参数修掉。
- 续关耗尽同馆不再补满。
- 地图 4 个生成文件加 `@ts-nocheck`（仅因 art 间接 import，不修 RPG）。

---

- 门厅/下注底空、对战底栏被裁：`#lab-content` 吃满剩余高度；战斗壳不再 `100dvh`（顶栏被重复计算）。
- 手牌「耗蓝」改「劲力」，条宽贴齐类型栏，色跟角色劲力条（宣纸金）。
- 续关耗尽后同馆购买/刷新不再补满（`climbContinue` 记 exhausted 键）。
- `gauntletUi.ts` 重复导入 `isBreakAlign` 已清。

---

## 交接提示词（复制到新对话第一条）

```
先读 `.cursor/lanes/SYNC.md`，再读铁律。handoff 是日记，不要当现行板。

这是 Openhand 的 Combat Lab / 踢馆线。地图和主线冻结，不要动 `src/map/`、`src/main.ts`、`docs/frozen/`。入口：combat-lab.html，npm run lab，测试用 npm run test:combat。

用户约定：之后动代码**不用开页面测试**，由用户手测；agent 只保证逻辑无报错（test:combat 绿）。未要求不要 git commit。
```

---

## 2026-09-07 凌晨 · 部署草案（未改代码）

- 好友慢多半是 **资源**：`public/art` 约 334MB（BGM 145MB、场景 94MB、立绘 93MB），不是 JS（gzip 约 172KB）。
- 草案见下节「部署方案草案」。

## 2026-09-06 晚 · 门厅墨字（待手测）

- `button.hall-gate.primary` 锁墨色；门厅顶栏改笺底墨字。
- 未 commit。

## 2026-09-06 晚 · 轮番不共舞（待手测）

- 根因：climb 把 `extraEnemyIds` 写成 `extraFoeIds` 同时进场。现与拆招一样进 `waveEnemyId` / `waveQueue`。
- 未 commit。手测：第 4 馆石台上只有伏草客，坂蹄头目等打倒后再上。

## 2026-09-06 晚 · 门厅减字横排（待手测）

- 去掉门厅介绍句；钮上只留「续关 / 开踢 / 无尽 / 读招…」。
- `hall-gate-kick` 改横排，收掉 0.4em 字距。
- 未 commit。

## 2026-09-06 晚 · 门厅 UI / 续关 / 无尽入口（刚落地，待手测）

- 门厅 `hall-gate` 回笺色（`#f4ead6`）+ 水墨框，主钮左侧朱条。
- 续关与开踢分行：无档续关 disabled；有档开踢文案「重新开局」。`clearClimbContinue` 只在真正 `createGauntletRun`（非无尽）时清。
- 无尽单独 aside「无尽爬塔」；`renderGauntletPathPick(true)` 用 `GAUNTLET_ENDLESS_BLURB`。
- 建议（未做新图）：无尽视觉走**更楼夜巡**，不要复用十馆城/殿雾景。
- 未 commit。手测：无档灰续关、有档分行+重新开局、无尽选线文案、笺钮不挡墨底。

## 2026-09-06 晚 · 可读 / 同道立绘 / 击杀即胜（刚落地，待手测）

- 歇脚正图不再被全局 cap 抢走。
- 赌馆注额笺、局内敌招/播报浅底。
- 同道遭遇分人立绘。
- `isBattleWon`：最后一人倒下即胜；敌招间隔 1.5s。
- `test:combat` **637** 绿。未 commit。手测：曹州歇脚图、赌馆注额、敌招字、同道三人脸、击杀即胜、招间隔。

## 2026-09-06 晚 · 地名歇脚 / 告捷 / 小本（刚落地，待用户手测）

- 告捷笺头收齐底彩与彩金；无「这一岔」页。
- `climbPlaces.ts`：三线各十处地名；营地「路程小本」。
- 叠加层 key 按屏+线+馆，赌馆/配装/歇脚不共用一张。
- `stopSting()`：离开告捷或踢馆结算即停短句。
- 生图：`scene-wager-*` / `scene-loadout-*` / `scene-place-*`。不是城内探索地图（地图仍冻结）。
- 未 commit。`test:combat` **633** 绿。手测：告捷可读、选遭遇直进营、小本有路、换屏短句停。

## 2026-09-06 晚 · 同一 IP 双玩法（已开工）

草案：`docs/combat/DUAL_MODE_SPLIT.md`。未 commit。

## 2026-09-06 晚 · 局内演出 / 续关 / 结算（刚落地，待用户手测）

- 位移鬼影只跟悬停走（`moveGhost.ts`）。
- 敌招回放按段扣血（`foePlayback.ts` + recap `hpLost`）；己方出刀石台 demo 抖动。
- BGM 换曲：先杀旧曲再起新曲；`BGM_FADE_TO_CAMP_MS` 1800。
- 赢馆结算屏 → 领赏进营地；赌约确认句 + 局内 `lab-wager-plate`。
- 营地 `touchClimbCamp`，门厅「再进营地」2 次；无尽不写。
- 遭遇底图按 kind；选完直接进营，`lastEncounterNote` 写在营地。
- 残谱下一张；战记改为本馆汇总。

## 2026-09-06 晚 · 同一 IP 双玩法（已开工）

- **规则集**：`climb`（开踢）/ `break`（读招、示范、训练馆）。`isBreakAlign()` 不再恒 true。
- **Bug**：开踢清空战役/`qiFight`；`renderBattle` 有踢馆时不画读招 UI。
- **BGM**：淡出切断 `onended`；战后回营强制 3s。下注/营地跟门厅曲，开战才切战斗曲。歌单去重（删甲=丁的 `hall_home`）；截图 11 首统一命名进设置。暂停 + 三种循环。
- **爬塔**：不跑破招核；奖励仍出谱/换页/淬刃；劲池 ×8、回劲 ×4、费 1→6 / 2→14（仅 lab+climb）；气血 ×1.81；每系第二张状态牌（聚气/血口/锁脉/蓄杆/铁桩/锁喉丝）。
- **读招**：R7 闪、R8 分格（须再用闪），共九关。
- **换页 vs 合成**：只写在草案第四节，**未做合成代码**。建议爬塔继续换页。

## 范围与命令

- 只做 Combat Lab：`docs/combat/**`、`src/combatLab/**`、战斗核 `src/game/`（sim、labV2、content 战斗数据）。
- 冻结：`src/map/**`、`src/main.ts`、`src/story/**`、`docs/frozen/`。
- 入口：`combat-lab.html` · `npm run lab`（5175）· `npm run test:combat`
- 规则真相：`docs/combat/RULES.md` · 路线：`docs/combat/ROADMAP.md` · 上架：`docs/combat/LAUNCH_ROADMAP.md`

## 用户铁律（近期）

1. **手测由用户做**——agent 不开浏览器；`npm run test:combat` 过即交付。
2. 选定方向后只做该方向，禁止反复对比已否决方案。
3. 未明确要求不要 commit / push。
4. 玩家刀 **10/4**（贴身叠 2 裂创，不是 12 秒杀）；敌刀平砍是敌表。
5. 出血税 **10%**（否决 25%）。玩家可见用语尽量不挂「破招」；代码 id 可后置。
6. **未主动开口前，不改战斗立绘尺寸（168）。** 局内不加新水墨框。石台可变宽。**预演条已恢复**（2026-09-08 用户拍板）：`#preview-slot` 常驻底栏，悬停亮实际效果；招眼条仍是敌意图带。

## 产品口径

| 入口 | 状态 | 破招 |
|---|---|---|
| **肉鸽踢馆**（10 馆） | **玩法 A · climb** | 不拆招；站位+构筑+彩金 |
| **无尽踢馆** | **打榜（肉鸽）** | 同 climb |
| **读招战役** | **玩法 B · 九关谜题** | `qiCommit`；拆错/挨打即败 |
| **周挑战** | 制作中 | — |

## 本波已落地（2026-09-04）

### B · BGM 衔接
- 进战淡入 **1s**（`BGM_FADE_IN_COMBAT_MS`）；回营淡入 **3s**（`BGM_FADE_TO_CAMP_MS`）。
- 同档再进：离开进度 **+10s**（`BGM_RESUME_SKIP_SEC`），避免复读同一段。
- 文件：`labAudio.ts`、`main.ts` `syncBgmWithScreen`。

### A · 意图整回合
- `endTurn({ deferIntentRefresh: true })`：整队兑完**暂不** `rollIntent`；播报结束后 `refreshFoeIntentsIfPending`。
- 意图条播报期仍显示本回合刚打完的全套；玩家回合真正开始才亮下一手。
- 劲尽/晕/散演出按「落空/躲过」听感。
- `RULES.md` 已记：禁止中途补招；十馆纯战斗 **18–22 min**。

### C · 时长
- 三线阶梯 `hpMul`/段预算上调；轮番替补从 **第 2 馆**起可能有。
- 文件：`gauntletPaths.ts`、`gauntlet.ts` `waveEnemyForStage`。

### UI · 配装 / 奖励
- 配装：卡更大、显风味、网格铺满中栏。
- 奖励：黑市标题居中；卡略放大；底栏按钮加宽加高，少挤。
- 文件：`gauntlet.css`。

### D · 声效（未做）
- 等用户找齐拟声素材再接；草案拟声表仍有效（回合切换 / 破让空打 / 走位等）。

## 本波已落地（2026-09-04 晚）

- **配装仓库**：底栏横排；去掉 `max-height` 空气框裁切，卡整张露出。
- **滚动条**：lab/踢馆全局米色轨 + 水墨描边拇指。
- **特效挂点**：刀光/段演出改挂石台格内小立绘；两侧大立绘只表明身份。
- **刀光**：斜向细刃（`scaleY` + 去软边）；不再粗横条糊脸。
- **BGM 叠音**：换曲前 `reapFadingOut`，打断淡出不再留幽灵 loop。
- **BGM 滴滴**：先前误裁尾部 ~36s 正常乐段。已从桌面原版恢复全曲，**只去掉末尾约 1s 伪影滴滴** + 末 4s 软淡出。门厅现约 2:44.5（原 2:45.5）。**请强制刷新**以免缓存旧文件。
- **设置 · 门厅音乐**：进度条可拖（试听尾段）；上一曲/下一曲切换 `HALL_PLAYLIST`（静门 + 三路线普档 + 读招），偏好持久化；门厅 `syncBgmWithScreen` 用 `preferredHallBgm()`。

## 未完成 / 手测

- **破招路线重拟**：`docs/combat/BREAK_DEPTH_PLAN.md`（桌面有拷贝）。主投招路图+墨痕；硬核=试验区；爬塔弱跟随；**不做馆1强制硬拆通关**。旧 W1 草案降为辅线。
- **爆款论证**：`docs/combat/BOOM_CASE.md`（桌面有拷贝）。爆点包=可剪15秒镜头，不是音量包；β墨痕浅规则；α硬核试验区；γ暂缓。
- **小步跟进清单**：`docs/combat/BOOM_SPRINT.md`（桌面有拷贝）。S1 爆点包节拍 → S2 β墨痕 → S3 热闹密度 → S4 意图状态可读 → S5 外测+15s。拍板：γ 暂缓；其余按默认。
- **开发者玩法清单**：`docs/combat/DEV_PLAYBOOK.md`（桌面有拷贝）。开工前必读：怎么玩、两种模式、战斗骨架、拆招四档、破法表、硬拆奖励、踢馆/读招流程、开发者必知。
- **定位终审**：`docs/combat/POSITIONING_FINAL.md`（桌面有拷贝）。7格是天花板不是死局；主线5–8小时+硬核无限；首发完整+成功后免费更新；名字暂不改副标强化读招；定位分层：门面热闹/里间解谜/试验室硬核。
- **路线时间分配**：`docs/combat/ROADMAP_TIME.md`（桌面有拷贝）。目前半小时够，3小时起步靠战斗翻倍+遭遇密度+构筑差异+路线反馈；90天路线：S1–S5（2周）→ P1–P4（6–8周）→ 首发。
- **下一阶段草案（已拍板）**：`docs/combat/NEXT_PHASE.md`（桌面有拷贝）。**只做江湖线，少林/朝廷封线**（界面「后续开放」）。优先级：①单局战斗（P1，最核心）→ ②肉鸽奖励（P2）→ ③营地机制（P3）→ ④黑市经济（P4）→ ⑤遭遇剧情（P5）→ ⑥UI样式（P6）。总计10–14周。每阶段有验收，不达标不往下走。
- **P1 修订·核心重塑**：`docs/combat/CORE_REBUILD.md`（桌面有拷贝）。用户不认可现有破招系统，P1 = 换骨头不是抛光。病根=「没有取舍」（对答案 vs StS 式取舍）。推荐 A 气力承诺制为骨 + C 招路图为深 + B 半隐读人做 Boss 调味 + 气势条滚雪球。原型先行：P1.0 规则 → P1.1 裸原型 → P1.2「想不想再打一场」验证（不过就回炉）→ P1.3 深度层 → P1.4 迁移 → P1.5 抛光。
- **新核心玩法攻略**：`docs/combat/CORE_PLAYGUIDE.md`（桌面有拷贝）。
- **气力承诺已落地（读招战役）**：`src/combatLab/qiCommit.ts` 为规则核；读招五关已换成拆·点 / 连拆返气 / 断蓄 / 墨痕 / 座前试刃。踢馆仍用旧空间拆招，未迁移。入口：门厅「读招战役」。手测：先点牌再点队列格，收势结算。`npm run test:combat` 绿。
- **气力×7格（只在读招）**：来招带红格；拆/架/闪须站红格；撤步/进步费 1 气。终局 `loopQueue` 循环来招（修「第3拍没牌」）；墨痕踩中再留一轮且格上显示「墨」；座前试刃手牌含进步；情境引导 `qiCoachLine`。踢馆未动。
- **座前试刃可过（2026-09-06）**：直取加伤曾在打牌时锁死，墨痕叠气势发生在收势，当拍 +1 吃不到；四拍最多 15/17，18 血必败。现改为收势按「打牌时与收势时气势较高值」加算。过关线：第1拍拆刺+撤步+攻点蓄力（6），后三拍直取（4+4+4）。`test:combat` 609 绿。
- BGM 提示词：`docs/combat/bgm-prompts/`；改进清单已降级标注。
- **本轮（2026-09-06 踢馆+读招修补）**：①后手开局会真正出招（削弱至多两段）；双方 HP 上调、伤害系数不变。②排招按投影距离，撤后够不着改吐纳/抢步，不再空挥。③末尾裁切两秒拼音 BGM 全接上；门厅甲乙丙；普精 A→B；馆间 2s 交叉淡入淡出；胜负短句恢复。④读招加 R5 气势、R6 过·存气，局内常驻气力/气势/墨痕说明。`test:combat` 绿。
- **2026-10-21 七窗包六刀落 main（未 push）**：`f888bb8` 阶段4 注册表（牌155/敌171/外功32/心法10，20 张合同红挂 CARD_HOLDS）→ `79b4d71` 音效（sfxMap 45 键 4 占位）→ `3042878` 阶段3 壳拆（main 4150→99，dom/flow/render 30 文件，删旧 src/main.ts）→ `f655067` 阶段2 规则平移（gauntlet 1844→323，rules/ 1731 行）→ `8e2a841` 测试基建（黄金 20 局+定向 11+DOM 基线，rng 必传，@deprecated 清 0）→ `9c40b24` 训练场（课表改气力承诺，qiCommitPaths 6 则）。末刀 795 绿 / typecheck 0 / 黄金 diff 空。新债记 ARCHITECTURE：gauntletPorts 单例纯度债、isBreakAlign ports 化 23 处待阶段 3 下半归并。读招实测 ruleset.mode=57（61 作废），归类沉 break 45/收 ctx 10/死分支 2。Notion 策略定调 §七 已回写。待拍：读招设计卡三件（权重 3/2/1、架势气力跨番、fork 填不填）。
- **2026-10-21 Notion 全树对账（主窗）**：用户要求 Notion 回单一事实源。裁决四项：花名册加注旧池 14 人（服务少林/朝廷线）；资源合同表改五定位（support=tank血+dps蓝，skirmish=dps全套）；卡兵功页标「目标态不作验收」；0 费跟铁律走——17 张 0 费牌定费（架×6→1、撤步/退步掌/搓手/烙口/牡丹酿→1、同门光环×6→2）+ close/plant 补牌面 + lateWard 挡 16→12，草案已写进待定清单，用户逐条确认后开核玩结算包（重录黄金基线）。已回写：待定清单 0 费节、花名册代码事实、资源五定位、卡兵功 callout、十馆节拍 2026 块（[4,7]、程1-8带2程9起3、9/10/12）、跑局经济（选项驱动、堆挡≥10）、界面设计（battleSheet 非死码、槽位格已落）、剧情遭遇页首（要求已落码，v3 降过渡）、状态词典勾两条、敌人合同快照注、行路底稿条数对账。新建并列页：[工程基建](https://app.notion.com/p/400427beba9c81f4930fd55e6481aeaf)（架构/测试/车道镜像）与[登门新设计](https://app.notion.com/p/400427beba9c8112b3bef3c3f4c0dbc0)（三番原型占位，待拍三件）。AI 评审页已整页覆盖为 2026-10-21 复评。
- **2026-10-21 晚 卡池整改方向四拍（用户拍）**：①连势家族不留通用（叠层不做进通用池，combo 系 6 张 + weave 删）②通用瘦到 ~40（共删 24）③奖励池规则先不动 ④曲线 55/55/28/12。逐张表草案：`docs/combat/CARD_POOL_PLAN_20261021.md`（删 24 / 改挂 15 / 交叉 8 / 调价 40 / 黄牌 22 / 起手 2 处；整改后 131 张，any 43）。**待办：Notion MCP 当时 error 未同步——需建页「卡池整改逐张表」到行路底稿下 + 更正待定清单 0 费节（weave/牡丹酿/烙口 改删）+ 行路底稿对账注改 131。** 用户逐条拍完后开核玩结算包（重录黄金）。诊断依据：奖励池 cardPool=本系+全量 any（系牌命中率 11-15%）；劲力经济回 4/5/6、上限 9-15、每手摸 3。盘点脚本：`scripts/audit-content.ts` / `audit-pool.ts` / `audit-plan.ts` / `audit-rarity.ts`（npx tsx 可重跑）。
- **2026-10-21 晚 方向三拍（云顶羁绊化）**：用户判卡牌贫乏，引云顶羁绊。拍：A 牌意·配装破档进第一批（B 同门羁绊/C 局定调/D 三星合成挂牌）；凡精绝落代码；与整改包并行。设计稿 `docs/combat/BOND_RARITY_PLAN_20261021.md`：配装同系 4/7/10 达档常驻被动（只放大本系主语，三重动默认 5 处标黄）；rarity 字段 common/adept/supreme，实测 凡44/精58/绝14/连携15 单列；奖励分池凡2+精1+7馆绝1槽，摸牌×3 不动。待拍：三重动默认、杂家数值、逐张 rarity、奖励构成、两包合并窗口。
- **2026-10-22 地基 9 币**：用户拍地基清单——伤/挡/血/位移/控制/叠层（一家子币，每种层单独定价）/抽牌/劲力（断劲明价）/**先机单列第 9 币**。清单暂不进框架页，等第一层旋钮拍齐统一补。先机草稿价：临时 ±1 ≈ 0.5 劲/手（失位）；常驻 +1 ≈ 1.5-2 劲/场（标黄待模拟）。
- **2026-10-22 新玩法四方向**：A 手牌阵型→行路否决、移植登门新设计页；B 击落否决（常规+不合理）；C 换人攻势→光环/连携已覆盖；D 意图条迟滞/对调挂待定（删段已有）。**石台上限低是活口**：用户原话「第七格本身不应该是墙，而是格子后面有墙」「墙刷新在谁那边」「墙的联动技能」。主窗提「格子加词条不加长度」方向：撞墙=剩余格转伤（2-3 伤/剩余格，武侠正解）、墙布局四态、裂墙同裂桩语言。最小落地=固定双墙+撞墙伤害。撞墙若落地，位移币（0.5 劲/格）复查溢价。讨论中，用户未定。
- **2026-10-22 晚 底层翻新拍板**：用户拍 **9 格石台**（「9完全认同，总体要奇数格子」）+ **格后单墙**（否固定双墙：「不对称设定其实是特色」，一侧有墙侧向可变，换位策略因此升值——推系要墙在敌后、拉系要墙在我后）+ **铁律/游戏底层全部推陈翻新，从铁律开始改，再一个个排版**。撞墙现状代码实证：拳外功 t2「撞壁伤+3」（`labV25Constants.ts:49`、`labResonance.ts:186` 只查 palm）；UI 现状第 7 格渲染成墙（`prodBattleUi.ts:153`），要改成格子站人+格后墙。9 格推算五条：占用 4/9 vs 4/7、9=2×4+1 枪贴边正好到中心、奇数有中格、中心到墙 4 格=两牌连招、TTK 不破（初始距离参数化）。**铁律已改五处**（标题、§1.6、§2 石台、§2 九币、§5 注）。下一步排版队列：RULES.md 石台节 → 框架第一层拍齐 → 待定清单归位 → 合并落码包。
- **2026-10-22 晚二拍**：①撞墙转伤**先不定**——用户不打算六系全给墙联动：拳（已有撞壁伤）/钩/棍/枪可联动，**刀剑不做**（特征不均质=系格）。②**第七系兵器立项**：弓/飞刀（名待定），超远射程（9 格板启用），用户亲刀核副；主窗参考思路已给：射程带 5-7 贴身死区（带区谱 1/2/3/2-4/5-7 每带一主）、核候选=瞄准蓄力（攒层爆发）或钉（移动封锁，与断劲并列打资源）、副候选=标记/箭雨落点/透甲、底速 4、飞刀比弓箭更武侠且延展暗器家族、combo 图（弓+拳击退维距/弓+钩保镖/弓+棍桩牢笼/弓+换人呼吸）。③铁律又改三处（石台条撞墙先不定+联动名单、七系条、底速注）；RULES.md 同步三处（头部翻新记、石台行、核副表后七系占位）。④拿不准待用户拍：初始距离参数化（枪敌远开/刀敌近开）未写入文档。⑤汇率 9 格修正进第一层（位移单价复核+射程升值）。落码排序：第七系内容排在数值包之后。
- **2026-10-22 晚三拍 飞刀定稿要素+分工**：飞刀=双形态（近身近战/远距远战按距离换形）、射程几乎全板、无死区（贴脸可用伤害压低，用户原话「带死区玩起来卡手也不合逻辑」）、轻而快（蓄力因此不给飞刀——蓄力另安旧兵器未完善特色，待定）、特色待选毒/钉。用户确认工程量大没问题（架构已升级，防的就是大整改）。**分工三桶**已定并进 SYNC：主窗自理（汇率修正/工具链 spec/文档/当量推演）、用户辅助（拍数，主窗出建议+选项）、用户亲刀（飞刀核副/六系/蓄力安放/文风/铁律）。P0 第一层汇率+工具链 → P1 第二层蓝条+飞刀核副 → P2 敌曲线+层帽 → P3 经济/蓄力/撞墙词条/飞刀落码。设计观察：双形态本身就是飞刀「核」的强候选（别系没有），副=毒或钉——留用户亲刀。
- **2026-10-22 晚四拍 棍系核副改 + Notion 统一**：棍 桩+裂桩移出系机制（用户：「不是设计不好，是太突兀」），核改**蓄力**（蓄力安放问题由此收口）；桩降为特定角色个人特色（归属角色/纯装饰或带效果——待拍）。刀=上手向简单定位（不动）、枪=已完整（不动）。用户确认 Notion 是单一数据源要统一：底层相关的旧数值/节奏全部降级快照，剧情类不动。行路底稿已加翻新总注 + 「待拍清单」节（亲刀 6 + 辅助 6，todo 可勾），用户将逐条说明。铁律 §2 核副/§5 桩帽注、RULES 头部/棍行/桩注已改。待拍 12 条：①棍副 ②蓄力本体 ③桩归属 ④飞刀核副 ⑤撞墙解封 ⑥意图条动词 ⑦第一层汇率 ⑧第二层蓝条 ⑨初始距离参数化 ⑩墙侧规则 ⑪三四五层 ⑫牌意动帽。
- **2026-10-22 晚五拍 快照机制**：用户嫌单源冗余，定「快照（旧设定封存）」页（行路底稿下，[link](https://app.notion.com/p/401427beba9c81eba66bfee04425e34a)）：被顶替的旧设定打包存入（标日期+顶替者），可取出复活。首批移入三页（状态回收/卡牌回收/待定清单）+ 12 条换下条目入表。底稿尾部重整「现行改革+快照」两段。待办：底稿 12 导航页的退休路径（机制四页纯重复最肥，主窗已报合并图，等用户挑哪些现在退）。注意 Notion API 坑：新建子页的 <page> 块自动落在父页末尾，update_content 不能用 URL 新加 page 块（只能搬既有块）；引用用普通链接。
- **2026-10-22 晚 退休执行**：用户全选四页——定稿先后/战斗骨架/六系机制/资源合同整页退休进快照（二批），底稿导航节空标题已清、留下退休指针。快照页封存清单已补二批注。底稿 12 导航页现状：退 4（0/1/2/4），留 8（3 状态词典改桩词条 / 5 花名册 / 6 敌人合同 / 7 卡兵功 / 8 道具符 / 9 经济 / 10 节拍 / 11 遭遇接口）。
- **2026-10-22 晚六拍 底稿重排**：用户要「排版厘清、不太花哨、重复不用有」。replace_content 整页重排：页首真源声明 3 行 → 愿景（朴素段落）→ 待拍清单 → 现行改革 → 设计页（重编号 1-8）→ 库存表 → 快照；删同步记事/退休注释/梳理口径/重复说明/空段。**事故**：愿景 callout 被此前某次 update_content 静默吞掉，本次发现已恢复；教训——Notion 搜索替换可能丢富块，大改后 fetch 校验。17 个子块（8 页+3 页+5 库+1 快照）全部保留。
- **2026-10-21 夜 数值授权升级**：用户明确「六系机制我亲刀，数值都没细定过，你完全可以重新定，现有数值也可商定重定」。四锚已拍：时长（杂兵 3-4/精英 5-6/座前 7-9 手）、血条维持方案 C、**费用 1-7 + 蓝条上涨 + 职业蓝条差异化**（用户亲笔方向：拉开区分度不过 10、成长凸显、职业蓝条定位不同）、赢面熟手 3 局通 1。[数值框架](https://app.notion.com/p/400427beba9c810696c6d0057a419b13) v0.1 已建（20 旋钮待拍，工作稿 `docs/combat/NUMERIC_FRAMEWORK_20261021.md`）。流程定为：拍旋钮 → 牌面生成器重填 → 模拟器验证 → 合一包落码。整改表调价列作废。Notion 已同步（MCP 恢复后补完）：[卡池整改逐张表](https://app.notion.com/p/400427beba9c812898dac21da5394590)、[牌意破档与凡精绝](https://app.notion.com/p/400427beba9c81c083c0de98748b9e1b) 建在行路底稿下，待定清单 0 费节已加更正（weave/牡丹酿/烙口 改删）。
- **2026-10-22 深夜七拍（棍/飞刀定稿 + 职业重构 + 环境词条）**：①棍副=**击退**（距 3，补拳击退需贴身的限；拳=叠层靠墙爆发、棍=主动蓄力输出）。②蓄力本体=高挡沉淀：回合内出指定牌、不攻击叠层，指定回合爆发；非自动、靠手牌选择；挨打叠层类技能后话。③桩=新职业「**桩师**」特质（用户原话是桩师不是装饰）；**现有职业全部推翻重设**；规则=**核副跟武器不跟职业**（职业=特质+身板，武器=牌池+核副，角色=职业×武器）。④飞刀核副定稿：核=双形态（敌距 1-2 近战/3-6 远战、**无距离衰减**）、副=**钉**（每层减敌下次位移 1 步、可叠：敌三连位移每步 2 封 3 层→走 3）；毒不进核副（走道具/心法/外功）；**底速 9 全场最快**。⑤撞墙分工：拳=连击层一次性爆发（已有）、棍=扣血+晕段、枪=回马枪（待定）、刀剑不做。⑥初始距离=按关卡分配/随机（只分左右）/剧情场景站位。⑦环境词条=石台重点方向：灼烧格、无墙场、格数缺省（末端/中间缺格）。落文档：铁律（核副条+职业条新增/七系条/底速 9/石台条）、RULES（棍行/桩注/飞刀注/底速行/石台行/翻新记）、底稿待拍清单勾 1-4、9、10 并新增 13 职业重构、14 环境词条、快照 +4 行、框架第二层蓝条表加职业重构注意、SYNC 三处旧口径已修正（棍副旧桩效果勿施工）。主窗欠债：汇率 9 格修订版（一手锚+标尺牌+位移 0.4+蓄力利息，已在对话给出待拍）、职业×武器配对思路（已给出待拍）。
- **2026-10-22 深夜八拍（时间总盘/血条/位移佐料/羁绊轴）**：全局 **40 分钟 = 前 10（馆 1-3）/ 中 15（4-6）/ 后 15（7-10）**；用户自算前期一局 3 分钟左右，思考时间够。前期增厚：杂兵 3-4 手→**4-5 手**（用户怕太薄；中后期不动，深度够）。血条区间拍：**前 40-60 / 中 80-100 / 后 ~150**（替方案 C 现值锚）。位移泛用化：位移 3 格牌入池 + 位移作佐料融入攻击/挡/状态牌（9 格板空间），背书位移 0.4 劲/格。**回合限定**：杜绝又臭又长（空回合防治：初始距离 ≤5、位移密度、敌逼近义务、空手率 <5% 监控）。**羁绊轴**：用户问光环/羁绊按武器/职业/人名哪条轴——人名肯定不对（不保证刷到指定同道）；主窗建议全轴统一跟**武器系**（与核副同轴；职业=身板层不做构筑轴），连携现行按人名=旧轴，改挂武器系待拍（15 张重写时落）。落文档：RULES 时长行改 40 分钟三段+血条、核副表后加羁绊轴注+回合限定注；SYNC+handoff。**Notion MCP 曾掉线，恢复后已补完**：框架页锚点①②⑤+馆 1-3 行 100-125+参考系 HP 数字、底稿待拍 7 注+新增 15 羁绊轴/16 前期增厚细化。
- **2026-10-22 深夜九拍**：①连携改挂武器系 ✓——牌意/光环/连携全轴统一武器系，连携旧人名轴作废、改 = 换入同系角色触发，15 张重写同包落。②前期增厚拍定 **4-5 手 + HP 100-125**。RULES/SYNC 已改拍定口径。
- **2026-10-23 派发两包（额度收口，只派已锁）**：①核玩 `docs/combat/BOARD9_TASK.md` 行路 9 格+格后单墙（登门仍 7、两端撞墙；`makeBattle` 形参不改）。②测试 `docs/combat/CLIMB_SIM_TASK.md` 只新建 `scripts/climbSim/`。未派：汇率落牌、职业、飞刀、环境词条、蓄力牌面。
- **2026-10-23 深夜 扩到四包并行（用户要超大任务量+自由发挥）**：新增三窗 + 原有两窗，共四包并行，文件零重叠。核玩一 9 格结算 `BOARD9_TASK`；核玩二 卡池重排+凡精绝 rarity+连携挂轴 `REGEN_TASK`（131 张、拆 cards.ts 按系、rarity 三档字段、删 24 改挂 15）；UI 9 格视觉+格后墙+三环境词条空样式 `UI9_TASK`；音频 七系+蓄力+撞墙+环境 SFX 键位总表 `SFX7_TASK`（新占 ~13 键全挂现有四占位）；遭遇 环境词条 9 事页+3 死亡评论+闪句+站位叙事钩子 `ENCOUNTER_ENV_TASK`（数值全占位 X/?，过文风铁律）；测试 数值模拟器 `CLIMB_SIM_TASK`。硬边界写进 SYNC：sim.ts 只核玩一、content 只核玩二、UI 只渲染、音频只 sfxMap、遭遇只文案、测试只 scripts。仍不开工：汇率落牌、职业、飞刀内容、灼烧/缺格数值、蓄力牌面、连携换人结算。
- **2026-10-23 深夜 默认化 + 选项入 Notion（用户：能默认的全默认，不能默认的做成 Notion 选项+自定义，别拦他、别与六窗互斥）**：第一层 10 旋钮全默认生效（伤5/挡6/血4/位移0.4/控制1.5/抽1；叠层2、先机0.5+1.75、蓄力利息25%、钉0.2 标黄待模拟回拍）→ 第一层默认收口；第二层默认收口（回劲 5/6/7、开局 6/8/10、身板轴三维蓝厚+2上限+1回/血厚HP+20%/快热开局+2，职业表亲刀后按三维映射）；第三层敌 HP 默认收口（100-125/195-235/253-305/400-520）。机制侧默认：牌意三重不动、灼烧=回合结束站扣X、无墙=两端停边格、缺格=不可站可跨过。亲刀挂起 4 项（选项已写进 EXCHANGE_V2 §7.2）：枪回马枪（A断劲3→6推荐/B真伤8/C换位反刺）、钩撞墙（A噬血立结推荐/B缴械+1息/C不做）、意图条动词（A只迟滞推荐/B都进/C留登门）、环境首批（多选：灼烧推荐/无墙推荐/缺末端/缺中间）。**Notion 待拍清单 5/6/7/8/11/14 六处更新因 MCP 掉线未落，内容同上，恢复后按 EXCHANGE_V2 §7+§7.2 同步（7、8 勾掉标默认收口，11 改「三默认/剩四五」，5/6/14 写入选项）**。
- **2026-11-02 待拍 20 职业模型拍定（部分）**：职业 = 角色身份与技能来源，每职业一个桩师级独特机制（不做数值皮）；技能可进阶（道具/剧情解锁）；同职业不同角色技能不同；**获得维持随机不设必得**（推翻主窗固定节点建议）；**角色 = 职业 × 武器 × 身板定位三轴**（身板与职业内在反馈不绑定）。**桩师 = 场地标记（落桩挡路）→ 进阶解锁裂桩爆炸**。剩数量：主窗建议首批 4 = 桩师 + 相士（看相/情报层）+ 赌徒（加注/经济）+ 刺客（隐匿/意图条），身板定位轴三档：术士（蓝厚脆）/武夫（血厚稳）/行者（快热散）。铁律 §2、RULES 已改三轴模型。
- **2026-11-02 待拍 27 拍定（飞刀内容包）**：①牌池 = **双形态双含**（一卡含两形态，按距离形态呈现，不分两套）②档差 = 钉层数与触发宽；**反应窗强化分包给外功 + 部分职业/缘分**（如刺客），兵器档差不做窗强化（铁律反应窗条已改）③飞刀连携不单独做，随缘分谱并入 ④毒 = 三层各一（道具淬毒/心法毒经/外功毒功）。**缘分连携生成规则**：按接收者当前武器系动态生成对应系牌，覆盖其武器谱全集（映射表 = 两人武器谱并集，进 29 ④）。机制队列 19-27 全勾，剩 28 数值阶段 + 29 武器谱细则。
- **2026-11-02 待拍 26 拍定（开局细化）**：①界面 = B 翻牌式（仪式感）②武器卡内容 = 系名+核副一句+起手牌组预览+底速 ③开局就自取名 ④职业道中得 = 固定节点三选一事件可拒绝（节点固定、内容随机三职业选一，与「获得维持随机」一致；位置初值第 3 程随 28）⑤18 人池每程抽选、同系不限。
- **2026-11-02 待拍 23 暂拍 + 连携废除 + 武器解绑**：23 动词谱五件全收（暂拍，后按实际修改；对调死、读破归敌方窗）。**连携废除（用户拍）**：职业与缘分上岗后连携就业消失——卡池类目取消，效果并入缘分（特定缘分组效果 = 换人后下一个人卡库 +1 张指定连携牌）；15 张大部分删、少量留作缘分指定牌；bondSchool 字段退役。**武器与角色解绑（用户拍）**：武器不跟角色默认；角色有 3-4 种武器谱，玩家主动装备；配装只装当前武器卡，换武器自动弹出不符卡需重新配装；武器自带基础卡保底。新增待拍 29（武器谱表 / 换装时机推荐仅馆间 / 基础卡构成 / 连携 15 张处置名单，均主窗出稿）。铁律 §2、RULES 已落。
- **2026-11-02 待拍 22/24/25 拍定 + 刺客改拍**：22 情报 = **三层显示结构**（常规 = 架势聚合 / 亮招 = 顺序+类型按段解锁，基础前 3 段可买更多、底细 = 牌库级永久全亮 / 亮虚招 = 虚招还原，命门档 + 相士进阶同属）；顺序从永远隐藏改为默认隐藏可解锁=商品。24 敌方反应窗 = **精英馆起 + 座前必有，杂兵不给**；战前提示：教头原型带窗（风声可见）、命门亮具体窗。25 虚招 = 完全同形 + **虚招里的招不能被反应窗自动获取**（情报价值凸显）；反制链 = 亮虚招情报 / 刺客 / 读懂。**刺客改拍复活**：放弃「隐匿」概念，改 = 反应窗加强型职业（基础：对所有招含虚招可用反应窗；进阶：主动技本回合窗极大加强）。23 已按 24/25 修订（五件：迟滞/连环/蓄爆/墙崩/虚招；对调死、读破移归敌方窗），待用户拍。过招系统页与反应窗页已同步。
- **2026-11-02 待拍 20/21 定稿**：20 职业体系——三轴角色（职业 × 武器 × 身板定位：术士/武夫/行者）；职业 = 稀有身份首批 3（桩师场地标记→进阶裂桩爆炸 / 相士看相→进阶主动看破虚招 / 赌徒回合开始加注近乎抛硬币→进阶出千必正且奖升）；刺客保留（敌读招规则系统须完善后补）；进阶全主动；获得随机；**不配职业者给缘分**（特定对/群像/旧怨，初识→同路→生死；人物叫缘分、武器叫牌意）。21 前期钩子——渐进教学：大部分词条逐步体现非全部；馆 1 纯战斗、馆 2 墙侧、馆 3 灼烧格。待拍 19-21 全勾。
- **2026-11-02 待拍 19 拍定（牌意三重动帽）**：①棍三重按蓄力重写（新核副蓄力+击退），桩相关内容全部移交桩师职业（随待拍 20）②五方向保留：裂创帽/破绽帽/断劲/噬血/钩拉近上限——**数值随 28 全部重定**（不沿用旧默认）③钩瘸跛 = 被钩拉回状态的命名，**非机制翻新**（噬血梯度撞车消解）。落：待拍 19 勾掉、牌意破档页口径、RULES 反应窗表钩行、REACTION_WINDOWS §5、BOND 稿棍行改蓄力。
- **2026-11-02 剧情策略拍定**：用户亲玩影之刃零（战斗好、剧情全网摇头「老网文网游风」），定剧情策略——总目标「战斗让人进来，剧情让人记住」；我们是文字原生游戏，文字纪律 = 战斗系统。五条总纲：每句话都在场 / 每个选择有牙 / 世界观露一角不讲授 / 死了有余韵（死亡评论 + 重打读懂）/ 开局三馆当门面。战斗借鉴五件：鬼步三重奖励（位置权重第一）、反应窗演出差异拉开档、资源攻防同池显性化、换人回劲（职业设计空间）、敌蓝归零破防窗口。雷区避雷针：喊口号 / 设定倾倒 / 两张皮 / 角色一个腔 / 第一印象定评分。立卷设计页 11「剧情策略」（40c427be-ba9c-819a-a07a-f40fa81cee38），北星加指针，新文案即日起按五条验收。
- **2026-10-30 整理收口 + Notion 立卷**：反应窗专篇 `docs/combat/REACTION_WINDOWS.md` 落盘；Notion 八设计页页首加「拍定补充」块。随后用户明确「Notion 是单一事实源，亲刀内容转规范并逐一落实，落实差不多再落码」——新建设计页 9「过招系统」（四层结构规范稿）与 10「反应窗」（七系插入技规范稿，id 409427be…6c0d / …d070），挂入底稿设计页；待拍 18 勾掉；待拍 21 口述原文迁出（规范稿在页 10，原稿归档快照 toggle）。**流程定型**：亲刀口述 → 主窗规范稿立卷 Notion → 待拍勾掉 → 原稿归档快照 → 落实差不多再落码。
- **2026-10-30 整理收口（用户要求先完善再开新）**：反应窗专篇 `docs/combat/REACTION_WINDOWS.md` 落盘（定位/通用规则/七系逐件/设计原则/语义场边界/敌方三件/落码状态/开放问题八节）；Notion 八设计页页首加「拍定补充」块（状态词典/敌人合同/卡兵功/跑局经济/十馆节拍/花名册/牌意破档/道具符/遭遇填皮——九页里八页，牌意页含羁绊轴+rarity+杂家默认）。
- **2026-10-29~30 反应窗家族 + 定位拍定**：①待拍 21 勾掉——用户在 Notion 亲刀七系插入技全文：枪回马（修订：血 <50% + 背墙 + 敌冲至 2 格 → 拒 3 格 + 瓦解本回合全部位移；机制核旧落码版待改）、拳截拳（打断蓄力清零 + 基础 1 费伤）、飞刀断息（打断单纯回复，伤 = 预回复量，回蓝扣等量）、刀弹反（贴脸每受击 2 次第 3 段弹反）、剑偷势（敌叠层系 + 我未叠 → 层转剑势）、钩瘸跛（向外位移拉回 + 新状态，瘸跛 + 缴械 → 吸血 50%×2）、棍透棍（敌有挡再加挡 → 真伤按挡层数，可憋）。UI = 圆窗 + 边沿进度条 5 秒（建议设置档 3/5/10）。②**定位拍定（10-30）**：中核不是点缀，爽点四柱之一；数量封顶 / 改造打开（反应窗流构筑身份）/ 对等补齐；勾引维度（前半局勾引后半局惩罚）+ 三重奖励检。落：RULES 反应窗家族条、铁律 §2、INTENT §3、北星。待改：回马旧版参数、命名三件（断息 / 偷势 / 瘸跛）、数值 TBD 随第四层、瘸跛与旧噬血并存为默认。
- **2026-10-26 北星对齐（用户确认主窗定位稿并 refined 三处）**：①登门 = **正名之作**（强策略、为「肉鸽like」标签正名打口碑、资源配装装备不走肉鸽、类黑神话纯 Boss 战模式；现安静放置，行路完善后定独立硬核点）——不是暂缓素材库。②节奏宣言 = **慢速高质**重塑核心骨架，骨架立住再灌剧情灵魂，当前方向完全正确。③玩家假设 16+：不怕内容多，只要条理清晰、上手两遍即懂；爽点多元（表现 / 构筑成功 / 猜到招数）。④终极目标：做好的游戏，不是合格的捞钱品。北星已落 Notion 行路底稿页首；铁律 §1 加登门定位条。
- **2026-10-25 枪钩墙定稿 + 意图方向**：①开局方案 A 拍（待拍 17 勾）。②**枪 = 背墙回马枪**（用户认可主窗背墙框架后自定细节：后手+背墙，敌位移逼近至 2 格弹判定窗，耗蓝 X → 敌停 2 格+废剩余全部位移；**首个出招中途插入的反应窗**，用户称这才是「过招」不是你一拳我一拳；与隐藏意图搭配、敌我以后也有反应窗）。③**钩 = 背墙抡撞**（用户定：背墙+敌贴身「墙-我-敌」一线，拉近变抡撞=换位+撞墙伤+视为成功拉近，缴械后噬血链照旧）。④意图条方向拍：要大创新、要活、倾向隐藏、拒绝隔靴搔痒；全明全隐都否；结构待拍 = 主窗三层提案（L1 架势亮类型+段数 / L2 反应窗 / L3 读懂本场内越打越明）。落：铁律 §2 撞墙分工、RULES 石台行、MECH 卡 P4 墙联动包（含反应窗=结算新能力，敌段中途暂停-选择-继续）、待拍 5 勾/6 更新。
- **2026-10-25 自由度方向 + 开局题（用户拍）**：①设计大方向入铁律 §3「自由度」条——保底供给、解法归玩家；系统短板用供给保底（默认配装含解/奖励密度），禁固定化解法；平衡数据先问玩家手里有没有解。主窗「前期距 4」默认**收回**，距离不动仍 ≤5，改走供给保底三条（默认配装 ≥1 位移/可及、前期奖励位移密度、模拟器策略升级会用位移——夜校拳空手率 100% 一半因自动手摸到进步 0 出）。②开局：舍弃七选一改**七抽三**（随机性与剧情一起走）。方案 A（主窗推荐）= 开局选武器系、主角固定可自取名、18 人全进后续同道池、职业道中得；方案 B = 7 抽 3 个一阶角色、后续 12 人抽。已进待拍清单 17（亲刀）。
- **2026-10-25 验收（十窗全收，树全绿）**：`test:combat` 81/858 绿、typecheck 0。10 报告齐：BOARD9（9 格+单墙+站位参数化，board.ts 几何，组局唯一 mode 分叉）、REGEN（155→131、rarity、按系拆库、bondSchool）、UI9（9 格墙标 .board-wall、env 三 class、HUD 五处、noOverlap 4→12）、SFX7（46 语义键+17 新、挂账 9 键已接、待 hook 清单）、ENCOUNTER（9 事页+全库文风翻新+envTag 路由+proseLint）、CLIMB_SIM（平台五阶段）、CLOSEGATE（46 红复核为 A 已绿；B 类一条=mend2 清裂创方向）、SIM_NIGHT（首校准：通关率 0/10、敌血出锚馆3 202/馆6 284/馆10 746、手数锚先别拍、破绽建议另开行打中 4、108 张未摸=起手牌组没走到、模拟器未接 applyLabEnemyKit）、STORY2（48 条事页、lint 0）、SHELL2（六屏大修；图鉴缺敌人册+cost/school/damage/cap 字段）。主窗两条默认（可覆盖）：mend2 清我方 youBleed、开局距馆序 4/4-5/5。117 文件未 commit 等统筹；Notion 挂账全补完。wave 2 未开工（MECH/NUMGEN/BOND/UIFOLLOW 卡已备）。
- **2026-10-23 深夜 主窗自领超级任务《地基全书》**（用户：「你也别闲着」）：数值框架设计侧全做完，不等六窗。①汇率第一层全定稿已出 v0.1：`docs/combat/EXCHANGE_V2_20261023.md`——一手锚（25 当量/手）、标尺牌制度（1-5 费白板 ±15%）、九币全表 v2（位移 0.4 修订、裂创标黄注「层数不衰减则低估 50%+」）、新机制入价（钉 0.2/层、飞刀射程 1.8-2.4 劲、蓄力利息 20-30%/手、撞墙分工价、环境词条馆级价）、二三层衔接公式、敌 HP 反推草案表、待拍旋钮 10 个、生成器 spec 五点。队列：②二三层细化 → ③职业重构设计稿（亲刀选项包）→ ④飞刀内容稿 → ⑤环境词条体系稿 → ⑥生成器 spec。Notion 第一层旋钮 9（0.5→0.4）与 callout v2 指针因 MCP 掉线待补。
- **2026-10-23 深夜 六卡全升 MEGA 版（用户嫌任务量小）**：六张任务卡重写为多阶段产品线。石台 2.0（P1 9 格单墙 → P2 站位参数化含 wallSide/openingDist 字段 → P3 全位移定向测试矩阵 → P4 黄金重录+影响报告）；卡池 2.0（P1 155 张审计脚本+报告 → P2 整改全落 → P3 rarity+bondSchool+按系拆库 → P4 图鉴文案同步过文风 → P5 五断言+四审计脚本对账）；战斗板 2.0（P1 9 格墙 → P2 环境视觉语言空样式 → P3 HUD 可读性大修五处 → P4 noOverlap 自动化守卫 → P5 DOM 基线）；声音地图（P1 sim 全事件只读审计 → P2 七系新键占位 → P3 接线补全含 SYNC 未接 9 键 → P4 BGM 互斥回归 → P5 总表文档）；叙事 2.0（P0 基线盘点 → P1 词条 9 事页 → P2 全库 storyBeats 文风铁律逐条翻新+台账 → P3 envTag 路由 → P4 proseLint 机器守卫 warn 制）；平衡工作台（P1 基础指标 → P2 六系策略库 → P3 十馆整局带伤过馆 → P4 旋钮 sweep+markdown 报告+牌使用率 → P5 --check 阈值门）。硬边界增补：dom/bindDom* 归音频、render 归 UI、scripts 三目录分属三窗。开场词沿用（任务卡即口径）。
