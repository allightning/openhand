import { activePuzzleSides } from "./puzzles";
import { caseSideQuests } from "./midCases";
import { economyLoopNote, SOFT_GRADE_CAP } from "./economy";
import type { HeroId, Run } from "./types";
import { gearById } from "./weapons";

/** 名字对引导：顶栏只显示 title；点开看 blurb + guide。 */
export interface QuestEntry {
  title: string;
  blurb: string;
  guide: string;
}

export interface QuestLog {
  main: QuestEntry;
  sides: QuestEntry[];
}

function has(run: Run, id: string): boolean {
  return run.flags.includes(id);
}

function yardSeals(run: Run): boolean {
  return (run.sealProgress.yard ?? []).join(",") === "w,e,s,n";
}

function beaten(run: Run, id: string): boolean {
  return run.beaten.includes(id as Run["beaten"][number]);
}

function q(title: string, blurb: string, guide: string): QuestEntry {
  return { title, blurb, guide };
}

/** 烫印/院印：过帖手续，只作支线提示，不占主线标题。三职出村手续不同。 */
function brandSides(run: Run, shut: boolean): QuestEntry[] {
  if (shut) return [];
  const sides: QuestEntry[] = [];
  const hero = run.hero ?? "rail";
  if (hero === "seer") {
    if (!has(run, "booksOk")) {
      sides.push(q("过册手续", "税卡认册角。过册前西门不通港湾。", "税市补角、案上对册。齐了出税门，或走南廊上淮阴。"));
    } else if (!has(run, "hasMingzhu")) {
      sides.push(q("案房三本", "过册之后，案上有三本。", "回税卡找书办或钱司一类，接过明注诸册。"));
    }
    return sides;
  }
  if (hero === "sapper") {
    if (!run.items.includes("deed") && !has(run, "knotOk")) {
      sides.push(q("工契手续", "缆厂认契。验契前北门不通港湾。", "工寮凳下取契，闸口验过，再出厂门或北缘官道。"));
    } else if (run.items.includes("deed") && !has(run, "knotOk")) {
      sides.push(q("验契出厂", "契要见闸。", "带工契回缆厂闸口验过。"));
    }
    return sides;
  }
  if (!has(run, "branded") && !run.items.includes("brand")) {
    sides.push(q("过帖手续", "税卡认火印。", "港湾西仓桌上取火印，印院炉上烫一下即可。"));
  } else if (run.items.includes("brand") && !has(run, "branded")) {
    sides.push(q("烫一下", "火印要见火才认。", "带火印进印院天井炉上烫印。"));
  } else if (has(run, "branded") && !has(run, "hasMingzhu")) {
    sides.push(q("账房三本", "烫印之后，账房有三本要给你。", "回港湾找钱司，接过明注、兵籍、势录。"));
  } else if (has(run, "branded") && !yardSeals(run) && has(run, "metMonk")) {
    sides.push(q("院印顺序", "四印围炉，可选。", "印院西→东→南→北，或问湖亭和尚。不挡进城。"));
  }
  return sides;
}

