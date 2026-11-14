# 数值核十班 · 2026-11-14

夜校十一班：刀配装 40 手手里没有位移。本班按「默认配装含解」把七系配方和奖励池对过。配方没缺，所以没补牌。奖励权重没改。未 commit。未开页面。

`npm run test:combat` 96 文件 / 966 绿。`npm run typecheck:combat` exit 0。

## P1 默认配装

游戏开局和模拟开局都走 `createGauntletRun` → `breakStarterDeck`。模拟没有另写一份刀配装。馆 8 开战牌堆按这个配方各发 3 张，里面有进步 3、撤步 3。

位移按 `MOVE_CARD_IDS` 计。起手 10 张，每系都有至少 1 张。

| 系 | 配方 | 位移 |
|---|---|---|
| 拳 | strike，hitPalm，elbow，defend，wardPalm，advance，retreat，mend，inbreath，push | 进步、撤步、推掌（精） |
| 刀 | strike，cut（精），hitSaber，drawcut，defend，wardSaber（精），advance，retreat，mend，inbreath | 进步、撤步 |
| 剑 | strike，hitSword，marking（精），defend，wardSword，advance，retreat，mend，inbreath，drawcut | 进步、撤步 |
| 枪 | strike，thrust（精），defend，wardSpear，advance，retreat，mend，inbreath，drawcut，split | 进步、撤步 |
| 棍 | strike，split，defend，wardStaff，advance，retreat，mend，inbreath，drawcut，elbow | 进步、撤步 |
| 钩 | strike，hookpull（精），hitHook，hookDisarm（精），defend，wardHook（精），sidestep，retreat，mend，inbreath | 换位、撤步 |
| 飞刀 | strike，defend，advance，retreat，mend，inbreath，drawcut，split，elbow，charge（精） | 进步、撤步 |

钩的换位要贴身才能对调。飞刀起手没有把飞刀牌装进去，`dartFlick` 不在这张通用起手表里，所以飞刀起手落成通用牌加进步。

换装保底的 6 张基础牌是另一张表。刀的基础牌是 cut、bleedcut、wardSaber、retreat、drawcut、gather，位移只有撤步。模拟这一局用的是上面的 10 张起手，不是这 6 张。

40 手摸不到进步，是发牌顺序。配方按顺序展开，先发出劈掌、斩、刀口。手牌顶住之后不再往下摸，进步留在牌堆后段。收势不弃牌，后段进不了手。

## P2 奖励池位移

只核对。池子每馆按战过的馆数开闸：纵步和换位从战过 4 馆起进池。类权重攻 55、防 20、位移 15、绝 45。牌组里位移已经 ≥3 张时，位移权重归零。下面的命中率是用该系起手当牌组、抽 400 次。

| 系 | 馆 1 池内位移 | 张数/池 | 抽中 | 馆 5 池内位移 | 张数/池 | 抽中 | 馆 8 池内位移 | 张数/池 | 抽中 |
|---|---|---|---|---|---|---|---|---|---|
| 拳 | 推掌、进步掌 | 2/12 | 0% | 再加纵步、换位 | 4/14 | 0% | 同左 | 4/15 | 0% |
| 刀 | 刀步 | 1/12 | 2.3% | 再加纵步、换位 | 3/14 | 8.0% | 同左 | 3/15 | 8.5% |
| 剑 | 剑圈 | 1/11 | 4.5% | 再加纵步、换位 | 3/13 | 8.3% | 同左 | 3/14 | 10.0% |
| 枪 | 枪退 | 1/10 | 4.0% | 再加纵步、换位 | 3/12 | 11.8% | 同左 | 3/13 | 11.0% |
| 棍 | 棍门 | 1/11 | 3.5% | 再加纵步、换位 | 3/13 | 11.5% | 同左 | 3/14 | 9.8% |
| 钩 | 贴、钩步 | 2/11 | 6.3% | 再加纵步、换位 | 4/13 | 14.0% | 同左 | 4/14 | 10.8% |
| 飞刀 | 无 | 0/5 | 0% | 纵步、换位 | 2/7 | 11.8% | 同左 | 2/8 | 11.5% |

拳的起手已经有进步、撤步、推掌，满 3 张，所以后面的位移权重是 0，400 次一次都没抽到。飞刀馆 1 的池里没有算进位移类的牌。侧步在基础牌里，不在这张奖励池的位移名单里。

## 创新思路

1. 查「配装有没有解」要数开战牌堆，不能数手里出现过的名字。有序发牌会把解留在后段，手牌满了就再也摸不到。
2. 奖励密度要同时写池内张数和加权抽中率。拳系池里有位移，软顶之后抽中率是 0。
