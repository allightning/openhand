import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ENEMIES, ENEMY_WEAPON } from "../game/content";
import { enemyGradeForStage, enemyStrikeAtDist } from "../game/enemyGear";
import { followFromKit, GAUNTLET_FOE_IDENTITY, profileFor, schoolForGeneratedEnemy } from "../game/enemyKit";
import { ALL_SIGNATURE_IDS, SIGNATURE_BREAK } from "../game/enemySignatures";
import { DEFAULT_WEAKNESS, planBreaks, weaknessForIntent, weaknessTip } from "../game/intentWeakness";
import { intentFirePlan } from "../game/labEnemyStress";
import { applyBreak, breakLootFor, counterHitFoe, emptyV2Turn } from "../game/labV2";
import { setLabMode, setLabTuning } from "../game/labTuning";
import { SCHOOL_REACH } from "../game/party";
import { endTurn, playCard } from "../game/sim";
import type { Battle, Intent } from "../game/types";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, breakRewardCardPool, createGauntletRun } from "./gauntlet";
import { BREAK_PATH_LADDERS, GAUNTLET_PATH_LABEL, pathLadder } from "./gauntletPaths";
import { setLabRuleset } from "./labRuleset";
import { saberReachDamage } from "./rogueRoster";

function hall(path: "shaolin" | "bandit" | "court", school: "palm" | "saber" | "spear" | "staff" = "palm", stage = 1): Battle {
  const run = { ...createGauntletRun(path, school), stage };
  return startLabBattle(buildGauntletPreset(run), true, 1);
}

beforeEach(() => {
  setLabRuleset("break");
  setLabMode(true);
  setLabTuning({ rulesV2: true, v2Fx: false, enemySegBonus: 0, v2VariantAi: false, enemyStressCap: 0 });
});
afterEach(() => setLabMode(false));

describe("A 身分 + 敌兵刃", () => {
  it("巡寺棍僧 = 棍精，红格距 3", () => {
    expect(schoolForGeneratedEnemy("mob_monk_02")).toBe("staff");
    expect(ENEMY_WEAPON.mob_monk_02).toBe("staff");
    expect(ENEMIES.mob_monk_02?.name).toBe("巡寺棍僧");
    expect(SCHOOL_REACH[ENEMY_WEAPON.mob_monk_02]).toBe(3);
    expect(enemyGradeForStage(2)).toBe("jing");
    expect(profileFor("mob_monk_02", 2).grade).toBe("jing");
  });

  it("山门沙弥拳、剪径刀、皂隶拳，不再 i%6", () => {
    expect(ENEMY_WEAPON.mob_monk_01).toBe("palm");
    expect(ENEMIES.mob_monk_01?.name).toBe("山门沙弥");
    expect(ENEMY_WEAPON.mob_road_01).toBe("saber");
    expect(ENEMIES.mob_road_01?.name).toBe("剪径");
    expect(ENEMY_WEAPON.mob_yamenRunner_01).toBe("palm");
    expect(ENEMIES.mob_yamenRunner_01?.name).toBe("皂隶");
  });

  it("敌刀距 1 与 2 同伤；玩家刀贴身 10/4，就业靠裂创不是秒杀", () => {
    expect(enemyStrikeAtDist("saber", "jing", 1)).toBe(enemyStrikeAtDist("saber", "jing", 2));
    expect(enemyStrikeAtDist("saber", "jing", 1)).toBeGreaterThan(4);
    expect(saberReachDamage("cut", 1)).toBe(10);
    expect(saberReachDamage("cut", 2)).toBe(4);
  });

  it("1–2 精、3–6 玄、7+ 主神、8+ 副神", () => {
    expect(enemyGradeForStage(1)).toBe("jing");
    expect(enemyGradeForStage(2)).toBe("jing");
    expect(enemyGradeForStage(3)).toBe("xuan");
    expect(enemyGradeForStage(6)).toBe("xuan");
    expect(enemyGradeForStage(7, "main")).toBe("shen");
    expect(enemyGradeForStage(10, "main")).toBe("shen");
    expect(enemyGradeForStage(8, "extra")).toBe("shen");
    expect(enemyGradeForStage(7, "extra")).toBe("xuan");
  });

  it("精/玄/神打击档差至少 3", () => {
    const jing = enemyStrikeAtDist("palm", "jing", 1);
    const xuan = enemyStrikeAtDist("palm", "xuan", 1);
    const shen = enemyStrikeAtDist("palm", "shen", 1);
    expect(xuan - jing).toBeGreaterThanOrEqual(3);
    expect(shen - xuan).toBeGreaterThanOrEqual(3);
  });
});

