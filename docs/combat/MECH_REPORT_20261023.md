# 机制核报告 · 2026-10-26

任务卡 `docs/combat/MECH_TASK.md`。开工门：`test:combat` 81 / 858 绿。本包不 commit。

## 四阶段落了什么

### P1 棍蓄力

- 状态 `Battle.chargeStacks`，帽 `CLIMB_CHARGE_CAP = 6`。
- 牌字段 `chargeGain` / `chargeBurst`。指定牌叠层不攻击；爆发消费全部层。
- 公式 `climbChargeBurstEq(n) = round(n × (25 + 15 × 1.25))` → 1 层 44，2 层 88（§4.3 蓄 1 手 ≈ 38–45，利息 25% 标黄）。
- 代表牌 3 张（不进 `CARD_REGISTRY`）：`staffSettle` 2 费挡 12 蓄 +1；`staffPrime` 1 费挡 6 蓄 +1；`staffBurst` 3 费爆发。

### P2 飞刀

- `WeaponId` 加 `dart`。底速 9，射程 6。
- 双形态：`dartForm` melee 1–2 / ranged 3–6 / any 1–6。无衰减、无死区。
- 钉：`Battle.foePin`，下次敌位移减步后清层。帽 6。
- 7 张代表牌在 `src/game/content/cards/dart.ts`，经 `MECH_CARDS` + `labCard` 结算，**不进 131 张表**。1 费点刃打 3 钉 1（射程价压伤）。
- 飞刀兵器不进 `GEAR_WEAPONS`（仍 60）。`gearById("dart-a-1")` 按 id 合成，避免图鉴兵刃计数爆炸。

### P3 环境词条

- `Run.envTag`：`burn` / `nowall` / `gap_end` / `gap_mid`。出现概率不接。
- 灼烧：中格（下标 4）写入 `burnCells`；回合结束站其上扣 `CLIMB_BURN_DMG = 4`（占位）。
- 无墙：`envTag === "nowall"` → `wallEnds "none"`。
- 缺格：只写 `gapCells: []`，位移不接。

### P4 墙联动

- 棍：敌撞墙在原有撞壁伤上加晕 `CLIMB_STAFF_WALL_STUN = 1`。表在 `rules/wallLinks.ts`。
- 枪回马枪：后手 + 背墙，敌位移将离开距 2 时暂停。`holdReaction` 才弹窗（测试）；默认自动放弃，黄金不改。耗蓝 `CLIMB_SPEAR_REVERSE_QI = 2` → 停 2 格、废剩余位移。`answerReaction` 接上。
- 钩抡撞：背墙 + 贴身墙-我-敌一线，拉近改换位（落点不可站则停可站格）+ 撞墙伤 + 视为拉近成功（缴械链照旧）。
- 反应窗是结算能力：敌段中途暂停-选择-继续。本包只接枪窗；敌方反应窗预留同结构。

## 常量清单（`src/game/climbCaps.ts`）

| 名 | 值 | 用途 |
|---|---|---|
| `CLIMB_CHARGE_CAP` | 6 | 蓄力帽 |
| `CLIMB_CHARGE_HAND_EQ` | 25 | 一手锚 |
| `CLIMB_CHARGE_NET_LOSS` | 15 | 蓄力手净损失 |
| `CLIMB_CHARGE_INTEREST` | 0.25 | 利息，标黄 |
| `CLIMB_PIN_CAP` | 6 | 钉帽 |
| `CLIMB_BURN_DMG` | 4 | 灼烧占位 |
| `CLIMB_SPEAR_REVERSE_QI` | 2 | 回马枪耗蓝占位 |
| `CLIMB_STAFF_WALL_STUN` | 1 | 棍撞墙晕段 |

## 测试证据

- `src/game/mech.test.ts` 11 则：公式 / 蓄力不攻 / 爆发 44 / 飞刀不进 131 / 双形态闸 / 钉减步 / 无墙不撞伤 / 灼烧跳血 / 缺格字段 / 棍撞墙晕 / 回马枪窗 / 钩抡撞。
- 收工：`npm run test:combat` **82 文件 / 869 绿**（含 mech）。`npx tsc --noEmit -p tsconfig.combat.json` **exit 0**。
- 黄金同种子两次仍绿，未重录（回马枪默认放弃）。
- `CARD_REGISTRY` 仍 131。未改既有牌数字。未开页面。未 git commit。

## 创新思路

1. **机制牌另库。** 新核副代表牌走 `MECH_CARDS`，结算只认字段（`chargeGain` / `pin` / `dartForm`），不在 `sim.ts` 写牌 id 特例。数值核重填 131 张时不会撞车。
2. **七系类型切开。** `CoreWeaponId` 六系给 Rogue 组合 / 助战符；`WeaponId` 含 dart。飞刀兵器现合成、不进 60 把表，图鉴计数稳住。
3. **反应窗默认放弃。** 新中途窗若默认打断敌段，黄金和乱点基线全炸。`holdReaction` 才暂停，产品以后再接 UI。
4. **墙联动查表。** 棍晕 / 枪窗条件 / 钩一线几何进 `wallLinks.ts`，sim 只问表。钩换位回调曾把「挡住」当成「可站」，测试钉死后再翻，建议墙技能一律 `blocked → 取反` 写进函数名。
5. **结算读 `labCard`。** `simV2OnCard` / `labV21AfterCard` 原先只查 `CARDS`，新 id 会炸。凡出牌后处理应与 `playCard` 同一查找链。
6. **缺格先占位。** 用户口径「留字段不接」压过任务卡「可跨过」。位移跨过留给下包，避免半接几何。
