import { describe, expect, it } from "vitest";
import { makeRun } from "../game/run";
import { SCENES, talkBeat } from "./scenes";
import {
  afterDuel,
  findPath,
  floodFloor,
  gateOpen,
  interact,
  loadDock,
  loadScene,
  SEAL_ORDER,
  sealsComplete,
  tryMove,
  walkable,
} from "./world";
import { portalHasFrame, portalInThreshold, portalOnRoadEnd, plantStamp } from "./tileset";
import type { Run } from "../game/types";
import type { SceneId } from "./types";

function runWith(patch: Partial<Run> = {}): Run {
  return { ...makeRun("empty"), ...patch };
}

describe("scenes", () => {
  it("keeps every row the same width", () => {
    for (const def of Object.values(SCENES)) {
      const w = def.ascii[0].length;
      for (const row of def.ascii) expect(row.length).toBe(w);
    }
  });

  it("loads every scene", () => {
    const run = runWith();
    for (const id of Object.keys(SCENES) as SceneId[]) {
      const w = loadScene(id, run);
      expect(w.w).toBeGreaterThan(10);
      expect(w.h).toBeGreaterThan(6);
      expect(w.thought.length).toBeGreaterThan(0);
    }
  });

  it("places authored props instead of scattering junk", () => {
    const w = loadScene("wharf", runWith());
    expect(w.props.length).toBeGreaterThan(6);
    expect(w.props.every((p) => p.kind !== undefined)).toBe(true);
  });
});

