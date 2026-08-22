/**
 * 中后期指名短案 —— 扬州盐册、苏州丝债、宿迁粥碑、亳州批红、
 * 汴京三认、营帐副将、结局择要。不拆前期 hub。
 */

import type { EnemyId, HeroId } from "./types";

export interface CaseVoice {
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
  beaten?: string[];
};

function has(ctx: Ctx, id: string): boolean {
  return ctx.flags.includes(id);
}

function heroOf(ctx: Ctx): HeroId {
  return ctx.hero ?? "rail";
}

/** 扬州·盐册吏：伪账曝光 / 封口银。 */
export function saltClerkBeat(ctx: Ctx): CaseVoice {
  if (has(ctx, "midSaltLedger") || has(ctx, "midSaltMute")) {
    if (has(ctx, "midSaltLedger")) {
      return {
        said: "「账已经亮了。运河帮记仇，也记你这一刀。」",
        thought: "伪账一揭，灶火会抖一夜。",
      };
    }
    return {
      said: "「银进袖，嘴就缝上。盐市今夜安静得像没发生过。」",
      thought: "安静有价。价比盐贵。",
    };
  }
  if (ctx.pick === "expose") {
    return {
      said: "「你把伪账钉在闸柱上。帮里的人看见了——他们要刀，不要理。」",
      thought: "亮账比亮刀更疼。",
      flags: ["midSaltAsk", "midSaltLedger"],
      spar: "mob_canal_03",
    };
  }
  if (ctx.pick === "bribe") {
    return {
      said: "「三两封口。账页进河。谁也别再提扬州盐灶的假数。」",
      thought: "银响一声。账沉一声。",
      flags: ["midSaltAsk", "midSaltMute", "yamenPay8"],
    };
  }
  if (ctx.pick === "ask" || has(ctx, "midSaltAsk")) {
    if (ctx.pick === "ask" && !has(ctx, "midSaltAsk")) {
      return {
        said: "「盐引册上有两套数。一套进官仓，一套进私船。你要曝光，还是拿封口银走人。」",
        thought: "秤上有鬼。鬼会咬人。",
        flags: ["midSaltAsk"],
        choices: [
          { id: "expose", label: "曝光伪账" },
          { id: "bribe", label: "收封口银" },
          { id: "leave", label: "先不问" },
        ],
      };
    }
    return {
      said: "「两套数还在。你选：钉闸柱，还是进袖口。」",
      thought: "盐吏把选择题推回来。",
      choices: [
        { id: "expose", label: "曝光伪账" },
        { id: "bribe", label: "收封口银" },
        { id: "leave", label: "改日" },
      ],
    };
  }
  if (ctx.pick === "leave") {
    return { said: "「账页不会自己走路。」", thought: "" };
  }
  return {
    said: "「扬州盐船连着汴京的灶。灶上有假数，船就不会安。」",
    thought: "盐市的笔，比刀尖细。",
    choices: [
      { id: "ask", label: "盐册怎假" },
      { id: "leave", label: "路过" },
    ],
  };
}