describe("B 三线套件", () => {
  it("少林棍僧条含落桩；江湖刀含刀创；朝廷剑含封脉", () => {
    const shaolin = profileFor("mob_monk_02", 2).opener.map((i) => i.kind);
    const jianghu = profileFor("mob_road_01", 3).opener.map((i) => i.kind);
    const court = profileFor("mob_court_03", 6).opener.map((i) => i.kind);
    expect(shaolin).toContain("stake");
    expect(jianghu).toContain("bleedcut");
    expect(court).toContain("seal");
    expect(new Set([shaolin.join(), jianghu.join(), court.join()]).size).toBe(3);
  });

  it("馆 1–2 窄套件无杵/迷/锁/闪/霸", () => {
    const kinds = profileFor("mob_monk_01", 1).opener.map((i) => i.kind);
    expect(kinds).not.toContain("pestle");
    expect(kinds).not.toContain("dust");
    expect(kinds).not.toContain("shackle");
    expect(kinds).not.toContain("dodge");
    expect(kinds).not.toContain("endure");
  });

  it("馆 3+ 江湖刀会闪、少林棍会霸体", () => {
    expect(profileFor("mob_road_01", 3).opener.map((i) => i.kind)).toContain("dodge");
    expect(profileFor("mob_monk_02", 3).opener.map((i) => i.kind)).toContain("endure");
    expect(profileFor("mob_court_03", 6).opener.map((i) => i.kind)).toContain("dodge");
    expect(profileFor("mob_monk_04", 3).opener.map((i) => i.kind)).toContain("endure");
    expect(profileFor("mob_road_01", 3).opener.map((i) => i.kind)).not.toContain("stake");
    expect(profileFor("mob_monk_02", 2).opener.map((i) => i.kind)).toContain("stake");
  });

  it("展示名江湖", () => {
    expect(GAUNTLET_PATH_LABEL.bandit).toBe("江湖");
  });
});

describe("C 蓝条 + 数值", () => {
  it("短息上限 6 开局 4；棍僧开局能出手", () => {
    expect(profileFor("mob_road_01", 1).energy).toMatchObject({ archive: "short", max: 6, start: 4 });
    expect(profileFor("mob_monk_02", 2).energy).toMatchObject({ archive: "steady", max: 6, start: 5 });
  });

  it("馆 5+ 规划不亮必跳过的 2 费", () => {
    const b = hall("bandit", "palm", 6);
    const fire = intentFirePlan(b.enemyEnergy, b.intents);
    const skippedHeavy = b.intents.some(
      (it, i) => (it.kind === "barrage" || it.kind === "charge" || it.kind === "pestle") && fire[i]?.skip,
    );
    expect(skippedHeavy).toBe(false);
  });

  it("肉鸽 10 馆 HP/伤梯度拉开", () => {
    const ladder = pathLadder("shaolin");
    expect(ladder[0]!.hpMul).toBe(1.15);
    expect(ladder[3]!.hpMul).toBeGreaterThanOrEqual(1.5);
    expect(ladder[6]!.hpMul).toBeGreaterThanOrEqual(2.2);
    expect(ladder[9]!.hpMul).toBeGreaterThanOrEqual(2.7);
    expect(ladder[9]!.hpMul - ladder[0]!.hpMul).toBeGreaterThan(1.6);
    expect(ladder[6]!.dmgCoef).toBeGreaterThan(ladder[2]!.dmgCoef + 0.35);
    expect(ladder[9]!.dmgCoef).toBeGreaterThan(ladder[0]!.dmgCoef + 1);
  });
});

