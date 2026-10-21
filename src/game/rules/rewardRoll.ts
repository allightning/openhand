import { CARDS, TECHNIQUES, gearById, nextGrade, ALL_MIND_ART_IDS, MIND_ARTS, mindArtFitsSchool, LAB_ITEM_LABEL, grantLabItem, breakCardUpgrade, isBreakAlign, shellRunContext, itemTip, mindTip, techniqueTip, grantCardToLoadout, ownedCardIds, replaceOwnedCard } from "./gauntletKit";
import { GauntletRewardKind, GauntletRewardOption, GauntletRun, GauntletTier } from "./gauntletModel";
import type { MindArtId } from "../mindArts";
import type { CardId, LabItemId, TechniqueId } from "../types";
import { gauntletFieldMate, gauntletPorts } from "./gauntletPorts";
import { grantMindToRun, grantTechToRun } from "./lifelineRules";
import { ALL_AID_ITEMS, allOwnedTechs, breakRewardCardPool, forgeGradeOk, itemPool, pickWeightedRewardCard, rewardFought, rewardGate, rewardTierForRun, techPool } from "./rewardRules";

function pickWeightedKind(rng: () => number, _tier: Exclude<GauntletTier, "extreme">, fought: number): GauntletRewardKind {
  const w = gauntletPorts().rewardWeights;
  const gate = rewardGate(fought);
  const forgeW = gate.forge ? w.forge : 0;
  const upgradeW = gate.upgrade ? w.upgrade : 0;
  const parts: Array<[GauntletRewardKind, number]> = [
    ["tech", w.tech],
    ["mind", w.mind],
    ["item", w.item],
    ["aid", w.aid],
    ["card", w.card ?? 0],
    ["forge", forgeW],
    ["upgrade", upgradeW],
  ];
  const total = parts.reduce((s, [, n]) => s + n, 0);
  let roll = rng() * Math.max(1, total);
  for (const [kind, n] of parts) {
    if (n <= 0) continue;
    if (roll < n) return kind;
    roll -= n;
  }
  return "card";
}

/** 淬刃：拆招必须 1→2→3；3–6 馆顶 2 档，7 馆后顶 3 档。经典封顶玄阶。 */
function forgeOption(run: GauntletRun): GauntletRewardOption | null {
  const cur = gearById(run.weaponId, shellRunContext());
  const nextId = nextGrade(run.weaponId, shellRunContext());
  const next = nextId ? gearById(nextId, shellRunContext()) : null;
  if (!cur || !next || !nextId) return null;
  if (!forgeGradeOk(run, next.grade)) return null;
  const dmgGain = (next.damage ?? 0) - (cur.damage ?? 0);
  return {
    kind: "forge",
    id: nextId,
    title: `淬刃 · ${next.name}`,
    tip: `${cur.name} → ${next.name}：每击 +${dmgGain} 伤，械效增强（悬停兵刃牌可看细则）。`,
  };
}

function upgradeOption(run: GauntletRun, usedFrom: Set<CardId>, rng: () => number): GauntletRewardOption | null {
  if (!rewardGate(rewardFought(run)).upgrade) return null;
  const seen = new Set<CardId>();
  const pool: CardId[] = [];
  for (const id of ownedCardIds(run)) {
    if (seen.has(id) || usedFrom.has(id)) continue;
    seen.add(id);
    const to = breakCardUpgrade(id);
    if (to && !ownedCardIds(run).has(to)) pool.push(id);
  }
  const from = pickOne(pool, rng);
  if (!from) return null;
  const to = breakCardUpgrade(from);
  if (!to) return null;
  usedFrom.add(from);
  return {
    kind: "upgrade",
    id: from,
    title: `换页 · ${CARDS[from].name} → ${CARDS[to].name}`,
    tip: `${CARDS[from].text} → ${CARDS[to].text}（进步/撤步永不换成 ±2）`,
  };
}

function pickOne<T>(pool: T[], rng: () => number): T | null {
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)] ?? null;
}

