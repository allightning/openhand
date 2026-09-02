import { escapeHtml } from "./setupUi";

/** 开踢每馆都进赌馆。旧「拆招 1–2 馆跳过」已撤（新手关独立承担教学）。 */
export function shouldSkipWager(_stage: number): boolean {
  return false;
}

/** 新手关开场：三帧说明（仅拆招版 · 新手关入口）。 */
export function renderBreakIntro(): string {
  const frames = [
    {
      n: "①",
      title: "红格 = 他的落点",
      body: "他每一招都先亮落点（红格）。收势时你还站在红格上，这一招就照实打你。",
    },
    {
      n: "②",
      title: "走开 = 攒充能",
      body: "打位移牌（撤步／换位／纵步）离开红格，每张攒 1 点破招充能。破 1 段招耗 1 点——充能是硬破的门票。",
    },
    {
      n: "③",
      title: "硬拆 = 拆势",
      body: "收势时人在红格外、且有充能 = 硬拆：他这一招作废，你拿「拆势」——下一刀兑现真伤加力。",
    },
  ];
  const loops = [
    { k: "回合循环", v: "看意图 → 出牌走位 → 点「收势」结算他的招 → 你回劲抽牌。" },
    { k: "劲力", v: "出牌耗劲，收势回满。劲尽就收，别空手硬挨。" },
    { k: "让（保底）", v: "走不开就在红格里堆格挡：格挡顶住 = 只吃半伤，但没有拆势。能走开就别让。" },
    { k: "追（进阶）", v: "他撤时打进步/纵步朝他靠近 = 追。他仍撤，你得拆势。训练馆有专项课。" },
    { k: "兵刃圈", v: "攻击有距离：刀 2 格（贴脸高、距 2 伤低）、拳 1 格、枪棍 3 格。够不着就是打空。" },
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
