# Openhand 地图 · 建筑 · 物件设计说明（全量）

> 更新日期：2026-08-23  
> 仓库：`/Users/lightning/openhand`  
> 用途：给其他开发者一份**当前真实实现**的地图/建筑逻辑与代码对照。洛阳为最深工程；其余大城走通用 metro。  
> 配套总览：`DEVELOPMENT.md`（战斗、剧情、系统）。

---

## 1. 产品里地图处在什么位置

核心循环是 **战斗肉鸽**（七格石台 + 卡牌组合），不是地图美术。地图要求：

- 整洁可读即可；AI 贴图可先顶着。
- **不要**为岸线/悬崖/纹理过度抛光，除非用户点名。
- 传送点是建筑（亭、门、牌楼），门上有名字；旅行门用**横向**门图。
- 任意两门户 Chebyshev 距离 **≥ 3**（`src/map/world.test.ts`）。
- 水：不要岸 overlay 刷薄内溪；路跨水必须走桥。

局内人物用 `/art/sprites/sprite-*.png` 小模型。  
对话头像才用 `/art/stand/*.png` 立绘。**严禁立绘当局内模型。**

---

## 2. 三层地图体系

| 层级 | 代表 | 生成 | 典型格数 | 核心文件 |
|------|------|------|----------|----------|
| **港湾手绘** | `wharf` `yard` `customs` `pit` 及 tax/rope 扩厅 | 手写 ASCII | 小～中（户外壳约 32×24） | `scenes.ts` `hubScenes.ts` |
| **一级大城** | 长安/洛阳/汴京/淮阴/扬州/建康/苏州/临安 | `buildMetro()`；洛阳例外走 `generateLuoyang()` | 默认 **72×48**；淮阴 **64×42**；洛阳 **84×54** | `metro.ts` `metroCities.ts` `luoyangGen.ts` |
| **驿站过路镇** | 嘉兴、无锡、潼关等 11 镇 | 每镇独立 `ROAD_ASCII` | 宽约 42～54，高约 12 | `roads.ts` |

注册：`SCENES`（`scenes.ts`）合并 `METRO_CITIES` + `HUB_SCENES` + `ROAD_SCENES` + 手写核心场景 + `usurpCamp`/`shaolin`/`luohan`。  
运行时：`loadScene(scene, run)`（`world.ts`）把 ASCII 解析成 `World`。

城列表（`cities.ts`）：

- **PRIMARY_CITIES**：`changan` `luoyang` `bianjing` `usurpCamp` `huainan` `yangzhou` `jiankang` `suzhou` `linan`
- **TRANSIT_TOWNS**：`jiaxing` `wuxi` `changzhou` `chuzhou` `suqian` `suzhousu` `bozhou` `yanshi` `shanzhou` `tongguan` `gaoyou`

`SceneId` 约 **97** 个（见 `types.ts`）。

准入：`access.ts` 分 0～5 层。洛阳/汴京/临安等在高层，靠主线 flag + `roadPass`。

---

## 3. ASCII 图例（权威在 `world.ts`）

解析：`loadScene` → `tileOf()` 出地形；`PROP_LETTER` / `extraProp()` 出物件。

### 3.1 地形 → Tile

| 字符 | Tile | 说明 |
|------|------|------|
| `#` | wall | 墙、外框 |
| `.` | floor | 空地 |
| `=` | road | 官道/巷道 |
| `~` | water | 深水，不可走 |
| `%` | water（户外）/ rock（室内） | 泽岸 |
| `^` | hill（户外）/ rock（室内） | 浅丘 |
| `,` | pack | 摊席/门槛 |
| `G` | gate | 门闸（洛阳牢房 + barrier） |
| `!` | sign | 告示/店招，文案在 `signs[]` |
| `C` | cache | 残谱箱 |
| `*` | brazier | 炉火 |
| `I` / `$` | item | 地面道具 |
| `n/e/w/s/x` | seal | 封印（与 talker 键冲突时避开） |
| `@` | floor | 玩家出生 |

### 3.2 物件字母 → PropKind

