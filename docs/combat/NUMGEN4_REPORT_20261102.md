# 数值核四班 · 2026-11-02

等 `ROLE2_REPORT_20261102.md` 齐了再填。角色核给的进手值是：`notAttacked` / `staked` / `exposed` / `sealed` / `moved`。没改抽牌函数本身，只在换人补牌那一圈加上「抽不进就停」，否则牌堆顶不满足时会转死。未 commit。未开页面。

## 条件抽

钩看的是**进手的那张牌**，不是打出以后附带的抽。文案按这个写，数字还在。

| 牌 | 值 | 文案 |
|---|---|---|
| `advance` / `advance2` | `moved` | 前进 1 / 2 格。本手走过才进手。抽 1。 |
| `brace` / `defend2` / `haste` / `inbreath` / `qiPulse` / `statusPalm` | `notAttacked` | 本手没打过才进手。格挡、先机、回劲的数字照旧。 |
| `statusStaff` | `staked` | 格挡 7。场上有桩才进手。抽 1。 |
| `expose` | `exposed` | 破绽 +2。滞手 +2。敌已有破绽才进手。抽 1。 |
| `unbind` | `sealed` | 清封。有封才进手。抽 1。 |
| `statusSaber` | 没填 | 贴身没有对应值 |

`cardTextV2` 里的进步、纵步、稳步跟着改了。下一张不满足时，这一轮补牌停住，牌留在抽牌堆顶。

## 图鉴字段

`CodexEntry` 增加 `cost` / `school` / `damage` / `cap`，从注册表和层帽读出。状态条目里格挡 12、裂创 6、破绽 4、剑势 6、连击 6、桩 2、霸体 3 写了 `cap`。百科的 HTML 没改，这些字段给界面读。

## 偏差

`npx tsx scripts/numgen/audit.ts --now` 写出 `docs/combat/NUMGEN_AUDIT_20261102.md`。有 `drawWhen` 的抽，按抽价打 65 折（条件折扣取 20–35% 的深档）。

| 牌 | 当量 | 公平 | 带 |
|---|---|---|---|
| `advance` | 4.7 | 5 | 带内 |
| `statusStaff` | 10.3 | 10 | 带内 |
| `advance2` | 7.3 | 10 | 偏瘦 −27.5% |
| `unbind` | 6.3 | 5 | 偏肥 +25% |
| `defend2` / `qiPulse` | 13.3 | 10 | 偏肥 +32.5% |
| `brace` / `statusPalm` | 8.3 | 5 | 偏肥 +65% |
| `haste` | 10.8 | 5 | 偏肥 +115% |
| `expose` | 11.3 | 5 | 偏肥 +125% |
| `inbreath` | 13.3 | 5 | 偏肥 +165% |
| `statusSaber` | 11.2 | 5 | 偏肥 +123%。抽仍是全价 |

挡、先机、回劲、破绽本身已经吃满或超过费用。抽再打折，也回不到 ±15%。没有为了回带去削这些数字。

## 黄金

同一种子两次逐拍相同。重录是因为当前结算和旧基线已经对不上，主要是角色核接上的三重：裂创跳到 8/9、破绽到 5/6、断劲 −3 改成 −4。破绽那张的播报仍是「破绽、滞手、抽 1」，层数跟着帽走。

## 全绿

`npm run test:combat`：89 文件 / 939 绿。`npm run typecheck:combat`：exit 0。
