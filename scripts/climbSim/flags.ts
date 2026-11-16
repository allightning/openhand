import { envTagForHall } from "../../src/game/content/envSchedule";
import type { EnvTag } from "../../src/game/types";

export type ChargeMode = "off" | "bank" | "punch";
export type DartMode = "off" | "on";
export type ReactMode = "off" | "value" | "never" | "always";

export type SimFlags = {
  charge: ChargeMode;
  dart: DartMode;
  react: ReactMode;
  env: boolean;
  archetype: boolean;
  intent: boolean;
};

export const FLAGS_OFF: SimFlags = {
  charge: "off",
  dart: "off",
  react: "off",
  env: false,
  archetype: false,
  intent: false,
};

export const FLAGS_ON: SimFlags = {
  charge: "bank",
  dart: "on",
  react: "value",
  env: true,
  archetype: true,
  intent: true,
};

export function flagLabel(f: SimFlags): string {
  return `蓄${f.charge} 刀${f.dart} 窗${f.react} 境${f.env ? "开" : "关"} 原型${f.archetype ? "开" : "关"} 亮招${f.intent ? "开" : "关"}`;
}

/** 对齐 `envSchedule.ts`：灼烧 3/6/8、缺格 4/7、无墙 5/9。关环境开关则不挂。 */
export function envTagForStage(stage: number, on: boolean): EnvTag | undefined {
  if (!on) return undefined;
  return envTagForHall(stage);
}