/** 苏州·丝债：还名 / 卖名。 */
export function silkDebtBeat(ctx: Ctx): CaseVoice {
  if (has(ctx, "midSilkDebt") || has(ctx, "midSilkSell")) {
    if (has(ctx, "midSilkDebt")) {
      return {
        said: "「名回到册上了。孩子能进阊门，不用再躲丝市巷。」",
        thought: "还名比还银重。",
      };
    }
    return {
      said: "「名卖了。银响。那孩子的字，从今只写在你袖里的借条上。」",
      thought: has(ctx, "midSilkSold") ? "卖名的银，烫手。" : "名出了册，人就悬着。",
    };
  }
  if (ctx.pick === "restore") {
    return {
      said: "「逃册的名，我替你写回正页。丝债清一半——另一半是人情。」",
      thought: "笔一落，门就开。",
      flags: ["midSilkAsk", "midSilkDebt", "yamenPay6"],
    };
  }
  if (ctx.pick === "sell") {
    return {
      said: "「名可以卖。银给你。那孩子从此是无名人——无名人过不了城门，过得了刀。」",
      thought: "银买得了名。买不了门正。",
      flags: ["midSilkAsk", "midSilkSell", "midSilkSold", "yamenPay14"],
    };
  }
  if (ctx.pick === "ask" || has(ctx, "midSilkAsk")) {
    return {
      said: "「有本逃册落在丝市。债主要名，孩子要活。你把名还回去，还是把名卖掉换银。」",
      thought: "软绸也能勒人。",
      flags: has(ctx, "midSilkAsk") ? undefined : ["midSilkAsk"],
      choices: [
        { id: "restore", label: "还名入册" },
        { id: "sell", label: "卖名换银" },
        { id: "leave", label: "不掺和" },
      ],
    };
  }
  if (ctx.pick === "leave") {
    return { said: "「丝还挂着。名还悬着。」", thought: "" };
  }
  return {
    said: "「阊门绸软。软处夹着一本逃册——债主找了三年。」",
    thought: "丝市不卖人。有时卖名。",
    choices: [
      { id: "ask", label: "逃册的事" },
      { id: "leave", label: "路过" },
    ],
  };
}

/** 宿迁·碑下粥：施粥 / 夺刀；软逾期。 */
export function gruelCookBeat(ctx: Ctx): CaseVoice {
  if (has(ctx, "midSuqianFail")) {
    return {
      said: "「粥凉了。碑下那袋粮，也进了别人腰。你来晚一步。」",
      thought: "故里碑不认迟脚。",
    };
  }
  if (has(ctx, "midSuqianGruel")) {
    return {
      said: "「粥热着。碑下那户人，今晚能睡。」",
      thought: "一勺粥，比一刀轻。",
    };
  }
  if (has(ctx, "midSuqianBlade") && (ctx.beaten?.includes("riverThug") || ctx.beaten?.includes("mob_canal_05"))) {
    return {
      said: "「闲刀倒了。粮袋在他腰上。碑下又能支锅。」",
      thought: "刀清了，粥才香。",
      flags: ["midSuqianGruel", "sideRiverDone"],
    };
  }
  // 软逾期：开案后若已打过不少人仍未结，粥案冷掉
  if (
    has(ctx, "midSuqianOpen") &&
    !has(ctx, "midSuqianGruel") &&
    !has(ctx, "midSuqianBlade") &&
    (ctx.beaten?.length ?? 0) >= 6
  ) {
    return {
      said: "「你在别处动刀动得勤。碑下的粥等不了。粮被摸走了。」",
      thought: "故里不等远客。",
      flags: ["midSuqianFail"],
    };
  }
  if (ctx.pick === "feed") {
    return {
      said: "「你把粥舀给碑下那户。粮贼没敢伸手——粥香压过刀腥。」",
      thought: "施粥是案，也是盾。",
      flags: ["midSuqianOpen", "midSuqianGruel", "sideRiver", "yamenPay7"],
    };
  }
  if (ctx.pick === "blade") {
    return {
      said: "「你去夺刀。岸边那人腰上挂着粮袋——他不认粥，只认刃。」",
      thought: "夺刀比施粥响。",
      flags: ["midSuqianOpen", "midSuqianBlade", "sideRiver"],
      spar: "mob_canal_05",
    };
  }
  if (ctx.pick === "ask" || has(ctx, "midSuqianOpen")) {
    return {
      said: "「碑下有人偷粮。锅还热，袋已空。你是施一勺压场，还是去岸边夺刀。」",
      thought: "项王故里，粥比碑硬。",
      flags: has(ctx, "midSuqianOpen") ? undefined : ["midSuqianOpen"],
      choices: [
        { id: "feed", label: "施粥压场" },
        { id: "blade", label: "夺刀追袋" },
        { id: "leave", label: "先喝一碗" },
      ],
    };
  }
  if (ctx.pick === "leave") {
    return { said: "「粥还热着。别凉了。」", thought: "" };
  }
  // 保留旧 sideRiver 结案口
  if (has(ctx, "sideRiverDone")) {
    return { said: "「盐袋回了。粥里也咸得刚好。」", thought: "" };
  }
  if (has(ctx, "sideRiver") && (ctx.beaten?.includes("riverThug") || ctx.beaten?.includes("mob_canal_05"))) {
    return {
      said: "「闲刀倒了。盐袋在他腰上。谢你。」",
      thought: "",
      flags: ["sideRiverDone"],
    };
  }
  return {
    said: "「项王碑下卖粥。北去宿州，粥还热着——热处有人偷粮。」",
    thought: "渡口厨的勺，比刀先响。",
    choices: [
      { id: "ask", label: "碑下怎不安" },
      { id: "leave", label: "先喝一碗" },
    ],
  };
}

