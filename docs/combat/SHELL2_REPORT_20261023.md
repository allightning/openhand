# 壳屏 2.0 工作成果

2026-10-23 壳屏窗。任务卡 `docs/combat/SHELL2_TASK.md`。未 commit，未开页面。验收是 DOM 断言。

开工时 UI 相关测试里，门厅、配装、战斗板无重叠都是绿的。图鉴检索那一条当时红，检索串对不上，属卡池目录在飞，本窗没改 `codexCatalog.ts`。收工时全量 `npm run test:combat` 81 文件 / 858 绿，`npm run typecheck:combat` exit 0。

战斗板（`prodBattleUi` / `foePlayback` / `boardLayout`）、`src/game/**`、`codexCatalog.ts`、`dom/bindDom*`、结算数字都没动。按钮 id 和 `data-*` 钩子留着，音频窗的绑定不用改。

样式只加在 `lab.css` 末尾 `/* shell2 */` 一段。墨黑 `#1a1410`，宣纸米 `#f4ead6`，朱砂 `#9c2f1b`。这段选择器不写 `.lab-prod-combat`、`.fy-btn`、`.hand .card`、`.strip`。`gauntlet.css` 后加载，壳层用更长的选择器压过它。

## 1 门厅

活路径改走 `paintShellHall`。旧的 `renderGauntletHome` 还在，测试仍能看到「开程 / 明手：七步石台」。玩家看到的门厅标题是「明手」，不再写七步。石台上的「九步 / 七步」在战斗板，本窗没动。

第一眼：没记下营地时，整行朱砂按钮是「开打」。有续关时，这一格改成「续关 · 第 N 馆 · 余 M」，「另开一局」降到路线行。

路线：少林寺、江湖、朝廷暗线三个名字写在门厅上，文案从 `GAUNTLET_PATH_LABEL` 读。真正点选仍是下一屏的 `data-gauntlet-path`，避免在门厅直接跳过开打准备。路线屏三张卡加了换行，回门厅按钮还在。

队伍：有续关档时列出记下的人、兵器、出战张数。没有档时写「还没有记下的队伍。」续关按钮禁用。

登门四钮（登门、新手关、训练馆、周挑战）还在，周挑战仍禁用。

## 2 配装

原装配（人、谱 / 功法 / 心法 / 武器、行囊、卖出、合成）包在 `shell-loadout` 里。顶上加一行「谁 · 哪一页 · 几张」。回营地按钮去掉 `position: sticky`，避免滚的时候盖住人物。行囊改为可换行。

牌池浏览在装配下面，只读，不新造可点的装配钮。数据读 `CARD_REGISTRY`，名字读旧 `CARDS`。按系分组，顺序：通用、拳掌、刀、剑、枪、棍、钩。系内有 `rarity` 的先排绝、精、凡，再按费用。

实测 131 张：通用 43、拳掌 16、刀 17、剑 15、枪 11、棍 14、钩 15。`rarity`：凡 44、精 58、绝 14。另外 15 张没有这个字段，全是连携 `fuse*`：

`fusePalmHook` `fusePalmSaber` `fusePalmSpear` `fusePalmStaff` `fusePalmSword` `fuseSaberHook` `fuseSaberSpear` `fuseSaberStaff` `fuseSaberSword` `fuseSpearHook` `fuseSpearStaff` `fuseStaffHook` `fuseSwordHook` `fuseSwordSpear` `fuseSwordStaff`

这 15 张仍按系放进对应组，不补「连携」章。字段整池都空时，浏览条写「品相字段还没写上，先按系排。」牌池空时写「牌池是空的。」

## 3 图鉴

`shellFrames` 改调 `renderShellCodex`。`encyclopedia.ts` 和 `codexCatalog.ts` 没改。分册、搜索、翻页、关闭的钩子还在。条目区改成自动换列，长正文在条目里滚动。正文里的数字包成朱砂 `.shell-num`。正文里已有「品相：」的，提到条目最前。

检索无匹配时用原来的空句，并加上 `shell-empty`。

缺字段（渲染时数过 `searchCatalog` 的绝 + 技 + 兵，共 245 条，其中 `rarityLabel` 有值 131 条）：

