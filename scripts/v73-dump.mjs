import { writeFileSync } from "node:fs";
import { generateLuoyang } from "../src/map/luoyangGen.ts";
import {
  W,
  H,
  cx,
  cy,
  PALACE,
  IMPERIAL_AXIS,
  YINGTIAN_GATE,
  LUOYANG_BRIDGES,
  V73_TREE_MIN,
  V73_TREE_MAX,
  V73_LANTERN_MAX,
  LUOYANG_L_SHAPE_KEYS,
  LUOYANG_YARD_DEFS,
  sweepBareOutdoor,
} from "../src/map/luoyangV73.ts";

const scene = generateLuoyang();
const g = scene.ascii;

const compact = (ch) =>
  ({
    ".": "·",
    "#": "█",
    "=": "═",
    "~": "≈",
    "%": "░",
    ",": ",",
    "&": "T",
    l: "L",
  })[ch] ?? ch;

const layers = g.map((r) => [...r].map(compact).join("")).join("\n");

const counts = {};
for (const row of g) for (const ch of row) counts[ch] = (counts[ch] ?? 0) + 1;

let outdoorBare = 0;
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    if (g[y][x] !== ".") continue;
    const probe = structuredClone(g);
    sweepBareOutdoor(probe, LUOYANG_YARD_DEFS, cx, cy);
    if (probe[y][x] === ".") outdoorBare += 1;
  }
}

const courtyards = LUOYANG_YARD_DEFS.filter(
  (y) => y.form !== "street" && !["yingtian", "duanmen", "tongyuanGate", "lideGate"].includes(y.key),
);
const lRows = [...LUOYANG_L_SHAPE_KEYS].map((k) => {
  const yd = LUOYANG_YARD_DEFS.find((y) => y.key === k);
  return `${k}\t${yd?.x},${yd?.y}\t${yd?.w}×${yd?.h}\tL`;
});

const lanternLedger = [
  ["御街 cx±2 y=4,20,36,52", 8],
  ["W门 (2,21)(3,21)", 2],
  ["E门 (80,21)(81,21)", 2],
  ["通远/立德坊门", 4],
  ["天津桥人行道 (40/44,cy±4)", 4],
  ["南市楼/西市楼", 4],
  ["坊门邻格余量", 2],
];

const note = `# V7.3 计数 note

## 密度
- 裸块 outdoor \`. \`（终扫后仍留室外）: ${outdoorBare}
- 树 & : ${counts["&"] ?? 0}（目标 [${V73_TREE_MIN},${V73_TREE_MAX}]，N=74 来源 V7.1 cap 基线）
- 灯 l : ${counts.l ?? 0}（上限 ${V73_LANTERN_MAX}）
- 凳 o+t : ${(counts.o ?? 0) + (counts.t ?? 0)}

## 三桥（洛水 cy=${cy}）
${LUOYANG_BRIDGES.map((b) => `- ${b.key}: x=${b.x0}–${b.x1}`).join("\n")}

## 灯柱账目（白名单合计 = ${V73_LANTERN_MAX}）
${lanternLedger.map(([k, n]) => `- ${k}: ${n}`).join("\n")}

## 皇城-御街坐标表
- 皇城墙: x∈[${PALACE.x0},${PALACE.x1}] y∈[${PALACE.y0},${PALACE.y1}]；端门南墙 y=${PALACE.y1} 门洞 x=${cx}
- 御街: x∈[${IMPERIAL_AXIS.sidewalkX[0]},${IMPERIAL_AXIS.roadX[2]}]（,${IMPERIAL_AXIS.roadX.join("=")},）y=${IMPERIAL_AXIS.y0}..${IMPERIAL_AXIS.y1}
- 应天门: x∈[${YINGTIAN_GATE.x0},${YINGTIAN_GATE.x1}] y=${YINGTIAN_GATE.y} :/H/:
- 禁侵 |x−cx|≤2 豁免: 应天/端门门楼本体；宫墙 cx±4

## L形逐行（${LUOYANG_L_SHAPE_KEYS.size}/${courtyards.length} = ${Math.round((100 * LUOYANG_L_SHAPE_KEYS.size) / courtyards.length)}%）
${lRows.join("\n")}

## 白马寺双点
- 城内 白马寺司 templeOffice (48,2)
- 城外 白马寺 luoyang_temple_outer，传送 TB ~(71,30)
`;

writeFileSync("v73-ascii-dump.txt", layers);
writeFileSync("v73-count-note.md", note);
console.log(note);
console.log("\n--- ASCII dump written to v73-ascii-dump.txt ---");
