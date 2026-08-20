import { CARDS, ENEMIES, HEARTS, HEROES, TECHNIQUES, WORLD, intentLabel, isSparEnemy, winHeal } from "./game/content";
import { applyReward, rollRewards } from "./game/rewards";
import { addFlag, addItem, addTechnique, availableHearts, loadSave, makeRun, markCleared, markSeen, noteBeaten, noteScene, rememberSeals, takeChest, writeSave } from "./game/run";
import {
  canPlay,
  canSwap,
  dangerCells,
  endTurn,
  livingFoes,
  makeBattle,
  playCard,
  previewCard,
  swapFighter,
  yourPace,
} from "./game/sim";
import { BOARD_SIZE, type Battle, type CardInst, type CompanionId, type EnemyId, type HeartId, type HeroId, type Preview, type Reward, type Run } from "./game/types";
import { combatBg, hasStand, stand, titleBg } from "./art/portraits";
import {
  constableInk,
  delayInk,
  gearInk,
  ghostInk,
  heartMark,
  intentBlade,
  knifeInk,
  lordInk,
  ropeInk,
  saberInk,
  seerInk,
  stakeInk,
  techSeal,
  twinInk,
} from "./art";
import { cardArt } from "./art/cardArt";
import { clearFx, playCardFx, playIntentFx } from "./fx";
import { cueMusic, getEar, playSfx, setEar } from "./audio";
import { applyCamera, coverScale, type Cam } from "./map/camera";
import { HERO_BOSSES, HERO_START } from "./game/hero";
import { questLog } from "./game/quest";
import { JOIN_FLAG, MATES, WEAPON_NAME, WEAPON_PACE, WEAPON_VERB, addCompanion, cardSchool, grantChapterTwo, healRun, isLead, noteFall, restHeal, reviveHp, schoolLabel, syncActiveHp, wielderOf } from "./game/party";
import { ATLAS_H, ATLAS_W, ATLAS_ZOOM_H, ATLAS_ZOOM_W, paintAtlas } from "./map/atlas";
import {
  doorKind,
  doorSrc,
  portalHasFrame,
  isSeen,
  markVision,
  objSrc,
  plantStamp,
  spriteSrc,
  stampSrc,
  texMarkup,
  tileArt,
  treeStampAt,
} from "./map/tileset";
import { SCENES, SPAR_FLAG, TALKER_NAME, itemName, tutorLesson } from "./map/scenes";
import type { ItemId, PropKind, SceneId } from "./map/types";
import type { Dir, World } from "./map/types";
import { afterDuel, findPath, gateOpen, interact, loadScene, openCache, sealsComplete, takeGround, tryMove } from "./map/world";

type Screen = "title" | "heart" | "map" | "combat" | "reward" | "end";
const TILE = 40;
const KEY_STEP_MS = 70;
const WALK_STEP_MS = 40;

const found = document.querySelector<HTMLDivElement>("#app");
if (!found) throw new Error("#app 不存在");
const root: HTMLDivElement = found;

let screen: Screen = "title";
let save = loadSave();
let run: Run = makeRun("empty");
let battle = makeBattle("catcher", run);
let world: World = loadScene("hut", run);
let hoverUid: string | null = null;
let lastStep = 0;
let walkGen = 0;
let walkTimer = 0;
let rewards: Reward[] = [];
let rewardFrom: "duel" | "chest" = "duel";
let ended: "won" | "lost" = "lost";
let pendingHero: HeroId = "rail";
let cam: Cam = { x: 0, y: 0, scene: "" };
let atlasOpen = false;
let packOpen = false;
let partyOpen = false;
let questSheet: "main" | "side" | null = null;
let fallOpen = false;
let fallSaid = "";
let fallThought = "";
let pileOpen: "draw" | "discard" | null = null;
let placeToast: { name: string; kicker: string } | null = null;
let placeTimer = 0;
let sparKeep: { hp: number; companionHp: Run["companionHp"] } | null = null;
let talkSig = "";
let talkPages: { cls: string; text: string }[] = [];
let talkPage = 0;

let fogStamp = "";

