/**
 * 中后期解谜加厚：潮册 / 听钟 / 连环印 从单选 stub 扩成多步城案。
 * 旗标仍走 puzzles.ts 的 start/done/fail；中间步用 pzXxx* 子旗。
 */
import type { EnemyId } from "./types";

export type PuzzleCtx = { flags: string[]; pick?: string };

export type PuzzleVoice = {
  said: string;
  thought: string;
  flags?: string[];
  choices?: { id: string; label: string }[];
  spar?: EnemyId;
};

const has = (f: string[], id: string) => f.includes(id);

/** 扬州·河生：残页 → 指去盐牙对表 → 持合缝印开闸箱 */
export function tidePoetBeat(ctx: PuzzleCtx): PuzzleVoice {
  const f = ctx.flags;
  if (has(f, "pzTideDone")) {
    return {
      said: "「闸箱开了。那户人的粮册也合上了。夜里河声，总算不那么尖。」",
      thought: "诗写不进册。册却能卡死人。",
    };
  }
  if (ctx.pick === "tideOpenOk") {
    return {
      said: "「合缝印对上了。闸箱开。粮放。人活。」",
      thought: "河生不笑。他只松了一下肩。",
      flags: ["pzTideDone", "yamenPay8"],
    };
  }
  if (ctx.pick === "tideOpenBad") {
    return {
      said: "「印纹反了。箱死。你让人家再饿一夜——闸口还有人拦着。」",
      thought: "一页纸错了，一户人就悬着。",
      flags: ["pzTideFail"],
      spar: "mob_canal_03",
    };
  }
  if (has(f, "pzTideMatch") && !has(f, "pzTideDone")) {
    return {
      said: "「潮位合上了。拿印去开闸箱。正纹开，反纹死——别急。」",
      thought: "最后一寸，最容易错。",
      choices: [
        { id: "tideOpenOk", label: "正纹按涨潮印" },
        { id: "tideOpenBad", label: "反纹快开" },
        { id: "leave", label: "再看一眼" },
      ],
    };
  }
  if (has(f, "pzTidePage") && !has(f, "pzTideMatch")) {
    return {
      said: "「残页在你袖里。潮位表在盐牙颜牙处。合不上缝，我这儿开不了箱。」",
      thought: "他不跟你走。他守闸。",
      choices: [{ id: "leave", label: "去盐市" }],
    };
  }
  if (ctx.pick === "tideTake") {
    return {
      said: "「残页给你。别丢。盐市巷口颜牙有潮位表——对『涨』格，别对『落』。」",
      thought: "一页纸轻。一户人命重。",
      flags: ["pzTide1", "pzTidePage"],
      choices: [{ id: "leave", label: "去找颜牙" }],
    };
  }
  if (has(f, "pzTide1") && !has(f, "pzTidePage") && !has(f, "pzTideMatch")) {
    return {
      said: "「残页还在我这儿。要，就拿走；潮位表在盐牙处。」",
      thought: "",
      choices: [
        { id: "tideTake", label: "收下残页" },
        { id: "leave", label: "再等等" },
      ],
    };
  }
  if (ctx.pick === "ask" || ctx.pick === "ledger") {
    return {
      said: "「有户人家粮册被撕了一角。官说潮不对，就不放闸。残页在我这儿——潮位表在盐牙处。」",
      thought: "运河夜里响，响的是饿，不是粮。",
      flags: ["pzTide1"],
      choices: [
        { id: "tideTake", label: "收下残页" },
        { id: "leave", label: "先听河" },
      ],
    };
  }
  if (ctx.pick === "leave") {
    return { said: "「河还响着。人还饿着。」", thought: "" };
  }
  return {
    said: "「运河夜里比白天响。响的是粮，也是卡在闸箱里的命。」",
    thought: "河生的诗搁浅了。人还没搁浅。",
    choices: [
      { id: "ask", label: "闸箱的事" },
      { id: "leave", label: "路过" },
    ],
  };
}

/** 扬州·盐牙：潮位合缝（第二步） */
export function tideBrokerBeat(ctx: PuzzleCtx): PuzzleVoice | null {
  const f = ctx.flags;
  if (!has(f, "pzTidePage") || has(f, "pzTideMatch") || has(f, "pzTideDone")) return null;
  if (ctx.pick === "tideOk") {
    return {
      said: "「涨潮格。缝合了。拿这合缝印回去给河生开箱。」",
      thought: "颜牙把秤推开。秤下是潮，不是盐。",
      flags: ["pzTideMatch"],
    };
  }
  if (ctx.pick === "tideBad") {
    return {
      said: "「落潮格。缝死。你拿回去也开不了——除非再来对一次。」",
      thought: "错一格，饿一夜。",
      flags: ["pzTideFail"],
    };
  }
  if (ctx.pick === "tideTable") {
    return {
      said: "「潮位表在案上。河生那页，对涨还是对落。」",
      thought: "盐牙识潮，也识假账。这回只问潮。",
      choices: [
        { id: "tideOk", label: "对涨潮格" },
        { id: "tideBad", label: "对落潮格" },
        { id: "leave", label: "改日" },
      ],
    };
  }
  return null;
}

