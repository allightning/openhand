import { generateLuoyang } from "../src/map/luoyangGen.ts";
import { LUOYANG_NPCS, luoyangSpriteReport } from "../src/map/npc.ts";
import { assertSpriteUniqueness, assertGenderRatio } from "../src/map/npcSprite.ts";
import { loadScene, floodFloor } from "../src/map/world.ts";
import { makeRun } from "../src/game/run.ts";

const report = luoyangSpriteReport();
console.log("=== sprite uniqueness ===");
console.log(report.uniqueness);
console.log("=== gender ===");
console.log(report.gender);

const scene = generateLuoyang();
const flat = scene.ascii.join("");
const barrels = [...flat].filter((c) => c === "b").length;
const trees = [...flat].filter((c) => c === "T" || c === "^").length;
console.log("=== furnishings ===");
console.log({ barrels, treesApprox: trees });

console.log("=== NPC roster (age/gender/job/variant) ===");
for (const n of LUOYANG_NPCS) {
  console.log(
    `${n.id}\t${n.age}/${n.gender}/${n.job}/${n.dims.variant}\t${n.palette}\t${n.role}`,
  );
}

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
console.log("=== reachability ===");
console.log({ talkers: w.talkers.length, unreachable: bad.map((t) => t.id) });
console.log("=== live coords sample ===");
for (const t of w.talkers.slice(0, 12)) {
  console.log(`${t.id}@${t.x},${t.y}`);
}
void assertSpriteUniqueness;
void assertGenderRatio;
