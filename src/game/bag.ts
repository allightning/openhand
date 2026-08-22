import type { Battle, Run, SaveFile } from "./types";

/** 行囊货色 — 与任务键物（brand/deed…）分开。 */
export type BagGoodsId =
  | "herb"
  | "hide"
  | "sulfur"
  | "charcoal"
  | "nitre"
  | "salve"
  | "dart"
  | "powder"
  | "tonic"
  | "greens"
  | "dish"
  | "copper"
  | "silk"
  | "pillFan"
  | "pillLiangHp"
  | "pillLiangQi"
  | "pillXuanHp"
  | "pillXuanQi"
  | "pillXuanPace"
  | "herbXuan"
  | "cinnabar"
  | "forgeJing"
  | "forgeXuan"
  | "forgeShen";

export interface BagStack {
  id: BagGoodsId;
  n: number;
}

export const BAG_SLOTS = 12;
/** 局外窖藏可带进下一局的总件数上限。 */
export const STASH_BRING_MAX = 6;

export const BAG_NAME: Record<BagGoodsId, string> = {
  herb: "药草",
  hide: "兽皮",
  sulfur: "硫磺",
  charcoal: "木炭",
  nitre: "硝石",
  salve: "伤药",
  dart: "细镖",
  powder: "火折子",
  tonic: "提气散",
  greens: "青菜",
  dish: "炒青菜",
  copper: "赤铜屑",
  silk: "碎绸",
  pillFan: "凡药",
  pillLiangHp: "良药·培元",
  pillLiangQi: "良药·纳息",
  pillXuanHp: "玄药·铁骨",
  pillXuanQi: "玄药·长息",
  pillXuanPace: "玄药·抢先",
  herbXuan: "灵草",
  cinnabar: "丹砂",
  forgeJing: "精材",
  forgeXuan: "玄铁",
  forgeShen: "神髓",
};

export const BAG_TIP: Record<BagGoodsId, string> = {
  herb: "可炼伤药，也可当掉。",
  hide: "当铺认皮。",
  sulfur: "炼火折子用。",
  charcoal: "炼火折子用。",
  nitre: "炼火折子用。",
  salve: "局外或局内略补气血。",
  dart: "局内暗器。伤轻，抢一息。",
  powder: "局内火折。推一步，伤也轻。",
  tonic: "局内提一息气。一局一次。",
  greens: "灶台可炒。",
  dish: "当铺爱收热菜。",
  copper: "锻刃材料。遇通宝才开得动。",
  silk: "细货，当价尚可。",
  pillFan: "凡药：只回血，不改根基。",
  pillLiangHp: "良药：选一人服，气血上限 +2。",
  pillLiangQi: "良药：选一人服，劲力上限 +1。",
  pillXuanHp: "玄药：选一人服，气血上限 +6。须炼成。",
  pillXuanQi: "玄药：选一人服，劲力上限 +2。须炼成。",
  pillXuanPace: "玄药：选一人服，先机 +1。须炼成。",
  herbXuan: "炼玄药的草。中后期多见。",
  cinnabar: "炼玄药的砂。",
  forgeJing: "锻精级兵器。",
  forgeXuan: "锻玄级兵器。",
  forgeShen: "锻神兵。极稀。",
};

/** 当铺卖价（银两 / 件）。 */
export const PAWN_PRICE: Record<BagGoodsId, number> = {
  herb: 2,
  hide: 6,
  sulfur: 3,
  charcoal: 1,
  nitre: 3,
  salve: 5,
  dart: 4,
  powder: 6,
  tonic: 5,
  greens: 1,
  dish: 4,
  copper: 8,
  silk: 7,
  pillFan: 4,
  pillLiangHp: 14,
  pillLiangQi: 14,
  pillXuanHp: 40,
  pillXuanQi: 40,
  pillXuanPace: 45,
  herbXuan: 8,
  cinnabar: 10,
  forgeJing: 12,
  forgeXuan: 22,
  forgeShen: 48,
};

/** 药铺买价。 */
export const CLINIC_BUY: Partial<Record<BagGoodsId, number>> = {
  salve: 6,
  herb: 3,
  tonic: 8,
  greens: 2,
  sulfur: 3,
};

export type CraftRecipeId = "salve" | "powder" | "dish" | "dart" | "pillXuanHp" | "pillXuanQi" | "pillXuanPace";

