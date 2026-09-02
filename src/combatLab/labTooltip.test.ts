import { describe, expect, it } from "vitest";
import { collectTipHosts, resolveTipText } from "./labTooltip";

function fakeHost(cls: string, dataTip?: string): HTMLElement {
  return {
    classList: { contains: (name: string) => name === cls },
    dataset: dataTip ? { tip: dataTip } : {},
    parentElement: null,
  } as unknown as HTMLElement;
}

describe("collectTipHosts", () => {
  it("binds 状态 / 外功 / 换人 / 助战 / 技能牌", () => {
    const status = fakeHost("status-chip");
    const tech = fakeHost("tech-chip");
    const swap = fakeHost("swap-btn");
    const assist = fakeHost("assist-btn");
    const card = fakeHost("card", "稳步\n技能 · 通用\n格挡 6，抽 1");
    const root = {
      querySelectorAll(sel: string) {
        if (sel === "[data-tip]") return [card] as unknown as NodeListOf<HTMLElement>;
        if (sel === ".status-tip") {
          return [
            { parentElement: status },
            { parentElement: tech },
            { parentElement: swap },
            { parentElement: assist },
          ] as unknown as NodeListOf<HTMLElement>;
        }
        return [] as unknown as NodeListOf<HTMLElement>;
      },
    } as unknown as ParentNode;
    const hosts = collectTipHosts(root);
    const cls = (name: string) => hosts.some((h) => h.classList.contains(name));
    expect(cls("status-chip")).toBe(true);
    expect(cls("tech-chip")).toBe(true);
    expect(cls("swap-btn")).toBe(true);
    expect(cls("assist-btn")).toBe(true);
    expect(cls("card")).toBe(true);
  });
});

describe("resolveTipText", () => {
  it("prefers data-tip", () => {
    expect(resolveTipText("残谱 6 张", "内联")).toBe("残谱 6 张");
  });

  it("falls back to inline 简介", () => {
    expect(resolveTipText("  ", "第 1 段 · 打击\n硬拆得拆势")).toBe("第 1 段 · 打击\n硬拆得拆势");
  });

  it("empty when both missing", () => {
    expect(resolveTipText(undefined, "")).toBe("");
  });

  it("有 tip 时 resolve 非空（问号不可空）", () => {
    expect(resolveTipText("拆势：下一刀真伤", undefined).length).toBeGreaterThan(0);
    expect(resolveTipText("", "内联简介").length).toBeGreaterThan(0);
  });
});