/** 少室/汴京·恩僧：山门→戒坛→后殿 三敲 */
export function echoMonkBeat(ctx: PuzzleCtx): PuzzleVoice {
  const f = ctx.flags;
  if (has(f, "pzEchoDone")) {
    return {
      said: "「钟序正了。岗不来，心也不躁。被乱除名的人，总算有人替他们敲对一声。」",
      thought: "他眼里仍有火。火压在钟里，不烫人，却烫理。",
    };
  }
  if (ctx.pick === "knockHall") {
    if (!has(f, "pzEchoAltar")) {
      return {
        said: "「后殿太早。岗当贼拿。」",
        thought: "钟不饶人。岗也不。",
        flags: ["pzEchoFail"],
        spar: "thug",
      };
    }
    return {
      said: "「山门、戒坛、后殿。你听得见潮，也听得见冤。」",
      thought: "和尚的怒意很静。静得像铁。",
      flags: ["pzEchoDone", "yamenPay10"],
    };
  }
  if (ctx.pick === "knockAltar") {
    if (!has(f, "pzEchoGate")) {
      return {
        said: "「戒坛在山门后。你跳步了。」",
        thought: "错一拍。",
        flags: ["pzEchoFail"],
        spar: "thug",
      };
    }
    return {
      said: "「戒坛应了。还差后殿一声。」",
      thought: "两声正。第三声最险。",
      flags: ["pzEchoAltar"],
      choices: [
        { id: "knockHall", label: "敲后殿" },
        { id: "knockGate", label: "再敲山门" },
        { id: "leave", label: "歇手" },
      ],
    };
  }
  if (ctx.pick === "knockGate") {
    if (has(f, "pzEchoGate") && !has(f, "pzEchoAltar")) {
      return {
        said: "「山门已应过。别回头乱敲——岗会听成暗号。」",
        thought: "重复是错序的一种。",
        flags: ["pzEchoFail"],
        spar: "thug",
      };
    }
    return {
      said: "「山门应了。下一记在戒坛。」",
      thought: "第一声对了。人还没松。",
      flags: ["pzEcho1", "pzEchoGate"],
      choices: [
        { id: "knockAltar", label: "敲戒坛" },
        { id: "knockHall", label: "敲后殿" },
        { id: "leave", label: "歇手" },
      ],
    };
  }
  if (ctx.pick === "knockBad") {
    return {
      said: "「错一拍。岗当贼拿。你自己应。」",
      thought: "钟不饶人。岗也不。",
      flags: ["pzEchoFail"],
      spar: "thug",
    };
  }
  if (has(f, "pzEchoAltar")) {
    return {
      said: "「戒坛已应。后殿那一记，敲正。」",
      thought: "",
      choices: [
        { id: "knockHall", label: "敲后殿" },
        { id: "leave", label: "歇手" },
      ],
    };
  }
  if (has(f, "pzEchoGate")) {
    return {
      said: "「山门已应。下一记戒坛。」",
      thought: "",
      choices: [
        { id: "knockAltar", label: "敲戒坛" },
        { id: "knockHall", label: "敲后殿" },
        { id: "leave", label: "歇手" },
      ],
    };
  }
  if (has(f, "pzEcho1") || ctx.pick === "bell") {
    return {
      said: "「三处钟。先山门，再戒坛，最后后殿。一记一记来——别一次报完。」",
      thought: "有人被衙门乱除名。钟还在替他们喊。",
      flags: ["pzEcho1"],
      choices: [
        { id: "knockGate", label: "敲山门" },
        { id: "knockAltar", label: "先敲戒坛" },
        { id: "knockHall", label: "先敲后殿" },
      ],
    };
  }
  if (ctx.pick === "ask") {
    return {
      said: "「寺里有人被乱除名。名没了，人还在。钟声替他们留一口气。你若肯听，我教你敲。」",
      thought: "他不求官。他求一声响得对。",
      flags: ["pzEcho1"],
      choices: [
        { id: "bell", label: "听钟序" },
        { id: "leave", label: "改日" },
      ],
    };
  }
  if (ctx.pick === "leave") {
    return { said: "「钟还悬着。冤也悬着。」", thought: "" };
  }
  return {
    said: "「受过皇恩的人，不该求大官。求一方安即可。可有人连安都求不到——名被衙门乱除了。」",
    thought: "小官也是官。除名的刀比大官更近。",
    choices: [
      { id: "ask", label: "除名的事" },
      { id: "leave", label: "告辞" },
    ],
  };
}

