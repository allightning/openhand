# 表现壳六班报告

2026-11-14。机制六班和剧情五班都齐了。这一班把换势、风声、重打开场接到画面上。

未改 `src/game`。未改 `storyBeats` 文案。未 commit。未开页面。

本窗断言：`render/liveFoe.test.ts` 4，`noOverlap.test.ts` 加上换势风声组和重打页。`npm run test:combat` 96 文件 / 966 绿。`typecheck:combat` exit 0。

## 血线换势

最近八条播报里出现 `foeStanceShift` 家族键，战斗页和播报换成 story5 的白描。

机制核写下的句子是 `foeStanceShift 血线 N% 从→到`。从谱是 turtle，用龟那句。skirmish 和 wander 用游走那句。教头、刺客、莽夫，以及认不出的从谱，用 fallback。剧情窗的精确键 `foeStanceShift:turtle` 也走同一张表。八条以前的键不再换。

## 风声

敌带 `foeVariant` 时，敌信息位显示 story5 的三句。`turtle-shell`、`brute-press`、`skirmish-lane`，以及换势后写成的原型尾缀，都对得上。wander 用游走那句。没有这个字段就占位，不另编一句。没买情报也看得到。买了底细时记 `data-bought-tier="detail"`。亮招行的 `data-reveal-source` 仍按揭开的段数。

## 跨轮记忆

`s2-revive-rematch` 页按旗标把开场句放在原来的正文前面。`rematch-seat` 优先于 `rematch-elite`。两个都在时用座前那句。没有旗标，正文仍从「你站回空地中央」起，来源 `placeholder`。

## 取舍

换势键的从谱在壳层拆，不改 story5 的三句。风声不盖住亮招行。重打不另开一页。
