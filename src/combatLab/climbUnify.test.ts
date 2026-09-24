import { afterEach, describe, expect, it } from "vitest";
import { labCard } from "../game/labContent";
import { CARDS } from "../game/content";
import { climbAttackFaceDamage } from "../game/labV21";
import { setLabMode } from "./labTuning";
import { comboCardDamage } from "../game/labCombo";
import { pairFusionId, auraCardId } from "../game/rogueCards";
import { battleEquippedSchool } from "../game/equippedWeapon";
import { profileFor } from "../game/enemyKit";
import { canPlay, playCard, statusChips, previewCard, endTurn, seizeOpening } from "../game/sim";
import { damageBreakdown } from "../game/damageBreakdown";
import { climbTestContext } from "./testContext";
import { startLabBattle } from "./factory";
import { applyAutoLoadout } from "./autoLoadouts";
import { labCanSwap, labSwapFighter } from "./labCombat";
import { climbEnergyStart, climbVitals } from "./climbVitals";
import { STATUS_ENTRIES } from "../game/codex";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { setLabRuleset } from "./labRuleset";
import { renderHoverPreview } from "./prodBattleUi";
import { foeStunCurtainMs, foeIntentIsStrike } from "./labV2Ui";

describe("S1–S10 爬塔收编", () => {
  afterEach(() => {
    setLabRuleset("climb");
    setLabMode(false);
  });

  function climbBattle() {
    setLabRuleset("climb");
    setLabMode(true);
    return startLabBattle(buildGauntletPreset(createGauntletRun("bandit", "saber")), true, 1);
  }

  it("S1 面伤公式不含连势×2 / 气脉", () => {
    const b = climbBattle();
    const fat = { ...b, combo: 9, flow: 3, mark: 5 };
    expect(climbAttackFaceDamage(fat, CARDS.cut, climbTestContext())).toBe(climbAttackFaceDamage(b, CARDS.cut, climbTestContext()));
  });

  it("S2 预演与 chip 用格挡不用架势", () => {
    const b = climbBattle();
    b.enemyBlock = 4;
    expect(renderHoverPreview(b, null)).not.toContain("架势");
    expect(statusChips(b, "foe", climbTestContext()).some((c) => c.name === "架势")).toBe(false);
    expect(statusChips(b, "foe", climbTestContext()).some((c) => c.name === "格挡")).toBe(true);
  });

  it("S5 组合卡牌面与结算对齐", () => {
    expect(CARDS.comboSpear.damage).toBe(15);
    expect(CARDS.comboSword.damage).toBe(14);
    expect(CARDS.comboStaff.damage).toBe(12);
    expect(CARDS.comboHook.damage).toBe(12);
    const b = climbBattle();
    expect(comboCardDamage(b, "comboSpear")).toBe(15);
  });

  it("S6 无序对共用一张连携", () => {
    expect(pairFusionId("palm", "spear")).toBe(pairFusionId("spear", "palm"));
    expect(pairFusionId("palm", "palm")).toBeNull();
    expect(labCard("fusePalmSpear", climbTestContext()).name).toBe("送客枪");
  });

  it("S8 馆 1 无闪避霸体，馆 8 有", () => {
    expect(profileFor("mob_road_01", 1).opener.map((i) => i.kind)).not.toContain("dodge");
    expect(profileFor("mob_road_01", 8).opener.map((i) => i.kind)).toContain("dodge");
  });

  it("S9 眩晕锁最左 N 张，右边仍可出", () => {
    const b = climbBattle();
    b.energy = 20;
    b.player.pos = 3;
    b.enemy.pos = 4;
    const atk = b.hand.filter((c) => labCard(c.defId, climbTestContext()).type === "attack");
    const a = atk[0] ?? b.hand[0]!;
    const extra = { uid: "atk-right", defId: "cut" as const };
    b.hand = [a, extra, ...b.hand.filter((c) => c.uid !== a.uid)];
    b.youStun = 1;
    expect(canPlay(b, a.uid, climbTestContext()).ok).toBe(false);
    expect(canPlay(b, a.uid, climbTestContext()).reason).toContain("最左");
    expect(canPlay(b, extra.uid, climbTestContext()).ok).toBe(true);
  });

  it("S7 三同系开战发光环，打出后本场攻击 +3", () => {
    const p = applyAutoLoadout("t7-four-saber", 1, 1);
    const b = startLabBattle(p, true, 1);
    expect(b.hand.some((c) => c.defId === auraCardId("saber"))).toBe(true);
    const uid = b.hand.find((c) => c.defId === auraCardId("saber"))!.uid;
    const after = playCard({ ...b, energy: 20 }, uid, climbTestContext());
    expect(after.labAuraStrike).toBe(3);
  });

  it("S4 爬塔搓手改格挡、不加连势", () => {
    const p = applyAutoLoadout("t1-four-palm", 1, 1);
    const b = startLabBattle(p, true, 1);
    b.combo = 0;
    b.hand = [{ uid: "w", defId: "weave" }, ...b.hand];
    const after = playCard({ ...b, energy: 20, playerBlock: 0 }, "w", climbTestContext());
    expect(after.combo).toBe(0);
    expect(after.playerBlock).toBeGreaterThanOrEqual(6);
  });

  it("S6 异系换人入手连携卡", () => {
    const p = applyAutoLoadout("t9-palm-saber", 1, 1);
    let b = startLabBattle(p, true, 1);
    const fieldSch = battleEquippedSchool(b, b.active, climbTestContext());
    const other = b.bench.find((m) => battleEquippedSchool(b, m.id, climbTestContext()) !== fieldSch);
    expect(other).toBeTruthy();
    b = { ...b, energy: 20 };
    const after = labSwapFighter(b, other!.id);
    expect(after.hand.some((c) => String(c.defId).startsWith("fuse"))).toBe(true);
  });

  it("S10 枪 a 命中锁步", () => {
    const spear = applyAutoLoadout("t8-three-spear-palm", 3, 1);
    const b = startLabBattle(spear, true, 1);
    const atk = b.hand.find((c) => labCard(c.defId, climbTestContext()).type === "attack")!;
    b.enemy.pos = Math.min(6, b.player.pos + 2);
    const rooted = playCard({ ...b, energy: 20 }, atk.uid, climbTestContext());
    expect(rooted.foeRootTurns).toBeGreaterThanOrEqual(1);
  });

  it("爬塔聚势牌面不再写气脉", () => {
    setLabRuleset("climb");
    setLabMode(true);
    expect(labCard("gather", climbTestContext()).text).toContain("势");
    expect(labCard("gather", climbTestContext()).text).not.toContain("气脉");
    expect(labCard("weave", climbTestContext()).text).toContain("格挡 6");
  });

  it("神兵枪 a 命中封技", () => {
    const spear = applyAutoLoadout("t8-three-spear-palm", 5, 1);
    const b = startLabBattle(spear, true, 1);
    const atk = b.hand.find((c) => labCard(c.defId, climbTestContext()).type === "attack")!;
    b.enemy.pos = Math.min(6, b.player.pos + 2);
    const after = playCard({ ...b, energy: 20 }, atk.uid, climbTestContext());
    expect(after.foeMute).toBeGreaterThanOrEqual(1);
  });

  it("敌眩晕回放插入停顿幕", () => {
    expect(foeStunCurtainMs([{ outcome: "晕" }])).toBe(2500);
    expect(foeStunCurtainMs([{ outcome: "打" }])).toBe(0);
  });

  it("抹刀贴身：构成合计等于预演掉血，效果不进括号", () => {
    const b = climbBattle();
    b.foeHitLastTurn = false;
    b.labEntranceActive = false;
    b.expose = 0;
    b.enemyBlock = 0;
    b.player.pos = 2;
    b.enemy.pos = 3;
    const inst = b.hand.find((c) => c.defId === "hitSaber") ?? (() => {
      b.hand.unshift({ uid: "wipe1", defId: "hitSaber" });
      return b.hand[0]!;
    })();
    const def = labCard("hitSaber", climbTestContext());
    expect(def.name).toBe("抹刀");
    const br = damageBreakdown(b, def, climbTestContext());
    const prev = previewCard({ ...b, energy: 20 }, inst.uid, climbTestContext());
    const dealt = b.enemy.hp - prev.enemyHp;
    expect(br.total).toBe(dealt);
    expect(br.parts.reduce((s, p) => s + p.n, 0)).toBe(br.total);
    expect(prev.breakdown).toMatch(/构成 \d+/);
    expect(prev.breakdown ?? "").not.toMatch(/裂创/);
    expect(prev.breakdownRiders?.join() ?? "").toMatch(/裂创/);
    const html = renderHoverPreview(b, prev);
    expect(html).toMatch(/（构成 \d+：[^）]+）/);
    expect(html).not.toMatch(/（构成[^）]*裂创/);
    expect(html).toMatch(/）裂创|） 裂创/);
  });

  it("斩距 2 用牌面 4，裂创只作跟注，预演构成与结算同口径", () => {
    const b = climbBattle();
    b.foeHitLastTurn = false;
    b.labEntranceActive = false;
    b.expose = 0;
    b.enemy.pos = b.player.pos + 2;
    const inst = b.hand.find((c) => c.defId === "cut") ?? (() => {
      b.hand.unshift({ uid: "cut1", defId: "cut" });
      return b.hand[0]!;
    })();
    const def = labCard("cut", climbTestContext());
    const br = damageBreakdown(b, def, climbTestContext());
    expect(br.parts.find((p) => p.label === "牌面")?.n).toBe(4);
    expect(br.parts.some((p) => p.label === "挨打加伤")).toBe(false);
    expect(br.riders.join()).toMatch(/裂创/);
    expect(br.riders.join()).not.toMatch(/流血/);
    const prev = previewCard({ ...b, energy: 20 }, inst.uid, climbTestContext());
    expect(prev.breakdown).toContain("构成");
    expect(prev.breakdown).not.toContain("埋招");
    expect(prev.breakdown).not.toContain("流血");
    const html = renderHoverPreview(b, prev);
    expect(html).toContain("（构成");
    const dealt = b.enemy.hp - prev.enemyHp;
    expect(dealt).toBe(br.total);
  });

  it("爬塔收势兑完整条，空招跳过不改抢步", () => {
    const b = climbBattle();
    b.player.pos = 0;
    b.enemy.pos = 6;
    b.foePace = 7;
    b.paceBoost = 0;
    b.youSlow = 0;
    b.intents = [
      { kind: "strike", damage: 12 },
      { kind: "strike", damage: 8 },
      { kind: "guard", block: 6 },
    ];
    b.intent = b.intents[0]!;
    b.enemyEnergy = 20;
    const hp = b.player.hp;
    const after = endTurn(b, climbTestContext(), { deferIntentRefresh: true });
    expect(after.player.hp).toBe(hp);
    expect(after.v2LastIntentRecap?.every((r) => r.outcome === "空" || r.outcome === "出" || r.outcome === "架")).toBe(true);
    expect(after.v2LastIntentRecap?.length).toBeGreaterThanOrEqual(2);
  });

  it("爬塔守势跟注不耗这一手，随后仍兑打击", () => {
    const b = climbBattle();
    b.player.pos = 3;
    b.enemy.pos = 4;
    b.v2Turn = { ...b.v2Turn!, turnStartPos: 3, endPos: 3 };
    b.intents = [
      { kind: "guard", block: 6 },
      { kind: "strike", damage: 8 },
      { kind: "mend", heal: 4 },
    ];
    b.intent = b.intents[0]!;
    b.enemyEnergy = 20;
    const blk = b.playerBlock;
    const after = endTurn(b, climbTestContext(), { deferIntentRefresh: true });
    expect(after.v2LastIntentRecap?.map((r) => r.outcome).slice(0, 2)).toEqual(["架", "打"]);
    expect(after.enemyBlock).toBeGreaterThan(0);
    expect(after.playerBlock).toBe(blk); // 敌架不加你挡
  });

  it("爬塔后手开局不削段、不打折", () => {
    const b = climbBattle();
    expect(b.v2OpeningWeakened).toBeFalsy();
    expect(b.intents.length).toBeGreaterThan(0);
  });

  it("敌先机开局兑完整条，后手空条", () => {
    const b = climbBattle();
    b.player.pos = 0;
    b.enemy.pos = 6;
    b.foePace = 9;
    b.paceBoost = 0;
    b.youSlow = 0;
    b.intents = [
      { kind: "strike", damage: 12 },
      { kind: "strike", damage: 8 },
    ];
    b.intent = b.intents[0]!;
    b.enemyEnergy = 20;
    const hp = b.player.hp;
    seizeOpening(b, climbTestContext());
    expect(b.player.hp).toBe(hp);
    expect(b.climbEnemyActedThisRound).toBe(true);
  });

  it("敌刀创在刀程外落空", () => {
    const b = climbBattle();
    b.player.pos = 0;
    b.enemy.pos = 6;
    b.intent = { kind: "bleedcut", damage: 20, bleed: 3 };
    b.intents = [b.intent];
    const hp = b.player.hp;
    const after = endTurn(b, climbTestContext());
    expect(after.player.hp).toBe(hp);
    expect(after.youBleed).toBe(0);
  });

  it("爬塔先机领先：整条照兑，不再改剩招", () => {
    const b = climbBattle();
    b.player.pos = 0;
    b.enemy.pos = 6;
    b.foePace = 1;
    b.paceBoost = 8;
    b.youSlow = 0;
    b.intents = [
      { kind: "strike", damage: 12 },
      { kind: "lunge", damage: 8 },
    ];
    b.intent = b.intents[0]!;
    b.enemyEnergy = 20;
    const after = endTurn(b, climbTestContext(), { deferIntentRefresh: true });
    expect(after.v2LastIntentRecap?.length).toBe(2);
    expect(after.intents[0]?.kind).not.toBe("guard");
  });

  it("爬塔先机差两档：不再少留一手", () => {
    const b = climbBattle();
    b.player.pos = 0;
    b.enemy.pos = 6;
    b.foePace = 12;
    b.paceBoost = 0;
    b.youSlow = 0;
    b.intents = [
      { kind: "strike", damage: 12 },
      { kind: "strike", damage: 8 },
      { kind: "guard", block: 6 },
    ];
    b.intent = b.intents[0]!;
    b.enemyEnergy = 20;
    const after = endTurn(b, climbTestContext(), { deferIntentRefresh: true });
    expect(after.v2LastIntentRecap?.length).toBeGreaterThanOrEqual(3);
  });

  it("回血招不算打击意图", () => {
    expect(foeIntentIsStrike({ kind: "mend", heal: 6 })).toBe(false);
    expect(foeIntentIsStrike({ kind: "strike", damage: 8 })).toBe(true);
  });

  it("方案 C：一档刀客上限 10、开局 6、回 4，蓝跟人走", () => {
    const b = climbBattle();
    const v = climbVitals(b.active);
    expect(b.energyMax).toBe(v.energyMax);
    expect(b.energy).toBe(v.energyStart);
    expect(b.energyRegen).toBe(v.energyRegen);
  });

  it("换人扣上场者自己的劲，下场的人余劲留在后场", () => {
    const p = applyAutoLoadout("t9-palm-saber", 1, 1);
    let b = startLabBattle(p, true, 1);
    const other = b.bench[0]!;
    const parkedId = b.active;
    b = { ...b, energy: 1, bench: b.bench.map((m) => (m.id === other.id ? { ...m, energy: 6 } : m)) };
    const after = labSwapFighter(b, other.id);
    expect(after.active).toBe(other.id);
    expect(after.energy).toBe(5);
    expect(after.bench.find((m) => m.id === parkedId)?.energy).toBe(1);
  });

  it("后场没劲换不上，不花场上的蓝", () => {
    const p = applyAutoLoadout("t9-palm-saber", 1, 1);
    const b = startLabBattle(p, true, 1);
    const other = b.bench[0]!;
    const next = { ...b, energy: 8, bench: b.bench.map((m) => (m.id === other.id ? { ...m, energy: 0 } : m)) };
    expect(labCanSwap(next, other.id).ok).toBe(false);
    expect(labSwapFighter(next, other.id).active).toBe(b.active);
  });

  it("破绽穿挡：格挡吃满面伤后仍掉 4 血", () => {
    const b = climbBattle();
    const atk = b.hand.find((c) => labCard(c.defId, climbTestContext()).type === "attack") ?? b.hand[0]!;
    const fat = {
      ...b,
      energy: 10,
      expose: 1,
      enemyBlock: 40,
      player: { ...b.player, pos: 3 },
      enemy: { ...b.enemy, pos: 4 },
      foes: [{ ...b.enemy, pos: 4 }],
    };
    const drop = fat.enemy.hp - playCard(fat, atk.uid, climbTestContext()).enemy.hp;
    expect(drop).toBe(4);
  });

  it("爬塔 chip 不出现硬拆资源", () => {
    const b = { ...climbBattle(), v2BreakMomentum: 2, qi: 4, combo: 3, flow: 2 };
    const names = statusChips(b, "you", climbTestContext()).map((c) => c.name);
    expect(names).not.toContain("拆势");
    expect(names).not.toContain("连势");
    expect(names).not.toContain("气脉");
    expect(names).not.toContain("势");
    expect(names).toContain("连击");
  });

  it("图鉴状态表无意图行、格挡一条、含失位噬血断劲剑势连击", () => {
    expect(STATUS_ENTRIES.some((s) => s.side === "intent")).toBe(false);
    expect(STATUS_ENTRIES.filter((s) => s.name === "格挡")).toHaveLength(1);
    expect(STATUS_ENTRIES.some((s) => s.name === "失位")).toBe(true);
    expect(STATUS_ENTRIES.some((s) => s.name === "噬血")).toBe(true);
    expect(STATUS_ENTRIES.some((s) => s.name === "断劲")).toBe(true);
    expect(STATUS_ENTRIES.some((s) => s.name === "剑势")).toBe(true);
    expect(STATUS_ENTRIES.some((s) => s.name === "连击")).toBe(true);
    expect(STATUS_ENTRIES.some((s) => s.name === "禁技")).toBe(true);
    expect(STATUS_ENTRIES.some((s) => s.name === "迷眼")).toBe(true);
    expect(STATUS_ENTRIES.some((s) => s.name === "连势")).toBe(false);
    expect(STATUS_ENTRIES.some((s) => s.name === "硬拆")).toBe(false);
  });
});
