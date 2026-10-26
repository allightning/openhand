# 结算事件审计（2026-10-23）

只读 `src/game/sim.ts`、`src/game/labV2.ts` 的 `pushFx` / `notes` / 阶段拍，以及壳层 `flow/**`、`dom/bindDom*` 的现有出口。本窗没有改 `src/game/**`。

口径：一类结算一行。同一机制的多句 log 并成一行，不按句子拆键。`LabFxKind` 与 `ClimbPhaseStep` 逐个占行。

状态：

- **已接**：壳层已有出口，会播占位。
- **待 hook**：没有壳层出口。键可以先占位，不硬接 `playSfx`。
- **不二次接**：出牌点击已经播过，fx 队列里的同一次牌面不再播第二声。

占位四文件：`swing` / `clash` / `page` / `drop`。真实素材都还没换。

## 座位（不是音效键）

同一时间一首。短句占席时 BGM 只记账，短句结束再接。逻辑本包没改。

| 事件 | 键 | 接线 | 态 |
|---|---|---|---|
| 切屏（战斗 / 门厅） | BGM | `flow/audioFlow.ts` `syncBgmWithScreen` | 已接 |
| 切模式（行路曲 / 登门曲） | BGM | 同上，`campaignRun` 走 `break` | 已接 |
| 胜 / 负短句 | sting | `flow/battleFlow.ts:80` | 已接 |
| 重开、离开告捷 | 停短句 | `dom/bindDomPart2.ts:77`、`flow/gauntletSettleFlow.ts:92`、`flow/screenFlow.ts:29` | 已接 |
| 馆间屏（赏、注、市、事、人、疤、复活） | 无单独 SFX | `flow/gauntletSettleFlow.ts` 只改 `gauntletScreen`，BGM 跟 phase | 不另播 |

教学弹窗不因此停 BGM（`audioFlow.ts` 注释）。

## 演出队列 `LabFxKind`

定义在 `src/game/labV2.ts`。壳层出口是 `flow/audioFlow.ts:22` `playFxSfx`。`hit` 按兵刃改键；`burst` 且当前兵器是棍时改 `staff_burst`（`labAudio.ts` `fxKeyFor`）。

| 事件 | 键 | 态 |
|---|---|---|
| break / counter | clash_blade | 已接 |
| wall | wall_slam | 已接（原 block，文件仍是 clash） |
| kill | windup | 已接 |
| burst | windup；棍 → staff_burst | 已接 |
| swap（倒下换人，`sim.ts` `pushFx("swap")`） | swap | 已接 |
| graze | graze | 已接 |
| miss / skip | whiff | 已接 |
| hit | 六系 `*_hit` | 已接 |
| resonance | aura | 已接 |
| eye | 无 | 待 hook |
| cardHit / cardWard / cardHeal / cardStep / cardKnock / cardStatus | 无 | 不二次接。出牌在 `bindDomPart4.ts` 已播 |

玩家掉血、队列没有新 fx 时，`audioFlow.ts:25` 用敌方兵刃 `*_hit` 兜底。

## 爬塔阶段拍 `ClimbPhaseStep`

出口：`dom/bindDomPart5.ts:170` `climbBeatSfxKey`。非爬塔的延后裂创走同文件 `:200`。

| 拍 | 键 | 态 |
|---|---|---|
| bleed | bleed_tick | 已接 |
| draw / drawBench | draw_card | 已接 |
| wage 且读数含「断劲 / 挂账」 | qi_sever | 已接 |
| wage 普通敌回劲 | 无 | 待 hook |
| regen 玩家回劲 | 无 | 待 hook |
| endure 霸体 −1 | 无 | 待 hook |
| intents 亮招 | 无 | 待 hook |

## 出牌、手牌、意图条

