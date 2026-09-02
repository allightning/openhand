# 战斗线文档 · Combat Lab

> **当前唯一活跃开发线**。主线地图已冻结 → `docs/frozen/`。

---

## 给朋友测试

| | |
|---|---|
| **在线踢馆** | https://allightning.github.io/openhand/combat-lab.html |
| **怎么玩** | [PLAY.md](./PLAY.md) |
| **规则详解** | [RULES.md](./RULES.md) |

本地：`npm run lab` → http://127.0.0.1:5175/combat-lab.html

---

## 文档分册

| 文件 | 读者 | 内容 |
|------|------|------|
| [PLAY.md](./PLAY.md) | 测试玩家 | 开局流程、战斗要点、反馈清单 |
| [RULES.md](./RULES.md) | 玩家 / 策划 / 程序 | 拆招四档、破法表、应激、势、总督 |
| [CHANGELOG.md](./CHANGELOG.md) | 开发 | 版本迭代记录 |
| [BREAK_ALIGN_DRAFT.md](./BREAK_ALIGN_DRAFT.md) | 策划 | **拆招核靠拢草案（待拍板，未改码）** |
| [DUEL_READ_DRAFT.md](./DUEL_READ_DRAFT.md) | 策划 | **武侠对线读招（已拍板）：反馈 / 对线 AI / 刀距伤 / 池闸** |
| [ENEMY_DIVERSITY_DRAFT.md](./ENEMY_DIVERSITY_DRAFT.md) | 策划 | **敌人多元 v2（已拍板）：智能>数值、敌兵刃精玄神、追、经典零拆招** |
| [ROGUE_GRADIENT.md](./ROGUE_GRADIENT.md) | 策划 / 程序 | **开踢肉鸽定稿（18 人、手牌上限、六系、3/7 选人）** |
| [BRANCH_MAP_DRAFT.md](./BRANCH_MAP_DRAFT.md) | 策划 | **树状遭遇（待拍板）：馆间事件、伤痕过馆、终局抉择、同道遭遇** |
| [ROADMAP.md](./ROADMAP.md) | 策划 | 拍板项与待实现 |
| [SCOPE.md](./SCOPE.md) | Agent | 目录白名单、验收命令 |

仓库总览与「自上次提交以来改了什么」→ 根目录 [DEVELOPMENT.md](../../DEVELOPMENT.md)。

---

## 开发入口

```bash
npm run lab              # 只开 combat-lab
npm run test:combat      # 战斗回归（改完必跑）
```

代码热区：

```
src/combatLab/           UI、踢馆、黑市、赌注、实验台
src/game/sim.ts          战斗引擎
src/game/intentWeakness.ts   破法 + planBreaks
src/game/labV2.ts        拆招奖励、势、变招
src/game/content.ts      牌 / 敌 / 意图
```

交接：`.cursor/handoff.md`
