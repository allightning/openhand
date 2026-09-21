import { describe, expect, it } from "vitest";
import { climbEnergyRegen, climbEnergyStart, climbVitals } from "./climbVitals";

describe("climbVitals", () => {
  it("方案 C：一档输出上限 10 / 开局 6 / 回 4，肉盾少 1 上限，控制多 1", () => {
    expect(climbVitals("watch")).toEqual({ hp: 50, energyMax: 10, energyStart: 6, energyRegen: 4 });
    expect(climbVitals("shiwanshan").energyMax).toBe(9);
    expect(climbVitals("moqiwan").energyMax).toBe(11);
    expect(climbVitals("shiwanshan").hp).toBeGreaterThan(climbVitals("moqiwan").hp);
    expect(climbEnergyStart("watch")).toBe(6);
    expect(climbEnergyRegen("watch")).toBe(4);
  });

  it("二档约 80 血，回劲 5，上限随定位微调", () => {
    expect(climbVitals("lvchifeng").hp).toBe(80);
    expect(climbVitals("lvchifeng").energyMax).toBe(12);
    expect(climbVitals("lvchifeng").energyStart).toBe(8);
    expect(climbVitals("lvchifeng").energyRegen).toBe(5);
    expect(climbVitals("zhangshoushan").energyMax).toBe(11);
    expect(climbVitals("chenchenlan").energyMax).toBe(13);
  });

  it("三档气血 115–145，回劲 6", () => {
    expect(climbVitals("lishuangxing").hp).toBe(130);
    expect(climbVitals("lishuangxing").energyMax).toBe(14);
    expect(climbVitals("fubishan").hp).toBe(145);
    expect(climbVitals("fengtang").hp).toBe(115);
    expect(climbEnergyRegen("lishuangxing")).toBe(6);
  });
});