/** 亳州·药铺：批红真伪。正确页助谶师后线。 */
export function herbDocCaseBeat(ctx: Ctx): CaseVoice {
  if (has(ctx, "midHerbPage") || has(ctx, "midHerbWrong")) {
    if (has(ctx, "midHerbPage")) {
      return {
        said: "「批红对了。洛阳那卷，你会少走一页错路。」",
        thought: "药香里藏着案香。",
      };
    }
    return {
      said: "「批红抄错了。以后洛阳案上，你要自己擦眼睛。」",
      thought: "错页不疼。错名才疼。",
    };
  }
  if (ctx.pick === "right") {
    return {
      said: "「朱笔落在『缓』字格。不是『急』。你抄对了——洛阳谶案会认这一笔。」",
      thought: "一格之差，半城之命。",
      flags: ["midHerbAsk", "midHerbPage", "yamenPay5"],
    };
  }
  if (ctx.pick === "wrong") {
    return {
      said: "「你把『急』抄成正批。假红进袖。真红进灰。」",
      thought: "药铺不判案。案会判你。",
      flags: ["midHerbAsk", "midHerbWrong"],
    };
  }
  if (ctx.pick === "ask" || has(ctx, "midHerbAsk")) {
    return {
      said: "「有人拿假批红来换药。真红在『缓』字格。你帮我对，还是随手抄一笔。」",
      thought: "药香压刀香。墨香压假印。",
      flags: has(ctx, "midHerbAsk") ? undefined : ["midHerbAsk"],
      choices: [
        { id: "right", label: "对『缓』格真红" },
        { id: "wrong", label: "随手抄『急』" },
        { id: "leave", label: "不碰朱笔" },
      ],
    };
  }
  if (ctx.pick === "patient") {
    return {
      said: "「西去路上有人腿伤。药我有，脚力他没有。你若遇见，叫他来涡水驿。」",
      thought: "",
      flags: ["sidePatient"],
    };
  }
  if (ctx.pick === "leave") {
    return { said: "「药柜还锁着。」", thought: "" };
  }
  return {
    said: "「亳州药香压刀香。柜上有一页批红——真假未辨。」",
    thought: "先生的手，又抓药又抓笔。",
    choices: [
      { id: "ask", label: "辨批红" },
      { id: "patient", label: "可有托付" },
      { id: "leave", label: "路过" },
    ],
  };
}

/**
 * 临安茶里圣上：信 / 疑 / 弃。
 * throneTrue · viewThroneDoubt · throneAbandon
 */
