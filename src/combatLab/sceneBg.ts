import { climbPlace, loadoutBgFor, wagerBgFor } from "./climbPlaces";
import type { GauntletPath } from "./gauntletPaths";

export const SCENE_BG_CAP = 1;

export type CombatPathId = "shaolin" | "bandit" | "court";

/** 少林：山门昼 → 罗汉暮 → 方丈夜。禅院大图作补位（不用营地那两张安静图）。 */
export const COMBAT_BG_SHAOLIN = [
  "art/scenes/scene-fight-shaolin-gate.png",
  "art/scenes/scene-fight-shaolin-luohan.png",
  "art/scenes/scene-fight-shaolin-abbot.png",
  "art/scenes/scene-shaolin.png",
  "art/scenes/scene-teahouse.png",
  "art/scenes/scene-place-sl-zangjing.png",
  "art/scenes/scene-place-sl-damo.png",
  "art/scenes/scene-quiet-shaolin.png",
  "art/scenes/scene-quiet-tea.png",
  "art/scenes/scene-quiet-harbor.png",
];

/** 江湖：野路昼 → 河岸伏 → 寨堂夜。 */
export const COMBAT_BG_BANDIT = [
  "art/scenes/scene-fight-jianghu-road.png",
  "art/scenes/scene-fight-jianghu-ambush.png",
  "art/scenes/scene-fight-jianghu-hall.png",
  "art/scenes/scene-inn-yard.png",
  "art/scenes/scene-night-market.png",
  "art/scenes/scene-place-jh-yangzhou.png",
  "art/scenes/scene-place-jh-jinling.png",
  "art/scenes/scene-quiet-inn.png",
  "art/scenes/scene-quiet-lane.png",
  "art/scenes/scene-moon-bridge.png",
];

/** 朝廷：衙门昼 → 内廷廊 → 殿前夜。 */
export const COMBAT_BG_COURT = [
  "art/scenes/scene-fight-court-gate.png",
  "art/scenes/scene-fight-court-inner.png",
  "art/scenes/scene-fight-court-night.png",
  "art/scenes/scene-yamen.png",
  "art/scenes/scene-home-gate.png",
  "art/scenes/scene-place-court-tianjie.png",
  "art/scenes/scene-place-court-jinming.png",
  "art/scenes/scene-quiet-yamen.png",
  "art/scenes/scene-quiet-yard.png",
  "art/scenes/scene-quiet-harbor.png",
];

/** 旧入口：无路线时的并集，优先不再用码头一张打天下。 */
export const COMBAT_BG_POOL = [...new Set([...COMBAT_BG_SHAOLIN, ...COMBAT_BG_BANDIT, ...COMBAT_BG_COURT])];

/** 馆序越后越偏向该线的暮/夜图。 */
export function combatBgPool(path: CombatPathId, stage: number): string[] {
  const files =
    path === "shaolin" ? COMBAT_BG_SHAOLIN : path === "court" ? COMBAT_BG_COURT : COMBAT_BG_BANDIT;
  const i = Math.max(0, Math.min(files.length - 1, stage - 1));
  const head = files[i]!;
  return [head, ...files.filter((f) => f !== head)];
}

export const HOME_BG = "art/scenes/scene-quiet-gate.png";

export const CAMP_BG_BANDIT = [
  "art/scenes/scene-quiet-inn.png",
  "art/scenes/scene-quiet-lane.png",
];

export const CAMP_BG_SHAOLIN = [
  "art/scenes/scene-quiet-shaolin.png",
  "art/scenes/scene-quiet-tea.png",
];

export const CAMP_BG_COURT = [
  "art/scenes/scene-quiet-yamen.png",
  "art/scenes/scene-quiet-yard.png",
];

export const PLACE_BG_EXTRA = [
  "art/scenes/scene-wager-jianghu.png",
  "art/scenes/scene-wager-shaolin.png",
  "art/scenes/scene-wager-court.png",
  "art/scenes/scene-loadout-jianghu.png",
  "art/scenes/scene-loadout-shaolin.png",
  "art/scenes/scene-loadout-court.png",
  "art/scenes/scene-place-jh-yangzhou.png",
  "art/scenes/scene-place-jh-jinling.png",
  "art/scenes/scene-place-sl-zangjing.png",
  "art/scenes/scene-place-sl-damo.png",
  "art/scenes/scene-place-court-tianjie.png",
  "art/scenes/scene-place-court-jinming.png",
  "art/scenes/scene-moon-bridge.png",
  "art/scenes/scene-fork.png",
  "art/scenes/scene-quiet-harbor.png",
];

export const EVENT_BG_POOL = ["art/scenes/scene-quiet-fork.png"];

export const LOBBY_BG_POOL = ["art/scenes/scene-quiet-gate.png"];

/** 无局时（选线/选系/庄家）也要有宽景，不跟局内计数抢图。 */
export function staticOverlayBg(screen: OverlayScreenKind): string {
  if (screen === "path") return "/art/scenes/scene-quiet-fork.png";
  if (screen === "pick") return "/art/scenes/scene-quiet-gate.png";
  if (screen === "banker") return "/art/scenes/scene-quiet-inn.png";
  if (screen === "opening") return "/art/scenes/scene-quiet-lane.png";
  return `/${HOME_BG}`;
}

