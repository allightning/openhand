# 明手项目进度锚点（最后更新：2026-08-23 晚）

## 绝对基准
- `LUOYANG_BASELINE.md`：局内 `/art/sprites`，立绘仅对话
- `MAP_DESIGN.md`：地图/建筑逻辑全量
- `DEVELOPMENT.md`：游戏内容与设计思路全量
- 桌面同步副本：`Openhand地图与建筑布局设计说明.md`、`Openhand-DEVELOPMENT.md`、`PROGRESS.md`

## 核心红线
- 单皇城：只汴京有皇帝叙事核心
- 美术：PNG sprite，禁 stand 当局内模型；禁为过测试删 NPC
- 洛阳错误库 V3（12 条）见 `MAP_DESIGN.md` §10
- 未要求不要 git commit

## 洛阳 V7.1（2026-08-23）
程序自检通过，**未宣称总验收**。等用户目视标签与疏密。
- 口径 A：凳 `o+t` 砍 80%（基线 99 → ≤19）；树补到凳基线 65–75%（[64, 74]）
- 口径 A1：只放宽 V3/V4 树数上限到 74，其余旧断言不动
- 洛阳门保留地标（南北牌楼各一条白字描边）；天津桥标在北跨，避免压门
- 干道/正交 1 格唇禁树；2–4 棵一丛；标签走 CSS 锚点 + 仲裁器（重叠隐藏、不挪）

测试：
`npx vitest run src/map/luoyangV7.test.ts src/map/luoyangV6.test.ts src/map/luoyangV5.test.ts src/map/luoyangV4.test.ts src/map/luoyangV3.test.ts src/map/luoyangV2.test.ts src/map/metro.test.ts`

## 全游戏（摘要）
已可玩：三主角、7 格战斗（93 牌 / 60 兵器 / ~170 敌）、大地图+驿站、洛阳中盘若干案。  
骨架未挂：`wilderness`、`starterVillage`、`story/mainline.ts`。  
薄：对话链、解谜、汴京等通用大城密度、对手读招。

## 下一步（建议，等用户点名）
1. 用户目视洛阳 V7.1（疏密、洛阳门/天津桥字、仲裁藏字）
2. 战斗：对手读状态改招 / UI 两侧状态
3. 支线与解谜落点；或汴京考据深挖
