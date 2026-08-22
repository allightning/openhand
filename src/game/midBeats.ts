/**
 * 中后期戏眼对话 —— 建康门正、洛阳清党范围、汴街暗助、汴营帐前抉择。
 * 旗标要进主线/结局，不只是 flavor。
 */

import type { EnemyId, HeroId } from "./types";

export interface MidVoice {
  said: string;
  thought: string;
  flags?: string[];
  choices?: { id: string; label: string }[];
  spar?: EnemyId;
}

type Ctx = {
  hero?: HeroId;
  pick?: string;
  flags: string[];
  party?: string[];
};

function heroOf(ctx: Ctx): HeroId {
  return ctx.hero ?? "rail";
}

function has(ctx: Ctx, id: string): boolean {
  return ctx.flags.includes(id);
}

/** 建康·江晚涛：轨刃中段「门正不正」。 */
export function riverBladeBeat(ctx: Ctx): MidVoice {
  if (ctx.party?.includes("blade")) {
    return { said: "「刀还热。你先走。」", thought: "" };
  }
  if (has(ctx, "midDoorTrue") || has(ctx, "midDoorBent")) {
    if (ctx.pick === "join") {
      return { said: "「南下苏州，路上有人要刀。」", thought: "", flags: ["joinBlade"] };
    }
    const line = has(ctx, "midDoorTrue")
      ? "「门你没替人踹歪。航下这条路，认你。」"
      : "「门你踹歪过一回。刀还在，账也在。」";
    return {
      said: line,
      thought: has(ctx, "midDoorTrue") ? "正过的门，合页不响。" : "歪过的门，风会记得。",
      choices: [
        { id: "join", label: "请他同行" },
        { id: "leave", label: "自己试" },
      ],
    };
  }
  if (ctx.pick === "straight") {
    return {
      said: "「银不要了。那户人门口，你替他把合页按回去了。港律不是替人拆门的。」",
      thought: "踹正比踹开难。难才叫律。",
      flags: ["midDoorTrue", "taleJiankang"],
    };
  }
  if (ctx.pick === "bent") {
    return {
      said: "「银到了。门歪了。那户人以后进门，要侧身。」",
      thought: "银响一声。门歪一声。",
      flags: ["midDoorBent"],
      spar: "thug",
    };
  }
  if (ctx.pick === "door") {
    const h = heroOf(ctx);
    if (h === "seer") {
      return {
        said: "「有人雇我踹一扇『挡册』的门。册歪不歪，你比我懂。我只问：踹不踹。」",
        thought: "刀客把选择题推给你。",
        choices: [
          { id: "straight", label: "不踹。先对册" },
          { id: "bent", label: "踹开再查" },
          { id: "leave", label: "不掺和" },
        ],
      };
    }
    if (h === "sapper") {
      return {
        said: "「有人雇我踹一扇欠粮的门。粮还没到，门先歪——像不像你们厂里那种事。」",
        thought: "他把航边的门说成桩。",
        choices: [
          { id: "straight", label: "先讨粮，别拆门" },
          { id: "bent", label: "踹开要粮" },
          { id: "leave", label: "不掺和" },
        ],
      };
    }
    return {
      said: "「有人丢了三两银，要我把对家的门踹歪泄愤。你若跟我去——门踹正，还是踹歪。」",
      thought: "朱雀航的风，专吹合页。",
      choices: [
        { id: "straight", label: "踹正：替人合上门" },
        { id: "bent", label: "踹歪：拿这三两" },
        { id: "leave", label: "不掺和" },
      ],
    };
  }
  if (ctx.pick === "join") {
    return {
      said: "「先把航边这扇门的事说清。同路不收糊人。」",
      thought: "刀客要先看你怎么踹门。",
      choices: [
        { id: "door", label: "什么门" },
        { id: "leave", label: "改日" },
      ],
    };
  }
  if (ctx.pick === "leave") {
    return { said: "「航还在。门也在。」", thought: "" };
  }
  return {
    said: "「朱雀航下好试刀。试刀之前，先试门——有人出银，要我踹歪一扇门。」",
    thought: "建康不闲。闲的是不问合页的人。",
    choices: [
      { id: "door", label: "什么门" },
      { id: "join", label: "请他同行" },
      { id: "leave", label: "自己试" },
    ],
  };
}