describe("wharf and hold", () => {
  it("starts in the hut", () => {
    const w = loadDock();
    expect(w.scene).toBe("hut");
    expect(w.portals.length).toBe(1);
  });

  it("keeps indoor rooms free of outdoor roads", () => {
    const hut = loadDock();
    expect(hut.tiles.flat().some((t) => t === "road" || t === "pack")).toBe(false);
    const customs = loadScene("customs", runWith());
    expect(customs.tiles.flat().filter((t) => t === "road").length).toBeLessThan(8);
  });

  it("drops the seer in the customs hall and the sapper in the stake yard", () => {
    const seer = loadScene("customs", makeRun("empty", "seer"));
    expect(seer.tiles[seer.player.y][seer.player.x]).toBe("floor");
    expect(seer.npcs.some((n) => n.id === "inkhand")).toBe(true);
    const sapper = loadScene("pit", makeRun("empty", "sapper"));
    expect(sapper.tiles[sapper.player.y][sapper.player.x]).toBe("floor");
    expect(sapper.npcs.some((n) => n.id === "stakeboss")).toBe(true);
    const plot = loadScene("plot", makeRun("empty", "seer"));
    expect(plot.npcs.some((n) => n.id === "inkhand")).toBe(true);
  });

  it("keeps the harbor as a later outdoor yard", () => {
    const w = loadScene("wharf", runWith());
    expect(w.npcs).toHaveLength(1);
    expect(w.npcs[0].id).toBe("raider");
    expect(w.portals.length).toBe(7);
    expect(w.talkers.map((t) => t.id).sort()).toEqual([
      "butcher",
      "carter",
      "clerk",
      "docker",
      "fisher",
      "hawker",
      "kid",
      "monk",
      "tutorWard",
      "vendor",
    ]);
    expect(w.props.some((p) => p.kind === "tree")).toBe(true);
    expect(w.props.some((p) => p.kind === "stall")).toBe(true);
    expect(w.tiles.flat().includes("road")).toBe(true);
    expect(w.tiles.flat().filter((t) => t === "water").length).toBeGreaterThan(80);
    expect(w.signs.some((s) => s.text.includes("火印"))).toBe(true);
    expect(w.items.some((i) => i.id === "token")).toBe(true);
  });

  it("puts harbor people by stalls, and roads into the yards", () => {
    const w = loadScene("wharf", runWith());
    const nearShop = (tx: number, ty: number) =>
      w.props.some(
        (p) =>
          (p.kind === "house" || p.kind === "stall") &&
          Math.abs(p.x - tx) + Math.abs(p.y - ty) <= 3,
      );
    const vendor = w.talkers.find((t) => t.id === "vendor")!;
    expect(nearShop(vendor.x, vendor.y)).toBe(true);
    const hawker = w.talkers.find((t) => t.id === "hawker")!;
    expect(nearShop(hawker.x, hawker.y)).toBe(true);
    expect(w.props.some((p) => p.kind === "bench" && Math.abs(p.x - hawker.x) + Math.abs(p.y - hawker.y) <= 2)).toBe(true);
    const clerk = w.talkers.find((t) => t.id === "clerk")!;
    expect(nearShop(clerk.x, clerk.y) || w.props.some((p) => p.kind === "house" && Math.abs(p.x - clerk.x) + Math.abs(p.y - clerk.y) <= 4)).toBe(true);
    const customs = w.portals.find((p) => p.to === "customs")!;
    expect(Math.abs(clerk.x - customs.x) + Math.abs(clerk.y - customs.y)).toBeLessThanOrEqual(5);
    const hold = w.portals.find((p) => p.to === "hold")!;
    expect(["road", "floor", "pack"]).toContain(w.tiles[hold.y + 1][hold.x]);
    expect(["road", "floor", "pack"]).toContain(w.tiles[customs.y][customs.x - 1]);
    const well = w.props.find((p) => p.kind === "well")!;
    const lamp = w.portals.find((p) => p.to === "lamp")!;
    expect(Math.abs(well.x - lamp.x) + Math.abs(well.y - lamp.y)).toBeLessThanOrEqual(6);
    const carter = w.talkers.find((t) => t.id === "carter")!;
    expect(w.props.some((p) => p.kind === "cart" && Math.abs(p.x - carter.x) <= 2)).toBe(true);
    expect(nearShop(carter.x, carter.y)).toBe(true);
    const fisher = w.talkers.find((t) => t.id === "fisher")!;
    expect(nearShop(fisher.x, fisher.y)).toBe(true);
    const docker = w.talkers.find((t) => t.id === "docker")!;
    expect(w.props.some((p) => p.kind === "house" && Math.abs(p.x - docker.x) + Math.abs(p.y - docker.y) <= 3)).toBe(true);
  });

  it("puts a framed door on the tax house", () => {
    const w = loadScene("wharf", runWith());
    const door = w.portals.find((p) => p.ch === "M")!;
    expect(portalHasFrame(w.tiles, door.x, door.y)).toBe(true);
  });

  it("keeps harbor roads in one connected web", () => {
    const w = loadScene("wharf", runWith());
    const roads: { x: number; y: number }[] = [];
    for (let y = 0; y < w.h; y++) {
      for (let x = 0; x < w.w; x++) {
        // cobble + gravel tracks both count as the path web
        if (w.tiles[y][x] === "road" || w.tiles[y][x] === "pack") roads.push({ x, y });
      }
    }
    expect(roads.length).toBeGreaterThan(20);
    expect(roads.filter((c) => w.tiles[c.y][c.x] === "road").length).toBeLessThan(80);
    const start = roads[0];
    const seen = new Set<string>([`${start.x},${start.y}`]);
    const q = [start];
    for (let i = 0; i < q.length; i++) {
      const { x, y } = q[i];
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (seen.has(key)) continue;
        const t = w.tiles[ny]?.[nx];
        if (t !== "road" && t !== "pack") continue;
        seen.add(key);
        q.push({ x: nx, y: ny });
      }
    }
    expect(seen.size).toBe(roads.length);
  });

  it("reads the clerk before any gate", () => {
    const run = runWith();
    const w = loadScene("wharf", run);
    const clerk = w.talkers.find((t) => t.id === "clerk")!;
    w.player = { x: clerk.x + 1, y: clerk.y };
    w.facing = "left";
    const r = interact(w, run, "brand");
    expect(r.action).toBe("talk");
    expect(r.world.message).toMatch(/火印/);
    expect(r.world.thought.length).toBeGreaterThan(0);
  });

  it("keeps the first clerk greeting from dumping the brand", () => {
    expect(talkBeat("clerk", { branded: false, items: [], beaten: [], flags: [], step: 0 }).said).not.toMatch(/火印|西仓/);
    expect(talkBeat("porter", { branded: false, items: [], beaten: [], flags: [], step: 0 }).flags ?? []).not.toContain("metPorter");
  });

  it("lets the porter point at the east desk before the yard gate", () => {
    const run = runWith();
    const hold = loadScene("hold", run);
    const porter = hold.talkers.find((t) => t.id === "porter")!;
    hold.player = { x: porter.x + 1, y: porter.y };
    hold.facing = "left";
    const r = interact(hold, runWith(), "desk");
    expect(r.world.message).toMatch(/东厢/);
    expect(hold.signs.some((s) => s.text.includes("印要见火"))).toBe(true);
    const yard = loadScene("yard", run);
    expect(yard.signs).toHaveLength(0);
    expect(yard.braziers.length).toBe(1);
    const stamp = yard.talkers.find((t) => t.id === "stamp")!;
    const gateY = yard.tiles.findIndex((row) => row.includes("gate"));
    expect(stamp.y).toBeGreaterThan(gateY);
    expect(talkBeat("stamp", { branded: false, items: [], beaten: [], flags: [], pick: "ask" }).said).toMatch(/火印/);
    expect(talkBeat("warder", { branded: true, items: [], beaten: [], flags: [], pick: "ask" }).said).toMatch(/西/);
  });

  it("will not light yard seals without fire", () => {
    const run = runWith();
    const w = loadScene("yard", run);
    const west = w.seals.find((s) => s.id === "w")!;
    w.player = { x: west.x, y: west.y + 1 };
    const moved = tryMove(w, "up", run);
    expect(moved.world.progress).toEqual([]);
    expect(moved.world.message).toMatch(/冷/);
  });

  it("opens the yard gate after fire and the four seals", () => {
    const run = runWith({ flags: ["branded"] });
    let w = loadScene("yard", run);
    for (const id of SEAL_ORDER) {
      const seal = w.seals.find((s) => s.id === id)!;
      w.player = { x: seal.x, y: seal.y + 1 };
      w = tryMove(w, "up", run).world;
    }
    expect(sealsComplete(w)).toBe(true);
    expect(gateOpen(w, run)).toBe(true);
  });
});

