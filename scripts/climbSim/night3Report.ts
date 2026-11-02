import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import type { Night3Data, Night3Pair, Night3Row } from "./night3Run";
import { SIM_SEED } from "./tiers";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function rate(row: Night3Row): { win: number; hands: number; games: number } {
  let wins = 0;
  let hands = 0;
  let games = 0;
  for (const c of row.cells) {
    wins += c.wins;
    hands += c.handSum;
    games += c.games;
  }
  return { win: games ? wins / games : 0, hands: games ? hands / games : 0, games };
}

function pairBlock(p: Night3Pair): string[] {
  const on = rate(p.on);
  const off = rate(p.off);
  const lines = [
    `### ${p.label}`,
    "",
    `| 馆 | 有·胜 | 无·胜 | 胜差 | 有·手 | 无·手 | 手差 |`,
    `|---|---|---|---|---|---|---|`,
  ];
  for (let i = 0; i < 10; i++) {
    const a = p.on.cells[i]!;
    const b = p.off.cells[i]!;
    const aw = a.games ? a.wins / a.games : 0;
    const bw = b.games ? b.wins / b.games : 0;
    const ah = a.games ? a.handSum / a.games : 0;
    const bh = b.games ? b.handSum / b.games : 0;
    lines.push(
      `| ${i + 1} | ${pct(aw)} | ${pct(bw)} | ${((aw - bw) * 100).toFixed(1)} 点 | ${ah.toFixed(1)} | ${bh.toFixed(1)} | ${(ah - bh).toFixed(1)} |`,
    );
  }
  lines.push("");
  lines.push(
    `合计 有 ${pct(on.win)} / ${on.hands.toFixed(1)} 手，无 ${pct(off.win)} / ${off.hands.toFixed(1)} 手。胜差 ${((on.win - off.win) * 100).toFixed(1)} 点，手差 ${(on.hands - off.hands).toFixed(1)}。`,
  );
  lines.push("");
  return lines;
}

function poisonBlock(rows: Night3Row[]): string[] {
  if (!rows.length) return ["## P3 毒三档", "", "ROLE2 P3 未齐，毒对照没跑。", ""];
  const base = rows[0]!;
  const br = rate(base);
  const lines = [
    "## P3 毒三档",
    "",
    "刀配装。毒件写入 `run.bag`，不改牌面。对照无毒件。",
    "",
    "| 档 | 胜率 | 场均手 | 相对无毒·胜 | 相对无毒·手 |",
    "|---|---|---|---|---|",
  ];
  for (const row of rows) {
    const r = rate(row);
    lines.push(
      `| ${row.label} | ${pct(r.win)} | ${r.hands.toFixed(1)} | ${((r.win - br.win) * 100).toFixed(1)} 点 | ${(r.hands - br.hands).toFixed(1)} |`,
    );
  }
  lines.push("");
  return lines;
}

export function renderNight3(data: Night3Data, gateNote: string): string {
  return [
    "# 夜校三班报告 · 2026-11-02",
    "",
    gateNote,
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · 卡池 ${poolStamp()}。每格 ${data.games} 局，满血单馆。src 未改，旋钮默认未改。`,
    "",
    "## P1 覆盖表",
    "",
    "角色核已落后，对照表改在 `docs/combat/NIGHT_COVERAGE_20261102.md`。职业三件和换武器改为有导出。缘分改为部分导出（温补 / 医杀 / 夜霜 / 刀社）。",
    "",
    "## P2 缘分 / 职业对照",
    "",
    "有 = 盖职业或把 18 人缘分成员写进 `run.party`。无 = 同一武器配装、馆间默认队（不触发那条缘分）。同配装不同花名册，因为结算按 party id 认缘分，没有关缘分开关。",
    "",
    ...data.pairs.flatMap(pairBlock),
    ...poisonBlock(data.poison),
    "未 commit。",
    "",
  ].join("\n");
}