describe("D 对线 AI + 撤", () => {
  it("刀开局敌倾向拉开：条上能见撤", () => {
    const b = hall("bandit", "saber", 3);
    b.player.pos = 3;
    b.enemy.pos = 4;
    const kinds = b.intents.map((i) => i.kind);
    expect(kinds.includes("retreat") || profileFor("mob_road_01", 3).opener.some((i) => i.kind === "retreat")).toBe(true);
  });

  it("馆 1 撤只 1 格", () => {
    const retreats = profileFor("mob_road_01", 1).opener.filter((i) => i.kind === "retreat");
    expect(retreats.every((i) => i.kind === "retreat" && i.steps === 1)).toBe(true);
  });

  it("馆 4+ 贴身跟刀：桩后打，不无脑撤", () => {
    const afterStake = followFromKit(
      {
        dist: 1,
        reach: 3,
        energy: 6,
        energyMax: 8,
        hpRatio: 0.8,
        enemyBlock: 0,
        stage: 4,
        school: "staff",
        playerSchool: "saber",
        turn: 2,
        foeAtEdge: false,
        playerAtEdge: false,
        stakes: 1,
        grade: "xuan",
        opener: [],
        sigs: [],
      },
      { kind: "stake" },
    );
    expect(afterStake.kind).not.toBe("retreat");
    expect(["pestle", "strike", "lunge", "bleedcut"]).toContain(afterStake.kind);
  });

  it("馆 4+ 贴身低劲仍出手，不躺着吐纳", () => {
    const intent = followFromKit(
      {
        dist: 1,
        reach: 2,
        energy: 1,
        energyMax: 8,
        hpRatio: 0.8,
        enemyBlock: 0,
        stage: 4,
        school: "saber",
        playerSchool: "palm",
        turn: 2,
        foeAtEdge: false,
        playerAtEdge: false,
        stakes: 0,
        grade: "xuan",
        opener: [],
        sigs: [],
      },
      { kind: "strike", damage: 10 },
    );
    expect(intent.kind).not.toBe("breathe");
  });

  it("馆 1 低劲仍可吐纳", () => {
    const intent = followFromKit(
      {
        dist: 1,
        reach: 1,
        energy: 1,
        energyMax: 6,
        hpRatio: 0.9,
        enemyBlock: 0,
        stage: 1,
        school: "palm",
        playerSchool: "saber",
        turn: 1,
        foeAtEdge: false,
        playerAtEdge: false,
        stakes: 0,
        grade: "jing",
        opener: [],
        sigs: [],
      },
      { kind: "strike", damage: 6 },
    );
    expect(intent.kind).toBe("breathe");
  });
});

