import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { climbPlace, climbPlaces, upsertRouteLog, wagerBgFor, loadoutBgFor, renderRouteBook } from "./climbPlaces";

const PUB = resolve(__dirname, "../../public");

describe("路程地名", () => {
  it("三线各十处，同线歇脚图不重复", () => {
    for (const path of ["bandit", "shaolin", "court"] as const) {
      const list = climbPlaces(path);
      expect(list).toHaveLength(10);
      const names = new Set(list.map((p) => p.name));
      expect(names.size).toBe(10);
      const bgs = new Set(list.map((p) => p.restBg));
      expect(bgs.size).toBe(10);
      for (const p of list) {
        expect(existsSync(resolve(PUB, p.restBg)), p.restBg).toBe(true);
      }
    }
    expect(climbPlace("bandit", 1).name).toContain("开封");
    expect(climbPlace("shaolin", 1).name).toContain("山门");
    expect(climbPlace("court", 2).name).toContain("天街");
    const all = [...climbPlaces("bandit"), ...climbPlaces("shaolin"), ...climbPlaces("court")];
    for (const p of all) {
      expect(p.blurb, p.id).not.toMatch(/等你开口|开口的是|关的是嘴|进门不等于|空的才危险|茶是冷的/);
      expect(p.blurb, p.id).not.toMatch(/不问姓|不问来路|没叫你的号|不报上姓|不报信|没抬头看你|不认名号|不问你从哪来|从不报上号/);
      expect(p.blurb, p.id).not.toMatch(/像|仿佛|如同/);
    }
  });

  it("赌馆与配装按线分图，且不是歇脚图", () => {
    expect(wagerBgFor("bandit")).toContain("wager-jianghu");
    expect(wagerBgFor("shaolin")).toContain("wager-shaolin");
    expect(loadoutBgFor("court")).toContain("loadout-court");
    expect(existsSync(resolve(PUB, wagerBgFor("bandit")))).toBe(true);
    expect(existsSync(resolve(PUB, loadoutBgFor("shaolin")))).toBe(true);
    expect(wagerBgFor("bandit")).not.toBe(climbPlace("bandit", 1).restBg);
  });

  it("路程本记下选择，同馆覆盖备注", () => {
    const a = upsertRouteLog([], { stage: 1, placeId: "jh-kaifeng", placeName: "开封", rest: "酒楼" });
    const b = upsertRouteLog(a, { stage: 1, placeId: "jh-kaifeng", placeName: "开封", rest: "酒楼", note: "买路" });
    expect(b).toHaveLength(1);
    expect(b[0]!.note).toBe("买路");
  });

  it("路程小本列出落脚与选择", () => {
    const html = renderRouteBook(
      [{ stage: 1, placeId: "jh-kaifeng", placeName: "开封 · 州桥", rest: "州桥酒楼", note: "因你选择了荒路" }],
      "江湖",
    );
    expect(html).toContain("路程小本");
    expect(html).toContain("开封 · 州桥");
    expect(html).toContain("荒路");
    expect(html).toContain("route-book-close");
  });
});
