import { describe, expect, it } from "vitest";
import { SCHOOL_ULTIMATE } from "../game/rogueCards";
import { catalogByKind, searchCatalog } from "./codexCatalog";
import { GUIDE_SECTIONS, renderGuideSheet } from "./guide";
import { renderWikiSheet, wikiPageCount } from "./encyclopedia";

describe("卡牌图鉴目录", () => {
  it("绝/技/兵分段，绝含六系绝招", () => {
    const ult = catalogByKind("ult");
    const skill = catalogByKind("skill");
    const gear = catalogByKind("gear");
    expect(ult.length).toBeGreaterThan(6);
    for (const id of Object.values(SCHOOL_ULTIMATE)) {
      expect(ult.some((e) => e.id === id)).toBe(true);
    }
    expect(skill.some((e) => e.kicker.startsWith("外功"))).toBe(true);
    expect(skill.some((e) => e.kicker.includes("心法"))).toBe(true);
    expect(gear.length).toBeGreaterThan(10);
    expect(ult.every((e) => e.related)).toBe(true);
  });

  it("牌面和图鉴写数值，状态写清上限", () => {
    const skill = catalogByKind("skill");
    const strike = skill.find((e) => e.id === "strike");
    expect(strike?.text).toMatch(/数值：/);
    expect(strike?.text).toMatch(/劲 1/);
    expect(strike?.text).toMatch(/牌面伤 5/);
    const leftover = skill.find((e) => e.id === "leftover");
    expect(leftover?.text).toMatch(/1\/2\/3/);
    const iron = skill.find((e) => e.id === "ironBreath");
    expect(iron?.text).toMatch(/气血上限 \+30/);
    const god = catalogByKind("gear").find((e) => e.id === "saber-a-5");
    expect(god?.text).toMatch(/翻倍/);
    const html = renderWikiSheet("status", 0, "格挡");
    expect(html).toMatch(/帽 12/);
    const mate = renderWikiSheet("mates", 0, "沈夜行");
    expect(mate).toMatch(/先机/);
    expect(mate).toMatch(/劲力/);
  });

  it("按名称或 id 检索", () => {
    const byName = searchCatalog("ult", "掌");
    expect(byName.length).toBeGreaterThan(0);
    expect(byName.every((e) => `${e.id} ${e.name} ${e.kicker} ${e.text}`.includes("掌"))).toBe(true);
    const byId = searchCatalog("gear", "palm-a-5");
    expect(byId.some((e) => e.id === "palm-a-5")).toBe(true);
    expect(searchCatalog("skill", "zzzz-no-such")).toEqual([]);
  });
});

describe("图鉴弹层", () => {
  it("绝技兵三栏 + 搜索框，战斗入口可用同一套", () => {
    const html = renderWikiSheet("ult", 0, "");
    expect(html).toContain("data-wiki-book=\"ult\"");
    expect(html).toContain("data-wiki-book=\"skill\"");
    expect(html).toContain("data-wiki-book=\"gear\"");
    expect(html).toContain("id=\"lab-wiki-search\"");
    expect(html).toContain("lab-wiki-head-tools");
    expect(html).toContain("绝招图鉴");
    expect(html).toMatch(/lab-wiki-foot[\s\S]*data-wiki-prev[\s\S]*data-wiki-next/);
    expect(wikiPageCount("ult", "")).toBeGreaterThan(0);
  });
});

describe("攻略爬塔详解", () => {
  it("写回合三截、六系、状态层帽、预演", () => {
    const titles = GUIDE_SECTIONS.map((s) => s.title);
    expect(titles).toContain("一回合三截");
    expect(titles).toContain("六系核副（爬塔）");
    expect(titles).toContain("状态与层帽");
    expect(titles).toContain("馆间 · 下注 · 同道");
    expect(titles).toContain("投喂 · 品阶 · 神兵");
    const html = renderGuideSheet();
    expect(html).toContain("断劲");
    expect(html).toContain("噬血");
    expect(html).toContain("连击");
    expect(html).toContain("剑势");
    expect(html).toContain("【开始】");
    expect(html).toContain("【结束】");
    expect(html).not.toContain("docs/combat/RULES.md");
  });
});
