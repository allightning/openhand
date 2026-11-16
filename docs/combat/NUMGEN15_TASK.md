# 数值核 · 2026-11-16 十五班：套件牌缩放口径 + 裂创源审查

## 开场词

数值核。先读 `.cursor/lanes/SYNC.md`、`.cursor/rules/combat-ironclad.mdc`、`.cursor/rules/combat-fact-discipline.mdc`、`docs/combat/NIGHT19_REPORT_20261116.md`（P0：fightScale 减半直伤只少 15%）、`docs/combat/NUMGEN13_REPORT_20261116.md`（已指认：applyEliteKit 换的原型牌不经 scaleIntent）。**本班 = 纯审查 + 方案，不改任何文件**，产出 = 报告。夜校二十班并行做尺子校准。

## P1 套件牌不吃 scaleIntent 的处置方案

原型套件牌（`applyEliteKit` / `commitFoeKit` 换上的龟/莽/游走牌）不经 `scaleIntent`，敌伤系数对它们无效；裂创层也不吃系数。给三个方案各列代价与影响面：A 套件牌接进缩放（组局时乘 fightScale——哪些测试 / 黄金会变）；B 套件牌不接缩放，以后难度调谐改调原型池牌面（牌面是共享的，影响哪些馆）；C 维持现状，系数只管非套件段（把「系数管不着」写成规则真源，调谐改走血 / 段预算 / 配招）。主窗倾向 A，给实施清单与回归范围，不动码。

## P2 馆 2 裂创源审查

十九班：馆 2 敌伤 72% 是裂创（坡蹲，场均 142.7，血池才 180）。查坡蹲配招里裂创从哪来（刀创牌？层数？），按汇率列账；给两个定量候选（减层 / 换牌）各估胜率影响，不动码。注意：裂创是刀核副，敌用裂创牌不犯「别系不做核副主语」（敌牌不受此限），但 72% 占比是否符合「馆 2 教学期」定位，报告里给一句设计判断。

## 报告

`docs/combat/NUMGEN15_REPORT_20261116.md`：P1 三方案表 + 主窗倾向的实施清单；P2 坡蹲裂创账 + 两候选。SYNC 数值核节更新。不改码、不 commit、不开页面。
