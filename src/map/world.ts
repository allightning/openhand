import type { EnemyId, Run, TechniqueId } from "../game/types";
import { ENEMIES, TECHNIQUES } from "../game/content";
import { ESCORT_DESTS, pickEscortJob } from "../game/economy";
import { gateScarOpen } from "../game/hooks";
import { lessonByPick, martialOffers } from "../game/lessons";
import { remapEnemy } from "../game/hero";
import { makeRun } from "../game/run";
import { canTravelTo } from "./access";
import { canEnterHubScene } from "./hubScenes";
import {
  bumpVoice,
  itemVoice,
  propVoice,
  SCENES,
  talkBeat,
} from "./scenes";
import type {
  Cache,
  Dir,
  GroundItem,
  InteractAction,
  MapNpc,
  Portal,
  Pos,
  Prop,
  PropKind,
  Seal,
  SealId,
  Talker,
  Tile,
  World,
  SceneId,
} from "./types";
import { isOutdoor } from "./tileset";

const ENEMY_PITCH: Partial<Record<EnemyId, string>> = Object.fromEntries(
  Object.values(ENEMIES).map((e) => [e.id, e.pitch]),
) as Partial<Record<EnemyId, string>>;

const SEAL_LETTER: Record<string, SealId> = {
  n: "n",
  e: "e",
  w: "w",
  s: "s",
  x: "x",
};

export const SEAL_ORDER: SealId[] = SCENES.yard.order;

const PROP_LETTER: Record<string, PropKind> = {
  v: "crate",
  b: "barrel",
  l: "lantern",
  r: "coil",
  p: "post",
  t: "bench",
  j: "jar",
  a: "jar",
  "&": "tree",
  d: "dummy",
  o: "stool",
  y: "table",
  z: "rack",
  c: "sandbag",
  k: "cabinet",
  i: "shelf",
  u: "bed",
  q: "counter",
  h: "screen",
  f: "pot",
  m: "desk",
  g: "censer",
};

const BLOCKING: PropKind[] = [
  "barrel",
  "crate",
  "cart",
  "post",
  "bench",
  "jar",
  "well",
  "stone",
  "tree",
  "house",
  "stall",
  "dummy",
  "table",
  "stool",
  "rack",
  "sandbag",
  "cabinet",
  "shelf",
  "bed",
  "counter",
  "screen",
  "censer",
  "basin",
  "drum",
  "mat",
  "banner",
  "board",
  "pot",
  "desk",
];

function tileOf(ch: string, scene: SceneId): Tile {
  if (ch === "#") return "wall";
  if (ch === "~") return "water";
  // % = 水岸/泽；^ = 山丘（户外恢复高度感，不再整片压成水）
  if (ch === "%") return isOutdoor(scene) ? "water" : "rock";
  if (ch === "^") return isOutdoor(scene) ? "hill" : "rock";
  if (ch === "=") return "road";
  if (ch === ",") return "pack";
  if (ch === "G") return "gate";
  if (ch === "!") return "sign";
  if (ch === "C") return "cache";
  if (ch === "*") return "brazier";
  if (ch === "I" || ch === "$") return "item";
  if (SEAL_LETTER[ch]) return "seal";
  return "floor";
}

/** 人站路上时 ASCII 字母会盖掉 `=`；把走廊缺口补回路面，避免路被掐断。 */
function healRoadGaps(tiles: Tile[][]): void {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  const roadish = (t?: Tile) => t === "road" || t === "gate" || t === "pack";
  const fixes: { x: number; y: number }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tiles[y][x] !== "floor") continue;
      const n = roadish(tiles[y - 1]?.[x]);
      const s = roadish(tiles[y + 1]?.[x]);
      const e = roadish(tiles[y]?.[x + 1]);
      const w_ = roadish(tiles[y]?.[x - 1]);
      if ((n && s) || (e && w_) || (n && e && s) || (n && w_ && s) || (e && n && w_) || (e && s && w_)) {
        fixes.push({ x, y });
      }
    }
  }
  for (const { x, y } of fixes) tiles[y][x] = "road";
}

export function hasFlag(run: Run, id: string): boolean {
  return run.flags.includes(id);
}

export function hasItem(run: Run, id: Run["items"][number]): boolean {
  return run.items.includes(id);
}

export function sealsComplete(w: World): boolean {
  if (w.order.length === 0) return true;
  return (
    w.progress.length === w.order.length &&
    w.progress.every((id, i) => id === w.order[i])
  );
}

export function gateOpen(w: World, run: Run): boolean {
  if (w.gate === "open") return true;
  if (gateScarOpen(w.gate, run.flags)) return true;
  if (w.gate === "fire-seals") return hasFlag(run, "branded") && sealsComplete(w);
  if (w.gate === "watch") return hasFlag(run, "watchOpen") || w.progress.includes("n");
  if (w.gate === "mirror") return hasFlag(run, "trueMirror") || w.progress.includes("w");
  if (w.gate === "books") return hasFlag(run, "booksOk");
  if (w.gate === "deed") return hasItem(run, "deed");
  if (w.gate === "tide") return hasFlag(run, "tideOpen") || w.progress.includes("s");
  if (w.gate === "incense") return hasItem(run, "incense");
  if (w.gate === "crossing") {
    const need = ["catcher", "escort", "piler", "delay", "twin"] as const;
    return need.every((id) => run.beaten.includes(id));
  }
  return false;
}

function extraProp(scene: SceneId, ch: string): { kind: PropKind; tag: string } | null {
  if (scene === "ropes" && ch === "d") return { kind: "coil", tag: "deadKnot" };
  if (scene === "ropes" && ch === "h") return { kind: "coil", tag: "looseKnot" };
  if (scene === "lamp" && ch === "u") return { kind: "well", tag: "hiddenWell" };
  if (scene === "tea" && ch === "f") return { kind: "tree", tag: "hiddenTree" };
  if (scene === "wharf" && ch === "m") return { kind: "stone", tag: "hiddenStone" };
  if (ch === "f" && (scene === "wharf" || scene === "pier" || scene === "plot" || scene === "ridge")) {
    return { kind: "cart", tag: "cart" };
  }
  if ((scene === "luoyang" || scene.startsWith("luoyang_")) && ch === "f") {
    return { kind: "cart", tag: "carriage" };
  }
  // 古井：仅户外特定场景用 o；室内 o 留给凳
  if (ch === "o" && (scene === "wharf" || scene === "spit" || scene === "yard" || scene === "ridge" || scene === "plot" || scene === "lamp" || scene === "sluice" || scene === "pier")) {
    return { kind: "well", tag: "well" };
  }
  if (scene === "drums" && ch === "z") return { kind: "drum", tag: "watchDrum" };
  if (scene === "clinic" && ch === "f") return { kind: "basin", tag: "wash" };
  if ((scene === "wine" || scene === "lodge") && ch === "f") return { kind: "board", tag: "kitchen" };
  if ((scene === "yamen" || scene === "escort") && ch === "h") return { kind: "post", tag: "flag" };
  if ((scene === "shrine" || scene === "tea") && ch === "c") return { kind: "mat", tag: "mat" };
  if (scene === "pawn" && ch === "k") return { kind: "counter", tag: "pawnDesk" };
  if (ch === "S" && (scene === "wharf" || scene === "lane")) return { kind: "stall", tag: "stall" };
  if (ch === "H" && scene === "linan") return { kind: "house", tag: "雷峰塔" };
  if (ch === "H" && scene === "chuzhou") return { kind: "house", tag: "醉翁亭" };
  if (ch === "H" && scene === "huainan") return { kind: "house", tag: "驿馆" };
  if (
    ch === "H" &&
    (scene === "plot" ||
      scene === "ridge" ||
      scene === "wharf" ||
      scene === "lane" ||
      scene === "flower" ||
      scene === "escort" ||
      scene === "yamen" ||
      scene === "martial")
  ) {
    return { kind: "house", tag: "shed" };
  }
  // Decorative gates: walkable, not portals. ; = named 税卡 / 门额, : = plain arch (no「门」字).
  if (ch === ";") {
    if (scene === "wharf") return { kind: "arch", tag: "税卡" };
    if (scene === "ridge") return { kind: "arch", tag: "衙门" };
    return { kind: "arch", tag: "" };
  }
  if (ch === ":") return { kind: "arch", tag: "" };
  return null;
}

function propTag(scene: SceneId, ch: string): string | undefined {
  if (ch === "a") {
    if (scene === "salt") return "westSalt";
    if (scene === "shrine") return "altar";
    return "empty";
  }
  if (scene === "salt" && ch === "j") return "eastSalt";
  if (scene === "shed" && ch === "t") return "slip";
  if (scene === "ropes" && ch === "r") return "liveKnot";
  return undefined;
}

