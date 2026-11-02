# 角色核报告 · 2026-11-02

任务卡 `docs/combat/ROLE_TASK.md`。开工时 HEAD 是 `4b455ea`，`0774620` 是它的上一刀。开工 `test:combat` 85 文件 / 907 绿。本包不 commit。

## 落了什么

### 换装

`src/game/weaponKit.ts`。`swapHallWeapon(run, 人, 系, 正在战斗)`。正在战斗则拒绝。系必须在这人的武器谱里。弹出 `cardSchool` 既不是新系也不是通用的牌，再把该系 6 张基础牌补进配装。基础牌占配装位。

18 人谱按武器谱稿，写在 `WEAPON_SPECTRUM`，并挂到 `rogueRoster` 的 `spectrum`。一档二档 3 种，三档 4 种，本命在第一位。

飞刀 6 张里的「挡」用通用 `defend`。系内还没有刀囊这张牌。

### 职业

`src/game/professions.ts`。`run.professions` 不写就没有职业，现有对局不挂。

- 桩师：没调用进阶时，裂桩只说「桩还没开」。`advanceProfession` 之后走原来的裂桩爆炸。
- 相士：开战把当前意图的架势名写进 `rumor`。`markEnemyOpen` 每局 1 次，把整手写成亮招。进阶后 `seeThrough` 把 `feintOpen` 打开，这一回合虚招不再挡住反应窗，换手清掉。
- 赌徒：`rollWager` 用传入的随机数，小于 0.5 回 4 劲，否则自伤 4。进阶后 `cheatWager` 让下一次必赚，回 6 劲。

### 缘分

`src/game/affinityBonds.ts`。特定对 8、群像 6、旧怨 2。缺省阶段是初识，`bondStages` 留给剧情窗写同路 / 生死。

已进结算的初识：温补收势回 2、医杀首手各少 1 劲、夜霜刀牌裂创多 1、刀社至少两人时裂创帽 +1。这四条只在对应的人同队时发生。黄金用的配队不是这 18 人，所以没变。

其余初识种类在表上，结算还没逐条改数字。

### 融合牌

15 张 fuse 标了 `generated`。`cardPool` 不再放出它们。入伙时不再把融合牌塞进配装（同系光环还在）。

生死阶段、而且这组缘分带连携时，换人按「换下的人的武器 × 换上的人的武器」发一张融合牌，标 `ephemeral`。打完不进弃牌堆。初识换人不发。

### 抽牌条件

`CardDef.drawWhen` 可选：`moved` / `stood` / `hit` / `blocked`。没有这个字段的牌，抽牌和原来一样。本包没有改 131 张的说明文字。

## 常量

| 名 | 值 |
|---|---|
| `CLIMB_GAMBLE_WIN` / `LOSS` | 4 / 4 |
| `CLIMB_GAMBLE_CHEAT` | 6 |
| `CLIMB_BOND_HEAL` | 2 |
| `CLIMB_BOND_GRUDGE_QI` | 1 |
| `CLIMB_BOND_BLEED_CAP` | 1 |

## 测试

`src/game/role.test.ts` 9 则：谱、换装拒绝与补牌、基础牌系别、融合牌出池、生死换人发牌并打完清空、桩师进阶、相士、赌徒、无 `drawWhen` 照常抽。

黄金对照旧基线，diff 为空，没有重录。原因：职业默认不发；缘分只认 18 人花名册，黄金配队不在里面；融合牌不再进起手。

收工：`npm run test:combat` **86 文件 / 917 绿**。`npx tsc --noEmit -p tsconfig.combat.json` **exit 0**。

## 创新思路

1. 换装是馆间函数，战斗只传一个「正在打」的布尔。结算不长出换装入口。
2. 职业和缘分都不默认打开。没写 `professions`、队里没有那两个人，数字和原来一样。
3. 融合牌用 `ephemeral` 标记当场牌，打完直接拿走，不靠弃牌堆再洗回来。
4. `drawWhen` 先做钩子、不改牌面。数值核以后在牌上填字段即可，抽牌函数已经会看。
