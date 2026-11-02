# 表现壳五班报告

2026-11-02。基线是换装和缘分职业 HUD。这一班做开局翻牌、敌侧圆窗、牌意三档。

未改 `src/game`。未改 `storyBeats`。未 commit。未开页面。

本窗断言：`render/openFlip.test.ts` 5，`render/guashowHud.test.ts` 的牌意改成按牌堆计数，`noOverlap.test.ts` 加上敌窗组和翻牌组。这三份一起 37 则绿。

`npm run test:combat` 全套 91 文件 / 950 绿。`typecheck:combat` exit 0。

## 翻牌开局

事页 `s3-open-a`、`s3-open-b` 仍走原来的选项。翻牌区接在事页下面。

七张牌背排开。点牌背翻开，看武器名、系、一句核副。核副句和换装条共用 `CORE_LINE`。翻开满三张，其余牌背锁住。再点已翻开的一张，写成选定，入队记在 `openPick`。第四次翻开不生效。点选在 `bindOpenFlip`，不进事页选项。

牌序还没进跑程类型。`s3-open-a` 占位从刀、拳、枪排起，补满七系。`s3-open-b` 占位从剑、棍、钩排起，补满七系。来源 `data-open-source="placeholder"`。这一局挂了 `openDeck`，就用挂上的顺序，最多七张，来源 `field`。武器名能从「系-a-3」读到就用兵器名。读不到用系名，并标 `data-face-source="placeholder"`。

`s3-open-name` 是自取名。输入框和「记下这个名字」。`heroName` 还没写，来源 `placeholder`。按下之后把写下的名字记在这一局，来源 `field`。原来的事页选项还在。

## 敌窗和牌意

敌侧圆窗用同一套圆和边沿条，标「敌」，没有回马和放过。圆窗靠右，不占阶段条。进度条停在满圈，`data-foe-instant="1"`，不走思考秒。

MECH3 已把 `foeReact` 写进对局。`kind` 是 dismantle / bind / read，`note` 是带数字的那句。有这个字段就画，来源 `field`，`note` 进播报。没有就不画。日志里的旧键单独留着，不把圆窗撑开。那三个字还在最近几条日志里时，剧情窗的白描句仍画在蓄力条下。结算写下之后没有清掉 `foeReact`，圆窗会留在这一场。要收起，请结算清这个字段。结算函数没动。

牌意在蓄力条旁边。张数是当前武器系在手牌、抽牌堆、弃牌堆里的张数。4、7、10 够数就亮。配装屏没有对局牌堆，三档仍是 `placeholder`。战斗张数不读 `cardIntent`。

## 取舍

翻牌不改事页选项的结算。敌窗不改 `noteFoeWindow`。牌意直接数当前系的牌。