describe("travel and fights", () => {
  it("walks from the harbor into the hold", () => {
    const run = runWith();
    const w = loadScene("wharf", run);
    const door = w.portals.find((p) => p.to === "hold")!;
    w.player = { x: door.x, y: door.y + 1 };
    const moved = tryMove(w, "up", run);
    expect(moved.travel?.to).toBe("hold");
  });

  it("lets hold and customs courtyards open onto the road without reentering", () => {
    const run = runWith();
    for (const ch of ["A", "M"] as const) {
      let w = loadScene("wharf", run, ch);
      const towardRoad = ch === "A" ? "down" : "left";
      const step = tryMove(w, towardRoad, run);
      expect(step.travel).toBeUndefined();
      w = step.world;
      expect(w.arrival).toBeNull();
      const clerk = w.talkers.find((t) => t.id === "clerk")!;
      const plaza = { x: clerk.x, y: clerk.y + 3 };
      const seen = floodFloor(w, run, true);
      expect(seen.has(`${plaza.x},${plaza.y}`) || seen.has(`${clerk.x},${clerk.y}`)).toBe(true);
      const target = seen.has(`${plaza.x},${plaza.y}`) ? plaza : clerk;
      const dirs = findPath(w, run, target.x, target.y, () => true);
      expect(dirs.length).toBeGreaterThan(0);
      for (let i = 0; i < dirs.length; i++) {
        const next = tryMove(w, dirs[i], run, { suppressPortal: i < dirs.length - 1 });
        expect(next.travel).toBeUndefined();
        w = next.world;
      }
      expect(["road", "floor"]).toContain(w.tiles[w.player.y][w.player.x]);
    }
  });

  it("keeps ropes portals on geographic edges, not mid-yard teleports", () => {
    const w = loadScene("ropes", runWith({ hero: "sapper", beaten: ["stakeboss"] }));
    const by = Object.fromEntries(w.portals.map((p) => [p.to, p]));
    expect(by.wharf.y).toBeLessThan(4); // 北通港湾
    expect(by.huainan.y).toBeLessThan(4); // 北出官道
    expect(by.pit.x).toBeLessThan(10); // 西接桩场
    expect(by.ropeMarket.x).toBeGreaterThan(20); // 东出缆市
    expect(by.docks.y).toBeGreaterThan(by.wharf.y); // 船坞更靠南贴水
    expect(by.shed.y).toBeGreaterThan(by.wharf.y);
    // 无一扇门落在庭院正中
    for (const p of w.portals) {
      const midX = p.x > 10 && p.x < w.w - 10;
      const midY = p.y > 4 && p.y < w.h - 5;
      expect(midX && midY, `${p.ch}→${p.to} at ${p.x},${p.y}`).toBe(false);
    }
  });

  it("keeps hub outdoor portals on the rim, not courtyard grass", () => {
    for (const id of ["taxMarket", "ropeMarket", "taxGate", "ropeGate"] as SceneId[]) {
      const w = loadScene(id, runWith({ hero: id.startsWith("tax") ? "seer" : "sapper" }));
      for (const p of w.portals) {
        const onRim = p.x <= 2 || p.x >= w.w - 3 || p.y <= 2 || p.y >= w.h - 3 || p.y === 4;
        expect(onRim, `${id}→${p.to} at ${p.x},${p.y}`).toBe(true);
      }
    }
  });

  it("lets click-path cross hub courtyard portals without ending empty", () => {
    const run = runWith({ hero: "seer", flags: ["booksOk"] });
    const w = loadScene("taxMarket", run);
    w.npcs.forEach((n) => {
      n.beaten = true;
    });
    const far = w.portals.find((p) => Math.abs(p.x - w.player.x) + Math.abs(p.y - w.player.y) > 8);
    expect(far).toBeTruthy();
    // Path to a far portal used to return [] when mid portals blocked BFS.
    const toDoor = findPath(w, run, far!.x, far!.y, () => true);
    expect(toDoor.length).toBeGreaterThan(0);
    // Pick a far floor cell (not the talker underfoot spawn) and walk there crossing portals.
    let target: { x: number; y: number } | null = null;
    for (let y = 2; y < w.h - 2 && !target; y++) {
      for (let x = 2; x < w.w - 2; x++) {
        if (Math.abs(x - w.player.x) + Math.abs(y - w.player.y) < 10) continue;
        if (!walkable(w, x, y, run)) continue;
        target = { x, y };
        break;
      }
    }
    expect(target).toBeTruthy();
    const toFloor = findPath(w, run, target!.x, target!.y, () => true);
    expect(toFloor.length).toBeGreaterThan(0);
    let cur = w;
    for (let i = 0; i < toFloor.length; i++) {
      const step = tryMove(cur, toFloor[i], run, { suppressPortal: i < toFloor.length - 1 });
      expect(step.travel).toBeUndefined();
      cur = step.world;
    }
  });

  it("keeps every wharf talker, portal, and item adjacent to the spawn flood", () => {
    const run = runWith();
    const w = loadScene("wharf", run);
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
    for (const p of w.portals) {
      expect(seen.has(`${p.x},${p.y}`), `portal ${p.ch}`).toBe(true);
    }
    for (const t of w.talkers) {
      expect(touch(t.x, t.y), `talker ${t.id}`).toBe(true);
    }
    for (const g of w.items) {
      expect(touch(g.x, g.y), `item ${g.id}`).toBe(true);
    }
    for (const s of w.signs) {
      expect(touch(s.x, s.y), `sign`).toBe(true);
    }
  });

  it("keeps the print-yard gate for seals, and the harbor door off the seal wall", () => {
    const run = runWith({ flags: ["branded"] });
    const w = loadScene("yard", run, "B");
    const gateY = w.tiles.findIndex((row) => row.includes("gate"));
    const door = w.portals.find((p) => p.ch === "B")!;
    expect(door.y).toBeGreaterThan(gateY);
    const seal = w.seals[0];
    const path = findPath(w, run, seal.x, seal.y, () => true);
    expect(path.length).toBeGreaterThan(0);
  });

  it("blocks the pit exit until the opening hand falls; seer starts at customs", () => {
    const seer = makeRun("empty", "seer");
    const customs = loadScene("customs", seer);
    expect(customs.npcs.some((n) => n.id === "inkhand" && !n.beaten)).toBe(true);

    const sapper = makeRun("empty", "sapper");
    const pit = loadScene("pit", sapper);
    const out = pit.portals[0];
    expect(findPath(pit, sapper, out.x, out.y, () => true)).toEqual([]);
    expect(pit.npcs[0].y).toBeLessThan(out.y);
  });

  it("makes the short escort a delivery to the pier carter", () => {
    let run = runWith();
    let w = loadScene("escort", run);
    const clerk = w.talkers.find((t) => t.id === "docker")!;
    w.player = { x: clerk.x, y: clerk.y + 1 };
    w.facing = "up";
    let r = interact(w, run, "job");
    expect(r.flags).toContain("escortJob");
    expect(r.world.thought).toMatch(/码头/);
    run = { ...run, flags: [...run.flags, "escortJob"], items: [...run.items, "cargo"] };
    w = loadScene("pier", run);
    const carter = w.talkers.find((t) => t.id === "carter")!;
    w.player = { x: carter.x, y: carter.y + 1 };
    w.facing = "up";
    r = interact(w, run, "deliver");
    expect(r.flags).toEqual(expect.arrayContaining(["escortDone", "escortPay"]));
  });

  it("puts the catcher on the only road to the boat", () => {
    const run = runWith();
    const w = loadScene("spit", run);
    expect(w.npcs.map((n) => n.id)).toEqual(["piler", "escort", "catcher"]);
    const catcher = w.npcs.find((n) => n.id === "catcher")!;
    const boat = w.portals.find((p) => p.to === "lane")!;
    expect(catcher.x).toBe(boat.x);
    expect(catcher.y).toBeGreaterThan(boat.y);
  });

  it("keeps the boat woman off the fighting road", () => {
    const run = runWith();
    const w = loadScene("spit", run);
    const boat = w.talkers.find((t) => t.id === "boat")!;
    const catcher = w.npcs.find((n) => n.id === "catcher")!;
    expect(boat.x).not.toBe(catcher.x);
  });

  it("duels whoever stands in the way, with no courtyard gate check", () => {
    const run = runWith();
    const w = loadScene("spit", run);
    const npc = w.npcs.find((n) => n.id === "catcher")!;
    w.player = { x: npc.x, y: npc.y + 1 };
    w.facing = "up";
    const r = interact(w, run, "fight");
    expect(r.action).toBe("duel");
    expect(r.enemyId).toBe("catcher");
  });

  it("beating one fighter leaves the others", () => {
    const run = runWith();
    let w = loadScene("spit", run);
    w.dueling = "catcher";
    w = afterDuel(w, true, 20, 3);
    expect(w.npcs.find((n) => n.id === "catcher")?.beaten).toBe(true);
    expect(w.npcs.filter((n) => !n.beaten)).toHaveLength(2);
  });
});

