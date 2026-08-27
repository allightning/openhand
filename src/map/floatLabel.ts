/** 浮名锚点与重叠仲裁（屏幕坐标，单位 px）。 */

export type LabelPri = 0 | 1 | 2 | 3 | 4;

export const LABEL_PRI = {
  you: 0 as LabelPri,
  quest: 1 as LabelPri,
  landmark: 2 as LabelPri,
  shop: 3 as LabelPri,
  npc: 4 as LabelPri,
};

export interface LabelJob {
  id: string;
  pri: LabelPri;
  ax: number;
  ay: number;
  text: string;
  cls: string;
  hidden?: boolean;
  scale?: number;
}

const TILE = 40;

/** CSS 实测：局内建模相对格子的顶边/中心，禁止另写感觉偏移。 */
export function spriteAnchor(
  kind: "npc" | "house" | "landmark-arch" | "tile",
  x: number,
  y: number,
  tile = TILE,
): { ax: number; ay: number } {
  const left = x * tile;
  const top = y * tile;
  if (kind === "npc") {
    return { ax: left + tile / 2, ay: top - 8 };
  }
  if (kind === "house") {
    return { ax: left - 8 + 52 / 2, ay: top - 22 };
  }
  if (kind === "landmark-arch") {
    return { ax: left - 12 + 64 / 2, ay: top - 36 };
  }
  return { ax: left + tile / 2, ay: top };
}

export function labelBox(job: LabelJob): { l: number; t: number; r: number; b: number } {
  const base = job.cls.includes("landmark") ? 15 : 11;
  const font = base * (job.scale ?? 1);
  const w = Math.max(12, job.text.length * font * 0.92);
  const h = font * 1.25;
  return { l: job.ax - w / 2, t: job.ay - h, r: job.ax + w / 2, b: job.ay };
}

function overlaps(a: { l: number; t: number; r: number; b: number }, b: { l: number; t: number; r: number; b: number }): boolean {
  return a.l < b.r + 1 && a.r + 1 > b.l && a.t < b.b + 1 && a.b + 1 > b.t;
}

/** 低 pri 先占位；相交则隐藏后声明者。玩家永不隐藏。 */
export function arbitrateLabels(jobs: LabelJob[]): LabelJob[] {
  const out = jobs.map((j) => ({ ...j, hidden: false }));
  const kept: LabelJob[] = [];
  const ranked = out
    .map((j, i) => ({ j, i }))
    .sort((a, b) => a.j.pri - b.j.pri || a.i - b.i);
  for (const { j } of ranked) {
    if (j.pri === LABEL_PRI.you) {
      kept.push(j);
      continue;
    }
    const box = labelBox(j);
    const hit = kept.some((k) => !k.hidden && overlaps(box, labelBox(k)));
    if (hit) j.hidden = true;
    kept.push(j);
  }
  return out;
}

export const QUEST_TALKERS = new Set(["judge", "caseclerk", "luoBailiff"]);

export function renderLabelHtml(job: LabelJob): string {
  if (!job.text) return "";
  const hide = job.hidden ? " display:none;" : "";
  const cls = job.cls ? ` ${job.cls}` : "";
  const base = job.cls.includes("landmark") ? 15 : 11;
  const scale = job.scale ?? 1;
  const fs = scale !== 1 ? ` font-size:${Math.round(base * scale)}px;` : "";
  return `<div class="float-label${cls}" data-pri="${job.pri}" style="left:${job.ax}px;top:${job.ay}px;${fs}${hide}">${job.text}</div>`;
}
