/**
 * 训练馆：每课 ①脚本引导 ②自由训练（不锁牌）。
 */
import type { Battle, CardId, CompanionId, Intent, WeaponId } from "../game/types";
import { MATES } from "../game/party";
import { emptyV2Turn } from "../game/labV2";
import { GAUNTLET_SCHOOL_LOADOUT } from "./gauntlet";
import { breakStarterDeck } from "./rogueRoster";
import {
  DEMO_FIST_MATE,
  DEMO_STARTER_DECK,
  createBreakDemoRun,
  demoEnemyId,
  demoEyeIdx,
  demoIntents,
  demoLessons,
  demoScriptedHandIds,
  demoStageTitle,
  ensureFreePlayDeck,
  freePlayRecipe,
  lockDemoAfterFoeTurn,
  syncBreakDemoBattle,
  type BreakDemoRun,
  type DemoFoeDebrief,
  type DemoLessonStep,
  type DemoStage,
} from "./breakDemo";
import type { LabPreset } from "./types";
import { normalizePreset } from "./draft";
import {
  CAMPAIGN_STAGES,
  campaignStage,
  createBreakCampaignRun,
  createQiFightFromStage,
  syncCampaignLesson,
  type BreakCampaignRun,
  type CampaignStageId,
} from "./breakCampaign";
import { createQiFight, STARTER_DECK, type QiFight } from "./qiCommit";

export type HallCabinet = "break" | "weapon" | "camp";
export type HallBout = 1 | 2;

export type HallCourseId =
  | "hard"
  | "charges"
  | "graze"
  | "rift"
  | "eye"
  | "chase"
  | "chain"
  | "reach"
  | "saber"
  | "palm"
  | "sword"
  | "spear"
  | "staff"
  | "hook"
  | "swap"
  | "camp-shop"
  | "camp-loadout"
  | "camp-wager";

export interface HallCourse {
  id: HallCourseId;
  cabinet: HallCabinet;
  title: string;
  blurb: string;
  school: WeaponId;
  /** 复用新手关教案 / 意图 */
  demoStage?: DemoStage;
  companion?: CompanionId;
  lessons?: DemoLessonStep[];
  intents?: Intent[];
  eyeIdx?: number;
  drillCoach: string;
  drillHp: number;
  /** 自我修行：气力承诺关。兵器/营地柜不要设。 */
  qiStage?: CampaignStageId;
}

function play(ids: CardId[], banner: string, coach: string): DemoLessonStep {
  return { kind: "play", allowCardIds: ids, teachBanner: banner, coach };
}
function end(banner: string, coach: string, foeDebrief?: DemoFoeDebrief): DemoLessonStep {
  return { kind: "end", allowCardIds: [], teachBanner: banner, coach, foeDebrief };
}
export function swapStep(banner: string, coach: string): DemoLessonStep {
  return { kind: "swap", allowCardIds: [], teachBanner: banner, coach };
}

const SCHOOL_FINISHER: Record<WeaponId, { id: CardId; name: string }> = {
  saber: { id: "cut", name: "斩" },
  palm: { id: "strike", name: "劈掌" },
  sword: { id: "pierce", name: "刺" },
  spear: { id: "thrust", name: "突" },
  staff: { id: "bleedcut", name: "刀创" },
  hook: { id: "hookDisarm", name: "摘兵钩" },
};

const SCHOOL_RANGE: Record<WeaponId, number> = { saber: 2, palm: 1, sword: 2, spear: 3, staff: 3, hook: 2 };

