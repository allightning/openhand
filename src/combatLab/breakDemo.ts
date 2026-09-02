/**
 * 拆招版 · 训练营（6 局）
 * ①硬拆 ②充能 ③让 ④反架 ⑤破眼 ⑥换人
 */
import type { Battle, CardId, CompanionId, EnemyId, Intent, LabItemId } from "../game/types";
import { MATES, WEAPON_NAME } from "../game/party";
import { emptyV2Turn } from "../game/labV2";
import { drawOneCard } from "../game/sim";
import { battleEquippedSchool } from "../game/equippedWeapon";
import { breakStarterDeck } from "./rogueRoster";
import type { LabPreset } from "./types";
import { normalizePreset } from "./draft";

const DEMO_DONE_KEY = "openhand-break-demo-done";
const ROOKIE_DONE_KEY = "openhand-rookie-demo-done";

/** vitest / private mode fallback */
let demoDoneMemory = false;
let rookieDoneMemory = false;

export type DemoStage = 1 | 2 | 3 | 4 | 5 | 6;
export const DEMO_LAST_STAGE: DemoStage = 6;

export interface BreakDemoRun {
  stage: DemoStage;
  pot: number;
  hp: number;
  hpMax: number;
  deckRecipe: CardId[];
  companion: CompanionId | null;
  items: LabItemId[];
  itemCharges?: Partial<Record<LabItemId, number>>;
  totalBreaks: number;
  /** 本局引导：本步应打的牌（高亮；严格步内其它牌禁用） */
  guideCardIds: CardId[];
  guideCoach: string;
  teachBanner: string;
  swapTaught: boolean;
  /** 当前课程序号 */
  lessonStep: number;
  /** 敌方步骤讲解（收势后弹出，点「明白了」关闭） */
  foeDebrief: DemoFoeDebrief | null;
  /** 低阶不教破招；高阶六局教破招 */
  track?: "rookie" | "break";
}

export interface DemoFoeDebrief {
  title: string;
  body: string;
}

export type DemoLessonKind = "play" | "end" | "swap";

export interface DemoLessonStep {
  kind: DemoLessonKind;
  allowCardIds: CardId[];
  teachBanner: string;
  coach: string;
  foeDebrief?: DemoFoeDebrief;
}


/** 示范锁刀；同道必含拳。 */
export const DEMO_SCHOOL = "saber" as const;
export const DEMO_FIELD_MATE: CompanionId = "watch";
export const DEMO_FIST_MATE: CompanionId = "rail"; // 拳
export const DEMO_COMPANION_CHOICES: CompanionId[] = ["rail", "guard", "sapper"]; // 拳 / 枪 / 棍

export const DEMO_STARTER_DECK: CardId[] = [
  "cut",
  "cut",
  "drawcut",
  "advance",
  "advance2",
  "retreat",
  "sidestep",
  "defend",
  "defend",
  "brace",
  "rift",
  "charge",
  "sweep",
  "saberBleed",
];

function play(ids: CardId[], banner: string, coach: string): DemoLessonStep {
  return { kind: "play", allowCardIds: ids, teachBanner: banner, coach };
}
function end(banner: string, coach: string, foeDebrief?: DemoFoeDebrief): DemoLessonStep {
  return { kind: "end", allowCardIds: [], teachBanner: banner, coach, foeDebrief };
}
function swap(banner: string, coach: string): DemoLessonStep {
  return { kind: "swap", allowCardIds: [], teachBanner: banner, coach };
}

function finishCut(): DemoLessonStep[] {
  return [
    play(["advance"], "上前", "打「进步」（1 劲）走进刀距。刀打 2 格——够不着就是打空。"),
    play(["cut"], "收官", "打「斩」（2 劲）。拆势挂在这张攻击牌上，打出即兑现真伤。"),
    end("收势结束", "点「收势」。他重新亮招，你回劲抽牌。"),
  ];
}

