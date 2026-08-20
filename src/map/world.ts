import type { EnemyId, Run } from "../game/types";
import { remapEnemy } from "../game/hero";
import { makeRun } from "../game/run";
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
};

const BLOCKING: PropKind[] = ["barrel", "crate", "cart", "post", "bench", "jar", "well", "stone", "tree", "house"];

function tileOf(ch: string, scene: SceneId): Tile {
  if (ch === "#") return "wall";
  if (ch === "~") return "water";
  if (ch === "^" || ch === "%") return isOutdoor(scene) ? "water" : "rock";
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
  if (w.gate === "fire-seals") return hasFlag(run, "branded") && sealsComplete(w);
  if (w.gate === "watch") return hasFlag(run, "watchOpen") || w.progress.includes("n");
  if (w.gate === "mirror") return hasFlag(run, "trueMirror") || w.progress.includes("w");
  if (w.gate === "books") return hasFlag(run, "booksOk");
  if (w.gate === "deed") return hasItem(run, "deed");
  if (w.gate === "tide") return hasFlag(run, "tideOpen") || w.progress.includes("s");
  if (w.gate === "incense") return hasItem(run, "incense");
  return false;
}

function extraProp(scene: SceneId, ch: string): { kind: PropKind; tag: string } | null {
  if (scene === "ropes" && ch === "d") return { kind: "coil", tag: "deadKnot" };
  if (scene === "ropes" && ch === "h") return { kind: "coil", tag: "looseKnot" };
  if (scene === "lamp" && ch === "u") return { kind: "well", tag: "hiddenWell" };
  if (scene === "tea" && ch === "f") return { kind: "tree", tag: "hiddenTree" };
  if (scene === "wharf" && ch === "m") return { kind: "stone", tag: "hiddenStone" };
  if (ch === "f" && scene !== "outer" && scene !== "tea") return { kind: "cart", tag: "cart" };
  if (ch === "o" && scene !== "tea") return { kind: "well", tag: "well" };
  if (ch === "H" && (scene === "plot" || scene === "ridge" || scene === "wharf" || scene === "lane")) {
    return { kind: "house", tag: "shed" };
  }
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
  if (w.player.x === x && w.player.y === y) return false;
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

function portalCell(w: World, x: number, y: number): boolean {
  return w.portals.some((p) => p.x === x && p.y === y);
}

function pathCell(
  w: World,
  run: Run,
  x: number,
  y: number,
  goalX: number,
  goalY: number,
  explored: (x: number, y: number) => boolean,
): boolean {
  if (!explored(x, y)) return false;
  if (!walkable(w, x, y, run)) return false;
  if (portalCell(w, x, y) && (x !== goalX || y !== goalY)) return false;
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

  if (arrival) {
    const p = portals.find((pt) => pt.ch === arrival);
    if (p) player = { x: p.x, y: p.y };
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
  if (portal && portal.ch !== w.arrival) {
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

export function interact(
  w: World,
  run: Run,
  pick?: string,
): {
  world: World;
  action: InteractAction;
  enemyId?: EnemyId;
  itemId?: GroundItem["id"];
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
    voice(next, "", "出招之前先亮招。");
    return { world: next, action: "duel", enemyId: npc.id };
  }

  const talker =
    talkerAt(next, f.x, f.y) ??
    talkerAt(next, next.player.x, next.player.y) ??
    (pick && prevSpeaker && prevSpeaker !== "rail" ? next.talkers.find((t) => t.id === prevSpeaker) : undefined);
  if (talker) {
    next.speaker = talker.id;
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
