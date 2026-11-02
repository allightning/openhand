/** P2 重填。只改带内且生成数字与现值不同的字段。超带不自动削。 */
import { loadBaseline } from "./audit";

const CHANGED = [
  { id: "drunkFist", field: "damage", from: 10, to: 9 },
  { id: "jinwuToken", field: "block", from: 5, to: 4 },
  { id: "lateWard", field: "block", from: 16, to: 15 },
  { id: "push", field: "wall", from: 8, to: 9 },
  { id: "saberBleed", field: "damage", from: 7, to: 6 },
];

export function plannedEdits() {
  const rows = loadBaseline().filter((r) => !r.skip && r.band === "in" && r.generated);
  return rows
    .map((r) => {
      const diffs = Object.keys(r.generated!)
        .filter((k) => r.generated![k] !== r.values[k])
        .map((k) => ({ field: k, from: r.values[k], to: r.generated![k] }));
      return { id: r.id, diffs };
    })
    .filter((r) => r.diffs.length);
}

if (process.argv[1]?.includes("numgen/apply")) {
  console.log("P2 已手改（勿重复跑改文件）：", JSON.stringify(CHANGED, null, 2));
  console.log("当前带内待改（对照现值）", plannedEdits());
}
