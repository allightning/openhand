import { bossCount } from "./hero";
import type { HeroId, Run } from "./types";

export interface QuestLog {
  main: string;
  sides: string[];
}

function has(run: Run, id: string): boolean {
  return run.flags.includes(id);
}

function yardSeals(run: Run): boolean {
  return (run.sealProgress.yard ?? []).join(",") === "w,e,s,n";
}

function beaten(run: Run, id: string): boolean {
  return run.beaten.includes(id as Run["beaten"][number]);
}

function sharedAfterBrand(run: Run): string | null {
  if (run.items.includes("brand") && !has(run, "branded")) return "天井烫印";
  if (has(run, "branded") && !yardSeals(run) && !beaten(run, "catcher")) return "院印顺序";
  if (!beaten(run, "catcher")) return "跳板点名";
  if (!run.visited.includes("lane")) return "北巷";
  if (!has(run, "emptyBowl")) return "空碗开锁";
  if (!has(run, "watchOpen")) return "北鼓";
  if (!has(run, "trueMirror")) return "西镜";
  if (!beaten(run, "lord")) return "北房名册";
  return null;
}

function railMain(run: Run): string {
  if (!has(run, "mainOpen")) return "门外有人";
  if (!run.items.includes("brand") && !has(run, "branded")) return "西仓取印";
  const mid = sharedAfterBrand(run);
  if (mid) return mid;
  if (bossCount("rail", run.beaten) < 15) return "名册未齐";
  return "墨未干";
}

function seerMain(run: Run): string {
  if (!beaten(run, "inkhand")) return "案下有手";
  if (!has(run, "booksOk")) return "册角对案";
  if (!beaten(run, "bookcut")) return "潮祠裁页";
  if (!beaten(run, "nametaker")) return "岗上夺名";
  if (!beaten(run, "glasspin")) return "潮口抽钉";
  if (!run.items.includes("brand") && !has(run, "branded")) return "西仓取印";
  const mid = sharedAfterBrand(run);
  if (mid) return mid;
  if (bossCount("seer", run.beaten) < 15) return "名册未齐";
  return "镜还你的脸";
}

function sapperMain(run: Run): string {
  if (!beaten(run, "stakeboss")) return "厂里那根桩";
  if (!beaten(run, "knotboss")) return "坞里死结";
  if (!run.items.includes("deed")) return "盐契出门";
  if (!beaten(run, "robber")) return "缆还认刀";
  if (!run.items.includes("brand") && !has(run, "branded")) return "西仓取印";
  const mid = sharedAfterBrand(run);
  if (mid) return mid;
  if (bossCount("sapper", run.beaten) < 15) return "名册未齐";
  return "桩钉进官道";
}

function mainFor(hero: HeroId, run: Run): string {
  if (hero === "seer") return seerMain(run);
  if (hero === "sapper") return sapperMain(run);
  return railMain(run);
}

export function questLog(run: Run): QuestLog {
  const sides: string[] = [];
  const main = mainFor(run.hero ?? "rail", run);

  if (has(run, "sideWell")) {
    if (has(run, "wellOpen") && !run.party.includes("hermit")) sides.push("潮窟有人");
    else if (has(run, "askedWell") && !has(run, "wellOpen")) sides.push("南墙有盖");
    else if (has(run, "heardWell") && !has(run, "askedWell") && !has(run, "wellOpen")) sides.push("问灯守");
    else if (!has(run, "wellOpen")) sides.push("问井");
  }
  if (has(run, "sideTree")) {
    if (!has(run, "treeOpen")) {
      if (has(run, "heardTree")) sides.push("棚后歪树");
      else sides.push("问树");
    }
  }
  if (has(run, "sideStone")) {
    if (has(run, "stoneOpen") && !run.visited.includes("cellar")) sides.push("石下有窖");
    else if (!has(run, "stoneOpen")) sides.push("南桩有石");
  }

  return { main, sides };
}
