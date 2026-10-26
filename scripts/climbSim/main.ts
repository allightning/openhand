import { mkdirSync, writeFileSync } from "fs";
import { setBattleRng } from "../../src/game/sim";
import { runCampaigns } from "./campaign";
import { judgeSelfTest } from "./check";
import { mergeTally } from "./fight";
import { DEFAULT_KNOBS } from "./knobs";
import { gateOf, renderReport } from "./report";
import { runSpot } from "./spot";
import { runSweep } from "./sweep";
import { SIM_SEED } from "./tiers";

const spot = runSpot(DEFAULT_KNOBS);
const campaigns = runCampaigns(DEFAULT_KNOBS);
const tally = { ...spot.tally };
for (const row of campaigns) mergeTally(tally, row.tally);
const sweep = runSweep();
const text = renderReport({
  seed: SIM_SEED,
  knobs: DEFAULT_KNOBS,
  baseline: spot.baseline,
  schools: spot.schools,
  campaigns,
  tally,
  sweep,
});
mkdirSync("docs/combat/sim-reports", { recursive: true });
writeFileSync("docs/combat/sim-reports/2026-10-23.md", text);
console.log(text);

if (process.argv.includes("--check")) {
  const self = judgeSelfTest();
  const gate = gateOf(spot.baseline);
  console.log(`阈值门自测：${self.length ? self.join("；") : "绿样例=绿，空手 8%=红，手数偏离=警告，胜率越界=红"}`);
  console.log(`本跑抽样门：${gate}`);
  setBattleRng(null);
  if (self.length || gate === "red") process.exit(1);
}
setBattleRng(null);
