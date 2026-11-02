import type { Battle, Intent, StanceId, StanceSeg } from "./types";

/** 段内容 → 架势。伤 / 进 / 退 / 守 / 蓄 / 诡。 */
export const INTENT_STANCE: Record<Intent["kind"], StanceId> = {
  strike: "hurt",
  barrage: "hurt",
  bleedcut: "hurt",
  pestle: "hurt",
  shatter: "hurt",
  advance: "press",
  charge: "press",
  lunge: "press",
  retreat: "back",
  guard: "hold",
  mend: "hold",
  breathe: "hold",
  windup: "wind",
  pull: "sly",
  trap: "sly",
  seal: "sly",
  dust: "sly",
  shackle: "sly",
  dodge: "sly",
  endure: "sly",
  swap: "sly",
  counter: "sly",
  sig: "sly",
  stake: "sly",
};

export const STANCE_LABEL: Record<StanceId, string> = {
  hurt: "伤势",
  press: "进势",
  back: "退势",
  hold: "守势",
  wind: "蓄势",
  sly: "诡势",
};

export function stanceOf(intent: Intent): StanceId {
  return INTENT_STANCE[intent.kind];
}

export function intentKey(intent: Intent): string {
  if (intent.kind === "sig") return `sig:${intent.id}`;
  return intent.kind;
}

export function buildStanceBoard(intents: Intent[], feint: boolean[] = []): StanceSeg[] {
  return intents.map((intent, i) => ({
    stance: stanceOf(intent),
    key: intentKey(intent),
    feint: feint[i] === true,
  }));
}

export interface StanceCount {
  stance: StanceId;
  n: number;
}

export function aggregateStances(board: StanceSeg[]): StanceCount[] {
  const order: StanceId[] = ["hurt", "press", "back", "hold", "wind", "sly"];
  const n = new Map<StanceId, number>();
  for (const seg of board) n.set(seg.stance, (n.get(seg.stance) ?? 0) + 1);
  return order.filter((s) => (n.get(s) ?? 0) > 0).map((stance) => ({ stance, n: n.get(stance)! }));
}

/** 「伤势 ×2 · 进势 ×1」 */
export function stanceLine(counts: StanceCount[]): string {
  return counts.map((c) => `${STANCE_LABEL[c.stance]} ×${c.n}`).join(" · ");
}

export function publishStance(b: Battle): void {
  const intents = b.intents?.length ? b.intents : [b.intent];
  b.stanceBoard = buildStanceBoard(intents, b.feintMask);
  b.stanceCursor = 0;
  b.stanceRevealN = 0;
}

export function segmentFeint(b: Battle): boolean {
  return b.stanceBoard?.[b.stanceCursor ?? 0]?.feint === true;
}

/** 段开始：亮招解锁到这一段；虚招打还原标记；真招进读懂。 */
export function noteSegmentRead(b: Battle): void {
  const seg = b.stanceBoard?.[b.stanceCursor ?? 0];
  if (!seg) return;
  b.stanceRevealN = Math.min(b.stanceBoard?.length ?? 0, (b.stanceCursor ?? 0) + 1);
  if (seg.feint) {
    b.feintShown = true;
    return;
  }
  if (!b.readMoves?.includes(seg.key)) b.readMoves = [...(b.readMoves ?? []), seg.key];
}