| 事件 | 键 | 接线 | 态 |
|---|---|---|---|
| 攻击牌 | windup | `bindDomPart4.ts` `cardPlaySfxKey` | 已接 |
| 带步技能 | step | 同上 | 已接 |
| 回血技能 | heal | 同上 | 已接 |
| 格挡牌 | ward_gain | 同上。`block` 键留给格挡语义，不从这张牌播 | 已接 |
| 落桩技能（`plant`，且上面几档都不中） | stake_plant | 同上 | 已接 |
| 破绽技能 | expose | 同上。占位 clash，以前这类技能走 qi_gain 的 drop | 已接 |
| 其余技能 | qi_gain | 同上 | 已接 |
| 本拍新 log 含噬血 | blood_drink | `riderSfxKeys`，与牌面键重复则不播第二声 | 已接 |
| 新 log 含裂桩爆炸 | stake_blast | 同上。`sim.ts` 句式 `裂桩爆炸 N` | 已接 |
| 新 log 含断劲 | qi_sever | 同上 | 已接 |
| 新 log 含破绽，且牌面键不是 expose | expose | 同上 | 已接 |
| 新 log 含缴械 / 缴手，或 `foeDisarm` 升高 | disarm | 同上 | 已接 |
| 弃牌成功 | discard | `bindDomPart4.ts` | 已接 |
| 置换成功 | cycle_card | 同上 | 已接 |
| 主动换人，场上人变了 | swap | `bindDomPart4.ts` `[data-swap]` | 已接 |
| 连击重放 | combo_replay | `bindDomPart5.ts` | 已接。占位仍是 swing |
| 收势 | end_turn | `bindDomPart5.ts` | 已接 |
| 敌段起手（打击段） | windup | `flow/foeRecapFlow.ts` | 已接 |
| 敌段结算 | clash_blade / `*_hit` / graze / whiff | `playFoeResolveSfx` | 已接 |
| 意图段判 gone（打完拿掉） | intent_gone | `foeRecapFlow.ts` 封条。占位 page，不进打击总线 | 已接 |
| 意图段灰留 | 无 | 灰留不拿条 | 不播 |

## 壳层页与馆间确认

| 事件 | 键 | 接线 | 态 |
|---|---|---|---|
| 图鉴 / 攻略 / 设置 / 开发 | ink_ui | `bindDomPart0.ts` | 已接 |
| 牌堆页 | draw_card | `bindDomPart0.ts` | 已接 |
| 音效滑条试听 | ui_confirm | `flow/settingsFlow.ts:57` | 已接 |
| 下注开打（种类和注额都在） | ui_confirm | `bindDomPart2.ts` `#wager-fight` | 已接 |
| 黑市买下成功 | ui_confirm | `bindDomPart2.ts` `[data-market-id]` | 已接 |
| 选注额、跳过下注、见好就收 | 无 | 选择不是落定 | 不播 |
| 助战 `[data-assist]` | 无 | 有点击，没有语义键 | 待 hook |
| 道具 / 落符 / 绝式 | 无 | 有点击 | 待 hook |

## 占位了、没有出口

这些键在 `sfxMap.ts`，不调用。

| 事件 | 键 | 原因 |
|---|---|---|
| 飞刀掷出 / 命中 / 钉 / 换形态 | dart_throw dart_hit dart_pin dart_switch | `WeaponId` 没有飞刀。内容未落码 |
| 蓄力叠层 / 蓄满 | staff_charge staff_charge_full | 蓄力牌面未拍 |
| 棍击退撞墙 | staff_push_wall | fx `wall` 不带「谁的击退」。现统一 `wall_slam` |
| 无墙场 | wall_none | 环境未落 |
| 灼烧格 / 缺格 / 无墙词条 | env_burn env_gap env_nowall | 同上 |
| 桩碎（相对裂桩爆炸） | stake_shatter | 与 `stake_blast` 同占位 clash。爆炸句已走 `stake_blast` |

## 有结算、没有键，也不硬接

剑势叠层、连击叠层（重放除外）、晕锁最左牌、先机播报、迷眼 `eye`。壳层没有单独差分。要声时核玩给 hook（fx 名或阶段拍），再在本表加一行。
