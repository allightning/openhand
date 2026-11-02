import { CLIMB_CHARGE_CAP } from "../../src/game/climbCaps";
import { labCard } from "../../src/game/labContent";
import type { RunContext } from "../../src/game/runContext";
import { canPlay } from "../../src/game/sim";
import type { Battle, CardDef, CardId, WeaponId } from "../../src/game/types";
import { envAdj } from "./envScore";
import { FLAGS_OFF, type SimFlags } from "./flags";
import { foeSchool, leftoverSteps } from "./foeRead";
import { foeDist, isMoveCard } from "./hand";
import { dartFormAllows } from "../../src/game/rules/dartPin";
import { intentAdj } from "./intentScore";
import type { Policy } from "./policy";
import { shouldTakeReaction } from "./reactPolicy";

function stepIn(id: CardId, dist: number, want: number): number {
  if (!isMoveCard(id)) return 0;
  const back = id === "retreat" || id === "stepSword" || id === "stepSpear" || id === "dartStep";
  if (dist > want && !back) return 72;
  if (dist < want && back) return 72;
  return 0;
}

function farBlock(def: CardDef, dist: number, reach: number): number {
  if (dist > reach && (def.block ?? 0) > 0) return 34;
  return 0;
}

function palm(id: CardId, def: CardDef, dist: number): number {
  const step = dist > 1 ? stepIn(id, dist, 1) : 0;
  if (step > 0) return step;
  if (dist <= 1 && def.type === "attack") return 40 + (def.knock ?? 0) * 6 + (def.damage ?? 0);
  if (dist <= 1 && (def.knock ?? 0) > 0) return 55;
  const guard = farBlock(def, dist, 1);
  if (guard > 0) return guard;
  if (def.type === "attack") return 22;
  return 0;
}

function saber(id: CardId, def: CardDef, dist: number): number {
  const step = dist > 1 ? stepIn(id, dist, 1) : 0;
  if (step > 0) return step;
  if (dist <= 1 && (def.bleed ?? 0) > 0) return 80;
  if (def.type === "attack") return 42 + (def.damage ?? 0);
  const guard = farBlock(def, dist, 1);
  if (guard > 0) return guard;
  return 0;
}

function sword(id: CardId, def: CardDef, dist: number): number {
  const step = dist > 2 ? stepIn(id, dist, 2) : 0;
  if (step > 0) return step;
  if (dist <= 2 && ((def.expose ?? 0) > 0 || (def.mark ?? 0) > 0)) return 76;
  if (def.type === "attack") return 40 + (def.damage ?? 0);
  const guard = farBlock(def, dist, 2);
  if (guard > 0) return guard;
  return 0;
}

function spear(id: CardId, def: CardDef, dist: number): number {
  if (dist < 2 || dist > 4) {
    const step = stepIn(id, dist, 3);
    if (step > 0) return step;
  }
  if (def.type === "attack") return 64 + (def.damage ?? 0);
  if ((def.block ?? 0) > 0 && (dist < 2 || dist > 4)) return 30;
  return 0;
}

function staffPunch(id: CardId, def: CardDef, dist: number): number {
  if ((def.block ?? 0) > 0) return 70 + def.block;
  if (dist > 3) return stepIn(id, dist, 3);
  if (def.type === "attack") return 12;
  return 0;
}

function staffBank(b: Battle, id: CardId, def: CardDef, dist: number): number {
  const stacks = b.chargeStacks ?? 0;
  if (id === "staffBurst" && stacks >= 4) return 120 + stacks * 10;
  if (id === "staffBurst" && stacks >= 1 && b.enemy.hp <= 44 * stacks) return 110;
  if ((id === "staffPrime" || id === "staffSettle") && stacks < CLIMB_CHARGE_CAP) {
    return 88 + (CLIMB_CHARGE_CAP - stacks);
  }
  return staffPunch(id, def, dist);
}

function hook(id: CardId, def: CardDef, dist: number): number {
  if ((def.pullEnemy ?? 0) > 0 && dist > 1) return 86;
  if (id === "hookDisarm" && dist <= 2) return 84;
  if (dist > 2) {
    const step = stepIn(id, dist, 2);
    if (step > 0) return step;
    const guard = farBlock(def, dist, 2);
    if (guard > 0) return guard;
  }
  if (def.type === "attack") return 44;
  return 0;
}

function dart(b: Battle, id: CardId, def: CardDef, dist: number): number {
  if (id === "dartStep") return stepIn(id, dist, dist >= 3 ? 4 : 2);
  if (def.dartForm && !dartFormAllows(def.dartForm, dist)) return 0;
  const pin = def.pin ?? 0;
  if (pin > 0) return 70 + pin * 18 + Math.min(24, leftoverSteps(b) * 6) + (def.damage ?? 0);
  if (def.type === "attack") return 40 + (def.damage ?? 0);
  return 0;
}

const LABEL: Record<WeaponId, string> = {
  palm: "拳·贴身连推",
  saber: "刀·贴身裂创",
  sword: "剑·剑势破绽",
  spear: "枪·守 2-4 格",
  staff: "棍",
  hook: "钩·拉近缴械",
  dart: "飞刀·双形态钉步",
};

function staffLabel(flags: SimFlags): string {
  if (flags.charge === "punch") return "棍·每手正常打";
  if (flags.charge === "bank") return "棍·憋层爆发";
  return "棍·先格挡少出手";
}

function scoreOf(school: WeaponId, flags: SimFlags, b: Battle, id: CardId, def: CardDef, dist: number): number {
  if (school === "palm") return palm(id, def, dist);
  if (school === "saber") return saber(id, def, dist);
  if (school === "sword") return sword(id, def, dist);
  if (school === "spear") return spear(id, def, dist);
  if (school === "hook") return hook(id, def, dist);
  if (school === "dart") return dart(b, id, def, dist);
  if (flags.charge === "bank") return staffBank(b, id, def, dist);
  return staffPunch(id, def, dist);
}

function pick(school: WeaponId, flags: SimFlags, b: Battle, rc: RunContext): string | null {
  let best: string | null = null;
  let n = 0;
  const dist = foeDist(b) ?? 0;
  for (const card of b.hand) {
    if (!canPlay(b, card.uid, rc).ok) continue;
    const def = labCard(card.defId, rc);
    let s = scoreOf(school, flags, b, card.defId, def, dist);
    if (flags.env) s += envAdj(b, card.defId, def);
    if (flags.intent) s += intentAdj(b, card.defId, def);
    if (flags.archetype) {
      const sch = foeSchool(b);
      if ((sch === "spear" || sch === "staff" || sch === "hook") && (def.pin ?? 0) > 0) s += 12;
    }
    if (s > n) {
      n = s;
      best = card.uid;
    }
  }
  return best;
}

export function schoolPolicy(school: WeaponId, flags: SimFlags = FLAGS_OFF): Policy {
  const label = school === "staff" ? staffLabel(flags) : LABEL[school];
  return {
    id: school,
    label,
    school,
    flags,
    pick: (b, rc) => pick(school, flags, b, rc),
    react: (b, rc) => shouldTakeReaction(b, rc, flags.react),
  };
}

export const SCHOOL_POLICIES = (["palm", "saber", "sword", "spear", "staff", "hook"] as WeaponId[]).map((id) => schoolPolicy(id));