function schoolGuide(school: WeaponId): DemoLessonStep[] {
  const fin = SCHOOL_FINISHER[school];
  const range = SCHOOL_RANGE[school];
  const move: CardId = school === "palm" ? "backpalm" : "retreat";
  const moveName = school === "palm" ? "退步掌" : "撤步";
  return [
    play([move], "离开红格", `你踩在红格上。打「${moveName}」走出去，攒 1 点破招。`),
    end("收势硬拆", "点「收势」：人在红格外、有破招 = 硬拆。这一招作废，你得拆势。", {
      title: "拆势在下一刀",
      body: "拆势挂在攻击牌上。走进兵刃圈打出，穿他的架，打真伤。",
    }),
    play(["advance"], "上前", `打「进步」走进攻击距离。这系兵刃打 ${range} 格，够不着打空。`),
    play([fin.id], "打出拆势", `打「${fin.name}」。拆势在这一击兑现成真伤。`),
    end("收势结束", "点「收势」。他按条再出手。你回满劲，再摸牌。"),
  ];
}

const REACH_LESSONS: DemoLessonStep[] = [
  play(["advance"], "走近", "兵刃有圈：刀 2 格、拳 1 格、枪棍 3 格。他够不着你——打「进步」走进刀距。"),
  play(["cut"], "打到", "进圈了。打「斩」。记住：够不着是打空，不是拆。"),
  end("收势结束", "点「收势」。"),
];

export const HALL_COURSES: HallCourse[] = [
  { id: "hard", cabinet: "break", title: "拆·点", blurb: "气力承诺。刺用拆·点。硬拆还 1 气。", school: "saber", qiStage: "R1", drillCoach: "拆·点点刺再收势。克错白扣气。", drillHp: 12 },
  { id: "charges", cabinet: "break", title: "连拆返气", blurb: "净花 1 拆一段。先拆还气，再拆下一段。", school: "saber", qiStage: "R2", drillCoach: "拆费 2 还 1。两段都硬拆。", drillHp: 12 },
  { id: "graze", cabinet: "break", title: "出红格", blurb: "离开红格来招打空，算躲。攻牌断蓄。", school: "saber", qiStage: "R3", drillCoach: "撤步离开红格，攻牌点蓄力。", drillHp: 16 },
  { id: "rift", cabinet: "break", title: "墨痕", blurb: "硬拆留格。他再打这格自动破。", school: "saber", qiStage: "R4", drillCoach: "第一拍硬拆留墨，第二拍收势白赚。", drillHp: 12 },
  { id: "eye", cabinet: "break", title: "起手式", blurb: "后段半隐。刀平=刺。信起手或盯梢。", school: "saber", qiStage: "R5", drillCoach: "刀尖平指是刺。拆·点点后段。", drillHp: 12 },
  { id: "chase", cabinet: "break", title: "过·存气", blurb: "点过存 1 气。打空算躲。", school: "saber", qiStage: "R6", drillCoach: "第一拍过。第二拍拆刺并断蓄。", drillHp: 16 },
  { id: "chain", cabinet: "break", title: "闪", blurb: "闪须站红格。打空是躲，不是闪牌。", school: "saber", qiStage: "R7", drillCoach: "退步·闪点刺段。架会擦到，算打。", drillHp: 12 },
  { id: "reach", cabinet: "break", title: "分格", blurb: "先拆留墨，再走进另一格闪。", school: "saber", qiStage: "R8", drillCoach: "第一拍拆刺。第二拍进步，闪扫。", drillHp: 16 },
  { id: "saber", cabinet: "weapon", title: "刀", blurb: "拆势打出：贴身叠裂创。", school: "saber", lessons: schoolGuide("saber"), drillCoach: "刀距 2。拆完打出拆势。贴脸 10 伤叠裂创，距 2 打 4。", drillHp: 22 },
  { id: "palm", cabinet: "weapon", title: "拳", blurb: "拆势打出：击退。", school: "palm", lessons: schoolGuide("palm"), drillCoach: "拳距 1，贴身才打得到。拆势那一掌击退他。", drillHp: 22 },
  { id: "sword", cabinet: "weapon", title: "剑", blurb: "拆势打出：叠破绽。", school: "sword", lessons: schoolGuide("sword"), drillCoach: "剑距 2。拆势那一刺叠破绽，后面每层 +4 伤。", drillHp: 22 },
  { id: "spear", cabinet: "weapon", title: "枪", blurb: "拆势打出：远打加力。", school: "spear", lessons: schoolGuide("spear"), drillCoach: "枪距 3。隔开打也有拆势。", drillHp: 22 },
  { id: "staff", cabinet: "weapon", title: "棍", blurb: "拆势打出：眩晕。", school: "staff", lessons: schoolGuide("staff"), drillCoach: "棍距 3。拆势可晕他 1 段。晕住的段打不出来。", drillHp: 22 },
  { id: "hook", cabinet: "weapon", title: "钩", blurb: "拆势打出：缴械。", school: "hook", lessons: schoolGuide("hook"), drillCoach: "钩距 2。拆势缴械：期间他攻击减半。", drillHp: 22 },
  { id: "swap", cabinet: "weapon", title: "换人", blurb: "换兵器上场。规则不变。", school: "saber", demoStage: 6, companion: DEMO_FIST_MATE, drillCoach: "换人耗 1 劲。拳距 1 格，贴身打。", drillHp: 24 },
  { id: "camp-shop", cabinet: "camp", title: "营地与黑市", blurb: "免费奖励。黑市刷新。多的牌半价卖。", school: "saber", lessons: REACH_LESSONS, intents: [{ kind: "strike", damage: 8 }], drillCoach: "不下注大概够买 1 件最便宜的。稳吃 ×2 能买 2 件。刷新越来越贵。多的牌半价卖。有的遭遇会跳过这一摊黑市。", drillHp: 22 },
  { id: "camp-loadout", cabinet: "camp", title: "配装", blurb: "每人牌包有上下限。不合规不能开打。", school: "saber", lessons: REACH_LESSONS, intents: [{ kind: "strike", damage: 8 }], drillCoach: "馆 1–2：牌 8～10，助战/道具各 1。3–7：10～12 / 各 2。8–10：12～15 / 各 3。仓库不占出战。", drillHp: 22 },
  { id: "camp-wager", cabinet: "camp", title: "读盘口", blurb: "开打扣注额。输了抽 10% 出血，底彩不发。", school: "saber", lessons: REACH_LESSONS, intents: [{ kind: "strike", damage: 8 }], drillCoach: "盘口跟你的兵刃和敌人走。枪少开「不贴身」。连破/破眼是高手加成，不是过关门槛。复活赛不能下注。", drillHp: 22 },
];