| 字符 | Kind | 默认贴图 |
|------|------|----------|
| `v` | crate | obj-chest |
| `b` | barrel | obj-barrel |
| `l` | lantern | obj-lantern |
| `p` | post | obj-pile |
| `t` | bench | obj-bench |
| `j` / `a` | jar | obj-jar |
| `&` | tree | stamp 树 |
| `d` | dummy | obj-dummy |
| `o` | stool | obj-stool |
| `y` | table | obj-table |
| `z` | rack | obj-rack |
| `c` | sandbag | obj-sandbag |
| `k` | cabinet | obj-cabinet |
| `i` | shelf | obj-shelf |
| `u` | bed | obj-bed（**仅室内**） |
| `q` | counter | obj-counter（**仅院内/大厅**） |
| `h` | screen | obj-screen（**仅二级室内**） |
| `f` | pot / 洛阳 cart | 洛阳 `f`→马车 |
| `m` | desk | obj-desk |
| `g` | censer | obj-censer |

### 3.3 洛阳特判（`extraProp`）

| 字符 | 结果 | 可走？ |
|------|------|--------|
| `:` | `arch` tag=`院门`（俯视木门 `obj-hut-h.png`） | 是（arch 不在 BLOCKING） |
| `;` | `arch` tag=`洛阳门`（天津桥牌楼） | 是 |
| `H` | `house` tag=`铺面` | 否 |
| `e` | `stall` | 否 |
| `n` | `well` | 否 |
| `G` | gate 地砖 + `item:roadPass` 空气墙 | 无票否 |

旅行门户：单字母 rim（`D/W/E/N/S/U/Y/A`）。  
洛阳室内门：双字符 `entityMarks`（`FA` 烟波内室、`GA` 牢房）。  
交互实体禁止单字母（`AA`…`ZZ`、`P01`），避免和陈设字母撞车。

---

## 4. 碰撞与寻路

`walkable(w, x, y, run)` 为假当：

1. tile 是 `wall` / `water` / `rock` / `hill`
2. 存在未开启的 `Barrier`（`item:roadPass` / `flag:xxx`）
3. `gate` 且门未开
4. 格上有 NPC / talker
5. 格上有 `BLOCKING` 物件（几乎所有家具 + house/stall/well/tree）

`floodFloor` 用同一套规则。`tryMove` 撞 barrier 会出提示（牢房无票弹回）。

`propFootprint.ts`：

- 室外（road/pack/gate）足迹强制 **1×1**
- 室内：柜台 3×1、屏风 2×1、车 2×1
- 洛阳室外直接剔除 screen/bed；水/山上的 prop 剔除；路上的树剔除

原则：**看得见的障碍才挡人；看不见的地方不能卡人。**

---

## 5. 通用大城（`buildMetro`）

洛阳以外的一级城走这条流水线（`metro.ts` + `metroCities.ts`）。

```
空白 W×H
  → 边框墙
  → 可选水体 (none|north|east|canal)
  → layoutOf(id) 选路网
  → 10 个功能坊（衙门/武馆/医馆/当铺/酒楼/商铺/茶棚/驿/祠/杂棚）
  → deep? siheyuan : building
  → furnishDistrict
  → paintRoads + approachDoor
  → 可选丘陵
  → 市集摊簇 + 疏树
  → rim 门户 + @
  → NPC：功能人门檐，路人市集，禁止主干道排队
  → 可达性补救
```

### 5.1 路网骨架 `MetroLayout`

| 城 | layout | 意象 |
|----|--------|------|
| huainan | ferry | 横河 + 两侧竖巷 |
| changan | wardGrid | 三分竖街 + 中横里坊 |
| bianjing | imperial | 三线御街 |
| yangzhou | canalLadder | 双横巷 + 竖梯 |
| jiankang | riverFan | 中轴 + 扇形横阶 |
| suzhou | waterLane | 碎水巷 |
| linan | lakeShore | 西湖 + 东岸蛇路 |

`cross` 只作兜底，主城不要落到它。

### 5.2 建筑几何

