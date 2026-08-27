import { writeFileSync } from "node:fs";
import { generateLuoyang, NPC_BINDINGS } from "../src/map/luoyangGen.ts";
import {
  riverColumnsOk,
  tianjinWaterHeadsOk,
  countWells,
  LUOYANG_WELLS,
  V74_WELL_MAX,
} from "../src/map/luoyangV74.ts";
import { V73_LANTERN_MAX, cx, cy } from "../src/map/luoyangV73.ts";

const scene = generateLuoyang();
const g = scene.ascii;
let trees = 0;
let lanterns = 0;
for (const row of g) {
  for (const c of row) {
    if (c === "&") trees += 1;
    if (c === "l") lanterns += 1;
  }
}
const marks = (scene.entityMarks ?? []).filter((m) => m.role === "talker" && m.ref);
let unbound = 0;
for (const m of marks) {
  if (!NPC_BINDINGS.some((b) => b.npcId === m.ref)) unbound += 1;
}

const note = `# V7.4 计数 note

## 脱绑
- outdoor talker 总数: ${marks.length}
- 无 binding 表项: ${unbound}（应为 0）

## 井 / 灯 / 树
- 井 n: ${countWells(g)}（上限 ${V74_WELL_MAX}，LUOYANG_WELLS 登记 ${LUOYANG_WELLS.size}）
- 灯 l: ${lanterns}（上限 ${V73_LANTERN_MAX}）
- 树 &: ${trees}（目标 111–133，N=74 V7.1 基线）

## 洛水
- 列 carve: ${riverColumnsOk(g).ok ? "OK" : riverColumnsOk(g).bad.join(";")}
- 天津桥东西水头: ${tianjinWaterHeadsOk(g) ? "OK" : "FAIL"}

## 三桥
- west x=16–17 / tianjin x=41–43 / east x=68–69 @ cy=${cy}

## NPC 绑定变更（V7.4）
- luoWasher → luoRiver atRiver
- townHawker → westGate atDoor
- messenger → eastGate atDoor
- luoKid2 → home2 inYard
- luoElder2 → southGarden inYard
- luoElder → home1 atWell
- luoHerb → clinic atDoor
`;

writeFileSync("v74-count-note.md", note);
console.log(note);