function railMain(run: Run): QuestEntry {
  if (beaten(run, "usurper")) {
    return q("隐于江湖", "印玺保住了。你不收封赏——刀收回鞘，才算门还在正位。", "刀收回鞘，继续走江湖。");
  }
  if (!has(run, "mainOpen")) {
    return q("门外有人", "茅屋外有动静。门外的人，往往比屋里的规矩先到。", "出茅屋门，到土坡上看是谁。");
  }
  if (!beaten(run, "brute") && !beaten(run, "raider") && !has(run, "heardRebel")) {
    return q(
      "行侠港律",
      "先把眼前的坏人按倒。港律不谈替天——先谈门正不正。",
      "港湾、岗坡一带，对上拦路、欺负人的。",
    );
  }
  if (!has(run, "heardRebel")) {
    return q(
      "刀口风声",
      "有人要举兵。举兵的人爱喊替天；替天之前，先问门还认不认你踹。",
      "港湾或临安打听谋逆的风声。",
    );
  }
  if (!has(run, "midDoorTrue") && !has(run, "midDoorBent")) {
    return q(
      "朱雀航下",
      "南下路上有扇门。踹正还是踹歪，比接不接旗更早考验港律。",
      "建康朱雀航边问江晚涛：那扇雇来的门，你怎么踹。",
    );
  }
  if (has(run, "roadUsurp") && !has(run, "throneTrue") && !has(run, "throneAbandon") && !beaten(run, "usurper")) {
    return q(
      "帐外立场",
      "营门已开。茶你还没听完——可刀口不等茶凉。进帐前先站队。",
      "北上汴京御街外谋逆大营。帐外旗手问你接不接旗。",
    );
  }
  if (!run.visited.includes("linan") && !run.visited.includes("jiaxing") && !run.visited.includes("suzhou")) {
    return q(
      "南下临安",
      "钱塘在江南尽头。南下不是逃，是去听庙堂在茶里怎么说。",
      "淮阴→滁州→建康→常州→无锡→苏州→嘉兴→临安。",
    );
  }
  if (!run.visited.includes("linan")) {
    return q("钱塘门外", "苏州再南，便是临安。门一扇扇开，话一句句真假难辨。", "苏州阊门南去临安。");
  }
  if (!has(run, "throneTrue") && !has(run, "throneAbandon")) {
    return q(
      "圣上可保",
      "当今是不是好皇上。好不好，不靠旗，靠你听完还认不认「推开」二字。",
      "临安问说书人，确认圣上可保——也可泼茶不认。",
    );
  }
  if (!beaten(run, "usurper")) {
    return q(
      "替天行道",
      "夺玺者在汴京城外。你若入伙，门就踹不回原样；你若不入，有人会说你怕。",
      "北上淮汴，从汴京御街赴谋逆大营。帐外先站队。",
    );
  }
  return q("隐于江湖", "印玺保住了。你不收封赏——刀收回鞘，才算门还在正位。", "刀收回鞘，继续走江湖。");
}

function seerMain(run: Run): QuestEntry {
  if (beaten(run, "usurper")) {
    return q("受封将军", "律行完了。印还在朝廷。将军印很重——重到能压住谶，也能压住人。", "你留下官身，镇一方刀兵。");
  }
  if (!beaten(run, "inkhand")) {
    return q("案下有手", "税卡案下还有一笔墨。墨未干，名已歪。", "你在税卡。对上案下那只手。");
  }
  if (!has(run, "booksOk") && !has(run, "caseRebel")) {
    return q(
      "册角对案",
      "册子缺一角。缺角不是撕纸，是撕半个城门的认法。",
      "税卡对册，缺角从别处补齐。",
    );
  }
  if (!has(run, "caseRebel")) {
    return q(
      "洛阳案卷",
      "秉公查案，牵出谋逆。卷比刀干净，也比刀脏——脏在批红多出来的那一点犹豫。",
      "淮阴西去亳州→偃师→洛阳天津桥。案要问两回，才能定夺玺。",
    );
  }
  if (!has(run, "purgeReady")) {
    if (has(run, "roadUsurp")) {
      return q(
        "令未请齐",
        "营门可闯，律印未齐。结局会记你空令——也可先回洛司请洗城或挪页。",
        "洛阳找洛司请令；或直接东去汴营（帐外站队）。",
      );
    }
    return q(
      "请令清党",
      "按律铲除。清党不是洗城，是把名字从错误的页码挪回正确的页码——你也可选洗城，快，却脏。",
      "洛阳找洛司请令：洗城，或挪页。再赴汴营。",
    );
  }
  if (!beaten(run, "usurper")) {
    return q("铲除谋逆", "官印半枚，够进营门。进门之后，别把自己也写成下一笔除名。", "洛阳东去汴京，城外东北赴谋逆大营。");
  }
  return q("受封将军", "律行完了。印还在朝廷。将军印很重——重到能压住谶，也能压住人。", "你留下官身，镇一方刀兵。");
}

