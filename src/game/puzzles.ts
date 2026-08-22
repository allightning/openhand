/**
 * 八种新解谜方向（机制层）→ 衍生支线。
 * 港湾壳冻结：村里解谜须过帖/过册/验契后才开接；新谜只扩中后期城。
 *
 * 旗标约定：`pzXxx1` 接线开局，`pzXxxDone` 结案；可选 `pzXxxFail` 软失败。
 * 结案可叠 `yamenPayN` 发银（main.ts 认）。
 */

/** 出村手续齐了，才开港湾壳上的解谜入口（防前期叠支线）。 */
export function hubPuzzlesOpen(flags: string[]): boolean {
  return flags.includes("branded") || flags.includes("booksOk") || flags.includes("knotOk");
}
export const PUZZLE_DIRECTIONS = [
  {
    id: "echoBell",
    name: "听钟对位",
    blurb: "按钟序敲三处，错序则岗来。",
    sides: ["钟序·山门", "钟序·戒坛", "钟序·后殿"],
    startFlag: "pzEcho1",
    doneFlag: "pzEchoDone",
    failFlag: "pzEchoFail",
  },
  {
    id: "tideLedger",
    name: "潮册对页",
    blurb: "残页与潮位表合缝，才能开闸箱。",
    sides: ["潮册残页", "潮位合缝", "闸箱印"],
    startFlag: "pzTide1",
    doneFlag: "pzTideDone",
    failFlag: "pzTideFail",
  },
  {
    id: "maskMarket",
    name: "假面市声",
    blurb: "听齐三摊，再回摊婆认真嘴，才给路引。",
    sides: ["听三摊", "认真嘴", "路引"],
    startFlag: "pzMask1",
    doneFlag: "pzMaskDone",
    failFlag: "pzMaskFail",
  },
  {
    id: "bloodStele",
    name: "血碑拓印",
    blurb: "拓片要对上旧案姓氏，衙门才放卷。",
    sides: ["拓碑", "对姓", "开卷"],
    startFlag: "pzBlood1",
    doneFlag: "pzBloodDone",
    failFlag: "pzBloodFail",
  },
  {
    id: "lanternPath",
    name: "灯路夜行",
    blurb: "只沿亮灯格走，熄灯格踏入则遇伏。",
    sides: ["点灯吏", "夜路", "伏击退"],
    startFlag: "pzLantern1",
    doneFlag: "pzLanternDone",
    failFlag: "pzLanternFail",
  },
  {
    id: "forgeRiddle",
    name: "炉温口诀",
    blurb: "认赤火 → 船匠取精材 → 回炉投料出刃。",
    sides: ["认火", "取料", "出刃"],
    startFlag: "pzForge1",
    doneFlag: "pzForgeDone",
    failFlag: "pzForgeFail",
  },
  {
    id: "sealChain",
    name: "连环官印",
    blurb: "五印不可同桌，顺序受对话暗示。",
    sides: ["五印谜", "暗示吏", "连环开库"],
    startFlag: "pzSeal1",
    doneFlag: "pzSealDone",
    failFlag: "pzSealFail",
  },
  {
    id: "debtBeads",
    name: "债串珠",
    blurb: "还债顺序影响同伴是否入队与银两奖惩。",
    sides: ["债主甲", "债主乙", "串珠结"],
    startFlag: "pzDebt1",
    doneFlag: "pzDebtDone",
    failFlag: "pzDebtFail",
  },
] as const;

/** 规划中的 ≥20 条解谜支线标题（落地旗标逐步接线）。 */
export const PUZZLE_SIDE_TITLES: string[] = PUZZLE_DIRECTIONS.flatMap((d) => [...d.sides]);

/** 任务栏：已接未结的解谜；多步城案显示当前步标题。 */
export function activePuzzleSides(flags: string[]): { title: string; blurb: string; guide: string }[] {
  const has = (id: string) => flags.includes(id);
  const out: { title: string; blurb: string; guide: string }[] = [];
  for (const d of PUZZLE_DIRECTIONS) {
    if (!has(d.startFlag) || has(d.doneFlag)) continue;
    const failed = has(d.failFlag);
    const step = puzzleStep(d.id, flags);
    out.push({
      title: step.title,
      blurb: failed ? `${d.blurb}（走岔过）` : step.blurb ?? d.blurb,
      guide: step.guide,
    });
  }
  return out;
}