describe("later maps", () => {
  it("lets tea people explain the watch before the drum gate", () => {
    const run = runWith();
    expect(talkBeat("guest", { branded: false, items: [], beaten: [], flags: [], pick: "night" }).said).toMatch(/北/);
    expect(talkBeat("inn", { branded: false, items: [], beaten: [], flags: [], pick: "bowl" }).said).toMatch(/空碗/);
    const drums = loadScene("drums", run);
    const watch = drums.talkers.find((t) => t.id === "watch")!;
    const gateY = drums.tiles.findIndex((row) => row.includes("gate"));
    expect(watch.y).toBeGreaterThan(gateY);
  });

  it("opens the tea chest only after the empty bowl", () => {
    const run = runWith();
    const w = loadScene("tea", run);
    const chest = w.caches[0];
    w.player = { x: chest.x, y: chest.y + 1 };
    w.facing = "up";
    expect(interact(w, run).action).toBe("talk");
    const bowl = w.props.find((p) => p.tag === "empty")!;
    w.player = { x: bowl.x, y: bowl.y + 1 };
    expect(interact(w, run).flags).toContain("emptyBowl");
    w.player = { x: chest.x, y: chest.y + 1 };
    expect(interact(w, runWith({ flags: ["emptyBowl"] })).action).toBe("loot");
  });

  it("strikes the north drum instead of walking a lamp path", () => {
    const run = runWith();
    const w = loadScene("drums", run);
    const north = w.seals.find((s) => s.id === "n")!;
    w.player = { x: north.x, y: north.y + 1 };
    w.facing = "up";
    const r = interact(w, run);
    expect(r.flags).toContain("watchOpen");
    expect(gateOpen(r.world, runWith({ flags: ["watchOpen"] }))).toBe(true);
  });

  it("puts the mirror maid south of the mirrors and gate", () => {
    const run = runWith();
    const w = loadScene("glass", run);
    const maid = w.talkers.find((t) => t.id === "maid")!;
    const mirror = w.seals[0];
    const gateY = w.tiles.findIndex((row) => row.includes("gate"));
    expect(maid.y).toBeGreaterThan(mirror.y);
    expect(maid.y).toBeGreaterThan(gateY);
    expect(talkBeat("maid", { branded: false, items: [], beaten: [], flags: [], pick: "ask" }).said).toMatch(/不照人/);
  });

  it("opens the glass gate by looking west, not by walking seals", () => {
    const run = runWith();
    const w = loadScene("glass", run);
    const west = w.seals.find((s) => s.id === "w")!;
    w.player = { x: west.x, y: west.y + 1 };
    w.facing = "up";
    const r = interact(w, run);
    expect(r.flags).toContain("trueMirror");
    expect(gateOpen(r.world, runWith({ flags: ["trueMirror"] }))).toBe(true);
    const stepped = tryMove(w, "up", run);
    expect(stepped.world.progress).toEqual([]);
  });
});

