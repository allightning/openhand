/** Mid-run hooks: scars, bounty, bets, falls, forks, weapon climbs. */

import { bossCount } from "./hero";
import { softUpgradeBlockReason, softUpgradeTarget } from "./economy";
import type { EnemyId, HeroId, Run } from "./types";
import { gearById, nextGrade } from "./weapons";

/** Beat this foe in this scene → scar flag that softens a gate. */
export const GATE_SCARS: { scene: string; enemyId: EnemyId; flag: string }[] = [
  { scene: "customs", enemyId: "inkhand", flag: "scarBooks" },
  { scene: "customs", enemyId: "delay", flag: "scarBooks" },
  { scene: "ropes", enemyId: "robber", flag: "scarDeed" },
  { scene: "ropes", enemyId: "stakeboss", flag: "scarDeed" },
  { scene: "lamp", enemyId: "glasspin", flag: "scarIncense" },
  { scene: "drums", enemyId: "alley", flag: "scarWatch" },
  { scene: "drums", enemyId: "trapper", flag: "scarWatch" },
  { scene: "yard", enemyId: "bandit", flag: "scarYard" },
  { scene: "sluice", enemyId: "nametaker", flag: "scarTide" },
];

export function scarFlagFor(scene: string, enemyId: EnemyId): string | null {
  return GATE_SCARS.find((s) => s.scene === scene && s.enemyId === enemyId)?.flag ?? null;
}

export function gateScarOpen(gate: string, flags: string[]): boolean {
  if (gate === "books" && flags.includes("scarBooks")) return true;
  if (gate === "deed" && flags.includes("scarDeed")) return true;
  if (gate === "incense" && flags.includes("scarIncense")) return true;
  if (gate === "watch" && flags.includes("scarWatch")) return true;
  if (gate === "fire-seals" && flags.includes("scarYard")) return true;
  if (gate === "tide" && flags.includes("scarTide")) return true;
  return false;
}

export function nextGradeId(weaponId: string): string | null {
  return nextGrade(weaponId);
}

/** Scenes where a clean win can temper the blade one grade. */
export const TEMPER_SCENES = new Set(["martial", "wine", "spit", "drums", "yard"]);

export function temperCost(grade: number): number {
  return 8 + grade * 4;
}

export type TeaBet = { stake: number; maxTurn: number };

export function getTeaBet(run: Run): TeaBet | null {
  return run.teaBet ?? null;
}

export function placeTeaBet(run: Run, stake: number, maxTurn: number): { ok: true; run: Run } | { ok: false; reason: string } {
  if (run.teaBet) return { ok: false, reason: "注还压着。先打完这一场。" };
  if ((run.silver ?? 0) < stake) return { ok: false, reason: `银不够 ${stake} 两。` };
  return {
    ok: true,
    run: {
      ...run,
      silver: (run.silver ?? 0) - stake,
      teaBet: { stake, maxTurn },
      flags: run.flags.includes("teaBetOn") ? run.flags : [...run.flags, "teaBetOn"],
    },
  };
}

export function resolveTeaBet(
  run: Run,
  won: boolean,
  turns: number,
): { run: Run; line: string } {
  const bet = run.teaBet;
  if (!bet) return { run, line: "" };
  const clear = {
    ...run,
    teaBet: null,
    flags: run.flags.filter((f) => f !== "teaBetOn"),
  };
  if (won && turns <= bet.maxTurn) {
    const payout = bet.stake * 2;
    return {
      run: { ...clear, silver: (clear.silver ?? 0) + payout },
      line: `茶棚注成了。 ${bet.maxTurn} 息内了结，收回 ${payout} 两。`,
    };
  }
  return {
    run: clear,
    line: won
      ? `茶棚注没成。打过了 ${bet.maxTurn} 息，押金没了。`
      : `倒了。茶棚那注一并抹掉。`,
  };
}

export function applyFallFlags(run: Run): Run {
  const flags = [...run.flags];
  const add = (f: string) => {
    if (!flags.includes(f)) flags.push(f);
  };
  const max = run.livesMax ?? 3;
  const left = run.lives ?? max;
  const spent = max - left;
  if (spent >= 1) add("fallenOnce");
  if (spent >= 2) {
    add("fallenTwice");
    add("sidesShut");
  }
  return { ...run, flags };
}

/** Every 3 boss-table kills, open a bounty offer if none active. */
export function maybeArmBounty(run: Run): Run {
  const hero = (run.hero ?? "rail") as HeroId;
  const n = bossCount(hero, run.beaten);
  if (n < 3 || n % 3 !== 0) return run;
  if (run.flags.includes("bountyActive") || run.flags.includes("bountyDue")) return run;
  if ((run.bountyAt ?? 0) >= n) return run;
  const flags = run.flags.filter((f) => f !== "bountyDeclined");
  return {
    ...run,
    bountyAt: n,
    flags: [...flags, "bountyDue"],
  };
}

const BOUNTY_POOL: EnemyId[] = [
  "thug",
  "smuggler",
  "alley",
  "trapper",
  "hauler",
  "robber",
  "bandit",
];

/** Where the bounty target usually hangs out (player-facing). */
export const BOUNTY_WHERE: Record<string, { scene: string; place: string }> = {
  thug: { scene: "martial", place: "武馆砂坑外" },
  smuggler: { scene: "salt", place: "盐仓西厢" },
  alley: { scene: "drums", place: "更院北岗" },
  trapper: { scene: "drums", place: "更院簧门" },
  hauler: { scene: "lane", place: "垂街纤道" },
  robber: { scene: "ropes", place: "缆厂码头" },
  bandit: { scene: "yard", place: "印院外岗" },
};

