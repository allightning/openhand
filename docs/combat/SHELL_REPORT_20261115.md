# 表现壳 · 2026-11-15

未 commit。未开页面。未改 `src/game`。未改结算。

## 听劲倒计时

圆窗秒数 = 选定档（3 / 5 / 10，未选按 5）+ `windowThinkBonusSec`。加成来自对局上的听劲，壳层不另写一个 +2。3 / 5 / 10 按钮还在，高亮的是选定档。圆环 `--react-sec` 与超时用加总后的秒数。

- `src/combatLab/dom/reactChoice.ts`：`reactCountdown`
- `src/combatLab/render/guashowHud.ts`：圆窗读这个秒数
- `src/combatLab/dom/bindReact.ts`：超时用同一个秒数

图鉴「听劲」条目原文已有 `反应窗的思考时间 +N 秒`。`catalogSkill` 原样带出这个数字，壳层没有改图鉴文案。

## 馆开局投放

`ladderEnvTag` 改查 `envTagForHall`。组局把结果放进 `preset.envTag`，再写到对局 `run.envTag`。有表的馆以表为准。表上没有的馆，事页 `envtag:` 旗标仍可补上。石台灼烧格、无墙场沿用已有画面，没有重画。

- `src/combatLab/gauntletPaths.ts`
- `src/combatLab/gauntlet.ts`
- `src/combatLab/types.ts`
- `src/combatLab/draft.ts`
- `src/combatLab/factory.ts`

门厅续关、赌馆、遭遇进馆前写出词条名加一句：

- 灼烧格。这一馆石台上有格子在冒烟。
- 无墙场。这一馆格后没有墙。

第 1 馆不写词条。

- `src/combatLab/render/hallEnv.ts`
- `src/combatLab/render/shellHall.ts`
- `src/combatLab/gauntletUi.ts`
- `src/combatLab/lab.css`

## 手写词条收进表

- `ladderEnvTag` 原先固定返回空。现委托 `envTagForHall`。
- `buildGauntletPreset` 把查表结果写入 `preset.envTag`。
- `normalizePreset` 把 `envTag` 带过组局。
- `runFromPreset` 写到 sim 的 `run.envTag`。对局拷贝原在 `makeBattle`，未改。

未改、未当馆号表用的：

- `climbPlaces.ts` 路程小本记下选项带来的词条名，馆号不在那里写死。
- `storyBeats.ts` 选项旗标仍按选项写 `envtag:`。有表的馆号以表为准，旗标补表外的馆。
- 夜校 `scripts/climbSim/flags.ts` 的 `envTagForStage` 仍是馆 3/6 灼烧、馆 8 无墙。投放表是馆 3/6/8 灼烧、馆 5/9 无墙。夜校不在本窗范围。

## 测试

`npm run test:combat`：99 文件 / 990 绿。

`npm run typecheck:combat`：exit 0。

新断言在 `src/combatLab/render/shellWire.test.ts`：听劲秒数、图鉴数字、第 3 馆灼烧、第 5 馆无墙、第 1 馆无词条。`noOverlap` 盖住门厅词条句与两处 `position: static`。
