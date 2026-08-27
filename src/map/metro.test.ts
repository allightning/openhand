import { describe, expect, it } from "vitest";
import {
  assignNpcSprite,
  furnishByTemplate,
  renderBuildingName,
  applyBuildingTheme,
} from "./metro";
import { LUOYANG_BUILDINGS, LUOYANG_TALKERS } from "./luoyangMeta";
import { generateLuoyang } from "./luoyangGen";
import { LUOYANG_SUBSCENES } from "./luoyangHub";
import { SCENES } from "./scenes";
import { loadScene } from "./world";
import { makeRun } from "../game/run";

describe("luoyang presentation layer", () => {
  it("lists Tang-wuxia names for every yard building", () => {
    const names = LUOYANG_BUILDINGS.map((b) => b.name);
    expect(names).toContain("河南府·正堂");
    expect(names).toContain("太白酒楼");
    expect(names).toContain("烟波楼");
    expect(names).toContain("定鼎武馆");
    expect(names).toContain("慈惠堂");
    expect(names).toContain("通远质库");
    expect(names).toContain("白马寺");
    expect(names).toContain("洛阳驿");
    expect(names).toContain("永丰坊");
    expect(names).toContain("殖业坊");
    expect(LUOYANG_BUILDINGS.every((b) => b.name.length >= 2)).toBe(true);
  });

  it("assignNpcSprite maps factions to sprite+palette", () => {
    const bailiff = assignNpcSprite({ id: "luoBailiff" });
    expect(bailiff.palette).toBe("yamenInk");
    expect(bailiff.sprite).toContain("yamen");
    const asha = assignNpcSprite({ id: "luoAsha" });
    expect(asha.palette).toBe("yanboRouge");
    expect(asha.sprite).toContain("yanbo");
    const cook = assignNpcSprite({ id: "luoCook" });
    expect(cook.palette).toBe("taibaiEarth");
    expect(cook.attire).toBe("fat");
    const post = assignNpcSprite({ id: "messenger" });
    expect(post.palette).not.toMatch(/Indigo|indigo|blue/i);
    expect(post.palette).toBe("postOchre");
    const kid = assignNpcSprite({ id: "luoKid" });
    expect(kid.age).toBe("child");
    expect(kid.sprite).toContain("child");
    const elder = assignNpcSprite({ id: "luoElder" });
    expect(elder.age).toBe("old");
    expect(elder.sprite).toContain("old");
    const bailiffKey = bailiff.sprite;
    const clerkKey = assignNpcSprite({ id: "luoClerk" }).sprite;
    expect(bailiffKey).not.toBe(clerkKey);
    expect(LUOYANG_TALKERS.every((t) => t.standSpots.length >= 2)).toBe(true);
  });

  it("luoyang yards have dense talkers and reachable doors", () => {
    const scene = generateLuoyang();
    const ids = new Set(Object.values(scene.talkers));
    expect(ids.size).toBeGreaterThanOrEqual(40);
    expect(ids.has("luoWaiter")).toBe(true);
    expect(ids.has("carter")).toBe(true);
    expect(ids.has("luoElder")).toBe(true);
    // 无蓝色 palette
    for (const id of ids) {
      const vis = assignNpcSprite({ id });
      expect(vis.palette).not.toMatch(/Indigo|Blue|blue/i);
    }
  });

  it("furnishByTemplate densifies empty rooms without touching walls", () => {
    const g = Array.from({ length: 10 }, () => "#".repeat(14));
    for (let y = 1; y < 9; y++) g[y] = "#" + ".".repeat(12) + "#";
    const before = [...g];
    furnishByTemplate(g, "yamenHall", 1, 1, 12, 8, "s");
    expect(g[0]).toBe(before[0]);
    expect(g[9]).toBe(before[9]);
    const props = g.join("").split("").filter((c) => !" #.".includes(c)).length;
    expect(props).toBeGreaterThanOrEqual(6);
  });

  it("renderBuildingName plants a signboard outside the door", () => {
    const g = ["......", "......", "..#:#.", "......"];
    const signs: string[] = [];
    renderBuildingName(g, { name: "太白酒楼" }, 3, 2, "s", signs);
    expect(signs).toContain("太白酒楼");
    expect(g.some((row) => row.includes("!"))).toBe(true);
  });

  it("keeps luoyang building footprints while wiring subscene portals", () => {
    const scene = generateLuoyang();
    expect(scene.ascii[0]!.length).toBe(84);
    expect(scene.ascii.length).toBe(54);
    expect(scene.portals.GA?.to).toBe("luoyang_yamen_prison");
    expect(scene.portals.FA?.to).toBe("luoyang_yanbo_inner");
    expect(scene.portals.D?.to).toBe("yanshi");
    const flat = scene.ascii.join("\n");
    expect(flat.includes("D")).toBe(true);
    expect(flat.includes("W")).toBe(true);
    expect(flat.includes("E")).toBe(true);
    // 二级门用 entityMarks，不再把 F/G 写在外门 ascii
    const marks = scene.entityMarks ?? [];
    expect(marks.some((m) => m.id === "FA" && m.role === "portal")).toBe(true);
    expect(marks.some((m) => m.id === "GA" && m.role === "portal")).toBe(true);
  });

  it("registers prison and yanbo inner scenes", () => {
    expect(SCENES.luoyang_yamen_prison.name).toContain("牢房");
    expect(SCENES.luoyang_yanbo_inner.name).toContain("烟波");
    expect(LUOYANG_SUBSCENES.luoyang_yamen_prison.portals.A.to).toBe("luoyang");
    expect(LUOYANG_SUBSCENES.luoyang_yanbo_inner.portals.A.to).toBe("luoyang");
    const run = makeRun("empty");
    const prison = loadScene("luoyang_yamen_prison", run);
    expect(prison.talkers.some((t) => t.id === "luoJailer")).toBe(true);
    expect(prison.npcs.some((n) => n.id === "jailer")).toBe(true);
    const yanbo = loadScene("luoyang_yanbo_inner", run);
    expect(yanbo.talkers.some((t) => t.id === "luoAsha")).toBe(true);
  });

  it("applyBuildingTheme is callable for yamen landmarks", () => {
    const g = Array.from({ length: 10 }, () => ".".repeat(12));
    const signs: string[] = [];
    const b = LUOYANG_BUILDINGS.find((x) => x.key === "yamen")!;
    applyBuildingTheme(g, b, 5, 5, "s", signs);
    expect(signs.length).toBeGreaterThan(0);
  });
});
