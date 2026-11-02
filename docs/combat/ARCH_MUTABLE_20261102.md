# rules 里改传入 Battle 的函数

2026-11-02 架构窗。只记账，不改 `src/game/rules`，不改 `src/game/sim.ts`。

扫描了 `src/game/rules` 下 14 个 `.ts`。会写入传入 `Battle`（或它里面的单位）的函数有 9 个，都在下面五件文件里。其余函数要么不接 `Battle`，要么只读（`wagerBattleStats`、`unitBackToWall`、`hookSmashLine`、`spearReverseReady`）。

改法的共同形状：函数返回新 `Battle`，不写传入的那一份。没改到的字段保持原引用。调用点在 `src/game/sim.ts` 的，把局部参数重新绑到返回值（`b = out.battle` 或 `next = out.battle`），后面的语句读这份新对象。这些函数今天的调用方都把 `Battle` 当原地参数，没有接返回的 state。

## 总表

| 文件 | 函数 | 写入的字段 | 调用点 |
|---|---|---|---|
| `rules/reactionWindow.ts` | `openSpearReverseWindow` | `reactionWindow`（整扇换掉） | 无 |
| `rules/reactionWindow.ts` | `takeSpearReverse` | `energy`；窗上的 `leftover`；然后 `reactionWindow = undefined` | 无 |
| `rules/reactionWindow.ts` | `declineReaction` | `reactionWindow = undefined` | 无 |
| `rules/wallLinks.ts` | `hookSmashSwap` | `player.pos`、`enemy.pos`、`enemy.hp` | `src/game/sim.ts` `pullUnit` 1820 行 |
| `rules/envTags.ts` | `tickBurnCells` | 站在灼烧格上的 `player.hp`、`foes[].hp`、必要时 `enemy.hp` | `src/game/sim.ts` `applyStatusTicksAtTurnEnd` 4652 行（参数名是 `next`） |
| `rules/dartPin.ts` | `addPin` | `foePin` | `src/game/sim.ts` `applyCard` 2600 行 |
| `rules/dartPin.ts` | `applyPinBudget` | `foePin`（有钉时清成 0） | `src/game/sim.ts`：`knockAway` 1705、`pullUnit` 1828、`resolveCharge` 3462、`resolveAdvance` 3502、`resolveLunge` 3554、`resolveRetreat` 3810 |
| `rules/staffCharge.ts` | `gainCharge` | `chargeStacks` | `src/game/sim.ts` `applyCard` 2543 行 |
| `rules/staffCharge.ts` | `consumeChargeBurst` | `chargeStacks`（写成 0） | `src/game/sim.ts` `applyCard` 2545 行 |

`openSpearReverseWindow`、`takeSpearReverse`、`declineReaction` 全库没有调用。`sim.ts` 现在从 `src/game/reactionWindows.ts` 开窗、接窗。这三件不要接回 `sim.ts`。

## 逐个改法

### `openSpearReverseWindow`

返回新 battle，只换 `reactionWindow`：

```ts
{ ...b, reactionWindow: { kind: "spearReverse", cost, leftover, dir, intentKind, chargeDamage? } }
```

早退没有。调用点：无。

### `takeSpearReverse`

返回 `{ battle, notes }`。

- 没有回马枪窗，或劲不够：`battle` 用入参原引用，`notes` 照现在的句子。这两条今天也不写字段。
- 打出：`{ ...b, energy: b.energy - cost, reactionWindow: undefined }`。今天先把窗上的 `leftover` 写成 0 再清窗，两步之间没有别的读取。新 state 直接不带这扇窗。

调用点：无。

### `declineReaction`

返回 `{ battle: { ...b, reactionWindow: undefined }, window: b.reactionWindow }`。窗对象本身不改。调用点：无。

### `hookSmashSwap`

返回 `{ battle, notes }`。`player` 和 `enemy` 各拷一层再改站位；敌血在新 `enemy` 上减 `WALL_DAMAGE`。

`b.enemy` 有时和 `b.foes` 里同一 `id` 是两个对象。新 state 用同一个新 `enemy` 填回 `enemy`，并把 `foes` 里同 id 的那格换成它。站位没变成、血仍要减，所以成功路径总是新对象。

