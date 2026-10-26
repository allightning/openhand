# 卡池 2.0 工作成果 · 2026-10-23

核玩二。口径是 `REGEN_TASK.md`。Notion 卡池逐张表读不到（连接器没有检索工具），施工以仓库稿 `CARD_POOL_PLAN_20261021.md` 为准。稿面没有的数字没动。`sim.ts` / `types.ts` 没改。没 commit。

开工 155 张的逐张快照在 `CARD_AUDIT_20261023.md`。

## 131 对账

`npx tsx scripts/audit-content.ts`：

| 系 | 张数 |
|---|---|
| any | 43 |
| 拳 palm | 16 |
| 刀 saber | 17 |
| 剑 sword | 15 |
| 枪 spear | 11 |
| 棍 staff | 14 |
| 钩 hook | 15 |
| 合计 | 131 |

费用 1/2/3/4 = 64/46/12/9。0 费牌 0 张。攻击 56，技能 75。

断言在 `contentValidation.test.ts` 的「卡池 2.0」：张数、各系、凡精绝、删牌不在表里、改挂、调价、`bondSchool`、起手。

## 删 24

连势家族 7：`combo` `comboTax` `comboPay` `chain` `chain2` `lateChain` `weave`。

通用瘦身 17：`salve` `follow2` `gather2` `tide` `bindwound` `lateMute` `latePouch` `lateMirror` `lateLeech` `ironPulse` `twinpalm` `follow` `charge2` `echo` `peonyBrew` `cauterize` `haste2`。

没有兼容壳。换页表里指向这些 id 的条目已拿掉。`cardTextV2` 里对应句子已拿掉。

## 改挂 15（通用 → 主语系）

拳：`push` `strike2` `push2` `sweep` `pierce` `buryKnock`。

刀：`cut` `venomFog` `lateBleed` `buryBleed`。

剑：`direct` `rift`。

枪：`thrust`。棍：`plant`。钩：`hookpull`。

## 交叉改挂 6

`bleedcut` 棍→刀，`spearLock` 枪→剑，`swordMute` 剑→刀，`drunkFist` 拳→刀，`hitSpear` 枪→剑，`hitStaff` 棍→拳。

## 判不定，进 CARD_HOLDS

合同红现在 3 张，不是开工时的 20。20 张的去向：

- 12 张架/光环和 `backpalm` `retreat`：按调价表费 ≥ 1，合同红消失。
- `weave` `cauterize` `peonyBrew`：删了。
- `close` `plant`：牌面补上已有的「1 格 / 1 根」，数值字段没改。
- `lateWard`：格挡仍是 16。16→12 不在整改表里，仍因 `value:block` 留在 `CARD_HOLDS`。

另两张是交叉系没拍的，人还在注册表里，只是费调到 4：

- `ultSaber`：击退是拳主语，刀绝招带着。改效果还是改挂，没自己拍。
- `ultSword`：裂创是刀主语，剑绝招带着。同上。

## 调价

稿 §4 的 44 处费用已落。绝招 8 张归 4 费。组合牌 `comboSaber` `comboSpear` `comboSword` `comboStaff` `comboHook` 从 2 到 3。`comboPalm` 仍是 2（表上没提）。

`scripts/audit-plan.ts` 自己的 `RECOST` 有 57 条，含自动提费和已删的 id。那些自动提费不在签字稿里，没落。

## rarity

字段 `common | adept | supreme`。连携不写这个字段。

判例（`content/cards/rarity.ts`，与 `scripts/audit-rarity.ts` 同一套）：

1. id 以 `fuse` 开头 → 不进三档。
2. 钩子有 `ultimate` 或 `aura` → 绝。
3. 引擎钩子或晕/缴械 → 精。
4. 主语层数合计 ≥ 2，或有主语但没有伤害也没有格挡 → 精。
5. 其余 → 凡。

标杆：`strike` 凡（只有伤害）；`setup` / `gather` 精（家族引擎）；八张绝招 + 六张光环 = 绝；十五张连携无 rarity。

