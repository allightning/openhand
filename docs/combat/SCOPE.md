# 战斗线开发边界

细则与产品口径见 [AGENT.md](./AGENT.md)。现行收件箱：`.cursor/lanes/SYNC.md`。

## 必碰（战斗线）

- `src/combatLab/**`（产品壳；同名 `labRuleset` / `climbCaps` / `climbVitals` / `rogueRoster` 是 `src/game` 的 re-export）
- `src/game/` 里战斗内核：`sim.ts`、规则核（`labRuleset.ts`、`climbCaps.ts`、`climbVitals.ts`、`rogueRoster.ts`）、`rogueCards.ts`、`content.ts`、`weapons.ts` 等
  - **分层铁律：** `src/game` 不得 import `src/combatLab`。回归：`src/game/layerBoundary.test.ts`
- `combat-lab.html`、相关 CSS
- `docs/combat/**`（真源：本目录 + Notion；不要另开第二套 md 真源）

读招专用（非点名不改）：`break*`、`intentWeakness.ts`、`labV2*.ts`、`qiCommit.ts`、`trainingHall.ts`。

## 默认不读不改不测

`src/map/**`、`src/main.ts`、`src/story/**`、`docs/frozen/**`。

## 验收

```bash
npm run test:combat
npm run typecheck:combat
npm run lab
```

执行车道禁止 git commit。统筹测试通过且用户同意后再提交。默认不开页面测试。
