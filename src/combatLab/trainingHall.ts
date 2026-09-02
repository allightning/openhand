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
}

function play(ids: CardId[], banner: string, coach: string): DemoLessonStep {
  return { kind: "play", allowCardIds: ids, teachBanner: banner, coach };
}
function end(banner: string, coach: string, foeDebrief?: DemoFoeDebrief): DemoLessonStep {
  return { kind: "end", allowCardIds: [], teachBanner: banner, coach, foeDebrief };
}
function swapStep(banner: string, coach: string): DemoLessonStep {
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
    play([move], "离开红格", `你踩在他的落点（红格）上。打「${moveName}」离开：离格 + 攒 1 点破招充能。`),
    end("收势硬拆", "点「收势」：红格外 + 充能 = 硬拆。他的招作废，你拿拆势。", {
      title: "拆势在下一刀",
      body: "拆势挂在攻击牌上（看描边）。走进兵刃圈打出，才兑现真伤。",
    }),
    play(["advance"], "上前", `打「进步」走进攻击距离——这系兵刃打 ${range} 格，够不着就是打空。`),
    play([fin.id], "打出拆势", `打「${fin.name}」——拆势在这一击兑现成真伤。`),
    end("收势结束", "点「收势」。他重新亮招，你回劲抽牌。"),
  ];
}

const CHAIN_LESSONS: DemoLessonStep[] = [
  play(["retreat"], "第一段", "他连打两段。打「撤步」攒第 1 点充能——每段硬拆各耗 1 点。"),
  play(["retreat"], "第二段", "再打「撤步」攒第 2 点充能。两点在手，两段都能硬拆。"),
  end("连环拆", "点「收势」。两段都硬拆 = 拆势叠两层，还额外得势。", {
    title: "连环拆",
    body: "同回合第 2 段硬拆再叠一层拆势。拆势挂在攻击牌上，打一刀吃一层。",
  }),
  play(["advance2"], "上前", "退得太远，一步不够——打「纵步」（前进 2 格）大步上前。"),
  play(["cut"], "第一刀", "打「斩」吃一层拆势。还剩一层，下一刀接着吃。"),
  end("收势结束", "点「收势」。没吃完的拆势留到下回合。"),
];

const CHASE_LESSONS: DemoLessonStep[] = [
  play(["advance"], "追上", "他要撤。打「进步」朝他靠近——收势时比开局更近 = 追。"),
  end("追", "点「收势」。追上了：他仍撤走，你拿拆势。没进步 = 放，不算拆。", {
    title: "追 = 拆「撤」",
    body: "朝他的位移（进步/纵步/逼近）且更近 = 追。算硬拆、得拆势。他照样撤。",
  }),
  play(["cut"], "收官", "人还在刀距。打「斩」兑现拆势。"),
  end("收势结束", "点「收势」。江湖刀敌爱撤——开踢里常碰到。"),
];

const REACH_LESSONS: DemoLessonStep[] = [
  play(["advance"], "走近", "兵刃有圈：刀 2 格、拳 1 格、枪棍 3 格。他够不着你——打「进步」走进刀距。"),
  play(["cut"], "打到", "进圈了。打「斩」。记住：够不着是打空，不是拆。"),
  end("收势结束", "点「收势」。"),
];

