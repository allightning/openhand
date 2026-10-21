# 规则目录

行路的盘口、奖励、黑市、复活已经在这里。函数要 rng 时，rng 必传，不在这里写 `Math.random`。壳层 `gauntlet.ts` 负责注入和屏切换。

- `wagerRules.ts`：盘口、底彩、结算
- `rewardRules.ts` / `rewardRoll.ts`：奖励池、滚池、超级奖励
- `marketRules.ts`：黑市标价和买卖
- `lifelineRules.ts`：复活、亡命线、带伤过馆、配装增减
- `ladderRules.ts`：馆序、敌人、胜负推进
- `gauntletModel.ts`：跑程字段。`gauntletPorts.ts`：壳层注入点