/** 洛阳·洛司：清党范围二选一，都给 purgeReady。 */
export function judgePurgeBeat(ctx: Ctx): MidVoice {
  if (has(ctx, "purgeReady")) {
    const tone = has(ctx, "purgeWash")
      ? "「洗城令已出。街坊会恨你一夜，也会怕你三年。」"
      : "「挪页令已出。名还在册上，只是换了正确的页。」";
    return { said: tone, thought: has(ctx, "purgeWash") ? "刀快。页薄。" : "页重。刀慢。" };
  }
  if (!has(ctx, "caseRebel")) {
    return {
      said: "「洛阳认律，不认情。案未齐，令不下。」",
      thought: "",
      choices: [{ id: "leave", label: "告退" }],
    };
  }
  if (ctx.pick === "wash") {
    return {
      said: "「洗城。凡名在脏页上的，一并勾。官印半枚，够进营门——也够让民心记你一刀。」",
      thought: "清得快。污得也快。",
      flags: ["purgeReady", "roadUsurp", "purgeWash"],
    };
  }
  if (ctx.pick === "move") {
    return {
      said: "「挪页。脏名挪回正页，活人留缝。官印半枚，够进营门——慢，却不把城洗成白纸。」",
      thought: "谶师的刀，最好只改页码。",
      flags: ["purgeReady", "roadUsurp", "purgeMove"],
    };
  }
  if (ctx.pick === "ask") {
    return {
      said: "「按律铲除。你要快，还是要准——洗城勾名，或把名字挪回正确的页。」",
      thought: "洛司把印推到你面前。印是选择题。",
      choices: [
        { id: "wash", label: "请令·洗城" },
        { id: "move", label: "请令·挪页" },
        { id: "leave", label: "再想想" },
      ],
    };
  }
  return {
    said: "「洛阳认律，不认情。」",
    thought: "",
    choices: [
      { id: "ask", label: "请令清党" },
      { id: "leave", label: "告退" },
    ],
  };
}

/** 汴京·工部桩手：皇恩要问实，不自动盖章。 */
export function worksmanBeat(ctx: Ctx): MidVoice {
  if (has(ctx, "graceKnown")) {
    return {
      said: has(ctx, "midGrainProof")
        ? "「粮册你对过了。宦门那条路，别硬闯——硬闯的人最后也克粮。」"
        : "「皇恩你听过。最好再去粮仓门口看一眼空不空。」",
      thought: "",
    };
  }
  if (ctx.pick === "proof") {
    return {
      said: "「御街东侧旧仓，去年冬放过赈。仓门还留印泥。你去看过，才算记得皇恩，不是听人说。」",
      thought: "桩手把恩折成脚印。",
      flags: ["graceKnown", "midGrainProof"],
    };
  }
  if (ctx.pick === "hear") {
    return {
      said: "「工部修桥，圣上发过粮。我们欠他一条命——你若只听这句话，也算听过。」",
      thought: "听过和看过，差一仓米。",
      flags: ["graceKnown"],
    };
  }
  if (ctx.pick === "leave") {
    return { said: "「桩还在官道上。」", thought: "" };
  }
  return {
    said: "「工部的人信桩，也信仓。皇恩两个字，你是听一句，还是去仓门对一眼。」",
    thought: "桩钉进官道。也进人心。",
    choices: [
      { id: "proof", label: "去对粮仓印泥" },
      { id: "hear", label: "听一句就够" },
      { id: "leave", label: "路过" },
    ],
  };
}