function npcAt(w: World, x: number, y: number): MapNpc | undefined {
  return w.npcs.find((n) => !n.beaten && n.x === x && n.y === y);
}

function inBounds(w: World, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < w.w && y < w.h;
}

function talkerAt(w: World, x: number, y: number): Talker | undefined {
  return w.talkers.find((t) => t.x === x && t.y === y);
}

function propAt(w: World, x: number, y: number): Prop | undefined {
  return w.props.find((p) => p.x === x && p.y === y);
}

function sealAt(w: World, x: number, y: number): Seal | undefined {
  return w.seals.find((s) => s.x === x && s.y === y);
}

export function walkable(w: World, x: number, y: number, run: Run): boolean {
  if (!inBounds(w, x, y)) return false;
  const t = w.tiles[y][x];
  if (t === "wall" || t === "water" || t === "rock" || t === "hill") return false;
  if (t === "gate" && !gateOpen(w, run)) return false;
  if (npcAt(w, x, y)) return false;
  if (talkerAt(w, x, y)) return false;
  const prop = propAt(w, x, y);
  if (prop && BLOCKING.includes(prop.kind)) return false;
  return true;
}

export function floodFloor(w: World, run: Run, ignoreFoes = true): Set<string> {
  const pass = (x: number, y: number): boolean => {
    if (!inBounds(w, x, y)) return false;
    const t = w.tiles[y][x];
    if (t === "wall" || t === "water" || t === "rock" || t === "hill") return false;
    if (t === "gate" && !gateOpen(w, run)) return false;
    if (talkerAt(w, x, y)) return false;
    const prop = propAt(w, x, y);
    if (prop && BLOCKING.includes(prop.kind)) return false;
    if (!ignoreFoes && npcAt(w, x, y)) return false;
    return true;
  };
  const start = `${w.player.x},${w.player.y}`;
  const seen = new Set<string>();
  if (!pass(w.player.x, w.player.y) && !inBounds(w, w.player.x, w.player.y)) return seen;
  const queue = [start];
  seen.add(start);
  for (let i = 0; i < queue.length; i++) {
    const key = queue[i];
    const comma = key.indexOf(",");
    const x = Number(key.slice(0, comma));
    const y = Number(key.slice(comma + 1));
    for (const d of STEP) {
      const nx = x + d.x;
      const ny = y + d.y;
      const next = `${nx},${ny}`;
      if (seen.has(next) || !pass(nx, ny)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

const STEP: { dir: Dir; x: number; y: number }[] = [
  { dir: "up", x: 0, y: -1 },
  { dir: "down", x: 0, y: 1 },
  { dir: "left", x: -1, y: 0 },
  { dir: "right", x: 1, y: 0 },
];

function pathCell(
  w: World,
  run: Run,
  x: number,
  y: number,
  _goalX: number,
  _goalY: number,
  explored: (x: number, y: number) => boolean,
): boolean {
  if (!explored(x, y)) return false;
  // Portals stay walkable for click-pathing; mid-path travel is suppressed in tryMove.
  if (!walkable(w, x, y, run)) return false;
  return true;
}

export function findPath(
  w: World,
  run: Run,
  tx: number,
  ty: number,
  explored: (x: number, y: number) => boolean,
): Dir[] {
  const sx = w.player.x;
  const sy = w.player.y;
  if (sx === tx && sy === ty) return [];
  if (!inBounds(w, tx, ty) || !explored(tx, ty)) return [];

  const goals = new Set<string>();
  if (pathCell(w, run, tx, ty, tx, ty, explored)) goals.add(`${tx},${ty}`);
  else {
    for (const d of STEP) {
      const nx = tx + d.x;
      const ny = ty + d.y;
      if (pathCell(w, run, nx, ny, nx, ny, explored)) goals.add(`${nx},${ny}`);
    }
  }
  if (goals.size === 0 || goals.has(`${sx},${sy}`)) return [];

  const start = `${sx},${sy}`;
  const prev = new Map<string, { key: string; dir: Dir }>();
  const queue = [start];
  const seen = new Set<string>([start]);
  let hit: string | null = null;

  for (let i = 0; i < queue.length; i++) {
    const key = queue[i];
    if (goals.has(key)) {
      hit = key;
      break;
    }
    const comma = key.indexOf(",");
    const x = Number(key.slice(0, comma));
    const y = Number(key.slice(comma + 1));
    for (const d of STEP) {
      const nx = x + d.x;
      const ny = y + d.y;
      const next = `${nx},${ny}`;
      if (seen.has(next)) continue;
      if (!pathCell(w, run, nx, ny, tx, ty, explored) && !goals.has(next)) continue;
      seen.add(next);
      prev.set(next, { key, dir: d.dir });
      queue.push(next);
    }
  }

  if (!hit) return [];
  const dirs: Dir[] = [];
  let cur = hit;
  while (cur !== start) {
    const step = prev.get(cur);
    if (!step) return [];
    dirs.push(step.dir);
    cur = step.key;
  }
  dirs.reverse();
  return dirs;
}

function voice(w: World, said: string, thought: string, reply = "", choices: World["choices"] = []): void {
  w.said = said;
  w.thought = thought;
  w.reply = reply;
  w.choices = choices;
  const a = said.trim();
  const b = thought.trim();
  if (!a) w.message = b;
  else w.message = a;
}

export function loadScene(scene: SceneId, run: Run, arrival: string | null = null): World {
  const def = SCENES[scene];
  const rows = def.ascii;
  const h = rows.length;
  const width = rows[0].length;
  const tiles: Tile[][] = [];
  const seals: Seal[] = [];
  const signs: World["signs"] = [];
  const npcs: MapNpc[] = [];
  const talkers: Talker[] = [];
  const portals: Portal[] = [];
  const caches: Cache[] = [];
  const items: GroundItem[] = [];
  const braziers: Pos[] = [];
  const props: Prop[] = [];
  let player = { x: 1, y: 1 };
  let signI = 0;

  for (let y = 0; y < h; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x];
      const raw = tileOf(ch, scene);
      row.push(raw);
      if (ch === "@") player = { x, y };
      if (ch === "!") {
        signs.push({ x, y, text: def.signs[signI] ?? "" });
        signI += 1;
      }
      if (ch === "C") caches.push({ x, y, open: run.chests.includes(scene) });
      if (ch === "*") braziers.push({ x, y });
      const itemId = def.items[ch];
      if (itemId) items.push({ id: itemId, x, y, taken: run.items.includes(itemId) });
      const sid = SEAL_LETTER[ch];
      if (sid) seals.push({ x, y, id: sid });
      const nid = def.npcs[ch];
      if (nid) {
        const id = remapEnemy(run.hero ?? "rail", nid);
        npcs.push({ id, x, y, beaten: run.beaten.includes(id) });
      }
      const tid = def.talkers[ch];
      if (tid) talkers.push({ id: tid, x, y });
      const portal = def.portals[ch];
      if (portal) portals.push({ ch, x, y, to: portal.to, at: portal.at });
      const extra = extraProp(scene, ch);
      if (extra) {
        props.push({ x, y, kind: extra.kind, tag: extra.tag });
      } else {
        const pk = PROP_LETTER[ch];
        const occupied = Boolean(def.talkers[ch] || def.npcs[ch] || def.portals[ch] || SEAL_LETTER[ch]);
        if (pk && !occupied) {
          props.push({ x, y, kind: pk, tag: propTag(scene, ch) });
        }
      }
    }
    tiles.push(row);
  }

  for (const p of portals) {
    // 屋子里面不用路：通路规则只对室外贴边一级门生效
    if (!isOutdoor(scene)) continue;
    // 贴边一级门：并入路面并向内侧拉通路；院内门仅在贴路时并入，避免孤岛路砖
    const h = tiles.length;
    const w = tiles[0]?.length ?? 0;
    const roadish = (t?: Tile) => t === "road" || t === "pack" || t === "gate";
    const paintable = (t?: Tile) => t === "floor" || t === "pack" || t === "road";
    const onLeft = p.x <= 1;
    const onRight = p.x >= w - 2;
    const onTop = p.y <= 1;
    const onBot = p.y >= h - 2;
    const onRim = onLeft || onRight || onTop || onBot;
    if (onRim) {
      if (paintable(tiles[p.y][p.x])) tiles[p.y][p.x] = "road";
      if (onLeft || onRight) {
        const dir = onLeft ? 1 : -1;
        for (let x = p.x + dir; x > 0 && x < w - 1; x += dir) {
          const t = tiles[p.y][x];
          if (!paintable(t)) break;
          if (roadish(t) && x !== p.x) break;
          tiles[p.y][x] = "road";
          if (roadish(tiles[p.y - 1]?.[x]) || roadish(tiles[p.y + 1]?.[x])) break;
        }
      } else {
        const dir = onTop ? 1 : -1;
        for (let y = p.y + dir; y > 0 && y < h - 1; y += dir) {
          const t = tiles[y][p.x];
          if (!paintable(t)) break;
          if (roadish(t) && y !== p.y) break;
          tiles[y][p.x] = "road";
          if (roadish(tiles[y]?.[p.x - 1]) || roadish(tiles[y]?.[p.x + 1])) break;
        }
      }
    } else if (tiles[p.y][p.x] === "floor") {
      const n = tiles[p.y - 1]?.[p.x];
      const s = tiles[p.y + 1]?.[p.x];
      const e = tiles[p.y]?.[p.x + 1];
      const w_ = tiles[p.y]?.[p.x - 1];
      if (roadish(n) || roadish(s) || roadish(e) || roadish(w_)) tiles[p.y][p.x] = "road";
    }
  }
  if (isOutdoor(scene)) healRoadGaps(tiles);
  if (scene === "lamp" && hasFlag(run, "wellOpen")) {
    const i = props.findIndex((p) => p.tag === "hiddenWell");
    if (i >= 0) {
      const hole = props[i];
      portals.push({ ch: "U", x: hole.x, y: hole.y, to: "cave", at: "U" });
      props.splice(i, 1);
    }
  }
  if (scene === "wharf" && hasFlag(run, "stoneOpen")) {
    const i = props.findIndex((p) => p.tag === "hiddenStone");
    if (i >= 0) {
      const hole = props[i];
      portals.push({ ch: "Y", x: hole.x, y: hole.y, to: "cellar", at: "Y" });
      props.splice(i, 1);
    }
  }
  // Hero late forks — side door appears after midgame unlock.
  if (scene === "lane" && hasFlag(run, "forkRail")) {
    portals.push({ ch: "9", x: 6, y: 15, to: "railNight", at: "D" });
  }
  if (scene === "outer" && hasFlag(run, "forkSeer")) {
    portals.push({ ch: "9", x: 8, y: 4, to: "seerGaze", at: "D" });
  }
  if (scene === "ropes" && hasFlag(run, "forkSapper")) {
    // 东缘内侧旁门，距缆市门 T 至少 3 格
    portals.push({ ch: "9", x: 28, y: 5, to: "sapperPile", at: "D" });
  }
  // 驿路：港湾南岸西侧出淮阴（与码头门至少隔 3 格，贴南缘路尽）
  if (
    scene === "wharf" &&
    (hasFlag(run, "mainOpen") ||
      hasFlag(run, "branded") ||
      hasFlag(run, "heardRebel") ||
      hasFlag(run, "caseRebel") ||
      hasFlag(run, "graceKnown") ||
      run.beaten.includes("inkhand") ||
      run.beaten.includes("stakeboss"))
  ) {
    portals.push({ ch: "9", x: 6, y: 30, to: "huainan", at: "Y" });
  }
  // 税卡 / 缆厂的淮阴门已写进 ascii（南廊 / 北缘），按职显隐
  if (scene === "customs" && !(run.hero === "seer" || run.beaten.includes("inkhand"))) {
    for (let i = portals.length - 1; i >= 0; i--) {
      if (portals[i].to === "huainan") portals.splice(i, 1);
    }
  }
  if (scene === "ropes" && !(run.hero === "sapper" || run.beaten.includes("stakeboss"))) {
    for (let i = portals.length - 1; i >= 0; i--) {
      if (portals[i].to === "huainan") portals.splice(i, 1);
    }
  }
  if (scene === "bianjing" && !hasFlag(run, "roadUsurp")) {
    for (let i = portals.length - 1; i >= 0; i--) {
      if (portals[i].to === "usurpCamp") portals.splice(i, 1);
    }
  }

  if (arrival) {
    const p = portals.find((pt) => pt.ch === arrival);
    if (p) player = { x: p.x, y: p.y };
  }

  // 长镖：官道上塞一只绕不开的强敌（未打倒前挡门）
  if (hasFlag(run, "escortLong") && !hasFlag(run, "escortEliteDone") && isOutdoor(scene)) {
    const raw = run.flags.find((f) => f.startsWith("escortElite-"));
    const eid = (raw?.replace("escortElite-", "") ?? "") as EnemyId;
    if (eid && ENEMIES[eid] && !npcs.some((n) => n.id === eid)) {
      const cx = Math.min(width - 3, Math.max(2, player.x + 2));
      const cy = player.y;
      npcs.push({ id: eid, x: cx, y: cy, beaten: run.beaten.includes(eid) });
    }
  }

  // 洛阳：干道让路 + 仅挪到「洪水可达」格，避免踢进封闭院落死角
  if (scene === "luoyang" || scene === "luoyang_yamen_prison" || scene === "luoyang_yanbo_inner") {
    const cx = Math.floor(width / 2);
    const cy = Math.floor(h / 2);
    const arterial = (x: number, y: number) => x === cx || y === cy - 5 || y === cy;
    const blocked = new Set<string>();
    blocked.add(`${player.x},${player.y}`);
    for (const n of npcs) blocked.add(`${n.x},${n.y}`);
    for (const p of portals) blocked.add(`${p.x},${p.y}`);
    for (const t of talkers) blocked.add(`${t.x},${t.y}`);
    const nearRoad = (x: number, y: number) =>
      [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].some(([dx, dy]) => tiles[y + dy]?.[x + dx] === "road");
    const canStand = (x: number, y: number) => {
      if (blocked.has(`${x},${y}`)) return false;
      if (arterial(x, y)) return false;
      const t = tiles[y]?.[x];
      if (t !== "floor" && t !== "pack") return false;
      if (props.some((p) => p.x === x && p.y === y && BLOCKING.includes(p.kind))) return false;
      return true;
    };
    const tryPlaceNear = (t: { x: number; y: number }, roadFirst: boolean) => {
      for (let r = 1; r <= 10; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.abs(dx) + Math.abs(dy) !== r) continue;
            const nx = t.x + dx;
            const ny = t.y + dy;
            if (!canStand(nx, ny)) continue;
            if (roadFirst && !nearRoad(nx, ny)) continue;
            t.x = nx;
            t.y = ny;
            return true;
          }
        }
      }
      return false;
    };
    for (const t of talkers) {
      if (!arterial(t.x, t.y) && tiles[t.y]?.[t.x] !== "road") continue;
      blocked.delete(`${t.x},${t.y}`);
      if (!tryPlaceNear(t, true)) tryPlaceNear(t, false);
      blocked.add(`${t.x},${t.y}`);
    }

    // 空图洪水：开阔贴路候选；再带 talker 迭代救援（院门堵死）
    const shellWorld = (): World =>
      ({
        scene,
        chapter: def.chapter,
        w: width,
        h,
        tiles,
        player,
        facing: "down",
        seals,
        order: [...def.order],
        progress: [] as SealId[],
        gate: def.gate,
        npcs,
        talkers,
        portals,
        items,
        props,
        braziers,
        signs,
        caches,
        arrival,
        hp: run.hp,
        hpMax: run.hpMax,
        dueling: null,
        speaker: "rail",
        thought: "",
        explored: new Set<string>(),
        path: [] as Dir[],
        pathGoal: null,
        toast: "",
        toastMs: 0,
        message: "",
        said: [],
        reply: "",
        choices: [],
      }) as unknown as World;

    const parked = talkers.splice(0, talkers.length);
    const seenFree = floodFloor(shellWorld(), run, true);
    talkers.push(...parked);

    const touchOf = (x: number, y: number, seen: Set<string>) =>
      seen.has(`${x},${y}`) ||
      [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`));

    const openness = (x: number, y: number) =>
      [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].filter(([dx, dy]) => seenFree.has(`${x + dx},${y + dy}`)).length;

  // 当救援找不到空位时：优先清掉挡路的车，绝不删 NPC
    for (let iter = 0; iter < 24; iter++) {
      const seen = floodFloor(shellWorld(), run, true);
      const stuck = talkers.filter(
        (t) => !touchOf(t.x, t.y, seen) || arterial(t.x, t.y) || tiles[t.y]?.[t.x] === "road",
      );
      if (stuck.length === 0) break;

      // 先拆阻塞路径的车（props + tiles）
      if (stuck.length > 0) {
        const carts = props.filter((p) => p.kind === "cart");
        for (const c of carts) {
          const adjStuck = stuck.some((t) => Math.abs(t.x - c.x) + Math.abs(t.y - c.y) <= 2);
          const onSpine = Math.abs(c.x - cx) <= 1 || c.y === cy - 5 || c.y === cy;
          if (!adjStuck && !onSpine) continue;
          const idx = props.indexOf(c);
          if (idx >= 0) props.splice(idx, 1);
          if (tiles[c.y]?.[c.x] === "floor" || tiles[c.y]?.[c.x] === "pack") {
            /* keep */
          }
        }
      }

      const used = new Set<string>([`${player.x},${player.y}`]);
      for (const n of npcs) used.add(`${n.x},${n.y}`);
      for (const p of portals) used.add(`${p.x},${p.y}`);
      for (const t of talkers) {
        if (!stuck.includes(t)) used.add(`${t.x},${t.y}`);
      }
      for (const t of stuck) {
        used.delete(`${t.x},${t.y}`);
        let best: { x: number; y: number; score: number } | null = null;
        for (const key of seenFree) {
          const comma = key.indexOf(",");
          const nx = Number(key.slice(0, comma));
          const ny = Number(key.slice(comma + 1));
          if (used.has(key)) continue;
          if (arterial(nx, ny)) continue;
          if (Math.abs(nx - cx) <= 1) continue;
          if (tiles[ny]?.[nx] !== "floor" && tiles[ny]?.[nx] !== "pack") continue;
          if (props.some((p) => p.x === nx && p.y === ny && BLOCKING.includes(p.kind))) continue;
          const open = openness(nx, ny);
          if (open < 2) continue;
          // 禁止贴路列队：贴路扣分；与其他 NPC 间距 <2 扣分
          let nearNpc = 0;
          for (const o of talkers) {
            if (o === t) continue;
            if (Math.abs(o.x - nx) + Math.abs(o.y - ny) < 2) nearNpc += 1;
          }
          const d = Math.abs(nx - t.x) + Math.abs(ny - t.y);
          const roadPenalty = nearRoad(nx, ny) ? -25 : 8;
          const score = roadPenalty + open * 8 - d * 0.3 - nearNpc * 40 + ((nx * 13 + ny * 7) % 5);
          if (!best || score > best.score) best = { x: nx, y: ny, score };
        }
        if (best) {
          t.x = best.x;
          t.y = best.y;
        }
        used.add(`${t.x},${t.y}`);
      }
    }

    // 打散列队：仅挪到空图洪水可达格，避免踢进死角
    {
      const usedPos = new Set(talkers.map((t) => `${t.x},${t.y}`));
      const tryNudge = (t: (typeof talkers)[0]) => {
        for (let r = 2; r <= 8; r++) {
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              if (Math.abs(dx) + Math.abs(dy) !== r) continue;
              const nx = t.x + dx;
              const ny = t.y + dy;
              const key = `${nx},${ny}`;
              if (!seenFree.has(key) || usedPos.has(key)) continue;
              if (arterial(nx, ny) || Math.abs(nx - cx) <= 1) continue;
              if (tiles[ny]?.[nx] !== "floor" && tiles[ny]?.[nx] !== "pack") continue;
              if (props.some((p) => p.x === nx && p.y === ny && BLOCKING.includes(p.kind))) continue;
              if (talkers.some((o) => o !== t && Math.abs(o.x - nx) + Math.abs(o.y - ny) < 2)) continue;
              usedPos.delete(`${t.x},${t.y}`);
              t.x = nx;
              t.y = ny;
              usedPos.add(key);
              return true;
            }
          }
        }
        return false;
      };
      for (let pass = 0; pass < 5; pass++) {
        const runs: (typeof talkers)[] = [];
        const byRow = new Map<number, typeof talkers>();
        const byCol = new Map<number, typeof talkers>();
        for (const t of talkers) {
          if (!byRow.has(t.y)) byRow.set(t.y, []);
          if (!byCol.has(t.x)) byCol.set(t.x, []);
          byRow.get(t.y)!.push(t);
          byCol.get(t.x)!.push(t);
        }
        const collect = (list: typeof talkers, axis: "x" | "y") => {
          const sorted = [...list].sort((a, b) => (axis === "x" ? a.x - b.x : a.y - b.y));
          let run: typeof talkers = [];
          const flush = () => {
            if (run.length >= 3) runs.push(run);
            run = [];
          };
          for (const cur of sorted) {
            if (!run.length) {
              run = [cur];
              continue;
            }
            const prev = run[run.length - 1]!;
            const gap = axis === "x" ? cur.x - prev.x : cur.y - prev.y;
            if (gap <= 2) run.push(cur);
            else {
              flush();
              run = [cur];
            }
          }
          flush();
        };
        for (const list of byRow.values()) if (list.length >= 3) collect(list, "x");
        for (const list of byCol.values()) if (list.length >= 3) collect(list, "y");
        for (const g of runs) {
          for (let i = 1; i < g.length - 1; i++) tryNudge(g[i]!);
        }
      }
      // 再跑一轮可达救援（打散后可能仍贴干道）
      for (let iter = 0; iter < 8; iter++) {
        const seen = floodFloor(shellWorld(), run, true);
        const stuck = talkers.filter((t) => !touchOf(t.x, t.y, seen));
        if (!stuck.length) break;
        const used2 = new Set(talkers.map((t) => `${t.x},${t.y}`));
        for (const t of stuck) {
          used2.delete(`${t.x},${t.y}`);
          let best: { x: number; y: number; score: number } | null = null;
          for (const key of seenFree) {
            const comma = key.indexOf(",");
            const nx = Number(key.slice(0, comma));
            const ny = Number(key.slice(comma + 1));
            if (used2.has(key) || arterial(nx, ny) || Math.abs(nx - cx) <= 1) continue;
            if (tiles[ny]?.[nx] !== "floor" && tiles[ny]?.[nx] !== "pack") continue;
            if (props.some((p) => p.x === nx && p.y === ny && BLOCKING.includes(p.kind))) continue;
            if (talkers.some((o) => o !== t && Math.abs(o.x - nx) + Math.abs(o.y - ny) < 2)) continue;
            const score = openness(nx, ny) * 10 - (nearRoad(nx, ny) ? 20 : 0);
            if (!best || score > best.score) best = { x: nx, y: ny, score };
          }
          if (best) {
            t.x = best.x;
            t.y = best.y;
          }
          used2.add(`${t.x},${t.y}`);
        }
      }
    }
  }

  const progress = [...((run.sealProgress[scene] ?? []) as SealId[])];
  return {
    scene,
    chapter: def.chapter,
    w: width,
    h,
    tiles,
    player,
    facing: "down",
    seals,
    order: [...def.order],
    progress,
    gate: def.gate,
    npcs,
    talkers,
    portals,
    items,
    props,
    braziers,
    signs,
    caches,
    arrival,
    hp: run.hp,
    hpMax: run.hpMax,
    dueling: null,
    speaker: "rail",
    message: def.enter,
    thought: def.mood,
    said: def.enter,
    reply: "",
    choices: [],
  };
}

export function loadDock(): World {
  return loadScene("hut", makeRun("empty"));
}

export function delta(dir: Dir): Pos {
  if (dir === "up") return { x: 0, y: -1 };
  if (dir === "down") return { x: 0, y: 1 };
  if (dir === "left") return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}

export function facingTile(w: World): Pos {
  const d = delta(w.facing);
  return { x: w.player.x + d.x, y: w.player.y + d.y };
}

function portalAt(w: World, x: number, y: number): Portal | undefined {
  return w.portals.find((p) => p.x === x && p.y === y);
}

function stepSeal(w: World, x: number, y: number, run: Run): void {
  if (w.gate !== "fire-seals" || w.order.length === 0 || sealsComplete(w)) return;
  const seal = w.seals.find((s) => s.x === x && s.y === y);
  if (!seal) return;
  if (!hasFlag(run, "branded")) {
    voice(w, "印是冷的。", "账房说过。印要见火。");
    return;
  }
  if (seal.id === "x") {
    w.progress = [];
    voice(w, "满院的印一齐灭了。", "中间那枚不认人。");
    return;
  }
  const next = w.order[w.progress.length];
  if (seal.id === next) {
    w.progress.push(seal.id);
    if (sealsComplete(w)) voice(w, "闸开了。", "过帖齐了。跳板上还有人。");
    else voice(w, "印亮了。", "西风过，东船开。还差。");
    return;
  }
  w.progress = [];
  voice(w, "满院的印一齐灭了。", "顺序错了。字在东厢墙上。");
}

export function tryMove(
  w: World,
  dir: Dir,
  run: Run,
  opts?: { suppressPortal?: boolean },
): { world: World; travel?: { to: SceneId; at: string } } {
  const next: World = structuredClone(w);
  next.facing = dir;
  const d = delta(dir);
  const nx = next.player.x + d.x;
  const ny = next.player.y + d.y;
  if (!inBounds(next, nx, ny)) return { world: next };

  if (!walkable(next, nx, ny, run)) {
    const t = inBounds(next, nx, ny) ? next.tiles[ny][nx] : "wall";
    if (t === "gate") {
      const v = bumpVoice("gate", next.gate);
      voice(next, v.said, v.thought);
    } else if (t === "water") {
      const v = bumpVoice("water", next.gate);
      voice(next, v.said, v.thought);
    } else if (t === "rock" || t === "hill") {
      const v = bumpVoice("cliff", next.gate);
      voice(next, v.said, v.thought);
    } else {
      const hit = propAt(next, nx, ny);
      if (hit) {
        const v = propVoice(hit.kind, hit.tag, next.scene);
        voice(next, v.said, v.thought);
      }
    }
    return { world: next };
  }

  next.player = { x: nx, y: ny };
  next.choices = [];
  const leftArrival = w.arrival && portalAt(w, w.player.x, w.player.y)?.ch === w.arrival;
  if (leftArrival) next.arrival = null;

  if (next.tiles[ny][nx] === "seal") stepSeal(next, nx, ny, run);

  const portal = portalAt(next, nx, ny);
  if (portal && portal.ch !== w.arrival && !opts?.suppressPortal) {
    const eliteBlock = next.npcs.find(
      (n) => !n.beaten && run.flags.some((f) => f === `escortElite-${n.id}`) && hasFlag(run, "escortLong") && !hasFlag(run, "escortEliteDone"),
    );
    if (eliteBlock) {
      voice(next, "劫镖的人挡在官道上。不打过，门不开。", "绕不开。这是局里写进帖里的规矩。");
      next.player = { x: w.player.x, y: w.player.y };
      return { world: next };
    }
    const gate = canTravelTo(w.scene, portal.to, run);
    if (!gate.ok) {
      voice(next, gate.reason, "路未开。开了再走。");
      next.player = { x: w.player.x, y: w.player.y };
      return { world: next };
    }
    const hub = canEnterHubScene(portal.to, run);
    if (!hub.ok) {
      voice(next, hub.reason, "不是这条线上的人，先进不去。");
      next.player = { x: w.player.x, y: w.player.y };
      return { world: next };
    }
    return { world: next, travel: { to: portal.to, at: portal.at } };
  }
  return { world: next };
}

function cacheAt(w: World, x: number, y: number): Cache | undefined {
  return w.caches.find((c) => c.x === x && c.y === y);
}

function itemAt(w: World, x: number, y: number): GroundItem | undefined {
  return w.items.find((i) => i.x === x && i.y === y && !i.taken);
}

function brazierAt(w: World, x: number, y: number): Pos | undefined {
  return w.braziers.find((b) => b.x === x && b.y === y);
}

function applyVoice(
  w: World,
  beat: { said: string; thought: string; flags?: string[]; reply?: string; choices?: World["choices"] },
): string[] {
  voice(w, beat.said, beat.thought, beat.reply ?? "", beat.choices ?? []);
  return beat.flags ?? [];
}

function talkCtx(run: Run, talkerId: string, pick?: string) {
  return {
    branded: hasFlag(run, "branded"),
    items: run.items,
    beaten: run.beaten,
    flags: run.flags,
    party: run.party,
    step: run.talks?.[talkerId] ?? 0,
    pick,
    hero: run.hero ?? ("rail" as const),
    silver: run.silver ?? 0,
  };
}

export function interact(
  w: World,
  run: Run,
  pick?: string,
): {
  world: World;
  action: InteractAction;
  enemyId?: EnemyId;
  itemId?: string;
  flags?: string[];
  travel?: { to: SceneId; at: string };
  tech?: "nightStep";
} {
  const next: World = structuredClone(w);
  const prevSpeaker = w.speaker;
  next.speaker = "rail";
  const f = facingTile(next);
  const spots = [f, next.player];

  for (const p of spots) {
    const row = SCENES[next.scene].ascii[p.y];
    if (!row || row[p.x] !== "E") continue;
    const lord = next.npcs.find((n) => n.id === "lord");
    if (lord && !lord.beaten) {
      voice(next, "门前有人。", "名册在门后。人在门前。");
      return { world: next, action: "talk" };
    }
    voice(next, "门开着。", "名册上那一笔墨还没干。");
    return { world: next, action: "end" };
  }

  const npc = npcAt(next, f.x, f.y);
  if (npc) {
    next.dueling = npc.id;
    next.speaker = npc.id;
    if (pick === "fight") {
      voice(next, "", "出招之前先亮招。");
      return { world: next, action: "duel", enemyId: npc.id };
    }
    if (pick === "leave") {
      voice(next, "「算了。」", "刀收回去。人还在。");
      next.dueling = null;
      return { world: next, action: "talk" };
    }
    voice(next, ENEMY_PITCH[npc.id] ?? "「站住。」", "出招之前先亮招。", "", [
      { id: "fight", label: "动手" },
      { id: "leave", label: "算了" },
    ]);
    return { world: next, action: "talk" };
  }

  const talker =
    talkerAt(next, f.x, f.y) ??
    talkerAt(next, next.player.x, next.player.y) ??
    (pick && prevSpeaker && prevSpeaker !== "rail" ? next.talkers.find((t) => t.id === prevSpeaker) : undefined);
  if (talker) {
    next.speaker = talker.id;
    if (talker.id === "doctor" && pick === "heal") {
      const beat = talkBeat(talker.id, talkCtx(run, talker.id, pick));
      applyVoice(next, beat);
      if ((run.silver ?? 0) < 8) {
        voice(next, "“银不够八两。脉通不了。”", "医馆不赊账。");
        return { world: next, action: "talk" };
      }
      return { world: next, action: "heal", flags: beat.flags };
    }
    if (talker.id === "doctor") {
      if (pick === "buySalve") {
        voice(next, "“伤药六两一包。外用。”", "医馆卖药。");
        return { world: next, action: "buyBag", itemId: "salve" };
      }
      if (pick === "buyTonic") {
        voice(next, "“提气散八两。局内提一息。”", "药轻，气也不重。");
        return { world: next, action: "buyBag", itemId: "tonic" };
      }
      if (pick === "buyHerb") {
        voice(next, "“生药三两。你自己熬。”", "");
        return { world: next, action: "buyBag", itemId: "herb" };
      }
      if (pick === "craftSalve") {
        voice(next, "“两把药草，炉上走一刻。好了来取。”", "炼药不等人，也不催人。");
        return { world: next, action: "craft", itemId: "salve" };
      }
      if (pick === "collect") {
        voice(next, "“炉冷了。药在你手里。”", "");
        return { world: next, action: "collectCraft" };
      }
      if (pick === "leave") {
        voice(next, "“脉枕还温着。”", "");
        return { world: next, action: "talk" };
      }
      voice(next, "“坐。诊脉八两。也可买药、借炉。”", "医馆不入江湖。江湖却常进医馆。", "", [
        { id: "heal", label: "疗伤（八两）" },
        { id: "buySalve", label: "买伤药（六两）" },
        { id: "buyTonic", label: "买提气散（八两）" },
        { id: "buyHerb", label: "买药草（三两）" },
        { id: "craftSalve", label: "借炉炼伤药" },
        { id: "collect", label: "取炉上的药" },
        { id: "leave", label: "不诊" },
      ]);
      return { world: next, action: "talk" };
    }
    if (next.scene === "pawn" && talker.id === "vendor") {
      if (pick === "buyPalm" || pick === "buySaber") {
        const gearId = pick === "buyPalm" ? "palm-3" : "saber-3";
        voice(next, "“银两点清。刀是旧的，劲是新的。”", "当铺认银。");
        return { world: next, action: "shop", itemId: gearId };
      }
      if (pick?.startsWith("sell-")) {
        voice(next, "“成色尚可。银给你。”", "当铺认货。");
        return { world: next, action: "sellBag", itemId: pick.slice(5) };
      }
      if (pick === "sellMenu") {
        voice(next, "“把货摊开。我按成色给银。”", "零碎货进柜，银进袋。", "", [
          { id: "sell-herb", label: "当药草" },
          { id: "sell-hide", label: "当兽皮" },
          { id: "sell-dish", label: "当炒菜" },
          { id: "sell-silk", label: "当碎绸" },
          { id: "sell-copper", label: "当赤铜屑" },
          { id: "leave", label: "算了" },
        ]);
        return { world: next, action: "talk" };
      }
      if (pick === "leave") {
        voice(next, "“柜关着。”", "");
        return { world: next, action: "talk" };
      }
      voice(next, "“当得出，也卖得出。兵刃柜上一排；零碎货按成色收。”", "当铺不讲价。", "", [
        { id: "buyPalm", label: "买拳套（十八两）" },
        { id: "buySaber", label: "买砍刀（二十二两）" },
        { id: "sellMenu", label: "当掉行囊货" },
        { id: "leave", label: "不买" },
      ]);
      return { world: next, action: "talk" };
    }
    if (next.scene === "escort" && talker.id === "docker") {
      if (hasFlag(run, "escortDone")) {
        voice(next, "“这趟镖结过了。旗还在风里。”", "镖认路。路走完了。");
        return { world: next, action: "talk" };
      }
      if (hasFlag(run, "escortJob") || hasItem(run, "cargo")) {
        const destFlag = run.flags.find((f) => f.startsWith("escortDest-"));
        const destId = destFlag?.replace("escortDest-", "") ?? "";
        const destName = ESCORT_DESTS.find((d) => d.id === destId)?.name ?? (destId || "码头");
        const long = hasFlag(run, "escortLong");
        voice(
          next,
          long
            ? `“货还在你身上。送到${destName}才结。路上劫镖的人挡道，绕不开，打过才放行。”`
            : "“货还在你身上。出西门到码头，交车夫手里。结银六两。”",
          long ? "长镖：目的地固定抽签，路上必遇强敌。" : "东院出门就是码头。",
        );
        return { world: next, action: "talk" };
      }
      if (pick === "job") {
        voice(
          next,
          "“短镖一帖。货箱给你。出西门到码头，交给车夫，结银六两。”",
          "目的地：码头 · 车夫。出镖局西门即是。",
        );
        return { world: next, action: "talk", flags: ["escortJob"] };
      }
      if (pick === "jobLong") {
        const job = pickEscortJob();
        voice(
          next,
          `“长镖一帖。货送到${job.name}。银十五两，外加一锭碎元宝意思意思。路上有劫的，不让绕。”`,
          `目的地：${job.name}。强敌已在官道上候着。`,
        );
        return {
          world: next,
          action: "talk",
          flags: ["escortJob", "escortLong", `escortDest-${job.dest}`, `escortElite-${job.elite}`],
        };
      }
      if (pick === "leave") {
        voice(next, "“旗还在风里。”", "");
        return { world: next, action: "talk" };
      }
      voice(next, "“局子接短镖，也接长镖。短的到码头；长的进城，路上必打一仗。”", "镖局认手。码头在西门外。", "", [
        { id: "job", label: "接短镖（送码头）" },
        { id: "jobLong", label: "接长镖（远城·必战）" },
        { id: "leave", label: "不接" },
      ]);
      return { world: next, action: "talk" };
    }
    if (next.scene === "pier" && talker.id === "carter") {
      if (hasFlag(run, "escortDone")) {
        voice(next, "“货已经卸了。辕是空的。”", "");
        return { world: next, action: "talk" };
      }
      if (hasFlag(run, "escortLong")) {
        voice(next, "“长镖不卸码头。按帖送到城里。”", "目的城交货才结。");
        return { world: next, action: "talk" };
      }
      if (hasFlag(run, "escortJob") || hasItem(run, "cargo")) {
        if (pick === "leave") {
          voice(next, "“货还在辕边等。”", "码头车夫接货才结银。");
          return { world: next, action: "talk" };
        }
        if (pick === "deliver") {
          voice(next, "“货到了。六两结你。回镖局报一声也成。”", "短镖落地。银入袋。");
          return { world: next, action: "talk", flags: ["escortDone", "escortPay"] };
        }
        voice(next, "“局里的短镖？卸到辕上。我给你结银。”", "车夫认货，不认帖。目的地就是这儿。", "", [
          { id: "deliver", label: "交货结银（六两）" },
          { id: "leave", label: "先不交" },
        ]);
        return { world: next, action: "talk" };
      }
    }
    // 长镖：目的城交货（任意城门吏/驿卒/摊贩可结，认货认帖）
    if (
      hasFlag(run, "escortLong") &&
      (hasFlag(run, "escortJob") || hasItem(run, "cargo")) &&
      !hasFlag(run, "escortDone")
    ) {
      const destFlag = run.flags.find((f) => f.startsWith("escortDest-"));
      const destId = destFlag?.replace("escortDest-", "") ?? "";
      if (destId && next.scene === destId) {
        if (!hasFlag(run, "escortEliteDone")) {
          voice(next, "“劫镖的人还没清。货我不敢接。”", "先打过官道上那一仗。");
          return { world: next, action: "talk" };
        }
        if (pick === "deliverLong") {
          const name = ESCORT_DESTS.find((d) => d.id === destId)?.name ?? destId;
          voice(next, `“${name}的帖对上了。货卸下。十五两，外加一锭碎元宝。”`, "长镖落地。");
          return { world: next, action: "talk", flags: ["escortDone", "escortPay"] };
        }
        if (pick === "leave") {
          voice(next, "“货还在你身上。”", "");
          return { world: next, action: "talk" };
        }
        voice(next, "“局里长镖？帖与货都在，便卸。”", "目的城交货结银。", "", [
          { id: "deliverLong", label: "交货结长镖" },
          { id: "leave", label: "先不交" },
        ]);
        return { world: next, action: "talk" };
      }
    }
    if (next.scene === "martial" && talker.id === "coach") {
      if (pick === "leave") {
        const beat = talkBeat(talker.id, talkCtx(run, talker.id, pick));
        applyVoice(next, beat);
        return { world: next, action: "talk" };
      }
      if (pick === "craftPowder") {
        voice(next, "“硫、炭、硝各一。砂坑旁炉上走两刻。”", "火折伤人轻，吓人重。");
        return { world: next, action: "craft", itemId: "powder" };
      }
      if (pick === "craftDart") {
        voice(next, "“赤铜屑一撮，磨两枚细镖。炉要热一会儿。”", "");
        return { world: next, action: "craft", itemId: "dart" };
      }
      if (pick === "collect") {
        voice(next, "“炉上的货，拿走。”", "");
        return { world: next, action: "collectCraft" };
      }
      if (pick === "tongbaoForge") {
        voice(next, "“通宝一枚，赤铜屑一撮，刃再涨一成。不是银两能催的。”", "锻刃认通宝。");
        return { world: next, action: "tongbaoForge" };
      }
      if (pick === "matForge") {
        voice(next, "“精材、玄铁、神髓——成色够了才吃炉。缺什么我报你。”", "精以上认锻材，不认空银。");
        return { world: next, action: "matForge" };
      }
      if (pick === "craftXuanHp") {
        voice(next, "“灵草两株、丹砂一撮、药草两把。炉要走三刻。”", "玄药·铁骨。选人服。");
        return { world: next, action: "craft", itemId: "pillXuanHp" };
      }
      if (pick === "craftXuanQi") {
        voice(next, "“灵草两株、丹砂一撮、硝石一撮。”", "玄药·长息。选人服。");
        return { world: next, action: "craft", itemId: "pillXuanQi" };
      }
      if (pick === "forgeMenu") {
        voice(next, "“砂坑炼暗器。通宝锻凡良。精以上吃锻材。玄药也在这炉。”", "", "", [
          { id: "craftPowder", label: "配火折子" },
          { id: "craftDart", label: "磨细镖" },
          { id: "tongbaoForge", label: "通宝锻刃（凡→良）" },
          { id: "matForge", label: "锻材升刃（精/玄/神）" },
          { id: "craftXuanHp", label: "炼玄药·铁骨" },
          { id: "craftXuanQi", label: "炼玄药·长息" },
          { id: "collect", label: "取炉上货" },
          { id: "leave", label: "回去" },
        ]);
        return { world: next, action: "talk" };
      }
      const lesson = pick ? lessonByPick(pick) : null;
      if (lesson) {
        if (run.techniques.includes(lesson.id)) {
          voice(next, "“这门你已经有了。”", "砂坑不卖重复的谱。");
          return { world: next, action: "talk" };
        }
        if ((run.silver ?? 0) < lesson.price) {
          voice(next, `“银不够 ${lesson.price} 两。谱不赊。”`, "武馆认银。");
          return { world: next, action: "talk" };
        }
        voice(next, `“${lesson.label}。银两点清。下去砂坑走两步。”`, TECHNIQUES[lesson.id].text);
        return { world: next, action: "learn", itemId: lesson.id };
      }
      const offers = martialOffers(run.techniques as TechniqueId[]);
      voice(
        next,
        "“外功点名。砂坑也能炼暗器。通宝锻刃另开一炉。”",
        "馆主不劝打。他劝人掏银。",
        "",
        [
          ...offers.slice(0, 3).map((o) => ({ id: `learn:${o.id}`, label: `${o.label}（${o.price}两）` })),
          { id: "forgeMenu", label: "炼器 / 锻刃" },
          { id: "leave", label: "不学" },
        ],
      );
      return { world: next, action: "talk" };
    }
    if (talker.id === "passClerk") {
      if (hasFlag(run, "roadPass") || hasItem(run, "roadPass")) {
        voice(next, "「帖已在你身上。关卡验火印。」", "");
        return { world: next, action: "talk" };
      }
      if (pick === "tongbaoPass") {
        voice(next, "「通宝一枚。我给你提前盖帖。驿路三程先开。」", "官帖认通宝，比银烫手。");
        return { world: next, action: "tongbaoPass" };
      }
      if (pick === "buy" || pick === "ask") {
        voice(next, "「通关文牒，官价八两。盖了可走驿路三程。」", "他不看刀。他看银。");
        return { world: next, action: "talk", flags: ["buyRoadPass8"] };
      }
      voice(next, "「城门验帖。无帖者退回。通宝急件另议。」", "", "", [
        { id: "buy", label: "银两买文牒（八两）" },
        { id: "tongbaoPass", label: "通宝贿帖（一枚）" },
        { id: "leave", label: "先退" },
      ]);
      return { world: next, action: "talk" };
    }
    if (talker.id === "herbDoc") {
      if (pick === "tongbaoTech") {
        voice(next, "「两枚通宝，换一页旧谱。不是银两能催的。」", "药香里藏着刀谱。");
        return { world: next, action: "tongbaoTech" };
      }
      if (pick === "buySulfur") {
        voice(next, "「硫磺三两一包。炼火折用。」", "");
        return { world: next, action: "buyBag", itemId: "sulfur" };
      }
      if (pick === "ask") {
        const beat = talkBeat(talker.id, talkCtx(run, talker.id, pick));
        applyVoice(next, beat);
        return { world: next, action: "talk", flags: beat.flags };
      }
      if (pick === "leave") {
        voice(next, "「药香还在。」", "");
        return { world: next, action: "talk" };
      }
      voice(next, "「亳州药香压刀香。通宝也能换残页。」", "", "", [
        { id: "ask", label: "可有托付" },
        { id: "buySulfur", label: "买硫磺（三两）" },
        { id: "tongbaoTech", label: "通宝换残页（二枚）" },
        { id: "leave", label: "路过" },
      ]);
      return { world: next, action: "talk" };
    }
    if (talker.id === "roadHawker") {
      if (pick === "buyGreens") {
        voice(next, "「青菜二两一把。灶上能炒。」", "");
        return { world: next, action: "buyBag", itemId: "greens" };
      }
      if (pick === "craftDish") {
        voice(next, "「两把青菜，锅上走一刻。好了来取。」", "摊贩也借灶。");
        return { world: next, action: "craft", itemId: "dish" };
      }
      if (pick === "collect") {
        voice(next, "「菜好了。趁热。」", "");
        return { world: next, action: "collectCraft" };
      }
      if (pick === "buy") {
        voice(next, "「闸饭一碗。热。别赊。」", "摊上油烟，盖过马粪。");
        return { world: next, action: "talk" };
      }
      if (pick === "rumor") {
        const beat = talkBeat(talker.id, talkCtx(run, talker.id, pick));
        applyVoice(next, beat);
        return { world: next, action: "talk", flags: beat.flags };
      }
      if (pick === "leave") {
        voice(next, "「下回再来。」", "");
        return { world: next, action: "talk" };
      }
      voice(next, "「驿路边卖热食。青菜也能买。灶上能炒。」", "摊主眼睛比勺快。", "", [
        { id: "buy", label: "买一碗" },
        { id: "buyGreens", label: "买青菜（二两）" },
        { id: "craftDish", label: "借灶炒菜" },
        { id: "collect", label: "取锅上的菜" },
        { id: "rumor", label: "听闲话" },
        { id: "leave", label: "路过" },
      ]);
      return { world: next, action: "talk" };
    }
    if (next.scene === "yamen" && talker.id === "bailiff" && pick === "bribe") {
      const beat = talkBeat(talker.id, talkCtx(run, talker.id, pick));
      applyVoice(next, beat);
      if (hasFlag(run, "yamenBribe")) {
        return { world: next, action: "talk", flags: beat.flags };
      }
      if ((run.silver ?? 0) < 15) {
        voice(next, "“十五两不够，帖压不住。”", "差人腰里空着。");
        return { world: next, action: "talk" };
      }
      voice(next, "“帖压下了。夜里岗松半息。”", "贿赂不入正册。");
      return { world: next, action: "talk", flags: ["yamenBribe", "yamenPay-15"] };
    }
    if (talker.id === "inn" && hasFlag(run, "emptyBowl") && run.hp < run.hpMax && !hasFlag(run, "restedTea")) {
      voice(next, "茶是热的。喝了这一碗。", "空碗开过锁。热茶开过气。");
      return { world: next, action: "rest", flags: ["restedTea"] };
    }
    if (
      talker.id === "pilgrim" &&
      run.party.includes("pilgrim") &&
      run.hp < run.hpMax &&
      !hasFlag(run, "restedShrine")
    ) {
      voice(next, "香灰还温。坐一会儿。", "神听潮。人听气。");
      return { world: next, action: "rest", flags: ["restedShrine"] };
    }
    const label = pick ? (w.choices ?? []).find((c) => c.id === pick)?.label : undefined;
    const beat = talkBeat(talker.id, {
      branded: hasFlag(run, "branded"),
      items: run.items,
      beaten: run.beaten,
      flags: run.flags,
      party: run.party,
      step: run.talks?.[talker.id] ?? 0,
      pick,
      silver: run.silver ?? 0,
    });
    const spoken = label && !beat.reply ? { ...beat, reply: `“${label}。”` } : beat;
    const flags = applyVoice(next, spoken);
    if (beat.spar) {
      next.dueling = beat.spar;
      next.speaker = talker.id;
      return { world: next, action: "spar", enemyId: beat.spar, flags };
    }
    return { world: next, action: "talk", flags };
  }

  const chest = cacheAt(next, f.x, f.y) ?? cacheAt(next, next.player.x, next.player.y);
  if (chest) {
    if (chest.open) {
      voice(next, "箱子空了。", "残谱已经在手里。");
      return { world: next, action: "talk" };
    }
    if (next.scene === "tea" && !hasFlag(run, "emptyBowl")) {
      voice(next, "箱子锁着。锁眼像碗口。", "棚婆把钥匙藏在空的东西里。");
      return { world: next, action: "talk" };
    }
    if (next.scene === "docks" && !hasFlag(run, "knotOk")) {
      voice(next, "箱子上压着缆。结还是活的。", "船匠不看契。他看结。");
      return { world: next, action: "talk" };
    }
    voice(next, "箱子里有残谱。", "谱是活人的。箱子是死人的。");
    return { world: next, action: "loot" };
  }

  const ground = itemAt(next, f.x, f.y) ?? itemAt(next, next.player.x, next.player.y);
  if (ground) {
    applyVoice(next, itemVoice(ground.id));
    return { world: next, action: "take", itemId: ground.id };
  }

  const brazier = brazierAt(next, f.x, f.y) ?? brazierAt(next, next.player.x, next.player.y);
  if (brazier) {
    if (hasFlag(run, "branded")) {
      if (run.hp < run.hpMax && !hasFlag(run, "restedYard")) {
        voice(next, "炉还热。手烤一下。", "印已经烫过。火还认人。");
        return { world: next, action: "rest", flags: ["restedYard"] };
      }
      voice(next, "火印已经烫上去了。", "院里的印该认人了。");
      return { world: next, action: "talk" };
    }
    if (!hasItem(run, "brand")) {
      voice(next, "炉是冷的。", "印还在西仓账桌上。");
      return { world: next, action: "talk" };
    }
    voice(next, "火印烫上去了。院里的印亮了一下。", "西风过，东船开。该踩了。");
    return { world: next, action: "brand" };
  }

  const drum = sealAt(next, f.x, f.y) ?? sealAt(next, next.player.x, next.player.y);
  if (drum && next.gate === "watch") {
    if (drum.id === "n") {
      next.progress = ["n"];
      voice(next, "北更应了。", "一更就够。北栅该开了。");
      return { world: next, action: "talk", flags: ["watchOpen"] };
    }
    if (drum.id === "w") {
      voice(next, "西皮是空的。", "更夫说过。空的不认人。");
      return { world: next, action: "talk" };
    }
    voice(next, "不是这一更。", "茶客说只敲北面那一更。");
    return { world: next, action: "talk" };
  }

  if (drum && next.gate === "mirror") {
    if (drum.id === "w") {
      next.progress = ["w"];
      voice(next, "镜子里是墨。", "不照人。照名。门该开了。");
      return { world: next, action: "talk", flags: ["trueMirror"] };
    }
    if (drum.id === "x") {
      voice(next, "还是我。", "中镜照人。照人的不是名。");
      return { world: next, action: "talk" };
    }
    voice(next, "还是我。", "东镜也照人。真的那面在西。");
    return { world: next, action: "talk" };
  }

  if (drum && next.gate === "tide") {
    if (drum.id === "s") {
      next.progress = ["s"];
      voice(next, "南杠沉下去了。", "退潮时分。水认这根。");
      return { world: next, action: "talk", flags: ["tideOpen"] };
    }
    if (drum.id === "n") {
      voice(next, "北杠不动。", "北盏还亮。亮着的不问潮。");
      return { world: next, action: "talk" };
    }
    if (drum.id === "e") {
      voice(next, "东杠是涨潮用的。", "现在不是涨潮。");
      return { world: next, action: "talk" };
    }
    voice(next, "西杠锈死了。", "三根杠。锈的不算。");
    return { world: next, action: "talk" };
  }

  const prop = propAt(next, f.x, f.y) ?? propAt(next, next.player.x, next.player.y);
  if (prop) {
    if (prop.tag === "empty") {
      if (hasFlag(run, "emptyBowl")) {
        voice(next, "空碗。已经看过了。", "钥匙是空的。");
        return { world: next, action: "talk" };
      }
      voice(next, "空碗。底朝天。", "棚婆把钥匙藏在空的东西里。");
      return { world: next, action: "talk", flags: ["emptyBowl"] };
    }
    if (prop.tag === "slip") {
      if (hasItem(run, "slip")) {
        voice(next, "凳下空了。", "角纸已经在手里。");
        return { world: next, action: "talk" };
      }
      applyVoice(next, itemVoice("slip"));
      return { world: next, action: "take", itemId: "slip" };
    }
    if (prop.tag === "westSalt") {
      if (hasItem(run, "deed")) {
        voice(next, "坛口朝西。契已经抽走了。", "官盐不换口。");
        return { world: next, action: "talk" };
      }
      applyVoice(next, itemVoice("deed"));
      return { world: next, action: "take", itemId: "deed" };
    }
    if (prop.tag === "altar") {
      if (hasItem(run, "incense")) {
        voice(next, "香灰是冷的。匙已经不在。", "灯楼值房认这个。");
        return { world: next, action: "talk" };
      }
      applyVoice(next, itemVoice("incense"));
      return { world: next, action: "take", itemId: "incense" };
    }
    if (prop.tag === "deadKnot") {
      if (hasFlag(run, "knotOk")) {
        voice(next, "死结还朝下。", "压得住风。");
        return { world: next, action: "talk" };
      }
      voice(next, "死结。朝下。", "缆头说过。这种才压得住风。");
      return { world: next, action: "talk", flags: ["knotOk"] };
    }
    if (prop.tag === "hiddenWell") {
      if (hasFlag(run, "wellOpen")) {
        voice(next, "井口开着。", "潮气往上冒。");
        return { world: next, action: "talk" };
      }
      if (!hasFlag(run, "askedWell")) {
        if (hasFlag(run, "heardWell")) {
          voice(next, "盖动了一下。还是沉。", "灯守只说灭过的那盏。该去问他。");
        } else {
          voice(next, "井盖锈死了。", "没有人跟我提过井。");
        }
        return { world: next, action: "talk" };
      }
      voice(next, "井盖开了。底下是潮气。", "渔婆说的盖。灯守说的油。");
      return { world: next, action: "talk", flags: ["wellOpen"], travel: { to: "cave", at: "U" } };
    }
    if (prop.tag === "hiddenTree") {
      if (hasFlag(run, "treeOpen")) {
        voice(next, "根下空了。", "铁盒已经不在。");
        return { world: next, action: "talk" };
      }
      if (!hasFlag(run, "heardTree")) {
        voice(next, "树根很深。", "没有人叫我刨这棵。");
        return { world: next, action: "talk" };
      }
      voice(next, "根下有铁盒。谱还没霉。", "茶客说根往北。棚婆不认这棵。");
      return { world: next, action: "talk", flags: ["treeOpen"], tech: "nightStep" };
    }
    if (prop.tag === "hiddenStone") {
      if (hasFlag(run, "stoneOpen")) {
        voice(next, "石头搬开了。", "底下是窖口。");
        return { world: next, action: "talk" };
      }
      if (!hasFlag(run, "heardStone")) {
        voice(next, "石头搬不动。", "桩认船。石头不认人。");
        return { world: next, action: "talk" };
      }
      voice(next, "石头开了。底下是潮窖。", "渔婆说会响。船匠说不认船。");
      return { world: next, action: "talk", flags: ["stoneOpen"], travel: { to: "cellar", at: "Y" } };
    }
    if (prop.kind === "cart" && next.scene === "plot") {
      if (hasItem(run, "flask")) {
        voice(next, "板上空了。壶已经不在。", "岗上那人夜里还问。");
        return { world: next, action: "talk" };
      }
      applyVoice(next, itemVoice("flask"));
      return { world: next, action: "take", itemId: "flask" };
    }
    const beat = propVoice(prop.kind, prop.tag, next.scene);
    applyVoice(next, beat);
    return { world: next, action: "talk" };
  }

  const sign =
    next.signs.find((s) => s.x === f.x && s.y === f.y) ??
    next.signs.find((s) => s.x === next.player.x && s.y === next.player.y);
  if (sign) {
    const flags: string[] = [];
    if (next.scene === "hold") flags.push("readHold");
    if (next.scene === "customs" && sign === next.signs[0]) {
      if (hasItem(run, "slip") && !hasFlag(run, "booksOk")) {
        voice(next, "纸角对上了。册子自己合上。", "里间的门该认了。");
        return { world: next, action: "talk", flags: ["booksOk"] };
      }
      if (!hasFlag(run, "booksOk")) {
        voice(next, sign.text, "角不在案上。撕口是旧的。");
        return { world: next, action: "talk", flags };
      }
    }
    voice(
      next,
      sign.text,
      sign.text.includes("印要见火")
        ? "西、东、南、北。炉在当中。"
        : sign.text.includes("镜廷")
          ? "名册未干。他们等的就是这一趟。"
          : sign.text.includes("朝西")
            ? "西厢那一排。封泥是旧的。"
            : "朱红不是货。是帖。",
    );
    return { world: next, action: "talk", flags };
  }

  voice(next, "", "没有字。字在该在的地方。");
  return { world: next, action: "none" };
}

export function takeGround(w: World, id: GroundItem["id"]): World {
  const next: World = structuredClone(w);
  const item = next.items.find((i) => i.id === id);
  if (item) item.taken = true;
  return next;
}

export function openCache(w: World): World {
  const next: World = structuredClone(w);
  const f = facingTile(next);
  const chest =
    cacheAt(next, f.x, f.y) ?? cacheAt(next, next.player.x, next.player.y);
  if (chest) chest.open = true;
  voice(next, "残谱在手里。", "这一页是活人留下的。");
  return next;
}

export function afterDuel(
  w: World,
  won: boolean,
  remainingHp: number,
  heal: number,
  lossLine?: { said: string; thought: string },
): World {
  const next: World = structuredClone(w);
  const id = next.dueling;
  next.dueling = null;
  if (!id) return next;
  if (won) {
    const npc = next.npcs.find((n) => n.id === id);
    if (npc) npc.beaten = true;
    next.hp = Math.min(next.hpMax, remainingHp + heal);
    if (id === "catcher") voice(next, "「北面的人不是来接你的。」", "账房没说错。点名的是刀。");
    else if (id === "intruder") voice(next, "门外静了。", "西仓的帖还在。");
    else if (id === "inkhand") voice(next, "案下那一笔断了。", "册角还要对回去。");
    else if (id === "stakeboss") voice(next, "桩还在。人走了。", "坞里那结还是死的。");
    else if (id === "lord") voice(next, "门前没人了。", "门开着。名册上那一笔墨还没干。");
    else if (id === "twin") voice(next, "他倒了。", "漏网的那一笔。是我。");
    else voice(next, "他倒了。", "路还在北。");
    next.speaker = "rail";
  } else {
    next.hp = Math.max(1, remainingHp);
    if (lossLine) voice(next, lossLine.said, lossLine.thought);
    else voice(next, "你倒了。还有一口气。", "这条路过不去。气还在。");
  }
  return next;
}

export function allBeaten(w: World): boolean {
  return w.npcs.length > 0 && w.npcs.every((n) => n.beaten);
}
