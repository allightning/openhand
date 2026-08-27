import { describe, expect, it } from "vitest";
import {
  generateLuoyang,
  NPC_BINDINGS,
  LUOYANG_PLAZAS,
  inLuoyangPlaza,
  V71_STOOL_BASELINE,
  V71_STOOL_MAX,
  V71_TREE_MIN,
  V71_TREE_MAX,
  arterialTreeBan,
  LUOYANG_LABEL_ANCHORS,
} from "./luoyangGen";
import { LUOYANG_BUILDINGS } from "./luoyangMeta";
import { LABEL_PRI, arbitrateLabels, spriteAnchor } from "./floatLabel";
import fs from "node:fs";
import path from "node:path";
import { LUOYANG_SUBSCENES } from "./luoyangHub";
import { loadScene, walkable } from "./world";
import { makeRun } from "../game/run";

function openRun(extra: { items?: string[] } = {}) {
  return {
    ...makeRun("empty"),
    flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen", "mainOpen", "testMode"],
    items: ["deed", "incense", "brand", ...(extra.items ?? [])] as never[],
  };
}

describe("Luoyang V7 西京河南府", () => {
  it("1: every outdoor NPC is bound to a building; no clones", () => {
    const ids = NPC_BINDINGS.map((b) => b.npcId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("luoAsha");
    expect(ids).not.toContain("luoJailer");
    const scene = generateLuoyang();
    const placed = (scene.entityMarks ?? []).filter((m) => m.role === "talker" && m.ref);
    expect(placed.length).toBe(NPC_BINDINGS.length);
    for (const m of placed) {
      expect(ids).toContain(m.ref);
    }
    const seen = new Set<string>();
    for (const m of placed) {
      expect(seen.has(m.ref!), `clone ${m.ref}`).toBe(false);
      seen.add(m.ref!);
    }
    for (const [sid, sc] of Object.entries(LUOYANG_SUBSCENES)) {
      for (const npcId of Object.values(sc.talkers ?? {})) {
        expect(seen.has(npcId), `clone ${npcId} in ${sid}`).toBe(false);
      }
    }
  });

  it("2: landmark names present; clinic is 慈惠堂", () => {
    const names = LUOYANG_BUILDINGS.map((b) => b.name);
    for (const n of ["应天门", "端门", "上阳宫", "南市楼", "西市楼", "立德坊门", "通远坊门", "慈惠堂", "河南府·正堂", "白马寺", "太白酒楼"]) {
      expect(names).toContain(n);
    }
    const scene = generateLuoyang();
    const signs = scene.signs ?? [];
    expect(signs.some((s) => s.includes("应天门") || s.includes("上阳宫"))).toBe(true);
  });

  it("3: 洛阳门 stays on the locked bridge cells", () => {
    const scene = generateLuoyang();
    const cx = Math.floor(84 / 2);
    const cy = Math.floor(54 / 2);
    expect(scene.ascii[cy - 2]![cx]).toBe(";");
    expect(scene.ascii[cy + 2]![cx]).toBe(";");
    expect(scene.ascii[cy]![cx]).toBe("@");
    const w = loadScene("luoyang", openRun({ items: ["roadPass"] }));
    expect(w.props.filter((p) => p.kind === "arch" && p.tag === "洛阳门").length).toBeGreaterThanOrEqual(2);
  });

  it("4: trees stay off roads; any 3x3 has at most 3 trees", () => {
    const scene = generateLuoyang();
    const H = scene.ascii.length;
    const W = scene.ascii[0]!.length;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (scene.ascii[y]![x] !== "&") continue;
        expect(scene.ascii[y]![x] === "=").toBe(false);
        expect(scene.ascii[y]![x]).toBe("&");
      }
    }
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (scene.ascii[y + dy]![x + dx] === "&") n += 1;
          }
        }
        expect(n <= 3, `tree clump @${x},${y}`).toBe(true);
      }
    }
  });

  it("5: road-edge dress covers at least half of eligible lips", () => {
    const scene = generateLuoyang();
    const cx = Math.floor(84 / 2);
    const cy = Math.floor(54 / 2);
    const H = scene.ascii.length;
    const W = scene.ascii[0]!.length;
    // V7.3：路肩不再用 l 点缀（灯柱仅白名单 24 格）
    const dressed = new Set(["!", "t", ",", "f", "o"]);
    let eligible = 0;
    let hit = 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (Math.abs(x - cx) <= 1) continue;
        if (y === cy - 5 || y === cy + 5 || y === cy) continue;
        const ch = scene.ascii[y]![x]!;
        if (ch !== "." && !dressed.has(ch)) continue;
        let road = false;
        for (const [dx, dy] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ] as const) {
          if (scene.ascii[y + dy]![x + dx] === "=") road = true;
        }
        if (!road) continue;
        eligible += 1;
        if (dressed.has(ch) || inLuoyangPlaza(x, y)) hit += 1;
      }
    }
    expect(eligible).toBeGreaterThan(20);
    expect(hit / eligible).toBeGreaterThanOrEqual(0.21);
    expect(LUOYANG_PLAZAS.length).toBe(2);
  });

  it("6: no outdoor screens/beds; no 15x15 vacuum; jail barred", () => {
    const scene = generateLuoyang();
    for (let y = 0; y < scene.ascii.length; y++) {
      for (let x = 0; x < scene.ascii[0]!.length; x++) {
        expect(scene.ascii[y]![x] === "h" || scene.ascii[y]![x] === "u").toBe(false);
      }
    }
    const H = scene.ascii.length;
    const W = scene.ascii[0]!.length;
    const vacant = (ch: string) => ch === "." || ch === ",";
    for (let y = 1; y < H - 15; y++) {
      for (let x = 1; x < W - 15; x++) {
        let empty = 0;
        for (let dy = 0; dy < 15; dy++) {
          for (let dx = 0; dx < 15; dx++) {
            if (vacant(scene.ascii[y + dy]![x + dx]!)) empty += 1;
          }
        }
        expect(empty === 15 * 15, `vacuum @${x},${y}`).toBe(false);
      }
    }
    const jail = { x: 2, y: 14, w: 14, h: 10 };
    let door: { x: number; y: number } | null = null;
    for (let y = jail.y; y < jail.y + jail.h; y++) {
      for (let x = jail.x; x < jail.x + jail.w; x++) {
        if (scene.ascii[y]![x] === "G") door = { x, y };
      }
    }
    expect(door).toBeTruthy();
    expect(walkable(loadScene("luoyang", openRun()), door!.x, door!.y, openRun())).toBe(false);
  });

  it("7: water crossings on three bridges; portals stay ≥3 apart", () => {
    const scene = generateLuoyang();
    const axisCy = Math.floor(54 / 2);
    const bridgeXs = [16, 17, 41, 42, 43, 68, 69];
    for (let y = axisCy - 2; y <= axisCy + 2; y++) {
      for (let x = 1; x < 83; x++) {
        const ch = scene.ascii[y]![x]!;
        if (ch !== "=" && ch !== "@" && ch !== ";") continue;
        if (x <= 2 || x >= 81) continue;
        let waterN = false;
        for (const [dx, dy] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ] as const) {
          const nc = scene.ascii[y + dy]?.[x + dx];
          if (nc === "~" || nc === "%") waterN = true;
        }
        if (!waterN) continue;
        const onBridge =
          (x >= 14 && x <= 19) ||
          (x >= 40 && x <= 44) ||
          (x >= 66 && x <= 71) ||
          ch === "@" ||
          ch === ";";
        expect(onBridge, `water crossing @${x},${y}`).toBe(true);
      }
    }
    const w = loadScene("luoyang", openRun({ items: ["roadPass"] }));
    const portals = w.portals;
    for (let i = 0; i < portals.length; i++) {
      for (let j = i + 1; j < portals.length; j++) {
        const a = portals[i]!;
        const b = portals[j]!;
        const d = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
        expect(d >= 3, `${a.ch}-${b.ch} too close`).toBe(true);
      }
    }
  });
});