/** 汴京·宦门人：奸臣方向 + 暗助/嚷破。 */
export function eunuchBeat(ctx: Ctx): MidVoice {
  if (has(ctx, "traitorSeen")) {
    if (has(ctx, "aidDark")) {
      return { said: "「……你选择不嚷。营外动手，御街少死人。」", thought: "他松了半口气。" };
    }
    if (has(ctx, "aidOpen")) {
      return { said: "「你嚷出去了。街坊今夜睡不着。营门也会加岗。」", thought: "他缩得更紧。" };
    }
    return { said: "「……你看见了。别在御街嚷。」", thought: "他怕。" };
  }
  if (ctx.pick === "dark") {
    return {
      said: "「好。话到此为止。营在城外东北。你若暗助清君，别打旗——打旗的人最后也克粮。」",
      thought: "漏的半句，被你接成暗线。",
      flags: ["traitorSeen", "roadUsurp", "aidDark"],
    };
  }
  if (ctx.pick === "open") {
    return {
      said: "「你——！算了。营在城外。你要嚷，就去营门口嚷。御街的人会先恨你一夜。」",
      thought: "半句被你扯成整旗。",
      flags: ["traitorSeen", "roadUsurp", "aidOpen"],
    };
  }
  if (ctx.pick === "ask") {
    const h = heroOf(ctx);
    if (h === "sapper") {
      return {
        said: "「有人要替圣上……不，要替自己换印。营在城外。你是悄悄去，还是当街喊开。」",
        thought: "宦门人把刀柄递过来。柄上有粮的气味。",
        flags: ["midEunuchAsked"],
        choices: [
          { id: "dark", label: "暗助。不打旗" },
          { id: "open", label: "当街揭开" },
          { id: "leave", label: "让开" },
        ],
      };
    }
    return {
      said: "「有人要替圣上……不，要替自己换印。营在城外。」",
      thought: "话漏了半句。半句够用。",
      flags: ["traitorSeen", "roadUsurp"],
      choices: [
        { id: "dark", label: "记下。不嚷" },
        { id: "open", label: "我去揭" },
        { id: "leave", label: "让开" },
      ],
    };
  }
  if (ctx.pick === "leave" && has(ctx, "midEunuchAsked") && !has(ctx, "traitorSeen")) {
    return {
      said: "「……你看见了方向，却没表态。想清再来。营门不认含糊的人。」",
      thought: "半句搁在喉咙里。营还远。",
      flags: ["traitorSeen"],
    };
  }
  return {
    said: "「御街不是你站的地方。」",
    thought: "",
    choices: [
      { id: "ask", label: "奸臣在哪" },
      { id: "leave", label: "让开" },
    ],
  };
}

/** 汴营帐外：打 boss 前的站队。不影响进帐，影响结局语气。 */
export function campHeraldBeat(ctx: Ctx): MidVoice {
  if (has(ctx, "campJoin") || has(ctx, "campRefuse") || has(ctx, "campShadow")) {
    const said = has(ctx, "campJoin")
      ? "「旗已递过。帐里等你——或等你的刀。」"
      : has(ctx, "campShadow")
        ? "「你不接旗。帐门仍开。影子里的刀，有时比旗稳。」"
        : "「你拒了旗。正帐的人听见了。刀会更快。」";
    return { said, thought: "" };
  }
  if (ctx.pick === "join") {
    return {
      said: "「好。替天的旗给你半角。进帐之后，门就很难踹回原样。」",
      thought: "旗一入手，合页生锈。",
      flags: ["campJoin"],
    };
  }
  if (ctx.pick === "refuse") {
    return {
      said: "「……怕也好。正帐见。」",
      thought: "拒旗的人，帐里更恨。",
      flags: ["campRefuse"],
    };
  }
  if (ctx.pick === "shadow") {
    return {
      said: "「不接旗，只清人？可以。帐门不拦影子。」",
      thought: "暗助的路，旗上看不见。",
      flags: ["campShadow"],
    };
  }
  const h = heroOf(ctx);
  if (h === "sapper") {
    return {
      said: "「营门认刀，也认旗。你要接替天半旗，拒了走正帐，还是不打旗只清克粮的人。」",
      thought: "旗下有没有米，比旗上写什么要紧。",
      choices: [
        { id: "shadow", label: "不打旗。只清人" },
        { id: "refuse", label: "拒旗。进帐" },
        { id: "join", label: "接半旗" },
      ],
    };
  }
  if (h === "seer") {
    return {
      said: "「营门问你：名上站哪一页。接旗、拒旗，或影子里执行洛司的令。」",
      thought: "页码在帐外就要选定。",
      choices: [
        { id: "shadow", label: "影子执行" },
        { id: "refuse", label: "拒旗。按律" },
        { id: "join", label: "接旗观变" },
      ],
    };
  }
  return {
    said: "「夺玺的人在正帐。帐外先问你：入伙接旗，拒旗进帐，还是连旗都不碰。」",
    thought: "替天两个字，风一吹就散。门还在。",
    choices: [
      { id: "refuse", label: "拒旗。门要正" },
      { id: "shadow", label: "不碰旗。只救人" },
      { id: "join", label: "接旗入伙" },
    ],
  };
}
