import { escapeHtml } from "./setupUi";
import { campaignBadge, campaignGoalLine, type BreakCampaignRun } from "./breakCampaign";
import {
  MOVE_LABEL,
  QI_BOARD,
  QI_CARDS,
  qiCardTip,
  qiCoachLine,
  threatCell,
  type FoeMove,
  type QiCardKind,
  type QiFight,
} from "./qiCommit";

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function moveHint(move: FoeMove): string {
  if (move === "sweep") return "用 拆·压";
  if (move === "pierce") return "用 拆·点";
  if (move === "crash") return "用 拆·引";
  return "攻牌打断 · 伤×2";
}

function kindLabel(kind: QiCardKind): string {
  if (kind === "break") return "拆";
  if (kind === "brace") return "架";
  if (kind === "dodge") return "闪";
  if (kind === "step") return "步";
  return "攻";
}

function commitLabel(tier: string): string {
  if (tier === "hard") return "已硬拆";
  if (tier === "graze") return "已架";
  if (tier === "dodge") return "已闪";
  if (tier === "attack") return "已攻";
  if (tier === "ult") return "绝式";
  if (tier === "miss") return "拆空";
  return "已落";
}

function meter(label: string, cur: number, max: number, extra = ""): string {
  const pct = Math.max(0, Math.min(100, Math.round((cur / Math.max(1, max)) * 100)));
  return `<div class="qi-meter">
    <span class="qi-meter-k">${escapeHtml(label)}</span>
    <span class="qi-meter-v">${cur}<em>/${max}</em>${extra ? ` <i>${escapeHtml(extra)}</i>` : ""}</span>
    <span class="qi-meter-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>
  </div>`;
}

