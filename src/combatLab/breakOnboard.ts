import { escapeHtml } from "./setupUi";
import { getLabRuleset } from "./labRuleset";

/** 行路默认不开赌馆；选项 openWager 之后才进盘口。登门仍每场可押。 */
export function shouldSkipWager(_stage: number, run?: { pendingOpenWager?: boolean }): boolean {
  if (getLabRuleset() !== "climb") return false;
  return !run?.pendingOpenWager;
}

/** 新手关开场：三帧说明（仅拆招版 · 新手关入口）。 */
export function renderBreakIntro(): string {
  const frames = [
    {
      n: "①",
      title: "红格 = 他的落点",
      body: "条上每招会把落点染红。你点「收势」时人还在红格里，这一招打中你。走出红格，这一招打空。",
    },
    {
      n: "②",
      title: "走开 = 攒充能",
      body: "打「撤步」「换位」「纵步」走出红格，每张攒 1 点破招。硬拆 1 段招扣 1 点。没破招，走出去也拆不掉。",
    },
    {
      n: "③",
      title: "硬拆 = 拆势",
      body: "点「收势」时人在红格外、手里有破招 = 硬拆：这一招作废，你得 1 层「拆势」。下一刀穿他的架，打真伤。",
    },
  ];
  const loops = [
    { k: "回合循环", v: "看条上的招 → 出牌走位 → 点「收势」他按条出手 → 你回满劲，再摸牌。" },
    { k: "劲力", v: "出牌耗劲。点「收势」回满。劲尽就收，别空手硬挨。" },
    { k: "让（保底）", v: "走不开就在红格里打「格挡」。格挡顶住 = 让：伤减半，不得拆势。能走开就别让。" },
    { k: "追（进阶）", v: "他出「撤」时打「进步」「纵步」靠近再点「收势」= 追。他仍撤走，你得拆势。训练馆有专项课。" },
    { k: "兵刃圈", v: "刀 2 格（贴脸伤高、距 2 伤低）、拳 1 格、枪棍 3 格。够不着打空。" },
  ];
  const cards = frames
    .map(
      (f) => `
      <div class="lab-break-intro-card">
        <em>${f.n}</em>
        <b>${escapeHtml(f.title)}</b>
        <p>${escapeHtml(f.body)}</p>
      </div>`,
    )
    .join("");
  const loopCards = loops
    .map(
      (l) => `
      <div class="lab-break-intro-card mini">
        <b>${escapeHtml(l.k)}</b>
        <p>${escapeHtml(l.v)}</p>
      </div>`,
    )
    .join("");
  return `
    <div class="gauntlet-shell lab-break-intro work-screen">
      <header class="hall-chrome">
        <button type="button" class="lab-btn hall-back" id="break-intro-back">回门厅</button>
        <div class="hall-chrome-title">
          <h2>新手关</h2>
          <p>六局：硬拆 · 充能 · 让 · 破架 · 破眼 · 换人。每局锁牌跟打，打完回门厅。</p>
        </div>
        <p class="lab-break-intro-tag">锁刀 · 不含选线／下注</p>
      </header>
      <div class="lab-break-intro-body">
        <div class="lab-break-intro-row">${cards}</div>
        <div class="lab-break-intro-row">${loopCards}</div>
        <div class="gauntlet-wager-actions">
          <button type="button" class="lab-btn primary large" id="break-intro-go">开始</button>
        </div>
      </div>
    </div>`;
}
