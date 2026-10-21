import { CLIMB_GUARD_WAGER, WEAPON_NAME, isBreakAlign, getGauntletFinalStage } from "./gauntletKit";
import { runCompanions } from "./ladderRules";
import { GauntletRun, WagerKind, WagerOffer, WagerStats, GAUNTLET_START_POT } from "./gauntletModel";
import type { Battle, WeaponId } from "../types";

export const WAGER_BLEED_RATE = 0.1;

export function bleedRemainingPot(pot: number): { pot: number; tax: number } {
  if (pot <= 0) return { pot: 0, tax: 0 };
  const tax = Math.max(1, Math.round(pot * WAGER_BLEED_RATE));
  return { pot: Math.max(0, pot - tax), tax };
}


export function isGauntletEndless(run?: Pick<GauntletRun, "endless"> | null): boolean {
  return Boolean(run?.endless);
}

export function basePot(stage: number): number {
  return 10 + 6 * stage;
}

export function applyBankerBoost(run: GauntletRun, mult: 2 | 3): GauntletRun {
  return { ...run, pot: GAUNTLET_START_POT * mult, bankerChosen: true };
}

/** 注额帽随馆序放开：1/2/3 = 30/50/70；4 起 120+50×(馆-4)；7 后每馆 +100。 */
export function wagerStakeCap(stage: number): number {
  const s = Math.max(1, stage);
  if (s <= 1) return 30;
  if (s === 2) return 50;
  if (s === 3) return 70;
  if (s <= 7) return 120 + 50 * (s - 4);
  return 270 + 100 * (s - 7);
}

export function wagerStakeMax(pot: number, stage = 1): number {
  if (!isBreakAlign()) {
    const cap = Math.floor(pot * 0.8);
    return Math.max(1, Math.min(pot, cap || 1));
  }
  return Math.max(1, Math.min(pot, wagerStakeCap(stage)));
}

function wagerOdds(kind: WagerKind): number {
  if (kind === "clean" || kind === "guard" || kind === "school") return 1.5;
  if (kind === "chain" || kind === "range" || kind === "swap") return 2.5;
  if (kind === "eye") return 3;
  return 2;
}

/**
 * 盘口每场开三。主盘：完璧/速胜/血战/赤手/不贴身/堆挡/本系兵刃。连破/破眼默认不开。
 */
export function wagerOffers(run: GauntletRun, rng: () => number): WagerOffer[] {
  const s = run.stage;
  const final = getGauntletFinalStage(run);
  const tierIdx = s <= 2 ? 0 : s <= 4 ? 1 : s <= 6 ? 2 : 3;
  const k = Math.max(0, s - final);
  const chainTarget = 3 + tierIdx + k;
  const eyeTarget = (s >= 5 ? 2 : 1) + Math.floor(k / 2);
  const speedTarget = (s >= 5 ? 7 : 6) + Math.floor(k / 2);
  const schoolLabel = `本系${WEAPON_NAME[run.school]}`;
  const mk = (kind: WagerKind, title: string, target: number, tip: string): WagerOffer => ({
    kind,
    title,
    target,
    odds: wagerOdds(kind),
    tip,
  });
  const all: WagerOffer[] = [
    mk("chain", "连破注", chainTarget, `本局硬破 ≥${chainTarget} 段。赢：注额 ×${wagerOdds("chain")}。`),
    mk("eye", "破眼注", eyeTarget, `本局破眼 ≥${eyeTarget} 次。赢：注额 ×${wagerOdds("eye")}。`),
    mk("clean", "完璧注", 75, `赢下本馆且收势气血 ≥75%。赢：注额 ×${wagerOdds("clean")}。`),
    mk("speed", "速胜注", speedTarget, `在 ${speedTarget} 回合内赢下本馆。赢：注额 ×${wagerOdds("speed")}。`),
    mk("blood", "血战注", 35, `赢下本馆且收势气血 ≤35%。赢：注额 ×${wagerOdds("blood")}。`),
    mk("fist", "赤手注", 0, `本局不用小道具/助战符，空手赢馆。赢：注额 ×${wagerOdds("fist")}。`),
    mk("range", "不贴身", 2, `赢馆且收势与敌相隔 ≥2 格。赢：注额 ×${wagerOdds("range")}。`),
    mk("guard", "堆挡注", CLIMB_GUARD_WAGER, `赢馆且收势格挡 ≥${CLIMB_GUARD_WAGER}。赢：注额 ×${wagerOdds("guard")}。`),
    mk("school", schoolLabel, 1, `赢馆且本局攻击牌皆为${schoolLabel}（须至少打出一张攻击）。赢：注额 ×${wagerOdds("school")}。`),
    mk("swap", "换人注", 1, `本局换人至少 1 次。赢：注额 ×${wagerOdds("swap")}。`),
  ];
  const pool = all.filter((o) => {
    if (o.kind === "fist" && run.items.length === 0) return false;
    if (o.kind === "chain" || o.kind === "eye") return false;
    if (o.kind === "swap" && runCompanions(run).length < 1) return false;
    if (o.kind === "range" && (run.school === "spear" || run.school === "staff")) return false;
    return true;
  });
  const weights: Record<WagerKind, number> = {
    chain: 8,
    eye: 6,
    clean: 16,
    speed: 14,
    blood: 10,
    fist: 10,
    range: run.school === "palm" ? 6 : 12,
    guard: 16,
    school: 14,
    swap: 14,
  };
  const out: WagerOffer[] = [];
  const bag = [...pool];
  while (out.length < 3 && bag.length) {
    const total = bag.reduce((sum, o) => sum + (weights[o.kind] ?? 10), 0);
    let roll = rng() * total;
    let pick = 0;
    for (let i = 0; i < bag.length; i++) {
      roll -= weights[bag[i]!.kind] ?? 10;
      if (roll <= 0) {
        pick = i;
        break;
      }
    }
    out.push(bag.splice(pick, 1)[0]!);
  }
  return out;
}