/** 洛阳·朱文渊：五印谜（须先听暗示） */
export function sealClerkPuzzleBeat(ctx: PuzzleCtx): PuzzleVoice | null {
  const f = ctx.flags;
  if (has(f, "pzSealDone") && (ctx.pick === "seal" || ctx.pick === "sealOk" || ctx.pick === "sealBad")) {
    return {
      said: "「库开了。脏印清了一角。被卡的卷宗，终于能见光。」",
      thought: "朱文渊不喜功。他喜卷上有人的名。",
    };
  }
  if (ctx.pick === "sealOk") {
    if (!has(f, "pzSealHint")) {
      return {
        said: "「你还没听暗示。乱摆会咬印。去桥头问驿使，或堂上问门正。」",
        thought: "他不放库。他放人先听清。",
        flags: ["pzSeal1"],
        choices: [
          { id: "leave", label: "去听暗示" },
          { id: "seal", label: "仍要试" },
        ],
      };
    }
    return {
      said: "「五印不同桌。你按暗示隔开了。库开。银给你——别声张。」",
      thought: "连环印卡的是冤案。解开是义。",
      flags: ["pzSealDone", "yamenPay9"],
    };
  }
  if (ctx.pick === "sealBad") {
    return {
      said: "「同桌了。印咬印。库死。你让卷宗再锁一夜。」",
      thought: "错一桌，误一案。",
      flags: ["pzSealFail"],
    };
  }
  if (ctx.pick === "seal" || (has(f, "pzSeal1") && !has(f, "pzSealDone") && ctx.pick !== "ask" && ctx.pick !== "slip" && ctx.pick !== "join")) {
    if (!has(f, "pzSealHint")) {
      return {
        said: "「五印不可同桌。暗示不在我嘴里——在桥头驿报、或堂上门正的闲话里。听清再摆。」",
        thought: "他恨官印连环卡人。恨归恨，还得教人先听。",
        flags: ["pzSeal1"],
        choices: [{ id: "leave", label: "去听暗示" }],
      };
    }
    return {
      said: "「你听见了：东印避西，南印让北，中印独坐。怎么摆。」",
      thought: "暗示已落。摆错仍是你的。",
      choices: [
        { id: "sealOk", label: "隔桌：东/西/南/北/中" },
        { id: "sealBad", label: "五印同桌快开" },
      ],
    };
  }
  return null;
}

/** 洛阳·门正/驿使：五印暗示（第二步） */
export function sealHintBeat(ctx: PuzzleCtx): PuzzleVoice | null {
  const f = ctx.flags;
  if (!has(f, "pzSeal1") || has(f, "pzSealHint") || has(f, "pzSealDone")) return null;
  if (ctx.pick !== "hint" && ctx.pick !== "sealHint") return null;
  return {
    said: "「东印避西，南印让北，中印独坐。谁同桌，谁咬死。你回去告诉案书吏。」",
    thought: "闲话里藏着开库的钥匙。",
    flags: ["pzSealHint"],
  };
}

/** 给门正/驿使菜单追加「五印暗示」选项。 */
export function sealHintChoice(flags: string[]): { id: string; label: string } | null {
  if (!has(flags, "pzSeal1") || has(flags, "pzSealHint") || has(flags, "pzSealDone")) return null;
  return { id: "hint", label: "五印暗示" };
}

const maskHeard = (f: string[]) => has(f, "pzMaskSalt") && has(f, "pzMaskSilk") && has(f, "pzMaskTea");

