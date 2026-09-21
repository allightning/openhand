import { describe, expect, it } from "vitest";
import { CARDS } from "../game/content";
import { remapLegacyCardId, ROGUE_SCHOOLS, fusionCardId, wardCardId, wardUpgradeId } from "../game/rogueCards";
import type { CardDef } from "../game/types";

const SKIP = new Set(["id", "name", "text", "flavor", "tags", "school"]);

function mechKey(c: CardDef): string {
  const parts = [`type=${c.type}`, `cost=${c.cost}`];
  for (const k of (Object.keys(c) as (keyof CardDef)[]).sort()) {
    if (SKIP.has(k) || k === "type" || k === "cost") continue;
    const v = c[k];
    if (v === undefined || v === false || v === 0 || v === "") continue;
    parts.push(typeof v === "object" ? `${k}=${JSON.stringify(v)}` : `${k}=${String(v)}`);
  }
  return parts.join("|");
}

describe("牌面去重", () => {
  it("异系融合正反是同一 id，CARDS 里没有镜像复制", () => {
    expect(fusionCardId("saber", "palm")).toBe("fusePalmSaber");
    expect(fusionCardId("palm", "saber")).toBe("fusePalmSaber");
    expect(CARDS.fusePalmSaber).toBeTruthy();
    expect((CARDS as Record<string, CardDef>).fuseSaberPalm).toBeUndefined();
    const fuseIds = Object.keys(CARDS).filter((id) => id.startsWith("fuse"));
    expect(fuseIds).toHaveLength(15);
  });

  it("本系架没有换页复制，六系架结算钩子各不相同", () => {
    const keys = ROGUE_SCHOOLS.map((s) => mechKey(CARDS[wardCardId(s)]!));
    expect(new Set(keys).size).toBe(6);
    expect(CARDS[wardUpgradeId("palm") as keyof typeof CARDS]).toBeUndefined();
    expect(remapLegacyCardId("wardPalm2")).toBe("wardPalm");
  });

  it("删掉的数字平行牌不在 CARDS，旧 id 能映射", () => {
    for (const id of ["midStrike", "midGuard", "midPush", "lateAnvil", "lateHand", "flowTax", "setupTax"] as const) {
      expect(CARDS[id as keyof typeof CARDS]).toBeUndefined();
    }
    expect(remapLegacyCardId("lateHand")).toBe("handCut");
    expect(remapLegacyCardId("fuseSaberPalm")).toBe("fusePalmSaber");
  });

  it("除允许的换页对以外，没有同字段换名复制", () => {
    const groups = new Map<string, string[]>();
    for (const c of Object.values(CARDS)) {
      const k = mechKey(c);
      const arr = groups.get(k) ?? [];
      arr.push(`${c.id}/${c.name}`);
      groups.set(k, arr);
    }
    const dups = [...groups.entries()].filter(([, g]) => g.length > 1);
    expect(dups).toEqual([]);
  });

  it("直取与劈掌不是同一张数", () => {
    expect(mechKey(CARDS.direct)).not.toBe(mechKey(CARDS.strike));
    expect(CARDS.direct.expose).toBe(1);
  });

  it("聚气、锁喉丝不再一名两效", () => {
    const named = (n: string) => Object.values(CARDS).filter((c) => c.name === n);
    expect(named("聚气")).toHaveLength(1);
    expect(named("锁喉丝")).toHaveLength(1);
  });
});