export interface CraftRecipe {
  id: CraftRecipeId;
  name: string;
  /** 冷却毫秒 — 勾住玩家，又不拖太久。 */
  ms: number;
  need: Partial<Record<BagGoodsId, number>>;
  out: BagGoodsId;
  outN: number;
  /** mid/late only recipes */
  stage?: "mid" | "late";
}

export const CRAFT_RECIPES: Record<CraftRecipeId, CraftRecipe> = {
  salve: {
    id: "salve",
    name: "炼伤药",
    ms: 90_000,
    need: { herb: 2 },
    out: "salve",
    outN: 1,
  },
  powder: {
    id: "powder",
    name: "配火折",
    ms: 120_000,
    need: { sulfur: 1, charcoal: 1, nitre: 1 },
    out: "powder",
    outN: 1,
  },
  dish: {
    id: "dish",
    name: "炒青菜",
    ms: 75_000,
    need: { greens: 2 },
    out: "dish",
    outN: 1,
  },
  dart: {
    id: "dart",
    name: "磨细镖",
    ms: 100_000,
    need: { copper: 1 },
    out: "dart",
    outN: 2,
  },
  pillXuanHp: {
    id: "pillXuanHp",
    name: "炼玄药·铁骨",
    ms: 180_000,
    need: { herbXuan: 2, cinnabar: 1, herb: 2 },
    out: "pillXuanHp",
    outN: 1,
    stage: "mid",
  },
  pillXuanQi: {
    id: "pillXuanQi",
    name: "炼玄药·长息",
    ms: 180_000,
    need: { herbXuan: 2, cinnabar: 1, nitre: 1 },
    out: "pillXuanQi",
    outN: 1,
    stage: "mid",
  },
  pillXuanPace: {
    id: "pillXuanPace",
    name: "炼玄药·抢先",
    ms: 210_000,
    need: { herbXuan: 3, cinnabar: 2 },
    out: "pillXuanPace",
    outN: 1,
    stage: "late",
  },
};

export function bagCount(run: Run, id: BagGoodsId): number {
  return (run.bag ?? []).find((s) => s.id === id)?.n ?? 0;
}

export function bagUsedSlots(run: Run): number {
  return (run.bag ?? []).filter((s) => s.n > 0).length;
}

export function addBag(run: Run, id: BagGoodsId, n = 1): Run {
  if (n <= 0) return run;
  const bag = [...(run.bag ?? [])];
  const i = bag.findIndex((s) => s.id === id);
  if (i >= 0) {
    bag[i] = { id, n: bag[i].n + n };
    return { ...run, bag };
  }
  if (bag.length >= BAG_SLOTS) return run;
  bag.push({ id, n });
  return { ...run, bag };
}

export function takeBag(run: Run, id: BagGoodsId, n = 1): Run | null {
  const have = bagCount(run, id);
  if (have < n) return null;
  const bag = (run.bag ?? [])
    .map((s) => (s.id === id ? { ...s, n: s.n - n } : s))
    .filter((s) => s.n > 0);
  return { ...run, bag };
}

export function canCraft(run: Run, id: CraftRecipeId, now = Date.now()): string | null {
  const r = CRAFT_RECIPES[id];
  if ((run.craftUntil ?? 0) > now) {
    const sec = Math.ceil(((run.craftUntil ?? 0) - now) / 1000);
    return `炉火未冷。约 ${sec} 息后再来。`;
  }
  for (const [k, need] of Object.entries(r.need) as [BagGoodsId, number][]) {
    if (bagCount(run, k) < need) return `缺 ${BAG_NAME[k]} ×${need}。`;
  }
  if (bagUsedSlots(run) >= BAG_SLOTS && bagCount(run, r.out) <= 0) return "行囊满了。";
  return null;
}

export function startCraft(run: Run, id: CraftRecipeId, now = Date.now()): { ok: true; run: Run } | { ok: false; reason: string } {
  const block = canCraft(run, id, now);
  if (block) return { ok: false, reason: block };
  const r = CRAFT_RECIPES[id];
  let next = run;
  for (const [k, need] of Object.entries(r.need) as [BagGoodsId, number][]) {
    const taken = takeBag(next, k, need);
    if (!taken) return { ok: false, reason: `缺 ${BAG_NAME[k]}。` };
    next = taken;
  }
  return {
    ok: true,
    run: {
      ...next,
      craftUntil: now + r.ms,
      craftPending: { id: r.out, n: r.outN },
    },
  };
}