- `building(x,y,bw,bh,door,mark)`：`#` 外墙、`.` 内空、门 `:`、角灯。
- `siheyuan`：`bh≥7` 时加隔墙中门，两进。
- 坊大约 6～10 × 5～9。

像素：`TILE = 40`。72×48 ≈ 2880×1920，再经舞台缩放。

---

## 6. 洛阳（当前最深工程，V6）

洛阳**不走** `buildMetro` 的十字坊壳，走 `generateLuoyang()`（`luoyangGen.ts`）。

### 6.1 骨架常数

```
W = 84, H = 54
cx = 42, cy = 27
```

- 洛水横贯：`cy±2` 为 `~`，`cy±3` 为 `%`
- 天津桥：中轴三列 `=` 冲开水面；`(cx, cy±2)` 钉 `;` → **洛阳门**（严禁删除）
- 北干道 `y = cy-5 = 22`；南干道 `y = cy+5 = 32`
- 旁路 `cy±4`；桥轴 `|x-cx|≤1` 禁站人、禁树、禁巨柜

### 6.2 功能分区（设计意图）

| 区 | 位置 | 建筑 |
|----|------|------|
| 官府（威严） | 北岸西 | 河南府衙、六扇门、牢房 |
| 武备 | 北岸东 | 定鼎武馆、城防营、白马寺 |
| 北市（繁华） | 干道 cy-5 北侧 | 当铺、绸缎、古董、铁匠、车马、回春堂、茶铺… |
| 南市 | 干道 cy+5 南侧 | 杂货、镖局、肉铺、驿、米铺、布行 |
| 风月 | 南岸东 | 烟波楼（外院迎客，内室阿砂） |
| 酒楼 | 南岸西 | 太白酒楼 |
| 民居 | 穿插 | 永丰/殖业/履道/敦厚等坊 |

### 6.3 两种建筑形态

**院子 `form:"courtyard"`** → `generateCourtyard`

- 满圈 `#`，内空 `.`
- 外门 **双格** `:`（俯视院门，禁止「看着能走却空气墙」）
- `jin` 2～3 进时加隔墙，中门同样双格
- 内陈设只走 `furnishRoom(fn)`（按衙门/酒楼/武馆/牢房…）
- **不再**对室外院子套室内模板 `furnishByTemplate`（那是屏风漂河的根因）

**临街铺 `form:"street"`** → `generateStreetShop`

- 无黑墙、无马路柜台
- 一格房子 `H` + 门口单格幌/摊/灯
- 店门必须贴干道：北市 `y = cy-8`（门在 cy-6，路在 cy-5）；南市 `y = cy+6`（门朝北对路）
- 终局把店门拉 **2 格宽** 支路接到 `cy±5`

### 6.4 生成后处理（顺序重要）

1. `ensureYardAlleys` — 相邻院落间隙 1～2 格打成 `=`，保证 2 格通道
2. `fillVacuumPatches` — 消灭 **15×15 纯空地**，点 5×4 小宅（墙+院门+井+树）
3. 店门接干道
4. 旁路 `bypass(cy±4)`、东西门接入
5. NPC：`placeTalkMark` + `entityMarks`（`AA`…）；同 id 只能放一次
6. `sanitizeOutdoorLuoyang` — 室外清掉 `h`/`u`
7. 院子：`renderWallVariant`（墙角桩，不写屏风）+ `renderBuildingName`（`!`）+ `applyBuildingTheme`（只写 `.`，不写马路/水）
8. `validateReachability` — 门口 BFS
9. 内部门 `FA`/`GA` 钉在院**深处**，不是外门
10. 牢房重砌：满墙 + 唯一 `G` + barrier `JB`（`item:roadPass`）
11. 树木成组（院角落/河边，主路清空，约 8～28 棵）
12. 清干道家具/人；重钉洛阳门

### 6.5 二级室内

| 场景 | 尺寸 | 进出 | 人 |
|------|------|------|----|
| `luoyang_yanbo_inner` | 12×10 | 外 `FA` ↔ 内 `A` | **仅** `luoAsha`；屏风 `hh` 2 格宽 |
| `luoyang_yamen_prison` | 12×10 | 外 `GA` ↔ 内 `A` | **仅** `luoJailer`；外院是 `luoJailer2` |