function topUpRewardOffers(
  run: GauntletRun,
  rng: () => number,
  out: GauntletRewardOption[],
  picks: number,
  fought: number,
  usedMind: Set<MindArtId>,
  usedCards: Set<CardId>,
  usedUpgradeFrom: Set<CardId>,
): void {
  while (out.length < picks) {
    const pool = ALL_MIND_ART_IDS.filter((id) => !usedMind.has(id) && mindArtFitsSchool(id, run.school));
    const id = pickOne(pool, rng);
    if (!id) break;
    usedMind.add(id);
    out.push({ kind: "mind", id, title: MIND_ARTS[id].name, tip: mindTip(id) });
  }
  if (fought <= 2 && !out.some((o) => o.kind === "card")) {
    const pool = breakRewardCardPool(run).filter((id) => !usedCards.has(id));
    const id = pickWeightedRewardCard(pool, [...ownedCardIds(run), ...usedCards], rng);
    if (id) {
      if (out.length >= picks) out.pop();
      out.unshift({ kind: "card", id, title: CARDS[id].name, tip: CARDS[id].text });
    }
  }
  if (rewardGate(fought).upgrade) {
    const uo = upgradeOption(run, usedUpgradeFrom, rng);
    if (uo && !out.some((o) => o.kind === "upgrade")) {
      if (out.length >= picks) out.pop();
      out.unshift(uo);
    }
  }
  if (rewardGate(fought).forge) {
    const fo = forgeOption(run);
    if (fo && !out.some((o) => o.kind === "forge")) {
      if (out.length >= picks) out.pop();
      out.unshift(fo);
    }
  }
}

export function rollGauntletRewards(run: GauntletRun, rng: () => number): GauntletRewardOption[] {
  const tier = rewardTierForRun(run);
  const picks = 4;
  const out: GauntletRewardOption[] = [];
  const usedTech = new Set(allOwnedTechs(run));
  const usedMind = new Set(Object.values(run.mateMindArts).flat());
  const usedItems = new Set(run.items);
  const usedCards = new Set<CardId>();
  const usedUpgradeFrom = new Set<CardId>();
  const itemCap = isBreakAlign() ? 2 : 3;
  const fought = Math.max(1, run.stage - 1);
  let guard = 0;
  while (out.length < picks && guard < 40) {
    guard += 1;
    const kind = pickWeightedKind(rng, tier, fought);
    if (kind === "tech") {
      const pool = techPool([...usedTech], run.school);
      const id = pickOne(pool, rng);
      if (!id) continue;
      usedTech.add(id);
      out.push({ kind, id, title: TECHNIQUES[id].name, tip: techniqueTip(id) });
    } else if (kind === "mind") {
      const pool = ALL_MIND_ART_IDS.filter((id) => !usedMind.has(id) && mindArtFitsSchool(id, run.school));
      const id = pickOne(pool, rng);
      if (!id) continue;
      usedMind.add(id);
      out.push({ kind, id, title: MIND_ARTS[id].name, tip: mindTip(id) });
    } else if (kind === "card") {
      const pool = breakRewardCardPool(run).filter((id) => !usedCards.has(id));
      const id = pickWeightedRewardCard(pool, [...ownedCardIds(run), ...usedCards], rng);
      if (!id) continue;
      usedCards.add(id);
      out.push({ kind: "card", id, title: CARDS[id].name, tip: CARDS[id].text });
    } else if (kind === "item" || kind === "aid") {
      if (run.items.length >= itemCap) continue;
      const aidPool = kind === "aid" ? ALL_AID_ITEMS : itemPool([...usedItems, ...run.items]);
      const pool = aidPool.filter((id) => !usedItems.has(id) && !run.items.includes(id));
      const id = pickOne(pool.length ? pool : itemPool([...usedItems, ...run.items]), rng);
      if (!id) continue;
      usedItems.add(id);
      out.push({
        kind: "item",
        id,
        title: LAB_ITEM_LABEL[id] ?? id,
        tip: itemTip(id),
      });
    } else if (kind === "forge") {
      if (out.some((o) => o.kind === "forge")) continue;
      const fo = forgeOption(run);
      if (!fo) continue;
      out.push(fo);
    } else if (kind === "upgrade") {
      const uo = upgradeOption(run, usedUpgradeFrom, rng);
      if (!uo) continue;
      out.push(uo);
    }
  }
  topUpRewardOffers(run, rng, out, picks, fought, usedMind, usedCards, usedUpgradeFrom);
  return out.slice(0, picks);
}

/** 拆招：4/7 馆六抽四选一；经典：路径池三选一（保底同系+异系）。 */

export function rollSuperRewards(run: GauntletRun): GauntletRewardOption[] {
  const godId = `${run.school}-a-5`;
  const god = gearById(godId, shellRunContext());
  const cur = gearById(run.weaponId, shellRunContext());
  const out: GauntletRewardOption[] = [];
  if (god && cur && cur.grade < 5) {
    out.push({
      kind: "forge",
      id: "god-main",
      title: `神兵 · 主路 · ${god.name}`,
      tip: `直跃神阶并点亮主神通「${god.godSkill ?? "主械"}」。副路神通需另获。`,
    });
    out.push({
      kind: "forge",
      id: "god-sub",
      title: `神兵 · 副路 · ${god.name}`,
      tip: `直跃神阶并点亮副神通。主路神通需另获。可在配装切换已点亮的神通。`,
    });
  }
  // §31.12 助战重做：超级奖励给「助战符·一对」（随机两系各一枚；强度在小道具与同行之间）
  out.push({
    kind: "aidPair",
    id: "aidPair",
    title: "助战符 · 一对",
    tip: "随机两系客座好手各一张：上场放本系绝活、实体占格一回合。拳吸仇挡刀 / 刀破绽 / 剑裂创 / 枪挑退 / 棍眩晕 / 钩缴械。",
  });
  out.push({
    kind: "elixir",
    id: "xianyao",
    title: "仙药",
    tip: "气血上限 +12（并回 12），劲力上限 +4。",
  });
  return out;
}

