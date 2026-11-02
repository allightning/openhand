# 表现壳二班报告

2026-11-02。任务卡 `UIFOLLOW2_TASK.md`。设计页 9「过招系统」、页 10「反应窗」。

开工先跑 `npm run test:combat`：82 文件 / 869 绿。收工再跑：85 文件 / 907 绿。`npm run typecheck:combat` exit 0。未 commit。未开页面。未改 `src/game/**`、`dom/bindDom*`、`storyBeats`。

画面在 `src/combatLab/render/guashowHud.ts`，战斗页从 `prodBattleUi.ts` 挂上。断言在 `render/guashowHud.test.ts`（16）和 `noOverlap.test.ts`（12→13）。

## 1 意图聚合条

战斗页意图带不再调用逐段亮出。六类常驻：伤势、进势、退势、守势、蓄势、诡势。每类一枚定宽 chip，段数写在后面，零也留着。

- 局上有 `stanceBoard`：`data-stance-source="field"`，按板上的架势计数。
- 没有板：用过招核的 `buildStanceBoard` 按当前意图现算，`data-stance-source="placeholder"`，不写回对局。
- 蓄势段数大于 0：chip 上写「他在运气」，图标缓慢涨缩。
- 诡势：名字旁边只有 `?`，不写招名。
- 虚招还没还原（`feint` 且 `feintShown` 不是真）：这一段计入诡势。还原之后计入板上的真架势。
- 敌段回放：已打完的段（`foePlaybackSegIdx` 之前，或命运是拿掉）从计数里减掉。灰留的段还在，chip 上多一个「灰」。血、挡、位移仍走原来的回放，这一条只改计数。

`labV2Ui.renderFoeIntentStrip` 还在，给旧的单测用。战斗页不再画它。

## 2 反应窗圆窗

场上挂着 `reactionWindow` 才画。圆圈在石台正中，绝对定位，不进入横排，不撑阶段条（阶段条仍是 1.7rem）。边沿一圈按秒数转完。圈内是招式名和 `耗蓝` + 窗上的 `cost`。

七个已落的 kind 用过招核那一列名字：回马枪、截拳、断息、弹反、偷势、瘸跛、透棍。不认识的 kind 原样显示。

秒数没有字段。默认 5。三个按钮写 3 / 5 / 10。若画面钩子 `reactionSec` 正好是这三档之一，用那一档，并标 `data-react-sec-source="field"`。否则 `placeholder`。

窗开着时，石台和立绘的动画暂停，进度圈继续走。这一帧的血和站位不在这里改。

成功演出只认画面钩子 `reactionLanded`。为真：圆窗收起，敌方小立绘加 `lab-react-halt`（动画停住），石台加 `lab-board-shake`（震一下）。这个字段不在 `Battle` 上。现结算默认不把窗留到渲染，所以正式对局里圆窗还出不来。接、放、秒数按钮没有点击。接线归音频的 `dom/bindDom*`。

## 3 亮招 / 亮虚招 / 读懂

亮招行跟在聚合条下面，一段一个节点，中间是箭头。

- `stanceRevealN` 是数字：下标小于它的段亮类型，其余是 `?`。`data-reveal-source="field"`。
- 字段没有：整行 `?`，`data-reveal-source="placeholder"`。
- `feintShown` 且该段 `feint`：这一段翻成板上的真架势，带 `is-feint-flip`。`data-feint-source="field"`。
- `feintShown` 但板上没有虚招段：行尾写 `?→真`，`data-feint-source="placeholder"`。
- 读懂：`readMoves` 有键就在播报区亮动词（打击、逼近、绝招……）。键里没有伤数字，所以不补数字。没有名单：`data-read-source="placeholder"`，不显示假名字。

回放时已打完的段不留 `data-intent-idx`。还在的段保留原来的下标。

## 4 环境

`boardLayout` 先读 `envTag`，没有再读旧的 `boardEnv`。

| envTag | 条上的 class | 来源标记 |
| --- | --- | --- |
| burn | env-burn | data-env-source="tag" |
| nowall | env-nowall | 同上 |
| gap_end | env-gap-end | 同上 |
| gap_mid | env-gap-mid | 同上 |

缺格：局上有 `gapCells` 就点这几格；没有才按末格 / 中格占位。灼烧：`burnCells` 里的格加 `env-burn-stand`。

灼烧跳血的闪只在两件同时成立时加上 `env-burn-due`：阶段条文案含「结束」，并且不是敌段回放。出招那几帧不闪。血条不在这里改。

## 5 蓄力、钉、双形态、牌意