同名 NPC 全洛阳（含室内）同一时间只能一个实体。

### 6.6 洛阳建筑表（`luoyangMeta.ts`）

| key | 名字 |
|-----|------|
| yamen | 河南府·正堂 |
| jail | 河南府·牢房 |
| sixDoors | 六扇门 |
| garrison | 城防守备营 |
| martial | 定鼎武馆 |
| temple | 白马寺 |
| wine | 太白酒楼 |
| brothel | 烟波楼 |
| clinic | 回春堂 |
| pawn | 通远质库 |
| silk | 绸缎庄 |
| smith | 铁匠铺 |
| post | 洛阳驿 |
| shop1～6 / shop7～8 | 南市杂货、古董、肉铺、茶铺、米铺、布行、北市茶摊/油店 |
| shed / shed2 | 镖局 / 车马行 |
| home1～6 | 永丰坊、殖业坊、履道坊、敦厚坊、永丰东巷、平康西巷 |
| bridge / gate | 天津桥 / 定鼎门 |

查表：`buildingByYard(yardKey)`。

### 6.7 洛阳旅行门户

- `D` → 偃师 `yanshi`
- `W` → 陕州 `shanzhou`
- `E` → 汴京 `bianjing`

---

## 7. 驿站（`roads.ts`）

每镇一份独立 ASCII，禁止「同一十字只换水/山贴图」。  
测试锁：全文唯一 + 「路骨指纹」唯一（只留 `=` 与 rim）。

| id | 意象 | 连通 |
|----|------|------|
| jiaxing | 北水门 | 苏↔临安 |
| wuxi | 西脊+东山 | 常州↔苏州 |
| changzhou | 双横环廊 | 建康↔无锡 |
| chuzhou | 山折 L | 淮阴↔建康 |
| suqian | 横渡 | 宿州↔淮阴 |
| suzhousu | 关隘廊 | 汴京↔宿迁 / 高邮 |
| bozhou | 宽横街 | 偃师↔淮阴 |
| yanshi | 横贯 WE | **洛阳**↔亳州 |
| shanzhou | 山水夹道 | 潼关↔**洛阳** |
| tongguan | 窄关 | 长安↔陕州 |
| gaoyou | 湖堤 | 宿州↔扬州 |
| wineUp | 酒楼雅间 | → `wine` |

W/E 必须在 x=1 / x=w-2，并有连续 `=` 通到。

---

## 8. 渲染与标签

```
ASCII → loadScene(tiles/props/actors/portals)
     → tileset 选砖/草/水路
     → main.ts：40px 格 + 绝对定位
     → 浮动层 #float-labels
```

**标签（V6）**

- `floatLabel` 用 `left/top`（格子顶边中点）
- CSS：`transform: translate(-50%, -100%)` = **底部居中**，字在头顶正上方
- z-index **9999**，树/墙/人不得遮字

**门图**

- 旅行门：`doorSrc(kind)` → `obj-hall-h.png` 等，一律横向
- 洛阳门：`obj-paifang-*.png`
- 院门：`obj-hut-h.png`

**地板**

- 大城偏砖 `gravel-brick`
- 驿站偏草/土
- 产品约定：不要用 shore overlay 刷细内溪

---

## 9. NPC 落点规则（洛阳）

`canStand` 拒绝：

- 主路 `=`（桥轴、cy±5、cy）
- 门格、门外正前方一格、`G` 空气墙格
- 已被占用格

掌柜站屋侧/柜台后；狱卒站门内侧不堵门；市集人聚摊旁。  
失败会 rescue 到可达空地，禁止静默丢 NPC。

---

## 10. 【错误积累库 V3】红线（改洛阳必读）

除非用户主动要求，触犯任一条视为验收失败：

