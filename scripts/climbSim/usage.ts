import { CARDS } from "../../src/game/content";
import type { CardTally } from "./fight";

export type UsageRow = {
  id: string;
  name: string;
  plays: number;
  draws: number;
  rate: number;
  watch: boolean;
};

export function usageRows(tally: CardTally, floor = 0.05): UsageRow[] {
  const rows: UsageRow[] = [];
  for (const [id, n] of Object.entries(tally)) {
    if (n.draws <= 0) continue;
    const rate = n.plays / n.draws;
    const card = CARDS[id as keyof typeof CARDS];
    rows.push({
      id,
      name: card?.name ?? id,
      plays: n.plays,
      draws: n.draws,
      rate,
      watch: rate < floor,
    });
  }
  rows.sort((a, b) => a.rate - b.rate || b.draws - a.draws);
  return rows;
}

export function watchList(rows: UsageRow[]): UsageRow[] {
  return rows.filter((row) => row.watch);
}