调用点 `src/game/sim.ts` 的 `pullUnit`（1820 行）：`const out = hookSmashSwap(...)`，`b = out.battle`，后面的缴械和 `syncFront` 读这份 `b`，播报用 `out.notes`。

### `tickBurnCells`

返回 `{ battle, notes }`。灼烧格为空时 `battle` 用入参原引用。

有格时按单位拷贝：没站在灼烧格上、或已经倒下的单位保持原引用；打中的单位 `{ ...u, hp: u.hp - dmg }`。`player` 单独换。`foes` 用 `map` 换中的那些。`enemy` 若已在 `foes` 里，用换过的那份，不再打第二次；不在 `foes` 里才单独扣。

调用点 `src/game/sim.ts` 的 `applyStatusTicksAtTurnEnd`（4652 行）：`const out = tickBurnCells(next)`，`next = out.battle`，播报循环改读 `out.notes`。后面的胜负和裂创都读这份 `next`。

### `addPin`

返回 `{ battle, notes }`。层数小于 1 时 `battle` 用入参原引用，`notes` 为 `[]`。否则 `{ ...b, foePin: next }`，`notes` 仍是 `钉 ${next}`。

调用点 `src/game/sim.ts` 的 `applyCard`（2600 行）：`b = out.battle`，`notes.push(...out.notes)`。同一函数里后面的击退、拉近读这份 `b`。

### `applyPinBudget`

返回 `{ battle, steps }`。没有钉时 `battle` 用入参原引用，`steps` 等于 `want`。有钉时 `{ ...b, foePin: 0 }`，`steps` 为 `max(0, want - pin)`。

六处调用都在 `src/game/sim.ts`，都要把原来的数字换成 `out.steps`，并把 battle 绑回去：

| 函数 | 行 | 现在接住的名字 |
|---|---:|---|
| `knockAway` | 1705 | `need` |
| `pullUnit` | 1828 | `left` |
| `resolveCharge` | 3462 | `steps` |
| `resolveAdvance` | 3502 | `budget` |
| `resolveLunge` | 3554 | `budget` |
| `resolveRetreat` | 3810 | `budget` |

### `gainCharge`

返回 `{ battle, notes }`。加上的层数小于 1 时 `battle` 用入参原引用。否则 `{ ...b, chargeStacks: next }`，播报仍是 `蓄力 ${next}`。

调用点 `src/game/sim.ts` 的 `applyCard`（2543 行）：`b = out.battle`，`notes.push(...out.notes)`。紧接着的爆发读这份 `b`。

### `consumeChargeBurst`

返回 `{ battle, stacks, damage }`。层数已经是 0 时 `battle` 用入参原引用。否则 `{ ...b, chargeStacks: 0 }`，`stacks` 和 `damage` 与现在相同。

调用点 `src/game/sim.ts` 的 `applyCard`（2545 行）：`b = out.battle`，播报和 `hitEnemy` 用 `out.stacks`、`out.damage`。

## sim.ts 超过 80 行的函数

`src/game/sim.ts` 现为 **5204** 行。按 `function` 声明配花括号（字符串和注释里的括号已剥掉），函数 199 个，超过 80 行的 **10** 个：

| 函数 | 行号 | 行数 |
|---|---|---:|
| `applyCard` | 1949–2712 | 764 |
| `makeBattle` | 571–761 | 191 |
| `hitEnemy` | 1518–1695 | 178 |
| `resolveIntent` | 3659–3802 | 144 |
| `pickIntent` | 4049–4169 | 121 |
| `statusChips` | 5083–5203 | 121 |
| `endTurn` | 4962–5081 | 120 |
| `knockAway` | 1697–1796 | 100 |
| `planFromFirstAtPos` | 4414–4510 | 97 |
| `applyClimbPhaseBeat` | 4836–4928 | 93 |

行号是当前文件的起止行，含函数签名那一行和收尾的 `}`。这张表只记账。拆这些函数是阶段 5 的事，不在这次改。
