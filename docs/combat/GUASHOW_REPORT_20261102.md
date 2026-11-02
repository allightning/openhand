# 过招核报告 · 2026-11-02

任务卡 `docs/combat/GUASHOW_TASK.md`。开工门：`test:combat` 82 文件 / 869 绿。本包不 commit，不开页面，不改 UI。

## P1 反应窗

表在 `src/game/reactionWindows.ts`。`holdReaction` 才暂停；不设则原段照旧走，黄金未重录。

- **回马**改新参数：我方血 <50% 且背墙，敌向我、目的地 ≤2 格，停在进入 2 格之前的那一帧。接招：拒在 3 格，`displaceSealed` 废掉本回合剩余位移。耗蓝 2。
- **截拳**：敌蓄力段且距 ≤2。贴脸清 `foeCharge` 并打 5（1 费标尺）。距 2 只迈一步、这次蓄力不做。耗蓝 2。
- **断息**：敌金创或吐纳。伤 = 预回复量；吐纳再扣等量蓝。耗蓝 1。
- **弹反**：贴脸已受击 2 次，第 3 段。格挡一半、回敬一半，计数回合清。耗蓝 1。
- **偷势**：敌是拳 / 刀 / 剑且我还没给敌叠层，射程内。本次叠层改记 1 层剑势，本段裂创不落地。每回合一次。耗蓝 1。
- **瘸跛**：敌从 ≤2 格往外走到 >2 格。拉回起点并上瘸跛。瘸跛且缴械后，接下来 2 次命中按伤害 50% 吸血。耗蓝 1。
- **透棍**：敌已有挡再加挡，每回合一次。真伤 = 已有挡 ×0.5 + 新增挡 ×1。耗蓝 2。
- **破防**：敌蓝归零后闩上。下一段灰留（不掉血）。当手玩家打他的伤 ×1.25，下一手结束清掉。

玩家窗每场帽 2。虚招段 `matchWindow` 直接返回空。

## P2 意图显示

`src/game/intentStance.ts`。段种类进六架势：伤 / 进 / 退 / 守 / 蓄 / 诡。

- `stanceBoard`：每段架势、招键、是否虚招。
- `stanceLine`：`伤势 ×2 · 进势 ×1`。
- `stanceRevealN`：亮招解锁段数。`feintShown`：虚招已还原。`readMoves`：本场真招键。
- 敌段开打时若还没有板，补写一块。换手重排意图时清掉板和亮招数，读懂名单留下。普通开战不预写，表现层没有字段时仍按当前意图现算。

## P3 敌配招

`src/game/foeArchetype.ts`。族挂载 `FOE_FAMILY_ARCHETYPE` 只标原型，不改目录血和招伤。

- 馆 1–3：莽夫、乌龟。4–6 加游走、刺客。7+ 加教头。
- 配牌 6–10 张。种子 = 大轮 + 敌 id + 盐。同轮同敌同盐两次相同。
- 成长：前期 +0，中期 +1，座前 +2。局内随回合往上加，不超过这顶。
- 管线：馆段 → 原型 → 配牌 → 词条 `{}` → 羁绊 `null` → 光环 `null` → 成长。
- 敌窗拆招 / 缠手 / 读破：只有教头，且（精英且馆 ≥6）或座前。`run.foeRound` 写入后开战才换上这套队列。

## 常量（`src/game/climbCaps.ts`）

| 名 | 值 |
|---|---|
| `CLIMB_WINDOW_QI_BIG` / `CLIMB_WINDOW_QI_SMALL` | 2 / 1 |
| `CLIMB_WINDOW_FIGHT_CAP` | 2 |
| `CLIMB_WINDOW_HP_RATIO` | 0.5 |
| `CLIMB_SPEAR_REJECT_DIST` | 3 |
| `CLIMB_WINDOW_BASE_HIT` | 5 |
| `CLIMB_PARRY_BLOCK_RATIO` / `CLIMB_PARRY_REFLECT_RATIO` | 0.5 / 0.5 |
| `CLIMB_PARRY_EVERY` | 3 |
| `CLIMB_LIMP_LEECH` / `CLIMB_LIMP_LEECH_HITS` | 0.5 / 2 |
| `CLIMB_STAFF_PIERCE_OLD` / `CLIMB_STAFF_PIERCE_NEW` | 0.5 / 1 |
| `CLIMB_BREAK_HURT` | 0.25 |
| `CLIMB_FOE_WINDOW_CAP` / `CLIMB_FOE_WINDOW_HALL` | 1 / 6 |
| `CLIMB_FOE_DECK_MIN` / `CLIMB_FOE_DECK_MAX` | 6 / 10 |
| `CLIMB_FOE_GROW_EARLY` / `MID` / `SEAT` | 0 / 1 / 2 |
| `CLIMB_FOE_DISMANTLE_COST` / `MUL` | 4 / 0.5 |
| `CLIMB_FOE_BIND_STREAK` / `CLIMB_FOE_READ_STREAK` | 3 / 3 |

## 测试

- 开工 82 / 869 绿。
- `src/game/guashow.test.ts` 15 则：六窗、虚招不触发、破防、架势行、亮招读懂、配牌稳定、成长、教头敌窗。
- 回马旧测改成拒 3 格。`goldenReplay` 仍对照旧基线，未重录。
- 收工：`npm run test:combat` **85 文件 / 907 绿**。`npx tsc --noEmit -p tsconfig.combat.json` **exit 0**。
- 131 张牌数值未改。敌目录血未改。

## 创新思路

1. **窗是一张表。** 系、耗蓝、触发、结算各一行。sim 只在位移步和意图入口问一次「有没有窗」，不按系写 if。
2. **默认放过。** 新窗若默认打断敌段，黄金和现有对局全变。`holdReaction` 才停。表现层以后把圆窗接到这个开关上。
3. **架势板不预写。** 表现层已经约定：没有 `stanceBoard` 就按当前意图现算，标成占位。结算若开战就写上，占位测试会被旧板盖住。所以换手清板，敌段开打再补，读懂名单另留。
4. **配招用种子，不用战斗随机。** `foeKitSeed(大轮, 敌, 盐)` 进 `kitRng`。同轮同敌不变，换轮就变，也不去抽 `battleRng`，避免配牌把别的随机序带歪。
5. **破防只闩一次。** 蓝归零只灰下一段，蓝回到正数才允许再开。不然 0 蓝会把后面每一段都灰掉。
6. **敌窗跟原型走，不跟馆号单独走。** 6 馆精英若不是教头，不挂拆招 / 缠手 / 读破。座前的教头才必有。