export function throneTeaBeat(ctx: Ctx & { party?: string[] }): CaseVoice {
  if (ctx.party?.includes("bard")) {
    return { said: "「说书的跟你走。茶钱以后再算。」", thought: "" };
  }
  if (has(ctx, "throneAbandon")) {
    return {
      said: "「你弃了茶里的圣上。营照旧在汴京外——你若去，是为门，不为旗。」",
      thought: "弃茶的人，帐外脚步更轻。",
    };
  }
  if (has(ctx, "throneTrue") && ctx.pick !== "join" && ctx.pick !== "leave" && ctx.pick !== "doubt" && ctx.pick !== "abandon") {
    const choices = [
      { id: "join", label: "请他同行" },
      { id: "doubt", label: "茶里会不会是假话" },
      { id: "abandon", label: "我不认这碗茶" },
      { id: "leave", label: "你留临安" },
    ];
    if (has(ctx, "viewThroneDoubt")) {
      return {
        said: "「你疑过茶。营还在。同路满七人就别硬拉。」",
        thought: "疑过的路，脚更稳。",
        choices: choices.filter((c) => c.id !== "doubt"),
      };
    }
    return {
      said: "「圣上的名声你已听过。营在汴京城外。我可同路——同路最多七人，你自己掂量。」",
      thought: "说书的把刀指远了。",
      choices,
    };
  }
  if (ctx.pick === "doubt") {
    const h = heroOf(ctx);
    if (h === "seer") {
      return {
        said: "「假话也入得了民心。民心入案，才叫证据。你若只听茶，洛阳的批红会笑你。」",
        thought: "说书人怕谶师，也敬谶师。",
        flags: ["throneTrue", "roadUsurp", "viewThroneDoubt"],
      };
    }
    if (h === "sapper") {
      return {
        said: "「假话填不饱肚子。真假到汴京粮仓门口一对，便知。营外抢粮的，多半不是圣上的人。」",
        thought: "他把庙堂折成米仓。",
        flags: ["throneTrue", "roadUsurp", "viewThroneDoubt"],
      };
    }
    return {
      said: "「假话也能叫人踹错门。你若听了假的去替天，门就再也踹不回原样。真假你自己去营门口看——看完再决定踢哪边。」",
      thought: "港律不怕听谣。怕听完就站队。",
      flags: ["throneTrue", "roadUsurp", "viewThroneDoubt"],
    };
  }
  if (ctx.pick === "abandon") {
    return {
      said: "「……好。茶泼了。你不认圣上，也不认夺玺的旗。你只认自己要踹的那扇门。」",
      thought: "弃茶不是反。是不把茶当令。",
      flags: ["throneAbandon", "roadUsurp"],
    };
  }
  if (ctx.pick === "join") {
    return { said: "「那走。舌尖也是刀。」", thought: "", flags: ["joinBard", "throneTrue", "roadUsurp"] };
  }
  if (ctx.pick === "leave") {
    return { said: "「茶还热着。」", thought: "" };
  }
  if (ctx.pick === "ask") {
    return {
      said: "「当今圣上减税开仓。夺玺的才是乱臣。钱塘门外都这么说——门口的人都这么说，不一定门口的人都对。」",
      thought: "茶里有刀。刀指汴京城外。刀背也刮人。",
      flags: ["throneTrue", "roadUsurp"],
      choices: [
        { id: "doubt", label: "若是假话呢" },
        { id: "abandon", label: "我不认这碗茶" },
        { id: "join", label: "请他同行" },
        { id: "leave", label: "先听着" },
      ],
    };
  }
  return {
    said: "「临安茶贵。贵在听得见庙堂，也贵在听得见自己信不信庙堂。」",
    thought: "说书人把碗推过来。碗里是选择。",
    choices: [
      { id: "ask", label: "圣上怎样" },
      { id: "leave", label: "先听着" },
    ],
  };
}

/** 洛阳案书：翻错页软折。 */
export function caseWrongPageBeat(ctx: Ctx): CaseVoice {
  if (has(ctx, "midCaseSlip") && !has(ctx, "caseRebel")) {
    return {
      said: "「你翻错过一页。墨未干处，多了一道折。往下挖要更小心。」",
      thought: "错页不拦路。拦的是粗心。",
      choices: [
        { id: "ask", label: "继续查" },
        { id: "leave", label: "先收" },
      ],
    };
  }
  if (ctx.pick === "slip") {
    return {
      said: "「你把邻案的批红当成谋逆页。折了一角。案还能挖——只是多了一道疤。」",
      thought: "软折。不封门。",
      flags: ["midCaseSlip", "caseSuspect"],
      choices: [
        { id: "ask", label: "改翻正页" },
        { id: "leave", label: "先收" },
      ],
    };
  }
  return {
    said: "「天津桥北那宗案，缺一页批红。你要往下挖，也别把邻案翻成正卷。」",
    thought: "墨未干。名未定。",
    flags: ["caseSuspect"],
    choices: [
      { id: "ask", label: "往下挖" },
      { id: "slip", label: "先翻邻案碰碰运气" },
      { id: "leave", label: "先收" },
    ],
  };
}

