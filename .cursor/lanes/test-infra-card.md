# 测试与基建加固包 · 任务卡

2026-10-21 统筹窗。未 commit。分支 `main`。

## 开工基线

| 项 | 开工 |
|---|---|
| 黄金 | 2 则 gate。随机 20（登门缺枪、钩）。定向 8。帧已有血/挡/位移/牌堆/蓝，叠层字段刚补上。连击重放、噬血、霸体尚未进基线 |
| rng 默认参数 | 12 处：`gauntlet.ts` 6、`storyBeats.ts` 3、`encounter.ts` 2、`rogueRoster.ts` 1，都是 `= Math.random` |
| `@deprecated` | 15 处 / 9 文件 |
| skip / xit / todo | 0 |
| `PERSIST_DEBT` | 刀 18 已从 `layerBoundary.test.ts` 删掉。开工时 DOM 豁免仍是 8 个主线文件 |

## 1 黄金

随机 20：行路六系各 2；登门六系至少 1（拳、刀再各 1）。

定向 11：`spearDebt`、`stakeBlast`、`stunLock`、`comboReplay`、`lifesteal`、`endureCc`、`guardWager`、`guardWagerMiss`、`finale`（人海/座前/私了）、`revive`、`qiCommit`。

同种子互比 + 对照基线。连击重放后 `combo === 1`。噬血后己方血上升。霸体挡住推（含晕）和拉，层被打掉。

没有玩家霸体字段，没有敌方连击/剑势。帧不补 0。

## 2 DOM

`src/game/goldenReplay.dom.json` 独立于引擎帧。敌招回放三拍：开打血 17 / 挡 3，第一段血 13 / 挡 1 / 位不动，第二段血 10 才挪位。`climb-palm-1` 每一拍的血挡位等于该帧，不对齐终态。

## 3 rng 清单

点名的 12 处默认参数已改必传。壳层调用显式传 `Math.random`（`flow/campFlow.ts`、`flow/gauntletFlow.ts`、`flow/gauntletSettleFlow.ts`、`dom/bindDomPart2.ts`、`dom/bindDomPart3.ts`）。测试里原先不传的，改成 `() => 0` 或按序号的有序函数。黄金 diff 仍空。

壳层注入，保留：

- `gauntlet.ts` `createGauntletRun`：`opts?.rng ?? Math.random`
- `gauntlet.ts` `applySuperReward`：`const roll = () => Math.random()`
- `qiCommit.ts` `feintRng: opts.feintRng ?? Math.random`（不在准许文件，未改）
- `labAudio.ts` 选曲下标 `Math.random`
- `sim.ts` `battleRng = Math.random`，`setBattleRng(null)` 回到它（不在准许文件，未改）

引擎裸调用，未改，报主窗：

- `src/game/labEnemyStress.ts` `stressTargetsAssist`：`Math.random() < 0.5`。准许文件不含它
- `src/game/economy.ts`、`rewards.ts`、`bag.ts`：冻结区，架构写明不进 rng 治理
- `src/map/metro.ts`、`src/fx.ts`、`src/audio.ts`：不在战斗核

测试文件里没有 `Math.random` 字面量。`labV28` 回收洗牌用 `vi.spyOn(Math, "random")`，测完恢复。

点名 12 处的必传率是 100%。全 `src/game` 不是 100%，差在上面三处。

## 4 @deprecated

`rg @deprecated src` 为 0。

删掉的壳：`redeemGauntletRun`、`encounterOutcomeTag`、`evaluateCampaignBattle`、`BGM_FADE_MS`、`BGM_PATH`、`auraDamageBonus`、`demoGuideForStage`、`weaponSchoolFile`、`ResonanceStatus` 的 `school` / `basic` / `advanced`。`GAUNTLET_LADDER` 取消导出，仍是江湖线前 7 馆，池子没变。两处悬空注释删了。

留着的字段，只去掉标记：`GauntletRun.techniques`（和 `mateTechs` 一起写）、预设 `hero`。删字段会改结算或开局主角。

`battleSheet.ts` 有引用（`shellFrames`、`shellState`、`bindDomPart0`、`shellPaint`、测试），没删。

`scaleClimbResource`：`applyScale` 为真时，pool × `CLIMB_ENERGY_POOL_MUL`，regen × `CLIMB_ENERGY_REGEN_MUL`。两个常量都是 1，登门不乘。黄金数字不动。

## 5 测试健康

- `it.skip` / `test.skip` / `describe.skip` / `xit` / `todo`：0
- 没有 `expect` 的测试：0
- `labMashBaseline.test.ts` 三则不进 `test:combat`。100 局胜率上限，会晃，单则 120 秒。文件头已写原因
- `labV28`「ordered=false 前 12 张不连三张」走默认 `battleRng`。行路窗当次红过、重跑绿。本班连跑两遍没复现。测试上补了一句原因，没改洗牌
- `Date.now()` 只填 telemetry 的 `startedAt`，不断言
- `createGauntletRun` 江湖线不传 rng 仍抽签。断言不读签，连跑未红
- `PERSIST_DEBT` 不在引擎。DOM 豁免从 8 个收到仍在碰 DOM 的 `run.ts`、`settings.ts`。`economy` / `bag` / `progress` / `quest` / `rewards` / `hooks` 已不碰 DOM，不再豁免

## 收工对照

| 项 | 开工 | 收工 |
|---|---|---|
| 黄金 | 随机 20，定向 8，缺连击/噬血/霸体 | 随机 20，定向 11，另有 `goldenReplay.dom.json` |
| rng 默认参数 | 12 | 0。壳层注入和冻结区见上 |
| `@deprecated` | 15 / 9 文件 | 0 |
| skip | 0 | 0。乱点基线 3 则仍排除，已标注 |
| `PERSIST_DEBT` | 已删除，DOM 豁免 8 文件 | 仍无此名单。DOM 豁免 2 文件 |

`npm run test:combat`：76 文件 / 795，连跑两遍绿。`npm run typecheck:combat` exit 0。同种子黄金 diff 为空。
