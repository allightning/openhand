import { ENEMIES } from "../game/content";
import { labEnemy, labMate } from "../game/labContent";
import { sumMindArtBonuses } from "../game/mindArts";
import { initBattleMateWeapons } from "../game/equippedWeapon";
import { setLabMode, getLabTuning } from "../game/labTuning";
import { makeRun } from "../game/run";
import { applyLabFightScale, battlePace, makeBattle, syncBattleGear } from "../game/sim";
import { MATES, cardSchool } from "../game/party";
import { starterGear } from "../game/weapons";
import type { Battle, CardId, CompanionId, EnemyId, Run, Unit } from "../game/types";
import { initLabAuditFromPreset } from "./labAudit";
import { clonePreset, fieldHero, normalizePreset, primaryWeapon } from "./draft";
import { expandDeckRecipe } from "./rules";
import { pruneDeckForWeapon } from "./cardUi";
import type { LabPreset } from "./types";
import { battleEquippedSchool } from "../game/equippedWeapon";

function distributeMateDecks(p: LabPreset, expanded: CardId[]): Partial<Record<CompanionId, CardId[]>> {
  const mateDecks: Partial<Record<CompanionId, CardId[]>> = {};
  for (const id of p.party) {
    const gear = p.mateWeapons[id] ?? starterGear(MATES[id].weapon);
    mateDecks[id] = pruneDeckForWeapon(expanded, gear);
  }
  return mateDecks;
}

function fieldSchoolDeckPct(p: LabPreset, expanded: CardId[]): number {
  const school = battleEquippedSchool(
    { labMateWeapons: p.mateWeapons, active: p.fieldMate, party: p.party } as Battle,
    p.fieldMate,
  );
  let schoolN = 0;
  for (const id of expanded) {
    const cs = cardSchool(id);
    if (cs === school) schoolN += 1;
  }
  return expanded.length ? Math.round((schoolN / expanded.length) * 100) : 0;
}

function extraUnit(id: EnemyId, hpScale: number): Unit {
  const def = labEnemy(id);
  const hp = Math.max(8, Math.round(def.hp * hpScale));
  return { id: def.id, name: def.name, title: def.title, hp, maxHp: hp, pos: def.pos };
}

export function runFromPreset(preset: LabPreset): Run {
  const p = normalizePreset(preset);
  const hero = fieldHero(p.fieldMate);
  const run = makeRun("breath", hero);
  const mult = getLabTuning().deckMultiplier;
  const expanded = expandDeckRecipe(p.deckRecipe, mult);
  run.deck = [];
  run.mateDecks = distributeMateDecks(p, expanded);
  run.weapon = primaryWeapon(p);
  run.weapons = Object.values(p.mateWeapons).filter(Boolean) as string[];
  run.techniques = [...(p.mateTechs[p.fieldMate] ?? [])];
  run.party = [...p.party];
  run.active = p.fieldMate;
  run.hero = hero;
  run.hp = p.hp ?? run.hp;
  run.hpMax = p.hpMax ?? run.hpMax;
  run.companionHp = {};
  for (const id of p.party) {
    const mindHp = sumMindArtBonuses(p.mateMinds?.[id] ?? []).hpMax;
    run.companionHp[id] = id === p.fieldMate ? run.hp : labMate(id).hp + mindHp;
  }
  run.silver = 999;
  run.bag = [];
  run.falls = 0;
  run.lives = 99;
  return run;
}

export function startLabBattle(preset: LabPreset, ordered = false, deckMultiplier?: number): Battle {
  setLabMode(true);
  const p = normalizePreset(preset);
  const run = runFromPreset(p);
  let b = makeBattle(p.enemyId, run, ordered, p.enemyId.startsWith("tutor"));
  if (p.extraFoeIds?.length) {
    const hpScale = b.enemy.maxHp / labEnemy(p.enemyId).hp;
    const extras = p.extraFoeIds.map((id) => extraUnit(id, hpScale));
    b = { ...b, foes: [...b.foes, ...extras] };
  }
  if (p.waveEnemyId) b = { ...b, gauntletWaveEnemy: p.waveEnemyId };
  if (p.labItems?.length) b = { ...b, labItems: p.labItems.slice(0, 2) };
  initBattleMateWeapons(b, p.mateWeapons);
  syncBattleGear(b, p.fieldMate);
  applyLabFightScale();
  let out: Battle = {
    ...b,
    labFreshSwap: false,
    labResonanceTurn: false,
    labMateTechs: p.mateTechs,
    labMateMinds: p.mateMinds,
    techniques: [...(p.mateTechs[p.fieldMate] ?? [])],
  };
  const fieldMind = sumMindArtBonuses(p.mateMinds?.[p.fieldMate] ?? []);
  if (fieldMind.energyMax > 0) {
    out = { ...out, energyMax: out.energyMax + fieldMind.energyMax, energy: Math.min(out.energy + fieldMind.energyMax, out.energyMax + fieldMind.energyMax) };
  }
  if (fieldMind.turnEnergy > 0) out = { ...out, energyRegen: out.energyRegen + fieldMind.turnEnergy };
  out = initLabAuditFromPreset(out, p);
  const mult = deckMultiplier ?? getLabTuning().deckMultiplier;
  const expanded = expandDeckRecipe(p.deckRecipe, mult);
  out.v2FieldSchoolDeckPct = fieldSchoolDeckPct(p, expanded);
  out.v2OpeningPaceBehind = battlePace(out) < out.foePace;
  return out;
}

export function endLabMode(): void {
  setLabMode(false);
}

export { clonePreset, normalizePreset, primaryWeapon };