function puzzleStep(
  id: (typeof PUZZLE_DIRECTIONS)[number]["id"],
  flags: string[],
): { title: string; blurb?: string; guide: string } {
  const has = (x: string) => flags.includes(x);
  switch (id) {
    case "tideLedger":
      if (has("pzTideMatch")) {
        return { title: "闸箱印", blurb: "合缝印在袖，闸箱在河生处。", guide: "回扬州找河生：正纹开箱，别反纹硬撬。" };
      }
      if (has("pzTidePage")) {
        return { title: "潮位合缝", guide: "扬州盐市找颜牙，残页对『涨』格。" };
      }
      return { title: "潮册残页", guide: "扬州问河生，先收下残页。" };
    case "echoBell":
      if (has("pzEchoAltar")) {
        return { title: "钟序·后殿", guide: "少室或汴京恩僧处：敲后殿收钟。" };
      }
      if (has("pzEchoGate")) {
        return { title: "钟序·戒坛", guide: "恩僧处下一记敲戒坛，别跳后殿。" };
      }
      return { title: "钟序·山门", guide: "少室寺或汴京御街问恩僧，先敲山门。" };
    case "sealChain":
      if (has("pzSealHint")) {
        return { title: "连环开库", guide: "回洛阳朱文渊处：隔桌摆印，勿同桌。" };
      }
      return { title: "五印谜", guide: "洛阳接五印谜后，去桥头驿使或堂上门正听暗示。" };
    case "maskMarket": {
      const heard =
        has("pzMaskSalt") && has("pzMaskSilk") && has("pzMaskTea");
      if (heard) {
        return { title: "假面·认真嘴", guide: "回垂街摊婆阿秀：盐牙为真，丝市/茶棚是假面。" };
      }
      return {
        title: "假面·听三摊",
        blurb: "盐货摊、巷口婶、茶棚客各听一遍。",
        guide: "港湾：货摊听盐牙、巷口婶听丝市嘴、茶棚客听茶棚嘴，再回摊婆。",
      };
    }
    case "forgeRiddle":
      if (has("pzForgeMat") && has("pzForgeFire")) {
        return { title: "炉温·出刃", guide: "回武馆馆主阿砂：赤火投精材出刃，别白火猛催。" };
      }
      if (has("pzForgeFire")) {
        return { title: "炉温·取料", guide: "船坞/缆厂找船匠，取炉上精材。" };
      }
      return { title: "炉温·认火", guide: "武馆问馆主阿砂，精材认赤火。" };
    default:
      return { title: PUZZLE_DIRECTIONS.find((d) => d.id === id)!.sides[0], guide: puzzleGuide(id) };
  }
}

function puzzleGuide(id: (typeof PUZZLE_DIRECTIONS)[number]["id"]): string {
  switch (id) {
    case "echoBell":
      return "少室寺问恩僧（汴京御街也可见到），按山门→戒坛→后殿一记一记敲。";
    case "tideLedger":
      return "扬州问河生取残页，盐市颜牙对潮位，再回河生开闸箱。";
    case "maskMarket":
      return "垂街摊婆接假面 → 听齐盐摊/巷婶/茶客 → 回摊婆认盐牙真嘴。";
    case "bloodStele":
      return "岗坡衙门问捕头差，拓碑对上旧案姓氏。";
    case "lanternPath":
      return "灯楼问灯守，只沿亮灯走，别踩熄盏。";
    case "forgeRiddle":
      return "武馆认赤火 → 船匠取精材 → 回炉投料出刃。";
    case "sealChain":
      return "洛阳问朱文渊接谜，桥头/堂上听暗示，再回案书处摆印。";
    case "debtBeads":
      return "码头问缆夫，按串珠顺序还债。";
  }
}