function sapperMain(run: Run): QuestEntry {
  if (beaten(run, "usurper")) {
    return q("一方小官", "略受恩惠，安定一方。小官的印泥不香，但能盖在工寮的契上。", "不做大官。做能护住这一方的官。");
  }
  if (!beaten(run, "stakeboss")) {
    return q("厂里那根桩", "缆厂里有根不肯松的桩。桩不松，人的脚也站不稳。", "你在桩场。先过这一桩，再进缆厂。");
  }
  if (!beaten(run, "knotboss")) {
    return q("坞里死结", "船坞里有死结。结解不开，潮再大也只是白费力气。", "缆厂南厢进船坞，解开死结那一仗。");
  }
  if (!has(run, "graceKnown")) {
    return q(
      "皇恩未忘",
      "受过粮的人，记得圣上。皇恩两个字，工上读成米香——最好对过仓门印泥，别只听一句。",
      "淮阴北上宿迁→宿州→汴京御街（或经扬州·高邮）。问工部桩手。",
    );
  }
  if (!has(run, "traitorSeen")) {
    return q(
      "奸臣挡道",
      "求官无门，先清君侧。清的是克粮的人——暗助可以，当街嚷旗会先伤民。",
      "汴京御街问宦门人：暗助，或揭开。",
    );
  }
  if (has(run, "traitorSeen") && !has(run, "roadUsurp") && !beaten(run, "usurper")) {
    return q(
      "营门未开",
      "奸臣的方向你已看见，路还没表态。暗助或揭开，营门才认你。",
      "回汴京御街宦门人：选暗助，或当街揭开。",
    );
  }
  if (!beaten(run, "usurper")) {
    return q("暗助清君", "营在汴京城外。暗助可以，公开造反不行——造反的人最后也会克别人的粮。", "汴京御街北门赴谋逆大营。");
  }
  return q("一方小官", "略受恩惠，安定一方。小官的印泥不香，但能盖在工寮的契上。", "不做大官。做能护住这一方的官。");
}

function mainFor(hero: HeroId, run: Run): QuestEntry {
  if (hero === "seer") return seerMain(run);
  if (hero === "sapper") return sapperMain(run);
  return railMain(run);
}