/** 汴京·仓门认粮。 */
export function bianGrainDoorBeat(ctx: Ctx): CaseVoice {
  if (has(ctx, "midBianGrain")) {
    return {
      said: "「仓门印泥你对过了。空仓的年，民心比刀快。」",
      thought: "粮门一认，皇恩有脚。",
    };
  }
  if (ctx.pick === "look") {
    return {
      said: "「去年冬赈的印泥还在门框。印浅，人记得。你算认过汴京的粮。」",
      thought: "脚印比口号沉。",
      flags: ["midBianGrain", "midGrainProof"],
    };
  }
  if (ctx.pick === "leave") {
    return { said: "「仓门不等人。」", thought: "" };
  }
  return {
    said: "「御街东旧仓。门框上有印泥。你要认粮，就过来看一眼。」",
    thought: "仓门不问旗。问空不空。",
    choices: [
      { id: "look", label: "对仓门印泥" },
      { id: "leave", label: "路过" },
    ],
  };
}

/** 汴京·鼓吏认声。 */
export function bianDrumBeat(ctx: Ctx): CaseVoice {
  if (has(ctx, "midBianDrum")) {
    return {
      said: "「鼓点你听过了。营啸和官鼓，不是一个腔。」",
      thought: "耳比眼先到营门。",
    };
  }
  if (ctx.pick === "listen") {
    return {
      said: "「三通官鼓，一通营啸。你记下了——进帐前，别把啸当鼓。」",
      thought: "鼓吏不递刀。递节奏。",
      flags: ["midBianDrum"],
    };
  }
  if (ctx.pick === "leave") {
    return { said: "「鼓槌还搁着。」", thought: "" };
  }
  return {
    said: "「御街鼓楼。官鼓与营啸差半拍。你听不听。」",
    thought: "半拍之差，站队之差。",
    choices: [
      { id: "listen", label: "听三通鼓" },
      { id: "leave", label: "不听" },
    ],
  };
}

/** 汴京·无名民认心。 */
export function bianNamelessBeat(ctx: Ctx): CaseVoice {
  if (has(ctx, "midBianName")) {
    return {
      said: "「你问过无名的人。他们不认旗，认粥棚还在不在。」",
      thought: "无名的心，比有名的印真。",
    };
  }
  if (ctx.pick === "ask") {
    return {
      said: "「我们没名。名在册上的人夺玺、清党。我们只问：明天还有没有粥。」",
      thought: "一问粥，三观落地。",
      flags: ["midBianName"],
    };
  }
  if (ctx.pick === "leave") {
    return { said: "「……」", thought: "无名的人，话也省。" };
  }
  return {
    said: "「御街边蹲着的人，册上没有。你要问，就问粥。」",
    thought: "有名问旗。无名问粮。",
    choices: [
      { id: "ask", label: "明天还有粥吗" },
      { id: "leave", label: "不打扰" },
    ],
  };
}

