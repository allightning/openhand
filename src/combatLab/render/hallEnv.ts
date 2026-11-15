import { envTagForHall } from "../../game/content/envSchedule";
import { ENV_TAG_LABEL } from "../gauntletPaths";
import { escapeHtml } from "../setupUi";

const HALL_ENV_LINE: Partial<Record<string, string>> = {
  burn: "这一馆石台上有格子在冒烟。",
  nowall: "这一馆格后没有墙。",
  gap_end: "这一馆石台缺了末端一格。跨得过去，站不住。",
};

export function hallEnvHtml(stage: number, cls: string): string {
  const tag = envTagForHall(stage);
  const line = tag ? HALL_ENV_LINE[tag] : "";
  if (!tag || !line) return "";
  const label = ENV_TAG_LABEL[tag];
  return `<p class="${cls}" data-hall-env="${tag}" data-hall-env-source="field">${escapeHtml(label)}。${escapeHtml(line)}</p>`;
}
