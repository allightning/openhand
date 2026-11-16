import { boardStamp, poolStamp } from "./pool";
import { DEFAULT_KNOBS, KNOB_VERSION, knobLabel } from "./knobs";
import { JAG_TARGET } from "./night10Run";
import { OLD_WIN, type Night20Data, type Night20Plan, type Night20Row } from "./night20Run";
import { SIM_SEED } from "./tiers";

const SOURCE: Record<number, string> = {
  2: "裂创",
  6: "直伤",
  8: "直伤",
  9: "直伤",
  10: "直伤",
};

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function mean(n: number, games: number): number {
  return n / Math.max(1, games);
}

function num(n: number): string {
  return n.toFixed(1);
}

function ids(list: string[]): string {
  return list.length ? list.join(" ") : "—";
}

function planRow(p: Night20Plan): string {
  const ult = p.ult ?? "—";
  return `| ${p.stage} | ${p.oldIds.length} | ${ids(p.oldIds)} | ${p.reward.length} | ${ids(p.reward)} | ${p.shop.length} | ${ids(p.shop)} | ${ult} | ${p.pot} | ${p.budget} |`;
}

function ratio(row: Night20Row): string {
  const dealt = mean(row.dmgDealt, row.games);
  const total = row.foeHp + row.waveHp;
  if (total <= 0) return "—";
  return (dealt / total).toFixed(2);
}

function testRow(row: Night20Row): string {
  const dealt = mean(row.dmgDealt, row.games);
  const total = row.foeHp + row.waveHp;
  return `| ${row.stage} | ${row.enemy} | ${pct(row.wins / row.games)} | ${pct(OLD_WIN[row.stage] ?? 0)} | ${JAG_TARGET[row.stage]?.label ?? "—"} | ${row.hit ? "到" : "未到"} | ${num(mean(row.handSum, row.games))} | ${num(mean(row.dmgTaken, row.games))} | ${num(dealt)} | ${num(total)} | ${ratio(row)} |`;
}

function testTalk(rows: Night20Row[]): string {
  const hit = rows.filter((r) => r.hit).map((r) => r.stage);
  const lifted = rows.filter((r) => r.wins / r.games + 1e-9 >= (JAG_TARGET[r.stage]?.floor ?? 0) && (OLD_WIN[r.stage] ?? 0) + 1e-9 < (JAG_TARGET[r.stage]?.floor ?? 0));
  const still = rows.filter((r) => !r.hit).map((r) => r.stage);
  const liftedTxt = lifted.length ? `尺子抬过线的馆：${lifted.map((r) => r.stage).join("、")}。` : "没有馆是旧尺不到、产品尺到了的。";
  return `数字说了什么：产品尺到线 ${hit.join("、") || "无"}。${liftedTxt}仍未到的是真墙候选：${still.join("、") || "无"}。20 局，种子 ${SIM_SEED}，疑似。旧尺列是十八班同盐读数，馆 2 那格是 40 局。`;
}

function wallRow(row: Night20Row): string {
  const dealt = mean(row.dmgDealt, row.games);
  const total = row.foeHp + row.waveHp;
  const source = SOURCE[row.stage] ?? "未验";
  return `| ${row.stage} | ${row.enemy} | ${num(total)} | ${num(row.foeHp)} | ${num(row.waveHp)} | ${num(dealt)} | ${num(total - dealt)} | ${source} |`;
}

export function renderNight20(data: Night20Data): string {
  const walls = data.rows.filter((r) => !r.hit);
  return [
    "# 夜校二十班报告 · 2026-11-16",
    "",
    `种子 ${SIM_SEED} · 旋钮 ${KNOB_VERSION}（${knobLabel(DEFAULT_KNOBS)}） · ${boardStamp()} · ${poolStamp()}。入口 \`npm run sim:climb:night20\`。src 未改。血和兵器档仍读 \`hpOf\` / \`growthOf\`。`,
    "",
    "## P1 注入口径",
    "",
    "旧尺是 `injectForSchool`：按 `growthOf` 抽精 / 绝，三人都注。产品尺只注刀的场上人。",
    "",
    "换算：打完第 k 馆，免费奖励按任务口径抽未持有的凡 2 + 精 1（池 = `breakRewardCardPool`，档位用当时的 `stage = k+1`）。同名不重抽。配方 `climbRecipeFromPiles` 把每个 id 乘 3，所以注一次就是 3 张，再注同名不加量。",
    "",
    "代码里的免费领取不是这个结构：`gauntletRewardTakeCount` 在期末前一馆之前领 2 张，之后领 3 张（`rewardRules.ts`）。这里按任务的凡 2 + 精 1，不按那个领取数。",
    "",
    "绝牌：`rewardGate` 在 `fought >= 7` 才开，也就是馆 8 开打前。馆 7 的对局不注绝。只注 1 张未持有的绝。",
    "",
    "黑市：每馆彩金 `climbHallPot`，保守花一半。先买未持有的凡（8），再买精（18），不买第二张绝。买的也是当时奖励池里的牌。免费从馆 5 起不再增加，池里未持有的凡、精已经抽完，半彩一列因此是 0。表上的「剩」是花不出去的半彩。岸匪这条路的黑市默认不摆（`marketRules.ts` 在 bandit 且未开市时直接返回当铺），当铺也只从同一池抽 1 张。",
    "",
    "| 馆 | 旧尺张 | 旧尺 | 免费 | 免费牌 | 半彩 | 半彩牌 | 绝 | 累计彩金 | 剩 |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...data.plans.map(planRow),
    "",
    "## P2 产品尺复测",
    "",
    "各 20 局。盐 = 兵器档 + 3。敌总血 = 开局主敌 `maxHp` + 波次 `climbWaveBattleHp`。我伤÷敌总血用场均我伤。",
    "",
    "| 馆 | 敌 | 产品尺 | 旧尺 | 线 | 到否 | 场均手 | 敌伤 | 我伤 | 敌总血 | 我伤÷敌总血 |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
    ...data.rows.map(testRow),
    "",
    testTalk(data.rows),
    "",
    "## P3 未到线",
    "",
    walls.length ? "缺口 = 敌总血 − 场均我伤。伤源只写十九班拆过的馆，其余写未验。不出方案。" : "十馆都到线。",
    "",
    ...(walls.length
      ? [
          "| 馆 | 敌 | 敌总血 | 主敌 | 波次 | 我伤 | 缺口 | 伤源 |",
          "|---|---|---|---|---|---|---|---|",
          ...walls.map(wallRow),
        ]
      : []),
    "",
    "未 commit。",
    "",
  ].join("\n");
}