export function applySuperRewardRule(run: GauntletRun, opt: GauntletRewardOption, rng: () => number): GauntletRun {
  if (opt.kind === "forge") {
    const god = gearById(`${run.school}-a-5`, shellRunContext());
    if (!god || god.grade < 5) return run;
    const mate = gauntletFieldMate(run.school);
    const nextWeapons = { ...(run.mateWeapons ?? {}), [mate]: god.id };
    if (opt.id === "god-sub") {
      const using = run.godMain ? (run.godUsing ?? "main") : "sub";
      const wid = `${run.school}-${using === "sub" ? "b" : "a"}-5`;
      return { ...run, weaponId: wid, mateWeapons: { ...nextWeapons, [mate]: wid }, godSub: true, godUsing: using };
    }
    const using = run.godSub ? (run.godUsing ?? "main") : "main";
    const wid = `${run.school}-${using === "sub" ? "b" : "a"}-5`;
    return { ...run, weaponId: wid, mateWeapons: { ...nextWeapons, [mate]: wid }, godMain: true, godUsing: using };
  }
  if (opt.kind === "aidPair") {
    const pool = [...ALL_AID_ITEMS];
    const roll = rng;
    const first = pool.splice(Math.floor(roll() * pool.length), 1)[0]!;
    const second = pool.splice(Math.floor(roll() * pool.length), 1)[0]!;
    let next: GauntletRun = { ...run };
    const a = grantLabItem(next.items, next.itemCharges, first, undefined, 6);
    if (a) next = { ...next, items: a.items, itemCharges: a.charges };
    const b = grantLabItem(next.items, next.itemCharges, second, undefined, 6);
    if (b) next = { ...next, items: b.items, itemCharges: b.charges };
    return next;
  }
  if (opt.kind === "elixir") {
    return {
      ...run,
      hpMax: run.hpMax + 12,
      hp: run.hp + 12,
      bonusEnergyMax: (run.bonusEnergyMax ?? 0) + 4,
    };
  }
  const g = grantLabItem(run.items, run.itemCharges, opt.id as LabItemId, undefined, 6);
  if (!g) return run;
  return { ...run, items: g.items, itemCharges: g.charges };
}

export function applyGauntletReward(run: GauntletRun, opt: GauntletRewardOption): GauntletRun {
  if (opt.kind === "forge") {
    const nextId = nextGrade(run.weaponId, shellRunContext());
    if (!nextId || opt.id !== nextId) return run;
    return {
      ...run,
      weaponId: nextId,
      mateWeapons: { ...(run.mateWeapons ?? {}), [gauntletFieldMate(run.school)]: nextId },
    };
  }
  if (opt.kind === "upgrade") {
    const from = opt.id as CardId;
    const to = breakCardUpgrade(from);
    if (!to) return run;
    if (!ownedCardIds(run).has(from)) return run;
    return replaceOwnedCard(run, from, to);
  }
  if (opt.kind === "card") {
    return grantCardToLoadout(run, opt.id as CardId);
  }
  if (opt.kind === "tech") {
    const id = opt.id as TechniqueId;
    if (!isBreakAlign() && !opt.targetMate) {
      return { ...run, stashTechs: [...(run.stashTechs ?? []), id] };
    }
    const mate = opt.targetMate ?? gauntletFieldMate(run.school);
    return grantTechToRun(run, id, mate);
  }
  if (opt.kind === "mind") {
    const id = opt.id as MindArtId;
    if (!isBreakAlign() && !opt.targetMate) {
      return { ...run, stashMinds: [...(run.stashMinds ?? []), id] };
    }
    const mate = opt.targetMate ?? gauntletFieldMate(run.school);
    return grantMindToRun(run, id, mate);
  }
  const g = grantLabItem(run.items, run.itemCharges, opt.id as LabItemId, undefined, isBreakAlign() ? 2 : 3);
  if (!g) return run;
  return { ...run, items: g.items, itemCharges: g.charges };
}