export function hallCourse(id: string): HallCourse | undefined {
  return HALL_COURSES.find((c) => c.id === id);
}

export function hallUsesQiCommit(courseId: string): boolean {
  return hallCourse(courseId)?.qiStage != null;
}

export function hallCampaignShell(run: HallRun): BreakCampaignRun | null {
  const id = hallCourse(run.courseId)?.qiStage;
  if (!id) return null;
  const idx = CAMPAIGN_STAGES.findIndex((s) => s.id === id);
  return syncCampaignLesson({
    ...createBreakCampaignRun(),
    stageIndex: idx,
    stageId: id,
    hp: run.hp,
    hpMax: run.hpMax,
  });
}

export function hallQiFight(run: HallRun): QiFight {
  const stage = campaignStage(hallCourse(run.courseId)!.qiStage!)!;
  if (run.bout === 1) return createQiFightFromStage(stage);
  return createQiFight({
    playerHp: stage.playerHp,
    enemyHp: stage.enemyHp,
    playerStance: stage.playerHp,
    enemyStance: stage.enemyHp,
    playerPos: stage.playerPos,
    enemyPos: stage.enemyPos,
    queue: stage.qiQueue,
    nextQueue: stage.qiNextQueue,
    qi: stage.energy,
    loopQueue: true,
    hideFrom: stage.hideFrom,
    allowFeint: stage.id === "R5" || stage.id === "RB",
    deck: [...STARTER_DECK],
  });
}

export function hallCoursesIn(cabinet: HallCabinet): HallCourse[] {
  return HALL_COURSES.filter((c) => c.cabinet === cabinet);
}

