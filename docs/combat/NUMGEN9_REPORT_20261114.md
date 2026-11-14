# 数值核九班 · 2026-11-14

岸匪 `mob_escortBand_04` 从神压成玄。寨主 `mob_escortBand_seat` 没动。牌面没改。未 commit。未开页面。

`npm run test:combat` 95 文件 / 960 绿。`npm run typecheck:combat` exit 0。

## 目录一行

`GAUNTLET_FOE_IDENTITY` 里岸匪这一行加上 `grade: "xuan"`。`profileFor` 先读这一格，没写的人仍走 `enemyGradeForStage`。馆 7 起的主敌、馆 8 的副手，档位函数照旧是神。

玄刀贴身底是 11。馆 8 系数 2.2，敌伤系数 1，一段是 `round(11 × 2.2) = 24`。两段是 48。困难档总督 `round(140 × 0.65) = 91`，48 收得住。

神的时候一段是 `round(16 × 2.2) = 35`，两段 70。

寨主仍是神。馆 10 系数 2.6，一段仍是 `round(16 × 2.6) = 42`。签名仍是乱刀、火油、绊索。岸匪签名表是空的。

档掉下来之后，命中加的技能费从神的 2 变成玄的 1。馆 8 的闪仍在套件里，那是馆段，不是神档附带的。

## 审计

`npx tsx scripts/numgen/audit.ts --now` 重写 `docs/combat/NUMGEN_AUDIT_20261102.md`。写前后校验和同是 `2e7bf38aaaa4916f9cce1a71e1f764da10db0481`。汇总仍是带内 18、偏肥 49、偏瘦 37、构筑层跳过 27。牌面汇率没有连带。

## 黄金

对照已录基线为空，没有重录。黄金对局不经过岸匪这一行。馆段档位函数没改，别的馆 8 主敌仍是神。

## 创新思路

1. 单人降档写在具名目录的 `grade` 上，不改 `enemyGradeForStage`。座前和同馆别的主敌不会跟着掉。
2. 敌档这种改动，用审计文件校验和当「牌面没动」的证据。数字相同还要字节相同，才算没有连带。
