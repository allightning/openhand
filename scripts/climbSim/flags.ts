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

/** 馆 3、6 灼烧，馆 8 无墙。关环境开关则不挂。 */
export function envTagForStage(stage: number, on: boolean): "burn" | "nowall" | undefined {
  if (!on) return undefined;
  if (stage === 3 || stage === 6) return "burn";
  if (stage === 8) return "nowall";
  return undefined;
}