export interface HallRun {
  courseId: HallCourseId;
  bout: HallBout;
  lessonStep: number;
  guideCardIds: string[];
  guideCoach: string;
  teachBanner: string;
  companion: CompanionId | null;
  swapTaught: boolean;
  foeDebrief: DemoFoeDebrief | null;
  hp: number;
  hpMax: number;
  qiTick: BreakCampaignRun | null;
}

export function hallIsGuided(run: HallRun): boolean {
  return run.bout === 1;
}

/** 引导局教案已走完：进入自由打（同 bout 2 的解锁规则，但保留本课敌招/血量）。 */
export function hallLessonDone(run: HallRun): boolean {
  if (run.bout !== 1) return false;
  const list = lessonList(run);
  return list.length > 0 && run.lessonStep >= list.length;
}

function lessonList(run: HallRun): DemoLessonStep[] {
  if (run.bout === 2) return [];
  const c = hallCourse(run.courseId);
  if (!c) return [];
  if (c.lessons) return c.lessons;
  if (c.demoStage) return demoLessons(c.demoStage, run.companion, "break");
  return [];
}

export function currentHallLesson(run: HallRun): DemoLessonStep | null {
  const list = lessonList(run);
  if (!list.length) return null;
  return list[Math.min(run.lessonStep, list.length - 1)]!;
}

export function syncHallLesson(run: HallRun): HallRun {
  const qi = hallCourse(run.courseId)?.qiStage;
  if (qi) {
    const st = campaignStage(qi)!;
    return {
      ...run,
      guideCardIds: run.bout === 1 ? [...st.hand] : [],
      guideCoach: run.bout === 1 ? `${st.blurb} ${st.teach}` : (hallCourse(run.courseId)?.drillCoach ?? ""),
      teachBanner: run.bout === 1 ? `自我修行 · ${st.title}` : "训练 · 不锁牌",
    };
  }
  if (hallLessonDone(run)) {
    return {
      ...run,
      guideCardIds: [],
      guideCoach: "教案走完了——用你学会的破招自由出招，把他打下台。",
      teachBanner: "自由打",
    };
  }
  const step = currentHallLesson(run);
  if (!step) {
    return {
      ...run,
      guideCardIds: [],
      guideCoach: hallCourse(run.courseId)?.drillCoach ?? "自己拆、自己打。",
      teachBanner: run.bout === 2 ? "训练 · 不锁牌" : "",
    };
  }
  return {
    ...run,
    guideCardIds: step.allowCardIds,
    guideCoach: step.coach,
    teachBanner: step.teachBanner,
  };
}

export function createHallRun(courseId: HallCourseId, bout: HallBout): HallRun {
  const c = hallCourse(courseId);
  const run = syncHallLesson({
    courseId,
    bout,
    lessonStep: 0,
    guideCardIds: [],
    guideCoach: "",
    teachBanner: "",
    companion: c?.companion ?? (courseId === "swap" ? DEMO_FIST_MATE : null),
    swapTaught: bout === 2,
    foeDebrief: null,
    hp: 48,
    hpMax: 48,
    qiTick: null,
  });
  return { ...run, qiTick: hallCampaignShell(run) };
}

export function hallAllowsCard(run: HallRun, cardId: string): boolean {
  const qi = hallCourse(run.courseId)?.qiStage;
  if (qi) {
    if (run.bout === 2) return true;
    if (run.foeDebrief) return false;
    return (campaignStage(qi)?.hand as string[]).includes(cardId);
  }
  if (run.bout === 2) return run.foeDebrief == null;
  if (run.foeDebrief) return false;
  if (hallLessonDone(run)) return true;
  const step = currentHallLesson(run);
  if (!step || step.kind === "end" || step.kind === "swap") return false;
  return step.allowCardIds.includes(cardId as (typeof step.allowCardIds)[number]);
}

/** 收势常亮：任何教案步都能主动结束回合（软锁兜底）；仅敌方讲解弹窗期间挡。 */
export function hallAllowsEndTurn(run: HallRun): boolean {
  return run.foeDebrief == null;
}

