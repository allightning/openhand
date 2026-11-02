# 表现壳三班报告

2026-11-02。基线 `b348131` 已经能画圆窗。这一班把正式对局里的点选接上。

`npm run test:combat`：87 文件 / 921 绿。`npm run typecheck:combat` exit 0。未 commit。未开页面。未改 `src/game` 的结算公式。未改 `storyBeats`。

选择逻辑在 `src/combatLab/dom/reactChoice.ts`，点击在 `src/combatLab/dom/bindReact.ts`。断言在 `dom/reactChoice.test.ts`（4）和 `render/guashowHud.test.ts`（按钮文案）。

## 玩家从看见圆窗到选完

1. 爬塔收势，或爬塔里敌人先出手，壳在调用已有的 `endTurn` / `seizeOpening` 之前把 `holdReaction` 设上。结算若对上窗，就把 `reactionWindow` 留在这一手上并返回。画面画出圆窗。石台和立绘停在这一帧。边沿一圈按秒走。圈内是招式全名和耗蓝。登门不设这个开关，收势仍一次走完。

2. 默认 5 秒，`data-react-sec-source="placeholder"`。点 3、5 或 10，把这个数写进本局的 `reactionSec`。圈按新的秒重走，来源改成 `field`。这三档不进结算。

3. 点招式按钮调用 `answerReaction(battle, true, rc)`。枪的按钮写「回马」，圈内仍是「回马枪」。其余窗的按钮是截拳、断息、弹反、偷势、瘸跛、透棍。点「放过」，或这一圈走完，调用 `answerReaction(battle, false, rc)`。

4. 点了打、劲够、窗被结算收掉：壳标 `reactionLanded`。圆窗收起。敌人立绘加上已有的 `lab-react-halt`，石台加上已有的 `lab-board-shake`。约 0.3 秒后清掉这个标记，再播这一手已经记下的回放。

5. 放过：不标成功，不停步，不震，接着播回放。劲不够：日志是结算原句「劲不够，窗没打出」，窗还在，可以再点，回放先不开始。

6. 选完不第二次调用 `endTurn`。窗还开着时，结算已经返回，回合末的队列、跳血、摸牌没有排上。壳不补这段，播的是窗打开前记下的回放。

## 没动的

结算公式、伤数字、窗的匹配条件都在 `src/game`。壳调用 `answerReaction`，不重写扣蓝和位移。`storyBeats` 未改。未 commit。未开页面。