/** 汴营·副将：帐前抉择回声。 */
export function campLieutenantBeat(ctx: Ctx): CaseVoice {
  if (has(ctx, "campJoin")) {
    return {
      said: "「你接过半旗。正帐的人把你当自己人——自己人刀更快，也更近。」",
      thought: "旗角还在袖里发热。",
    };
  }
  if (has(ctx, "campShadow")) {
    return {
      said: "「你不打旗。副将认影子。进帐之后，别站在灯下。」",
      thought: "影子里的刀，不写在旗上。",
    };
  }
  if (has(ctx, "campRefuse")) {
    return {
      said: "「你拒了旗。正帐听见了。门开着，恨也开着。」",
      thought: "拒旗的人，帐里不留情。",
    };
  }
  if (ctx.pick === "echo") {
    const h = heroOf(ctx);
    if (h === "seer") {
      return {
        said: "「帐外传令问过你页码。你还没答——或答了，副将只重复一遍：接旗、拒旗、影子。」",
        thought: "回声比令尖。",
        choices: [
          { id: "leave", label: "进帐" },
        ],
      };
    }
    return {
      said: "「传令的话，我再说一遍。接旗入伙，拒旗进帐，或不碰旗只清人——你若已定，正帐在里。」",
      thought: "副将不替你选。只替风留一句。",
      choices: [{ id: "leave", label: "知道了" }],
    };
  }
  if (ctx.pick === "leave") {
    return { said: "「正帐朱红。刀影重。」", thought: "" };
  }
  return {
    said: "「帐外传令问过站队。副将在此——你若还没想清，先别进。」",
    thought: "更深一层的回声。",
    choices: [
      { id: "echo", label: "再说一遍" },
      { id: "leave", label: "进帐" },
    ],
  };
}

/** 结局主句：身份命运（可单测）。 */
export function endingLead(hero: HeroId, flags: string[]): string {
  const has = (id: string) => flags.includes(id);
  if (hero === "seer") {
    if (has("purgeWash")) {
      return "夺玺者倒下。洗城令兑现了。朝廷授你将军印——街坊怕你，也恨你。你留下，镇一方刀兵。";
    }
    if (has("purgeMove")) {
      return "夺玺者倒下。挪页令兑了。朝廷授你将军印。名还在册上，人还在城里。你留下，镇一方刀兵。";
    }
    if (has("campShadow")) {
      return "夺玺者倒下。你未请令，只在帐外做影子。朝廷仍授印——印上却缺半枚律。夜里页码会问你。";
    }
    if (has("campJoin")) {
      return "夺玺者倒下。你曾在帐外接过半旗。将军印很重，夜里会问你页码站在哪一边。";
    }
    return "夺玺者倒下。令未请齐，营却破了。朝廷授你将军印——印来得快，案底却虚。你留下，镇一方刀兵。";
  }
  if (hero === "sapper") {
    if (has("aidOpen")) {
      return "夺玺者倒下。旗你嚷过，粮也惊过。圣上略赐官身。你不做大官，却要先把吓跑的米安回去。";
    }
    if (has("campJoin") && !has("aidDark")) {
      return "夺玺者倒下。帐外接过半旗。圣上略赐官身。工寮的契好盖，营啸的回音却难消。";
    }
    if (has("midGrainProof") && (has("aidDark") || has("campShadow"))) {
      return "夺玺者倒下。仓门印泥还在，旗你没打。圣上略赐官身。你把桩钉在能站住人的地方。";
    }
    if (has("aidDark")) {
      return "夺玺者倒下。暗助清了君侧。圣上略赐官身。你不做大官，安定一方。";
    }
    if (has("graceKnown") && !has("midGrainProof")) {
      return "夺玺者倒下。皇恩你只听过粥棚一句。圣上略赐官身。小官的印泥不香——你还欠仓门一眼。";
    }
    return "夺玺者倒下。圣上略赐官身。你不做大官，安定一方。";
  }
  if (has("campJoin")) {
    return "夺玺者倒下。你接过替天半旗，又亲手拆了旗。封赏你仍拒了——门却难再踹回全正。";
  }
  if (has("midDoorBent") && has("viewThroneDoubt")) {
    return "夺玺者倒下。航下那扇门曾踹歪，茶里的话你也疑过。封赏你拒了。刀收回鞘，合页还在响。";
  }
  if (has("midDoorBent")) {
    return "夺玺者倒下。航下的门你踹歪过。封赏你拒了。刀收回鞘——合页吱呀，像记着那一脚。";
  }
  if (has("midDoorTrue") && has("throneAbandon")) {
    return "夺玺者倒下。门你踹正，茶你泼了。封赏你拒了。刀收回鞘，人隐进江湖——不认旗，只认门。";
  }
  if (has("midDoorTrue")) {
    return "夺玺者倒下。航下的门你踹正过。封赏你拒了。刀收回鞘，人隐进江湖。";
  }
  return "夺玺者倒下。封赏你拒了。刀收回鞘，人隐进江湖。";
}

