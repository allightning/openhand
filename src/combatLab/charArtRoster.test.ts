import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { charArtSrc, foeCharArtSrc, hasCharArt, resolveFoeCharDir } from "../art/charArt";
import { ROGUE_ROSTER } from "./rogueRoster";

const PUB = resolve(__dirname, "../../public");

describe("花名册 / 敌兵立绘", () => {
  it("18 人花名册均有 CHAR_DIR 且 full.png 落盘", () => {
    for (const m of ROGUE_ROSTER) {
      expect(hasCharArt(m.id), m.id).toBe(true);
      const src = charArtSrc(m.id);
      const rel = src.replace(/.*\/art\//, "art/");
      expect(existsSync(resolve(PUB, rel)), rel).toBe(true);
    }
  });

  it("具名精英走独占板；杂兵按门派×兵刃共用", () => {
    expect(resolveFoeCharDir("mob_monk_05")).toBe("char/elite_monk_ward");
    expect(resolveFoeCharDir("mob_monk_08")).toBe("char/elite_monk_luohan");
    expect(resolveFoeCharDir("mob_escortBand_02")).toBe("char/elite_escort_shatter");
    expect(resolveFoeCharDir("mob_escortBand_03")).toBe("char/elite_escort_snare");
    expect(resolveFoeCharDir("mob_court_04")).toBe("char/elite_court_jinyi");
    expect(resolveFoeCharDir("mob_court_07")).toBe("char/elite_court_assassin");

    expect(resolveFoeCharDir("mob_monk_01")).toBe("char/mook_monk_palm");
    expect(resolveFoeCharDir("mob_monk_02")).toBe("char/mook_monk_staff");
    expect(resolveFoeCharDir("mob_road_01")).toBe("char/mook_road_saber");
    expect(resolveFoeCharDir("mob_canal_01")).toBe("char/mook_jianghu_spear");
    expect(resolveFoeCharDir("mob_court_03")).toBe("char/mook_court_sword");
    expect(resolveFoeCharDir("mob_yamenRunner_01")).toBe("char/mook_court_palm");
  });

  it("敌兵立绘文件齐备", () => {
    for (const id of [
      "mob_monk_05",
      "mob_monk_01",
      "mob_road_01",
      "mob_escortBand_02",
      "mob_court_04",
      "mob_canal_01",
    ]) {
      const src = foeCharArtSrc(id);
      expect(src, id).toBeTruthy();
      const rel = src!.replace(/.*\/art\//, "art/");
      expect(existsSync(resolve(PUB, rel)), rel).toBe(true);
    }
  });
});