describe("harbor side rooms", () => {
  it("adds eight harbor rooms around the first gate", () => {
    const ids = ["customs", "salt", "ropes", "shed", "shrine", "lamp", "docks", "sluice"] as SceneId[];
    const run = runWith();
    for (const id of ids) {
      const w = loadScene(id, run);
      expect(w.w).toBeGreaterThan(20);
      expect(w.h).toBeGreaterThan(8);
    }
  });

  it("matches the torn slip to the customs ledger", () => {
    const shed = loadScene("shed", runWith());
    const bench = shed.props.find((p) => p.tag === "slip")!;
    shed.player = { x: bench.x, y: bench.y + 1 };
    shed.facing = "up";
    expect(interact(shed, runWith()).itemId).toBe("slip");
    const customs = loadScene("customs", runWith({ items: ["slip"] }));
    const ledger = customs.signs[0];
    customs.player = { x: ledger.x - 1, y: ledger.y };
    customs.facing = "right";
    const r = interact(customs, runWith({ items: ["slip"] }));
    expect(r.flags).toContain("booksOk");
    expect(gateOpen(r.world, runWith({ flags: ["booksOk"] }))).toBe(true);
    expect(talkBeat("filer", { branded: false, items: [], beaten: [], flags: [], pick: "ask" }).said).toMatch(/缺一角/);
    expect(talkBeat("coolie", { branded: false, items: [], beaten: [], flags: [], pick: "ask" }).said).toMatch(/凳下/);
  });

  it("takes the west salt deed and keeps the east jars false", () => {
    const salt = loadScene("salt", runWith());
    const east = salt.props.find((p) => p.tag === "eastSalt")!;
    salt.player = { x: east.x, y: east.y + 1 };
    salt.facing = "up";
    expect(interact(salt, runWith()).itemId).toBeUndefined();
    const west = salt.props.find((p) => p.tag === "westSalt")!;
    salt.player = { x: west.x, y: west.y + 1 };
    expect(interact(salt, runWith()).itemId).toBe("deed");
    const ropes = loadScene("ropes", runWith());
    expect(gateOpen(ropes, runWith())).toBe(false);
    expect(gateOpen(ropes, runWith({ items: ["deed"] }))).toBe(true);
    expect(talkBeat("saltman", { branded: false, items: [], beaten: [], flags: [], pick: "ask" }).said).toMatch(/西边/);
  });

  it("opens the docks chest only after the dead knot", () => {
    const ropes = loadScene("ropes", runWith());
    const dead = ropes.props.find((p) => p.tag === "deadKnot")!;
    ropes.player = { x: dead.x, y: dead.y + 1 };
    ropes.facing = "up";
    expect(interact(ropes, runWith()).flags).toContain("knotOk");
    const docks = loadScene("docks", runWith());
    const chest = docks.caches[0];
    docks.player = { x: chest.x - 1, y: chest.y };
    docks.facing = "right";
    expect(interact(docks, runWith()).action).toBe("talk");
    expect(interact(docks, runWith({ flags: ["knotOk"] })).action).toBe("loot");
    expect(talkBeat("roper", { branded: false, items: [], beaten: [], flags: [], pick: "ask" }).said).toMatch(/契/);
  });

  it("opens the sluice by striking the south lever", () => {
    const w = loadScene("sluice", runWith());
    const south = w.seals.find((s) => s.id === "s")!;
    w.player = { x: south.x - 1, y: south.y };
    w.facing = "right";
    expect(interact(w, runWith()).flags).toContain("tideOpen");
    const north = w.seals.find((s) => s.id === "n")!;
    w.player = { x: north.x - 1, y: north.y };
    expect(interact(w, runWith()).flags ?? []).not.toContain("tideOpen");
    expect(talkBeat("pilgrim", { branded: false, items: [], beaten: [], flags: [], pick: "ask" }).said).toMatch(/退潮/);
    expect(talkBeat("lamper", { branded: false, items: [], beaten: [], flags: [], pick: "ask" }).said).toMatch(/南盏/);
  });

  it("opens the lamp room with incense from the shrine", () => {
    const shrine = loadScene("shrine", runWith());
    const altar = shrine.props.find((p) => p.tag === "altar")!;
    shrine.player = { x: altar.x - 1, y: altar.y };
    shrine.facing = "right";
    expect(interact(shrine, runWith()).itemId).toBe("incense");
    const lamp = loadScene("lamp", runWith());
    expect(gateOpen(lamp, runWith())).toBe(false);
    expect(gateOpen(lamp, runWith({ items: ["incense"] }))).toBe(true);
  });
});