/** 结局择要：专属钩先钉 1 条，再补 1–2 条通用。 */
export function endingSummary(flags: string[], hero: string): string[] {
  const lines: string[] = [];
  const has = (id: string) => flags.includes(id);
  const pinned: string[] = [];

  if (hero === "rail") {
    if (has("midDoorTrue")) pinned.push("建康航下，你把门踹正了。");
    else if (has("midDoorBent")) pinned.push("建康航下，你把门踹歪了。");
  }
  if (hero === "seer") {
    if (has("purgeWash")) pinned.push("洛阳你请过洗城令。");
    else if (has("purgeMove")) pinned.push("洛阳你请过挪页令。");
    else if (has("campShadow")) pinned.push("帐外你只做影子，令未请齐。");
  }
  if (hero === "sapper") {
    if (has("aidDark")) pinned.push("汴京宦门，你选了暗助。");
    else if (has("aidOpen")) pinned.push("汴京宦门，你当街揭开了。");
    if (has("midGrainProof") || has("midBianGrain")) pinned.push("汴京仓门，你对过印泥。");
  }

  if (has("midSaltLedger")) lines.push("扬州伪盐账，你钉在了闸柱上。");
  else if (has("midSaltMute")) lines.push("扬州盐册，你收了封口银。");

  if (has("midSilkDebt")) lines.push("苏州逃册的名，你写回了正页。");
  else if (has("midSilkSold") || has("midSilkSell")) lines.push("苏州的名，你卖成了银。");

  if (has("midSuqianGruel")) lines.push("宿迁碑下，你护住了一锅粥。");
  else if (has("midSuqianFail")) lines.push("宿迁的粥，等你等到凉。");

  if (has("midHerbPage")) lines.push("亳州批红，你抄对了『缓』格。");
  else if (has("midHerbWrong")) lines.push("亳州批红，你抄成了假急。");

  if (has("throneAbandon")) lines.push("临安那碗茶，你泼了，不认旗。");
  else if (has("viewThroneDoubt")) lines.push("临安茶里的圣上，你疑过。");
  else if (has("throneTrue")) lines.push("临安茶里，你听过圣上可保。");

  if (has("campJoin")) lines.push("帐外你接过替天半旗。");
  else if (has("campShadow")) lines.push("帐外你只做影子，不碰旗。");
  else if (has("campRefuse")) lines.push("帐外你拒了旗。");

  if (hero !== "seer") {
    if (has("purgeWash")) lines.push("洛阳你请过洗城令。");
    else if (has("purgeMove")) lines.push("洛阳你请过挪页令。");
  }

  if (has("midCaseSlip")) lines.push("洛阳案上，你软折过一页。");

  if (hero !== "sapper") {
    if (has("midBianGrain") || has("midGrainProof")) lines.push("汴京仓门，你对过印泥。");
  }
  if (has("midBianDrum")) lines.push("御街鼓点，你听出过营啸。");
  if (has("midBianName")) lines.push("无名的人问你粥，你答过。");

  const prefer =
    hero === "seer"
      ? ["批红", "挪页", "洗城", "茶", "案", "旗", "影子"]
      : hero === "sapper"
        ? ["粥", "仓", "粮", "暗助", "揭", "旗", "盐"]
        : ["门", "旗", "茶", "盐", "册", "粥"];

  const used = new Set(pinned);
  const scored = lines
    .filter((line) => !used.has(line))
    .map((line, i) => {
      const score = prefer.reduce((s, w) => (line.includes(w) ? s + 2 : s), 0) + (lines.length - i) * 0.01;
      return { line, score };
    });
  scored.sort((a, b) => b.score - a.score);
  const out = [...pinned];
  for (const s of scored) {
    if (out.length >= 3) break;
    if (!used.has(s.line)) {
      out.push(s.line);
      used.add(s.line);
    }
  }
  return out.slice(0, 3);
}

