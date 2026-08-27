import { loadScene, floodFloor } from "./world";
import { makeRun } from "../game/run";

const run = {
  ...makeRun("empty"),
  flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen", "mainOpen"],
  items: ["deed", "incense", "brand", "roadPass"],
};
const w = loadScene("luoyang", run);
w.npcs.forEach((n) => {
  n.beaten = true;
});
const fa = w.portals.find((p) => p.ch === "FA")!;
const d = w.portals.find((p) => p.ch === "D")!;
w.player = { x: d.x, y: d.y };
const seen = floodFloor(w, run, true);
const blockers = w.talkers.filter((t) => t.y === fa.y && t.x >= fa.x - 4 && t.x <= fa.x);
console.log({
  fa,
  faSeen: seen.has(`${fa.x},${fa.y}`),
  blockers,
  corridor: [64, 65, 66, 67, 68].map((x) => ({
    x,
    talk: w.talkers.find((t) => t.x === x && t.y === fa.y)?.id,
    seen: seen.has(`${x},${fa.y}`),
    prop: w.props.find((p) => p.x === x && p.y === fa.y)?.kind,
  })),
});