export const HALL_COURSES: HallCourse[] = [
  { id: "hard", cabinet: "break", title: "硬破与破势", blurb: "走开硬破，下一刀打出真伤。", school: "saber", demoStage: 1, drillCoach: "流程：位移出红格 → 收势硬破 → 攻击牌兑现破势。自己打一遍。", drillHp: 22 },
  { id: "charges", cabinet: "break", title: "充能", blurb: "1 点充能只能硬破 1 段。", school: "saber", demoStage: 2, drillCoach: "两段招要两点充能（两张位移）。不够的话，没破的那段照打你。", drillHp: 24 },
  { id: "graze", cabinet: "break", title: "让", blurb: "红格里堆挡 = 半伤，没有破势。", school: "saber", demoStage: 3, drillCoach: "红格里堆格挡 = 让（半伤保命）；走开 + 充能 = 硬破（拿破势）。自己选。", drillHp: 22 },
  { id: "rift", cabinet: "break", title: "破架", blurb: "架势要用破架牌拆。", school: "saber", demoStage: 4, drillCoach: "架势走不开也挡不住。先开缝再收势，角标「将破」才是硬拆。", drillHp: 22 },
  { id: "eye", cabinet: "break", title: "破眼", blurb: "硬拆眼段，后招散、拆势加力。", school: "saber", demoStage: 5, drillCoach: "眼是连招要害（标在第 1 段）。硬拆它：后招全散、他失衡（承伤 ×2）。", drillHp: 24 },
  { id: "chase", cabinet: "break", title: "追", blurb: "他撤你进：进步缩短距离 = 追。", school: "saber", lessons: CHASE_LESSONS, intents: [{ kind: "retreat", steps: 1 }], drillCoach: "他撤。打进步/纵步朝他靠近再收势 = 追。没追 = 放。", drillHp: 20 },
  { id: "chain", cabinet: "break", title: "连环拆", blurb: "同回合两段硬拆，两层拆势。", school: "saber", lessons: CHAIN_LESSONS, intents: [{ kind: "strike", damage: 8 }, { kind: "strike", damage: 8 }], drillCoach: "两张位移攒两点充能，两段都硬拆。拆势叠两层，打一刀吃一层。", drillHp: 24 },
  { id: "reach", cabinet: "break", title: "兵刃圈", blurb: "够不着是打空，走进距离才能打。", school: "saber", lessons: REACH_LESSONS, intents: [{ kind: "strike", damage: 9 }], drillCoach: "刀 2 格、拳 1 格、枪棍 3 格。先进圈再出刀。敌刀平砍 1–2，你刀距 2 伤低。", drillHp: 20 },
  { id: "saber", cabinet: "weapon", title: "刀", blurb: "拆势打出：贴身裂创。", school: "saber", lessons: schoolGuide("saber"), drillCoach: "刀距 2。拆完自己打出拆势；贴身那刀更重、还叠裂创。玩家刀 10/4 叠创，敌刀平砍。", drillHp: 22 },
  { id: "palm", cabinet: "weapon", title: "拳", blurb: "拆势打出：击退。", school: "palm", lessons: schoolGuide("palm"), drillCoach: "拳距 1，贴身才够得着。拆势那一掌会把他击退。", drillHp: 22 },
  { id: "sword", cabinet: "weapon", title: "剑", blurb: "拆势打出：破绽。", school: "sword", lessons: schoolGuide("sword"), drillCoach: "剑距 2。拆势那一刺叠破绽，后续更痛。", drillHp: 22 },
  { id: "spear", cabinet: "weapon", title: "枪", blurb: "拆势打出：远打加力。", school: "spear", lessons: schoolGuide("spear"), drillCoach: "枪距 3。隔开打也有拆势，远一寸力一分。", drillHp: 22 },
  { id: "staff", cabinet: "weapon", title: "棍", blurb: "拆势打出：眩晕。", school: "staff", lessons: schoolGuide("staff"), drillCoach: "棍距 3。拆势可晕他一段——晕住的段打不出来。", drillHp: 22 },
  { id: "hook", cabinet: "weapon", title: "钩", blurb: "拆势打出：缴械。", school: "hook", lessons: schoolGuide("hook"), drillCoach: "钩距 2。拆势缴他的兵：缴械期他攻击减半。", drillHp: 22 },
  { id: "swap", cabinet: "weapon", title: "换人", blurb: "换兵器上场，规则不变。", school: "saber", demoStage: 6, companion: DEMO_FIST_MATE, drillCoach: "换人 1 劲。拳已在队：拳距 1 格，贴身打。", drillHp: 24 },
  { id: "camp-shop", cabinet: "camp", title: "营地与黑市", blurb: "免费奖励、黑市刷新、半价卖掉。", school: "saber", lessons: REACH_LESSONS, intents: [{ kind: "strike", damage: 8 }], drillCoach: "不下注大约只够买一件最便宜的。稳吃 ×2 能买两件。刷新会越来越贵，用来花掉闲钱。多的牌半价卖。", drillHp: 22 },
  { id: "camp-loadout", cabinet: "camp", title: "配装", blurb: "每人牌包有上下限，不合规不能开打。", school: "saber", lessons: REACH_LESSONS, intents: [{ kind: "strike", damage: 8 }], drillCoach: "馆 1–2：牌 8～10，助战/道具各 1。3–7：10～12 / 各 2。8–10：12～15 / 各 3。仓库里的不占出战。", drillHp: 22 },
  { id: "camp-wager", cabinet: "camp", title: "读盘口", blurb: "开打扣注额；飞了抽 10% 出血、底彩不发。", school: "saber", lessons: REACH_LESSONS, intents: [{ kind: "strike", damage: 8 }], drillCoach: "盘口跟你的兵刃和敌人走。枪少开不贴身。连破/破眼是高手加成不是过关门槛。复活赛不能下注。", drillHp: 22 },
];

export function hallCourse(id: string): HallCourse | undefined {
  return HALL_COURSES.find((c) => c.id === id);
}

export function hallCoursesIn(cabinet: HallCabinet): HallCourse[] {
  return HALL_COURSES.filter((c) => c.cabinet === cabinet);
}

export interface HallRun {
  courseId: HallCourseId;
  bout: HallBout;
  lessonStep: number;
  guideCardIds: CardId[];
  guideCoach: string;
  teachBanner: string;
  companion: CompanionId | null;
  swapTaught: boolean;
  foeDebrief: DemoFoeDebrief | null;
  hp: number;
  hpMax: number;
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
  return syncHallLesson({
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
  });
}

export function hallAllowsCard(run: HallRun, cardId: CardId): boolean {
  if (run.bout === 2) return run.foeDebrief == null;
  if (run.foeDebrief) return false;
  if (hallLessonDone(run)) return true;
  const step = currentHallLesson(run);
  if (!step || step.kind === "end" || step.kind === "swap") return false;
  return step.allowCardIds.includes(cardId);
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
  fake.guideCardIds = run.guideCardIds;
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
  if (run.courseId === "reach") {
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
