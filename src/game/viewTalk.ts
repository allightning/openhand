/** Hero-flavored dialogue beats — 乱世三观落在嘴上，不落在说明书上。 */

import type { HeroId } from "./types";

export interface ViewVoice {
  said: string;
  thought: string;
  flags?: string[];
  reply?: string;
  choices?: { id: string; label: string }[];
}

type Ctx = {
  hero?: HeroId;
  pick?: string;
  flags: string[];
};

function heroOf(ctx: Ctx): HeroId {
  return ctx.hero ?? "rail";
}

/** 驿站/酒楼：三职对「路与天下」的不同听法。 */
export function innkeepBeat(ctx: Ctx): ViewVoice {
  if (ctx.pick === "rest") {
    return { said: "「一间屋，二两银。被褥潮，人别潮。」", thought: "歇一夜，路还在。", flags: ["restedRoadInn"] };
  }
  if (ctx.pick === "leave") {
    return { said: "「门朝官道。小心车马。」", thought: "" };
  }
  if (ctx.pick === "rumor") {
    const h = heroOf(ctx);
    if (h === "seer") {
      return {
        said: "「北上的人带案卷气。南下的人带潮气。我只看谁的名还在册上——除名的人，茶都不敢大声喝。」",
        thought: "店家不判案。他判名在不在。",
        flags: ["sideRoadInn", "viewInnSeer"],
      };
    }
    if (h === "sapper") {
      return {
        said: "「汴京刀多，钱塘潮响。可工丁嘴里只有粮——粮断的那年，官道上的粥棚比庙还挤。」",
        thought: "他把皇恩说成米香。米香断了，人才想起刀。",
        flags: ["sideRoadInn", "viewInnSapper"],
      };
    }
    return {
      said: "「北上的人说汴京刀多。南下的人说钱塘潮响。刀多潮响，门还是要有人踹正——踹歪了，店也不开。」",
      thought: "店家认过客，也认门轴响不响。",
      flags: ["sideRoadInn", "viewInnRail"],
    };
  }
  if (ctx.pick === "view") {
    const h = heroOf(ctx);
    if (h === "seer") {
      return {
        said: "「你若问我乱世凭什么活：凭册。册上有你，城门认你；册上没有，江湖才认你。两头都苦。」",
        thought: "门律的人听得懂。刀上的人听成官话。",
        flags: ["viewInnDeep"],
      };
    }
    if (h === "sapper") {
      return {
        said: "「乱世？桩钉稳了，人才能站。你钉官府的桩也好，钉工寮的桩也好——别钉在别人饭碗上。」",
        thought: "工律的味从灶里出来。",
        flags: ["viewInnDeep"],
      };
    }
    return {
      said: "「乱世里我认一件事：门被人踢开，要有人再踢回去。踢回去的人不一定是官，但一定不能是贼。」",
      thought: "港律不写在帖上。写在门槛上。",
      flags: ["viewInnDeep"],
    };
  }
  return {
    said: "「驿站酒楼。官道上的人，都在这歇脚。要听路上的事，也要听你自己信什么。」",
    thought: "烟火气从灶里出来。三观从闲话里出来。",
    choices: [
      { id: "rest", label: "住一晚" },
      { id: "rumor", label: "路上有何闻" },
      { id: "view", label: "这乱世凭什么" },
      { id: "leave", label: "不歇了" },
    ],
  };
}

/** 税市酒客：门律侧的乱世闲话，带多拍。 */
export function taxGuestBeat(ctx: Ctx): ViewVoice {
  if (ctx.pick === "leave") return { said: "「酒凉了。」", thought: "" };
  if (ctx.pick === "ask") {
    return {
      said: "「听说册角在档库灰尘里。灰尘比墨厚——厚到能盖住一只手。那只手撕角的时候，未必知道自己在撕半个天下。」",
      thought: "闲话比酒烈。烈在「未必知道」。",
      flags: ["sideTaxRumor"],
      choices: [
        { id: "law", label: "那该怎么办" },
        { id: "leave", label: "只听闲话" },
      ],
    };
  }
  if (ctx.pick === "law") {
    const h = heroOf(ctx);
    if (h === "seer") {
      return {
        said: "「你是案上的人。案上的人只能把角补回去——补错页，你会变成下一笔除名。」",
        thought: "他把刀递回给你。刀是笔。",
        flags: ["sideTaxRumor", "viewTaxLaw"],
      };
    }
    if (h === "sapper") {
      return {
        said: "「工上的人听这个，只会骂：撕纸的不饿，饿的人没纸。你要粮，还是要角？」",
        thought: "酒客把三观压成二选一。",
        flags: ["sideTaxRumor", "viewTaxLaw"],
      };
    }
    return {
      said: "「刀上的人听这个，往往会说：撕纸的人该挨一脚。挨完了，角还是缺——缺角的城门照样关。」",
      thought: "行侠解不了册。册要案。",
      flags: ["sideTaxRumor", "viewTaxLaw"],
    };
  }
  return {
    said: "「墨香楼里，案牍人下了班才敢大声。你要听大声的，还是听真的？」",
    thought: "",
    choices: [
      { id: "ask", label: "听真的" },
      { id: "leave", label: "不听" },
    ],
  };
}