describe("hidden clues", () => {
  it("will not open the well without being sent to the lamper", () => {
    const lamp = loadScene("lamp", runWith());
    const well = lamp.props.find((p) => p.tag === "hiddenWell")!;
    lamp.player = { x: well.x - 1, y: well.y };
    lamp.facing = "right";
    expect(interact(lamp, runWith()).travel).toBeUndefined();
    expect(interact(lamp, runWith({ flags: ["heardWell"] })).travel).toBeUndefined();
    const opened = interact(lamp, runWith({ flags: ["askedWell"] }));
    expect(opened.flags).toContain("wellOpen");
    expect(opened.travel).toEqual({ to: "cave", at: "U" });
  });

  it("sends fisher to the porter then to the well", () => {
    expect(talkBeat("fisher", { branded: false, items: [], beaten: [], flags: [], pick: "night" }).flags).toEqual(
      expect.arrayContaining(["metFisher", "sideWell"]),
    );
    expect(talkBeat("fisher", { branded: false, items: [], beaten: [], flags: ["metPorter"], pick: "night" }).flags).toContain("heardWell");
    expect(talkBeat("lamper", { branded: false, items: [], beaten: [], flags: ["heardWell"] }).flags).toContain("askedWell");
  });

  it("will not dig the tea tree until the guest names it", () => {
    const tea = loadScene("tea", runWith());
    const tree = tea.props.find((p) => p.tag === "hiddenTree")!;
    tea.player = { x: tree.x, y: tree.y + 1 };
    tea.facing = "up";
    expect(interact(tea, runWith()).tech).toBeUndefined();
    const dug = interact(tea, runWith({ flags: ["heardTree"] }));
    expect(dug.flags).toContain("treeOpen");
    expect(dug.tech).toBe("nightStep");
  });

  it("keeps the south stone shut until someone hears it knock", () => {
    const wharf = loadScene("wharf", runWith());
    const stone = wharf.props.find((p) => p.tag === "hiddenStone")!;
    wharf.player = { x: stone.x, y: stone.y + 1 };
    wharf.facing = "up";
    expect(interact(wharf, runWith()).travel).toBeUndefined();
    const opened = interact(wharf, runWith({ flags: ["heardStone"] }));
    expect(opened.travel).toEqual({ to: "cellar", at: "Y" });
  });
});

describe("tokens in the pack", () => {
  it("lets leftover cake on the lane open the kid's mouth", () => {
    const lane = loadScene("lane", runWith());
    expect(lane.items.some((i) => i.id === "cake")).toBe(true);
    expect(lane.props.some((p) => p.kind === "stall")).toBe(true);
    const open = talkBeat("hawker", { branded: false, items: [], beaten: [], flags: [] });
    expect(open.said).not.toMatch(/北棚|伢儿/);
    expect(open.choices?.map((c) => c.id)).toEqual(["cake", "night", "leave"]);
    expect(
      talkBeat("hawker", { branded: true, items: [], beaten: [], flags: ["branded"] }).choices?.map((c) => c.id),
    ).toEqual(["cake", "night", "mask", "leave"]);
    expect(talkBeat("hawker", { branded: false, items: [], beaten: [], flags: [], pick: "cake" }).said).toMatch(/饼/);
    expect(talkBeat("kid", { branded: false, items: ["cake"], beaten: [], flags: [] }).said).toMatch(/棚|碗|茶/);
  });

  it("lets the harbor market token point at the lake monk", () => {
    const wharf = loadScene("wharf", runWith());
    expect(wharf.items.some((i) => i.id === "token")).toBe(true);
    expect(talkBeat("butcher", { branded: false, items: [], beaten: [], flags: [], pick: "lake" }).said).toMatch(/江/);
    expect(talkBeat("monk", { branded: true, items: [], beaten: [], flags: [], pick: "order" }).said).toMatch(/西东南北/);
    expect(talkBeat("kid", { branded: false, items: ["token"], beaten: [], flags: [] }).said).toMatch(/帖|江/);
  });

  it("lets the plot cart yield a flask that opens the sentry's mouth", () => {
    const plot = loadScene("plot", runWith());
    const cart = plot.props.find((p) => p.kind === "cart")!;
    plot.player = { x: cart.x + 1, y: cart.y };
    plot.facing = "left";
    const r = interact(plot, runWith());
    expect(r.action).toBe("take");
    expect(r.itemId).toBe("flask");
    expect(talkBeat("farmer", { branded: false, items: [], beaten: [], flags: [], pick: "flask" }).said).toMatch(/壶/);
    expect(talkBeat("sentry", { branded: false, items: ["flask"], beaten: [], flags: [] }).said).toMatch(/酒|岗|土路/);
  });

  it("lets a ridge coach agree to a bloodless bout after you ask", () => {
    const ridge = loadScene("ridge", runWith());
    const coach = ridge.talkers.find((t) => t.id === "tutorPace")!;
    ridge.player = { x: coach.x + 1, y: coach.y };
    ridge.facing = "left";
    const ask = interact(ridge, runWith());
    expect(ask.action).toBe("talk");
    expect(ask.world.choices.some((c) => c.id === "teach")).toBe(true);
    const bout = interact(ask.world, runWith(), "teach");
    expect(bout.action).toBe("spar");
    expect(bout.enemyId).toBe("tutorPace");
  });
});

