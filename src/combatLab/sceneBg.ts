export const SCENE_BG_CAP = 2;

export type CombatPathId = "shaolin" | "bandit" | "court";

/** 少林：山门昼 → 罗汉暮 → 方丈夜。禅院大图作补位（不用营地那两张安静图）。 */
export const COMBAT_BG_SHAOLIN = [
  "art/scenes/scene-fight-shaolin-gate.png",
  "art/scenes/scene-fight-shaolin-luohan.png",
  "art/scenes/scene-fight-shaolin-abbot.png",
  "art/scenes/scene-shaolin.png",
  "art/scenes/scene-teahouse.png",
];

/** 江湖：野路昼 → 河岸伏 → 寨堂夜。 */
export const COMBAT_BG_BANDIT = [
  "art/scenes/scene-fight-jianghu-road.png",
  "art/scenes/scene-fight-jianghu-ambush.png",
  "art/scenes/scene-fight-jianghu-hall.png",
  "art/scenes/scene-inn-yard.png",
  "art/scenes/scene-night-market.png",
];

/** 朝廷：衙门昼 → 内廷廊 → 殿前夜。 */
export const COMBAT_BG_COURT = [
  "art/scenes/scene-fight-court-gate.png",
  "art/scenes/scene-fight-court-inner.png",
  "art/scenes/scene-fight-court-night.png",
  "art/scenes/scene-yamen.png",
  "art/scenes/scene-home-gate.png",
];

/** 旧入口：无路线时的并集，优先不再用码头一张打天下。 */
export const COMBAT_BG_POOL = [...new Set([...COMBAT_BG_SHAOLIN, ...COMBAT_BG_BANDIT, ...COMBAT_BG_COURT])];

/** 馆序越后越偏向该线的暮/夜图。 */
export function combatBgPool(path: CombatPathId, stage: number): string[] {
  const files =
    path === "shaolin" ? COMBAT_BG_SHAOLIN : path === "court" ? COMBAT_BG_COURT : COMBAT_BG_BANDIT;
  const [early, mid, late, quietA, quietB] = files;
  if (stage >= 7) return [late, quietB, mid, quietA, early];
  if (stage >= 5) return [mid, late, quietB, quietA, early];
  if (stage >= 3) return [mid, early, quietA, late, quietB];
  return [early, quietA, mid, quietB, late];
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

export const EVENT_BG_POOL = ["art/scenes/scene-quiet-fork.png"];

export const LOBBY_BG_POOL = ["art/scenes/scene-quiet-gate.png"];

/** 无局时（选线/选系/庄家）也要有宽景，不跟局内计数抢图。 */
export function staticOverlayBg(screen: OverlayScreenKind): string {
  if (screen === "path") return "/art/scenes/scene-quiet-fork.png";
  if (screen === "pick") return "/art/scenes/scene-quiet-gate.png";
  if (screen === "banker") return "/art/scenes/scene-quiet-inn.png";
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
  | "finale"
  | "scar";

export function campPlaceName(path: string): { title: string; pager: string } {
  if (path === "shaolin") return { title: "禅院歇脚", pager: "禅院营地 · 选完免费奖励后再点继续" };
  if (path === "court") return { title: "官驿歇脚", pager: "官驿营地 · 选完免费奖励后再点继续" };
  return { title: "酒楼歇脚", pager: "酒楼营地 · 选完免费奖励后再点继续" };
}

export function overlayPoolFor(screen: OverlayScreenKind, path = "bandit"): string[] {
  let preferred: string[];
  if (screen === "reward" || screen === "loadout" || screen === "wager" || screen === "rewardTarget") {
    preferred = path === "shaolin" ? CAMP_BG_SHAOLIN : path === "court" ? CAMP_BG_COURT : CAMP_BG_BANDIT;
  } else if (screen === "event" || screen === "companion" || screen === "finale" || screen === "scar") {
    preferred = EVENT_BG_POOL;
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

function pickFile(uses: Record<string, number>, preferred: string[], fallback: string[]): string {
  for (const file of [...preferred, ...fallback]) {
    if ((uses[file] ?? 0) < SCENE_BG_CAP) return file;
  }
  return preferred[0] ?? fallback[0] ?? COMBAT_BG_POOL[0]!;
}

/** 同一 scene key 固定一张图；全局每张文件最多占用两个 key。 */
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