export function wagerBattleStats(b: Battle, won: boolean): WagerStats {
  return {
    breaks: b.v2BreakCount ?? 0,
    turns: b.turn,
    hpEndRatio: b.player.maxHp > 0 ? b.player.hp / b.player.maxHp : 0,
    won,
    eyes: b.v2EyeCount ?? 0,
    itemsUsed: (b.v2ItemUses ?? 0) > 0,
    endDist: Math.abs(b.player.pos - b.enemy.pos),
    endBlock: b.playerBlock,
    schoolPure: (b.v2AttackPlays ?? 0) > 0 && !(b.v2OffSchoolAtk ?? 0),
    swaps: b.v2SwapCount ?? 0,
  };
}

/** 假定注额已从池里扣走。赢：返还 注额×赔率；飞：0。 */
export function resolveWager(run: GauntletRun, stats: WagerStats): { won: boolean; payout: number; text: string } {
  const w = run.wager;
  if (!w) return { won: false, payout: 0, text: "" };
  let ok = false;
  if (w.kind === "chain") ok = stats.breaks >= w.target;
  else if (w.kind === "eye") ok = stats.eyes >= w.target;
  else if (w.kind === "clean") ok = stats.hpEndRatio >= w.target / 100;
  else if (w.kind === "speed") ok = stats.turns <= w.target;
  else if (w.kind === "blood") ok = stats.hpEndRatio <= w.target / 100;
  else if (w.kind === "fist") ok = !stats.itemsUsed;
  else if (w.kind === "range") ok = (stats.endDist ?? 0) >= w.target;
  else if (w.kind === "guard") ok = (stats.endBlock ?? 0) >= w.target;
  else if (w.kind === "school") ok = Boolean(stats.schoolPure);
  else if (w.kind === "swap") ok = (stats.swaps ?? 0) >= w.target;
  const won = Boolean(stats.won && ok);
  const payout = won ? Math.round(w.stake * w.odds) : 0;
  const text = won
    ? `「${wagerLabel(w.kind, run.school)}」中了 +${payout} 彩金`
    : `「${wagerLabel(w.kind, run.school)}」飞了（注额已扣）`;
  return { won, payout, text };
}

export function wagerConfirmLine(
  kind: WagerKind,
  stake: number,
  odds: number,
  school?: WeaponId,
): string {
  const payout = Math.round(stake * odds);
  return `确认：${wagerLabel(kind, school)} · 押 ${stake} · 赔 ×${odds}。打赢且达成则 +${payout}，飞了或输馆注额不退。`;
}

export function wagerLabel(kind: WagerKind, school?: WeaponId): string {
  const labels: Record<WagerKind, string> = {
    chain: "连破注",
    eye: "破眼注",
    clean: "完璧注",
    speed: "速胜注",
    blood: "血战注",
    fist: "赤手注",
    range: "不贴身",
    guard: "堆挡注",
    school: school ? `本系${WEAPON_NAME[school]}` : "本系",
    swap: "换人注",
  };
  return labels[kind];
}

/** 馆结算：注已托管。赢馆+中注 → 返还赔率并发底彩；赢馆飞注 → 只发底彩；输馆有注 → 底彩不发并抽 10%。 */
export function settleHallPot(
  run: GauntletRun,
  stats: WagerStats,
  fightWon: boolean,
): { pot: number; texts: string[] } {
  const texts: string[] = [];
  let pot = run.pot;
  if (run.wager) {
    const r = resolveWager(run, stats);
    pot += r.payout;
    texts.push(r.text);
  }
  if (fightWon) {
    const mul = run.pendingBasePotMul ?? 1;
    const base = Math.max(0, Math.round(basePot(run.stage) * mul));
    pot += base;
    texts.push(`底彩 +${base}`);
  } else if (run.wager) {
    const bled = bleedRemainingPot(pot);
    if (bled.tax > 0) {
      pot = bled.pot;
      texts.push(`出血 -${bled.tax}`);
    }
  }
  return { pot: Math.max(0, pot), texts };
}