export function hallAllowsSwap(run: HallRun, mateId: CompanionId): boolean {
  if (run.bout === 2) return true;
  if (run.foeDebrief) return false;
  if (hallLessonDone(run)) return true;
  const step = currentHallLesson(run);
  if (step?.kind !== "swap") return false;
  return mateId === (run.companion ?? DEMO_FIST_MATE);
}

export function afterHallPlayCard(run: HallRun, cardId: CardId): HallRun {
  if (run.bout === 2) return run;
  if (hallLessonDone(run)) return run;
  const step = currentHallLesson(run);
  if (!step || step.kind !== "play" || !step.allowCardIds.includes(cardId)) return run;
  return syncHallLesson({ ...run, lessonStep: run.lessonStep + 1 });
}

export function afterHallSwap(run: HallRun, mateId: CompanionId): HallRun {
  if (run.bout === 2) return { ...run, swapTaught: true };
  if (hallLessonDone(run)) return { ...run, swapTaught: true };
  if (mateId !== (run.companion ?? DEMO_FIST_MATE)) return run;
  const step = currentHallLesson(run);
  if (step?.kind !== "swap") return { ...run, swapTaught: true };
  return syncHallLesson({ ...run, lessonStep: run.lessonStep + 1, swapTaught: true });
}

export function afterHallEndTurn(run: HallRun): HallRun {
  if (run.bout === 2) return run;
  if (hallLessonDone(run)) return run;
  const step = currentHallLesson(run);
  // 换人步点收势 = 不换也能打（异系同行递招），跳过换人继续教案
  if (step?.kind === "swap") {
    return syncHallLesson({ ...run, lessonStep: run.lessonStep + 1 });
  }
  if (step?.kind !== "end") return run;
  return syncHallLesson({
    ...run,
    lessonStep: run.lessonStep + 1,
    foeDebrief: step.foeDebrief ?? null,
  });
}

export function dismissHallFoeDebrief(run: HallRun): HallRun {
  return { ...run, foeDebrief: null };
}

function asDemo(run: HallRun): BreakDemoRun | null {
  const c = hallCourse(run.courseId);
  if (!c?.demoStage || run.bout !== 1) return null;
  const fake = createBreakDemoRun();
  fake.stage = c.demoStage;
  fake.lessonStep = run.lessonStep;
  fake.companion = run.companion;
  fake.foeDebrief = run.foeDebrief;
  fake.swapTaught = run.swapTaught;
  fake.guideCardIds = run.guideCardIds as BreakDemoRun["guideCardIds"];
  fake.guideCoach = run.guideCoach;
  fake.teachBanner = run.teachBanner;
  fake.hp = run.hp;
  fake.hpMax = run.hpMax;
  return fake;
}

function setScriptedHand(b: Battle, ids: CardId[]): void {
  b.hand = ids.map((id, i) => ({ uid: `hall-hand-${i}-${id}`, defId: id }));
  b.drawPile = [];
  b.discardPile = [];
}

function hallScriptedHandIds(run: HallRun): CardId[] {
  const demo = asDemo(run);
  if (demo) return demoScriptedHandIds(demo);
  const step = currentHallLesson(run);
  if (!step) return [];
  if (step.kind === "play") return [...step.allowCardIds];
  if (step.kind === "end") return ["advance"];
  return [];
}

export function syncHallBattle(b: Battle, run: HallRun): Battle {
  if (run.bout === 2) return b;
  if (hallLessonDone(run)) {
    const c = hallCourse(run.courseId);
    const fallback =
      c && c.school === "saber" && c.demoStage ? [...DEMO_STARTER_DECK] : [...breakStarterDeck(c?.school ?? "saber")];
    ensureFreePlayDeck(b, freePlayRecipe(b, fallback), hallIntents(run), hallEyeIdx(run));
    return b;
  }
  const demo = asDemo(run);
  if (demo) {
    Object.assign(demo, { lessonStep: run.lessonStep, companion: run.companion, foeDebrief: run.foeDebrief, swapTaught: run.swapTaught });
    return syncBreakDemoBattle(b, demo);
  }
  const step = currentHallLesson(run);
  setScriptedHand(b, hallScriptedHandIds(run));
  b.energy = Math.max(b.energy, step?.kind === "play" ? 3 : 1);
  return b;
}