export interface CaseSideQuest {
  title: string;
  blurb: string;
  guide: string;
}

/** 中段指名案 → quest 支线。 */
export function caseSideQuests(run: { flags: string[]; beaten: string[] }): CaseSideQuest[] {
  const f = run.flags;
  const has = (id: string) => f.includes(id);
  const out: CaseSideQuest[] = [];

  if (has("midSaltAsk") && !has("midSaltLedger") && !has("midSaltMute")) {
    out.push({
      title: "扬州伪盐账",
      blurb: "盐引册两套数。",
      guide: "回扬州盐市找盐册吏：曝光或封口。",
    });
  } else if (has("midSaltLedger") && !run.beaten.includes("mob_canal_03")) {
    out.push({
      title: "盐帮记仇",
      blurb: "伪账钉上闸柱了。",
      guide: "运河帮不会善罢。扬州岸边留神舱刀。",
    });
  }

  if (has("midSilkAsk") && !has("midSilkDebt") && !has("midSilkSell")) {
    out.push({
      title: "苏州逃册",
      blurb: "丝市夹着一本逃名。",
      guide: "回苏州阊门找丝债人：还名或卖名。",
    });
  }

  if (has("midSuqianOpen") && !has("midSuqianGruel") && !has("midSuqianFail")) {
    if (!has("midSuqianBlade")) {
      out.push({
        title: "碑下热粥",
        blurb: "宿迁故里有人偷粮。",
        guide: "回项王碑下：施粥压场，或夺刀追袋。拖久了粥会凉。",
      });
    } else {
      out.push({
        title: "夺刀追袋",
        blurb: "粮袋在闲刀腰上。",
        guide: "宿迁岸边打倒漕帮闲刀，再回话给渡口厨。",
      });
    }
  }

  if (has("midHerbAsk") && !has("midHerbPage") && !has("midHerbWrong")) {
    out.push({
      title: "涡水批红",
      blurb: "药柜上有一页真假朱批。",
      guide: "回亳州药铺：对『缓』格，别抄成『急』。",
    });
  }

  if (has("caseSuspect") && has("midCaseSlip") && !has("caseRebel")) {
    out.push({
      title: "案页软折",
      blurb: "邻案翻错过一角。",
      guide: "回洛阳案书处，改翻正页挖到底。",
    });
  } else if (has("caseSuspect") && !has("midCaseSlip") && !has("caseRebel")) {
    out.push({
      title: "洛阳谋逆卷",
      blurb: "案上疑云未散。",
      guide: "回洛阳案书处继续翻；正页挖到底，别只听邻案。",
    });
  }

  const bianGrain = has("midBianGrain") || has("midGrainProof");
  const bianDone = bianGrain && has("midBianDrum") && has("midBianName");
  if (has("graceKnown") && !bianGrain) {
    out.push({
      title: "仓门印泥",
      blurb: "皇恩最好亲眼对仓。",
      guide: "汴京御街东旧仓，找仓门人看一眼印泥。",
    });
  } else if (!bianDone && (has("graceKnown") || has("traitorSeen") || has("throneTrue") || has("roadUsurp") || bianGrain || has("midBianDrum") || has("midBianName"))) {
    const bits = [
      !bianGrain ? "仓门印泥" : null,
      !has("midBianDrum") ? "鼓楼听营啸" : null,
      !has("midBianName") ? "无名蹲客问粥" : null,
    ].filter(Boolean);
    if (bits.length) {
      out.push({
        title: "汴京三认",
        blurb: bits.join(" · "),
        guide: "御街：仓门人、鼓楼、无名蹲客——三处都认一遍。",
      });
    }
  }

  if ((has("campJoin") || has("campRefuse") || has("campShadow")) && !has("endingRail") && !has("endingSeer") && !has("endingSapper")) {
    out.push({
      title: "帐前站队",
      blurb: "旗已问过。",
      guide: "谋逆大营正帐在里。副将处还能听一遍回声。",
    });
  }

  return out;
}
