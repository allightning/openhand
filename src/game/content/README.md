# 内容目录

注册表合同在 `KIND.md`（kind 冻结）和 `docs/combat/ARCHITECTURE.md` 阶段 4。

- `cards.ts` / `enemies.ts` / `techniques.ts` / `mindArts.ts` / `charms.ts` / `items.ts`：同构字段 `id / cost / school / kind / effectHooks / values / text`
- `legacy.ts`：旧牌、外功、敌人、心法表。结算仍读这张表
- `src/game/content.ts`：旧路径，re-export 旧表和注册表

兵器 `weapons.ts` 不是外功，不在这四张表里。
