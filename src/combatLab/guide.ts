import { escapeHtml } from "./setupUi";

const BREAK_SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "30 秒上手",
    body: [
      "门厅：低阶入门看站位；高阶课选练；训练馆专项；开踢走十馆。",
      "敌招意图条全亮：悬停看他要干什么。走开红格或卸力，再出刀。",
      "过一馆拿彩金与战利品；同道第 3/7 馆可带 2 人。",
    ],
  },
  {
    title: "破招充能（上限玩法）",
    body: [
      "位移牌（进步/撤步/换位/击退）各 +1 破招充能，显示在你侧栏。",
      "硬破一段打击类消耗 1 充能 → 破势 + 得势（走开本身已打空，下一刀才打真伤）。",
      "破架类牌 +1 破架充能，拆架势段消耗 1。乱点万能钥匙会作废硬破。",
      "无硬破收势：肉鸽踢馆不留劲（要先破再收）。",
    ],
  },
  {
    title: "破招四档 + 追 + 破眼",
    body: [
      "破：硬拆——记拆、得拆势、得势（空间上走开=打空，杀伤靠你打出拆势那一刀）。",
      "让：还在打得到的地方扛 → 半效，无拆势、不得势。",
      "空：开局就不在红格，他打空，不算拆。",
      "打：还在红格里硬吃。",
      "追：他撤时你朝他进步/纵步并更近 → 硬拆（他仍撤，你得拆势）。没追 = 放。",
      "破眼：硬拆带「眼」段 → 套路崩塌，失衡承伤×2（处决窗）。",
    ],
  },
  {
    title: "七步石台",
    body: [
      "双方各占一格，最多七格直线战场。距离决定能不能打到、能不能拆。",
      "棍/枪等长兵器攻击距离更远；拳掌要贴脸。",
      "劲力有限：每回合回劲，大牌要算好。收势结束回合。",
    ],
  },
  {
    title: "踢馆经济",
    body: [
      "彩金与下注：开打前托管注额；赢返还注×赔率；馆输抽 10% 出血、底彩不发。连破/破眼是高手盘。",
      "第 1 馆庄家垫资；破产线 = 峰值锚 1/3。",
      "结业看破招次数与硬拆/破眼表现，彩金次之。",
    ],
  },
];

export function renderGuideSheet(): string {
  const sections = BREAK_SECTIONS;
  const title = "肉鸽踢馆攻略 · 破招是上限";
  const body = sections
    .map(
      (s) => `
      <section class="lab-guide-section">
        <h3>${escapeHtml(s.title)}</h3>
        ${s.body.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
      </section>`,
    )
    .join("");
  return `
    <div class="lab-wiki-mask" id="lab-guide-mask">
      <div class="lab-wiki-panel lab-guide-panel lab-iron-sheet">
        <header class="lab-wiki-head">
          <h2 class="lab-guide-title">${escapeHtml(title)}</h2>
          <button type="button" class="lab-wiki-close" id="lab-guide-close" aria-label="关闭">×</button>
        </header>
        <div class="lab-guide-body">${body}</div>
        <footer class="lab-wiki-foot lab-guide-foot">
          <span class="muted">详规见 <code>docs/combat/RULES.md</code></span>
        </footer>
      </div>
    </div>`;
}