export function questLog(run: Run): QuestLog {
  const sides: QuestEntry[] = [];
  const main = mainFor(run.hero ?? "rail", run);
  const shut = has(run, "sidesShut");

  sides.push(...brandSides(run, shut));

  if (!shut && has(run, "branded")) {
    const g = gearById(run.weapon);
    const grade = g?.grade ?? 1;
    if (grade < 5) {
      sides.push(
        q(
          grade < SOFT_GRADE_CAP ? "刃可银淬" : "刃吃锻材",
          economyLoopNote(grade, run.silver ?? 0),
          grade < SOFT_GRADE_CAP
            ? "武馆「淬火升成」或砂坑通宝锻，只到良。医馆疗伤八两。"
            : "武馆砂坑「锻材升刃」：精材→玄铁→神髓。炉温谜与中期掉落可补材。店里也能买高成色，贵。",
        ),
      );
    }
  }

  if (!shut && has(run, "sideTaxRumor") && !has(run, "viewTaxLaw")) {
    sides.push(q("墨香闲话", "酒客提起档库缺角。", "墨香楼再问酒客：那该怎么办——三职听法不同。"));
  }
  if (!shut && has(run, "sideTaxStable") && !has(run, "sideTaxRumor")) {
    sides.push(q("草料角纸", "驿厩有人丢过角纸。", "回税市或墨香楼，把闲话问实。"));
  }
  if (!shut && has(run, "sideTaxTea") && !has(run, "caseRebel")) {
    sides.push(q("茶里西路", "茶客说洛阳要从淮阴西去。", "过册后西去亳州·偃师·洛阳，把案卷对上。"));
  }
  if (!shut && has(run, "sideRopeRumor") && !has(run, "viewRopeGrace")) {
    sides.push(q("粥棚皇恩", "工丁记得皇粮那年。", "桩酒楼再问酒客：还信不信圣上。"));
  }
  if (!shut && has(run, "sideRopeWatch") && !has(run, "viewRopeWatch")) {
    sides.push(q("夜班偷料", "更卒夜里见过手脚。", "缆厂更处再问：偷料怎么处。"));
  }
  if (!shut && has(run, "sideRopeStore") && !run.items.includes("deed") && !has(run, "knotOk")) {
    sides.push(q("缆里夹契", "库丁说契有时夹在缆里。", "工寮凳下或缆库翻找工契。"));
  }
  if (!shut && has(run, "viewInnDeep")) {
    sides.push(q("官道三观", "驿站问过乱世凭什么。", "话已入心。往前走时，门、册、粮三样，看你认哪样。"));
  } else if (!shut && has(run, "sideRoadInn") && !has(run, "viewInnDeep")) {
    sides.push(q("驿站乱世", "路上问过闻见。", "再回驿站掌柜：乱世凭什么——三职听法不同。"));
  }

  if (!shut && has(run, "sideTaxWell") && !has(run, "sideTaxRumor") && !has(run, "viewTaxLaw")) {
    sides.push(q("税市井愿", "井边有人提过册角。", "税市或墨香楼把闲话问实。"));
  }
  if (!shut && has(run, "sideRopeWell") && !has(run, "sideRopeRumor") && !has(run, "viewRopeGrace")) {
    sides.push(q("缆井皇粮", "井愿里提起皇粮。", "桩酒楼再问酒客：还信不信圣上。"));
  }

  if (
    !shut &&
    (has(run, "midDoorTrue") || has(run, "midDoorBent")) &&
    !run.party.includes("blade") &&
    !has(run, "joinBlade")
  ) {
    sides.push(q("航下请刀", "建康门事了了。", "建康航下再找江晚涛，请他同行。"));
  }

  if (!shut && has(run, "midEunuchAsked") && !has(run, "traitorSeen") && (run.hero ?? "rail") === "sapper") {
    sides.push(q("宦门站队", "宦门已问过一遍。", "回汴京宦门：暗助，或揭开。"));
  }

  if (!shut && has(run, "taleJiankang") && !has(run, "midSaltAsk") && !has(run, "midSaltLedger") && !has(run, "midSaltMute")) {
    sides.push(q("建康旧事", "踹门时听过一截旧话。", "扬州盐市盐牙处，还能把建康旧事听全。"));
  }

  if (has(run, "bountyActive") && !has(run, "bountyDone")) {
    const raw = run.flags.find((f) => f.startsWith("bountyTarget-"));
    const who = raw ? raw.replace("bountyTarget-", "") : "标的";
    const left = Math.max(0, (run.bountyDeadline ?? run.beaten.length) - run.beaten.length);
    sides.push(
      q(
        "名册差事",
        `标的：${who}。还剩约 ${left} 场名额。`,
        "衙门差事板领的帖。限期内打倒标的，回捕头或当场结赏。",
      ),
    );
  } else if (has(run, "bountyDue")) {
    sides.push(q("差事板亮了", "名册又空了几个位子。", "回岗坡衙门，找捕头领名册差。"));
  }

  if (has(run, "forkOpen") || has(run, "forkRail") || has(run, "forkSeer") || has(run, "forkSapper")) {
    const hero = run.hero ?? "rail";
    if (hero === "rail" && has(run, "forkRail") && !run.visited.includes("railNight")) {
      sides.push(q("夜巷", "破门刀认得出的缝。", "垂街里多了一道夜门。拐进去。"));
    }
    if (hero === "seer" && has(run, "forkSeer") && !run.visited.includes("seerGaze")) {
      sides.push(q("观气隙", "气冷的地方。", "外庭多了一道缝。侧身挤进去。"));
    }
    if (hero === "sapper" && has(run, "forkSapper") && !run.visited.includes("sapperPile")) {
      sides.push(q("桩巷", "桩缝里的路。", "缆厂多了一道桩门。顺着走。"));
    }
  }

  if (has(run, "teaBetOn")) {
    sides.push(q("茶棚注", "下一场真刀的注还压着。", "按息了结才能翻倍。拖过或倒了，押金没。"));
  }

  if (!shut && has(run, "sideWell")) {
    if (has(run, "wellOpen") && !run.party.includes("hermit")) {
      sides.push(q("潮窟有人", "井下通潮窟。", "灯楼下井口进潮窟，看窟里还有没有人。"));
    } else if (has(run, "askedWell") && !has(run, "wellOpen")) {
      sides.push(q("南墙有盖", "灯守说过南墙那口井。", "灯楼南墙揭开井盖。"));
    } else if (has(run, "heardWell") && !has(run, "askedWell") && !has(run, "wellOpen")) {
      sides.push(q("问灯守", "有人把井的事推到灯守身上。", "去灯楼找灯守，问起井。"));
    } else if (!has(run, "wellOpen")) {
      sides.push(q("问井", "港湾有人提起井。", "先问渔寮或挖井的人，再跟线索走。"));
    }
  }
  if (!shut && has(run, "sideTree")) {
    if (!has(run, "treeOpen")) {
      if (has(run, "heardTree")) {
        sides.push(q("棚后歪树", "歪树下有东西。", "垂街茶棚后面，挖那棵歪树。"));
      } else {
        sides.push(q("问树", "巷里有人提起树。", "先问乞儿或茶棚的人。"));
      }
    }
  }
  if (!shut && has(run, "sideStone")) {
    if (has(run, "stoneOpen") && !run.visited.includes("cellar")) {
      sides.push(q("石下有窖", "南桩石头已开。", "港湾南桩进窖看看。"));
    } else if (!has(run, "stoneOpen")) {
      sides.push(q("南桩有石", "南桩下有石会响。", "听过人说之后，再去港湾南桩撬石。"));
    }
  }
  if (!shut && has(run, "heardPlaza") && !has(run, "branded") && !run.items.includes("brand")) {
    sides.push(q("江心问印", "和尚提过印。", "港湾湖亭问坐着的和尚。"));
  }
  if (!shut && has(run, "escortJob") && !has(run, "escortDone")) {
    if (has(run, "escortLong")) {
      const destFlag = run.flags.find((f) => f.startsWith("escortDest-"));
      const destId = destFlag?.replace("escortDest-", "") ?? "";
      const names: Record<string, string> = {
        huainan: "淮阴渡",
        yangzhou: "扬州",
        jiankang: "建康",
        gaoyou: "高邮",
        suzhousu: "宿州",
        luoyang: "洛阳",
      };
      const destName = names[destId] ?? "远城";
      const eliteRaw = run.flags.find((f) => f.startsWith("escortElite-"));
      const eliteId = eliteRaw?.replace("escortElite-", "") ?? "";
      const eliteOk = has(run, "escortEliteDone") || (eliteId !== "" && beaten(run, eliteId as never));
      sides.push(
        q(
          `长镖·${destName}`,
          eliteOk ? "劫镖已清。" : "官道有劫，绕不开。",
          eliteOk ? `押货到${destName}交货结银。` : `先打过官道劫镖，再往${destName}。`,
        ),
      );
    } else {
      sides.push(q("短镖·码头车夫", "镖局给了货箱。", "出码头，把货箱交给码头车夫结银。"));
    }
  }
  if (!shut && has(run, "yamenSalt") && !has(run, "yamenSaltDone")) {
    if (beaten(run, "smuggler")) {
      sides.push(q("缉盐差", "私盐那手已倒。", "回岗坡衙门，找捕头差结银十二两。"));
    } else {
      sides.push(q("缉盐差", "私盐要缉。", "西仓一带查私盐，对上走私的人。"));
    }
  }
  if (!shut && has(run, "yamenBandit") && !has(run, "yamenBanditDone")) {
    if (beaten(run, "bandit")) {
      sides.push(q("清匪帖", "岗花子已倒。", "回衙门结帖。"));
    } else {
      sides.push(q("清匪帖", "岗上有匪。", "按捕头差的帖去清。"));
    }
  }

  if (!shut && has(run, "sideHill") && !has(run, "sideHillDone")) {
    if (beaten(run, "hillBandit") || beaten(run, "mob_road_05") || beaten(run, "mob_road_08")) {
      sides.push(q("山路清匪", "岗匪已倒。", "回滁州醉翁亭外或山猎处结一瓢泉水。"));
    } else {
      sides.push(q("山路清匪", "山路有人拦客。", "滁州、无锡、偃师、潼关一带山坡上找岗匪。"));
    }
  } else if (!shut && has(run, "sideHillHint") && !has(run, "sideHill") && !has(run, "sideHillDone")) {
    sides.push(q("山影有人", "有人提起山路拦客。", "去滁州亭僧或山猎处细问。"));
  }

  if (!shut && has(run, "sideHamAsk") && !has(run, "sideHamDone") && !has(run, "sideHamMute")) {
    sides.push(q("浜上缆堆", "无锡浜上缆堆藏人。", "惠山浜问脚夫：掀缆，或装瞎。"));
  } else if (!shut && has(run, "sideHam") && !has(run, "sideHamDone")) {
    if (beaten(run, "mob_road_05")) {
      sides.push(q("浜上缆堆", "藏人的倒了。", "回惠山浜找脚夫结缆。"));
    } else {
      sides.push(q("浜上缆堆", "缆堆下有脚印。", "惠山浜清掉山影里的人，再回脚夫处。"));
    }
  }

  if (!shut && has(run, "midRoadOfficial") && !has(run, "midRoadOfficialDone")) {
    sides.push(q("假官拦路", "官衣脏了，比匪难认。", "滁州醉翁亭外问亭僧：撕帖，或先跪。"));
  }

  if (!shut && has(run, "sideRiver") && !has(run, "sideRiverDone")) {
    if (has(run, "sideRiverWait")) {
      // 等风也算结了一半；仍可硬闯补刀
      sides.push(q("茅津等风", "你选了等。", "渡口仍可再去；硬闯则过刀。"));
    } else if (beaten(run, "riverThug") || beaten(run, "mob_canal_05")) {
      sides.push(q("茅津贴岸", "水匪倒了。", "回陕州茅津渡或宿迁渡口厨处结袋。"));
    } else {
      sides.push(q("渡口闲刀", "水匪贴岸讨。", "陕州渡口：等风或硬闯；宿迁岸边也有闲刀。"));
    }
  }

  if (!shut && has(run, "sideThief") && !has(run, "sideThiefDone")) {
    if (beaten(run, "thief") || beaten(run, "mob_canal_02") || beaten(run, "mob_canal_04")) {
      sides.push(q("集上剪绺", "剪绺已倒。", "回符离集盐牙或盂城驿湖渔处结袋。"));
    } else {
      sides.push(q("集上剪绺", "集上有人剪袋。", "嘉兴、符离、高邮驿路上找剪绺。"));
    }
  }

  if (!shut && has(run, "sideRoadPouch") && !has(run, "sideRoadPouchDone")) {
    sides.push(q("驿外私信", "常州驿丢过私信。", "问路乞或摊贩，再把囊的事了结给驿卒。"));
  }

  if (!shut && has(run, "sidePatient") && !has(run, "sidePatientDone")) {
    sides.push(q("伤腿问路", "西去有人腿伤。", "在亳州涡水驿外找伤腿客，叫他去药铺。"));
  }

  if (!shut && has(run, "sideRoadWatch") && !has(run, "sideThief") && !has(run, "sideThiefDone")) {
    sides.push(q("闸口眼线", "闸口或关下提起闲人。", "驿路上留神剪绺，也可去集上细问。"));
  }

  if (!shut) {
    for (const side of activePuzzleSides(run.flags)) {
      sides.push(q(side.title, side.blurb, side.guide));
    }
    for (const side of caseSideQuests(run)) {
      sides.push(q(side.title, side.blurb, side.guide));
    }
  }

  return { main, sides };
}
