/**
 * 洛阳 NPC 古风白话对话（富文本：**线索** · {{警告}}）
 */
export type DialogueLine = { idle: string; thought?: string };

export const LUOYANG_LINES: Record<string, DialogueLine> = {
  judge: {
    idle: "少侠且站稳。本官问的是案，不是刀。**河南府**的印在案上，{{漕帮若再闹天津桥，休怪六扇门下手重。}}",
    thought: "堂上无闲话。",
  },
  caseclerk: {
    idle: "案牍如山哩。少侠要查的字，得有**帖角**才开得了柜。",
  },
  luoBailiff: {
    idle: "少侠来得正好。**漕帮案**正缺人手，{{那帮人在天津桥下有窝点}}，你若能摸到 **漕帮令**，本官重重有赏。",
    thought: "桥下风急，别硬闯。",
  },
  luoClerk: {
    idle: "师爷不卖刀，卖一句实话：近日**青衣人**常在桥南晃，少侠留心罢。",
  },
  luoJailer: {
    idle: "牢房重地。无票莫入。{{强闯者，枷锁伺候。}}",
  },
  luoJailer2: {
    idle: "侧牢潮气重。里面那人，若不是**捕头姜**点头，谁也带不走。",
  },
  luoPrisoner: {
    idle: "壮士……求你带句话给外头：{{天津桥下的青衣，不是寻常匪。}}",
  },
  luoBarkeeper: {
    idle:
      "客官里边请嘞！咱这 **太白酒楼** 的 **牡丹酿**，那可是洛阳一绝。{{只是近日漕帮的人常来闹事，少侠若是看见穿青衣的，躲着点罢。}}",
    thought: "酒暖人，桥冷事。",
  },
  luoCook: {
    idle: "后灶热着。客官要吃，三两银一碗；要学 **醉拳**，另说。",
  },
  luoWaiter: {
    idle: "小的给您添酒！楼上雅座看得见 **天津桥** 哩。",
  },
  luoWaiter2: {
    idle: "客官里边请。小的给您添酒，楼上看得见 **天津桥**。",
  },
  luoGuest: {
    idle: "听说 **定鼎武馆** 的教头手硬，酒楼里也有人想去比划。",
  },
  luoGuest2: {
    idle: "娘子也来听曲？听说 **烟波楼** 的谱，值一坛 **牡丹酿**。",
  },
  luoRaconteur: {
    idle: "听一段罢——话说 **天津桥夜巡**，漕帮专拣无帖的客。**捕头姜**正在找人哩。",
  },
  luoAsha: {
    idle: "过客？烟波楼不卖刀，卖谱。**牡丹谱**缺人听，听完，妾身有 **牡丹酿** 谢你。",
    thought: "谱里有名，名里有债。",
  },
  luoMadam: {
    idle: "情报八两，不还价。{{桥北府衙侧牢有人}}，花银买路，别说是老娘告诉你的。",
  },
  luoGirl: {
    idle: "公子请坐。弦未定，等 **阿砂** 姐姐点头。",
  },
  luoGirl2: {
    idle: "院子里花开得密，少侠可是来听曲的？",
  },
  luoMusician: {
    idle: "弦未定。等阿砂点头，才敢响第二声。",
  },
  luoTurtle: {
    idle: "龟儿在门口看着。闹事的，先过我这一关。",
  },
  luoCoach: {
    idle: "定鼎武馆。步要让，掌要稳。少侠要过招，下场。",
  },
  luoDisciple: {
    idle: "教头说，先站稳，再抡掌。少侠可敢比一比？",
  },
  luoDisciple2: {
    idle: "砂场上的汗，比酒还冲。",
  },
  luoDisciple3: {
    idle: "女弟子也下场。教头说，掌要稳，步要让。",
  },
  luoYardHand: {
    idle: "杂役只扫砂，不扫江湖。少侠自便。",
  },
  luoDoctor: {
    idle: "老朽坐堂。伤药三两一贴。少侠脉口若乱，先坐下。",
  },
  luoHerbBoy: {
    idle: "药童在晒药哩。大夫说 **金创** 与解毒，柜上有。",
  },
  luoHerb: {
    idle: "金创、解毒，柜上有。少侠要抓哪一味？",
  },
  luoHerb2: {
    idle: "抓药的不看刀，看方子。",
  },
  luoVendor: {
    idle: "通远质库。刀贵，名更贵。少侠可是来当，还是来赎？",
  },
  luoTemple: {
    idle: "大秦寺香冷。心热就行。少侠若有心事，可在碑前站一刻。",
  },
  luoPost: {
    idle: "洛阳驿。马在槽，帖在袋。急脚刚走一趟。",
  },
  messenger: {
    idle: "急脚不歇脚。少侠若有文书，递给驿吏罢。",
  },
  luoAntique: {
    idle: "绸缎庄的货认人。认错了，银也回不来。",
  },
  luoHawker: {
    idle: "南市热饼！过桥的人，先垫一口。",
  },
  luoShopHand: {
    idle: "伙计在。老板在里头算账。",
  },
  carter: {
    idle: "车在旁。少侠要脚力，还是要车？",
  },
  docker: {
    idle: "肩上是货。货在，人就在。",
  },
  roadHawker: {
    idle: "路边摊不讲价。真的贵，假的甜。",
  },
  townHawker: {
    idle: "市声杂。少侠要的是货，还是消息？",
  },
  rumorTea: {
    idle: "茶凉了，话还热——**漕帮**近日在桥南出没。",
  },
  luoBeggar: {
    idle: "老汉只要一口热的。少侠行行好罢。",
  },
  luoElder: {
    idle: "永丰坊的老骨头了。少侠赶路，别踩了院里的菜。",
  },
  luoElder2: {
    idle: "殖业坊风硬。孩子在院里玩，少侠轻些走。",
  },
  luoKid: {
    idle: "嘿嘿！桥上能看见船哩！",
  },
  luoKid2: {
    idle: "姐姐说，晚上别去桥下。",
  },
  luoWife: {
    idle: "坊里日子紧。少侠若是买粮，南市更近。",
  },
  passClerk: {
    idle: "验帖。无帖莫闯。少侠把角齐一齐。",
  },
  townWatch: {
    idle: "更鼓在东。宵禁后别晃。{{晃的人，多半不是赶路，是赶名。}}",
  },
  luoGate: {
    idle: "定鼎门。出城有遭遇，进城要帖。少侠可接一趟 **护送**？",
  },
  barber: {
    idle: "剃头三文。少侠要光，还是要齐？",
  },
  butcher: {
    idle: "肉案上的刀，不认江湖，认斤两。",
  },
  luoFlower: {
    idle: "官人买花么？牡丹开了，**天津桥**边更香。{{入夜桥下别晃。}}",
  },
  luoEmbroid: {
    idle: "绣娘不卖刀。要谱，去问 **阿砂** 姐姐。",
  },
  luoShopWife: {
    idle: "铺里的货认人。少侠要布还是要线？",
  },
  luoTeaGirl: {
    idle: "茶博士在。一盏三文。闲话另说——**漕帮**近日在桥南出没。",
  },
  luoWasher: {
    idle: "洛水边浣衣。少侠衣上若有血，俺当没看见。",
  },
};