/** 每馆分步教案。文案给玩家看，短句。 */
export function demoLessons(stage: DemoStage, companion: CompanionId | null, track: "rookie" | "break" = "break"): DemoLessonStep[] {
  if (track === "rookie") {
    if (stage === 1) {
      return [
        play(["cut"], "出刀", "人已在刀距。打「斩」。左上角是劲，打完点「收势」回劲抽牌。够不着才是打空。"),
        end("收势", "点「收势」结束你的回合。他出手后你再打。", {
          title: "回合",
          body: "你出牌 → 收势 → 敌方出手 → 你回劲。不用管破招，先把这一套打顺。",
        }),
      ];
    }
    if (stage === 2) {
      return [
        play(["defend"], "格挡", "打「卸力」堆挡。他打在挡上先扣挡再扣血。"),
        end("收势", "点「收势」。挡够了这一刀会轻很多。", {
          title: "营地预告",
          body: "正式踢馆每场开战满状态。营地领免费奖励，黑市用彩金买；不下注大概只够买一件最便宜的。",
        }),
      ];
    }
    if (stage === 3) {
      return [
        play(["retreat"], "走动", "打「撤步」改站位。距离会改他打不打得到你。"),
        end("收势", "点「收势」。", {
          title: "配装与下注",
          body: "牌包有张数上下限，不合规不能开打。下注开打前扣彩金；飞了底彩不发，还抽一成出血。复活赛不能下注。",
        }),
      ];
    }
    return [
      play(["cut"], "再打一刀", "用「斩」收尾。低阶到此，破招去高阶新手关和训练馆。"),
      end("毕业", "点「收势」。之后可开踢，或进高阶学破招。", {
        title: "低阶毕业",
        body: "肉鸽：选线、垫资、营地、黑市、配装、下注。破招是高手加成，不是过关门槛。",
      }),
    ];
  }
  if (stage === 1) {
    return [
      play(["retreat"], "离开红格", "你踩在他这一招的落点（红格）上。打「撤步」（0 劲）退出去：离格 + 攒 1 点破招充能。"),
      end("收势硬拆", "点「收势」结算：人在红格外 + 有充能 = 硬拆。他的打击作废，你拿拆势。", {
        title: "硬拆给拆势",
        body: "硬拆 = 他的招作废 + 你拿拆势（下一刀加真伤）。只走开不收势，什么也没有。看「斩」的描边。",
      }),
      ...finishCut(),
    ];
  }
  if (stage === 2) {
    return [
      play(["retreat"], "第一段", "他这一回合连打两段。打「撤步」攒 1 点充能——拆 1 段耗 1 点，另 1 段只能硬吃。"),
      end("看充能", "点「收势」。第 1 段硬拆作废；第 2 段没充能，照打你。记住：充能按段扣。", {
        title: "充能是门票",
        body: "硬拆 1 段耗 1 点充能。两段招要两张位移才拆得完。没拆的那段照打。",
      }),
      ...finishCut(),
    ];
  }
  if (stage === 3) {
    return [
      play(["defend"], "堆挡", "这回不走了。打「卸力」（1 劲）格挡 +8——收势时格挡顶住他的伤害 = 让。"),
      end("让", "点「收势」。格挡顶住 = 让：只吃一半伤，但没有拆势。能走开硬拆就别站着让。", {
        title: "让不是反打",
        body: "让 = 格挡顶住落点，伤害减半，不得拆势。硬拆才是反打：走开 + 充能 + 收势。",
      }),
    play(["cut"], "收官", "人还在红格旁。打「斩」（2 劲）。"),
    end("收势结束", "点「收势」。"),
    ];
  }
  if (stage === 4) {
    return [
      play(["rift"], "破架", "他亮了架势（卸力）。架势走不开也挡不住——打「开缝」（1 劲）攒破架充能。"),
      end("拆架", "点「收势」。破架充能拆架：他的格挡作废，你拿拆势。角标「将破」才是硬拆。", {
        title: "招不同，拆法不同",
        body: "打击靠走开拆，架势靠破架牌拆。看角标：「将破」才是硬拆。",
      }),
    play(["cut"], "收官", "人没动。打「斩」（2 劲）。"),
    end("收势结束", "点「收势」。"),
    ];
  }
  if (stage === 5) {
    return [
      play(["retreat"], "拆眼", "他第 1 段标了「眼」——整套连招的要害。打「撤步」走开，攒充能硬拆这一段。"),
      end("破眼", "点「收势」。硬拆眼段：后面几招全散，他失衡（承伤 ×2），你的拆势更重。", {
        title: "眼 = 连招要害",
        body: "只有硬拆打中眼才破眼：后招全散、他失衡。让拆眼不算。",
      }),
      ...finishCut(),
    ];
  }
  // ⑥ 换人：换谁、收官打什么都按实际选的同伴来——拳=劈掌 / 枪=戳 / 棍=裂桩；没同伴兜底刀。
  // 拆招枪禁贴身：枪同伴退开后即可戳（距 2），不再纵步贴脸。
  const finisher: CardId =
    companion === "guard" ? "thrust" : companion === "sapper" ? "split" : companion ? "strike" : "cut";
  const finisherName = companion === "guard" ? "戳" : companion === "sapper" ? "裂桩" : companion ? "劈掌" : "斩";
  const compWeapon = companion ? WEAPON_NAME[MATES[companion].weapon] : "刀";
  const reachHint =
    companion === "rail" ? "1" : companion === "guard" ? "2–4" : companion ? "3" : "2";
  const head: DemoLessonStep[] = companion
    ? [
        swap(
          "换人",
          `点高亮「换人·${MATES[companion].name}」（1 劲）：${compWeapon}手换刀客上场。换人也占出牌节奏。不想换就点「收势」跳过。`,
        ),
      ]
    : [];
  const closeOrThrust: DemoLessonStep[] =
    companion === "guard"
      ? [play([finisher], "收官", `打「${finisherName}」（1 劲）。枪禁贴身，现距约 2 格正好戳。`)]
      : [
          play(["advance2"], "上前", "退得远了——打「纵步」（1 劲，前进 2 格）逼回他身前。"),
          play([finisher], "收官", `打「${finisherName}」（1 劲）。${compWeapon}距 ${reachHint} 格，按手中兵刃量距离。`),
        ];
  return [
    ...head,
    play(["retreat"], companion ? `${compWeapon}上场` : "拆招", "规则不变。打「撤步」离开红格，攒 1 点充能。"),
    end("再拆一次", "点「收势」。红格外 + 充能 = 硬拆。规则没变，换的是兵器。"),
    ...closeOrThrust,
    end("收势结束", "点「收势」。这一局到此。", {
      title: "训练营到此",
      body: "硬拆、充能、让、破架、破眼、换人都试过了。追（拆「撤」）在训练馆。开踢再自己配。",
    }),
  ];
}