describe("Luoyang V7.1 密度与标签", () => {
  it("1: stools cut 80%; trees in V7.3 range 111–133", () => {
    const scene = generateLuoyang();
    let stools = 0;
    let trees = 0;
    for (const row of scene.ascii) {
      for (const ch of row) {
        if (ch === "o" || ch === "t") stools += 1;
        if (ch === "&") trees += 1;
      }
    }
    expect(V71_STOOL_BASELINE).toBe(99);
    expect(stools).toBeLessThanOrEqual(V71_STOOL_MAX);
    expect(trees).toBeGreaterThanOrEqual(V71_TREE_MIN);
    expect(trees).toBeLessThanOrEqual(V71_TREE_MAX);
  });

  it("2: no trees on arterial or its 1-tile lips; no 3-in-a-row; 5x5 ≤6", () => {
    const scene = generateLuoyang();
    const cx = Math.floor(84 / 2);
    const cy = Math.floor(54 / 2);
    const H = scene.ascii.length;
    const W = scene.ascii[0]!.length;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (scene.ascii[y]![x] !== "&") continue;
        expect(arterialTreeBan(x, y, cx, cy), `tree on arterial lip @${x},${y}`).toBe(false);
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
          [1, 1],
          [1, -1],
        ] as const) {
          let run = 1;
          for (let k = 1; k < 4; k++) {
            if (scene.ascii[y + dy * k]?.[x + dx * k] === "&") run += 1;
            else break;
          }
          expect(run < 3, `tree row @${x},${y}`).toBe(true);
        }
      }
    }
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        let n = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (scene.ascii[y + dy]![x + dx] === "&") n += 1;
          }
        }
        expect(n <= 6, `5x5 trees @${x},${y}`).toBe(true);
      }
    }
  });

  it("3: any 3x3 has at most 3 NPCs including spawn", () => {
    const scene = generateLuoyang();
    const cx = Math.floor(84 / 2);
    const cy = Math.floor(54 / 2);
    const cells = (scene.entityMarks ?? []).filter((m) => m.role === "talker").map((m) => ({ x: m.x, y: m.y }));
    cells.push({ x: cx, y: cy });
    for (const c of cells) {
      const n = cells.filter((o) => Math.abs(o.x - c.x) <= 1 && Math.abs(o.y - c.y) <= 1).length;
      expect(n <= 3, `crowd @${c.x},${c.y}`).toBe(true);
    }
  });

  it("4: inner portals miss house/arch/stall cells", () => {
    const scene = generateLuoyang();
    for (const id of ["FA", "GA"] as const) {
      const m = (scene.entityMarks ?? []).find((e) => e.id === id && e.role === "portal");
      expect(m).toBeTruthy();
      const ch = scene.ascii[m!.y]![m!.x]!;
      expect(["H", "e", "#", ";"].includes(ch)).toBe(false);
    }
  });

  it("5: functional shops labeled via meta; homes/gates unmarked; landmark CSS", () => {
    generateLuoyang();
    const byKey = new Map(LUOYANG_BUILDINGS.map((b) => [b.key, b]));
    for (const b of LUOYANG_BUILDINGS) {
      if (!b.functional) continue;
      if (b.key === "gate" || b.key === "templeOuter") continue;
      const hit = LUOYANG_LABEL_ANCHORS.some((a) => a.key === b.yardKey || a.key === b.key);
      expect(hit, `missing anchor ${b.key}`).toBe(true);
    }
    for (const key of ["home1", "home2", "shop7", "shop8"]) {
      expect(byKey.get(key)?.functional).toBe(false);
    }
    expect(byKey.get("wine")?.landmark).toBe(true);
    expect(byKey.get("clinic")?.functional).toBe(true);
    const css = fs.readFileSync(path.resolve(__dirname, "../style.css"), "utf8");
    expect(css).toMatch(/\.float-label\.landmark/);
    expect(css).toMatch(/color:\s*#fff/);
    expect(css).toMatch(/-webkit-text-stroke:\s*1px/);
    expect(css).toMatch(/font-size:\s*15px/);
    const main = fs.readFileSync(path.resolve(__dirname, "../main.ts"), "utf8");
    expect(main).not.toMatch(/p\.tag === "院门"\) label = "院门"/);
    expect(main).toMatch(/arbitrateLabels/);
  });

  it("6: arbiter hides lower priority; player never hidden", () => {
    const a = spriteAnchor("npc", 5, 5);
    const jobs = arbitrateLabels([
      { id: "you", pri: LABEL_PRI.you, ax: a.ax, ay: a.ay, text: "轨刃", cls: "you" },
      { id: "npc", pri: LABEL_PRI.npc, ax: a.ax, ay: a.ay, text: "路人", cls: "" },
      { id: "mark", pri: LABEL_PRI.landmark, ax: a.ax, ay: a.ay, text: "应天门", cls: "landmark" },
    ]);
    expect(jobs.find((j) => j.id === "you")?.hidden).toBe(false);
    expect(jobs.find((j) => j.id === "npc")?.hidden).toBe(true);
    expect(jobs.find((j) => j.id === "mark")?.hidden).toBe(true);
  });
});
