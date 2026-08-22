import { CARDS, ENEMIES, ENEMY_WEAPON, HEARTS, HEROES, TECHNIQUES, WORLD, intentLabel, intentTip, isSparEnemy, winHeal } from "./game/content";
import { applyReward, rollRewards } from "./game/rewards";
import {
  CODEX,
  bingjiRows,
  hasCodex,
  shiluRows,
  upgradeCompareLine,
  STATUS_ENTRIES,
  type CodexBook,
} from "./game/codex";
import { addFlag, addItem, addTechnique, availableHearts, clearRun, hasStashedRun, loadSave, makeRun, markCleared, markSeen, noteBeaten, noteScene, rememberSeals, removeItem, stashRun, takeChest, writeSave } from "./game/run";
import {
  BAG_NAME,
  BAG_TIP,
  BATTLE_GOODS,
  TONGBAO_FORGE_COST,
  TONGBAO_PASS_COST,
  TONGBAO_REROLL_COST,
  TONGBAO_TECH_COST,
  addBag,
  bagCount,
  bringStashIntoRun,
  buyClinic,
  collectCraft,
  craftRemainSec,
  maybeTongbaoDrop,
  sellBag,
  spendTongbao,
  startCraft,
  stashAdd,
  takeBag,
  tongbaoOf,
  tongbaoRerollAffordable,
  useBattleGood,
  useSalveMap,
  type BagGoodsId,
  type CraftRecipeId,
} from "./game/bag";
import { endingLead, endingSummary } from "./game/midCases";
import { applyPillToMate, forgeNeed, softUpgradeBlockReason, softUpgradeTarget } from "./game/economy";
import { DIFFICULTY_META, getDifficulty, setSettings, type Difficulty } from "./game/settings";
import {
  canPlay,
  canSwap,
  dangerCells,
  endTurn,
  livingFoes,
  makeBattle,
  playCard,
  previewCard,
  statusChips,
  swapFighter,
} from "./game/sim";
import { BOARD_SIZE, type Battle, type CardInst, type CompanionId, type EnemyId, type HeartId, type HeroId, type Preview, type Reward, type Run, type TechniqueId } from "./game/types";
import { combatBg, hasStand, stand, titleBg } from "./art/portraits";
import {
  coinMark,
  constableInk,
  delayInk,
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
import { bagArtMarkup } from "./art/bagArt";
import { weaponArt, weaponArtMarkup, weaponDetail } from "./art/weaponArt";
import { clearFx, playCardFx, playIntentFx } from "./fx";
import { cueMusic, getEar, playSfx, setEar } from "./audio";
import { applyCamera, coverScale, type Cam } from "./map/camera";
import { canTravelTo } from "./map/access";
import { HERO_BOSSES, HERO_START } from "./game/hero";
import { questLog } from "./game/quest";
import { JOIN_FLAG, MATES, MATE_PASSIVE, PARTY_CAP, WEAPON_NAME, WEAPON_PACE, WEAPON_VERB, addCompanion, cardSchool, dismissCompanion, grantChapterTwo, healRun, isLead, mateJoinReady, noteFall, restHeal, reviveHp, schoolLabel, syncActiveHp, wielderOf } from "./game/party";
import {
  acceptBounty,
  applyFallFlags,
  checkBountyOnWin,
  maybeArmBounty,
  maybeUnlockFork,
  placeTeaBet,
  resolveTeaBet,
  scarFlagFor,
  TEMPER_SCENES,
  temperCost,
} from "./game/hooks";
import { gearById, nextGrade, starterGear } from "./game/weapons";
import { MARTIAL_LESSONS, lessonByPick, martialOffers } from "./game/lessons";
import { ATLAS_H, ATLAS_W, ATLAS_ZOOM_H, ATLAS_ZOOM_W, paintAtlas } from "./map/atlas";
import {
  doorKind,
  doorSrc,
  isOutdoor,
  isSeen,
  markVision,
  objSrc,
  plantStamp,
  spriteSrc,
  stampSrc,
  texMarkup,
  tileArt,
  treeStampAt,
  courtyardTreeStamp,
  archSrc,
  wallSeamEdge,
  cellUsesBrick,
} from "./map/tileset";
import { SCENES, SPAR_FLAG, TALKER_NAME, itemName, tutorLesson } from "./map/scenes";
import type { ItemId, PropKind, SceneId, Tile } from "./map/types";
import type { Dir, World } from "./map/types";
import {
  afterDuel,
  findPath,
  gateOpen,
  interact,
  loadScene,
  openCache,
  sealsComplete,
  takeGround,
  tryMove,
} from "./map/world";

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
let endSaid = "";
let pendingHero: HeroId = "rail";
let cam: Cam = { x: 0, y: 0, scene: "" };
let atlasOpen = false;
let packOpen = false;
let pillPick: BagGoodsId | null = null;
let partyOpen = false;
let questSheet: "main" | "side" | null = null;
let settingsOpen = false;
let codexOpen: CodexBook | null = null;
let saveToast = "";
let saveToastTimer = 0;
let fallOpen = false;
let fallSaid = "";
let fallThought = "";
let pileOpen: "draw" | "discard" | null = null;
let weaponOpen: string | null = null;
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
  const outdoor = isOutdoor(world.scene);
  const block = (x: number, y: number) =>
    world.tiles[y]?.[x] === "wall" ||
    world.tiles[y]?.[x] === "rock" ||
    world.tiles[y]?.[x] === "hill";
  let seen = markVision(
    run.seenTiles,
    world.scene,
    world.player.x,
    world.player.y,
    world.facing,
    world.w,
    world.h,
    block,
    outdoor,
  );
  // 贴墙瞥见墙内一格：室外认厢房，室内从门口能看见桌椅，但不整间点亮
  const have = new Set(seen[world.scene] ?? []);
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const;
  for (const [dx, dy] of dirs) {
    const wx = world.player.x + dx;
    const wy = world.player.y + dy;
    if (world.tiles[wy]?.[wx] !== "wall") continue;
    const ix = wx + dx;
    const iy = wy + dy;
    if (iy < 0 || ix < 0 || iy >= world.h || ix >= world.w) continue;
    const t = world.tiles[iy][ix];
    if (t === "wall" || t === "water" || t === "rock") continue;
    have.add(`${ix},${iy}`);
    have.add(`${wx},${wy}`);
  }
  seen = { ...seen, [world.scene]: [...have] };
  run = { ...run, seenTiles: seen };
}

function stopWalk(): void {
  walkGen += 1;
  if (walkTimer) {
    window.clearTimeout(walkTimer);
    walkTimer = 0;
  }
}

/** Screen click → map tile (camera translate/scale via getBoundingClientRect). */
function tileFromClick(e: MouseEvent): { x: number; y: number } | null {
  const map = root.querySelector<HTMLElement>("#map");
  if (!map || screen !== "map") return null;
  const rect = map.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return null;
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * world.w);
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * world.h);
  if (x < 0 || y < 0 || x >= world.w || y >= world.h) return null;
  return { x, y };
}

/** Destination must be seen; path may cross fog so cone vision does not dead-end clicks. */
function clickWalkTo(x: number, y: number): void {
  if (!isSeen(run.seenTiles, world.scene, x, y)) return;
  const talker = world.talkers.find((t) => t.x === x && t.y === y);
  const dirs = findPath(world, run, x, y, () => true);
  walkPath(dirs, talker ? { x, y } : null);
}