export function bountyWhere(id: EnemyId | string): { scene: string; place: string } {
  return BOUNTY_WHERE[id] ?? { scene: "yamen", place: "港湾一带" };
}

export function pickBountyTarget(run: Run): EnemyId {
  const left = BOUNTY_POOL.filter((id) => !run.beaten.includes(id));
  const pool = left.length ? left : BOUNTY_POOL;
  const i = (run.beaten.length + (run.falls ?? 0) * 3) % pool.length;
  return pool[i] ?? "thug";
}

/** Peek next target without accepting (for bailiff briefing). */
export function peekBountyTarget(run: Run): EnemyId {
  return pickBountyTarget(run);
}

export function acceptBounty(run: Run, kind: "silver" | "card" | "weapon"): Run {
  const target = pickBountyTarget(run);
  const flags = run.flags.filter((f) => f !== "bountyDue" && f !== "bountyOffer");
  flags.push("bountyActive", `bountyKind-${kind}`, `bountyTarget-${target}`);
  return { ...run, flags, bountyDeadline: run.beaten.length + 3 };
}

/** Soft decline: clear due, remember so maybeArm does not re-fire until next boss milestone. */
export function declineBounty(run: Run): Run {
  const flags = run.flags.filter((f) => f !== "bountyDue" && f !== "bountyOffer");
  flags.push("bountyDeclined");
  return { ...run, flags };
}

export function bountyTarget(run: Run): EnemyId | null {
  const raw = run.flags.find((f) => f.startsWith("bountyTarget-"));
  if (!raw) return null;
  return raw.replace("bountyTarget-", "") as EnemyId;
}

export function bountyKind(run: Run): "silver" | "card" | "weapon" | null {
  if (run.flags.includes("bountyKind-silver")) return "silver";
  if (run.flags.includes("bountyKind-card")) return "card";
  if (run.flags.includes("bountyKind-weapon")) return "weapon";
  return null;
}

export function clearBountyFlags(run: Run): Run {
  return {
    ...run,
    bountyDeadline: undefined,
    flags: run.flags.filter(
      (f) =>
        f !== "bountyActive" &&
        f !== "bountyDue" &&
        f !== "bountyDone" &&
        f !== "bountyOffer" &&
        !f.startsWith("bountyKind-") &&
        !f.startsWith("bountyTarget-"),
    ),
  };
}

export function checkBountyOnWin(run: Run, enemyId: EnemyId): { run: Run; payout: string } {
  if (!run.flags.includes("bountyActive")) return { run, payout: "" };
  const target = bountyTarget(run);
  const kind = bountyKind(run);
  const deadline = run.bountyDeadline ?? 999;
  if (run.beaten.length > deadline && enemyId !== target) {
    return {
      run: clearBountyFlags({ ...run, flags: [...run.flags, "bountyFail"] }),
      payout: "差事过期了。捕头不认迟刀。",
    };
  }
  if (enemyId !== target) return { run, payout: "" };
  let next = clearBountyFlags({ ...run, flags: [...run.flags.filter((f) => f !== "bountyFail"), "bountyDone"] });
  if (kind === "silver") {
    next = { ...next, silver: (next.silver ?? 0) + 10 };
    return { run: next, payout: "差事结了。银十两。" };
  }
  if (kind === "weapon") {
    const up = softUpgradeTarget(next.weapon);
    if (up) {
      next = {
        ...next,
        weapon: up,
        weapons: next.weapons.includes(up) ? next.weapons : [...next.weapons, up],
      };
      return { run: next, payout: `差事结了。兵刃升到「${gearById(up)?.name ?? up}」。` };
    }
    next = { ...next, silver: (next.silver ?? 0) + 8 };
    return {
      run: next,
      payout: softUpgradeBlockReason(next.weapon).includes("锻材")
        ? "差事结了。精级须锻材，改结银八两。"
        : "差事结了。刀已到顶，改结银八两。",
    };
  }
  // card: add a modest attack if not already bloating
  const add = next.hero === "seer" ? "expose" : next.hero === "sapper" ? "plant" : "strike";
  if (!next.deck.includes(add as never) || next.deck.filter((c) => c === add).length < 3) {
    next = { ...next, deck: [...next.deck, add as Run["deck"][number]] };
  }
  next = { ...next, silver: (next.silver ?? 0) + 4 };
  return { run: next, payout: "差事结了。袖中多一页，另结银四两。" };
}

export function checkBountyExpiry(run: Run): Run {
  if (!run.flags.includes("bountyActive")) return run;
  const deadline = run.bountyDeadline ?? 999;
  if (run.beaten.length <= deadline) return run;
  return clearBountyFlags({ ...run, flags: [...run.flags, "bountyFail"] });
}

export function forkFlag(hero: HeroId): string {
  if (hero === "seer") return "forkSeer";
  if (hero === "sapper") return "forkSapper";
  return "forkRail";
}

export function maybeUnlockFork(run: Run): Run {
  const hero = (run.hero ?? "rail") as HeroId;
  const flag = forkFlag(hero);
  if (run.flags.includes(flag)) return run;
  if (!run.flags.includes("branded")) return run;
  if (bossCount(hero, run.beaten) < 6) return run;
  return { ...run, flags: [...run.flags, flag, "forkOpen"] };
}

export function forkScene(hero: HeroId): "railNight" | "seerGaze" | "sapperPile" {
  if (hero === "seer") return "seerGaze";
  if (hero === "sapper") return "sapperPile";
  return "railNight";
}