export function renderQiCommitBattle(f: QiFight, run: BreakCampaignRun): string {
  const segs = f.queue
    .map((s, i) => {
      const red = threatCell(s);
      const ink = red != null && f.inkCells.includes(red) ? " is-ink" : "";
      const committed = s.commit ? " is-locked" : "";
      const tag = s.commit ? commitLabel(s.commit.tier) : `${i + 1}`;
      const dmg = s.move === "windup" ? "不掉血" : `${s.damage} 伤`;
      const cellTxt = red != null ? `${red + 1} 格` : "无红格";
      return `<button type="button" class="qi-seg qi-seg-${s.move}${ink}${committed}" data-qi-seg="${i}" ${
        s.commit ? "disabled" : ""
      } data-tip="${escapeAttr(`${MOVE_LABEL[s.move]} · ${cellTxt} · ${dmg} · ${moveHint(s.move)}`)}">
        <span class="qi-seg-ord">${escapeHtml(tag)}</span>
        <strong class="qi-seg-move">${MOVE_LABEL[s.move]}</strong>
        <b class="qi-seg-dmg">${escapeHtml(dmg)} · ${escapeHtml(cellTxt)}</b>
        <small class="qi-seg-how">${escapeHtml(moveHint(s.move))}</small>
      </button>`;
    })
    .join("");

  const cards = f.hand
    .map((c) => {
      const def = QI_CARDS[c.defId];
      const hot = f.selectedUid === c.uid ? " is-hot" : "";
      const dead = f.qi < def.cost ? " is-dead" : "";
      return `<button type="button" class="qi-card qi-card-${def.kind}${hot}${dead}" data-qi-card="${c.uid}" data-tip="${escapeAttr(
        qiCardTip(c.defId),
      )}">
        <span class="qi-card-kind">${kindLabel(def.kind)}</span>
        <span class="qi-card-cost">${def.cost}</span>
        <h3>${escapeHtml(def.name)}</h3>
        <p>${escapeHtml(qiCardTip(c.defId))}</p>
      </button>`;
    })
    .join("");

  const recap = f.lastRecap.length
    ? `<p class="qi-recap">上一拍：${f.lastRecap.map((r) => `${r.name}${r.outcome}`).join(" · ")}</p>`
    : "";
  const selected = f.hand.find((c) => c.uid === f.selectedUid);
  const atkReady = Boolean(selected && QI_CARDS[selected.defId].kind === "attack");
  const ultOk = f.momentum >= 8 && !f.ultUsedThisTurn;
  const pickHint = selected
    ? QI_CARDS[selected.defId].kind === "step"
      ? `已走位。看石台：红格会打中你，非红格会打空。`
      : QI_CARDS[selected.defId].kind === "attack"
        ? `已选攻牌 → 点蓄力段才是双倍；点「攻·直取」只打基础伤`
        : `已选「${QI_CARDS[selected.defId].name}」→ 点中间带红格的来招`
    : qiCoachLine(f);

  const board = Array.from({ length: QI_BOARD }, (_, i) => {
    const threats = f.queue.filter((s) => threatCell(s) === i).map((s) => MOVE_LABEL[s.move]);
    const ink = f.inkCells.includes(i);
    const you = f.playerPos === i;
    const foe = f.enemyPos === i;
    const cls = [
      "qi-cell",
      you ? "is-you" : "",
      foe ? "is-foe" : "",
      threats.length ? "is-threat" : "",
      ink ? "is-ink" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const who = [ink ? "墨" : "", you ? "你" : "", !you && foe ? "敌" : "", !you && !ink ? threats.join("") : ""]
      .filter(Boolean)
      .join("");
    return `<div class="${cls}" data-qi-cell="${i}">
      <em>${i + 1}</em>
      <span>${who || "·"}</span>
    </div>`;
  }).join("");

  const incoming = f.queue.length
    ? f.queue
        .map((s) => {
          const red = threatCell(s);
          return `${MOVE_LABEL[s.move]}${red != null ? `${red + 1}格` : ""}${s.damage ? `${s.damage}伤` : ""}`;
        })
        .join(" · ")
    : "无";

  return `
    <div class="lab-battle-shell qi-commit-shell">
      <section class="qi-commit-combat" aria-label="气力承诺">
        <header class="qi-head">
          <div class="qi-head-left">
            <span class="qi-kicker">${escapeHtml(campaignBadge(run))}</span>
            <h1>气力承诺</h1>
          </div>
          <p class="qi-goal">${escapeHtml(campaignGoalLine(run))}</p>
          <p class="qi-glossary">气力：本拍能花的点。拆 2、架/闪/步/攻 1；硬拆立刻还 1；每拍回 3，「过」再给下拍存 1（上限 5）。气势：硬拆或墨痕每段 +1。▲3 直取收势 +1 伤，▲5 每拍回 4 气，▲8 开绝式。墨痕：硬拆印在红格上，他再打这格会自动破，并再留一轮。</p>
          <span class="qi-beat">第 ${f.turn} 拍</span>
        </header>

        <div class="qi-table">
          <aside class="qi-side qi-side-you">
            <b>你</b>
            ${meter("气血", f.playerHp, f.playerHpMax)}
            ${meter("气力", f.qi, f.qiCap, f.banked ? `存${f.banked}` : "")}
            ${meter("气势", f.momentum, 8, f.momentum >= 8 ? "绝式可开" : "")}
          </aside>
          <div class="qi-mid">
            <div class="qi-mid-label">七步石台 · 红格来招才打得到你</div>
            <div class="qi-board" id="qi-board">${board}</div>
            <div class="qi-queue" id="qi-queue">${segs || "<span class='qi-empty'>本拍无来招——用攻直取砍血</span>"}</div>
            <p class="qi-pick">${escapeHtml(pickHint)}</p>
            ${recap}
          </div>
          <aside class="qi-side qi-side-foe">
            <b>敌</b>
            ${meter("气血", f.enemyHp, f.enemyHpMax)}
            <p class="qi-foe-in">${escapeHtml(incoming)}</p>
            ${f.enemyHpMax >= 50 ? `<p class="qi-foe-note">过关看上方目标，不靠砍血。</p>` : `<p class="qi-foe-note">砍到 0 才过。有来招先处理红格。</p>`}
          </aside>
        </div>

        <footer class="qi-dock">
          <div class="qi-hand">${cards}</div>
          <div class="qi-actions">
            <button type="button" class="lab-btn" id="qi-pass" ${f.passed ? "disabled" : ""}>过 · 存 1 气</button>
            <button type="button" class="lab-btn" id="qi-atk-free" ${atkReady ? "" : "disabled"}>攻 · 直取</button>
            <button type="button" class="lab-btn" id="qi-ult" ${ultOk ? "" : "disabled"}>绝式 ▲8</button>
            <button type="button" class="lab-btn primary" id="qi-end">收势结算</button>
          </div>
        </footer>
      </section>
    </div>`;
}
