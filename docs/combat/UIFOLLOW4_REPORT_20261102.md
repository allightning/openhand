# 表现壳四班报告

2026-11-02。基线是圆窗可点。这一班做馆间换装，和战斗里的缘分、职业、毒层。

未改 `src/game`。未改 `storyBeats`。未 commit。未开页面。

本窗断言：`render/weaponSwap.test.ts` 3，`render/roleHud.test.ts` 3，`noOverlap.test.ts` 换装组与缘分职业组。这三份一起 20 则绿。

`npm run test:combat` 全套 89 文件，5 红：开战气血 60/50、断劲后敌劲 6/7、秘药气血 90/75、黄金 `wageDebt` 4/3、缘分倍率 2/1。栈在 `climbEconomy`、`climbPlaytest`、`playtestBugsFix`、`goldenReplay`、`role.test`。本窗没改这些文件。`typecheck:combat` 报 `affinityBonds.ts` 的 `stages` 未使用、`sim.ts` 的 `grantPoisonItem` 未使用，都在 `src/game`。

## 换武器

馆间配装屏，摘要下面是换装条。

当前武器读这一人的 `mateSchools`。还没换过，就从兵器 id 的前缀认，主角再回退到本局兵器。谱读 `WEAPON_SPECTRUM`。有谱：3 或 4 个按钮，图标一个字，旁边一句核副（击退连击、贴身裂创、剑势破绽、距离档断劲、蓄力击退、拉近缴械噬血、双形态钉）。正在用的那一系锁住。点另一系调用 `swapHallWeapon`，`fighting` 为假。返回的牌组写回 `mateDecks`，主角同时改 `deckRecipe` 和 `weaponId`。条下写「已弹出 N 张不符牌」，N 是函数弹出的张数。

`fighting` 为真：函数拒绝，原句「战斗中不能换装」，牌不动。配装屏这时每个谱按钮都 `disabled`，条上 `data-weapon-locked="battle"`。战斗页另有一颗「换装」，永远 `disabled`。

谱里没有这个人：`data-spectrum-source="placeholder"`，文案「武器谱还没写上」，换装钮锁住。`mateSchools` 还没进 `GauntletRun` 类型，先挂在这一局对象上。

## 缘分、职业、毒

战斗页你这一侧，蓄力条下面。

同队才画 chip。特定对两人齐，名字加阶段：初识、同路、生死。阶段用 `stageOf`。群像至少两人在场，阶段用 `groupStage`。旧怨两人齐，红色 chip，写医杀或争锋，不写阶段。一个人上场：`data-bond-source="placeholder"`。

三颗职业钮一直在：桩师进阶、相士看破、赌徒出千。亮着才能点。桩师还没进阶时「桩师进阶」亮，点了调用 `advanceProfession`。相士已进阶且这一手还没看破时「相士看破」亮，点了调用 `seeThrough`。赌徒已进阶且这一手还没出千时「赌徒出千」亮，点了调用 `cheatWager`。没有职业：三颗都灭，`data-prof-source="placeholder"`。

毒层读 `foePoison`。是数字就写「毒 ×N」，`data-poison-source="field"`。字段空着写「毒 —」，来源 `placeholder`。淬毒附伤不画成已经叠上的层。

## 取舍

换装不在壳里重写弹出规则，配装区直接铺函数返回的牌组。群像阶段跟 `groupStage` 的 id，不从对子键再推一遍。毒层跟已叠在敌人身上的 `foePoison`。战斗里的换装入口留着，锁死。能换的是馆间配装屏。