- 图鉴册没有敌人。分册是绝、技、兵、状态、人物。
- `CodexEntry` 没有 `cost`、`school`、`damage` 字段。劲力写在 kicker 字符串里。
- 状态没有 `cap` 字段。上限写在正文里。
- `rarityLabel` 空着 114 条。外功、心法、符、道具、兵刃经常不写。牌面上的连携在目录里用 id 前缀写成「连携」，配装浏览只认 `rarity` 字段，所以那 15 张不显示章。
- `flavor` 空着 82 条。
- `related` 空着 97 条。

本窗没有为这些缺口编数字。

## 4 事页

选项按钮最前加一排朱砂数字筹码，从现成 blurbs 里抽出，句子不改。导语里的数字也包一层。没有选项时（赶路）只留「继续走」，并标 `shell-event-empty`。导语超过 10rem 在纸面里滚动。

## 5 死亡

结算屏和复活赛屏都套了 `shell-death`。

输了的结算：眉题「死亡」。评语用 flex 排到连胜数字前面。没有评语时写「这一馆没有另写评语。」赢了的结算眉题仍是「结算」，不把赢叫死亡。再来一局、回门厅两个 id 不动。

复活赛眉题「复活赛」。`data-lifeline` 四张卡换行，费用和说明留在原卡上。一张都没有时写「这一局没有复活赛。」不造一个没接线的按钮。

## 6 设置

分成三截：音量、试听、歌单。音量滑条、上一曲 / 播放 / 下一曲、三种循环、点歌、进度、好了，id 都还在。拖音效音量会响一声，这是原来的行为，文案写在音量截下面。播放 / 暂停的字仍由设置流程改，标题用「试听」。歌单空时写「歌单是空的。」曲名换行，不单行撑出面板。

## noOverlap 扩展

`noOverlap.test.ts` 从 4 则增到 12 则。战斗板原四则还在。新的一则守样式：`/* shell2 */` 之后必须有 `flex-wrap`、`position: static`、`overflow-wrap: anywhere`，不能有 `position: absolute` 和负的 `margin-left`，也不能出现战斗板选择器。

其余按屏：

| 屏 | 必须在的钩子 | 空态 | 长态 | 不重叠的组 |
|---|---|---|---|---|
| 门厅 | `start-gauntlet`、`hall-continue`、三条路名、登门四钮 | 没队伍；续关禁用 | 人名重复「夜行」30 次 | `hall-primary` `hall-routes` `hall-read` |
| 路线 | 3 个 `data-gauntlet-path`、`gauntlet-exit-path` | — | — | `path-routes` |
| 配装 | 回营地、四页、卖出、合成、牌池张数 | 空池；无品相时的提示 | 牌名重复「横练」24 次 | `loadout-tabs` `loadout-ops` `loadout-mates` |
| 图鉴 | 五册、搜索、关闭、翻页 | 检索 `zzzz-no-such-shell` | 条目限高滚动 | `codex-tabs` `codex-foot` |
| 事页 | `data-event-idx`、`.shell-mech` | 只剩继续走 | 导语重复「石板」40 次 | `event-choices` `event-go` |
| 死亡 | `gauntlet-retry`、`gauntlet-exit-result`、`data-lifeline` | 无评语；无复活赛 | 评语重复「刀口」80 次 | `death-actions` `death-revive` |
| 设置 | `sl-sfx` `sl-bgm`、试听三钮、三种模式、好了 | 歌单空 | 曲名重复「夜雨」40 次 | `settings-audition` `settings-modes` `settings-tracks` `settings-close` |

按钮宽度和间距读 `--shell-btn-w`（148px）、`--shell-btn-h`（44px）、`--shell-gap`（8px），用原来的 `flowBoxes` 排，相交即红。

## 创新思路

1. 六屏做成纯函数，入参是视图。空态和长态用夹具，不靠开页面。`renderSetup` 只把已经算好的档、牌池、事页送进去。
2. 无重叠和战斗板用同一套盒子算法。壳层把按钮宽和间距写成 CSS 变量，测试读这几个变量。样式用 `/* shell2 */` 切开，战斗板选择器写进这段会红。
3. 品相只认 `rarity` 字段。连携的 id 前缀不拿来补章。有字段时，系内按绝、精、凡再按费用排，第一眼能分开。
4. 事页数字从选项正文里提出来，不改遭遇句子。筹码在按钮最前，正文里的数字还留着。
5. 图鉴缺的敌人册、独立数值字段不编。画面只把正文里已经写着的「品相」提到条首，缺口记在上面的清单里。
6. 新布局套在旧钩子外面。`bindDom` 继续按原来的 id 和 `data-*` 接线，设置流程继续改「播放 / 暂停」这几个字。
