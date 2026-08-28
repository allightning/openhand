import { isBreakAlign } from "./labRuleset";
import { escapeHtml } from "./setupUi";

const CLASSIC_SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "30 秒上手",
    body: [
      "开踢 → 选线选兵器 → 首馆垫资（×2 或 ×3 彩金）→ 可选下注 → 进战斗。",
      "15 馆长线爬塔，通关后可无尽续踢；过一馆拿彩金与战利品，输一场连胜清零。",
      "意图条可看敌招，但核心是 build 成长、彩金经济与押注。",
    ],
  },
  {
    title: "踢馆经济（核心）",
    body: [
      "彩金 = 钱包：底彩、下注赢赔、黑市购物、复活费都花它。",
      "开擂前可下注（速胜/血战/完璧等），赢按赔率翻倍，输注额归庄家。",
      "第 1 馆庄家垫资二选一；破产线 = 峰值锚的 1/3，低于此不可赊账。",
      "领奖屏黑市可买伤药、谱牌、外功、淬刃；见好就收可带彩金上榜。",
    ],
  },
  {
    title: "build 与同道",
    body: [
      "奖励优先：补本系攻击牌 > 外功 > 淬刃升阶 > 道具。",
      "第 4 / 7 / 12 馆选同道（最多 1 人），组合技/光环才全开。",
      "七步石台：距离决定能不能打到；位移牌抢位，拆招是辅助手段。",
    ],
  },
  {
    title: "拆招（辅助模块）",
    body: [
      "意图条可读敌招：悬停看段伤害与破法。",
      "硬拆 = 那段作废 + 反打；让拆 = 半效；够不着 = 空。",
      "对战版不强调充能与破眼——能读懂高伤段、会卸力即可。",
    ],
  },
];

const BREAK_SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "30 秒上手",
    body: [
      "10 馆短局：前两关入门，后八关正式踢馆。期末即毕业，无无尽。",
      "敌招意图条全亮：悬停看「破法」。硬拆危险段，再反打。",
      "过一馆拿彩金与战利品；同道第 4/7 馆可带 2 人。",
    ],
  },
  {
    title: "拆招充能（核心）",
    body: [
      "位移牌（进步/撤步/换位/击退）各 +1 拆招充能，显示在你侧栏。",
      "硬拆一段打击类消耗 1 充能 → 那段全免 + 反打真伤 + 得势。",
      "破架类牌 +1 破架充能，拆架势段消耗 1。乱点万能钥匙会作废硬拆。",
      "无硬拆收势：拆招版不留劲（要先拆再收）。",
    ],
  },
  {
    title: "拆招四档 + 破眼",
    body: [
      "破：硬拆——那段作废，反打真伤（最常见）。",
      "让：格挡够 / 拉开 → 半效，不得势。",
      "空：敌人够不着你，不用管也会打空。",
      "打：硬吃或格挡扛过去。",
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
      "彩金与下注仍在：偏连拆/破眼/硬拆等拆招盘口。",
      "第 1 馆庄家垫资；破产线 = 峰值锚 1/3。",
      "结业看破招次数与硬拆/破眼表现，彩金次之。",
    ],
  },
];

export function renderGuideSheet(): string {
  const sections = isBreakAlign() ? BREAK_SECTIONS : CLASSIC_SECTIONS;
  const title = isBreakAlign() ? "拆招攻略 · 硬拆反打" : "对战攻略 · 爬塔入门";
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
      <div class="lab-wiki-panel lab-guide-panel">
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