export function collectCraft(run: Run, now = Date.now()): { run: Run; gained: string | null } {
  if (!run.craftPending) return { run, gained: null };
  if ((run.craftUntil ?? 0) > now) return { run, gained: null };
  const { id, n } = run.craftPending;
  const gid = id as BagGoodsId;
  const next = addBag({ ...run, craftPending: null, craftUntil: 0 }, gid, n);
  return { run: next, gained: `${BAG_NAME[gid]} ×${n}` };
}

export function sellBag(run: Run, id: BagGoodsId, n = 1): { ok: true; run: Run; silver: number } | { ok: false; reason: string } {
  const taken = takeBag(run, id, n);
  if (!taken) return { ok: false, reason: `没有 ${BAG_NAME[id]}。` };
  const pay = (PAWN_PRICE[id] ?? 1) * n;
  return { ok: true, run: { ...taken, silver: (taken.silver ?? 0) + pay }, silver: pay };
}

export function buyClinic(run: Run, id: BagGoodsId): { ok: true; run: Run } | { ok: false; reason: string } {
  const price = CLINIC_BUY[id];
  if (price == null) return { ok: false, reason: "不卖这个。" };
  if ((run.silver ?? 0) < price) return { ok: false, reason: `银不够 ${price} 两。` };
  if (bagUsedSlots(run) >= BAG_SLOTS && bagCount(run, id) <= 0) return { ok: false, reason: "行囊满了。" };
  return { ok: true, run: addBag({ ...run, silver: (run.silver ?? 0) - price }, id, 1) };
}

/** 局内可用货。数值故意压低：锦上添花，不能靠它通关。 */
export const BATTLE_GOODS: BagGoodsId[] = ["salve", "dart", "powder", "tonic"];

export function useBattleGood(
  b: Battle,
  run: Run,
  id: BagGoodsId,
): { ok: true; battle: Battle; run: Run; log: string } | { ok: false; reason: string } {
  if ((b.bagUsed ?? 0) >= 1) return { ok: false, reason: "这一局暗器只亮一次。" };
  if ((b.youNoBag ?? 0) > 0) return { ok: false, reason: "封囊：这一息用不出药与暗器。" };
  if (b.phase !== "player") return { ok: false, reason: "轮到对方了。" };
  if (!BATTLE_GOODS.includes(id)) return { ok: false, reason: "这东西局内用不上。" };
  const taken = takeBag(run, id, 1);
  if (!taken) return { ok: false, reason: `没有 ${BAG_NAME[id]}。` };

  let battle: Battle = { ...b, bagUsed: (b.bagUsed ?? 0) + 1 };
  let log = "";

  if (id === "salve") {
    const heal = 4;
    const hp = Math.min(battle.player.maxHp, battle.player.hp + heal);
    battle = {
      ...battle,
      player: { ...battle.player, hp },
      log: [...battle.log, `伤药。回 ${heal}。`],
      journal: [...battle.journal, { side: "you", text: `伤药 · 回 ${heal}` }],
    };
    log = `伤药。气血 +${heal}。`;
  } else if (id === "dart") {
    const dmg = 5;
    const hp = Math.max(0, battle.enemy.hp - dmg);
    battle = {
      ...battle,
      enemy: { ...battle.enemy, hp },
      foes: battle.foes.map((f, i) => (i === 0 ? { ...f, hp } : f)),
      log: [...battle.log, `细镖。伤 ${dmg}。`],
      journal: [...battle.journal, { side: "you", text: `细镖 · ${dmg}` }],
    };
    log = `细镖。对手 -${dmg}。`;
  } else if (id === "powder") {
    const dmg = 3;
    const pos = Math.min(6, battle.enemy.pos + 1);
    const hp = Math.max(0, battle.enemy.hp - dmg);
    battle = {
      ...battle,
      enemy: { ...battle.enemy, hp, pos },
      foes: battle.foes.map((f, i) => (i === 0 ? { ...f, hp, pos } : f)),
      log: [...battle.log, `火折。推一步，伤 ${dmg}。`],
      journal: [...battle.journal, { side: "you", text: `火折 · 推 · ${dmg}` }],
    };
    log = `火折子。推一步，伤 ${dmg}。`;
  } else if (id === "tonic") {
    battle = {
      ...battle,
      energy: Math.min(battle.energyMax, battle.energy + 1),
      log: [...battle.log, "提气散。气 +1。"],
      journal: [...battle.journal, { side: "you", text: "提气散 · 气 +1" }],
    };
    log = "提气散。气 +1。";
  }

  return { ok: true, battle, run: taken, log };
}

