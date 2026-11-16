# 明手 · 七步石台（Combat Lab）

武侠卡牌。**对外测试 = 行路（十程肉鸽）+ 登门（硬核短拍）。** 主线地图已冻结。

## 试玩

https://allightning.github.io/openhand/

本地：`npm install` → `npm run lab`

说明：[docs/combat/PLAY.md](./docs/combat/PLAY.md)

## 开发（新对话）

先读 **[docs/combat/AGENT.md](./docs/combat/AGENT.md)**，再读 `.cursor/lanes/SYNC.md`。

```bash
npm run test:combat
npm run typecheck:combat
```

构建用 `npm run build:pages`；`npm run build` 的全量 tsc 会扫到冻结区 `src/map` 的历史类型错，不代表战斗线状态。