/** 全部非战斗大场景（禁止再用 hut / overview 小图）。 */
export const OVERLAY_BG_POOL = [
  ...new Set([
    HOME_BG,
    ...CAMP_BG_BANDIT,
    ...CAMP_BG_SHAOLIN,
    ...CAMP_BG_COURT,
    ...EVENT_BG_POOL,
    ...LOBBY_BG_POOL,
    ...PLACE_BG_EXTRA,
  ]),
];

export type OverlayScreenKind =
  | "intro"
  | "path"
  | "pick"
  | "banker"
  | "reward"
  | "result"
  | "companion"
  | "wager"
  | "lifeline"
  | "loadout"
  | "rewardTarget"
  | "market"
  | "graduate"
  | "event"
  | "settle"
  | "finale"
  | "scar"
  | "opening";

export function campPlaceName(path: string, stage = 1): { title: string; pager: string } {
  const p = climbPlace((path === "shaolin" || path === "court" ? path : "bandit") as GauntletPath, stage);
  return { title: p.rest, pager: `${p.name} · 歇脚 · 选完免费奖励后再点继续` };
}

export function eventBgPool(kind?: string): string[] {
  if (kind === "inn") return ["art/scenes/scene-quiet-inn.png", ...EVENT_BG_POOL];
  if (kind === "fork") return ["art/scenes/scene-fork.png", "art/scenes/scene-quiet-fork.png"];
  if (kind === "ambush") return ["art/scenes/scene-fight-jianghu-ambush.png", ...EVENT_BG_POOL];
  if (kind === "stall") return ["art/scenes/scene-quiet-lane.png", ...EVENT_BG_POOL];
  if (kind === "market") return ["art/scenes/scene-quiet-lane.png", ...EVENT_BG_POOL];
  if (kind === "companion") return ["art/scenes/scene-quiet-tea.png", ...EVENT_BG_POOL];
  if (kind === "finaleHint") return ["art/scenes/scene-moon-bridge.png", ...EVENT_BG_POOL];
  if (kind === "story" || kind === "travel" || kind === "market") return ["art/scenes/scene-quiet-lane.png", ...EVENT_BG_POOL];
  return EVENT_BG_POOL;
}

export function overlayPoolFor(
  screen: OverlayScreenKind,
  path: string = "bandit",
  eventKind?: string,
  stage = 1,
): string[] {
  const line = (path === "shaolin" || path === "court" ? path : "bandit") as GauntletPath;
  const place = climbPlace(line, stage);
  let preferred: string[];
  if (screen === "wager") {
    preferred = [wagerBgFor(line), place.restBg];
  } else if (screen === "loadout" || screen === "rewardTarget") {
    preferred = [loadoutBgFor(line), place.restBg];
  } else if (screen === "reward" || screen === "settle") {
    preferred = [place.restBg, ...(line === "shaolin" ? CAMP_BG_SHAOLIN : line === "court" ? CAMP_BG_COURT : CAMP_BG_BANDIT)];
  } else if (screen === "event" || screen === "companion" || screen === "finale" || screen === "scar" || screen === "opening") {
    preferred = eventBgPool(eventKind ?? (screen === "opening" ? "story" : undefined));
  } else {
    preferred = LOBBY_BG_POOL;
  }
  const rest = OVERLAY_BG_POOL.filter((f) => !preferred.includes(f));
  return [...preferred, ...rest];
}

export type SceneBgState = {
  bgUses?: Record<string, number>;
  bgAssign?: Record<string, string>;
};

function publicUrl(file: string): string {
  return file.startsWith("/") ? file : `/${file}`;
}

function pickFile(_uses: Record<string, number>, preferred: string[], fallback: string[]): string {
  const canon = preferred[0];
  if (canon) return canon;
  for (const file of fallback) {
    if ((_uses[file] ?? 0) < SCENE_BG_CAP) return file;
  }
  return fallback[0] ?? COMBAT_BG_POOL[0]!;
}

/** 同一 scene key 固定一张图；每张文件整局只用一次。 */
export function assignSceneBg(
  state: SceneBgState,
  key: string,
  preferred: string[],
  fallback: string[] = [],
): { url: string; file: string; bgUses: Record<string, number>; bgAssign: Record<string, string> } {
  const bgAssign = { ...(state.bgAssign ?? {}) };
  const bgUses = { ...(state.bgUses ?? {}) };
  const existing = bgAssign[key];
  if (existing) {
    return { url: publicUrl(existing), file: existing, bgUses, bgAssign };
  }
  const file = pickFile(bgUses, preferred, fallback);
  bgAssign[key] = file;
  bgUses[file] = (bgUses[file] ?? 0) + 1;
  return { url: publicUrl(file), file, bgUses, bgAssign };
}

export function takeSceneBg<T extends SceneBgState>(
  run: T,
  key: string,
  preferred: string[],
  fallback: string[] = [],
): { url: string; run: T } {
  const next = assignSceneBg(run, key, preferred, fallback);
  return {
    url: next.url,
    run: { ...run, bgUses: next.bgUses, bgAssign: next.bgAssign },
  };
}
