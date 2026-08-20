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
import { portalHasFrame, portalInThreshold } from "./tileset";
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
      expect(w.w).toBeGreaterThan(20);
      expect(w.h).toBeGreaterThan(8);
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

  it("drops the seer in the tax house and the sapper in the rope yard", () => {
    const seer = loadScene("customs", makeRun("empty", "seer"));
    expect(seer.tiles[seer.player.y][seer.player.x]).toBe("floor");
    expect(seer.npcs.some((n) => n.id === "inkhand")).toBe(true);
    const sapper = loadScene("ropes", makeRun("empty", "sapper"));
    expect(sapper.tiles[sapper.player.y][sapper.player.x]).toBe("floor");
    expect(sapper.npcs.some((n) => n.id === "stakeboss")).toBe(true);
    const plot = loadScene("plot", makeRun("empty", "seer"));
    expect(plot.npcs.some((n) => n.id === "inkhand")).toBe(true);
  });

  it("keeps the harbor as a later outdoor yard", () => {
    const w = loadScene("wharf", runWith());
    expect(w.npcs).toHaveLength(1);
    expect(w.npcs[0].id).toBe("raider");
    expect(w.portals.length).toBe(6);
    expect(w.talkers.map((t) => t.id).sort()).toEqual(["carter", "clerk", "docker", "fisher", "hawker", "kid", "tutorWard", "vendor"]);
    expect(w.props.some((p) => p.kind === "tree")).toBe(true);
    expect(w.tiles.flat().includes("road")).toBe(true);
  });

  it("puts harbor people by stalls, and roads into the yards", () => {
    const w = loadScene("wharf", runWith());
    const vendor = w.talkers.find((t) => t.id === "vendor")!;
    expect(w.props.some((p) => p.kind === "house" && Math.abs(p.x - vendor.x) <= 2)).toBe(true);
    const hawker = w.talkers.find((t) => t.id === "hawker")!;
    expect(w.props.some((p) => p.kind === "house" && Math.abs(p.x - hawker.x) <= 2)).toBe(true);
    expect(w.props.some((p) => p.kind === "bench" && Math.abs(p.x - hawker.x) <= 2)).toBe(true);
    const clerk = w.talkers.find((t) => t.id === "clerk")!;
    expect(w.props.some((p) => p.kind === "house" && Math.abs(p.x - clerk.x) + Math.abs(p.y - clerk.y) <= 2)).toBe(true);
    const customs = w.portals.find((p) => p.to === "customs")!;
    expect(Math.abs(clerk.x - customs.x) + Math.abs(clerk.y - customs.y)).toBeLessThanOrEqual(5);
    const hold = w.portals.find((p) => p.to === "hold")!;
    expect(w.tiles[hold.y][hold.x + 1]).toBe("road");
    expect(w.tiles[customs.y][customs.x - 1]).toBe("road");
    const well = w.props.find((p) => p.kind === "well")!;
    const lamp = w.portals.find((p) => p.to === "lamp")!;
    expect(Math.abs(well.x - lamp.x) + Math.abs(well.y - lamp.y)).toBeLessThanOrEqual(6);
    const carter = w.talkers.find((t) => t.id === "carter")!;
    expect(w.props.some((p) => p.kind === "cart" && Math.abs(p.x - carter.x) <= 2)).toBe(true);
    expect(w.props.some((p) => p.kind === "house" && Math.abs(p.x - carter.x) <= 2)).toBe(true);
    const fisher = w.talkers.find((t) => t.id === "fisher")!;
    expect(w.props.some((p) => p.kind === "house" && Math.abs(p.x - fisher.x) <= 2)).toBe(true);
    const docker = w.talkers.find((t) => t.id === "docker")!;
    expect(w.props.some((p) => p.kind === "house" && Math.abs(p.x - docker.x) <= 2)).toBe(true);
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
        if (w.tiles[y][x] === "road") roads.push({ x, y });
      }
    }
    expect(roads.length).toBeGreaterThan(40);
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
        if (w.tiles[ny]?.[nx] !== "road") continue;
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
    expect(talkBeat("stamp", { branded: false, items: [], beaten: [], flags: [], pick: "ask" }).said).toMatch(/见火/);
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
    w.player = { x: door.x + 1, y: door.y };
    const moved = tryMove(w, "left", run);
    expect(moved.travel?.to).toBe("hold");
  });

  it("lets hold and customs courtyards open onto the road without reentering", () => {
    const run = runWith();
    for (const ch of ["A", "M"] as const) {
      let w = loadScene("wharf", run, ch);
      const towardRoad = ch === "A" ? "right" : "left";
      const step = tryMove(w, towardRoad, run);
      expect(step.travel).toBeUndefined();
      w = step.world;
      expect(w.arrival).toBeNull();
      const seen = floodFloor(w, run, true);
      expect(seen.has("15,6")).toBe(true);
      const dirs = findPath(w, run, 15, 6, () => true);
      expect(dirs.length).toBeGreaterThan(0);
      for (const d of dirs) {
        const next = tryMove(w, d, run);
        expect(next.travel).toBeUndefined();
        w = next.world;
      }
      expect(w.tiles[w.player.y][w.player.x]).toBe("road");
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
    const r = interact(w, run);
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
    const open = talkBeat("hawker", { branded: false, items: [], beaten: [], flags: [] });
    expect(open.said).not.toMatch(/北棚|伢儿/);
    expect(open.choices?.map((c) => c.id)).toEqual(["cake", "night", "leave"]);
    expect(talkBeat("hawker", { branded: false, items: [], beaten: [], flags: [], pick: "cake" }).said).toMatch(/饼/);
    expect(talkBeat("kid", { branded: false, items: ["cake"], beaten: [], flags: [] }).said).toMatch(/棚|碗|茶/);
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
    expect(loadScene("ropes", runWith()).npcs.some((n) => n.id === "stakeboss")).toBe(true);
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
    const r = interact(w, runWith());
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

  it("turns outdoor hills into water", () => {
    const w = loadScene("plot", runWith(), "R");
    expect(w.tiles.flat().includes("hill")).toBe(false);
    expect(w.tiles.flat().includes("rock")).toBe(false);
    expect(w.tiles.flat().includes("water")).toBe(true);
    const water = w.tiles.flatMap((row, y) => row.map((t, x) => ({ t, x, y }))).find((c) => c.t === "water");
    expect(water).toBeTruthy();
    expect(walkable(w, water!.x, water!.y, runWith())).toBe(false);
  });

  it("plants trees as blocking bodies", () => {
    const w = loadScene("plot", runWith(), "R");
    const tree = w.props.find((p) => p.kind === "tree");
    expect(tree).toBeTruthy();
    expect(walkable(w, tree!.x, tree!.y, runWith())).toBe(false);
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
    const outdoor: SceneId[] = ["plot", "ridge", "wharf", "yard", "spit", "lane", "lamp", "ropes"];
    for (const id of outdoor) {
      const run = runWith({ flags: ["branded", "watchOpen", "trueMirror", "booksOk", "knotOk", "tideOpen"], items: ["deed", "incense", "brand"] });
      const w = loadScene(id, run);
      w.progress = [...w.order];
      if (w.portals[0]) w.player = { x: w.portals[0].x, y: w.portals[0].y };
      w.npcs.forEach((n) => {
        n.beaten = true;
      });
      const seen = floodFloor(w, run, true);
      for (const p of w.portals) {
        expect(seen.has(`${p.x},${p.y}`)).toBe(true);
      }
      for (const c of w.caches) {
        expect(seen.has(`${c.x},${c.y}`)).toBe(true);
      }
    }
  });

  it("puts houses on building doors and pavilions on the road gates", () => {
    const plot = loadScene("plot", runWith(), "R");
    const hut = plot.portals.find((p) => p.ch === "R")!;
    const pass = plot.portals.find((p) => p.ch === "S")!;
    expect(portalHasFrame(plot.tiles, hut.x, hut.y)).toBe(true);
    expect(portalHasFrame(plot.tiles, pass.x, pass.y)).toBe(true);
    const ridge = loadScene("ridge", runWith(), "S");
    for (const p of ridge.portals) expect(portalHasFrame(ridge.tiles, p.x, p.y)).toBe(true);
    const wharf = loadScene("wharf", runWith());
    expect(portalHasFrame(wharf.tiles, wharf.portals.find((p) => p.ch === "A")!.x, wharf.portals.find((p) => p.ch === "A")!.y)).toBe(true);
    expect(portalHasFrame(wharf.tiles, wharf.portals.find((p) => p.ch === "T")!.x, wharf.portals.find((p) => p.ch === "T")!.y)).toBe(true);
  });

  it("cuts indoor doors in the wall instead of dropping a gate on the floor", () => {
    const indoor: SceneId[] = ["hut", "hold", "salt", "customs", "shed", "docks", "shrine", "tea", "glass", "inner"];
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
});
