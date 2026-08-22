/**
 * 紧急修复诊断：洛阳物件/NPC/车
 */
import { generateLuoyang } from "../src/map/luoyangGen.ts";
import { LUOYANG_NPCS, luoyangSpriteReport } from "../src/map/npc.ts";
import { DEFAULT_CAPS, countAsciiProps } from "../src/map/placement.ts";
import { loadScene, floodFloor } from "../src/map/world.ts";
import { makeRun } from "../src/game/run.ts";

const scene = generateLuoyang();
const counts = countAsciiProps(scene.ascii);
const c = (ch: string) => counts[ch] ?? 0;

console.log("========== 修复后真实报告 ==========\n");
console.log("物件:", {
  木桶b: c("b"),
  树: c("&"),
  灯笼l: c("l"),
  罐j: c("j"),
  车f: c("f"),
  炉火: c("*"),
  摊箱v: c("v"),
  井凳o: c("o"),
  碑告示: c("!"),
  桩p: c("p"),
});
console.log("cap 含车:", Object.keys(DEFAULT_CAPS));

const talkerIds = [...new Set(Object.values(scene.talkers))];
const planned = LUOYANG_NPCS.map((n) => n.id);
const missing = planned.filter((id) => !talkerIds.includes(id));
console.log("NPC:", {
  计划: planned.length,
  落地unique: talkerIds.length,
  缺失: missing,
  落地率: `${(((planned.length - missing.length) / planned.length) * 100) | 0}%`,
});

const report = luoyangSpriteReport();
console.log("立绘:", report.uniqueness, report.gender);

const run = {
  ...makeRun("empty"),
  flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen", "mainOpen"],
  items: ["deed", "incense", "brand", "roadPass"],
};
const w = loadScene("luoyang", run);
if (w.portals[0]) w.player = { x: w.portals[0].x, y: w.portals[0].y };
w.npcs.forEach((n) => {
  n.beaten = true;
});
const seen = floodFloor(w, run, true);
const touch = (x: number, y: number) =>
  seen.has(`${x},${y}`) ||
  [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ].some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`));
const bad = w.talkers.filter((t) => !touch(t.x, t.y));
const kinds = w.props.reduce(
  (acc, p) => {
    acc[p.kind] = (acc[p.kind] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>,
);
console.log("loadScene:", {
  talkers: w.talkers.length,
  props: w.props.length,
  kinds: Object.entries(kinds)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15),
  可达: `${w.talkers.length - bad.length}/${w.talkers.length}`,
  不可达: bad.map((t) => t.id),
});
