# 明手 · 开发文档

> 最后更新：**2026-08-28** · 当前活跃线：**Combat Lab / 连胜踢馆**  
> 主线地图与探索已冻结，见 `docs/frozen/`。

---

## 一、给朋友测试（最快入口）

| 方式 | 链接 / 命令 |
|------|-------------|
| **在线试玩（推荐）** | https://allightning.github.io/openhand/combat-lab.html |
| 本地 | `npm install` → `npm run lab` → http://127.0.0.1:5175/combat-lab.html |

玩家向说明：[docs/combat/PLAY.md](./docs/combat/PLAY.md)  
机制规则：[docs/combat/RULES.md](./docs/combat/RULES.md)

---

## 二、自上次 Git 提交以来的主要更新

基准提交：`237da5a`（*Ship playable过线 build for friend playtest*）及之后未推送的 checkpoint。  
本版以 **踢馆战斗线** 取代旧「装配实验室 + 主线混排」作为对外测试面。

### 2.1 产品形态：连胜踢馆

- **独立入口** `combat-lab.html`，`npm run lab` 只开战斗，不加载主线地图。
- **三条路径**：少林寺 / 江湖 / 朝廷暗线。肉鸽踢馆 **10 馆**。
- **流程**：开踢 → 选线 → 选系（六兵器）→ 首馆庄家垫资（×2/×3）→ 下注（可跳过）→ 战斗 → 战间奖励 → 无尽续踢或结算。
- **彩金 / 赌注**：连拆、完璧、速胜等盘口；破产线、整局一次赊账 + 救命四选一。
- **战间养成**：外功 / 心法 / 道具 / 助战同阶层；伙伴更高阶，仅第 4 / 7 / 12 关；外功·心法需指定受益角色。
- **分系外功**：14 门新外功（拳 3 / 刀 1 / 枪 3 / 剑 3 / 棍 2 / 钩 2），sim 钩子已接。
- **心法**：角色专属属性加成（HP / 劲力 / 回劲等），换人时重算。

### 2.2 战斗核心（v2 踢馆线）

- **拆招档**：破 / 让 / 追 / 放 / 空 / 打；意图条常显；硬拆反打真伤、连环拆、破眼处决窗。
- **势**：主要从拆招来，挨打清零。
- **全明牌意图时间轴**、变招 AI、应激段、总督伤害上限。
- **助战符 / 召唤**：战间道具与 labSummon 接线。

### 2.3 实验台（开发者）

- 多页签：战斗 / 敌人 / 兵刃 / 招式 / 外功 / 角色。
- **确认修改** + **恢复上一步**；全局清空覆盖。
- 角色被动名称/描述可覆盖（`labContentOverrides`）。

### 2.4 工程与质量

- `npm run test:combat`：**327** 项战斗相关测试（含开踢→战斗 bootstrap 冒烟）。
- Vite 双入口：`index.html`（主线，冻结）/ `combat-lab.html`（活跃）。
- GitHub Actions 自动部署 Pages（见 `.github/workflows/pages.yml`）。

### 2.5 冻结 / 未动

- `src/map/**`、`src/main.ts` 主线入口、大地图探索 — 代码仍在仓内，**本版不测、不抛光**。
- 旧全量记录：`docs/frozen/DEVELOPMENT.md`、`docs/frozen/PROGRESS.md`。

更细的战斗线迭代见 [docs/combat/CHANGELOG.md](./docs/combat/CHANGELOG.md)。

---

## 三、仓库结构（战斗线）

```
combat-lab.html          踢馆入口
src/combatLab/           UI、踢馆、黑市、赌注、实验台
src/game/sim.ts          战斗引擎
src/game/labV2*.ts       拆招、势、变招
src/game/intentWeakness.ts   破法表
src/game/content.ts      牌 / 敌 / 意图数据
docs/combat/             玩法与规则文档（活跃）
docs/frozen/             主线 / 地图历史文档
```

---

## 四、开发命令

```bash
npm install
npm run lab              # 本地踢馆 dev（5175）
npm run test:combat      # 战斗回归（必跑）
npm run build:pages      # 与 CI 相同的 Pages 构建
npm test                 # 全仓（含地图旧债，战斗线以 test:combat 为准）
```

Agent 交接：`.cursor/handoff.md`（新对话先读）。

---

## 五、文档索引

| 文档 | 读者 | 内容 |
|------|------|------|
| [README.md](./README.md) | 所有人 | 项目入口 |
| [docs/combat/PLAY.md](./docs/combat/PLAY.md) | 测试玩家 | 怎么玩踢馆 |
| [docs/combat/RULES.md](./docs/combat/RULES.md) | 玩家 / 策划 | 拆招与战斗机制 |
| [docs/combat/CHANGELOG.md](./docs/combat/CHANGELOG.md) | 开发 | 战斗线版本记录 |
| [docs/combat/ROADMAP.md](./docs/combat/ROADMAP.md) | 策划 | 待办与拍板项 |
| [docs/combat/SCOPE.md](./docs/combat/SCOPE.md) | Agent | 开发白名单 |
| [docs/frozen/DEVELOPMENT.md](./docs/frozen/DEVELOPMENT.md) | 考古 | 2026-08 前全游戏记录 |

---

## 六、发布检查清单

改完战斗线后：

1. `npm run test:combat` 全绿  
2. 浏览器：开踢 → 选线 → 选系 → 垫资 → 不押·直接打 → 进战斗  
3. 页头副标题含 `build path-v1`（确认非缓存旧包）  
4. 推 `main` 后等 GitHub Pages 部署（约 1–2 分钟）
