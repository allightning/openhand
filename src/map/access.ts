import type { Run } from "../game/types";
import type { SceneId } from "./types";

/** Higher = later in the campaign. Dock stays 0; usurper camp is 5. */
export const SCENE_TIER: Partial<Record<SceneId, number>> = {
  hut: 0,
  plot: 0,
  ridge: 0,
  wharf: 0,
  hold: 0,
  salt: 0,
  customs: 0,
  yard: 0,
  spit: 0,
  lane: 0,
  ropes: 0,
  pit: 0,
  docks: 0,
  shed: 0,
  lamp: 0,
  shrine: 0,
  sluice: 0,
  tea: 0,
  drums: 0,
  outer: 0,
  glass: 0,
  inner: 0,
  palace: 0,
  cave: 0,
  cellar: 0,
  ferry: 0,
  isle: 0,
  pier: 0,
  yamen: 0,
  wine: 0,
  wineUp: 0,
  flower: 0,
  clinic: 0,
  pawn: 0,
  escort: 0,
  martial: 0,
  lodge: 0,
  railNight: 0,
  seerGaze: 0,
  sapperPile: 0,
  huainan: 1,
  chuzhou: 2,
  suqian: 2,
  gaoyou: 2,
  yangzhou: 2,
  bozhou: 2,
  yanshi: 2,
  jiankang: 3,
  changzhou: 3,
  wuxi: 3,
  suzhou: 3,
  jiaxing: 3,
  shanzhou: 3,
  tongguan: 3,
  suzhousu: 3,
  linan: 4,
  luoyang: 4,
  luoyang_yamen_prison: 0,
  luoyang_yanbo_inner: 0,
  bianjing: 4,
  shaolin: 4,
  luohan: 4,
  changan: 4,
  usurpCamp: 5,
  taxMarket: 0,
  taxWine: 0,
  taxClinic: 0,
  taxGate: 0,
  taxStable: 0,
  taxLodge: 0,
  taxArchive: 0,
  taxTea: 0,
  taxClerk: 0,
  taxJail: 0,
  taxWell: 0,
  taxMartial: 0,
  taxEscort: 0,
  taxPawn: 0,
  taxAlley: 0,
  ropeMarket: 0,
  ropeWine: 0,
  ropeClinic: 0,
  ropeGate: 0,
  ropeStore: 0,
  ropeLodge: 0,
  ropeMess: 0,
  ropeQuay: 0,
  ropeWatch: 0,
  ropeForge: 0,
  ropeWell: 0,
  ropeMartial: 0,
  ropeEscort: 0,
  ropeAlley: 0,
  ropeYard: 0,
};

export function sceneTier(id: SceneId): number {
  return SCENE_TIER[id] ?? 0;
}

/** How far the run is allowed to travel on the atlas roads. */
export function travelTier(run: Run): number {
  if (run.flags.includes("roadUsurp")) return 5;
  // 京城门：用「中段拍板」开路，勿要求城里才发的旗（否则进不去发旗地）。
  if (
    run.flags.includes("throneTrue") ||
    run.flags.includes("throneAbandon") ||
    run.flags.includes("purgeReady") ||
    run.flags.includes("caseRebel") ||
    (run.flags.includes("graceKnown") && run.flags.includes("traitorSeen")) ||
    run.flags.includes("midDoorTrue") ||
    run.flags.includes("midDoorBent") ||
    run.flags.includes("booksOk") ||
    run.flags.includes("graceKnown")
  ) {
    return 4;
  }
  if (
    run.items.includes("roadPass") ||
    run.flags.includes("roadPass") ||
    run.flags.includes("branded") ||
    run.flags.includes("booksOk") ||
    run.flags.includes("knotOk")
  ) {
    return 3;
  }
  if (
    run.flags.includes("mainOpen") ||
    run.flags.includes("heardRebel") ||
    run.flags.includes("caseRebel") ||
    run.flags.includes("graceKnown") ||
    run.beaten.includes("inkhand") ||
    run.beaten.includes("stakeboss") ||
    run.beaten.includes("intruder")
  ) {
    return 2;
  }
  if (run.flags.includes("mainOpen") || run.beaten.includes("intruder")) return 1;
  return 0;
}

export function canTravelTo(
  from: SceneId,
  to: SceneId,
  run: Run,
): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: true };
  if (run.flags.includes("testMode")) return { ok: true };
  // Always allow retreat to places already walked.
  if (run.visited.includes(to)) return { ok: true };
  // Indoor / same-hub doors stay free.
  if (sceneTier(to) === 0) return { ok: true };
  const need = sceneTier(to);
  const have = travelTier(run);
  if (have >= need) return { ok: true };
  if (need <= 2) {
    return {
      ok: false,
      reason: "官道未开。先在港律站稳，或去衙门讨一张通关文牒。",
    };
  }
  if (need === 3) {
    return {
      ok: false,
      reason: "关卡要文牒。身上无帖，或主线还未推到这一程。",
    };
  }
  if (need === 4) {
    return {
      ok: false,
      reason: "京城门深。要主线认路，或文牒与口风都到了，才进得去。",
    };
  }
  return {
    ok: false,
    reason: "营门外刀影重。立场未明，硬闯是送命。",
  };
}
