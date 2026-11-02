import { labCard } from "../../src/game/labContent";
import type { RunContext } from "../../src/game/runContext";
import { canPlay } from "../../src/game/sim";
import type { Battle, CardDef, CardId, WeaponId } from "../../src/game/types";
import { foeDist, isMoveCard } from "./hand";
import type { Policy } from "./policy";

function scored(b: Battle, rc: RunContext, score: (id: CardId, def: CardDef, dist: number) => number): string | null {
  let best: string | null = null;
  let n = 0;
  const dist = foeDist(b) ?? 0;
  for (const card of b.hand) {
    if (!canPlay(b, card.uid, rc).ok) continue;
    const s = score(card.defId, labCard(card.defId, rc), dist);
    if (s > n) {
      n = s;
      best = card.uid;
    }
  }
  return best;
}

function stepIn(id: CardId, dist: number, want: number): number {
  if (!isMoveCard(id)) return 0;
  const back = id === "retreat" || id === "stepSword" || id === "stepSpear";
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

function staff(id: CardId, def: CardDef, dist: number): number {
  if ((def.block ?? 0) > 0) return 70 + def.block;
  if (dist > 3) return stepIn(id, dist, 3);
  if (def.type === "attack") return 12;
  return 0;
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

const SCORE: Record<WeaponId, (id: CardId, def: CardDef, dist: number) => number> = {
  palm,
  saber,
  sword,
  spear,
  staff,
  hook,
  dart: hook,
};

const LABEL: Record<WeaponId, string> = {
  palm: "拳·贴身连推",
  saber: "刀·贴身裂创",
  sword: "剑·剑势破绽",
  spear: "枪·守 2-4 格",
  staff: "棍·先格挡少出手",
  hook: "钩·拉近缴械",
  dart: "飞刀·双形态钉步",
};

export function schoolPolicy(school: WeaponId): Policy {
  const score = SCORE[school];
  return {
    id: school,
    label: LABEL[school],
    school,
    pick: (b, rc) => scored(b, rc, score),
  };
}

export const SCHOOL_POLICIES = (Object.keys(SCORE) as WeaponId[]).map(schoolPolicy);