1. 禁交互错乱：图/对话/功能/碰撞必须对应
2. 禁人体堵路、建筑卡山、路不通
3. 禁马路巨型家具（大柜/兵器架只在院内）
4. 禁空气墙叙事：牢房要围墙 + 唯一入口 + 逻辑判定
5. 禁树木牛皮癣：成组，主路清空
6. 禁删除洛阳门等已确认地标
7. 禁 NPC 分身：同名全图同时只能一个
8. 禁全局 UI 偏移：名字底部居中
9. 禁室内外图层混淆：屏风/床不得出现在室外大地图
10. 禁商铺脱离道路：必须贴主/次路
11. 禁 15×15 超级真空
12. 禁院落胡乱相连堵路：墙缝有门或封死，院间至少 2 格通道

---

## 11. 代码热文件

| 文件 | 职责 |
|------|------|
| `src/map/types.ts` | SceneId / Tile / PropKind / World |
| `src/map/world.ts` | 解析、碰撞、移动、交互、barrier |
| `src/map/scenes.ts` | SCENES 注册 + 海量对话树 |
| `src/map/metro.ts` | buildMetro + 主题/墙变体/店招/可达 |
| `src/map/metroCities.ts` | 各城文案、门户、尺寸 |
| `src/map/luoyangGen.ts` | 洛阳生成器（V6 权威） |
| `src/map/luoyangMeta.ts` | 建筑/NPC 元数据 |
| `src/map/luoyangHub.ts` | 牢房、烟波内室 |
| `src/map/entityMarks.ts` | 双字符实体 ID |
| `src/map/propFootprint.ts` | 多格足迹与室外清洗 |
| `src/map/placement.ts` | 通用落点 / 物件封顶 |
| `src/map/npc.ts` | 洛阳 NPC 四维立绘表 |
| `src/map/tileset.ts` | 地砖、物件、门、sprite 映射 |
| `src/map/access.ts` | 城际准入 |
| `src/map/roads.ts` | 驿站 |
| `src/map/hubScenes.ts` | 税卡/缆厂扩厅 |
| `src/map/cities.ts` | 一级城 / 过路镇列表 |
| `src/assets/sprites.ts` | 局内 sprite vs 立绘 stand |
| `src/main.ts` | 绘制、floatLabel、交互 UI |
| `LUOYANG_BASELINE.md` | 截图锁定的美术/骨架红线 |

---

## 12. 测试

```bash
npx vitest run src/map/luoyangV7.test.ts src/map/luoyangV6.test.ts \
  src/map/luoyangV5.test.ts src/map/luoyangV4.test.ts \
  src/map/luoyangV3.test.ts src/map/luoyangV2.test.ts \
  src/map/metro.test.ts src/map/world.test.ts
```

| 文件 | 锁什么 |
|------|--------|
| V2 | 双字符 ID、青楼无兵器、内部门在深处、临街无黑墙 |
| V3 | 洛阳门、室内多格、树密度、市集 |
| V4 | 主路清空、临街无 q、牢房 G+barrier、树成组 |
| V5 | NPC 唯一、东都密度、建筑不压山、float 层 |
| V6 | 室外无屏风/床、商铺贴路、无 15×15 真空、院门可见、标签 9999 |
| V7 | 西京河南府绑定、慈惠堂、洛阳门钉桥、门户 ≥3 |
| V7.1 | 凳 ≤19、树 [64,74]；干道禁树；标签仲裁。A1 只放宽 V3/V4 树上限 |
| metro / world | 建筑名、子场景注册、全图加载、门户间距 ≥3 |

---

## 13. 给接手者的改图建议

1. **先读** `LUOYANG_BASELINE.md` + 本节错误库，再动 `luoyangGen.ts`。
2. 改院子坐标后，同步改 V2～V6 里写死的 bbox，并跑测试。
3. 室内家具只进 `luoyangHub.ts` 的二级场景，不要写回大地图。
4. 通用大城（汴京/长安等）改 `metro.ts` / `metroCities.ts`，不要复制洛阳生成器，除非用户要「陪都级」深挖。
5. 不要为了过测试删 NPC / 删洛阳门 / 用立绘换小人。
6. 地图验收以用户目视为准；测试绿 ≠ 验收通过。
