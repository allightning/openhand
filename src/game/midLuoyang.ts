/**
 * 洛阳专属对话钩子 —— 漕帮案 / 牡丹谱 / 市集与馆驿互动。
 * 文案走 src/data/dialogues.ts 富文本；发银/教牌走 yamenPay* / teachCard-*（main 认）。
 */
import type { EnemyId } from "./types";
import type { Voice } from "../map/scenes";
import { LUOYANG_LINES } from "../data/dialogues";

type Ctx = { pick?: string; flags: string[]; beaten?: string[]; silver?: number };

function has(ctx: Ctx, id: string): boolean {
  return ctx.flags.includes(id);
}

function idle(id: string, fallback: string): string {
  return LUOYANG_LINES[id]?.idle ?? fallback;
}

function thoughtOf(id: string, fallback = ""): string {
  return LUOYANG_LINES[id]?.thought ?? fallback;
}

/** 捕头姜：漕帮案 */
export function luoBailiffBeat(ctx: Ctx): Voice {
  if (has(ctx, "luoCanalDone")) {
    return { said: "「漕口清了。**金吾令**你收好。桥上风还硬。」", thought: "案结了。刀还热。" };
  }
  if (has(ctx, "luoCanalCase") && (ctx.beaten?.includes("canalThug") || ctx.pick === "done")) {
    return {
      said: "「你把人截在桥南。这枚 **金吾令**——夜里亮给巡卒看，少挨一刀。」",
      thought: "铜令入手。桥风轻半寸。",
      flags: ["luoCanalDone", "teachCard-jinwuToken"],
    };
  }
  if (has(ctx, "luoCanalCase")) {
    if (ctx.pick === "fight") {
      return { said: "「南岸有漕帮蹲点。去。」", thought: "", spar: "canalThug" };
    }
    return {
      said: "「**漕帮**在桥南抢帖。你帮我截一截，我给你 **金吾令**。」",
      thought: "捕头姜的刀柄磨亮了。",
      choices: [
        { id: "fight", label: "去桥南截人" },
        { id: "leave", label: "稍后" },
      ],
    };
  }
  if (ctx.pick === "take") {
    return {
      said: "「案接了。桥南，三更前后。{{天津桥下有窝点，莫硬闯。}}」",
      thought: "漕帮案上身。",
      flags: ["luoCanalCase"],
    };
  }
  return {
    said: idle("luoBailiff", "「河南府衙。我姜捕头。」"),
    thought: thoughtOf("luoBailiff", "捕快的眼神比帖子硬。"),
    choices: [
      { id: "take", label: "接漕帮案" },
      { id: "leave", label: "告退" },
    ],
  };
}

/** 名妓阿砂：牡丹谱 */
export function luoAshaBeat(ctx: Ctx): Voice {
  if (has(ctx, "luoPeonyDone")) {
    return { said: "「谱写完了。花谢了，酒还暖。」", thought: "" };
  }
  if (has(ctx, "luoPeony") && ctx.pick === "sing") {
    return {
      said: "「你听完了。这坛 **牡丹酿**——喝了气足，也容易挨打。自己掂量。」",
      thought: "酒香盖过脂粉。",
      flags: ["luoPeonyDone", "teachCard-peonyBrew"],
    };
  }
  if (has(ctx, "luoPeony")) {
    return {
      said: "「**牡丹谱**还差一折。你坐下听完。」",
      thought: "弦未歇。",
      choices: [
        { id: "sing", label: "听完这一折" },
        { id: "leave", label: "改日" },
      ],
    };
  }
  if (ctx.pick === "ask") {
    return {
      said: "「**牡丹谱**缺人听。听完，妾身有 **牡丹酿** 谢你。」",
      thought: "平康坊的灯比案卷暖。",
      flags: ["luoPeony"],
    };
  }
  return {
    said: idle("luoAsha", "「过客？烟波楼不卖刀，卖谱。」"),
    thought: thoughtOf("luoAsha"),
    choices: [
      { id: "ask", label: "听牡丹谱" },
      { id: "leave", label: "告退" },
    ],
  };
}

export function luoMadamBeat(ctx: Ctx): Voice {
  if (ctx.pick === "info") {
    if ((ctx.silver ?? 0) < 8) {
      return { said: "「八两。银不够别问。」", thought: "鸨母的算盘比刀快。" };
    }
    return {
      said: "「{{桥北府衙侧牢有人}}。花银买路，别说是老娘告诉你的。」",
      thought: "银少了八两。耳多了一句。",
      flags: ["luoJailHint", "yamenPay-8"],
    };
  }
  return {
    said: idle("luoMadam", "「情报八两。不还价。」"),
    thought: thoughtOf("luoMadam", "鸨母的算盘比刀快。"),
    choices: [
      { id: "info", label: "花八两买线索" },
      { id: "leave", label: "不买" },
    ],
  };
}

