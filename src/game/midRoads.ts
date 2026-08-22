/**
 * 驿路「一人一事」加厚：短钩、可结、可进任务栏。
 * 不扩地图，只让主路径驿站每站都有记得住的选择。
 */
import type { EnemyId } from "./types";

export type RoadCtx = {
  flags: string[];
  pick?: string;
  beaten?: string[];
};

export type RoadVoice = {
  said: string;
  thought: string;
  flags?: string[];
  choices?: { id: string; label: string }[];
  spar?: EnemyId;
};

const has = (f: string[], id: string) => f.includes(id);
const beat = (ctx: RoadCtx, id: EnemyId) => (ctx.beaten ?? []).includes(id);

/** 无锡·浜上脚夫：缆堆藏人 / 报官或装没看见 */
export function hamPorterBeat(ctx: RoadCtx): RoadVoice {
  if (has(ctx.flags, "sideHamDone")) {
    return { said: "「缆堆清了。浜上风也顺一点。」", thought: "脚夫不谢人。只搬缆。" };
  }
  if (ctx.pick === "clear" || (has(ctx.flags, "sideHam") && beat(ctx, "mob_road_05"))) {
    if (has(ctx.flags, "sideHam") && beat(ctx, "mob_road_05")) {
      return {
        said: "「藏着的人倒了。这截旧缆谢你——上路能当绳用。」",
        thought: "浜上不藏人，才像浜。",
        flags: ["sideHamDone", "yamenPay5"],
      };
    }
  }
  if (ctx.pick === "expose") {
    return {
      said: "「你去掀缆。山影里的人不会乖乖出来。」",
      thought: "脚夫把缆绳往旁边一踢。底下有脚印。",
      flags: ["sideHam", "sideHillHint"],
      spar: "mob_road_05",
    };
  }
  if (ctx.pick === "mute") {
    return {
      said: "「……当没看见也行。浜上活着的人，多半学会过装瞎。」",
      thought: "银轻。脚印还在。",
      flags: ["sideHamMute", "yamenPay3"],
    };
  }
  if (ctx.pick === "ask") {
    return {
      said: "「缆堆里藏过人。岗匪蹲山影。你要掀开，还是当作没看见。」",
      thought: "惠山不说话。缆堆会。",
      flags: ["sideHamAsk"],
      choices: [
        { id: "expose", label: "掀缆清人" },
        { id: "mute", label: "装没看见" },
        { id: "leave", label: "先赶路" },
      ],
    };
  }
  return {
    said: "「惠山在西。你若上建康，先过常州驿。浜上……不太安。」",
    thought: "脚夫靴底有泥，也有别人的脚印。",
    choices: [
      { id: "ask", label: "浜上安不安" },
      { id: "leave", label: "路过" },
    ],
  };
}

/** 陕州·渡口：等风 / 硬闯遇匪 */
export function fordManBeat(ctx: RoadCtx): RoadVoice {
  if (has(ctx.flags, "sideRiverDone")) {
    return { said: "「风顺了。渡口今晚少死人。」", thought: "" };
  }
  if (
    has(ctx.flags, "sideRiver") &&
    (beat(ctx, "riverThug") || beat(ctx, "mob_canal_05")) &&
    (ctx.pick === "settle" || ctx.pick === "ask" || !ctx.pick)
  ) {
    return {
      said: "「水匪贴岸的倒了。这袋干粮给你垫肚子。」",
      thought: "渡口只卖等。今天例外。",
      flags: ["sideRiverDone", "yamenPay4"],
    };
  }
  if (ctx.pick === "force") {
    return {
      said: "「硬闯？风里的刀比浪快。」",
      thought: "他把桨一横。对岸有人影。",
      flags: ["sideRiver"],
      spar: "riverThug",
    };
  }
  if (ctx.pick === "wait") {
    return {
      said: "「等风。等得起的人，才能过河。等不起的，多半已经在浪里。」",
      thought: "等也是一种刀。",
      flags: ["sideRiver", "sideRiverWait", "yamenPay2"],
    };
  }
  if (ctx.pick === "ask") {
    return {
      said: "「风大时水匪贴岸。你要等风，还是硬闯。」",
      thought: "渡口不卖刀，只卖选择。",
      flags: ["sideRiver"],
      choices: [
        { id: "wait", label: "等风" },
        { id: "force", label: "硬闯" },
        { id: "leave", label: "改日" },
      ],
    };
  }
  return {
    said: "「茅津风大。西潼关，东洛阳。渡要等风。」",
    thought: "河比路宽。风比话硬。",
    choices: [
      { id: "ask", label: "岸边安不安" },
      { id: "leave", label: "路过" },
    ],
  };
}

/** 滁州假官钩：撕帖或跪错 */
export function roadOfficialBeat(ctx: RoadCtx): RoadVoice | null {
  if (!has(ctx.flags, "midRoadOfficial") || has(ctx.flags, "midRoadOfficialDone")) return null;
  if (ctx.pick === "tear") {
    return {
      said: "「帖是假的。印泥未干——官衣里的人暴起。」",
      thought: "假官比匪难认。撕开就只剩刀。",
      flags: ["midRoadOfficialDone"],
      spar: "mob_yamenRunner_03",
    };
  }
  if (ctx.pick === "kneel") {
    return {
      said: "「你跪了。假官笑着收了你三两，又放你走——下次还会拦别人。」",
      thought: "跪错一次，山路更脏。",
      flags: ["midRoadOfficialDone", "midRoadOfficialKneel", "yamenPay-3"],
    };
  }
  return {
    said: "「官衣拦路的人还在亭外晃。帖上印泥是湿的。你撕，还是先跪。」",
    thought: "僧把话说到这份上，已经算拔刀。",
    choices: [
      { id: "tear", label: "撕帖验印" },
      { id: "kneel", label: "先跪过关" },
      { id: "leave", label: "先绕开" },
    ],
  };
}