describe("E 追 + 覆盖律 + 特色招", () => {
  it("覆盖律：每个意图 kind 都有破法文案", () => {
    const kinds = Object.keys(DEFAULT_WEAKNESS) as Intent["kind"][];
    expect(kinds.length).toBeGreaterThanOrEqual(20);
    for (const kind of kinds) {
      expect(DEFAULT_WEAKNESS[kind]?.kind).toBeTruthy();
      const sample: Intent =
        kind === "sig"
          ? { kind: "sig", id: "luohan-array" }
          : kind === "retreat"
            ? { kind: "retreat", steps: 1 }
            : kind === "pestle"
              ? { kind: "pestle", damage: 10 }
              : kind === "dust"
                ? { kind: "dust" }
                : kind === "shackle"
                  ? { kind: "shackle" }
                  : kind === "strike"
                    ? { kind: "strike", damage: 8 }
                    : ({ kind } as Intent);
      expect(weaknessTip(sample).length).toBeGreaterThan(0);
    }
  });

  it("每个特色招都有破法", () => {
    for (const id of ALL_SIGNATURE_IDS) {
      const sig = SIGNATURE_BREAK[id];
      expect(sig.weakness.kind).toBeTruthy();
      expect(sig.label.length).toBeGreaterThan(0);
      expect(weaknessForIntent(sig.intent).kind).toBe(sig.weakness.kind);
    }
  });

  it("朝他进步且更近 + 充能 = 追（硬拆）", () => {
    const b = hall("bandit", "palm", 3);
    b.player.pos = 1;
    b.enemy.pos = 4;
    b.intents = [{ kind: "retreat", steps: 1 }];
    b.v2Turn = {
      ...emptyV2Turn(b),
      chaseCardPlayed: true,
      moveCharges: 1,
      turnStartPos: 1,
      endPos: 2,
      endDist: 2,
      endTurnCommitted: true,
    };
    const plan = planBreaks(b, b.intents, "preview");
    expect(plan.get(0)).toBe("hard");
    applyBreak(b, b.intents[0]!, 0);
    expect(b.v2TurnBreakCount).toBe(1);
    const loot = breakLootFor(b.intents[0]!);
    expect(loot?.kind).toBe("block");
  });

  it("没追 = 放，不算硬拆", () => {
    const b = hall("bandit", "palm", 3);
    b.player.pos = 1;
    b.enemy.pos = 4;
    b.intents = [{ kind: "retreat", steps: 1 }];
    b.v2Turn = { ...emptyV2Turn(b), turnStartPos: 1, endPos: 1, endDist: 3, endTurnCommitted: true };
    expect(planBreaks(b, b.intents, "preview").has(0)).toBe(false);
  });

  it("馆 7 具名带特色招", () => {
    expect(profileFor("mob_monk_08", 7).sigs.length).toBeGreaterThanOrEqual(2);
    expect(profileFor("mob_escortBand_03", 7).sigs).toContain("snare");
    expect(profileFor("mob_court_04", 7).sigs).toContain("jinyi-lock");
  });

  it("8–10 轮番兵刃互补", () => {
    for (const path of ["shaolin", "bandit", "court"] as const) {
      const e8 = BREAK_PATH_LADDERS[path][7]!;
      const ids = [e8.enemyId, ...(e8.extraEnemyIds ?? [])];
      const schools = new Set(ids.map((id) => schoolForGeneratedEnemy(id)));
      expect(schools.size).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("追实机：进步缩短距离", () => {
  it("打出进步后收势，撤段将追", () => {
    let b = hall("bandit", "palm", 3);
    b.player.pos = 1;
    b.enemy.pos = 4;
    b.intents = [{ kind: "retreat", steps: 1 }];
    b.energy = 6;
    b.hand = [{ uid: "adv", defId: "advance" }];
    b.v2Turn = { ...emptyV2Turn(b), turnStartPos: 1 };
    b = playCard(b, "adv");
    expect(b.player.pos).toBeGreaterThan(1);
    expect(b.v2Turn?.chaseCardPlayed).toBe(true);
    const next = endTurn(b);
    expect(next.v2LastIntentRecap?.some((r) => r.outcome === "追" || r.outcome === "破")).toBe(true);
  });
});

describe("闪避 / 霸体", () => {
  it("闪避吃掉一张斩，血不动；拆势真伤仍穿", () => {
    let b = hall("bandit", "saber", 3);
    b.player.pos = 2;
    b.enemy.pos = 3;
    if (b.foes[0]) b.foes[0].pos = 3;
    const hp = b.enemy.hp;
    b.foeDodge = 1;
    b.energy = 6;
    b.hand = [{ uid: "cut1", defId: "cut" }];
    b = playCard(b, "cut1");
    expect(b.enemy.hp).toBe(hp);
    expect(b.foeDodge).toBe(0);
    expect(b.lastHitRead ?? "").toMatch(/闪/);
    counterHitFoe(b, 4, "拆势打出");
    expect(b.enemy.hp).toBe(hp - 4);
  });

  it("霸体挨打但不被重掌击退", () => {
    let b = hall("bandit", "palm", 3);
    b.player.pos = 2;
    b.enemy.pos = 3;
    if (b.foes[0]) b.foes[0].pos = 3;
    b.enemyBlock = 0;
    const hp = b.enemy.hp;
    const pos = b.enemy.pos;
    b.foeEndure = 1;
    b.energy = 6;
    b.hand = [{ uid: "p1", defId: "strike2" }];
    b = playCard(b, "p1");
    expect(b.enemy.hp).toBeLessThan(hp);
    expect(b.enemy.pos).toBe(pos);
    expect(b.foeEndure).toBe(0);
  });
});

describe("破桩", () => {
  it("挡路低阶桩吃掉一刀，不伤人", () => {
    let b = hall("bandit", "saber", 3);
    b.player.pos = 1;
    b.enemy.pos = 3;
    if (b.foes[0]) b.foes[0].pos = 3;
    b.stakes = [2];
    b.stakeHits = { 2: 1 };
    b.enemyBlock = 0;
    const hp = b.enemy.hp;
    b.energy = 6;
    b.hand = [{ uid: "cut1", defId: "cut" }];
    b = playCard(b, "cut1");
    expect(b.enemy.hp).toBe(hp);
    expect(b.stakes).not.toContain(2);
    expect(b.lastHitRead ?? "").toMatch(/破桩/);
  });

  it("高阶桩刀要两下；棍一棍拆掉", () => {
    let saber = hall("bandit", "saber", 3);
    saber.player.pos = 1;
    saber.enemy.pos = 3;
    if (saber.foes[0]) saber.foes[0].pos = 3;
    saber.stakes = [2];
    saber.stakeHits = { 2: 2 };
    saber.energy = 6;
    saber.hand = [{ uid: "cut1", defId: "cut" }];
    saber = playCard(saber, "cut1");
    expect(saber.stakes).toContain(2);
    expect(saber.stakeHits?.[2]).toBe(1);

    let staff = hall("shaolin", "staff", 3);
    staff.player.pos = 1;
    staff.enemy.pos = 3;
    if (staff.foes[0]) staff.foes[0].pos = 3;
    staff.stakes = [2];
    staff.stakeHits = { 2: 2 };
    staff.energy = 6;
    staff.hand = [{ uid: "s1", defId: "split" }];
    staff = playCard(staff, "s1");
    expect(staff.stakes).not.toContain(2);
  });

  it("刀线奖励池不再塞点地，立桩仍是棍的事", () => {
    const run = { ...createGauntletRun("bandit", "saber"), stage: 4 };
    expect(breakRewardCardPool(run)).not.toContain("plant");
  });
});

describe("具名表覆盖踢馆 id", () => {
  it("identity 里的 id 都在 ENEMIES", () => {
    for (const id of Object.keys(GAUNTLET_FOE_IDENTITY)) {
      expect(ENEMIES[id], id).toBeTruthy();
    }
  });
});
