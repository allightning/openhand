import { escapeHtml } from "./setupUi";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "30 秒上手",
    body: [
      "开踢 → 选一门兵器 → 首馆垫资（×2 或 ×3 彩金）→ 可选下注 → 进战斗。",
      "敌招意图条全亮：悬停看「破法」。你的目标是用对的牌拆掉危险段，再反打。",
      "过一馆拿彩金与战利品；输一场连胜清零。彩金够复活费可赊账一次（救命奖励四选一）。",
    ],
  },
  {
    title: "拆招四档（核心）",
    body: [
      "破：硬拆一段——那段作废，并反打真伤（最常见）。",
      "让：离开红格/拉开距离，敌人打空（够不着时自动让）。",
      "空：敌人本段够不着你，不用管也会打空。",
      "打：硬吃或格挡扛过去（拆不了时的退路）。",
      "破眼：拆掉带「眼」标记的那一段 → 套路崩塌，失衡承伤×2（处决窗）。",
    ],
  },
  {
    title: "七步石台",
    body: [
      "双方各占一格，最多七格直线战场。距离决定能不能打到、能不能拆。",
      "棍/枪等长兵器攻击距离更远；拳掌要贴脸。位移牌（进步/撤步/换位）既是拆招也是抢位。",
      "劲力有限：每回合回劲，大牌要算好。收势结束回合。",
    ],
  },
  {
    title: "踢馆经济",
    body: [
      "彩金 = 钱包：底彩、下注赢赔、黑市购物、复活费都花它。",
      "开擂前可下注（速胜/连拆/破眼/完璧/血战等），赢按赔率翻倍，输注额归庄家。",
      "第 1 馆庄家垫资二选一；破产线 = 峰值锚的 1/3，低于此不可赊账。",
      "领奖屏黑市可买伤药、谱牌、外功、淬刃；见好就收可带彩金上榜。",
    ],
  },
  {
    title: "快速变强路线",
    body: [
      "先读懂意图条：优先拆高伤段和带眼的段，别乱丢攻击牌。",
      "奖励优先：补本系攻击牌 > 外功 > 淬刃升阶 > 道具。",
      "第 4 馆选同道后组合技/光环才全开；前期单人别硬凹共鸣。",
      "实验台可调敌压、单卡数值、敌人气血等——调完记得开新局生效。",
    ],
  },
];

export function renderGuideSheet(): string {
  const body = SECTIONS.map(
    (s) => `
      <section class="lab-guide-section">
        <h3>${escapeHtml(s.title)}</h3>
        ${s.body.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
      </section>`,
  ).join("");
  return `
    <div class="lab-wiki-mask" id="lab-guide-mask">
      <div class="lab-wiki-panel lab-guide-panel">
        <header class="lab-wiki-head">
          <h2 class="lab-guide-title">新手攻略 · 快速入门</h2>
          <button type="button" class="lab-wiki-close" id="lab-guide-close" aria-label="关闭">×</button>
        </header>
        <div class="lab-guide-body">${body}</div>
        <footer class="lab-wiki-foot lab-guide-foot">
          <span class="muted">详规见 <code>docs/combat/RULES.md</code></span>
        </footer>
      </div>
    </div>`;
}
