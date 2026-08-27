# 战斗线开发边界

## 1. 范围（只读 / 只改这些）

### 必碰
- `src/combatLab/**`
- `src/game/sim.ts`、`simV2Hooks.ts`、`intentWeakness.ts`、`labV2.ts`、`labV2Constants.ts`
- `src/game/labEnemyStress.ts`、`labTuning.ts`、`labV21.ts`、`breakLootBus.ts`
- `src/game/content.ts`（仅卡牌/敌人/意图段）
- `src/game/weapons.ts`、`equippedWeapon.ts`、`foeCatalog.ts`（战斗相关子集）
- `combat-lab.html`、`src/combatLab/lab.css`、`gauntlet.css`
- `docs/combat/**`、`.cursor/handoff.md`

### 默认不读、不改、不测
- `src/map/**`
- `src/main.ts`（主线入口）
- `src/story/**`
- `src/game/rewards.ts`（主线战后奖励，有旧测试债）
- `docs/frozen/**`

需要改 `sim.ts` 时允许；**禁止**为战斗需求去抛光地图或接主线 UI。

## 2. 验收命令

```bash
npm run test:combat    # 战斗 + 引擎相关测试
npm run lab            # 浏览器只开 combat-lab
```

全仓 `npm test` 里的 map/rewards 失败**不算战斗线回归**，除非战斗改动牵动了共享模块。

## 3. Agent 规则

1. 新功能先在 `combatLab` 落地，主线 import 冻结。
2. 单轮尽量小 diff；每批改完跑 `test:combat`。
3. 数值改动后跑乱点基线：`src/combatLab/labMashBaseline.test.ts`。
4. 长对话结束前更新 `.cursor/handoff.md`。
5. 拆招/应激规则变更必须同步 `docs/combat/RULES.md`。

## 4. 仓库结构（战斗独立入口）

- Vite 双入口：`index.html`（主线，冻结）/ `combat-lab.html`（活跃）
- 战斗状态机：`src/combatLab/main.ts` → `gauntlet.ts` → `factory.ts` → `sim.ts`

## 5. 产品红线（战斗）

- 踢馆是核心循环：公开意图、拆招有回报、赌注/彩金有张力。
- 乱点胜率：末馆 &lt;30%；前馆按系别有梯度（棍系第1馆已知偏弱）。
- 单回合攻击总伤有总督上限（防满血秒杀）。
- 预览与结算必须一致（`planBreaks` preview = resolve）。