/** 垂街·摊婆：接假面谜 → 听三摊 → 回来认真嘴 */
export function maskHawkerBeat(ctx: PuzzleCtx & { hubOpen?: boolean }): PuzzleVoice | null {
  const f = ctx.flags;
  const hub = ctx.hubOpen ?? true;
  if (has(f, "pzMaskDone") && (ctx.pick === "mask" || ctx.pick === "maskTrue" || ctx.pick === "maskFalse")) {
    return {
      said: "「假面揭了。路引给你。那被讹的摊，今晚能睡个整觉。」",
      thought: "热饼能填肚。真话能救命。",
    };
  }
  if (ctx.pick === "maskTrue") {
    if (!maskHeard(f)) {
      return {
        said: "「三摊你还没听全。盐货摊、巷口婶、茶棚客——都问过，再来认。」",
        thought: "她不替你听。她只验你听没听。",
        flags: ["pzMask1"],
        choices: [{ id: "leave", label: "去听" }],
      };
    }
    return {
      said: "「盐牙那摊是真的。另两张嘴在骗路。拿着引，别跟人走岔。」",
      thought: "她眼里有火。火是替被讹的人烧的。",
      flags: ["pzMaskDone", "yamenPay7"],
    };
  }
  if (ctx.pick === "maskFalse") {
    return {
      said: "「你信错嘴了。假面笑你。岗也笑你。」",
      thought: "错信一次，有人要多挨一顿。",
      flags: ["pzMaskFail"],
      spar: "thug",
    };
  }
  if (ctx.pick === "mask" && !hub && !has(f, "pzMask1")) {
    return { said: "「过帖过册验契齐了，再跟你掰假面。早问，我怕你听岔。」", thought: "" };
  }
  if (has(f, "pzMask1") && maskHeard(f) && !has(f, "pzMaskDone")) {
    return {
      said: "「三摊你听过了。丝市说东有路，茶棚说西有渡，盐牙说北有引。哪张嘴是真的。」",
      thought: "假面不认人。认银。她认人。",
      choices: [
        { id: "maskFalse", label: "信丝市" },
        { id: "maskTrue", label: "信盐牙" },
        { id: "maskFalse", label: "信茶棚" },
      ],
    };
  }
  if (has(f, "pzMask1") && !has(f, "pzMaskDone")) {
    const bits = [
      has(f, "pzMaskSalt") ? "盐摊听过" : "盐货摊未问",
      has(f, "pzMaskSilk") ? "巷婶听过" : "巷口婶未问",
      has(f, "pzMaskTea") ? "茶客听过" : "茶棚客未问",
    ].join("；");
    return {
      said: `「还差耳朵。${bits}。听全了再来认真嘴。」`,
      thought: "她把饼翻了一面。热气像催人。",
      choices: [{ id: "leave", label: "去听" }],
    };
  }
  if (ctx.pick === "mask" || (has(f, "pzMask1") && ctx.pick === "maskAgain")) {
    return {
      said: "「三摊只有一真。你别在我这儿猜——去听：港湾货摊（盐）、巷口婶（丝市嘴）、茶棚里坐着的客（茶棚嘴）。听完回来认。」",
      thought: "假面不认人。认银。她认人。",
      flags: ["pzMask1"],
      choices: [{ id: "leave", label: "去听三摊" }],
    };
  }
  return null;
}

/** 三摊说辞：salt=真，silk/tea=假。仅在 pick=maskHear 时写入。 */
export function maskStallBeat(
  kind: "salt" | "silk" | "tea",
  ctx: PuzzleCtx,
): PuzzleVoice | null {
  const f = ctx.flags;
  if (!has(f, "pzMask1") || has(f, "pzMaskDone")) return null;
  const flag = kind === "salt" ? "pzMaskSalt" : kind === "silk" ? "pzMaskSilk" : "pzMaskTea";
  if (ctx.pick !== "maskHear") return null;
  if (has(f, flag)) {
    const said =
      kind === "salt"
        ? "「北引我说过了。你耳朵还在，就别再问第二遍。」"
        : kind === "silk"
          ? "「东边有路——我说过。信不信是你的事。」"
          : "「西渡我提过。茶凉了，话还热。」";
    return { said, thought: "重复的假面，也是假面。" };
  }
  if (kind === "salt") {
    return {
      said: "「北闸外有引。真的。盐秤不骗人——骗人的是嘴。」",
      thought: "货摊的人把秤砣一按。砣是实的。",
      flags: ["pzMaskSalt"],
    };
  }
  if (kind === "silk") {
    return {
      said: "「东边巷子通水路。信我，省半天脚——别去问盐摊，他们抠。」",
      thought: "婶的笑太满。满的地方多半空。",
      flags: ["pzMaskSilk"],
    };
  }
  return {
    said: "「西边有渡。昨夜人多往西。你也往西，别听盐牙瞎指路。」",
    thought: "茶客眼圈青。青的地方爱掺假。",
    flags: ["pzMaskTea"],
  };
}

export function maskStallChoice(flags: string[]): { id: string; label: string } | null {
  if (!has(flags, "pzMask1") || has(flags, "pzMaskDone")) return null;
  return { id: "maskHear", label: "听假面路引" };
}

