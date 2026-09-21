import { escapeHtml } from "./setupUi";
import {
  CLIMB_BLOCK_CAP,
  CLIMB_BLEED_CAP,
  CLIMB_COMBO_CAP,
  CLIMB_COMBO_REPLAY_COST,
  CLIMB_DUST_MIN_HALL,
  CLIMB_ENDURE_CAP,
  CLIMB_EXPOSE_CAP,
  CLIMB_GUARD_WAGER,
  CLIMB_LIFESTEAL_PCT,
  CLIMB_SPEAR_CUT_QI,
  CLIMB_STAKE_BLAST_DMG,
  CLIMB_STAKE_BREAK_BLOCK,
  CLIMB_STAKE_CAP,
  CLIMB_STUN_N,
  CLIMB_SWORD_CHAIN_CAP,
} from "./climbCaps";

export const GUIDE_SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "这一局在打什么",
    body: [
      "行路：十程连胜。打气血，不破也能走。石台 7 格，站位决定够不够、躲不躲得开。",
      "门厅另有「登门」：短拍谜题看意图破招。本攻略默认讲行路。登门规则见训练馆与登门关。",
      "每程：开打 → 当铺（金创 / 谱 / 小货）。赌馆、黑市只在事页选项里开。带伤过馆，气血不回满。",
    ],
  },
  {
    title: "一回合三截",
    body: [
      "【开始】重建每人牌池（配装∪光环/连携×3，扣手里同名）。场上摸 D=⌈手牌上限/2⌉；晕可少摸到 0。后场每人摸 D−1，摸到上限停。然后亮他这一手整条意图。并手你先；你慢则他先兑完，你这一手空条。",
      "【中期】出牌、走动、置换、换人。手牌中期不设张数上限。弃牌常亮：一点就进弃牌阶段，不能再出牌，可弃任意张（含晕锁的）。手牌超过上限不能收势。拳系可点「连击重放」。",
      "【结束】点收势。先兑他整条意图（晕跳段立刻拿掉；距离不够灰留）。再按序（有才播）：裂创跳血 → 场上回劲 → 敌回劲（断劲挂账先扣）→ 霸体 −1。格挡局内留，不随收势清。",
    ],
  },
  {
    title: "石台 · 先机 · 意图",
    body: [
      "兵刃圈：拳 1 / 刀剑钩 2 / 棍 3 / 枪只能打 2–4 格。红格是他这段的落点。",
      "底速：拳 8、剑 7、刀钩 6、枪棍 5。馆 6–8 敌先机 +1，馆 9–10 +2。并手你先。刀领先不再加面伤（快刀不是核心；兵器「快刀」仍可抽摸回劲）。",
      "意图全段亮出。打完一段少一个。晕 / 缴械跳伤 / 断劲打空：立刻拿掉。距离不够、位移被挡：灰掉留条。不中途补招。",
    ],
  },
  {
    title: "手牌 · 劲力 · 置换",
    body: [
      "手牌上限默认 5、硬顶 10。上限只约束收势与摸牌目标。三人分池，不混。",
      "爬塔每人一条蓝（方案 C）：一档约上限 10 / 开局 6 / 结束回 4，按角色档位。换人扣上场者 1 劲；下场的人余劲留在后场。",
      "置换：弃这张、从抽牌堆顶摸 1。花费 = 牌费 − 1（1 费免费）。可连换。不做 0 费牌。",
    ],
  },
  {
    title: "六系核副（爬塔）",
    body: [
      "每系 1 核 + 1 副，互斥。别系凡牌 / 外功 / 心法不做这两个的主语。",
      `拳：击退 + 连击。命中叠连击（帽 ${CLIMB_COMBO_CAP}），并击退 1。点「连击重放」花 ${CLIMB_COMBO_REPLAY_COST} 层，再打一次上一张攻击（不耗劲、不耗手牌）。`,
      "刀：贴身高伤 + 裂创。贴身命中叠 1 层裂创。裂创回合结束按层扣血；预演只跟注，不进括号构成。",
      `剑：剑势（帽 ${CLIMB_SWORD_CHAIN_CAP}）+ 破绽（帽 ${CLIMB_EXPOSE_CAP}）。剑势等于层数加伤，命中再 +1。破绽：打他耗 1 层穿挡直伤 4。`,
      `枪：距离档 + 断劲。同手两枪都在 3–4 格，立刻扣敌劲 ${CLIMB_SPEAR_CUT_QI}；扣不动的挂下次回劲。不转血。`,
      `棍：桩（场上最多 ${CLIMB_STAKE_CAP} 根）+ 裂桩。敌撞裂你的桩→你格挡 +${CLIMB_STAKE_BREAK_BLOCK}；你打出裂桩拆掉桩→爆炸双方各 ${CLIMB_STAKE_BLAST_DMG} 伤并晕敌 ${CLIMB_STUN_N} 段。桩不能放敌人身后那一格。`,
      `钩：拉近成功才缴械（跳过他下一次有伤）+ 噬血（只对缴械目标回血 ${Math.round(CLIMB_LIFESTEAL_PCT * 100)}%）。`,
    ],
  },
  {
    title: "状态与层帽",
    body: [
      `格挡帽 ${CLIMB_BLOCK_CAP}，局内受击减少。裂创帽 ${CLIMB_BLEED_CAP}。破绽帽 ${CLIMB_EXPOSE_CAP}。霸体帽 ${CLIMB_ENDURE_CAP}（结束 −1，赋予当手也掉）。`,
      `晕 N=${CLIMB_STUN_N}：本手还能咬→锁你最左 N 张 / 他跳段立刻拿掉；已收势→你下手少摸 N，他少亮 N 段。后场摸牌不吃晕。晕 > 缴械。`,
      `迷眼：仅 ${CLIMB_DUST_MIN_HALL} 馆起精英。禁技 / 封囊 / 削谱不进爬塔。失位：换位时你慢，本手先机 −1。`,
      `堆挡注：收势格挡 ≥${CLIMB_GUARD_WAGER}。`,
    ],
  },
  {
    title: "馆间 · 下注 · 同道",
    body: [
      "十馆：前几馆摸构筑，中后馆先机加压。带伤过馆，别把血压到下一馆开局就崩。",
      "行路开战前默认没有赌馆。事页写「进赌馆」才进盘口；单注最高当前彩金 80%。一局最多 3 次。复活赛禁止下注，满状态重打。",
      "江湖入伙走路上的事，不弹馆 3 / 7 陌生人四选一。当铺卖金创、谱、小货；黑市卖外功、淬刃，遭遇可跳过这一摊。",
      "过馆奖励：外功、兵器、同伴、银两。重复外功进「行囊」可投喂升档。",
    ],
  },
  {
    title: "光环 · 连携 · 换人",
    body: [
      "光环：同系三人上场时入手。打出后本场攻击加伤；每个本系池每回 ×3。",
      "连携：只主动换人时入手，每角色 1 张 = 上一个人的系。死亡顶上不给连携。",
      "换人耗上场者 1 劲。后场没劲换不上。",
    ],
  },
  {
    title: "投喂 · 品阶 · 神兵",
    body: [
      "重复外功进「行囊」，喂给已学会这门功的同伴。每喂一次升一档，最高 3 档。2 档约 +15%，3 档约 +30%。",
      "进退类位移牌不能合成；两张同名攻击/技能可以合成换页。",
      "神兵主路和副路分开获得。两把都有之后，配装页可切换甲路 / 乙路。淬刃只加伤害档，神技要真正拿到对应神兵才生效。",
    ],
  },
  {
    title: "预演怎么读",
    body: [
      "悬停攻击牌：括号内只留伤害构成，合计必须等于预演掉血。裂创、噬血、断劲、击退等效果写在括号后。",
      "构成合计对不上就是 bug，记下来。",
    ],
  },
  {
    title: "登门（另开一条）",
    body: [
      "登门看架势与破法，不跟行路气血同胜。意图可半隐。硬拆攒拆势；破眼套路崩。",
      "默认不扩登门难度。要练进训练馆 / 登门关。",
    ],
  },
];

export function renderGuideSheet(): string {
  const title = "行路攻略 · 十程详解";
  const body = GUIDE_SECTIONS.map(
    (s) => `
      <section class="lab-guide-section">
        <h3>${escapeHtml(s.title)}</h3>
        ${s.body.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
      </section>`,
  ).join("");
  return `
    <div class="lab-wiki-mask" id="lab-guide-mask">
      <div class="lab-wiki-panel lab-guide-panel lab-iron-sheet">
        <header class="lab-wiki-head">
          <h2 class="lab-guide-title">${escapeHtml(title)}</h2>
          <button type="button" class="lab-wiki-close" id="lab-guide-close" aria-label="关闭">×</button>
        </header>
        <div class="lab-guide-body">${body}</div>
      </div>
    </div>`;
}