function applyMapInteract(pick?: string): void {
  const r = interact(world, run, pick);
  world = r.world;
  for (const flag of r.flags ?? []) {
    if (flag.startsWith("yamenPay")) {
      const n = Number(flag.replace("yamenPay", ""));
      if (Number.isFinite(n)) run = { ...run, silver: Math.max(0, (run.silver ?? 0) + n) };
      continue;
    }
    if (flag === "buyRoadPass" || flag === "buyRoadPass8") {
      const cost = flag === "buyRoadPass8" ? 8 : 5;
      if ((run.silver ?? 0) < cost) {
        world.said = `银不够 ${cost} 两。文牒不赊。`;
        world.thought = "关卡认银，也认帖。";
        world.message = world.said;
        paintMap();
        return;
      }
      run = addItem({ ...run, silver: (run.silver ?? 0) - cost }, "roadPass");
      run = addFlag(run, "roadPass");
      world.said = `通关文牒入手。花了 ${cost} 两。`;
      world.message = world.said;
      continue;
    }
    if (flag.startsWith("teaBetAsk-")) {
      const parts = flag.replace("teaBetAsk-", "").split("-");
      const stake = Number(parts[0]);
      const maxTurn = Number(parts[1]);
      const placed = placeTeaBet(run, stake, maxTurn);
      if (!placed.ok) {
        world.said = placed.reason;
        world.thought = "棚婆不赊注。";
        world.message = world.said;
        paintMap();
        return;
      }
      run = placed.run;
      world.said = `「${stake} 两压下了。下一场真刀，${maxTurn} 息内了结。」`;
      world.thought = "注在碗底。";
      world.message = world.said;
      continue;
    }
    if (flag.startsWith("bountyAccept-")) {
      const kind = flag.replace("bountyAccept-", "") as "silver" | "card" | "weapon";
      run = acceptBounty(run, kind);
      const who = run.flags.find((f) => f.startsWith("bountyTarget-"))?.replace("bountyTarget-", "") ?? "人";
      world.said = `「帖给你。标的是 ${who}。三场名额内倒掉。」`;
      world.thought = "差事板认刀。";
      world.message = world.said;
      continue;
    }
    if (flag === "temperAsk") {
      const up = softUpgradeTarget(run.weapon);
      if (!up) {
        world.said = softUpgradeBlockReason(run.weapon);
        world.thought = "武馆认砂，精以上认炉材。";
        world.message = world.said;
        paintMap();
        return;
      }
      const g = gearById(run.weapon);
      const cost = temperCost(g?.grade ?? 1);
      if ((run.silver ?? 0) < cost) {
        world.said = `“银不够 ${cost} 两。淬火不赊。”`;
        world.thought = "武馆认银。";
        world.message = world.said;
        paintMap();
        return;
      }
      run = {
        ...run,
        silver: (run.silver ?? 0) - cost,
        weapon: up,
        weapons: run.weapons.includes(up) ? run.weapons : [...run.weapons, up],
      };
      world.said = `“淬完了。成色涨到「${gearById(up)?.name ?? up}」。花了 ${cost} 两。”`;
      world.thought = "砂认汗，也认银。精以上另走锻材。";
      world.message = world.said;
      continue;
    }
    if (flag === "pzForgeDone") {
      run = addBag(run, "forgeJing", 1);
      run = addFlag(run, flag);
      world.thought = `${world.thought || ""} 袖里多一束精材。`.trim();
      continue;
    }
    run = addFlag(run, flag);
    const mate = JOIN_FLAG[flag];
    if (mate) {
      if (!mateJoinReady(run, mate)) {
        world.said = `${MATES[mate].name}点了点头，却不跟。这条路上，还没到他出场的时候。`;
        world.thought = "同路有先后。急不得。";
        world.message = world.said;
      } else {
        const before = run.party.length;
        run = addCompanion(run, mate);
        if (!run.party.includes(mate)) {
          world.said = `同路已满七人。要带上${MATES[mate].name}，先在「同行」里遣散一人。`;
          world.thought = "人多不是福。是选择。";
          world.message = world.said;
        } else if (run.party.length > before) {
          world.message = `${MATES[mate].name}跟上了。同路 ${run.party.length}/7。`;
        }
      }
    }
    if (flag === "escortJob") {
      run = addItem(run, "cargo");
    }
    if (flag === "escortDone") {
      run = removeItem(run, "cargo");
    }
    if (flag === "escortPay") {
      const long = run.flags.includes("escortLong");
      run = long
        ? { ...run, silver: (run.silver ?? 0) + 15, yuanbao: (run.yuanbao ?? 0) + 1 }
        : { ...run, silver: (run.silver ?? 0) + 6 };
    }
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
    run = addItem(run, r.itemId as ItemId);
    world = takeGround(world, r.itemId as ItemId);
    paintMap();
  } else if (r.action === "brand") {
    run = addFlag(run, "branded");
    paintMap();
  }   else if (r.action === "rest" || r.action === "heal") {
    if (r.action === "heal") {
      if ((run.silver ?? 0) < 8) {
        world.said = "银不够八两。";
        world.thought = "医馆不赊账。";
        world.message = world.said;
        paintMap();
        return;
      }
      run = { ...run, silver: (run.silver ?? 0) - 8 };
      run = healRun(run, run.hpMax - run.hp);
    } else {
      run = healRun(run, restHeal(world.scene));
    }
    world.hp = run.hp;
    paintMap();
  } else if (r.action === "shop" && r.itemId) {
    const gear = gearById(r.itemId);
    if (!gear) {
      paintMap();
      return;
    }
    if ((run.silver ?? 0) < gear.price) {
      world.said = `银不够 ${gear.price} 两。`;
      world.message = world.said;
      paintMap();
      return;
    }
    run = {
      ...run,
      silver: (run.silver ?? 0) - gear.price,
      weapon: gear.id,
      weapons: [...new Set([...(run.weapons ?? []), gear.id])],
    };
    world.said = `「${gear.name}。拿好。」`;
    world.thought = gear.tip;
    world.message = world.said;
    paintMap();
  } else if (r.action === "learn" && r.itemId) {
    const lesson = lessonByPick(`learn:${r.itemId}`) ?? martialOffers([]).find((l) => l.id === r.itemId);
    const id = r.itemId as TechniqueId;
    const price = lesson?.price ?? MARTIAL_LESSONS.find((l) => l.id === id)?.price ?? 16;
    if (run.techniques.includes(id)) {
      paintMap();
      return;
    }
    if ((run.silver ?? 0) < price) {
      world.said = `银不够 ${price} 两。`;
      world.message = world.said;
      paintMap();
      return;
    }
    run = { ...run, silver: (run.silver ?? 0) - price };
    run = addTechnique(run, id);
    world.said = `「${TECHNIQUES[id].name}。砂上走两步。」`;
    world.thought = TECHNIQUES[id].text;
    world.message = world.said;
    paintMap();
  } else if (r.action === "sellBag" && r.itemId) {
    const sold = sellBag(run, r.itemId as BagGoodsId, 1);
    if (!sold.ok) {
      world.said = sold.reason;
      world.message = world.said;
      paintMap();
      return;
    }
    run = sold.run;
    world.said = `当了 ${BAG_NAME[r.itemId as BagGoodsId]}。得银 ${sold.silver} 两。`;
    world.thought = "当铺认货。";
    world.message = world.said;
    paintMap();
  } else if (r.action === "buyBag" && r.itemId) {
    const bought = buyClinic(run, r.itemId as BagGoodsId);
    if (!bought.ok) {
      world.said = bought.reason;
      world.message = world.said;
      paintMap();
      return;
    }
    run = bought.run;
    world.said = `入手 ${BAG_NAME[r.itemId as BagGoodsId]}。`;
    world.message = world.said;
    paintMap();
  } else if (r.action === "craft" && r.itemId) {
    const started = startCraft(run, r.itemId as CraftRecipeId);
    if (!started.ok) {
      world.said = started.reason;
      world.message = world.said;
      paintMap();
      return;
    }
    run = started.run;
    const sec = craftRemainSec(run);
    world.said = `炉上了。约 ${sec} 息后来取。`;
    world.thought = "炼器不能催。催了也坏。";
    world.message = world.said;
    paintMap();
  } else if (r.action === "collectCraft") {
    const got = collectCraft(run);
    run = got.run;
    world.said = got.gained ? `取到 ${got.gained}。` : craftRemainSec(run) > 0 ? `炉火未冷。还要 ${craftRemainSec(run)} 息。` : "炉上没有货。";
    world.message = world.said;
    paintMap();
  } else if (r.action === "tongbaoPass") {
    const paid = spendTongbao(save, TONGBAO_PASS_COST);
    if (!paid) {
      world.said = "通宝不够。这帖不认银两加急。";
      world.thought = "通宝稀少。";
      world.message = world.said;
      paintMap();
      return;
    }
    save = paid;
    run = addItem(run, "roadPass");
    run = addFlag(run, "roadPass");
    world.said = "通宝一枚入袖。文牒提前盖下。";
    world.thought = "驿路三程先开。";
    world.message = world.said;
    persist();
    paintMap();
  } else if (r.action === "tongbaoForge") {
    if (bagCount(run, "copper") < 1) {
      world.said = "缺赤铜屑。锻不动。";
      world.message = world.said;
      paintMap();
      return;
    }
    const up = softUpgradeTarget(run.weapon);
    if (!up) {
      world.said = softUpgradeBlockReason(run.weapon);
      world.message = world.said;
      paintMap();
      return;
    }
    const paid = spendTongbao(save, TONGBAO_FORGE_COST);
    if (!paid) {
      world.said = "通宝不够。银两淬不到这一成。";
      world.message = world.said;
      paintMap();
      return;
    }
    const taken = takeBag(run, "copper", 1);
    if (!taken) {
      paintMap();
      return;
    }
    save = paid;
    run = {
      ...taken,
      weapon: up,
      weapons: taken.weapons.includes(up) ? taken.weapons : [...taken.weapons, up],
    };
    world.said = `通宝锻刃。入手 ${gearById(up)?.name ?? "新刃"}。`;
    world.thought = "刃上多一成劲。精以上另吃锻材。";
    world.message = world.said;
    persist();
    paintMap();
  } else if (r.action === "matForge") {
    const cur = gearById(run.weapon);
    const targetGrade = (cur?.grade ?? 1) + 1;
    if (targetGrade < 3) {
      world.said = "凡良成色走通宝炉。精以上才吃锻材。";
      world.message = world.said;
      paintMap();
      return;
    }
    if (targetGrade > 5) {
      world.said = "成色到顶了。";
      world.message = world.said;
      paintMap();
      return;
    }
    const need = forgeNeed(targetGrade);
    if (!need) {
      world.said = "这炉吃不下。";
      world.message = world.said;
      paintMap();
      return;
    }
    for (const [k, n] of Object.entries(need) as [BagGoodsId, number][]) {
      if (bagCount(run, k) < n) {
        world.said = `缺 ${BAG_NAME[k]} ×${n}。锻不动。`;
        world.message = world.said;
        paintMap();
        return;
      }
    }
    let next = run;
    for (const [k, n] of Object.entries(need) as [BagGoodsId, number][]) {
      const taken = takeBag(next, k, n);
      if (!taken) {
        world.said = `缺 ${BAG_NAME[k]}。`;
        world.message = world.said;
        paintMap();
        return;
      }
      next = taken;
    }
    const up = nextGrade(next.weapon);
    if (!up) {
      world.said = "成色到顶了。";
      world.message = world.said;
      paintMap();
      return;
    }
    run = {
      ...next,
      weapon: up,
      weapons: next.weapons.includes(up) ? next.weapons : [...next.weapons, up],
    };
    world.said = `锻材入炉。入手 ${gearById(up)?.name ?? "新刃"}。`;
    world.thought = "精玄神认材，不认空话。";
    world.message = world.said;
    persist();
    paintMap();
  } else if (r.action === "tongbaoTech") {
    const paid = spendTongbao(save, TONGBAO_TECH_COST);
    if (!paid) {
      world.said = `通宝不够 ${TONGBAO_TECH_COST} 枚。残页不换。`;
      world.message = world.said;
      paintMap();
      return;
    }
    const pickTech = (["nightStep", "leftover", "rebound"] as TechniqueId[]).find((t) => !run.techniques.includes(t));
    if (!pickTech) {
      world.said = "能换的残页你都有了。";
      world.message = world.said;
      paintMap();
      return;
    }
    save = paid;
    run = addTechnique(run, pickTech);
    world.said = `通宝换残页。入手「${TECHNIQUES[pickTech].name}」。`;
    world.thought = TECHNIQUES[pickTech].text;
    world.message = world.said;
    persist();
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

function stepMap(dir: Dir, opts?: { suppressPortal?: boolean }): boolean {
  const nx = world.player.x + (dir === "left" ? -1 : dir === "right" ? 1 : 0);
  const ny = world.player.y + (dir === "up" ? -1 : dir === "down" ? 1 : 0);
  if (world.talkers.some((t) => t.x === nx && t.y === ny)) {
    world = { ...world, facing: dir };
    if (!run.flags.includes("lessonTalk")) run = addFlag(run, "lessonTalk");
    applyMapInteract();
    return false;
  }
  if (world.npcs.some((n) => !n.beaten && n.x === nx && n.y === ny)) {
    world = { ...world, facing: dir };
    applyMapInteract();
    return false;
  }
  const moved = tryMove(world, dir, run, opts);
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
    // Cross portal tiles mid-path without traveling; only the last step may enter a door.
    if (!stepMap(dir, { suppressPortal: rest.length > 0 })) return;
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
    butcher: "肉案",
    monk: "湖亭",
    bailiff: "衙门",
    barkeep: "酒楼",
    hostess: "花舫",
    doctor: "医馆",
    coach: "武馆",
    inn: "客栈",
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

function propArt(kind: PropKind, x = 0, y = 0, scene?: SceneId, tiles?: Tile[][]): string {
  if (kind === "tree") {
    const brick = scene && tiles ? cellUsesBrick(scene, tiles, x, y) : false;
    const stamp = brick ? courtyardTreeStamp(x, y) : treeStampAt(x, y);
    const grow = stamp === "bush" ? " bush" : stamp === "tree-pot" ? " tree-pot" : stamp.startsWith("tree-") ? ` ${stamp}` : "";
    return `<img class="sprite obj${grow}" src="${stampSrc(stamp)}" alt="" draggable="false">`;
  }
  if (kind === "arch" && tiles) {
    return `<img class="sprite obj" src="${archSrc(tiles, x, y)}" alt="" draggable="false">`;
  }
  return `<img class="sprite obj" src="${objSrc(kind)}" alt="" draggable="false">`;
}

function itemSprite(id: ItemId): string {
  if (id === "token") return "/art/objs/obj-token.png";
  if (id === "brand") return "/art/objs/obj-seal.png";
  if (id === "badge") return "/art/objs/obj-seal-lit.png";
  if (id === "flask") return "/art/objs/obj-wine.png";
  if (id === "cake") return "/art/objs/obj-jar.png";
  if (id === "cargo") return "/art/objs/obj-chest.png";
  if (id === "roadPass") return "/art/objs/obj-pile.png";
  if (id === "deed" || id === "scrap" || id === "slip") return "/art/objs/obj-slip.png";
  if (id === "incense") return "/art/objs/obj-shrine.png";
  return "/art/objs/obj-jar.png";
}

function actorTag(name: string): string {
  if (!name) return "";
  return `<span class="tag">${name}</span>`;
}

function placeName(id: SceneId): string {
  return SCENES[id].name;
}

/** 悬空院名：只挂有名号的院落（衙门/税卡），入口地名仍在门上（西仓等）。 */
export function courtyardAreaLabels(w: World): { x: number; y: number; name: string }[] {
  const out: { x: number; y: number; name: string }[] = [];
  const seen = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  const inside = (x: number, y: number) => {
    const t = w.tiles[y]?.[x];
    return t === "floor" || t === "pack" || t === "road" || t === "gate";
  };
  for (const seed of w.props) {
    if (seed.kind !== "arch" || !seed.tag || seed.tag === "门") continue;
    if (seen.has(seed.tag)) continue;
    const q: [number, number][] = [[seed.x, seed.y]];
    const vis = new Set<string>([key(seed.x, seed.y)]);
    let sx = 0;
    let sy = 0;
    let n = 0;
    let guard = 0;
    while (q.length && guard++ < 400) {
      const [x, y] = q.shift()!;
      if (!inside(x, y)) continue;
      sx += x;
      sy += y;
      n++;
      for (const [dx, dy] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        const k = key(nx, ny);
        if (vis.has(k)) continue;
        if (!inside(nx, ny)) continue;
        if (Math.abs(nx - seed.x) + Math.abs(ny - seed.y) > 10) continue;
        vis.add(k);
        q.push([nx, ny]);
      }
    }
    if (n < 4) {
      out.push({ x: seed.x, y: seed.y - 0.6, name: seed.tag });
    } else {
      out.push({ x: sx / n, y: sy / n - 0.2, name: seed.tag });
    }
    seen.add(seed.tag);
  }
  return out;
}

export function lockedDoorName(w: World, x: number, y: number): string {
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
  if (b.energy === 0) return "劲尽了。收势，看他下一招——顶栏「撤走」可退，敌仍在原处。";
  const intent = b.intent;
  const teach = !run.flags.includes("lessonFightDone");
  if (teach && b.turn === 1 && !prev) {
    return "七步石台：红格是他要落的步。先看意图，再出牌。卸力挡打，推拉开距，收势过回合。";
  }
  if (teach && b.turn === 2 && !prev) {
    return "连势叠在连续出掌上；气脉加全场攻击。劲不够就收势回劲——别空手硬挨。";
  }
  const early =
    b.enemyId === "intruder" ||
    b.enemyId === "inkhand" ||
    b.enemyId === "stakeboss" ||
    teach;
  if (early && b.turn <= 3 && !prev) {
    if (intent.kind === "strike") return "红格是他要打的步。先卸力，或进步躲开，再出掌。";
    if (intent.kind === "charge") return "他要冲过来。让开红格，或用推宫撞他。";
    if (intent.kind === "lunge") return "他要抢步。贴上去打，或先卸一掌。";
    if (intent.kind === "windup") return "他在蓄势——特色招。这一息能卸，也能抢打打断。";
    if (intent.kind === "shatter") return "他要裂架——特色招。格挡会被削，先拉开或抢先打。";
    if (intent.kind === "stake" || intent.kind === "pull") return "桩/缆控场。别站着挨拉，先挪步或贴上去。";
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
  if (intent.kind === "bleedcut") return "刀口带创。卸不干净，血会留下。";
  if (intent.kind === "counter") return "他袖里有东西。这一息他不打，等你送手。";
  if (intent.kind === "mend") return "他在收创。这一息能打断。";
  if (intent.kind === "seal") return "他要点脉。挨上这一指，劲会少。";
  if (intent.kind === "shatter") return "他要裂你的架。格挡会被削掉一截。";
  if (intent.kind === "swap") return "他要换位。贴上去，或让开。";
  if (intent.kind === "strike") return "他要打。卸力，或进步躲开。";
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
  const pct = Math.max(0, Math.round((current / Math.max(1, max)) * 100));
  return `<div class="bar hp ${extra}"><i style="width:${pct}%"></i><span class="bar-read">${current}/${max}</span></div>`;
}

function qiBar(current: number, max: number, regen?: number): string {
  const pct = Math.max(0, Math.round((current / Math.max(1, max)) * 100));
  const extra = regen != null ? ` · 回${regen}` : "";
  return `<div class="bar qi"><i style="width:${pct}%"></i><span class="bar-read">${current}/${max}${extra}</span></div>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function renderStatusCol(b: Battle, side: "you" | "foe"): string {
  const chips = statusChips(b, side);
  if (!chips.length) {
    return `<div class="status-col ${side}-status empty" aria-hidden="true"></div>`;
  }
  const rows = chips
    .map(
      (c) =>
        `<div class="status-chip" data-tip="${escapeAttr(c.tip)}"><b>${c.name}</b><em>${c.value}</em><span class="status-tip">${escapeAttr(c.tip)}</span></div>`,
    )
    .join("");
  return `<div class="status-col ${side}-status">${rows}</div>`;
}

function foeArt(id: EnemyId, kind = "board"): string {
  if (hasStand(id)) return stand(id, kind);
  if (id === "escort") return saberInk();
  if (id === "piler") return stakeInk();
  if (id === "hauler") return ropeInk();
  if (id === "alley") return knifeInk();
  if (id === "trapper") return stakeInk();
  if (id === "delay") return delayInk();
  if (id === "twin") return twinInk();
  if (id === "lord") return lordInk();
  if (id === "usurper") return lordInk();
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
          data-uid="${c.uid}" style="--i:${idx}" ${gate.ok ? "" : "disabled"}
          title="${gate.ok ? "" : escapeAttr(gate.reason ?? "现在不能打出")}">
          <span class="cost">${def.cost}</span>
          <div class="art">${cardArt(def.id)}</div>
          <div class="banner">${typeLabel(def.type)} · ${schoolLabel(def.id)}</div>
          <h3>${def.name}</h3>
          <p class="text">${def.text}</p>
          <p class="flavor">${gate.ok ? def.flavor : gate.reason ?? def.flavor}</p>
          <span class="hotkey">${idx + 1}</span>
        </button>`;
    })
    .join("");
}

function foeWeaponId(id: EnemyId): string {
  const school = ENEMY_WEAPON[id];
  const hard = id === "lord" || id === "usurper" || id === "bandit" || id === "nametaker" || id === "stakeboss" || id === "knotboss" || id === "glasspin";
  return hard ? `${school}-6` : `${school}-3`;
}

function stanceLine(b: Battle): string {
  const live = livingFoes(b);
  const foe = live[0] ?? b.enemy;
  const block = ` / 格挡 ${b.playerBlock}`;
  const foeBlock = b.enemyBlock > 0 ? ` / 架势 ${b.enemyBlock}` : "";
  return `你 ${b.player.hp} 血${block}　·　${foe.name} ${foe.hp} 血${foeBlock}　·　第 ${foe.pos + 1} 步`;
}

function renderPreview(prev: Preview | null): string {
  if (!prev) return `<div class="preview idle">${stanceLine(battle)}</div>`;
  if (!prev.legal) {
    return `<div class="preview bad">${prev.reason ?? "现在不能打出"}　·　${stanceLine(battle)}</div>`;
  }
  const foeBlock = prev.enemyBlock > 0 ? ` / 架势 ${prev.enemyBlock}` : "";
  const bits = [
    ...prev.notes,
    `你 ${prev.playerHp} 血 / 格挡 ${prev.playerBlock}`,
    prev.enemyDies
      ? `${battle.enemy.name}倒下`
      : `${battle.enemy.name} ${prev.enemyHp} 血${foeBlock} · 第 ${prev.enemyPos + 1} 步`,
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
  "pit",
  "palace",
  "lane",
  "tea",
  "drums",
  "outer",
  "glass",
  "inner",
  "shrine",
  "lamp",
  "ferry",
  "isle",
  "huainan",
  "yangzhou",
  "jiankang",
  "suzhou",
  "linan",
  "changan",
  "luoyang",
  "bianjing",
  "usurpCamp",
  "jiaxing",
  "wuxi",
  "changzhou",
  "chuzhou",
  "suqian",
  "suzhousu",
  "bozhou",
  "yanshi",
  "shanzhou",
  "tongguan",
  "gaoyou",
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
    side = `<div class="fy-picks solo"><button type="button" class="fy-pick" data-more="1">……</button></div>`;
  } else if (picks.length) {
    const many = picks.length > 2 ? " many" : "";
    side = `<div class="fy-picks${many}">${picks
      .map((c) => `<button type="button" class="fy-pick" data-pick="${escapeTalk(c.id)}">${markClues(c.label)}</button>`)
      .join("")}</div>`;
  } else {
    // 对话已完：不再常驻「……」空按钮
    side = "";
  }
  return `<div class="fy-panel"><div class="fy-body"><b class="fy-name" id="talk-name">${who}</b><div class="fy-lines">${lines.join("")}</div></div>${side}</div>`;
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
          ${hasStashedRun(save) ? `<button type="button" class="ghost" id="btn-continue">续关</button>` : ""}
          <button type="button" class="ghost" id="btn-settings-title">设置</button>
          ${earButtons()}
        </div>
        <p class="hint">WASD 移动　点已见处可走　空格 交谈/确认　贴脸开战　M 路径　B 行囊　P 同行　Q 功过</p>
        <p class="hint dim">进度写入本机浏览器。刷新、关掉再开，同一浏览器可续关。</p>
      </div>
      ${settingsOpen ? `<div class="sheet-mask" id="settings-mask">${renderSettings()}</div>` : ""}
      ${saveToast ? `<div class="save-toast">${saveToast}</div>` : ""}
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
        <p class="lead dim">选一件护身的。也可以什么都不带。</p>
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

function renderBattleBag(b: Battle): string {
  if ((b.bagUsed ?? 0) >= 1) return `<div class="bag-fight muted">暗器已亮过</div>`;
  const bits = BATTLE_GOODS.filter((id) => bagCount(run, id) > 0)
    .map(
      (id) =>
        `<button type="button" class="bag-fight-btn bag-ico-${id}" data-fight-bag="${id}" title="${BAG_TIP[id]}">${bagArtMarkup(id, "bag-art-sm")}${BAG_NAME[id]}×${bagCount(run, id)}</button>`,
    )
    .join("");
  if (!bits) return "";
  return `<div class="bag-fight">${bits}<small>每场一次 · 伤轻</small></div>`;
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
  if (!draw) {
    const rows = [...b.journal]
      .reverse()
      .slice(0, 40)
      .map((j) => `<li class="j-${j.side}"><b>${j.side === "you" ? "我" : "敌"}</b><span>${j.text}</span></li>`)
      .join("");
    return `
    <div class="sheet-mask" id="pile-mask">
      <div class="sheet-panel pile-sheet ink-sheet">
        ${sheetClose()}
        <div class="kicker">战记</div>
        <h2>双方出招</h2>
        <p>黑字是你。红字是他。后手招式不亮，只记落地。</p>
        <ul class="pack-list journal-list">${rows || `<li>还白着。</li>`}</ul>
      </div>
    </div>`;
  }
  const cards = shuffleView(b.drawPile);
  const rows = cards
    .map((c) => {
      const def = CARDS[c.defId];
      return `<li><b>${def.name}</b><span>${def.text}</span></li>`;
    })
    .join("");
  return `
    <div class="sheet-mask" id="pile-mask">
      <div class="sheet-panel pile-sheet ink-sheet">
        ${sheetClose()}
        <div class="kicker">残谱</div>
        <h2>袖中</h2>
        <p>还压着。</p>
        <ul class="pack-list">${rows || `<li>空袖。</li>`}</ul>
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
  const gear = gearById(run.weapon);
  const intentHint =
    b.intents.length > 1
      ? `${intentLabel(b.intent)} · 后手隐 ${b.intents.length - 1}`
      : intentLabel(b.intent);
  const intentHover = intentTip(b.intent);
  const swaps = b.bench
    .map((m) => {
      const def = MATES[m.id];
      const gate = canSwap(b, m.id);
      const gift = MATE_PASSIVE[m.id];
      const giftBit = gift ? ` · ${gift.name}` : "";
      return `<button type="button" class="swap-btn" data-mate="${m.id}" ${gate.ok ? "" : "disabled"}>${def.name}<small>${WEAPON_NAME[def.weapon]} · 先机 ${WEAPON_PACE[def.weapon]} · ${m.hp}${giftBit}</small></button>`;
    })
    .join("");
  return `
    <section class="combat fy-combat ink-combat" style="background-image:url('${combatBg(world.scene)}')">
      <header class="fy-top">
        <div class="fy-place">
          <em>${ch.kicker}</em>
          <b>${ch.name}</b>
        </div>
        <h1 class="fy-ink">七步石台</h1>
        <div class="fy-stats">
          ${renderRelics(b.techniques)}
          <span class="silver-chip" title="银两">${coinMark()}<b>${run.silver ?? 0}</b></span>
          <button class="flee top-flee" id="btn-flee" ${b.phase === "player" ? "" : "disabled"} title="撤出战斗，敌仍在原处；不记倒地">撤走</button>
          ${renderCodexButtons()}
        </div>
      </header>

      <div class="arena">
        <aside class="fighter you-side">
          <div class="intent-slot" aria-hidden="true"></div>
          <div class="fy-stand-wrap you ink-frame">${mateArt(b.active, "side")}</div>
          <div class="nameplate ink-plate">
            <b>${mate.name}</b>
            <span>${mate.title} · ${WEAPON_NAME[mate.weapon]}${b.active !== b.hero && MATE_PASSIVE[b.active] ? ` · ${MATE_PASSIVE[b.active]!.name}` : ""}</span>
          </div>
          ${hpBar(b.player.hp, b.player.maxHp)}
          ${qiBar(b.energy, b.energyMax, b.energyRegen)}
          ${renderTechChips(b.techniques)}
          ${renderBattleBag(b)}
          ${swaps ? `<div class="swap-row">${swaps}</div>` : ""}
        </aside>

        <div class="stage-core">
          <div class="strip" id="strip">${renderBoard(b, prev)}</div>
          <div class="coach" id="coach">${coachText(b, prev)}</div>
        </div>

        <aside class="fighter foe-side">
          <div class="intent-slot">
            <div class="intent-wrap" title="">
              <div class="intent-big ink-intent" tabindex="0" aria-label="${escapeAttr(intentHint)}：${escapeAttr(intentHover)}">
                ${intentBlade()} ${intentHint}
              </div>
              <span class="intent-tip" role="tooltip">${escapeAttr(intentHover)}</span>
            </div>
          </div>
          <div class="fy-stand-wrap foe ink-frame">${foeArt(b.enemyId, "side")}</div>
          <div class="nameplate ink-plate">
            <b>${b.enemy.name}${live.length > 1 ? ` · ${live.length}人` : ""}</b>
            <span>${b.enemy.title} · ${WEAPON_NAME[ENEMY_WEAPON[b.enemyId]]}</span>
          </div>
          ${hpBar(foeHp, foeMax)}
          ${qiBar(b.enemyEnergy, b.enemyEnergyMax)}
        </aside>
      </div>

      <footer class="bottombar">
        <div class="draw-col">
          ${gear ? weaponArtMarkup(gear.id, { button: true }) : weaponArtMarkup(starterGear(mate.weapon), { button: true })}
          <button type="button" class="pile-card" data-pile="draw" title="残谱">
            <em>残谱</em>
            <b>${b.drawPile.length}</b>
          </button>
        </div>
        ${renderStatusCol(b, "you")}
        <div class="hand" id="hand">${renderCards(b, hoverUid)}</div>
        <div class="pow-col foe-pow">
          <button class="endturn" id="btn-end" ${b.phase === "player" ? "" : "disabled"}>收势</button>
        </div>
        ${renderStatusCol(b, "foe")}
        <div class="foe-col">
          ${weaponArtMarkup(foeWeaponId(b.enemyId), { button: true })}
          <button type="button" class="pile-card discard" data-pile="discard" title="战记">
            <em>战记</em>
            <b>${b.journal.length}</b>
          </button>
        </div>
        <div id="preview-slot">${renderPreview(prev)}</div>
      </footer>
      ${pileOpen ? renderPileSheet(b, pileOpen) : ""}
      ${weaponOpen ? renderWeaponSheet(weaponOpen) : ""}
      ${codexOpen ? `<div class="sheet-mask" id="codex-mask">${renderCodexSheet(codexOpen)}</div>` : ""}
    </section>`;
}

function renderWeaponSheet(id: string): string {
  const d = weaponDetail(id);
  if (!d) return "";
  return `
    <div class="sheet-mask" id="weapon-mask">
      <div class="sheet-panel weapon-sheet ink-sheet">
        ${sheetClose()}
        <div class="kicker">兵刃</div>
        <div class="weapon-sheet-art">${weaponArt(id)}</div>
        <h2>${d.name}</h2>
        <p class="weapon-school">${d.school}</p>
        <p>${d.text}</p>
        <p class="flavor">${d.tip}</p>
      </div>
    </div>`;
}

function rewardKind(r: Reward): string {
  if (r.kind === "silver") return "银两";
  if (r.kind === "yuanbao") return "元宝";
  if (r.kind === "pass") return "文牒";
  if (r.kind === "goods") return "货色";
  if (r.kind === "scrollBox") return "残谱箱";
  if (r.kind === "gear") return "兵刃";
  if (r.kind === "mate") return "入伙";
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

function rewardBody(r: Reward): {
  name: string;
  text: string;
  flavor: string;
  art: string;
  fromName?: string;
  fromText?: string;
} {
  if (r.kind === "silver") {
    return { name: `银 ${r.amount}`, text: "入袋。医馆、武馆、当铺都认。", flavor: "银两不认刀，认规矩。", art: knifeInk() };
  }
  if (r.kind === "yuanbao") {
    return { name: `元宝 ${r.amount}`, text: "硬通货。锻材、玄药才认它。", flavor: "银买路，宝开炉。", art: knifeInk() };
  }
  if (r.kind === "pass") {
    return { name: `文牒 ×${r.amount}`, text: "城门与关卡验帖用。", flavor: "帖比银轻，比命短。", art: techSeal("leftover") };
  }
  if (r.kind === "goods") {
    const name = BAG_NAME[r.id as BagGoodsId] ?? r.id;
    return { name: `${name} ×${r.n}`, text: BAG_TIP[r.id as BagGoodsId] ?? "入行囊。", flavor: "货在袋里，路在脚下。", art: bagArtMarkup(r.id as BagGoodsId) };
  }
  if (r.kind === "scrollBox") {
    return { name: "残谱箱", text: "开箱得一张未见过的谱，先收入卷。", flavor: "箱盖一响，墨气扑面。", art: cardArt("strike") };
  }
  if (r.kind === "gear") {
    const g = gearById(r.id);
    return {
      name: g?.name ?? r.id,
      text: g?.tip ?? "入手一把兵刃（最高玄）。",
      flavor: g ? `${g.school} · ${g.tier}` : "刀认手。",
      art: knifeInk(),
    };
  }
  if (r.kind === "mate") {
    return { name: "有人入伙", text: "同行多一人。先机与谱另算。", flavor: "路长，人不能短。", art: knifeInk() };
  }
  if (r.kind === "technique") {
    const t = TECHNIQUES[r.id];
    return { name: t.name, text: t.text, flavor: t.flavor, art: techSeal(t.id) };
  }
  if (r.kind === "upgrade") {
    const to = CARDS[r.to];
    const from = CARDS[r.from];
    return {
      name: to.name,
      text: to.text,
      flavor: upgradeCompareLine(r.from, r.to),
      art: cardArt(to.id),
      fromName: from.name,
      fromText: from.text,
    };
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
  if (r.kind === "add") {
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
  // technique
  const t = TECHNIQUES[(r as { kind: "technique"; id: TechniqueId }).id];
  return { name: t.name, text: t.text, flavor: t.flavor, art: techSeal(t.id) };
}

function renderReward(): string {
  const cards = rewards
    .map((r, i) => {
      const body = rewardBody(r);
      const compare =
        body.fromName && body.fromText
          ? `<div class="reward-compare"><span class="was"><em>原</em>${body.fromName}<small>${body.fromText}</small></span><span class="now"><em>改</em>${body.name}<small>${body.text}</small></span></div>`
          : `<p class="text">${body.text}</p>`;
      return `
        <button class="card reward ${r.kind}" data-i="${i}">
          <div class="banner">${rewardKind(r)}</div>
          <div class="art">${body.art}</div>
          <h3>${body.name}</h3>
          ${compare}
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
          ${tongbaoRerollAffordable(save) && rewardFrom === "duel" ? `<button class="ghost" id="btn-tongbao-reroll">通宝重掷（${TONGBAO_REROLL_COST}）</button>` : ""}
        </div>
      </div>
    </section>`;
}

function renderEnd(): string {
  const copy =
    ended === "won"
      ? endSaid || "门开着。名册上那一笔墨还没干。你还是走了进去。"
      : fallSaid || "石台上，你倒了。";
  const kick = ended === "won" ? "潮门" : "港律";
  const title = ended === "won" ? "明手" : "倒了";
  return `
    <section class="screen title-screen fy-title" style="background-image:url('${titleBg()}')">
      <div class="center fy-plaque">
        <div class="kicker">${kick}</div>
        <h1>${title}</h1>
        <p class="lead">${copy.split("\n").join("<br>")}</p>
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
  const sealTile = w.tiles[y][x] === "seal";
  const seal = sealTile ? w.seals.find((s) => s.x === x && s.y === y) : undefined;
  const sealLit =
    sealTile &&
    seal &&
    seal.id !== "x" &&
    (sealsComplete(w) || w.progress.includes(seal.id))
      ? "1"
      : "0";
  if (el.dataset.tex && el.dataset.sealLit === sealLit) return;
  const art = tileArt(w.scene, w.tiles, x, y);
  el.dataset.tex = art.key;
  el.dataset.sealLit = sealLit;
  const occupied =
    w.portals.some((p) => p.x === x && p.y === y) ||
    w.props.some((p) => p.x === x && p.y === y) ||
    w.talkers.some((t) => t.x === x && t.y === y) ||
    w.npcs.some((n) => n.x === x && n.y === y && !n.beaten) ||
    w.braziers.some((b) => b.x === x && b.y === y) ||
    w.caches.some((c) => c.x === x && c.y === y);
  const plant = occupied ? null : plantStamp(w.scene, w.tiles[y][x], x, y, w.tiles);
  el.innerHTML =
    texMarkup(art) +
    (plant
      ? `<img class="stamp${plant.startsWith("crag") ? " crag" : plant.startsWith("tuft") ? " tuft" : ""}" src="${stampSrc(plant)}" alt="" draggable="false">`
      : "") +
    (sealTile
      ? `<img class="stamp seal${sealLit === "1" ? " lit" : ""}" src="/art/objs/obj-seal${sealLit === "1" ? "-lit" : ""}.png" alt="" draggable="false">`
      : "");
}

function renderPack(): string {
  const keys = run.items.map((id) => `<li class="pack-key">${itemName(id as ItemId)}</li>`).join("");
  const PILL_IDS = new Set<BagGoodsId>([
    "pillFan",
    "pillLiangHp",
    "pillLiangQi",
    "pillXuanHp",
    "pillXuanQi",
    "pillXuanPace",
  ]);
  const slots = Array.from({ length: 12 }, (_, i) => {
    const s = (run.bag ?? [])[i];
    if (!s) return `<button type="button" class="bag-cell empty" disabled></button>`;
    const tip = BAG_TIP[s.id as BagGoodsId] ?? "";
    const useable = s.id === "salve" || s.id === "pillFan" || PILL_IDS.has(s.id as BagGoodsId);
    return `<button type="button" class="bag-cell bag-ico-${s.id}" data-bag="${s.id}" title="${BAG_NAME[s.id as BagGoodsId]} · ${tip}" ${useable ? "" : ""}>
      ${bagArtMarkup(s.id)}<b>${BAG_NAME[s.id as BagGoodsId]}</b><em>×${s.n}</em>
    </button>`;
  }).join("");
  const craftSec = craftRemainSec(run);
  const pending = run.craftPending
    ? `<p class="pack-note">炉上：${BAG_NAME[run.craftPending.id as BagGoodsId]} ×${run.craftPending.n}${craftSec > 0 ? ` · 还要 ${craftSec} 息` : " · 可取"}</p>`
    : "";
  const mates = (run.party ?? [run.hero]).map((id) => {
    const m = MATES[id as CompanionId];
    const bonus = run.companionBonus?.[id];
    const bits = [
      bonus?.maxHp ? `气+${bonus.maxHp}` : "",
      bonus?.qiMax ? `劲+${bonus.qiMax}` : "",
      bonus?.pace ? `先+${bonus.pace}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return `<button type="button" class="pill-mate" data-pill-mate="${id}">${m.name}<small>${bits || "未服丹"}</small></button>`;
  }).join("");
  const pillSheet =
    pillPick && pillPick !== "pillFan" && pillPick !== "salve"
      ? `<div class="pill-pick">
          <p>选一人服下「${BAG_NAME[pillPick]}」。只加此人根基。</p>
          <div class="pill-mates">${mates}</div>
          <button type="button" class="ghost" id="pill-cancel">不吃了</button>
        </div>`
      : "";
  return `
    <div class="sheet-panel pack-sheet">
      ${sheetClose()}
      <div class="kicker">行囊</div>
      <h2>身上</h2>
      <div class="pack-currency">
        <span class="silver-chip">${coinMark()}<b>${run.silver ?? 0}</b> 两</span>
        <span class="silver-chip" title="元宝">元宝 <b>${run.yuanbao ?? 0}</b></span>
        <span class="tongbao-chip" title="通宝 · 稀少">通宝 <b>${tongbaoOf(save)}</b></span>
        <span class="tongbao-chip" title="通关文牒">文牒 <b>${run.passes ?? 0}</b></span>
      </div>
      <div class="bag-grid">${slots}</div>
      ${pending}
      ${pillSheet}
      <p class="pack-hint">伤药／凡药点一下回血。良药·玄药点一下选人服用。锻材拿到武馆炉上用。</p>
      <div class="kicker">腰牌 · 文书</div>
      <ul class="pack-list">${keys || "<li>没有要紧文书。</li>"}</ul>
    </div>`;
}

function renderCodexButtons(): string {
  return (Object.keys(CODEX) as CodexBook[])
    .filter((id) => hasCodex(run, id))
    .map((id) => `<button id="btn-codex-${id}" class="fy-btn" type="button">${CODEX[id].btn}</button>`)
    .join("");
}

function renderCodexSheet(book: CodexBook): string {
  const meta = CODEX[book];
  let body = "";
  if (book === "mingzhu") {
    body = `<ul class="pack-list codex-list">${STATUS_ENTRIES.map(
      (e) =>
        `<li class="codex-row"><b>${e.name}</b><em>${e.side === "you" ? "己方" : e.side === "foe" ? "敌方" : e.side === "intent" ? "意图" : "双方"}</em><span>${e.text}</span></li>`,
    ).join("")}</ul>`;
  } else if (book === "bingji") {
    body = bingjiRows(run)
      .map((block) => {
        const got = block.items.filter((i) => i.owned).length;
        const rows = block.items
          .map((i) =>
            i.owned
              ? `<li class="codex-row owned"><b>${i.gear.name}</b><em>${i.gear.grade}成</em><span>${i.gear.tip}</span></li>`
              : `<li class="codex-row locked"><b>· · ·</b><em>${i.gear.grade}成</em><span>未入籍</span></li>`,
          )
          .join("");
        return `<div class="codex-school"><div class="kicker">${block.school} · ${got}/${block.items.length}</div><ul class="pack-list">${rows}</ul></div>`;
      })
      .join("");
  } else {
    const rows = shiluRows(run);
    const got = rows.filter((r) => r.owned).length;
    body = `<div class="kicker">已录 ${got}/${rows.length}</div><ul class="pack-list">${rows
      .map((r) =>
        r.owned
          ? `<li class="codex-row owned"><b>${r.name}</b><span>${r.text}</span></li>`
          : `<li class="codex-row locked"><b>· · ·</b><span>未录此势</span></li>`,
      )
      .join("")}</ul>`;
  }
  return `
    <div class="sheet-panel codex-panel">
      ${sheetClose()}
      <div class="kicker">${meta.kicker}</div>
      <h2>${meta.title}</h2>
      <p class="quest-blurb">${meta.lead}</p>
      ${body}
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
      const gift = !isLead(run, id) && MATE_PASSIVE[id] ? ` · ${MATE_PASSIVE[id]!.name}` : "";
      const kick = isLead(run, id)
        ? ""
        : `<button type="button" class="kick-mate" data-kick="${id}">遣散</button>`;
      return `<li>${m.name} · ${WEAPON_NAME[m.weapon]} · ${hp}/${cap}${learned}${gift}${kick}<span>${isLead(run, id) ? WEAPON_VERB[m.weapon] : (MATE_PASSIVE[id]?.text ?? WEAPON_VERB[m.weapon])}</span></li>`;
    })
    .join("");
  return `
    <div class="sheet-panel">
      ${sheetClose()}
      <div class="kicker">同行</div>
      <h2>在路上 · ${run.party.length}/${PARTY_CAP}</h2>
      <p class="quest-blurb">同路最多七人。满员时新人上不来，需先遣散。</p>
      <ul class="pack-list mates">${mates}</ul>
    </div>`;
}

function renderQuestCard(q: { title: string; blurb: string; guide: string }, kind: "main" | "side"): string {
  return `<article class="quest-card ${kind}">
    <header><em>${kind === "main" ? "主线" : "支线"}</em><b>${q.title}</b></header>
    <p class="quest-blurb">${q.blurb}</p>
    <p class="quest-guide"><span>去向</span>${q.guide}</p>
  </article>`;
}

function renderQuests(): string {
  const log = questLog(run);
  if (questSheet === "side") {
    const body = log.sides.length
      ? log.sides.map((q) => renderQuestCard(q, "side")).join("")
      : `<p class="quest-empty">还没接旁的差，也没问起旁的事。</p>`;
    return `
    <div class="sheet-panel quest-sheet">
      ${sheetClose()}
      <div class="kicker">支线</div>
      <h2>路上旁的事</h2>
      <div class="quest-stack">${body}</div>
    </div>`;
  }
  return `
    <div class="sheet-panel quest-sheet">
      ${sheetClose()}
      <div class="kicker">主线</div>
      <h2>此行</h2>
      <div class="quest-stack">${renderQuestCard(log.main, "main")}</div>
    </div>`;
}

function renderQuestChip(): string {
  const log = questLog(run);
  const sideText = log.sides[0]?.title ?? "未接";
  const sideCount = log.sides.length > 1 ? `<span>${log.sides.length}</span>` : "";
  return `<div class="fy-quests">
    <button id="btn-quest" class="fy-quest" type="button" title="${log.main.guide}"><em>主线</em><b>${log.main.title}</b></button>
    <button id="btn-side" class="fy-quest" type="button" title="${log.sides[0]?.guide ?? "点开查看支线"}"><em>支线</em><b>${sideText}</b>${sideCount}</button>
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
          <span class="silver-chip" title="银两">${coinMark()}<b>${run.silver ?? 0}</b></span>
          ${renderCodexButtons()}
          <button id="btn-pack" class="fy-btn" type="button">行囊</button>
          <button id="btn-party" class="fy-btn" type="button">同行</button>
          <span class="fy-btn hp">${heartMark()} ${run.hp}/${isLead(run, run.active) ? run.hpMax : MATES[run.active].hp}</span>
          <button id="btn-title" class="fy-btn" type="button">名册</button>
          <button id="btn-settings" class="fy-btn" type="button">设置</button>
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
      ${atlasOpen ? `<div class="sheet-mask atlas-mask" id="atlas-mask">${sheetClose()}<div class="atlas-zoom-wrap"><canvas id="atlas-zoom" width="${ATLAS_ZOOM_W}" height="${ATLAS_ZOOM_H}"></canvas><p class="atlas-zoom-hint">官道路网 · 点空白或 Esc 关闭</p></div></div>` : ""}
      ${packOpen ? `<div class="sheet-mask" id="pack-mask">${renderPack()}</div>` : ""}
      ${partyOpen ? `<div class="sheet-mask" id="party-mask">${renderParty()}</div>` : ""}
      ${questSheet ? `<div class="sheet-mask" id="quest-mask">${renderQuests()}</div>` : ""}
      ${settingsOpen ? `<div class="sheet-mask" id="settings-mask">${renderSettings()}</div>` : ""}
      ${codexOpen ? `<div class="sheet-mask" id="codex-mask">${renderCodexSheet(codexOpen)}</div>` : ""}
      ${fallOpen ? `<div class="sheet-mask" id="fall-mask"><div class="sheet-panel"><div class="kicker">港律</div><h2>倒了</h2><p class="quest-main">${fallSaid}</p><p>${fallThought}</p><div class="row"><button class="primary" id="btn-rise" type="button">起身</button></div></div></div>` : ""}
      ${saveToast ? `<div class="save-toast">${saveToast}</div>` : ""}
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
    .map((t) => {
      let label = TALKER_NAME[t.id] ?? t.id;
      if (t.id === "carter" && w.scene === "pier" && run.items.includes("cargo")) label = "车夫·接货";
      return `<div class="actor npc talk" style="transform:translate(${t.x * TILE}px,${t.y * TILE}px)">${cutSprite(t.id)}${actorTag(label)}</div>`;
    })
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
                  : p.kind === "stall"
                    ? actorTag("摊棚")
                    : p.kind === "arch"
                      ? // 院名只走中央大字，牌坊上不再挂「衙门/税卡」
                        ""
                      : "";
      const seam = p.kind === "arch" ? wallSeamEdge(w.tiles, p.x, p.y) : "";
      const seamClass = seam ? ` edge-${seam}` : "";
      return `<div class="actor prop ${p.kind}${p.tag ? " " + p.tag : ""}${seamClass}" style="transform:translate(${p.x * TILE}px,${p.y * TILE}px)">${propArt(p.kind, p.x, p.y, w.scene, w.tiles)}${name}</div>`;
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
      const kind = doorKind(p.to);
      const label = placeName(p.to);
      // 地名写在传送点上
      const tag = label && label !== "门" ? actorTag(label) : "";
      return `<div class="actor door ${kind}" style="transform:translate(${p.x * TILE}px,${p.y * TILE}px)"><img class="sprite obj door" src="${doorSrc(kind)}" alt="" draggable="false">${tag}</div>`;
    })
    .join("");
  const areaMarks = "";
  const bars: string[] = [];
  for (let y = 0; y < w.h; y++) {
    for (let x = 0; x < w.w; x++) {
      if (w.tiles[y][x] !== "gate" || !visible(x, y)) continue;
      const open = gateOpen(w, run);
      const seam = wallSeamEdge(w.tiles, x, y);
      bars.push(
        `<div class="actor door paifang edge-${seam}${open ? " open" : " shut"}" style="transform:translate(${x * TILE}px,${y * TILE}px)"><img class="sprite obj door" src="${archSrc(w.tiles, x, y)}" alt="" draggable="false"></div>`,
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
  const sealMarks = w.seals
    .filter((s) => s.id !== "x" && visible(s.x, s.y))
    .map((s) => {
      const lit = sealsComplete(w) || w.progress.includes(s.id);
      const label = s.id === "w" ? "西印" : s.id === "e" ? "东印" : s.id === "s" ? "南印" : s.id === "n" ? "北印" : "印";
      return `<div class="actor seal${lit ? " lit" : ""}" style="transform:translate(${s.x * TILE}px,${s.y * TILE}px)"><img class="sprite obj" src="/art/objs/obj-seal${lit ? "-lit" : ""}.png" alt="" draggable="false">${actorTag(label)}</div>`;
    })
    .join("");
  const grounds = w.items
    .filter((i) => !i.taken && visible(i.x, i.y))
    .map((i) => {
      const src = itemSprite(i.id);
      return `<div class="actor loot" style="transform:translate(${i.x * TILE}px,${i.y * TILE}px)"><img class="sprite obj loot" src="${src}" alt="${itemName(i.id)}" draggable="false">${actorTag(itemName(i.id))}</div>`;
    })
    .join("");
  const you = run.hero ?? "rail";
  const haul = run.items.includes("cargo") ? " · 押镖" : "";
  const player = `<div class="actor you" style="transform:translate(${w.player.x * TILE}px,${w.player.y * TILE}px)">${cutSprite(you)}${actorTag(MATES[you].name + haul)}</div>`;
  const cargoMark =
    run.items.includes("cargo") && visible(w.player.x, w.player.y)
      ? `<div class="actor prop crate cargo-follow" style="transform:translate(${w.player.x * TILE}px,${(w.player.y - 0.35) * TILE}px)">${propArt("crate")}${actorTag("镖货")}</div>`
      : "";
  const actors = root.querySelector("#actors");
  if (actors) actors.innerHTML = props + chests + doors + areaMarks + bars.join("") + fires + sealMarks + grounds + talkers + npcs + cargoMark + player;
  paintFog(w);
  const talkWords = root.querySelector("#talk-words");
  if (talkWords) talkWords.innerHTML = renderTalkWords(w);
  const bust = root.querySelector("#talk-bust");
  if (bust) bust.innerHTML = stand(talkFace(w), "bust");
  // 银两即时刷新，不必打开行囊
  const silverB = root.querySelector<HTMLElement>(".fy-stats .silver-chip b");
  if (silverB) silverB.textContent = String(run.silver ?? 0);
  const stage = root.querySelector<HTMLElement>("#map-stage");
  const map = root.querySelector<HTMLElement>("#map");
  if (stage && map) {
    const stageW = stage.clientWidth;
    const stageH = stage.clientHeight;
    if (stageW >= 64 && stageH >= 64) {
      const mapW = w.w * TILE;
      const mapH = w.h * TILE;
      const scale = coverScale(isOutdoor(w.scene));
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
  if (screen === "map" || screen === "combat" || screen === "reward") autosave();
  screen = "title";
  fallOpen = false;
  questSheet = null;
  settingsOpen = false;
  cueMusic("title");
  render();
}

function beginRun(heart: HeartId): void {
  stopWalk();
  save = clearRun(save);
  persist();
  run = makeRun(heart, pendingHero);
  const brought = bringStashIntoRun(run, save);
  run = brought.run;
  save = brought.save;
  world = loadScene(HERO_START[pendingHero], run);
  seeAround();
  if (HERO_START[pendingHero] === "hut" && !run.flags.includes("lessonWalk")) {
    world.said = "屋里潮。南墙有门。门外土响。";
    world.thought = "WASD 挪步，点已见处可走。贴着人按空格，才开得了口。";
    world.message = world.said;
  } else if (HERO_START[pendingHero] === "customs") {
    world.said = "税卡案牍横着。案下还有一笔墨。";
    world.thought = "你是朝廷的人。WASD 挪步，贴着人空格开口。先对上案下那只手。";
    world.message = world.said;
  } else if (HERO_START[pendingHero] === "pit") {
    world.said = "桩场空着。南面那根桩后面站着人。";
    world.thought = "你是工上的人。WASD 挪步。贴着人空格交谈。先过这一桩。";
    world.message = world.said;
  }
  cam = { x: 0, y: 0, scene: "" };
  settingsOpen = false;
  screen = "map";
  cueMusic("map");
  cuePlace(world.scene);
  autosave();
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

function renderSettings(): string {
  const ear = getEar();
  const diff = getDifficulty();
  const diffs = (Object.keys(DIFFICULTY_META) as Difficulty[])
    .map((id) => {
      const meta = DIFFICULTY_META[id];
      const on = diff === id ? " on" : "";
      return `<button type="button" class="diff-pick${on}" data-diff="${id}"><b>${meta.name}</b><span>${meta.blurb}</span></button>`;
    })
    .join("");
  return `
    <div class="sheet-panel quest-sheet settings-sheet">
      ${sheetClose()}
      <div class="kicker">本港</div>
      <h2>设置</h2>
      <div class="settings-block">
        <div class="settings-label">声音</div>
        <div class="settings-row">
          <button type="button" class="ear-btn ${ear.sfx ? "on" : ""}" data-ear="sfx">${ear.sfx ? "声开" : "声关"}</button>
          <button type="button" class="ear-btn ${ear.music ? "on" : ""}" data-ear="music">${ear.music ? "乐开" : "乐关"}</button>
        </div>
      </div>
      <div class="settings-block">
        <div class="settings-label">对战难度</div>
        <p class="settings-note">只影响之后开打的对手。当前：${DIFFICULTY_META[diff].name}。</p>
        <div class="diff-list">${diffs}</div>
      </div>
      <div class="settings-block">
        <div class="settings-label">进度</div>
        <p class="settings-note">进出场景、打完仗会自动写入本机。也可手动再存一笔。</p>
        <button type="button" class="primary" id="btn-save-now">保存进度</button>
      </div>
    </div>`;
}

function flashSave(msg: string): void {
  saveToast = msg;
  if (saveToastTimer) window.clearTimeout(saveToastTimer);
  saveToastTimer = window.setTimeout(() => {
    saveToast = "";
    saveToastTimer = 0;
    if (screen === "map" || screen === "title") render();
  }, 1600);
}

function persist(): void {
  if (screen === "map" || screen === "combat" || screen === "reward") {
    save = stashRun(save, run, world.scene);
  }
  writeSave(save);
}

function autosave(scene = world?.scene ?? save.scene ?? "hut"): void {
  const at = world ? { x: world.player.x, y: world.player.y } : save.at ?? null;
  save = stashRun(save, run, scene, at);
  writeSave(save);
}

function resumeSpawn(w: World, at: { x: number; y: number } | null | undefined): { x: number; y: number } {
  const ok = (x: number, y: number) => {
    const t = w.tiles[y]?.[x];
    if (!t || t === "wall" || t === "water" || t === "rock" || t === "hill") return false;
    return true;
  };
  if (at && ok(at.x, at.y)) return { x: at.x, y: at.y };
  for (const p of w.portals) {
    if (ok(p.x, p.y)) return { x: p.x, y: p.y };
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      const nx = p.x + dx;
      const ny = p.y + dy;
      if (ok(nx, ny)) return { x: nx, y: ny };
    }
  }
  if (ok(w.player.x, w.player.y)) return { x: w.player.x, y: w.player.y };
  for (let y = 0; y < w.h; y++) {
    for (let x = 0; x < w.w; x++) {
      if (ok(x, y)) return { x, y };
    }
  }
  return { x: w.player.x, y: w.player.y };
}

function resumeRun(): void {
  if (!hasStashedRun(save) || !save.run || !save.scene) return;
  stopWalk();
  run = save.run;
  pendingHero = run.hero ?? "rail";
  world = loadScene(save.scene as SceneId, run);
  world.player = resumeSpawn(world, save.at);
  seeAround();
  cam = { x: 0, y: 0, scene: "" };
  settingsOpen = false;
  screen = "map";
  cueMusic("map");
  cuePlace(world.scene);
  flashSave("续上了。");
  render();
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

function endingCopy(hero: HeroId, flags: string[]): string {
  return endingLead(hero, flags);
}

function finishWin(): void {
  stashFight();
  const heal = winHeal(run.heart);
  const firstKnife = battle.enemyId === HERO_BOSSES[run.hero ?? "rail"][0];
  const teachTalk = !run.flags.includes("lessonTalk");
  const turns = battle.turn;
  const hero = run.hero ?? "rail";
  const usurperDown = battle.enemyId === "usurper";
  world = afterDuel(world, true, battle.player.hp, heal);
  run = syncActiveHp(run, world.hp);
  run = noteBeaten(run, battle.enemyId);
  if (run.flags.includes(`escortElite-${battle.enemyId}`)) {
    run = addFlag(run, "escortEliteDone");
  }
  const scar = scarFlagFor(world.scene, battle.enemyId);
  if (scar) {
    run = addFlag(run, scar);
    world.thought = `${world.thought} 这一刀在门上留了疤。有些闸会认刀口。`;
  }
  const bet = resolveTeaBet(run, true, turns);
  run = bet.run;
  if (bet.line) world.thought = `${world.thought} ${bet.line}`;
  const bounty = checkBountyOnWin(run, battle.enemyId);
  run = bounty.run;
  if (bounty.payout) world.thought = `${world.thought} ${bounty.payout}`;
  run = maybeArmBounty(run);
  run = maybeUnlockFork(run);
  if (TEMPER_SCENES.has(world.scene) && !run.flags.includes(`tempered-${world.scene}`)) {
    const up = softUpgradeTarget(run.weapon);
    if (up) {
      run = {
        ...run,
        weapon: up,
        weapons: run.weapons.includes(up) ? run.weapons : [...run.weapons, up],
        flags: [...run.flags, `tempered-${world.scene}`],
      };
      world.thought = `${world.thought} 这一场淬了刃。兵刃成色涨到良。精以上另走锻材。`;
    }
  }
  if (firstKnife) run = addFlag(run, "mainOpen");
  if (hero === "rail" && (battle.enemyId === "raider" || battle.enemyId === "bandit" || battle.enemyId === "thug")) {
    run = addFlag(run, "heardRebel");
  }
  if (run.flags.includes("lessonFight") && !run.flags.includes("lessonFightDone")) {
    run = addFlag(run, "lessonFightDone");
    world.thought = `${world.thought} 石台规矩摸着了：先看意图，再出牌；劲尽就收势。`;
  }
  if (teachTalk) {
    run = addFlag(run, "lessonTalk");
    world.thought = `${world.thought} 港上的人不会一次把话倒完。贴上去，空格开口，再选你要问的。`;
  }
  if (usurperDown) {
    const endFlag = hero === "seer" ? "endingSeer" : hero === "sapper" ? "endingSapper" : "endingRail";
    run = addFlag(run, endFlag);
    endSaid = endingCopy(hero, run.flags);
    const summary = endingSummary(run.flags, hero);
    if (summary.length) {
      endSaid = `${endSaid}\n${summary.map((line) => `· ${line}`).join("\n")}`;
    }
    save = markSeen(save, battle.enemyId);
    endRunWin();
    return;
  }
  save = markSeen(save, battle.enemyId);
  const tb = maybeTongbaoDrop(save, run, battle.enemyId);
  save = tb.save;
  run = tb.run;
  if (tb.dropped) world.thought = `${world.thought} 袖里多了一枚通宝。烫手。`;
  const eid = battle.enemyId;
  if (eid === "hillBandit" || eid === "riverThug" || eid === "bandit") {
    run = addBag(run, "hide", 1);
    if (Math.random() < 0.45) run = addBag(run, "herb", 1);
  } else if (eid === "thief" || eid === "thug") {
    run = addBag(run, Math.random() < 0.5 ? "silk" : "herb", 1);
  } else if (eid === "raider" || eid === "robber") {
    if (Math.random() < 0.4) run = addBag(run, "sulfur", 1);
    if (Math.random() < 0.35) run = addBag(run, "charcoal", 1);
  } else if (Math.random() < 0.22) {
    run = addBag(run, "herb", 1);
  }
  if (eid === "warden" || eid === "brute") {
    if (Math.random() < 0.35) run = addBag(run, "copper", 1);
    if (Math.random() < 0.3) run = addBag(run, "nitre", 1);
  }
  persist();
  screen = "map";
  cueMusic("map");
  render();
}

function finishFlee(): void {
  stashFight();
  const hp = Math.max(1, battle.player.hp);
  world = afterDuel(world, false, hp, 0, {
    said: "你撤了。人还在原处。",
    thought: "打不过就走，也是港律——门要留一条缝。",
  });
  run = syncActiveHp(run, world.hp);
  hoverUid = null;
  pileOpen = null;
  screen = "map";
  cueMusic("map");
  render();
}

function finishLoss(): void {
  run = { ...run, falls: run.falls + 1 };
  const bet = resolveTeaBet(run, false, battle.turn);
  run = bet.run;
  run = applyFallFlags(run);
  const note = noteFall(run.falls);
  if (run.flags.includes("sidesShut")) {
    note.thought = `${note.thought} 港上有些口子，倒过两次就不认了。`;
  }
  if (note.over) {
    ended = "lost";
    fallSaid = note.said;
    fallThought = note.thought;
    save = clearRun(save);
    persist();
    screen = "end";
    render();
    return;
  }
  const hp = reviveHp(battle.player.maxHp);
  battle.player.hp = hp;
  stashFight();
  world = afterDuel(world, false, hp, 0, note);
  if (bet.line) world.thought = `${world.thought} ${bet.line}`;
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
  const gate = canTravelTo(world.scene, to, run);
  if (!gate.ok) {
    world.message = gate.reason;
    world.said = gate.reason;
    world.thought = "路未开。开了再走。";
    world.reply = "";
    world.choices = [];
    paintMap();
    return;
  }
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
  if (to === "ferry" || to === "isle") {
    save = markCleared(save, "court");
    persist();
  }
  world = loadScene(to, run, at);
  seeAround();
  if (to === "pier" && run.items.includes("cargo")) {
    world.said = "码头到了。东院门口车夫接货。";
    world.thought = "短镖交到他手里，才结六两。";
    world.message = world.said;
  }
  screen = "map";
  cueMusic("map");
  if (fresh) cuePlace(to);
  render();
}

function endRunWin(): void {
  // 局外窖藏：带走剩余暗器/药/材料，下局可带入有限件
  for (const s of run.bag ?? []) {
    if (s.n > 0) save = stashAdd(save, s.id as BagGoodsId, s.n);
  }
  save = markCleared(save, "court");
  save = markCleared(save, "isle");
  save = clearRun(save);
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
  root.querySelector("#btn-continue")?.addEventListener("click", () => resumeRun());
  root.querySelector("#btn-title")?.addEventListener("click", goTitle);
  const openSettings = () => {
    settingsOpen = !settingsOpen;
    packOpen = false;
    partyOpen = false;
    questSheet = null;
    atlasOpen = false;
    codexOpen = null;
    render();
  };
  root.querySelector("#btn-settings")?.addEventListener("click", openSettings);
  root.querySelector("#btn-settings-title")?.addEventListener("click", openSettings);
  for (const id of Object.keys(CODEX) as CodexBook[]) {
    root.querySelector(`#btn-codex-${id}`)?.addEventListener("click", () => {
      if (!hasCodex(run, id)) return;
      packOpen = false;
      partyOpen = false;
      questSheet = null;
      atlasOpen = false;
      settingsOpen = false;
      pileOpen = null;
      weaponOpen = null;
      codexOpen = codexOpen === id ? null : id;
      render();
    });
  }
  root.querySelector("#codex-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "codex-mask") {
      codexOpen = null;
      render();
    }
  });
  root.querySelector("#settings-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "settings-mask") {
      settingsOpen = false;
      render();
    }
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-diff]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.diff as Difficulty;
      if (id !== "easy" && id !== "normal" && id !== "hard") return;
      setSettings({ difficulty: id });
      render();
    });
  }
  root.querySelector("#btn-save-now")?.addEventListener("click", () => {
    if (screen === "map" || screen === "combat" || screen === "reward") {
      autosave();
      flashSave("已写入本机。");
    } else if (hasStashedRun(save)) {
      persist();
      flashSave("存档仍在。");
    } else {
      flashSave("还没有可存的行程。");
    }
    render();
  });
  root.querySelector("#btn-end")?.addEventListener("click", () => {
    endPlayerTurn();
  });
  root.querySelector("#btn-flee")?.addEventListener("click", () => {
    if (battle.phase !== "player") return;
    if (isSparEnemy(battle.enemyId)) {
      finishSpar(false);
      return;
    }
    finishFlee();
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
      weaponOpen = null;
      packOpen = false;
      partyOpen = false;
      questSheet = null;
      atlasOpen = false;
      settingsOpen = false;
      codexOpen = null;
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-weapon]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.weapon;
      if (!id) return;
      weaponOpen = weaponOpen === id ? null : id;
      pileOpen = null;
      render();
    });
  }
  root.querySelector("#weapon-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "weapon-mask") {
      weaponOpen = null;
      render();
    }
  });
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
  root.querySelector("#btn-tongbao-reroll")?.addEventListener("click", () => {
    const paid = spendTongbao(save, TONGBAO_REROLL_COST);
    if (!paid) return;
    save = paid;
    rewards = rollRewards(run, save, { type: "duel", enemyId: battle.enemyId });
    persist();
    render();
  });
  root.querySelector("#btn-atlas")?.addEventListener("click", (e) => {
    e.preventDefault();
    atlasOpen = !atlasOpen;
    packOpen = false;
    partyOpen = false;
    questSheet = null;
    settingsOpen = false;
    codexOpen = null;
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
    settingsOpen = false;
    codexOpen = null;
    // 打开行囊时顺便结算已完成的炉
    const got = collectCraft(run);
    if (got.gained) {
      run = got.run;
      persist();
    }
    render();
  });
  root.querySelector("#pack-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "pack-mask") {
      packOpen = false;
      pillPick = null;
      render();
    }
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-bag]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.bag as BagGoodsId;
      if (id === "salve") {
        const used = useSalveMap(run);
        if (!used.ok) {
          world.said = used.reason;
          world.message = world.said;
          render();
          return;
        }
        run = used.run;
        world.hp = run.hp;
        world.said = "伤药敷上。气血略回。";
        world.message = world.said;
        persist();
        render();
        return;
      }
      if (id === "pillFan") {
        if (run.hp >= run.hpMax) {
          world.said = "气血已满。";
          world.message = world.said;
          render();
          return;
        }
        const taken = takeBag(run, "pillFan", 1);
        if (!taken) {
          world.said = "没有凡药。";
          world.message = world.said;
          render();
          return;
        }
        run = { ...taken, hp: Math.min(taken.hpMax, taken.hp + 10) };
        world.hp = run.hp;
        world.said = "凡药敷上。气血略回。";
        world.message = world.said;
        persist();
        render();
        return;
      }
      if (
        id === "pillLiangHp" ||
        id === "pillLiangQi" ||
        id === "pillXuanHp" ||
        id === "pillXuanQi" ||
        id === "pillXuanPace"
      ) {
        pillPick = id;
        render();
        return;
      }
    });
  }
  root.querySelector("#pill-cancel")?.addEventListener("click", () => {
    pillPick = null;
    render();
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-pill-mate]")) {
    el.addEventListener("click", () => {
      if (!pillPick) return;
      const mate = el.dataset.pillMate as CompanionId;
      const kind = pillPick;
      if (
        kind !== "pillLiangHp" &&
        kind !== "pillLiangQi" &&
        kind !== "pillXuanHp" &&
        kind !== "pillXuanQi" &&
        kind !== "pillXuanPace"
      ) {
        pillPick = null;
        render();
        return;
      }
      const taken = takeBag(run, kind, 1);
      if (!taken) {
        world.said = `没有 ${BAG_NAME[kind]}。`;
        world.message = world.said;
        pillPick = null;
        render();
        return;
      }
      run = applyPillToMate(taken, mate, kind);
      world.hp = run.hp;
      world.said = `${MATES[mate].name}服下了${BAG_NAME[kind]}。`;
      world.thought = "丹只认一个人。旁人喝了也是水。";
      world.message = world.said;
      pillPick = null;
      persist();
      render();
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-fight-bag]")) {
    el.addEventListener("click", () => {
      if (screen !== "combat") return;
      const id = el.dataset.fightBag as BagGoodsId;
      const used = useBattleGood(battle, run, id);
      if (!used.ok) {
        battle = { ...battle, log: [...battle.log, used.reason] };
        render();
        return;
      }
      battle = used.battle;
      run = used.run;
      playSfx("mend");
      if (battle.enemy.hp <= 0) {
        finishWin();
        return;
      }
      render();
    });
  }
  root.querySelector("#btn-party")?.addEventListener("click", () => {
    partyOpen = !partyOpen;
    atlasOpen = false;
    packOpen = false;
    questSheet = null;
    settingsOpen = false;
    codexOpen = null;
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
    settingsOpen = false;
    render();
  });
  root.querySelector("#btn-side")?.addEventListener("click", () => {
    questSheet = questSheet === "side" ? null : "side";
    atlasOpen = false;
    packOpen = false;
    partyOpen = false;
    settingsOpen = false;
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
  root.querySelector("#map-stage")?.addEventListener("click", (e) => {
    if (atlasOpen || packOpen || partyOpen || questSheet || fallOpen || settingsOpen || codexOpen) return;
    if ((e.target as HTMLElement).closest("[data-foe]")) return;
    if ((e.target as HTMLElement).closest(".sheet-mask, .fy-top, .fy-talk, .place-ink")) return;
    const at = tileFromClick(e as MouseEvent);
    if (!at) return;
    clickWalkTo(at.x, at.y);
  });
  root.querySelector("#actors")?.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-foe]");
    const id = el?.dataset.foe as EnemyId | undefined;
    if (!id || !ENEMIES[id]) return;
    e.stopPropagation();
    const npc = world.npcs.find((n) => n.id === id && !n.beaten);
    if (!npc) return;
    const spots = [
      { x: npc.x, y: npc.y - 1 },
      { x: npc.x, y: npc.y + 1 },
      { x: npc.x - 1, y: npc.y },
      { x: npc.x + 1, y: npc.y },
    ].filter((p) => p.x >= 0 && p.y >= 0 && p.x < world.w && p.y < world.h);
    let best: { x: number; y: number } | null = null;
    let bestLen = 999;
    for (const p of spots) {
      const dirs = findPath(world, run, p.x, p.y, () => true);
      if (dirs.length < bestLen && (dirs.length > 0 || (world.player.x === p.x && world.player.y === p.y))) {
        bestLen = dirs.length;
        best = p;
      }
    }
    if (!best) return;
    const dirs = findPath(world, run, best.x, best.y, () => true);
    walkPath(dirs, { x: npc.x, y: npc.y });
  });
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-mate]")) {
    el.addEventListener("click", () => {
      afterPlay(swapFighter(battle, el.dataset.mate as CompanionId));
    });
  }
  for (const el of root.querySelectorAll<HTMLButtonElement>("[data-kick]")) {
    el.addEventListener("click", () => {
      const id = el.dataset.kick as CompanionId;
      run = dismissCompanion(run, id);
      world.message = `${MATES[id].name}被遣散了。同路 ${run.party.length}/${PARTY_CAP}。`;
      render();
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
      if (world.choices?.length) {
        applyMapInteract(world.choices[0].id);
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