export function luoCookBeat(ctx: Ctx): Voice {
  if (has(ctx, "luoDrunkTaught")) {
    return { said: "「**醉拳**教过了。别在桥上试。」", thought: "" };
  }
  if (ctx.pick === "learn") {
    return {
      said: "「醉了打人，醒了挨打。自己看。」",
      thought: "厨子把勺往案上一磕。",
      flags: ["luoDrunkTaught", "teachCard-drunkFist"],
    };
  }
  if (ctx.pick === "eat") {
    if ((ctx.silver ?? 0) < 3) {
      return { said: "「三两。银不够别坐。」", thought: "灶上还冒着气。" };
    }
    return {
      said: "「热汤一碗。气回了一点。」",
      thought: "腹暖。",
      flags: ["yamenPay-3", "mapHeal4"],
    };
  }
  return {
    said: idle("luoCook", "「酒楼后灶。吃还是学？」"),
    thought: thoughtOf("luoCook"),
    choices: [
      { id: "eat", label: "吃饭（三两，回血）" },
      { id: "learn", label: "学醉拳" },
      { id: "leave", label: "告退" },
    ],
  };
}

export function luoCoachBeat(ctx: Ctx): Voice {
  if (ctx.pick === "spar") {
    return { said: "「弟子们手痒。点到为止。」", thought: "", spar: "jinwu" as EnemyId };
  }
  return {
    said: idle("luoCoach", "「定鼎武馆。要过招，下场。」"),
    thought: thoughtOf("luoCoach", "教头朱的腕子有茧。"),
    choices: [
      { id: "spar", label: "与馆中人切磋" },
      { id: "leave", label: "告退" },
    ],
  };
}

export function luoJailerBeat(ctx: Ctx): Voice {
  if (!has(ctx, "luoJailHint") && !has(ctx, "luoCanalCase")) {
    return { said: idle("luoJailer", "「牢房重地。无票莫入。」"), thought: "" };
  }
  if (ctx.pick === "break") {
    return { said: "「你真要闯？{{强闯者，枷锁伺候。}}」", thought: "枷锁响了一声。", spar: "jailer" as EnemyId };
  }
  return {
    said: "「侧牢。有人出得去，有人进得来。若不是 **捕头姜** 点头，谁也带不走。」",
    thought: "",
    choices: [
      { id: "break", label: "强闯（开战）" },
      { id: "leave", label: "退去" },
    ],
  };
}

export function luoGateBeat(ctx: Ctx): Voice {
  if (ctx.pick === "escort") {
    return {
      said: "「商队出 **定鼎门**。送到坡外，银二十。先支五两。」",
      thought: "护送单上了身。",
      flags: ["luoEscortJob", "yamenPay5"],
    };
  }
  return {
    said: idle("luoGate", "「城门。出城有遭遇，进城要帖。」"),
    thought: thoughtOf("luoGate"),
    choices: [
      { id: "escort", label: "接护送（先支五两）" },
      { id: "leave", label: "路过" },
    ],
  };
}

export function luoRaconteurBeat(ctx: Ctx): Voice {
  if (ctx.pick === "listen") {
    return {
      said: idle("luoRaconteur", "「听一段罢——**天津桥夜巡**。」"),
      thought: "说书人敲醒木。",
      flags: ["luoHeardCanal"],
    };
  }
  return {
    said: "「听一段？不收钱，收耳。」",
    thought: "",
    choices: [
      { id: "listen", label: "听一段" },
      { id: "leave", label: "走开" },
    ],
  };
}

export function luoGenericBeat(id: string): Voice {
  const row = LUOYANG_LINES[id];
  if (row) return { said: row.idle, thought: row.thought ?? "" };
  return { said: "「……」", thought: "" };
}

export function luoyangTalkBeat(id: string, ctx: Ctx): Voice | null {
  if (id === "luoBailiff") return luoBailiffBeat(ctx);
  if (id === "luoAsha") return luoAshaBeat(ctx);
  if (id === "luoMadam") return luoMadamBeat(ctx);
  if (id === "luoCook") return luoCookBeat(ctx);
  if (id === "luoCoach") return luoCoachBeat(ctx);
  if (id === "luoJailer" || id === "luoJailer2") return luoJailerBeat(ctx);
  if (id === "luoGate") return luoGateBeat(ctx);
  if (id === "luoRaconteur") return luoRaconteurBeat(ctx);
  if (LUOYANG_LINES[id] || id.startsWith("luo") || id === "judge" || id === "caseclerk" || id === "messenger" || id === "carter" || id === "docker" || id === "passClerk" || id === "townWatch" || id === "rumorTea" || id === "roadHawker" || id === "townHawker" || id === "barber" || id === "butcher") {
    return luoGenericBeat(id);
  }
  return null;
}