export function isBreakDemoDone(): boolean {
  try {
    const v = localStorage.getItem(DEMO_DONE_KEY);
    if (v === "1") {
      demoDoneMemory = true;
      return true;
    }
    if (v === "0") {
      demoDoneMemory = false;
      return false;
    }
  } catch {
    /* ignore */
  }
  return demoDoneMemory;
}

export function markBreakDemoDone(): void {
  demoDoneMemory = true;
  try {
    localStorage.setItem(DEMO_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isRookieDemoDone(): boolean {
  try {
    const v = localStorage.getItem(ROOKIE_DONE_KEY);
    if (v === "1") {
      rookieDoneMemory = true;
      return true;
    }
    if (v === "0") {
      rookieDoneMemory = false;
      return false;
    }
  } catch {
    /* ignore */
  }
  return rookieDoneMemory;
}

export function markRookieDemoDone(): void {
  rookieDoneMemory = true;
  try {
    localStorage.setItem(ROOKIE_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** 测试用 */
export function clearBreakDemoDone(): void {
  demoDoneMemory = false;
  rookieDoneMemory = false;
  try {
    localStorage.removeItem(DEMO_DONE_KEY);
    localStorage.removeItem(ROOKIE_DONE_KEY);
  } catch {
    /* ignore */
  }
}

export function createBreakDemoRun(track: "rookie" | "break" = "break"): BreakDemoRun {
  const run: BreakDemoRun = {
    stage: 1,
    pot: 40,
    hp: 48,
    hpMax: 48,
    deckRecipe: [...DEMO_STARTER_DECK],
    companion: null,
    items: [],
    itemCharges: {},
    totalBreaks: 0,
    guideCardIds: [],
    guideCoach: "",
    teachBanner: "",
    swapTaught: false,
    lessonStep: 0,
    foeDebrief: null,
    track,
  };
  return syncDemoLesson(run);
}

export function currentDemoLesson(run: BreakDemoRun): DemoLessonStep {
  const list = demoLessons(run.stage, run.companion, run.track ?? "break");
  return list[Math.min(run.lessonStep, list.length - 1)]!;
}

/** 教案已走完：进入自由打——真手牌、收势/换人不再锁，把残血敌人打完收尾。 */
export function demoLessonDone(run: BreakDemoRun): boolean {
  return run.lessonStep >= demoLessons(run.stage, run.companion, run.track ?? "break").length;
}

export function syncDemoLesson(run: BreakDemoRun): BreakDemoRun {
  if (demoLessonDone(run)) {
    return {
      ...run,
      guideCardIds: [],
      guideCoach:
        (run.track ?? "break") === "rookie"
          ? "教案走完了——用你学会的出牌把他打下台。"
          : "教案走完了——用你学会的破招自由出招，把他打下台。",
      teachBanner: "自由打",
    };
  }
  const step = currentDemoLesson(run);
  return {
    ...run,
    guideCardIds: step.allowCardIds,
    guideCoach: step.coach,
    teachBanner: step.teachBanner,
  };
}

export function demoAllowsCard(run: BreakDemoRun, cardId: CardId): boolean {
  if (run.foeDebrief) return false;
  if (demoLessonDone(run)) return true;
  const step = currentDemoLesson(run);
  if (step.kind === "end" || step.kind === "swap") return false;
  return step.allowCardIds.includes(cardId);
}

/**
 * 收势常亮：它是玩家主动结束回合的唯一方式，任何教案步都不灭（软锁兜底）。
 * 只有敌方讲解弹窗（modal 盖住棋盘）期间才挡。
 */
export function demoAllowsEndTurn(run: BreakDemoRun): boolean {
  return run.foeDebrief == null;
}

export function demoAllowsSwap(run: BreakDemoRun, mateId: CompanionId): boolean {
  if (run.foeDebrief) return false;
  if (demoLessonDone(run)) return true;
  const step = currentDemoLesson(run);
  if (step.kind !== "swap") return false;
  return mateId === (run.companion ?? DEMO_FIST_MATE);
}

export function afterDemoPlayCard(run: BreakDemoRun, cardId: CardId): BreakDemoRun {
  if (demoLessonDone(run)) return run;
  const step = currentDemoLesson(run);
  if (step.kind !== "play" || !step.allowCardIds.includes(cardId)) return run;
  return syncDemoLesson({ ...run, lessonStep: run.lessonStep + 1 });
}

export function afterDemoSwap(run: BreakDemoRun, mateId: CompanionId): BreakDemoRun {
  if (demoLessonDone(run)) return { ...run, swapTaught: true };
  if (mateId !== (run.companion ?? DEMO_FIST_MATE)) return run;
  const step = currentDemoLesson(run);
  if (step.kind !== "swap") {
    return { ...run, swapTaught: true };
  }
  return syncDemoLesson({ ...run, lessonStep: run.lessonStep + 1, swapTaught: true });
}

export function afterDemoEndTurn(run: BreakDemoRun): BreakDemoRun {
  if (demoLessonDone(run)) return run;
  const step = currentDemoLesson(run);
  // 换人步点收势 = 不换也能打（异系同行递招），跳过换人继续教案
  if (step.kind === "swap") {
    return syncDemoLesson({ ...run, lessonStep: run.lessonStep + 1 });
  }
  if (step.kind !== "end") return run;
  const next = run.lessonStep + 1;
  return syncDemoLesson({
    ...run,
    lessonStep: next,
    foeDebrief: step.foeDebrief ?? null,
  });
}

export function dismissDemoFoeDebrief(run: BreakDemoRun): BreakDemoRun {
  return { ...run, foeDebrief: null };
}

/** @deprecated 兼容旧测试：汇总本馆允许牌 */
export function demoGuideForStage(stage: DemoStage, hasFistCompanion: boolean): Pick<BreakDemoRun, "guideCardIds" | "guideCoach"> {
  const first = demoLessons(stage, hasFistCompanion ? DEMO_FIST_MATE : null)[0]!;
  return { guideCardIds: first.allowCardIds.length ? first.allowCardIds : ["advance"], guideCoach: first.coach };
}

/** 新手关手牌全脚本：当前步只发允许打的牌，不随机补牌。 */
export function demoScriptedHandIds(run: BreakDemoRun): CardId[] {
  const step = currentDemoLesson(run);
  if (step.kind === "play") return [...step.allowCardIds];
  // 收势 / 换人步：预埋下一张斩，但不可打（demoAllowsCard 会挡）
  if (step.kind === "end") return ["advance"];
  if (step.kind === "swap") return [];
  return [];
}

function setDemoHand(b: Battle, ids: CardId[]): void {
  b.hand = ids.map((id, i) => ({ uid: `demo-hand-${i}-${id}`, defId: id }));
  // 抽弃清空，避免收势后再随机摸牌打乱教案
  b.drawPile = [];
  b.discardPile = [];
}

/**
 * 教案走完后的自由打兜底：脚本手牌期抽弃堆是清的，这里换回真牌堆摸一手；
 * 并解除教案锁的「只架不打」敌招，让收尾战是真打。幂等——自由打期间不再重排。
 */
export function ensureFreePlayDeck(b: Battle, recipe: CardId[], intents: Intent[], eyeIdx: number): void {
  if (b.drawPile.length === 0 && b.discardPile.length === 0) {
    b.hand = [];
    b.drawPile = recipe.map((id, i) => ({ uid: `free-${i}-${id}`, defId: id }));
    for (let i = 0; i < 5; i++) drawOneCard(b);
    b.energy = Math.max(b.energy, 3);
  }
  if (b.intents.length === 1 && b.intents[0]!.kind === "guard" && b.intents[0]!.block === 2) {
    b.intents = intents.map((i) => ({ ...i }));
    b.intentIndex = 0;
    b.intent = b.intents[0]!;
    b.v2EyeIdx = eyeIdx;
  }
}

/**
 * 自由打牌堆跟场上兵刃走：换到拳/枪/棍就发对应系的牌，不再塞刀牌给拳手。
 * 刀在场上时用回原牌堆（含玩家选的奖励牌）。
 */
export function freePlayRecipe(b: Battle, fallback: CardId[]): CardId[] {
  const school = battleEquippedSchool(b, b.active);
  return school === "saber" ? fallback : [...breakStarterDeck(school)];
}

/**
 * 只换手牌和劲，不改双方站位。走动必须打牌。
 */
export function syncBreakDemoBattle(b: Battle, run: BreakDemoRun): Battle {
  if (demoLessonDone(run)) {
    ensureFreePlayDeck(b, freePlayRecipe(b, run.deckRecipe), demoIntents(run.stage), demoEyeIdx(run.stage));
    return b;
  }
  const step = currentDemoLesson(run);
  setDemoHand(b, demoScriptedHandIds(run));
  if (step.kind === "play") b.energy = Math.max(b.energy, 3);
  else b.energy = Math.max(b.energy, 1);
  return b;
}

/** 收势后钉死站位，换弱意图，避免 AI 走近。 */
export function lockDemoAfterFoeTurn(b: Battle, playerPos: number, enemyPos: number): void {
  b.player.pos = playerPos;
  b.enemy.pos = enemyPos;
  b.intents = [{ kind: "guard", block: 2 }];
  b.intent = b.intents[0]!;
  b.intentIndex = 0;
  b.v2EyeIdx = -1;
  if (b.v2Turn) {
    b.v2Turn.turnStartPos = playerPos;
    b.v2Turn.endPos = playerPos;
  }
}

export function demoStageTitle(stage: DemoStage, track: "rookie" | "break" = "break"): string {
  if (track === "rookie") {
    if (stage === 1) return "① 出刀";
    if (stage === 2) return "② 格挡";
    if (stage === 3) return "③ 走动";
    return "④ 营地";
  }
  if (stage === 1) return "① 硬破";
  if (stage === 2) return "② 充能";
  if (stage === 3) return "③ 让";
  if (stage === 4) return "④ 破架";
  if (stage === 5) return "⑤ 破眼";
  return "⑥ 换人";
}

export function demoEnemyId(stage: DemoStage): EnemyId {
  if (stage <= 2) return "mob_road_01";
  if (stage === 3) return "mob_road_02";
  if (stage === 4) return "mob_yamenRunner_01";
  return "mob_monk_01";
}

/** 固定意图。 */
export function demoIntents(stage: DemoStage): Intent[] {
  if (stage === 1) return [{ kind: "strike", damage: 9 }, { kind: "guard", block: 4 }];
  if (stage === 2) return [{ kind: "strike", damage: 8 }, { kind: "strike", damage: 8 }];
  if (stage === 3) return [{ kind: "barrage", damage: 4, hits: 2 }, { kind: "strike", damage: 8 }];
  if (stage === 4) return [{ kind: "guard", block: 8 }, { kind: "strike", damage: 7 }];
  if (stage === 5) return [{ kind: "strike", damage: 11 }, { kind: "guard", block: 6 }, { kind: "strike", damage: 7 }];
  return [{ kind: "strike", damage: 9 }, { kind: "guard", block: 4 }];
}

export function demoEyeIdx(stage: DemoStage): number {
  return stage === 5 ? 0 : -1;
}

/** 开战：站位 / 意图 / 眼 / 全脚本手牌。 */
export function applyBreakDemoBattle(b: Battle, run: BreakDemoRun): Battle {
  const synced = syncDemoLesson({ ...run, lessonStep: 0, foeDebrief: null });
  Object.assign(run, synced);
  const intents = demoIntents(run.stage);
  const eye = demoEyeIdx(run.stage);
  b.player.pos = 3;
  b.enemy.pos = 4;
  b.enemy.hp = Math.min(b.enemy.hp, run.stage <= 2 ? 12 : 14);
  b.enemy.maxHp = Math.max(b.enemy.maxHp, b.enemy.hp);
  b.intents = intents;
  b.intent = intents[0]!;
  b.intentIndex = 0;
  b.v2EyeIdx = eye;
  b.v2Turn = emptyV2Turn(b);
  b.player.hp = Math.min(run.hp, b.player.maxHp);
  b.energy = Math.max(b.energy, 3);
  b.labBreakLesson = true;
  return syncBreakDemoBattle(b, run);
}

export function demoRewardOptions(stage: DemoStage): { id: CardId; title: string; tip: string }[] {
  if (stage === 1) {
    return [
      { id: "advance", title: "进步", tip: "位移 · 充能 +1" },
      { id: "defend", title: "卸力", tip: "格挡 8" },
      { id: "cut", title: "斩", tip: "刀攻" },
    ];
  }
  if (stage === 2) {
    return [
      { id: "sidestep", title: "换位", tip: "位移充能" },
      { id: "advance2", title: "纵步", tip: "大位移" },
      { id: "drawcut", title: "抽刀", tip: "贴身刀攻" },
    ];
  }
  if (stage === 3) {
    return [
      { id: "brace", title: "稳步", tip: "格挡" },
      { id: "sidestep", title: "换位", tip: "位移充能" },
      { id: "cut", title: "斩", tip: "刀攻" },
    ];
  }
  if (stage === 4) {
    return [
      { id: "rift", title: "开缝", tip: "破架" },
      { id: "advance", title: "进步", tip: "位移充能" },
      { id: "cut", title: "斩", tip: "刀攻" },
    ];
  }
  if (stage === 5) {
    return [
      { id: "advance2", title: "纵步", tip: "位移充能" },
      { id: "defend", title: "卸力", tip: "格挡" },
      { id: "charge", title: "蓄劲", tip: "下攻加伤" },
    ];
  }
  return [
    { id: "cut", title: "斩", tip: "刀攻" },
    { id: "retreat", title: "撤步", tip: "离开红格" },
    { id: "rift", title: "开缝", tip: "破架" },
  ];
}

export function demoMarketOffers(pot: number): { id: LabItemId; title: string; price: number; tip: string }[] {
  const all = [
    { id: "jinchuang" as LabItemId, title: "金疮药", price: 12, tip: "回血，多撑一拍再拆" },
    { id: "xiujian" as LabItemId, title: "袖箭", price: 15, tip: "无视格挡打 8 · 自己选时机" },
    { id: "huiqi" as LabItemId, title: "回气散", price: 10, tip: "即时 +6 劲 · 多出一张位移" },
  ];
  return all.filter((o) => o.price <= Math.max(pot, 10)).slice(0, 2);
}

export function companionWeaponLabel(id: CompanionId): string {
  const w = MATES[id]?.weapon;
  if (w === "palm") return "拳";
  if (w === "spear") return "枪";
  if (w === "staff") return "棍";
  if (w === "saber") return "刀";
  if (w === "sword") return "剑";
  if (w === "hook") return "钩";
  return w ?? "?";
}

export function advanceDemoAfterWin(run: BreakDemoRun, breaks: number, hp: number): BreakDemoRun {
  return {
    ...run,
    totalBreaks: run.totalBreaks + breaks,
    hp: Math.max(1, hp),
    pot: run.pot + 15,
    lessonStep: 0,
    foeDebrief: null,
  };
}

export function buildBreakDemoPreset(run: BreakDemoRun): LabPreset {
  const mate = DEMO_FIELD_MATE;
  const party: CompanionId[] = run.companion ? [mate, run.companion] : [mate];
  const mateWeapons: Record<string, string> = {
    [mate]: "saber-a-3",
  };
  if (run.companion) {
    mateWeapons[run.companion] = `${MATES[run.companion].weapon}-a-3`;
  }
  return normalizePreset({
    id: `break-demo-${run.stage}`,
    name: demoStageTitle(run.stage, run.track ?? "break"),
    blurb: (run.track ?? "break") === "rookie" ? "低阶入门" : "破招示范",
    tags: ["示范", "saber"],
    enemyId: demoEnemyId(run.stage),
    party,
    fieldMate: mate,
    deckRecipe: [...run.deckRecipe],
    mateWeapons,
    mateTechs: { [mate]: ["brightBlade", "closeCut"], ...(run.companion ? { [run.companion]: [] } : {}) },
    mateMinds: {},
    labItems: [...run.items].slice(0, 2),
    labItemCharges: { ...(run.itemCharges ?? {}) },
    hp: run.hp,
    hpMax: run.hpMax,
  });
}
