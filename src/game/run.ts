import { CHAPTERS, HEARTS, STARTER_DECK, heartHp } from "./content";
import { HERO_START, SAPPER_DECK, SEER_DECK } from "./hero";
import type { CardId, ChapterId, HeartId, HeroId, Run, SaveFile, TechniqueId } from "./types";
import { starterGear } from "./weapons";

const SAVE_KEY = "openhand-mingshou";

export function starterDeck(hero: HeroId = "rail"): CardId[] {
  if (hero === "seer") return [...SEER_DECK];
  if (hero === "sapper") return [...SAPPER_DECK];
  return [...STARTER_DECK];
}

export function makeRun(heart: HeartId, hero: HeroId = "rail"): Run {
  const hp =
    hero === "sapper" ? heartHp(heart) + 4 : hero === "seer" ? Math.max(22, heartHp(heart) - 4) : heartHp(heart);
  const scene = HERO_START[hero];
  const school = hero === "seer" ? "sword" : hero === "sapper" ? "staff" : "palm";
  const weapon = starterGear(school);
  const livesMax = heart === "breath" ? 4 : 3;
  const silver = heart === "empty" ? 28 : 12;
  const bag =
    heart === "empty"
      ? [
          { id: "pillFan", n: 2 },
          { id: "copper", n: 1 },
          { id: "salve", n: 1 },
        ]
      : [];
  const flags = heart === "iron" ? ["heartAttack"] : [];
  return {
    hp,
    hpMax: hp,
    heart,
    deck: starterDeck(hero),
    techniques: [],
    chapter: "dock",
    scene,
    beaten: [],
    chests: [],
    flags,
    items: [],
    visited: [scene],
    seenTiles: {},
    sealProgress: {},
    party: [hero],
    active: hero,
    companionHp: { [hero]: hp },
    scrolls: [],
    talks: {},
    mateDecks: {},
    falls: 0,
    lives: livesMax,
    livesMax,
    hero,
    silver,
    bag,
    craftUntil: 0,
    craftPending: null,
    weapon,
    weapons: [weapon],
    teaBet: null,
    bountyAt: 0,
  };
}

export function replaceFirst(deck: CardId[], from: CardId, to: CardId): CardId[] {
  const next = [...deck];
  const i = next.indexOf(from);
  if (i >= 0) next[i] = to;
  return next;
}

export function addCard(deck: CardId[], id: CardId): CardId[] {
  return [...deck, id];
}

export function emptySave(): SaveFile {
  return { seen: [], cleared: 0, run: null, scene: null, at: null, tongbao: 0, stash: [] };
}

export function loadSave(): SaveFile {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw) as SaveFile;
    const at =
      parsed.at && typeof parsed.at.x === "number" && typeof parsed.at.y === "number"
        ? { x: parsed.at.x, y: parsed.at.y }
        : null;
    return {
      seen: Array.isArray(parsed.seen) ? parsed.seen : [],
      cleared: typeof parsed.cleared === "number" ? parsed.cleared : 0,
      run: parsed.run && typeof parsed.run === "object" ? (parsed.run as Run) : null,
      scene: typeof parsed.scene === "string" ? parsed.scene : null,
      at,
      tongbao: typeof parsed.tongbao === "number" ? parsed.tongbao : 0,
      stash: Array.isArray(parsed.stash) ? parsed.stash : [],
    };
  } catch {
    return emptySave();
  }
}

export function writeSave(save: SaveFile): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function stashRun(
  save: SaveFile,
  run: Run,
  scene: string,
  at?: { x: number; y: number } | null,
): SaveFile {
  return {
    ...save,
    run: JSON.parse(JSON.stringify(run)) as Run,
    scene,
    at: at ? { x: at.x, y: at.y } : save.at ?? null,
  };
}

export function clearRun(save: SaveFile): SaveFile {
  return { ...save, run: null, scene: null, at: null };
}

export function hasStashedRun(save: SaveFile): boolean {
  return Boolean(save.run && save.run.hero && save.scene);
}

export function markSeen(save: SaveFile, id: Run["beaten"][number]): SaveFile {
  if (save.seen.includes(id)) return save;
  return { ...save, seen: [...save.seen, id] };
}

export function markCleared(save: SaveFile, chapter: ChapterId): SaveFile {
  const n = CHAPTERS[chapter].index;
  return { ...save, cleared: Math.max(save.cleared, n) };
}

export function heartUnlocked(save: SaveFile, id: HeartId): boolean {
  if (id === "breath") return save.cleared >= 1;
  return true;
}

export function availableHearts(save: SaveFile): HeartId[] {
  return (Object.keys(HEARTS) as HeartId[]).filter((id) => heartUnlocked(save, id));
}

export function takeChest(run: Run, scene: string): Run {
  if (run.chests.includes(scene)) return run;
  return { ...run, chests: [...run.chests, scene] };
}

export function addItem(run: Run, id: string): Run {
  if (run.items.includes(id)) return run;
  return { ...run, items: [...run.items, id] };
}

export function removeItem(run: Run, id: string): Run {
  if (!run.items.includes(id)) return run;
  return { ...run, items: run.items.filter((x) => x !== id) };
}

export function addFlag(run: Run, id: string): Run {
  if (run.flags.includes(id)) return run;
  return { ...run, flags: [...run.flags, id] };
}

export function noteScene(run: Run, scene: string): Run {
  if (run.visited.includes(scene)) return run;
  return { ...run, visited: [...run.visited, scene] };
}

export function rememberSeals(run: Run, scene: string, progress: string[]): Run {
  return { ...run, sealProgress: { ...run.sealProgress, [scene]: [...progress] } };
}

export function noteBeaten(run: Run, id: Run["beaten"][number]): Run {
  if (run.beaten.includes(id)) return run;
  return { ...run, beaten: [...run.beaten, id] };
}

export function addTechnique(run: Run, id: TechniqueId): Run {
  if (run.techniques.includes(id)) return run;
  return { ...run, techniques: [...run.techniques, id] };
}
