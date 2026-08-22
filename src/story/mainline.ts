/**
 * 主线三职业分线骨架（北宋徽宗朝·权臣谋逆）
 */
export type HeroPath = "blade" | "sword" | "healer";

export interface PathBeat {
  chapter: number;
  title: string;
  motive: string;
  exclusive: string;
}

export const PATH_BEATS: Record<HeroPath, PathBeat[]> = {
  blade: [
    { chapter: 1, title: "刀客·入六扇", motive: "替兄洗冤", exclusive: "缉拿花石纲酷吏" },
    { chapter: 3, title: "刀客·夜审", motive: "证据链", exclusive: "开封府暗档" },
    { chapter: 5, title: "刀客·抗旨", motive: "忠与义", exclusive: "拦花石纲船" },
    { chapter: 7, title: "汇合·汴京", motive: "阻谋逆", exclusive: "破门禁军眼线" },
  ],
  sword: [
    { chapter: 1, title: "剑客·出山", motive: "门派危机", exclusive: "华山密信" },
    { chapter: 3, title: "剑客·论剑", motive: "正邪", exclusive: "少林问剑" },
    { chapter: 5, title: "剑客·护镖", motive: "人情债", exclusive: "护送流民过雁门" },
    { chapter: 7, title: "汇合·汴京", motive: "阻谋逆", exclusive: "斩刺客于御街" },
  ],
  healer: [
    { chapter: 1, title: "医仙·悬壶", motive: "救疫", exclusive: "开封病坊" },
    { chapter: 3, title: "医仙·识毒", motive: "朝堂毒局", exclusive: "辨蔡京宴毒" },
    { chapter: 5, title: "医仙·救叛", motive: "人命高于旗号", exclusive: "医治方腊溃卒" },
    { chapter: 7, title: "汇合·汴京", motive: "阻谋逆", exclusive: "解禁军迷药" },
  ],
};

export const SHARED_FINALE = {
  chapter: 7,
  boss: "权臣禁军帅",
  need: ["blade破门", "sword斩刺", "healer解毒"] as const,
  endingsPerPath: 3,
  sharedVariants: 3,
};

export function assertPathDistinct(): { ok: boolean; notes: string[] } {
  const notes: string[] = [];
  const motives = new Set(Object.values(PATH_BEATS).map((b) => b[0]!.motive));
  if (motives.size < 3) notes.push("开局动机同质化");
  const exclusives = Object.values(PATH_BEATS).flatMap((b) => b.map((x) => x.exclusive));
  if (new Set(exclusives).size < exclusives.length) notes.push("专属任务撞车");
  return { ok: notes.length === 0, notes };
}