/** 地图外用伤药。 */
export function useSalveMap(run: Run): { ok: true; run: Run } | { ok: false; reason: string } {
  if (run.hp >= run.hpMax) return { ok: false, reason: "气血已满。" };
  const taken = takeBag(run, "salve", 1);
  if (!taken) return { ok: false, reason: "没有伤药。" };
  return { ok: true, run: { ...taken, hp: Math.min(taken.hpMax, taken.hp + 8) } };
}

export function tongbaoOf(save: SaveFile): number {
  return Math.max(0, save.tongbao ?? 0);
}

export function addTongbao(save: SaveFile, n: number): SaveFile {
  if (n <= 0) return save;
  return { ...save, tongbao: tongbaoOf(save) + n };
}

export function spendTongbao(save: SaveFile, n: number): SaveFile | null {
  if (tongbaoOf(save) < n) return null;
  return { ...save, tongbao: tongbaoOf(save) - n };
}

/** 通宝兑换顶级残页（稀少）。 */
export const TONGBAO_TECH_COST = 2;
export const TONGBAO_PASS_COST = 1;
export const TONGBAO_FORGE_COST = 1;

export function stashAdd(save: SaveFile, id: BagGoodsId, n = 1): SaveFile {
  const stash = [...(save.stash ?? [])];
  const i = stash.findIndex((s) => s.id === id);
  if (i >= 0) stash[i] = { id, n: stash[i].n + n };
  else stash.push({ id, n });
  return { ...save, stash };
}

/** 新局开局：从窖藏带入有限件数。 */
export function bringStashIntoRun(run: Run, save: SaveFile): { run: Run; save: SaveFile } {
  const stash = [...(save.stash ?? [])];
  if (!stash.length) return { run, save };
  let left = STASH_BRING_MAX;
  let next = run;
  const remain: BagStack[] = [];
  for (const s of stash) {
    if (left <= 0) {
      remain.push(s as BagStack);
      continue;
    }
    const take = Math.min(s.n, left);
    next = addBag(next, s.id as BagGoodsId, take);
    left -= take;
    if (s.n > take) remain.push({ id: s.id as BagGoodsId, n: s.n - take });
  }
  return { run: next, save: { ...save, stash: remain } };
}

/** 稀少通宝来源：打赢特定精英且尚无标记。 */
export function maybeTongbaoDrop(save: SaveFile, run: Run, enemyId: string): { save: SaveFile; run: Run; dropped: boolean } {
  if (tongbaoOf(save) >= 5) return { save, run, dropped: false };
  const rare = [
    "warden",
    "bandit",
    "hillBandit",
    "stakeboss",
    "nametaker",
    "riverThug",
    "mob_canal_03",
    "mob_canal_05",
    "mob_escortBand_02",
    "mob_court_01",
    "mob_rebel_01",
  ];
  const rarePrefix = enemyId.startsWith("mob_canal_") || enemyId.startsWith("mob_escortBand_") || enemyId.startsWith("mob_court_");
  if (!rare.includes(enemyId) && !rarePrefix) return { save, run, dropped: false };
  const flag = `tongbaoDrop-${enemyId}`;
  if (run.flags.includes(flag)) return { save, run, dropped: false };
  const chance = rarePrefix ? 0.22 : 0.32;
  if (Math.random() > chance) return { save, run: { ...run, flags: [...run.flags, flag] }, dropped: false };
  return {
    save: addTongbao(save, 1),
    run: { ...run, flags: [...run.flags, flag] },
    dropped: true,
  };
}

/** 通宝重掷残谱：奖励屏可选消耗。 */
export const TONGBAO_REROLL_COST = 1;

export function tongbaoRerollAffordable(save: SaveFile): boolean {
  return tongbaoOf(save) >= TONGBAO_REROLL_COST;
}

export function craftRemainSec(run: Run, now = Date.now()): number {
  const until = run.craftUntil ?? 0;
  if (until <= now) return 0;
  return Math.ceil((until - now) / 1000);
}