describe("outdoor challenges", () => {
  it("plants optional bosses off the main road", () => {
    expect(loadScene("plot", runWith()).npcs.some((n) => n.id === "intruder")).toBe(true);
    expect(loadScene("ridge", runWith()).npcs.some((n) => n.id === "brute")).toBe(true);
    expect(loadScene("yard", runWith()).npcs.some((n) => n.id === "bandit")).toBe(true);
    expect(loadScene("ropes", runWith()).npcs.some((n) => n.id === "robber")).toBe(true);
    expect(loadScene("pit", makeRun("empty", "sapper")).npcs.some((n) => n.id === "stakeboss")).toBe(true);
    expect(loadScene("customs", runWith()).npcs.some((n) => n.id === "inkhand")).toBe(true);
    expect(loadScene("salt", runWith()).npcs.some((n) => n.id === "smuggler")).toBe(true);
    expect(loadScene("lane", runWith()).npcs.some((n) => n.id === "thug")).toBe(true);
    expect(loadScene("cave", runWith()).npcs.some((n) => n.id === "cavehand")).toBe(true);
  });

  it("lets you challenge a yard bandit by facing him", () => {
    const w = loadScene("yard", runWith());
    const foe = w.npcs.find((n) => n.id === "bandit")!;
    w.player = { x: foe.x + 1, y: foe.y };
    w.facing = "left";
    const r = interact(w, runWith(), "fight");
    expect(r.action).toBe("duel");
    expect(r.enemyId).toBe("bandit");
  });
});

describe("click path", () => {
  it("walks across seen floor in the hut", () => {
    const w = loadDock();
    const door = w.portals[0];
    const dirs = findPath(w, runWith(), door.x, door.y, () => true);
    expect(dirs.length).toBeGreaterThan(0);
    let cur = { ...w.player };
    for (const dir of dirs) {
      if (dir === "up") cur.y -= 1;
      if (dir === "down") cur.y += 1;
      if (dir === "left") cur.x -= 1;
      if (dir === "right") cur.x += 1;
    }
    expect(cur).toEqual({ x: door.x, y: door.y });
  });

  it("stays inside explored tiles", () => {
    const w = loadDock();
    const door = w.portals[0];
    const dirs = findPath(w, runWith(), door.x, door.y, (x, y) => x === w.player.x && y === w.player.y);
    expect(dirs).toEqual([]);
  });
});