export function hallIntents(run: HallRun): Intent[] {
  const c = hallCourse(run.courseId);
  if (c?.intents) return c.intents;
  if (c?.demoStage) return demoIntents(c.demoStage);
  return [{ kind: "strike", damage: 9 }, { kind: "guard", block: 4 }];
}

export function hallEyeIdx(run: HallRun): number {
  const c = hallCourse(run.courseId);
  if (c?.eyeIdx != null) return c.eyeIdx;
  if (c?.demoStage) return demoEyeIdx(c.demoStage);
  return -1;
}

export function applyHallBattle(b: Battle, run: HallRun): Battle {
  const synced = syncHallLesson({ ...run, lessonStep: run.bout === 1 ? 0 : run.lessonStep, foeDebrief: null });
  Object.assign(run, synced);
  const c = hallCourse(run.courseId);
  const intents = hallIntents(run);
  if (run.courseId === "reach" || run.courseId.startsWith("camp-")) {
    b.player.pos = 2;
    b.enemy.pos = 5;
  } else if (run.courseId === "chase") {
    // 进步能缩短距离：我 2、他 4 → 进步到 3
    b.player.pos = 2;
    b.enemy.pos = 4;
  } else {
    b.player.pos = 3;
    b.enemy.pos = 4;
  }
  const hpCap = run.bout === 2 ? (c?.drillHp ?? 22) : c?.demoStage && c.demoStage <= 2 ? 12 : 16;
  b.enemy.hp = Math.min(b.enemy.maxHp, hpCap);
  b.enemy.maxHp = Math.max(b.enemy.maxHp, b.enemy.hp);
  b.intents = intents;
  b.intent = intents[0]!;
  b.intentIndex = 0;
  b.v2EyeIdx = hallEyeIdx(run);
  b.v2Turn = emptyV2Turn(b);
  b.player.hp = Math.min(run.hp, b.player.maxHp);
  b.energy = Math.max(b.energy, 3);
  b.labBreakLesson = true;
  return syncHallBattle(b, run);
}

export function lockHallAfterFoeTurn(b: Battle, run: HallRun, playerPos: number, enemyPos: number): void {
  if (run.bout === 2) return;
  if (hallLessonDone(run)) return;
  lockDemoAfterFoeTurn(b, playerPos, enemyPos);
}

export function hallTitle(run: HallRun): string {
  const c = hallCourse(run.courseId);
  const bout = run.bout === 1 ? "引导" : "训练";
  return `${c?.title ?? "训练"} · ${bout}`;
}

export function hallStageLabel(run: HallRun): string {
  const c = hallCourse(run.courseId);
  if (c?.demoStage && run.bout === 1) return demoStageTitle(c.demoStage);
  return hallTitle(run);
}

export function buildHallPreset(run: HallRun): LabPreset {
  const c = hallCourse(run.courseId)!;
  const school = c.school;
  const mate = GAUNTLET_SCHOOL_LOADOUT[school].fieldMate;
  const party: CompanionId[] = run.companion ? [mate, run.companion] : [mate];
  const mateWeapons: Record<string, string> = {
    [mate]: `${school}-a-3`,
  };
  if (run.companion) mateWeapons[run.companion] = `${MATES[run.companion].weapon}-a-3`;
  const deck = school === "saber" && c.demoStage ? [...DEMO_STARTER_DECK] : [...breakStarterDeck(school)];
  return normalizePreset({
    id: `hall-${run.courseId}-${run.bout}`,
    name: hallTitle(run),
    blurb: "训练馆",
    tags: ["训练馆", school],
    enemyId: c.demoStage ? demoEnemyId(c.demoStage) : "mob_road_01",
    party,
    fieldMate: mate,
    deckRecipe: deck,
    mateWeapons,
    mateTechs: { [mate]: [] },
    mateMinds: {},
    hp: run.hp,
    hpMax: run.hpMax,
  });
}