/** 缆厂酒客：皇粮与工律。 */
export function ropeGuestBeat(ctx: Ctx): ViewVoice {
  if (ctx.pick === "leave") return { said: "「碗空了。」", thought: "" };
  if (ctx.pick === "ask") {
    return {
      said: "「皇粮那年，厂里开过粥棚。圣上的名字跟着米香走。米香断了，名字就成了墙上的灰。」",
      thought: "皇恩两个字，他读成粮。",
      flags: ["sideRopeRumor"],
      choices: [
        { id: "grace", label: "那还信圣上吗" },
        { id: "leave", label: "喝完了" },
      ],
    };
  }
  if (ctx.pick === "grace") {
    const h = heroOf(ctx);
    if (h === "sapper") {
      return {
        said: "「信粮。粮在，恩在；粮断，再漂亮的印也盖不住肚子。你若清君侧，先清克粮的人。」",
        thought: "工兵线骨，一句说完。",
        flags: ["sideRopeRumor", "viewRopeGrace"],
      };
    }
    if (h === "seer") {
      return {
        said: "「信不信是民心。民心入不了案，却能推翻案。你查卷的时候，别只查墨，查米仓。」",
        thought: "酒客把洛阳案卷扯到粥棚。",
        flags: ["sideRopeRumor", "viewRopeGrace"],
      };
    }
    return {
      said: "「信不信由你。刀上的人若只为替天，别忘了替天的旗下也有人克过粮——贼喊捉贼，门踹正了才算。」",
      thought: "港律听皇恩，仍听成门正不正。",
      flags: ["sideRopeRumor", "viewRopeGrace"],
    };
  }
  return {
    said: "「桩酒楼。工丁下工才敢大声。大声里有粮，也有恨。」",
    thought: "",
    choices: [
      { id: "ask", label: "皇粮那年" },
      { id: "leave", label: "不喝了" },
    ],
  };
}

/** 税署案书：门律核心三观。 */
export function taxClerkBeat(ctx: Ctx): ViewVoice {
  if (ctx.pick === "leave") return { said: "「字还没干。」", thought: "" };
  if (ctx.pick === "ask") {
    return {
      said: "「字写歪了，人就歪了。案下那只手不是我——可我若装没看见，歪的就是我。」",
      thought: "他怕的不是刀，是自己变成下一行歪字。",
      flags: ["viewTaxClerk"],
      choices: [
        { id: "duty", label: "那你怎么办" },
        { id: "leave", label: "不打扰" },
      ],
    };
  }
  if (ctx.pick === "duty") {
    const h = heroOf(ctx);
    if (h === "seer") {
      return {
        said: "「你我一样：把名字挪回正确的页。挪错了，将军印也压不住谶——谶会反过来压你。」",
        thought: "同门的话，短，重。",
        flags: ["viewTaxClerk"],
      };
    }
    return {
      said: "「你们走江湖的，喜欢把歪字一刀斩了。斩完纸还在。纸在，下一只手还会歪。」",
      thought: "案书不信刀能改册。",
      flags: ["viewTaxClerk"],
    };
  }
  return {
    said: "「案上墨干得慢。你要问字，还是问人？」",
    thought: "",
    choices: [
      { id: "ask", label: "问人" },
      { id: "leave", label: "不打扰" },
    ],
  };
}

/** 缆厂更卒：工律夜话。 */
export function ropeWatchBeat(ctx: Ctx): ViewVoice {
  if (ctx.pick === "leave") return { said: "「鼓还在。」", thought: "" };
  if (ctx.pick === "ask") {
    return {
      said: "「更鼓比潮准。夜班的人最清楚谁偷料——偷料的人，白天往往喊皇恩最响。」",
      thought: "他不看嘴。看更次。",
      flags: ["sideRopeWatch"],
      choices: [
        { id: "steal", label: "偷料怎么处" },
        { id: "leave", label: "记下了" },
      ],
    };
  }
  if (ctx.pick === "steal") {
    const h = heroOf(ctx);
    if (h === "sapper") {
      return {
        said: "「钉回原桩。人可以骂，缆不能断。断了，下一班工丁会从跳板上掉下去。」",
        thought: "规矩比恨短，比命长。",
        flags: ["sideRopeWatch", "viewRopeWatch"],
      };
    }
    if (h === "seer") {
      return {
        said: "「记名。名入册，下次城门就不认他。你若只打一顿，他还会回来偷——册比拳头记得久。」",
        thought: "更卒偶发门律味。",
        flags: ["sideRopeWatch", "viewRopeWatch"],
      };
    }
    return {
      said: "「抓住就踹出厂门。门要正。正了，里面的人才能睡。」",
      thought: "港律答案永远短。",
      flags: ["sideRopeWatch", "viewRopeWatch"],
    };
  }
  return {
    said: "「夜班冷。话可以热一点。」",
    thought: "",
    choices: [
      { id: "ask", label: "夜里看见什么" },
      { id: "leave", label: "不打扰" },
    ],
  };
}

/** 临安说书：加深「圣上可保」的三观碰撞。 */
export function storymanBeat(ctx: Ctx & { party?: string[] }): ViewVoice {
  if (ctx.party?.includes("bard")) {
    return { said: "「说书的跟你走。茶钱以后再算。」", thought: "" };
  }
  if (ctx.flags.includes("throneTrue") && ctx.pick !== "join" && ctx.pick !== "leave" && ctx.pick !== "doubt") {
    return {
      said: "「圣上的名声你已听过。营在汴京城外。我可同路——同路最多七人，你自己掂量。」",
      thought: "说书的把刀指远了。",
      choices: [
        { id: "join", label: "请他同行" },
        { id: "doubt", label: "茶里会不会是假话" },
        { id: "leave", label: "你留临安" },
      ],
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
