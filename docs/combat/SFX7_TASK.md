# 任务卡 · 声音地图（全结算事件审计 + 七系键位 + 接线补全 + 互斥回归）

2026-10-23 主窗派发。音频窗，MEGA 版，五个阶段。独占 `sfxMap.ts`、`labAudio.ts`、`dom/bindDom*`（与 UI 窗错开文件；UI 不碰 dom）。不加音频文件、不动 BGM 互斥逻辑。

## 做完的样子

每一个结算事件（sim 的 notes / fx / 阶段切换 / 屏切换）在表里都有一个键；每个键有占位音、接线点、状态；七系 + 蓄力 + 撞墙 + 环境的新键全部占位接好；BGM 互斥有回归测试；产出《SFX_MAP_20261023》总表文档。

## 阶段

### P1 · 全事件审计（只读）
- 通读 `sim.ts` 的 `notes.push` / `pushFx` / 状态跳点、`flow/**` 的屏切换、`gauntlet` 馆节奏，列出**全部可发声事件清单**：攻击命中 / 挥空 / 格挡 / 裂创跳点 / 晕锁 / 缴械 / 断劲 / 噬血 / 击退 / 撞壁 / 换人 / 摸牌 / 弃牌 / 收势 / 馆过 / 馆败 / 复活 / 下注 / 黑市 / 事页翻页……
- 清单落 `docs/combat/SFX_EVENTS_20261023.md`：事件 → 现键（或「无键」）→ 接线点文件行号。
- 只读审计 `sim.ts`，一行不改。

### P2 · 新键位 + 占位
- 新增：飞刀 `dart_throw` / `dart_hit` / `dart_pin` / `dart_switch`；棍 `staff_charge` / `staff_charge_full` / `staff_burst` / `staff_push_wall`；撞墙 `wall_slam` / `wall_none`；环境 `env_burn` / `env_gap` / `env_nowall`；桩师 `stake_plant` / `stake_shatter`（若复用旧裂桩键注明）。
- 全部先挂现有四占位（swing / clash / page / drop）里最贴近者，注释「等素材」。
- 键名蛇形小写；`SfxKey` 类型、`FX_KEY`、`hitKeyForSchool` 同步。

### P3 · 接线补全
- P1 清单里「无键」或「有键未接」的事件，在 `dom/bindDom*` / `flow/**` 的既有 hook 上补接线（只加 `sfxSlot` 调用，不改流程逻辑）。
- 已在 SYNC 登记的未接清单优先：swap、bleed_tick、expose、intent_gone、qi_sever、blood_drink、stake_blast、disarm、combo_replay。
- 没有现成 hook 的事件不硬接，列入文档「待核玩出 hook」。

### P4 · BGM 互斥回归
- `labAudio.test.ts` 补回归：切屏 / 切模式 / 死亡重开三条路径断言同一时刻只有一首在播（沿用现有 mock 结构）。
- 不新增 BGM、不改歌单逻辑。

### P5 · 总表文档
- `docs/combat/SFX_MAP_20261023.md`：键 → 占位 → 接线点 → 状态（已接 / 等素材 / 待 hook）→ 事件说明。按 P0 / P1 / 预留 / 新七系分组。
- 回主窗写：事件总数、新键数与占位、补接了几处、待 hook 清单。

## 边界

**准许：** `src/combatLab/sfxMap.ts`、`labAudio.ts`、`labAudio.test.ts`、`dom/bindDomPart*.ts`、`flow/**`（只加 sfxSlot 调用）、`docs/combat/SFX_MAP_20261023.md`、`SFX_EVENTS_20261023.md`、SYNC 自己那一节。
**禁止：** `src/game/**`（含 sim.ts，只读）、`render/**`/`prodBattleUi`/`lab.css`（UI）、`content/**`（核玩二）、`storyBeats` 系（遭遇）、新音频文件、第二首 BGM 同播、git commit、冻结区、读招。

## 验收

`npm run test:combat` + `npm run typecheck:combat` 绿；新键全部有占位断言；BGM 互斥三路径回归绿；两份文档落盘。

## 交付（收尾必交）

1. **工作成果报告** `docs/combat/SFX7_REPORT_20261023.md`：事件总数、新键与占位、补接清单、待 hook 清单。
2. **创新思路**：事件分类法（你怎么给结算事件分层的）、键位命名体系、占位映射的听感逻辑，哪些值得固化成音频规范。
3. SYNC 自己那节更新。