实测：凡 44 / 精 58 / 绝 14 / 连携 15。`audit-rarity.ts` 同一分布。

## bondSchool

十五张连携都有。取值是 id 里靠前的那一系：`fusePalmSaber` → `palm`。换人结算不读这个字段。

## 起手

`breakStarterDeck`：五系第一张是 `strike`，不再是 `direct`。钩的位移槽是 `sidestep`，不再是 `push`。槽上的牌若已改挂到别系，换成该系或通用里还能打的牌，避免起手发出不能打的牌。十张、至少四张攻击。

## 拆库

`src/game/content/cards/{any,palm,saber,sword,spear,staff,hook,fuse}.ts` 是结算用的牌面。`legacy.ts` 只汇总。`cards.ts` 仍是投影：`CARD_REGISTRY` / `CARD_HOLDS`。没建 `cards/index.ts`，避免和 `cards.ts` 抢同一条 import。

通用牌写明 `school: "any"`。不写的话，`cardSchool()` 的旧兜底会把 `strike` 当成拳。

## 图鉴

`codexCatalog` 的牌条目有 `rarityLabel`：凡 / 精 / 绝 / 连携。正文末行是「品相：…」。位置和样式留给 UI。

牌面 flavor 里「不是 A 是 B」、`像`、`不问`、`只` 的几处已改句子，数字没改。

## 四脚本

| 脚本 | 结果 |
|---|---|
| `audit-content.ts` | 131；分系与上表一致；合同红 3；0 费空 |
| `audit-pool.ts` | 通用 43。主语踩线还剩：两张未拍绝招、组合牌的 `combo` 钩子（组合标记和拳连击共用钩子名）、连携牌本身跨系。前六张交叉改挂已不在名单里 |
| `audit-plan.ts` | 退出码 0。整改后 131，曲线 64/46/12/9。它打印「不存在」的 24 个 id，就是已删的。它自己的调价计数 57，含没签字的自动提费 |
| `audit-rarity.ts` | 凡 44 / 精 58 / 绝 14 / 连携 15 |

## 测试

`npm run test:combat`：834 过，12 失败。失败全在 `storyBeats.test.ts` / `storyEnv.test.ts` / `storyV3.test.ts`。`storyBeats.ts` 调用了没有定义的 `currentStory2`、`applyStory2Choice`。该文件归遭遇窗，本包没改。

`npm run typecheck:combat`：仅这 4 处报错，同文件。

卡池断言、图鉴、起手、黄金对局已过。黄金三份基线按新牌面重录了一次（费用和系别会改对局结果）。定向探针仍要求连击重放后连击层为 1、噬血后气血上升、霸体挡控后层数为 0。

## 创新思路（可固化的）

1. **整改表当纯数据，不写进结算。** `content/cards/rectify.ts` 只列删、改挂、调价。投影和测试都读它。下次改池先改这张表，再烘焙进分系文件，避免在 `sim.ts` 里加特例。
2. **审计脚本不抽随机数。** 处置是 id → 标签的纯函数。开工先把 155 张快照落盘；注册表已经是 131 张以后，复跑只打印、不覆盖快照。
3. **凡精绝用钩子判例，不手写 131 行。** 顺序固定：连携排除 → 绝招/光环 → 引擎/控制 → 层数 → 凡。判不定的不塞进三档，写进 `CARD_HOLDS` 的 `problems` 字符串，签名仍是 `{ row, problems }`。
4. **拆库按「结算还在不在」而不是按界面。** 分系文件保存旧 `CardDef`（伤、挡、绝招对象）。注册表是投影，多出来的只有 `rarity` 和 `bondSchool`。连携单独一个文件，因为一张牌挂两个系，塞进任一系文件都会让人以为它是该系专属。
5. **显式 `school: "any"`。** 缺字段会被旧兜底改判成拳。通用就是通用，写在牌上。