function splitTalkSentences(s: string): string[] {
  const raw = s.trim();
  if (!raw) return [];
  const out: string[] = [];
  let cur = "";
  for (const ch of raw) {
    cur += ch;
    if ("。！？…".includes(ch)) {
      const t = cur.trim();
      if (t) out.push(t);
      cur = "";
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.length ? out : [raw];
}

function packTalkPages(parts: { cls: string; text: string }[]): { cls: string; text: string }[] {
  const pages: { cls: string; text: string }[] = [];
  for (const part of parts) {
    const last = pages[pages.length - 1];
    if (
      last &&
      last.cls === part.cls &&
      last.text.replace(/\s/g, "").length + part.text.replace(/\s/g, "").length <= 28
    ) {
      last.text += part.text;
      continue;
    }
    pages.push({ ...part });
  }
  return pages;
}

function rebuildTalkPages(w: World): void {
  const sig = [w.speaker, w.said, w.thought, w.reply, w.message, JSON.stringify(w.choices ?? [])].join("\0");
  if (sig === talkSig) return;
  talkSig = sig;
  talkPage = 0;
  const parts: { cls: string; text: string }[] = [];
  const self = !w.speaker || w.speaker === "rail" || w.speaker === (run.hero ?? "rail");
  if (!self) {
    for (const s of splitTalkSentences(w.reply ?? "")) parts.push({ cls: "line-said you", text: s });
  }
  for (const s of splitTalkSentences(w.said ?? "")) {
    parts.push({ cls: self ? "line-thought" : "line-said", text: s });
  }
  const thought = (w.thought ?? "").trim();
  const said = (w.said ?? "").trim();
  if (thought && thought !== said) {
    for (const s of splitTalkSentences(thought)) parts.push({ cls: "line-thought", text: s });
  }
  if (!parts.length && (w.message ?? "").trim()) {
    for (const s of splitTalkSentences(w.message)) parts.push({ cls: "line-thought", text: s });
  }
  talkPages = packTalkPages(parts);
}

function talkHasMore(): boolean {
  return talkPage < Math.max(0, talkPages.length - 1);
}

function advanceTalkPage(): boolean {
  if (!talkHasMore()) return false;
  talkPage += 1;
  const talkWords = root.querySelector("#talk-words");
  if (talkWords) talkWords.innerHTML = renderTalkWords(world);
  return true;
}

function seeAround(): void {
  run = {
    ...run,
    seenTiles: markVision(
      run.seenTiles,
      world.scene,
      world.player.x,
      world.player.y,
      world.facing,
      world.w,
      world.h,
      (x, y) =>
        world.tiles[y]?.[x] === "wall" ||
        world.tiles[y]?.[x] === "rock" ||
        world.tiles[y]?.[x] === "hill",
    ),
  };
}

function stopWalk(): void {
  walkGen += 1;
  if (walkTimer) {
    window.clearTimeout(walkTimer);
    walkTimer = 0;
  }
}

function applyMapInteract(pick?: string): void {
  const r = interact(world, run, pick);
  world = r.world;
  for (const flag of r.flags ?? []) {
    run = addFlag(run, flag);
    const mate = JOIN_FLAG[flag];
    if (mate) run = addCompanion(run, mate);
  }
  if (r.action === "talk" && !pick && world.speaker && world.speaker !== "rail") {
    const id = world.speaker;
    run = { ...run, talks: { ...run.talks, [id]: (run.talks[id] ?? 0) + 1 } };
  }
  run = rememberSeals(run, world.scene, world.progress);
  if (r.tech) run = addTechnique(run, r.tech);
  if (r.action === "duel" && r.enemyId) startFight(r.enemyId);
  else if (r.action === "spar" && r.enemyId) startFight(r.enemyId, true);
  else if (r.action === "loot") offerRewards(rollRewards(run, save, { type: "chest" }), "chest");
  else if (r.action === "take" && r.itemId) {
    run = addItem(run, r.itemId);
    world = takeGround(world, r.itemId);
    paintMap();
  } else if (r.action === "brand") {
    run = addFlag(run, "branded");
    paintMap();
  } else if (r.action === "rest") {
    run = healRun(run, restHeal(world.scene));
    world.hp = run.hp;
    paintMap();
  } else if (r.action === "end") endRunWin();
  else if (r.travel) travelTo(r.travel.to, r.travel.at);
  else paintMap();
}

function faceToward(x: number, y: number): Dir | null {
  const dx = x - world.player.x;
  const dy = y - world.player.y;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
  if (dx === 1) return "right";
  if (dx === -1) return "left";
  if (dy === 1) return "down";
  return "up";
}

function talkAt(x: number, y: number): void {
  const dir = faceToward(x, y);
  if (!dir) return;
  world = { ...world, facing: dir };
  applyMapInteract();
}

function stepMap(dir: Dir): boolean {
  const nx = world.player.x + (dir === "left" ? -1 : dir === "right" ? 1 : 0);
  const ny = world.player.y + (dir === "up" ? -1 : dir === "down" ? 1 : 0);
  if (world.talkers.some((t) => t.x === nx && t.y === ny)) {
    world = { ...world, facing: dir };
    if (!run.flags.includes("lessonTalk")) run = addFlag(run, "lessonTalk");
    applyMapInteract();
    return false;
  }
  const moved = tryMove(world, dir, run);
  world = moved.world;
  seeAround();
  run = rememberSeals(run, world.scene, world.progress);
  lastStep = performance.now();
  if (!run.flags.includes("lessonWalk")) {
    run = addFlag(run, "lessonWalk");
    if (world.scene === "hut") {
      world.said = "步开了。南墙那口是屋后。";
      world.thought = "走到门上会换地。门外有人，刀先亮。";
      world.message = world.said;
      world.speaker = "rail";
    }
  } else if (
    world.scene === "hut" &&
    !run.flags.includes("lessonDoor") &&
    world.portals.some((p) => Math.abs(p.x - world.player.x) + Math.abs(p.y - world.player.y) <= 1)
  ) {
    run = addFlag(run, "lessonDoor");
    world.said = "门缝里风是湿的。踩上去，就到屋后。";
    world.thought = "屋后坡上有人拦路。点他，或贴上去出招。";
    world.message = world.said;
    world.speaker = "rail";
  }
  if (moved.travel) {
    stopWalk();
    travelTo(moved.travel.to, moved.travel.at);
    return false;
  }
  paintMap();
  return true;
}

function walkPath(dirs: Dir[], face: { x: number; y: number } | null = null): void {
  stopWalk();
  if (screen !== "map") return;
  if (!dirs.length) {
    if (face) talkAt(face.x, face.y);
    return;
  }
  const gen = walkGen;
  const rest = dirs.slice();
  const tick = (): void => {
    if (gen !== walkGen || screen !== "map" || rest.length === 0) return;
    const dir = rest.shift();
    if (!dir) return;
    if (!stepMap(dir)) return;
    if (rest.length) walkTimer = window.setTimeout(tick, WALK_STEP_MS);
    else if (face) talkAt(face.x, face.y);
  };
  tick();
}

function paintFog(w: World): void {
  const canvas = root.querySelector<HTMLCanvasElement>("#fog");
  if (!canvas) return;
  const width = w.w * TILE;
  const height = w.h * TILE;
  const seen = run.seenTiles[w.scene] ?? [];
  const stamp = `${w.scene}:${width}x${height}:${seen.length}`;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  if (stamp === fogStamp) return;
  fogStamp = stamp;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const seenSet = new Set(seen);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#050508";
  for (let y = 0; y < w.h; y++) {
    for (let x = 0; x < w.w; x++) {
      if (seenSet.has(`${x},${y}`)) continue;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
}

function mateArt(id: string, kind: string): string {
  const who = id === "hooker" ? "roper" : id;
  if (hasStand(who)) return stand(who, kind);
  return stand("rail", kind);
}

function cutSprite(id: string): string {
  return `<img class="sprite" src="${spriteSrc(id)}" alt="" draggable="false">`;
}

function houseLabel(world: World, p: { x: number; y: number }): string {
  const labels: Record<string, string> = {
    vendor: "货铺",
    hawker: "饼摊",
    clerk: "账房",
    fisher: "渔寮",
    carter: "车棚",
    docker: "缆寮",
    barber: "剃铺",
    inn: "茶棚",
  };
  let best: string | null = null;
  let bestD = 3;
  for (const t of world.talkers) {
    const d = Math.abs(t.x - p.x) + Math.abs(t.y - p.y);
    const label = labels[t.id];
    if (!label || d >= bestD) continue;
    bestD = d;
    best = label;
  }
  return best ?? "屋";
}

function propArt(kind: PropKind, x = 0, y = 0): string {
  if (kind === "tree") {
    const stamp = treeStampAt(x, y);
    const grow = stamp === "bush" ? " bush" : stamp.startsWith("tree-") ? ` ${stamp}` : "";
    return `<img class="sprite obj${grow}" src="${stampSrc(stamp)}" alt="" draggable="false">`;
  }
  return `<img class="sprite obj" src="${objSrc(kind)}" alt="" draggable="false">`;
}

function actorTag(name: string): string {
  return `<span class="tag">${name}</span>`;
}

function placeName(id: SceneId): string {
  return SCENES[id].name;
}

function lockedDoorName(w: World, x: number, y: number): string {
  let bestTo: SceneId | null = null;
  let bestD = 4;
  for (const p of w.portals) {
    const d = Math.abs(p.x - x) + Math.abs(p.y - y);
    if (d === 0 || d >= bestD) continue;
    bestD = d;
    bestTo = p.to;
  }
  if (bestTo) return placeName(bestTo);
  if (w.gate === "books") return "册门";
  if (w.gate === "incense") return "值房";
  if (w.gate === "tide") return "北闸";
  return "闸";
}

function coachText(b: Battle, prev: Preview | null): string {
  if (prev && prev.legal && prev.enemyDies) return "他要撑不住了。";
  if (b.energy === 0) return "劲尽了。收势，看他下一招。";
  const intent = b.intent;
  const early =
    b.enemyId === "intruder" ||
    b.enemyId === "inkhand" ||
    b.enemyId === "stakeboss" ||
    (!run.flags.includes("lessonFight") && b.turn <= 2);
  if (early && b.turn === 1 && !prev) {
    if (intent.kind === "strike") return "红格是他要打的步。先卸力，或进步躲开，再出掌。";
    if (intent.kind === "charge") return "他要冲过来。让开红格，或用推宫撞他。";
    if (intent.kind === "lunge") return "他要抢步。贴上去打，或先卸一掌。";
  }
  if (prev?.legal) {
    if (prev.notes.some((n) => n.includes("撞壁"))) return "推到墙，墙替你打。";
    if (prev.notes.some((n) => n.includes("追掌") || n.includes("连环"))) return "接上了。连势认第二掌。";
  }
  if (intent.kind === "windup") return "他在蓄。这一息能卸，也能抢先打穿。";
  if (intent.kind === "guard") return "他架着。硬劈会被卸掉一截，先破架或推开。";
  if (intent.kind === "barrage") return "连打。格挡要够，或先把他推远。";
  if (intent.kind === "charge") return "冲锋认空位。让开，或者上前抢他的步。";
  if (intent.kind === "pull") return "缆要拉你。贴上去，或站住卸力。";
  if (intent.kind === "trap") return "脚下要下机。先挪一步。";
  if (intent.kind === "stake") return "他要落桩。桩落地，进步就堵。";
  if (b.setup > 0) return `铺势 ${b.setup}。收势掌认这层。`;
  if (b.flow > 0) return `气脉 ${b.flow}。这一场的攻击都加了。`;
  if (b.mark > 0) return `点穴 ${b.mark}。开缝能吃印，硬劈也更重。`;
  if (b.echoNext > 0) return `尾劲还在。下回第一掌会更重。`;
  if (b.combo > 0) return `连势 ${b.combo}。下一掌会更重，或出连环。`;
  if (b.lastPlay === "attack" && b.hand.some((c) => c.defId === "weave")) {
    return "这一息出过掌。搓手能卸并叠连势。";
  }
  if (b.attacksThisTurn > 0 && b.hand.some((c) => c.defId === "follow" || c.defId === "follow2" || c.defId === "layer")) {
    return "这一息出过掌。追掌、叠掌是空的，能白接一记。";
  }
  return ENEMIES[b.enemyId].pitch;
}

function hpBar(current: number, max: number, extra = ""): string {
  const pct = Math.max(0, Math.round((current / max) * 100));
  return `<div class="bar ${extra}"><i style="width:${pct}%"></i></div>`;
}

function foeArt(id: EnemyId, kind = "board"): string {
  if (hasStand(id)) return stand(id, kind);
  if (id === "escort") return saberInk();
  if (id === "piler") return stakeInk();
  if (id === "hauler") return ropeInk();
  if (id === "alley") return knifeInk();
  if (id === "trapper") return gearInk();
  if (id === "delay") return delayInk();
  if (id === "twin") return twinInk();
  if (id === "lord") return lordInk();
  if (id === "inkhand" || id === "nametaker") return delayInk();
  if (id === "bookcut") return knifeInk();
  if (id === "glasspin") return twinInk();
  if (id === "knotboss") return ropeInk();
  if (id === "stakeboss") return stakeInk();
  return constableInk();
}

function heroArt(id: string, kind = "hero"): string {
  if (hasStand(id)) return stand(id, kind);
  if (id === "seer") return seerInk();
  if (id === "sapper") return stakeInk();
  return stand("rail", kind);
}

function renderBoard(b: Battle, prev: Preview | null): string {
  const danger = dangerCells(b);
  return Array.from({ length: BOARD_SIZE }, (_, i) => {
    const isPlayer = b.player.hp > 0 && b.player.pos === i;
    const isEnemy = livingFoes(b).some((f) => f.pos === i);
    const ghostEnemy = Boolean(
      prev && prev.legal && prev.enemyPos === i && prev.enemyPos !== b.enemy.pos,
    );
    const ghostYou = Boolean(
      prev && prev.legal && prev.playerPos === i && prev.playerPos !== b.player.pos,
    );
    const classes = [
      "cell",
      danger.includes(i) ? "red" : "",
      i === BOARD_SIZE - 1 ? "wall" : "",
      ghostEnemy || ghostYou ? "ghost" : "",
      b.stakes.includes(i) ? "staked" : "",
      b.traps.includes(i) ? "trapped" : "",
    ]
      .filter(Boolean)
      .join(" ");

    let body = `<em>${i + 1}</em>`;
    if (b.traps.includes(i) && !isEnemy && !isPlayer) {
      body += `<div class="fig trap"><span>机</span></div>`;
    }
    if (b.stakes.includes(i) && !isEnemy && !isPlayer) {
      body += `<div class="fig stake">${stakeInk()}<span>桩</span></div>`;
    }
    if (isPlayer) {
      body += `<div class="fig you">${mateArt(b.active, "board")}<span>${b.player.name}</span></div>`;
    } else if (isEnemy) {
      const foe = livingFoes(b).find((f) => f.pos === i)!;
      const artId = (foe.id === "shadow" ? "twin" : foe.id === "twin" ? "twin" : b.enemyId) as EnemyId;
      body += `<div class="fig foe">${foeArt(artId, "board")}<span>${foe.name}</span></div>`;
    } else if (ghostEnemy) {
      body += `<div class="fig ghost">${ghostInk()}<span>将被推到这</span></div>`;
    } else if (ghostYou) {
      body += `<div class="fig ghost">${ghostInk()}<span>落脚</span></div>`;
    } else if (i === BOARD_SIZE - 1) {
      body += `<span class="wall-label">壁</span>`;
    }
    return `<div class="${classes}">${body}</div>`;
  }).join("");
}

function typeLabel(type: string): string {
  return type === "attack" ? "攻击" : "技能";
}

function renderCards(b: Battle, hover: string | null): string {
  return b.hand
    .map((c, idx) => {
      const def = CARDS[c.defId];
      const gate = canPlay(b, c.uid);
      const active = hover === c.uid;
      return `
        <button class="card ${def.type} ${active ? "hot" : ""} ${gate.ok ? "" : "dead"}"
          data-uid="${c.uid}" ${gate.ok ? "" : "disabled"}>
          <span class="cost">${def.cost}</span>
          <div class="art">${cardArt(def.id)}</div>
          <div class="banner">${typeLabel(def.type)} · ${schoolLabel(def.id)}</div>
          <h3>${def.name}</h3>
          <p class="text">${def.text}</p>
          <p class="flavor">${def.flavor}</p>
          <span class="hotkey">${idx + 1}</span>
        </button>`;
    })
    .join("");
}

function stanceLine(b: Battle): string {
  const live = livingFoes(b);
  const foe = live[0] ?? b.enemy;
  const block = b.playerBlock ? ` / 格挡 ${b.playerBlock}` : " / 格挡 0";
  return `你 ${b.player.hp} 血${block}　·　${foe.name} ${foe.hp} 血　·　第 ${foe.pos + 1} 步`;
}

function renderPreview(prev: Preview | null): string {
  if (!prev) return `<div class="preview idle">${stanceLine(battle)}</div>`;
  if (!prev.legal) {
    return `<div class="preview bad">${prev.reason ?? "现在不能打出"}　·　${stanceLine(battle)}</div>`;
  }
  const bits = [
    ...prev.notes,
    `你 ${prev.playerHp} 血 / 格挡 ${prev.playerBlock}`,
    prev.enemyDies
      ? `${battle.enemy.name}倒下`
      : `${battle.enemy.name} ${prev.enemyHp} 血 · 第 ${prev.enemyPos + 1} 步`,
  ];
  return `<div class="preview live">${bits.join("  ·  ")}</div>`;
}

function speakerName(id: string): string {
  if (id in MATES) return MATES[id as CompanionId].name;
  if (TALKER_NAME[id]) return TALKER_NAME[id];
  if (id in ENEMIES) return ENEMIES[id as EnemyId].name;
  return MATES[run.hero ?? "rail"].name;
}

const PLACE_INK = new Set<SceneId>([
  "plot",
  "ridge",
  "wharf",
  "yard",
  "hold",
  "customs",
  "salt",
  "ropes",
  "lane",
  "tea",
  "drums",
  "outer",
  "glass",
  "inner",
  "shrine",
  "lamp",
]);

const CLUE_WORDS = [
  "火印",
  "西仓",
  "空碗",
  "北鼓",
  "纸角",
  "盐契",
  "香匙",
  "酒葫芦",
  "麦饼",
  "冲锋",
  "卸力",
  "进退",
  "土路",
  "空位",
  "拳谱",
  "刀谱",
];

function cuePlace(scene: SceneId): void {
  if (!PLACE_INK.has(scene)) {
    placeToast = null;
    return;
  }
  const def = SCENES[scene];
  placeToast = { name: def.name, kicker: def.kicker };
  if (placeTimer) window.clearTimeout(placeTimer);
  placeTimer = window.setTimeout(() => {
    placeToast = null;
    root.querySelector(".place-ink")?.remove();
  }, 3000);
}

function escapeTalk(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function quoteSpeech(s: string): string {
  return s.replace(/「/g, "“").replace(/」/g, "”");
}

function markClues(s: string): string {
  let out = escapeTalk(quoteSpeech(s));
  for (const word of CLUE_WORDS) out = out.replaceAll(word, `<em class="clue">${word}</em>`);
  return out;
}

function talkFace(w: World): string {
  return voiceWho(w.speaker);
}

function renderTalkWords(w: World): string {
  const hero = run.hero ?? "rail";
  const npc = Boolean(w.speaker && w.speaker !== "rail");
  const who = npc ? speakerName(w.speaker) : speakerName(hero);
  rebuildTalkPages(w);
  const page = talkPages[talkPage];
  const lines: string[] = [];
  if (page) lines.push(`<p class="${page.cls}">${markClues(page.text)}</p>`);
  const more = talkHasMore();
  const picks = more ? [] : (w.choices ?? []).filter((c) => c.id && c.label);
  let side = "";
  if (more) {
    side = `<div class="fy-picks"><button type="button" class="fy-pick" data-more="1">……</button></div>`;
  } else if (picks.length) {
    side = `<div class="fy-picks">${picks
      .map((c) => `<button type="button" class="fy-pick" data-pick="${escapeTalk(c.id)}">${markClues(c.label)}</button>`)
      .join("")}</div>`;
  }
  return `<b class="fy-name" id="talk-name">${who}</b><div class="fy-panel"><div class="fy-lines">${lines.join("")}</div>${side}</div>`;
}

function renderTitle(): string {
  const heroes = HEROES.map(
    (h) => `
      <article class="hero ${h.locked ? "locked" : "open"}${!h.locked && pendingHero === h.id ? " picked" : ""}" data-hero="${h.id}">
        <div class="hero-fig ${h.id}">${heroArt(h.id)}</div>
        <div>
          <div class="kicker">${h.sect}</div>
          <h3>${h.name} · ${h.title}</h3>
          <p class="verb">${h.verb}</p>
          <p>${h.pitch}</p>
          <p class="crime">${h.locked ? "" : h.crime}</p>
        </div>
      </article>`,
  ).join("");
  return `
    <section class="screen title-screen fy-title" style="background-image:url('${titleBg()}')">
      <div class="fy-title-art">${heroArt(pendingHero, "side")}</div>
      <div class="center wide fy-plaque">
        <div class="kicker">${WORLD.kicker}</div>
        <h1>${WORLD.title}</h1>
        <p class="lead">${WORLD.lead}</p>
        <p class="lead dim">${WORLD.you}</p>
        <div class="roster">${heroes}</div>
        <div class="row">
          <button class="primary" id="btn-start">出门 · ${HEROES.find((h) => h.id === pendingHero)?.name ?? "轨刃"}</button>
          ${earButtons()}
        </div>
        <p class="hint">WASD 移动　点已见处可走　空格 交谈　点强敌开战　M 路径　B 行囊　P 同行　Q 功过</p>
      </div>
    </section>`;
}

function renderHeart(): string {
  const hearts = availableHearts(save)
    .map((id) => {
      const h = HEARTS[id];
      return `
        <button class="heart-pick" data-heart="${id}">
          <div class="kicker">心法</div>
          <h3>${h.name}</h3>
          <p>${h.text}</p>
          <p class="flavor">${h.flavor}</p>
        </button>`;
    })
    .join("");
  return `
    <section class="screen title-screen fy-title" style="background-image:url('${titleBg()}')">
      <div class="center wide fy-plaque">
        <div class="kicker">出门前</div>
        <h1>调息</h1>
        <p class="lead dim">衫可以穿一件。气可以调一口。多了就不是这一趟的事。</p>
        <div class="picks">${hearts}</div>
      </div>
    </section>`;
}

function chapterMeta() {
  const def = SCENES[world.scene];
  return { kicker: def.kicker, name: def.name };
}

function renderRelics(ids: Run["techniques"]): string {
  if (!ids.length) return "";
  return ids
    .map((id) => {
      const t = TECHNIQUES[id];
      return `<span class="relic on" title="${t.name}：${t.text}">${techSeal(id)}</span>`;
    })
    .join("");
}

function renderTechChips(ids: Run["techniques"]): string {
  if (!ids.length) return "";
  return `<div class="tech-list">${ids
    .map((id) => {
      const t = TECHNIQUES[id];
      return `<span class="tech-chip" title="${t.text}">${t.name}</span>`;
    })
    .join("")}</div>`;
}

function earButtons(): string {
  const ear = getEar();
  return `
    <button type="button" class="ear-btn ${ear.sfx ? "on" : ""}" data-ear="sfx" title="出招、挨打的声音">${ear.sfx ? "声开" : "声关"}</button>
    <button type="button" class="ear-btn ${ear.music ? "on" : ""}" data-ear="music" title="场上的弦">${ear.music ? "乐开" : "乐关"}</button>`;
}

function shuffleView(list: CardInst[]): CardInst[] {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const hold = next[i];
    next[i] = next[j];
    next[j] = hold;
  }
  return next;
}

function sheetClose(): string {
  return `<button type="button" class="sheet-close" data-close="sheet">收</button>`;
}

function renderPileSheet(b: Battle, which: "draw" | "discard"): string {
  const draw = which === "draw";
  const cards = draw ? shuffleView(b.drawPile) : [...b.discardPile].reverse();
  const rows = cards
    .map((c) => {
      const def = CARDS[c.defId];
      return `<li><b>${def.name}</b><span>${def.text}</span></li>`;
    })
    .join("");
  return `
    <div class="sheet-mask" id="pile-mask">
      <div class="sheet-panel pile-sheet">
        ${sheetClose()}
        <div class="kicker">${draw ? "残谱" : "弃谱"}</div>
        <h2>${draw ? "袖中" : "落地"}</h2>
        <p>${draw ? "还压着。" : "这一息的字。"}</p>
        <ul class="pack-list">${rows || `<li>${draw ? "空袖。" : "还白着。"}</li>`}</ul>
      </div>
    </div>`;
}

function renderCombat(): string {
  const b = battle;
  const prev = hoverUid ? previewCard(b, hoverUid) : null;
  const mate = MATES[b.active];
  const ch = chapterMeta();
  const live = livingFoes(b);
  const foeHp = live.reduce((s, f) => s + f.hp, 0);
  const foeMax = live.reduce((s, f) => s + f.maxHp, 0) || b.enemy.maxHp;
  const pace = yourPace(b);
  const lead = pace >= b.foePace ? "你先手" : "他先手";
  const swaps = b.bench
    .map((m) => {
      const def = MATES[m.id];
      const gate = canSwap(b, m.id);
      return `<button type="button" class="swap-btn" data-mate="${m.id}" ${gate.ok ? "" : "disabled"}>${def.name}<small>${WEAPON_NAME[def.weapon]} · 先机 ${WEAPON_PACE[def.weapon]} · ${m.hp}</small></button>`;
    })
    .join("");
  return `
    <section class="combat fy-combat" style="background-image:url('${combatBg(world.scene)}')">
      <header class="fy-top">
        <div class="fy-place">
          <em>${ch.kicker}</em>
          <b>${ch.name}</b>
        </div>
        <h1 class="fy-ink">七步石台</h1>
        <div class="fy-stats">
          ${renderRelics(b.techniques)}
          ${earButtons()}
        </div>
      </header>

      <div class="arena">
        <aside class="fighter you-side">
          <div class="fy-stand-wrap you">${mateArt(b.active, "side")}</div>
          <div class="nameplate">
            <b>${mate.name}</b>
            <span>${mate.title} · ${WEAPON_NAME[mate.weapon]} · 先机 ${pace}</span>
          </div>
          ${hpBar(b.player.hp, b.player.maxHp)}
          <div class="hp-read">${b.player.hp}/${b.player.maxHp}${b.playerBlock ? ` · 格挡 ${b.playerBlock}` : ""}${b.thorns ? ` · 反震 ${b.thorns}` : ""}${b.combo ? ` · 连势 ${b.combo}` : ""}${b.flow ? ` · 气脉 ${b.flow}` : ""}${b.setup ? ` · 铺势 ${b.setup}` : ""}${b.retainTurns ? ` · 铁布 ${b.retainAmt}/${b.retainTurns}` : ""}${b.echoNext ? ` · 尾劲 +${b.echoNext}` : ""}${b.energyNext ? ` · 纳息 +${b.energyNext}` : ""} · ${lead}</div>
          ${renderTechChips(b.techniques)}
          ${swaps ? `<div class="swap-row">${swaps}</div>` : ""}
        </aside>

        <div class="stage-core">
          <div class="strip" id="strip">${renderBoard(b, prev)}</div>
          <div class="coach" id="coach">${coachText(b, prev)}</div>
        </div>

        <aside class="fighter foe-side">
          <div class="intent-big">${intentBlade()} ${intentLabel(b.intent)}</div>
          <div class="fy-stand-wrap foe">${foeArt(b.enemyId, "side")}</div>
          <div class="nameplate">
            <b>${b.enemy.name}${live.length > 1 ? ` · ${live.length}人` : ""}</b>
            <span>${b.enemy.title} · 先机 ${b.foePace}</span>
          </div>
          ${hpBar(foeHp, foeMax, "danger")}
          <div class="hp-read">${live.map((f) => `${f.name} ${f.hp}`).join(" / ")}${b.bleed ? ` · 裂创 ${b.bleed}` : ""}${b.expose ? ` · 破绽 ${b.expose}` : ""}${b.mark ? ` · 点穴 ${b.mark}` : ""}${b.frail ? ` · 滞手 ${b.frail}` : ""}</div>
        </aside>
      </div>

      <footer class="bottombar">
        <div class="draw-col">
          <div class="energy" title="劲力">
            ${Array.from({ length: b.energyMax }, (_, i) => `<i class="${i < b.energy ? "on" : ""}"></i>`).join("")}
            <span>劲力 ${b.energy}/${b.energyMax}</span>
          </div>
          <button type="button" class="pile-card" data-pile="draw" title="残谱">
            <em>残谱</em>
            <b>${b.drawPile.length}</b>
          </button>
        </div>
        <div class="hand" id="hand">${renderCards(b, hoverUid)}</div>
        <div class="foe-col">
          <button class="endturn" id="btn-end" ${b.phase === "player" ? "" : "disabled"}>收势</button>
          <button type="button" class="pile-card discard" data-pile="discard" title="弃谱">
            <em>弃谱</em>
            <b>${b.discardPile.length}</b>
          </button>
        </div>
        <div id="preview-slot">${renderPreview(prev)}</div>
      </footer>
      ${pileOpen ? renderPileSheet(b, pileOpen) : ""}
    </section>`;
}

function rewardKind(r: Reward): string {
  if (r.kind === "upgrade") return "改字";
  if (r.kind === "replace") {
    const school = cardSchool(r.to);
    if (school !== "any" && school !== "palm") return wielderOf(run, school) ? "教谱" : "收谱";
    return "换页";
  }
  if (r.kind === "add") {
    const school = cardSchool(r.id);
    if (school !== "any" && !wielderOf(run, school)) return "收谱";
    if (school !== "any" && school !== "palm") return "教谱";
    return "残谱";
  }
  return "外功";
}

function rewardBody(r: Reward): { name: string; text: string; flavor: string; art: string } {
  if (r.kind === "technique") {
    const t = TECHNIQUES[r.id];
    return { name: t.name, text: t.text, flavor: t.flavor, art: techSeal(t.id) };
  }
  if (r.kind === "upgrade") {
    const to = CARDS[r.to];
    const from = CARDS[r.from];
    return { name: to.name, text: to.text, flavor: `由「${from.name}」改来。`, art: cardArt(to.id) };
  }
  if (r.kind === "replace") {
    const to = CARDS[r.to];
    const from = CARDS[r.from];
    const school = cardSchool(r.to);
    if (school !== "any" && school !== "palm") {
      const who = wielderOf(run, school);
      return {
        name: to.name,
        text: `${to.text}　${schoolLabel(r.to)}`,
        flavor: who
          ? `教给会${schoolLabel(r.to)}的人。拳掌谱不动。`
          : `拳掌使不了${schoolLabel(r.to)}。先收进行囊。`,
        art: cardArt(to.id),
      };
    }
    return {
      name: to.name,
      text: `${to.text}　${schoolLabel(r.to)}`,
      flavor: `替下「${from.name}」。`,
      art: cardArt(to.id),
    };
  }
  const to = CARDS[r.id];
  const school = cardSchool(r.id);
  if (school !== "any" && !wielderOf(run, school)) {
    return {
      name: to.name,
      text: `${to.text}　${schoolLabel(r.id)}`,
      flavor: `先收着。会${schoolLabel(r.id)}的人来了再教。`,
      art: cardArt(to.id),
    };
  }
  return { name: to.name, text: `${to.text}　${schoolLabel(r.id)}`, flavor: to.flavor, art: cardArt(to.id) };
}

function renderReward(): string {
  const cards = rewards
    .map((r, i) => {
      const body = rewardBody(r);
      return `
        <button class="card reward ${r.kind}" data-i="${i}">
          <div class="banner">${rewardKind(r)}</div>
          <div class="art">${body.art}</div>
          <h3>${body.name}</h3>
          <p class="text">${body.text}</p>
          <p class="flavor">${body.flavor}</p>
          <span class="hotkey">${i + 1}</span>
        </button>`;
    })
    .join("");
  return `
    <section class="screen reward-screen fy-title" style="background-image:url('${titleBg()}')">
      <div class="center wide fy-plaque">
        <div class="kicker">${rewardFrom === "chest" ? "箱子" : "他身上"}</div>
        <h2>${rewardFrom === "chest" ? "一页旧谱" : "掉下来的残谱"}</h2>
        <div class="picks reward-row">${cards}</div>
        <div class="row">
          <button class="ghost" id="btn-skip">这一页不取</button>
        </div>
      </div>
    </section>`;
}

function renderEnd(): string {
  const copy =
    ended === "won"
      ? "门开着。名册上那一笔墨还没干。你还是走了进去。"
      : fallSaid || "石台上，你倒了。";
  return `
    <section class="screen title-screen fy-title" style="background-image:url('${titleBg()}')">
      <div class="center fy-plaque">
        <div class="kicker">${ended === "won" ? "门律" : "港律"}</div>
        <h1>${ended === "won" ? "明手" : "倒了"}</h1>
        <p class="lead">${copy}</p>
        <div class="row">
          <button class="primary" id="btn-start">名册</button>
        </div>
      </div>
    </section>`;
}

function tileClass(w: World, x: number, y: number): string {
  const t = w.tiles[y][x];
  const seal = w.seals.find((s) => s.x === x && s.y === y);
  const lit =
    t === "seal" &&
    seal &&
    seal.id !== "x" &&
    (sealsComplete(w) || w.progress.includes(seal.id));
  const open = t === "gate" && gateOpen(w, run);
  const looted = t === "cache" && w.caches.some((c) => c.x === x && c.y === y && c.open);
  const taken = t === "item" && w.items.some((i) => i.x === x && i.y === y && i.taken);
  const portal = w.portals.some((p) => p.x === x && p.y === y);
  const fog = !isSeen(run.seenTiles, w.scene, x, y);
  return ["tile", t, lit ? "lit" : "", open ? "open" : "", looted || taken ? "open" : "", portal ? "portal" : "", fog ? "fog" : ""]
    .filter(Boolean)
    .join(" ");
}

function fillTile(el: HTMLElement, w: World, x: number, y: number): void {
  const next = tileClass(w, x, y);
  if (el.className !== next) el.className = next;
  if (el.dataset.tex) return;
  const art = tileArt(w.scene, w.tiles, x, y);
  el.dataset.tex = art.key;
  const occupied = w.portals.some((p) => p.x === x && p.y === y);
  const plant = occupied ? null : plantStamp(w.scene, w.tiles[y][x], x, y);
  const stool = w.tiles[y][x] === "seal";
  el.innerHTML =
    texMarkup(art) +
    (plant
      ? `<img class="stamp${plant.startsWith("crag") ? " crag" : plant.startsWith("tuft") ? " tuft" : ""}" src="${stampSrc(plant)}" alt="" draggable="false">`
      : "") +
    (stool ? `<img class="stamp stool" src="/art/objs/obj-stool.png" alt="" draggable="false">` : "");
}

function renderPack(): string {
  const bits = run.items.map((id) => `<li>${itemName(id as ItemId)}</li>`).join("");
  const pages = (run.scrolls ?? [])
    .map((id) => `<li>${CARDS[id].name}<span>${schoolLabel(id)}谱。还没人会。</span></li>`)
    .join("");
  return `
    <div class="sheet-panel">
      ${sheetClose()}
      <div class="kicker">行囊</div>
      <h2>身上</h2>
      <ul class="pack-list">${bits || "<li>空的。</li>"}</ul>
      <div class="kicker">外功</div>
      <ul class="pack-list">${run.techniques
        .map((id) => {
          const t = TECHNIQUES[id];
          return `<li><b>${t.name}</b><span>${t.text}</span></li>`;
        })
        .join("") || "<li>还没落下这一门。</li>"}</ul>
      <div class="kicker">残谱</div>
      <ul class="pack-list">${pages || "<li>没有多出来的谱。</li>"}</ul>
    </div>`;
}

function renderParty(): string {
  const mates = run.party
    .map((id) => {
      const m = MATES[id];
      const hp = run.companionHp[id] ?? (isLead(run, id) ? run.hp : m.hp);
      const cap = isLead(run, id) ? run.hpMax : m.hp;
      const extra = (run.mateDecks[id] ?? []).length;
      const learned = extra ? ` · 新谱 ${extra}` : "";
      return `<li>${m.name} · ${WEAPON_NAME[m.weapon]} · ${hp}/${cap}${learned}<span>${WEAPON_VERB[m.weapon]}</span></li>`;
    })
    .join("");
  return `
    <div class="sheet-panel">
      ${sheetClose()}
      <div class="kicker">同行</div>
      <h2>在路上</h2>
      <ul class="pack-list mates">${mates}</ul>
    </div>`;
}

function renderQuests(): string {
  const log = questLog(run);
  if (questSheet === "side") {
    const sides = log.sides.map((line) => `<li>${line}</li>`).join("");
    return `
    <div class="sheet-panel">
      ${sheetClose()}
      <div class="kicker">支线</div>
      <h2>路上旁的事</h2>
      <p class="quest-main">${log.sides.length ? "都是路上问来的。" : "还没跟人问起旁的事。"}</p>
      <ul class="pack-list">${sides || "<li>空。</li>"}</ul>
    </div>`;
  }
  return `
    <div class="sheet-panel">
      ${sheetClose()}
      <div class="kicker">主线</div>
      <h2>这一趟帖</h2>
      <p class="quest-main">${log.main}</p>
    </div>`;
}

function renderQuestChip(): string {
  const log = questLog(run);
  const sideText = log.sides[0] ?? "未接";
  return `<div class="fy-quests">
    <button id="btn-quest" class="fy-quest" type="button"><em>主线</em><b>${log.main}</b></button>
    <button id="btn-side" class="fy-quest" type="button"><em>支线</em><b>${sideText}</b></button>
  </div>`;
}

function voiceWho(speaker: string): string {
  return !speaker || speaker === "rail" ? (run.hero ?? "rail") : speaker;
}

function renderMap(): string {
  const w = world;
  const ch = chapterMeta();
  const tiles: string[] = [];
  for (let y = 0; y < w.h; y++) {
    for (let x = 0; x < w.w; x++) {
      tiles.push(`<div class="${tileClass(w, x, y)}" data-x="${x}" data-y="${y}"></div>`);
    }
  }
  return `
    <section class="overworld fy ${w.chapter}">
      <header class="fy-top">
        <div class="fy-place">
          <em>${ch.kicker}</em>
          <b>${ch.name}</b>
        </div>
        ${renderQuestChip()}
        <div class="fy-stats">
          ${renderRelics(run.techniques)}
          <button id="btn-pack" class="fy-btn" type="button">行囊</button>
          <button id="btn-party" class="fy-btn" type="button">同行</button>
          <span class="fy-btn hp">${heartMark()} ${run.hp}/${isLead(run, run.active) ? run.hpMax : MATES[run.active].hp}</span>
          <button id="btn-title" class="fy-btn" type="button">名册</button>
        </div>
      </header>
      <div class="map-stage" id="map-stage">
        ${placeToast ? `<div class="place-ink"><em>${placeToast.kicker}</em><b>${placeToast.name}</b></div>` : ""}
        <div class="map" id="map" style="width:${w.w * TILE}px;height:${w.h * TILE}px">
          <div class="tiles" style="grid-template-columns:repeat(${w.w}, ${TILE}px)">${tiles.join("")}</div>
          <canvas class="fog-layer" id="fog" width="${w.w * TILE}" height="${w.h * TILE}"></canvas>
          <div class="actors" id="actors"></div>
        </div>
      </div>
      <div class="fy-talk">
        <button type="button" id="btn-atlas" class="atlas-hit" title="查看路径">
          <canvas class="atlas" id="atlas" width="${ATLAS_W}" height="${ATLAS_H}"></canvas>
        </button>
        <div class="fy-bust" id="talk-bust">${stand(talkFace(w), "bust")}</div>
        <div class="fy-words" id="talk-words">${renderTalkWords(w)}</div>
      </div>
      ${atlasOpen ? `<div class="sheet-mask" id="atlas-mask">${sheetClose()}<canvas id="atlas-zoom" width="${ATLAS_ZOOM_W}" height="${ATLAS_ZOOM_H}"></canvas></div>` : ""}
      ${packOpen ? `<div class="sheet-mask" id="pack-mask">${renderPack()}</div>` : ""}
      ${partyOpen ? `<div class="sheet-mask" id="party-mask">${renderParty()}</div>` : ""}
      ${questSheet ? `<div class="sheet-mask" id="quest-mask">${renderQuests()}</div>` : ""}
      ${fallOpen ? `<div class="sheet-mask" id="fall-mask"><div class="sheet-panel"><div class="kicker">港律</div><h2>倒了</h2><p class="quest-main">${fallSaid}</p><p>${fallThought}</p><div class="row"><button class="primary" id="btn-rise" type="button">起身</button></div></div></div>` : ""}
    </section>`;
}

function paintMap(): void {
  if (screen !== "map") return;
  const w = world;
  for (const el of root.querySelectorAll<HTMLElement>(".tile")) {
    const x = Number(el.dataset.x);
    const y = Number(el.dataset.y);
    fillTile(el, w, x, y);
  }
  const visible = (x: number, y: number) => isSeen(run.seenTiles, w.scene, x, y);
  const npcs = w.npcs
    .filter((n) => !n.beaten && visible(n.x, n.y))
    .map(
      (n) =>
        `<div class="actor npc foe ${n.id}" data-foe="${n.id}" style="transform:translate(${n.x * TILE}px,${n.y * TILE}px)">${cutSprite(n.id)}${actorTag(ENEMIES[n.id].name)}</div>`,
    )
    .join("");
  const talkers = w.talkers
    .filter((t) => visible(t.x, t.y))
    .map(
      (t) =>
        `<div class="actor npc talk" style="transform:translate(${t.x * TILE}px,${t.y * TILE}px)">${cutSprite(t.id)}${actorTag(TALKER_NAME[t.id] ?? t.id)}</div>`,
    )
    .join("");
  const props = w.props
    .filter((p) => visible(p.x, p.y))
    .map((p) => {
      const name =
        p.kind === "tree"
          ? ""
          : p.tag === "empty"
            ? actorTag("空碗")
            : p.kind === "cart" || p.tag === "cart"
              ? actorTag("车")
              : p.kind === "well"
                ? actorTag("井")
                : p.kind === "house"
                  ? actorTag(houseLabel(w, p))
                  : "";
      return `<div class="actor prop ${p.kind}${p.tag ? " " + p.tag : ""}" style="transform:translate(${p.x * TILE}px,${p.y * TILE}px)">${propArt(p.kind, p.x, p.y)}${name}</div>`;
    })
    .join("");
  const chests = w.caches
    .filter((c) => !c.open && visible(c.x, c.y))
    .map(
      (c) =>
        `<div class="actor crate" style="transform:translate(${c.x * TILE}px,${c.y * TILE}px)">${propArt("crate")}${actorTag("残谱箱")}</div>`,
    )
    .join("");
  const doors = w.portals
    .filter((p) => visible(p.x, p.y))
    .map((p) => {
      const name = placeName(p.to);
      if (!portalHasFrame(w.tiles, p.x, p.y)) {
        return `<div class="actor door pass" style="transform:translate(${p.x * TILE}px,${p.y * TILE}px)">${actorTag(name)}</div>`;
      }
      const kind = doorKind(p.to);
      return `<div class="actor door ${kind}" style="transform:translate(${p.x * TILE}px,${p.y * TILE}px)"><img class="sprite obj door" src="${doorSrc(kind)}" alt="${name}" draggable="false">${actorTag(name)}</div>`;
    })
    .join("");
  const bars: string[] = [];
  for (let y = 0; y < w.h; y++) {
    for (let x = 0; x < w.w; x++) {
      if (w.tiles[y][x] !== "gate" || !visible(x, y)) continue;
      const open = gateOpen(w, run);
      const name = lockedDoorName(w, x, y);
      bars.push(
        `<div class="actor door paifang${open ? " open" : " shut"}" style="transform:translate(${x * TILE}px,${y * TILE}px)"><img class="sprite obj door" src="${doorSrc("paifang")}" alt="${name}" draggable="false">${actorTag(name)}</div>`,
      );
    }
  }
  const fires = w.braziers
    .filter((b) => visible(b.x, b.y))
    .map(
      (b) =>
        `<div class="actor fire" style="transform:translate(${b.x * TILE}px,${b.y * TILE}px)"><img class="sprite obj" src="/art/objs/obj-stove.png" alt="" draggable="false">${actorTag("炉")}</div>`,
    )
    .join("");
  const grounds = w.items
    .filter((i) => !i.taken && visible(i.x, i.y))
    .map(
      (i) =>
        `<div class="actor loot" style="transform:translate(${i.x * TILE}px,${i.y * TILE}px)">${actorTag(itemName(i.id))}</div>`,
    )
    .join("");
  const you = run.hero ?? "rail";
  const player = `<div class="actor you" style="transform:translate(${w.player.x * TILE}px,${w.player.y * TILE}px)">${cutSprite(you)}${actorTag(MATES[you].name)}</div>`;
  const actors = root.querySelector("#actors");
  if (actors) actors.innerHTML = props + chests + doors + bars.join("") + fires + grounds + talkers + npcs + player;
  paintFog(w);
  const talkWords = root.querySelector("#talk-words");
  if (talkWords) talkWords.innerHTML = renderTalkWords(w);
  const bust = root.querySelector("#talk-bust");
  if (bust) bust.innerHTML = stand(talkFace(w), "bust");
  const stage = root.querySelector<HTMLElement>("#map-stage");
  const map = root.querySelector<HTMLElement>("#map");
  if (stage && map) {
    const stageW = stage.clientWidth;
    const stageH = stage.clientHeight;
    if (stageW >= 64 && stageH >= 64) {
      const mapW = w.w * TILE;
      const mapH = w.h * TILE;
      const scale = coverScale(mapW, mapH, stageW, stageH);
      cam = applyCamera(cam, w.scene, w.player, mapW * scale, mapH * scale, stageW, stageH, TILE * scale);
      map.style.transformOrigin = "0 0";
      map.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${scale})`;
    }
  }
  const canvas = root.querySelector<HTMLCanvasElement>("#atlas");
  const ctx = canvas?.getContext("2d");
  if (ctx) paintAtlas(ctx, w.scene, run.visited);
  const zoom = root.querySelector<HTMLCanvasElement>("#atlas-zoom");
  const zctx = zoom?.getContext("2d");
  if (zctx) {
    const labels: Record<string, string> = {};
    for (const id of Object.keys(SCENES)) labels[id] = SCENES[id as SceneId].name;
    paintAtlas(zctx, w.scene, run.visited, {
      width: ATLAS_ZOOM_W,
      height: ATLAS_ZOOM_H,
      survey: true,
      labels,
    });
  }
}

function render(): void {
  fogStamp = "";
  if (screen === "title") root.innerHTML = renderTitle();
  else if (screen === "heart") root.innerHTML = renderHeart();
  else if (screen === "combat") root.innerHTML = renderCombat();
  else if (screen === "reward") root.innerHTML = renderReward();
  else if (screen === "end") root.innerHTML = renderEnd();
  else root.innerHTML = renderMap();
  bind();
  if (screen === "map") {
    paintMap();
    requestAnimationFrame(() => paintMap());
  }
}

function paintHover(): void {
  if (screen !== "combat") return;
  const b = battle;
  const prev = hoverUid ? previewCard(b, hoverUid) : null;
  const strip = root.querySelector("#strip");
  const slot = root.querySelector("#preview-slot");
  const coach = root.querySelector("#coach");
  if (strip) strip.innerHTML = renderBoard(b, prev);
  if (slot) slot.innerHTML = renderPreview(prev);
  if (coach) coach.textContent = coachText(b, prev);
  for (const el of root.querySelectorAll<HTMLButtonElement>(".card")) {
    el.classList.toggle("hot", el.dataset.uid === hoverUid);
  }
}

function goTitle(): void {
  stopWalk();
  clearFx();
  screen = "title";
  fallOpen = false;
  questSheet = null;
  cueMusic("title");
  render();
}

function beginRun(heart: HeartId): void {
  stopWalk();
  run = makeRun(heart, pendingHero);
  world = loadScene(HERO_START[pendingHero], run);
  seeAround();
  if (HERO_START[pendingHero] === "hut" && !run.flags.includes("lessonWalk")) {
    world.said = "屋里潮。南墙有门。门外土响。";
    world.thought = "WASD 挪步，点已见处可走。贴着人按空格，才开得了口。";
    world.message = world.said;
  } else if (HERO_START[pendingHero] === "customs") {
    world.said = "册案横在当中。案下有手在动。";
    world.thought = "WASD 挪步。贴着人空格交谈。点强敌开战。";
    world.message = world.said;
  } else if (HERO_START[pendingHero] === "ropes") {
    world.said = "缆盘在地上。厂里那根桩不认生人。";
    world.thought = "WASD 挪步。贴着人空格交谈。点强敌开战。";
    world.message = world.said;
  }
  cam = { x: 0, y: 0, scene: "" };
  screen = "map";
  cueMusic("map");
  cuePlace(world.scene);
  render();
}

function startFight(id: EnemyId = world.dueling ?? "catcher", spar = false): void {
  stopWalk();
  sparKeep = spar ? { hp: run.hp, companionHp: { ...run.companionHp } } : null;
  battle = makeBattle(id, run, false, spar);
  world.dueling = id;
  hoverUid = null;
  pileOpen = null;
  if (!run.flags.includes("lessonFight")) run = addFlag(run, "lessonFight");
  screen = "combat";
  cueMusic("combat");
  render();
  if (battle.log.some((line) => line.includes("手先到"))) playSfx("foe");
}

function persist(): void {
  writeSave(save);
}

function stashFight(): void {
  const hp = { ...run.companionHp, [battle.active]: battle.player.hp };
  for (const m of battle.bench) hp[m.id] = m.hp;
  run = { ...run, hp: battle.player.hp, active: battle.active, companionHp: hp };
}

function finishSpar(won: boolean): void {
  const id = battle.enemyId;
  if (sparKeep) {
    run = { ...run, hp: sparKeep.hp, companionHp: { ...sparKeep.companionHp } };
    sparKeep = null;
  }
  world.hp = run.hp;
  world.dueling = null;
  const flag = SPAR_FLAG[id];
  if (flag) run = addFlag(run, flag);
  const lesson = tutorLesson(id, won);
  world.speaker = id;
  world.said = lesson.said;
  world.thought = lesson.thought;
  world.reply = lesson.reply ?? "";
  world.message = lesson.said;
  screen = "map";
  cueMusic("map");
  render();
}

function finishWin(): void {
  stashFight();
  const heal = winHeal(run.heart);
  const firstKnife = battle.enemyId === HERO_BOSSES[run.hero ?? "rail"][0];
  const teachTalk = !run.flags.includes("lessonTalk");
  world = afterDuel(world, true, battle.player.hp, heal);
  run = syncActiveHp(run, world.hp);
  run = noteBeaten(run, battle.enemyId);
  if (firstKnife) run = addFlag(run, "mainOpen");
  if (teachTalk) {
    run = addFlag(run, "lessonTalk");
    world.thought = `${world.thought} 港上的人不会一次把话倒完。贴上去，空格开口，再选你要问的。`;
  }
  save = markSeen(save, battle.enemyId);
  persist();
  screen = "map";
  cueMusic("map");
  render();
}

function finishLoss(): void {
  run = { ...run, falls: run.falls + 1 };
  const note = noteFall(run.falls);
  if (note.over) {
    ended = "lost";
    fallSaid = note.said;
    fallThought = note.thought;
    screen = "end";
    render();
    return;
  }
  const hp = reviveHp(battle.player.maxHp);
  battle.player.hp = hp;
  stashFight();
  world = afterDuel(world, false, hp, 0, note);
  run = syncActiveHp(run, world.hp);
  fallOpen = true;
  fallSaid = note.said;
  fallThought = note.thought;
  screen = "map";
  cueMusic("map");
  render();
}

function finishChest(): void {
  world = openCache(world);
  run = takeChest(run, world.scene);
  screen = "map";
  render();
}

function offerRewards(list: Reward[], from: "duel" | "chest"): void {
  if (!list.length) {
    if (from === "duel") finishWin();
    else finishChest();
    return;
  }
  clearFx();
  rewards = list;
  rewardFrom = from;
  screen = "reward";
  render();
}

function pickReward(index: number | null): void {
  if (index !== null && rewards[index]) run = applyReward(run, rewards[index]);
  if (rewardFrom === "duel") finishWin();
  else finishChest();
}

function endPlayerTurn(): void {
  const kind = battle.intent.kind;
  afterPlay(endTurn(battle));
  if (screen === "combat") playIntentFx(kind);
}

function fireCard(uid: string, origin?: DOMRect): void {
  const inst = battle.hand.find((c) => c.uid === uid);
  if (!inst) return;
  const rect =
    origin ??
    root.querySelector<HTMLElement>(`.card[data-uid="${uid}"]`)?.getBoundingClientRect();
  if (rect) playCardFx(inst.defId, rect);
  afterPlay(playCard(battle, uid));
}

function afterPlay(next: Battle): void {
  battle = next;
  hoverUid = null;
  if (next.phase === "won") {
    if (next.spar || isSparEnemy(next.enemyId)) finishSpar(true);
    else offerRewards(rollRewards(run, save, { type: "duel", enemyId: next.enemyId }), "duel");
    return;
  }
  if (next.phase === "lost") {
    if (next.spar || isSparEnemy(next.enemyId)) finishSpar(false);
    else finishLoss();
    return;
  }
  render();
}

function travelTo(to: SceneId, at: string): void {
  stopWalk();
  const fresh = !run.visited.includes(to);
  run = rememberSeals(run, world.scene, world.progress);
  run = noteScene({ ...run, scene: to, chapter: SCENES[to].chapter }, to);
  if (to === "lane") {
    save = markCleared(save, "dock");
    persist();
    const before = run.party.length;
    run = grantChapterTwo(run);
    if (run.party.length > before) {
      const joined = run.party[run.party.length - 1];
      world = loadScene(to, run, at);
      seeAround();
      world.message = `${MATES[joined].name}跟上了。${WEAPON_NAME[MATES[joined].weapon]}还在手里。`;
      world.said = world.message;
      world.thought = "";
      world.reply = "";
      screen = "map";
      cueMusic("map");
      if (fresh) cuePlace(to);
      render();
      return;
    }
  }
  if (to === "outer") {
    save = markCleared(save, "alley");
    persist();
  }
  world = loadScene(to, run, at);
  seeAround();
  screen = "map";
  cueMusic("map");
  if (fresh) cuePlace(to);
  render();
}

function endRunWin(): void {
  save = markCleared(save, "court");
  persist();
  ended = "won";
  screen = "end";
  render();
}

function bind(): void {
  for (const el of root.querySelectorAll<HTMLElement>(".hero.open[data-hero]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.hero as HeroId;
      if (!id || pendingHero === id) return;
      pendingHero = id;
      render();
    });
  }
  root.querySelector("#btn-start")?.addEventListener("click", () => {
    if (screen === "end") goTitle();
    else {
      screen = "heart";
      render();
    }
  });
  root.querySelector("#btn-title")?.addEventListener("click", goTitle);
  root.querySelector("#btn-end")?.addEventListener("click", () => {
    endPlayerTurn();
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-pile]")) {
    el.addEventListener("click", () => {
      const which = el.dataset.pile;
      if (which !== "draw" && which !== "discard") return;
      pileOpen = pileOpen === which ? null : which;
      render();
    });
  }
  root.querySelector("#pile-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "pile-mask") {
      pileOpen = null;
      render();
    }
  });
  for (const el of root.querySelectorAll("[data-close=sheet]")) {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      pileOpen = null;
      packOpen = false;
      partyOpen = false;
      questSheet = null;
      atlasOpen = false;
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-ear]")) {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = el.dataset.ear as "sfx" | "music";
      if (key !== "sfx" && key !== "music") return;
      const cur = getEar();
      setEar({ [key]: !cur[key] });
      render();
    });
  }
  root.querySelector("#btn-skip")?.addEventListener("click", () => pickReward(null));
  root.querySelector("#btn-atlas")?.addEventListener("click", (e) => {
    e.preventDefault();
    atlasOpen = !atlasOpen;
    packOpen = false;
    partyOpen = false;
    questSheet = null;
    render();
  });
  root.querySelector("#atlas-mask")?.addEventListener("click", () => {
    atlasOpen = false;
    render();
  });
  root.querySelector("#btn-pack")?.addEventListener("click", () => {
    packOpen = !packOpen;
    atlasOpen = false;
    partyOpen = false;
    questSheet = null;
    render();
  });
  root.querySelector("#pack-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "pack-mask") {
      packOpen = false;
      render();
    }
  });
  root.querySelector("#btn-party")?.addEventListener("click", () => {
    partyOpen = !partyOpen;
    atlasOpen = false;
    packOpen = false;
    questSheet = null;
    render();
  });
  root.querySelector("#party-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "party-mask") {
      partyOpen = false;
      render();
    }
  });
  root.querySelector("#btn-quest")?.addEventListener("click", () => {
    questSheet = questSheet === "main" ? null : "main";
    atlasOpen = false;
    packOpen = false;
    partyOpen = false;
    render();
  });
  root.querySelector("#btn-side")?.addEventListener("click", () => {
    questSheet = questSheet === "side" ? null : "side";
    atlasOpen = false;
    packOpen = false;
    partyOpen = false;
    render();
  });
  root.querySelector("#quest-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "quest-mask") {
      questSheet = null;
      render();
    }
  });
  root.querySelector("#talk-words")?.addEventListener("click", (e) => {
    const more = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-more]");
    if (more || ((e.target as HTMLElement).closest(".fy-lines") && talkHasMore())) {
      e.preventDefault();
      e.stopPropagation();
      advanceTalkPage();
      return;
    }
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-pick]");
    const pick = btn?.dataset.pick;
    if (!pick) return;
    e.preventDefault();
    e.stopPropagation();
    applyMapInteract(pick);
  });
  root.querySelector("#btn-rise")?.addEventListener("click", () => {
    fallOpen = false;
    render();
  });
  root.querySelector("#fall-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "fall-mask") {
      fallOpen = false;
      render();
    }
  });
  root.querySelector("#map")?.addEventListener("click", (e) => {
    if (atlasOpen || packOpen || partyOpen || questSheet || fallOpen) return;
    if ((e.target as HTMLElement).closest("[data-foe]")) return;
    const tile = (e.target as HTMLElement).closest<HTMLElement>(".tile");
    if (!tile) return;
    const x = Number(tile.dataset.x);
    const y = Number(tile.dataset.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (!isSeen(run.seenTiles, world.scene, x, y)) return;
    const talker = world.talkers.find((t) => t.x === x && t.y === y);
    const dirs = findPath(world, run, x, y, (px, py) => isSeen(run.seenTiles, world.scene, px, py));
    walkPath(dirs, talker ? { x, y } : null);
  });
  root.querySelector("#actors")?.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-foe]");
    const id = el?.dataset.foe as EnemyId | undefined;
    if (!id || !ENEMIES[id]) return;
    startFight(id);
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-mate]")) {
    el.addEventListener("click", () => {
      afterPlay(swapFighter(battle, el.dataset.mate as CompanionId));
    });
  }

  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-heart]")) {
    el.addEventListener("click", () => beginRun(el.dataset.heart as HeartId));
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>(".reward[data-i]")) {
    el.addEventListener("click", () => pickReward(Number(el.dataset.i)));
  }

  const hand = root.querySelector("#hand");
  hand?.addEventListener("mouseover", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".card");
    if (!btn?.dataset.uid) return;
    hoverUid = btn.dataset.uid;
    paintHover();
  });
  hand?.addEventListener("mouseout", (e) => {
    const next = (e as MouseEvent).relatedTarget as HTMLElement | null;
    if (next && hand.contains(next)) return;
    hoverUid = null;
    paintHover();
  });
  hand?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".card");
    const uid = btn?.dataset.uid;
    if (!uid || btn?.disabled) return;
    fireCard(uid, btn.getBoundingClientRect());
  });
}

window.addEventListener("keydown", (e) => {
  const key = e.key;

  if (screen === "reward") {
    const n = Number(key);
    if (n >= 1 && n <= rewards.length) {
      e.preventDefault();
      pickReward(n - 1);
    }
    return;
  }

  if (screen === "map") {
    if (fallOpen) {
      if (key === "Escape" || key === " " || key === "Enter") {
        e.preventDefault();
        fallOpen = false;
        render();
      }
      return;
    }
    if (key === "Escape" && (atlasOpen || packOpen || partyOpen || questSheet)) {
      atlasOpen = false;
      packOpen = false;
      partyOpen = false;
      questSheet = null;
      fallOpen = false;
      render();
      return;
    }
    const pickN = Number(key);
    if (!talkHasMore() && pickN >= 1 && pickN <= (world.choices?.length ?? 0)) {
      e.preventDefault();
      stopWalk();
      applyMapInteract(world.choices[pickN - 1].id);
      return;
    }
    if (key === "m" || key === "M") {
      e.preventDefault();
      atlasOpen = !atlasOpen;
      packOpen = false;
      partyOpen = false;
      questSheet = null;
      render();
      return;
    }
    if (key === "b" || key === "B") {
      e.preventDefault();
      packOpen = !packOpen;
      atlasOpen = false;
      partyOpen = false;
      questSheet = null;
      render();
      return;
    }
    if (key === "p" || key === "P") {
      e.preventDefault();
      partyOpen = !partyOpen;
      atlasOpen = false;
      packOpen = false;
      questSheet = null;
      render();
      return;
    }
    if (key === "q" || key === "Q") {
      e.preventDefault();
      questSheet = questSheet === "main" ? null : "main";
      atlasOpen = false;
      packOpen = false;
      partyOpen = false;
      render();
      return;
    }
    const dir: Dir | null =
      key === "w" || key === "W" || key === "ArrowUp"
        ? "up"
        : key === "s" || key === "S" || key === "ArrowDown"
          ? "down"
          : key === "a" || key === "A" || key === "ArrowLeft"
            ? "left"
            : key === "d" || key === "D" || key === "ArrowRight"
              ? "right"
              : null;
    if (dir) {
      e.preventDefault();
      stopWalk();
      const now = performance.now();
      if (now - lastStep < KEY_STEP_MS) return;
      stepMap(dir);
      return;
    }
    if (key === " " || key === "Enter") {
      e.preventDefault();
      stopWalk();
      if (talkHasMore()) {
        advanceTalkPage();
        return;
      }
      applyMapInteract();
    }
    return;
  }

  if (screen !== "combat") return;
  if (pileOpen) {
    if (key === "Escape") {
      e.preventDefault();
      pileOpen = null;
      render();
    }
    return;
  }
  if (battle.phase !== "player") return;
  if (key === " ") {
    e.preventDefault();
    endPlayerTurn();
    return;
  }
  const n = Number(key);
  if (n >= 1 && n <= battle.hand.length) {
    const card = battle.hand[n - 1];
    fireCard(card.uid);
  }
});

window.addEventListener("resize", () => {
  if (screen === "map") paintMap();
});

render();