/** 武馆·馆主：认火 → 取料 → 投料出刃 */
export function forgeCoachBeat(ctx: PuzzleCtx & { hubOpen?: boolean }): PuzzleVoice | null {
  const f = ctx.flags;
  const hub = ctx.hubOpen ?? true;
  if (has(f, "pzForgeDone") && (ctx.pick === "forge" || ctx.pick === "forgeOk" || ctx.pick === "forgeBad" || ctx.pick === "forgeFire")) {
    return {
      said: "「火认对了。材没废。那把要护命的刀，总算出得了炉。」",
      thought: "他不炫火。火认心。",
    };
  }
  if (ctx.pick === "forgeOutOk") {
    return {
      said: "「赤火投精材。出刃。你没糟蹋人家攒的料。」",
      thought: "错温废材。废的是一条命的本钱。",
      flags: ["pzForgeDone", "yamenPay7"],
    };
  }
  if (ctx.pick === "forgeOutBad") {
    return {
      said: "「火对了，料你投错温。焦渣一堆——像不像人家的指望。」",
      thought: "馆主嗓子硬。硬底下是惜。",
      flags: ["pzForgeFail"],
    };
  }
  if (has(f, "pzForgeMat") && has(f, "pzForgeFire") && !has(f, "pzForgeDone")) {
    return {
      said: "「料齐了。火你认过赤。投不投，出不出，在你一掌。」",
      thought: "砂坑边上的人，都屏着气。",
      choices: [
        { id: "forgeOutOk", label: "赤火投精材出刃" },
        { id: "forgeOutBad", label: "白火猛催" },
        { id: "leave", label: "再看一眼" },
      ],
    };
  }
  if (has(f, "pzForgeFire") && !has(f, "pzForgeMat")) {
    return {
      said: "「火色对了。精材在船坞/缆厂那边找船匠问——他识料，不识谎。」",
      thought: "认火只是一半。一半在料。",
      choices: [{ id: "leave", label: "去找船匠" }],
    };
  }
  if (ctx.pick === "forgeOk") {
    return {
      said: "「赤火。对。记下。去取精材，再回来投炉。」",
      thought: "青火炼皮，赤火炼骨，白火炼玄。精材认赤。",
      flags: ["pzForge1", "pzForgeFire"],
      choices: [{ id: "leave", label: "去取料" }],
    };
  }
  if (ctx.pick === "forgeBad") {
    return {
      said: "「火色错了。你先别碰炉——再认一遍，或改日。」",
      thought: "馆主嗓子硬。硬底下是惜。",
      flags: ["pzForgeFail"],
    };
  }
  if (ctx.pick === "forge" && !hub && !has(f, "pzForge1")) {
    return { said: "「炉口诀等你过了村口手续。早认火，废的是自己的性子。」", thought: "" };
  }
  if (ctx.pick === "forge" || (has(f, "pzForge1") && !has(f, "pzForgeFire") && !has(f, "pzForgeDone"))) {
    return {
      said: "「认火。青火炼皮，赤火炼骨，白火炼玄。精材认赤。你认哪色。」",
      thought: "有人把棺材本换成锻材。错一火，本就没了。",
      flags: ["pzForge1"],
      choices: [
        { id: "forgeBad", label: "青火" },
        { id: "forgeOk", label: "赤火" },
        { id: "forgeBad", label: "白火" },
      ],
    };
  }
  return null;
}

/** 船匠：炉温第二步取精材 */
export function forgeWrightBeat(ctx: PuzzleCtx): PuzzleVoice | null {
  const f = ctx.flags;
  if (!has(f, "pzForgeFire") || has(f, "pzForgeMat") || has(f, "pzForgeDone")) return null;
  if (ctx.pick !== "forgeMat") return null;
  return {
    said: "「精材一束。给馆主阿砂。别白火催——催了，料成渣，人成债。」",
    thought: "船匠认结，也认火。火不对，结也散。",
    flags: ["pzForgeMat"],
  };
}

export function forgeWrightChoice(flags: string[]): { id: string; label: string } | null {
  if (!has(flags, "pzForgeFire") || has(flags, "pzForgeMat") || has(flags, "pzForgeDone")) return null;
  return { id: "forgeMat", label: "取炉上精材" };
}

/** 船匠默认菜单上挂取料（未点选时）。 */
export function forgeWrightPrompt(flags: string[]): PuzzleVoice | null {
  if (!forgeWrightChoice(flags)) return null;
  return {
    said: "「武馆炉口缺料？我这儿有一束精材。你要，就拿走。」",
    thought: "",
    choices: [
      { id: "forgeMat", label: "取精材" },
      { id: "ask", label: "怎么才压得住" },
      { id: "leave", label: "改日" },
    ],
  };
}