- 蓄力条读 `chargeStacks`，宽度用 `CLIMB_CHARGE_CAP`。到帽写「爆发就绪」。没有层就是 0，不编一个层数。
- 钉 chip 读 `foePin`。0 时节点还在，藏起来。
- 飞刀当前形态没有字段。画面钩子 `dartFormNow` 为 melee / ranged 时点亮近或远。人拿的是飞刀、钩子没有：近和远都亮着，`data-dart-form="placeholder"`。不是飞刀：节点藏起。
- 牌意 4 / 7 / 10 在战斗 chip 和配装屏各一排。没有 `cardIntent` 时三档都空，`data-card-intent="placeholder"`。钩子给了数字，达到的档加上 `is-met`。

## DOM 断言

`render/guashowHud.test.ts`：

- 两记打击、一段逼近 → 伤势 ×2、进势 ×1，条上不出现伤害数字 11。
- 蓄势出现「他在运气」；诡势只有未知标记。
- 写了 `stanceBoard` 就按板画，不再用队列现算。
- 回放打完第一段：条上没有 `data-intent-idx="0"`，还有 `1`，伤势剩 ×1。
- `stanceRevealN = 1`：第一段「伤势」，后面是问号。字段删掉则整行问号。
- 虚招还原翻成伤势；只有 `feintShown`、没有虚招段则 `?→真`。
- `readMoves: ["strike"]` 在播报区亮「打击」。
- 有窗：圆窗、回马枪、耗蓝、3/5/10、触发帧 class。`reactionLanded`：硬停 + 石台震，窗不在。
- `envTag` 四值进 class。结束拍有 `env-burn-due`，出招回放没有。
- 蓄力到帽、钉 ×2、近战点亮、牌意 7 点亮 4 和 7。缺字段时不出现「爆发就绪」和 `is-met`。配装屏有 4/7/10。

## noOverlap

`noOverlap.test.ts` 新增「聚合条六类和圆窗按钮各自换行，圆窗不撑阶段条」。

- 六枚 chip 按 `--hud-intent-w` 在 640px 里换行，两两不相交。
- 圆窗五个按钮（接、放、3、5、10）按动作钮宽度在 176px 里换行，两两不相交。
- 这些 id 不进底栏动作行。
- 样式：圆窗按钮 `position: static`；圆窗本身 `position: absolute`；阶段条高度仍是 1.7rem。
- 原有的手牌、动作钮、壳屏六组守卫还在。

## 还没接上的字段

| 画面要的 | 现在 |
| --- | --- |
| 聚合 | 有 `stanceBoard` 用板；没有就现算并注明 |
| 亮招段数 | `stanceRevealN`。没有则整行问号 |
| 亮虚招 | `feintShown` + 段上 `feint`。对不上则 `?→真` |
| 读懂 | `readMoves`。没有则播报区空 |
| 圆窗秒数 | 无字段。默认 5。钩子 `reactionSec` |
| 成功演出 | 无字段。钩子 `reactionLanded` |
| 牌意档 | 无字段。钩子 `cardIntent` |
| 飞刀当前形态 | 无字段。钩子 `dartFormNow` |
| 接 / 放 | 只画按钮。点击归音频 |

## 创新思路

1. **来源戳。** 每个显示件带 `data-*-source="field"` 或 `"placeholder"`。下一窗把字段接上之后，把断言从 placeholder 改成 field 即可，不用对着像素猜哪一段是编的。
2. **六格常驻、定宽。** 零段也留着，宽度锁 `--hud-intent-w`。段数从 0 变到 2 时，阶段条和石台不被顶下去。和阶段条锁 1.7rem 是同一件事：出现和消失不改布局。
3. **圆窗放进石台、脱离文档流。** `.strip` 已是定位包含块，格子本来就是 `position: relative`，圆窗 `absolute` 盖在石台上。阶段条、聚合条、底栏按钮都不跟它抢同一点。窗开时只暂停石台和立绘，进度圈继续走。
4. **灼烧的闪跟「结束」字，不跟段回放。** `env-burn-due` 要阶段条写着结束，并且当前不是敌段回放。出招那几帧的血仍由原回放改，灼烧不会在段中间跳一下。
5. **壳里不留第二张架势表。** 没有 `stanceBoard` 时直接调用 `buildStanceBoard`。冲刺是进势、闪避是诡势，以过招核的 `INTENT_STANCE` 为准。壳再写一张就会和结算显示分叉。
6. **成功演出单独等一个旗。** 圆窗的出现条件是「窗还在场上」，成功的硬停和石台震是另一个旗。两件事不要绑成「窗一关就当成功」。默认不暂停的结算，窗到不了这一帧，这是结算的口，不是画面能补的。