describe("terrain and routes", () => {
  it("keeps authored walls on the hut, the plot house, and the wharf rim", () => {
    const hut = loadDock();
    expect(hut.tiles[0][0]).toBe("wall");
    const plot = loadScene("plot", runWith(), "R");
    expect(plot.tiles[2][7]).toBe("wall");
    const wharf = loadScene("wharf", runWith());
    expect(wharf.tiles[0][0]).toBe("wall");
  });

  it("paints a dirt road from the hut door to the south pass", () => {
    const w = loadScene("plot", runWith(), "R");
    expect(w.tiles.some((row) => row.includes("road"))).toBe(true);
  });

  it("keeps outdoor hills as hills with elevation art", () => {
    const w = loadScene("plot", runWith(), "R");
    expect(w.tiles.flat().includes("hill")).toBe(true);
    expect(w.tiles.flat().includes("water")).toBe(true);
    const hill = w.tiles.flatMap((row, y) => row.map((t, x) => ({ t, x, y }))).find((c) => c.t === "hill");
    expect(hill).toBeTruthy();
    expect(walkable(w, hill!.x, hill!.y, runWith())).toBe(false);
  });

  it("plants trees as blocking bodies", () => {
    const w = loadScene("plot", runWith(), "R");
    const tree = w.props.find((p) => p.kind === "tree");
    expect(tree).toBeTruthy();
    expect(walkable(w, tree!.x, tree!.y, runWith())).toBe(false);
  });

  it("keeps every authored tree blocking and never paints ghost canopy stamps", () => {
    const run = runWith();
    const w = loadScene("wharf", run, "R");
    for (const p of w.props.filter((x) => x.kind === "tree")) {
      expect(walkable(w, p.x, p.y, run)).toBe(false);
    }
    // 装饰 stamp 只许草影；树冠只来自手摆
    let ghost = 0;
    for (let y = 0; y < w.h; y++) {
      for (let x = 0; x < w.w; x++) {
        const stamp = plantStamp(w.scene, w.tiles[y][x], x, y, w.tiles);
        if (stamp && (stamp === "bush" || stamp.startsWith("tree"))) ghost++;
      }
    }
    expect(ghost).toBe(0);
  });

  it("keeps plot doors reachable without walking the cliff", () => {
    const run = runWith();
    const w = loadScene("plot", run, "R");
    w.npcs.forEach((n) => {
      n.beaten = true;
    });
    const seen = floodFloor(w, run, true);
    for (const p of w.portals) expect(seen.has(`${p.x},${p.y}`)).toBe(true);
  });

  it("blocks the south pass until the night guest falls", () => {
    const run = runWith();
    const w = loadScene("plot", run, "R");
    const south = w.portals.find((p) => p.ch === "S")!;
    expect(findPath(w, run, south.x, south.y, () => true)).toEqual([]);
    w.npcs.forEach((n) => {
      n.beaten = true;
    });
    expect(findPath(w, run, south.x, south.y, () => true).length).toBeGreaterThan(0);
  });

  it("lets every outdoor door and chest be walked to", () => {
    const outdoor: SceneId[] = ["plot", "ridge", "wharf", "yard", "spit", "lane", "lamp", "ropes", "pit", "ferry", "isle"];
    for (const id of outdoor) {
      const run = runWith({ flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen"], items: ["deed", "incense", "brand"] });
      const w = loadScene(id, run);
      w.progress = [...w.order];
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
      for (const p of w.portals) {
        expect(seen.has(`${p.x},${p.y}`), `${id} portal ${p.ch}`).toBe(true);
      }
      for (const c of w.caches) {
        expect(seen.has(`${c.x},${c.y}`), `${id} cache`).toBe(true);
      }
      for (const t of w.talkers) {
        expect(touch(t.x, t.y), `${id} talker ${t.id}`).toBe(true);
      }
      for (const g of w.items) {
        expect(touch(g.x, g.y), `${id} item ${g.id}`).toBe(true);
      }
    }
  });

  it("keeps talkers and portals reachable in every authored scene", () => {
    const run = runWith({
      flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen", "mainOpen"],
      items: ["deed", "incense", "brand", "roadPass"],
    });
    const bad: string[] = [];
    for (const id of Object.keys(SCENES) as SceneId[]) {
      const w = loadScene(id, run);
      w.progress = [...w.order];
      if (w.portals[0]) w.player = { x: w.portals[0].x, y: w.portals[0].y };
      else if (w.player) {
        /* spawn @ */
      }
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
      for (const p of w.portals) {
        if (!seen.has(`${p.x},${p.y}`)) bad.push(`${id} portal ${p.ch}`);
      }
      for (const t of w.talkers) {
        if (!touch(t.x, t.y)) bad.push(`${id} talker ${t.id}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("puts houses on building doors and pavilions on the road gates", () => {
    const plot = loadScene("plot", runWith(), "R");
    const hut = plot.portals.find((p) => p.ch === "R")!;
    const pass = plot.portals.find((p) => p.ch === "S")!;
    // 大地点可夹墙；通路必须在路尽头
    expect(portalHasFrame(plot.tiles, hut.x, hut.y)).toBe(true);
    expect(portalHasFrame(plot.tiles, pass.x, pass.y)).toBe(true);
    const ridge = loadScene("ridge", runWith(), "S");
    for (const p of ridge.portals.filter((p) => p.ch === "S" || p.ch === "T")) {
      expect(portalOnRoadEnd(ridge.tiles, p.x, p.y), `ridge ${p.ch}`).toBe(true);
    }
    // 院内堂门可不在干道上
    expect(ridge.portals.some((p) => p.ch === "J")).toBe(true);
    const wharf = loadScene("wharf", runWith());
    const hold = wharf.portals.find((p) => p.ch === "A")!;
    const toRidge = wharf.portals.find((p) => p.ch === "T")!;
    expect(portalHasFrame(wharf.tiles, hold.x, hold.y)).toBe(true);
    expect(portalOnRoadEnd(wharf.tiles, toRidge.x, toRidge.y)).toBe(true);
  });

  it("cuts indoor doors in the wall instead of dropping a gate on the floor", () => {
    const indoor: SceneId[] = [
      "hut",
      "hold",
      "salt",
      "customs",
      "shed",
      "docks",
      "shrine",
      "tea",
      "glass",
      "inner",
      "palace",
      "yamen",
      "wine",
      "flower",
      "clinic",
      "pier",
      "pawn",
      "escort",
      "martial",
      "lodge",
    ];
    const run = runWith({
      flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen"],
      items: ["deed", "incense", "brand"],
    });
    for (const id of indoor) {
      const w = loadScene(id, run);
      expect(w.portals.length).toBeGreaterThan(0);
      for (const p of w.portals) {
        expect(portalInThreshold(w.tiles, p.x, p.y), `${id} ${p.ch}`).toBe(true);
      }
    }
    const hut = loadDock();
    const door = hut.portals[0];
    expect(door.y).toBe(hut.h - 1);
    expect(hut.tiles[door.y][door.x - 1]).toBe("wall");
    expect(hut.tiles[door.y][door.x + 1]).toBe("wall");
  });

  it("keeps every pair of portals at least 3 tiles apart (Chebyshev)", () => {
    const run = runWith({
      flags: [
        "branded",
        "mainOpen",
        "watchOpen",
        "trueMirror",
        "booksOk",
        "knotOk",
        "tideOpen",
        "forkRail",
        "forkSeer",
        "forkSapper",
        "wellOpen",
        "treeOpen",
        "stoneOpen",
        "roadUsurp",
      ],
      items: ["deed", "incense", "brand"],
      beaten: ["inkhand", "stakeboss", "catcher", "escort", "piler", "delay", "twin"],
      hero: "rail",
    });
    const close: string[] = [];
    for (const id of Object.keys(SCENES) as SceneId[]) {
      const w = loadScene(id, run);
      for (let i = 0; i < w.portals.length; i++) {
        for (let j = i + 1; j < w.portals.length; j++) {
          const a = w.portals[i];
          const b = w.portals[j];
          const d = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
          if (d < 3) close.push(`${id}: ${a.ch}→${a.to} (${a.x},${a.y}) ↔ ${b.ch}→${b.to} (${b.x},${b.y}) d=${d}`);
        }
      }
    }
    expect(close, close.join("\n")).toEqual([]);
  });
});
