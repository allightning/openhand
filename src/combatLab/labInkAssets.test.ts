import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { startLabBattle } from "./factory";
import { buildGauntletPreset, createGauntletRun } from "./gauntlet";
import { renderProdBattle } from "./prodBattleUi";
import { setLabRuleset } from "./labRuleset";
import type { Battle } from "../game/types";

const PUB = resolve(__dirname, "../../public");

/** 刀线（saber）开局即沈夜行上场。 */
function saberBattle(fx: string[] = []): Battle {
  const run = createGauntletRun("bandit", "saber");
  const b = startLabBattle(buildGauntletPreset(run), false, 1);
  b.v2FxQueue = fx;
  return b;
}

function battleHtml(b: Battle): string {
  return renderProdBattle({
    b,
    prev: null,
    hoverUid: null,
    hoverIntentIdx: null,
    weaponId: "saber-a-3",
    canPlay: () => ({ ok: true }),
    actionRowHtml: "",
    entranceNote: "",
    freshNote: "",
    fxClass: "",
    pauseOverlay: "",
    toolbarExtra: "",
    weaponSheetHtml: "",
    gauntletStage: 1,
  });
}

describe("水墨资产接入", () => {
  it("沈夜行（watch）站位用立绘原图，不走抠图精灵", () => {
    setLabRuleset("break");
    const html = battleHtml(saberBattle());
    expect(html).toContain("art/char/hero/full.png");
    expect(html).not.toContain("char-sprite");
  });

  it("战斗明示敌方剩余人数：单敌 / 多敌 / 含替补", () => {
    setLabRuleset("break");
    const single = battleHtml(saberBattle());
    expect(single).toContain("敌方剩 1 人");
    expect(single).not.toContain("含替补");

    const multi = saberBattle();
    multi.foes = [multi.enemy, { ...multi.enemy, id: "mob_road_02", name: "副手", hp: 10, maxHp: 10 }];
    expect(battleHtml(multi)).toContain("敌方剩 2 人");

    const wave = saberBattle();
    wave.gauntletWaveEnemy = "mob_road_02";
    const waveHtml = battleHtml(wave);
    expect(waveHtml).toContain("敌方剩 2 人");
    expect(waveHtml).toContain("含替补");
  });

  it("斩杀/拆招落敌位；敌打我/让刀/撞墙落己位", () => {
    expect(battleHtml(saberBattle(["kill"]))).toContain("slash_arc");
    expect(battleHtml(saberBattle(["break"]))).toContain("slash_line");
    expect(battleHtml(saberBattle(["counter"]))).toContain("slash_line");
    const hit = battleHtml(saberBattle(["hit"]));
    expect(hit).toContain("lab-slash-overlay");
    expect(hit).toContain("slash_line");
    expect(hit).toMatch(/fig you[\s\S]*lab-slash-overlay/);
    expect(hit).not.toMatch(/lab-stand-slot[\s\S]*?lab-slash-overlay[\s\S]*?stage-core/);
    const wall = battleHtml(saberBattle(["wall"]));
    expect(wall).toContain("lab-slash-overlay");
    expect(wall).toContain("slash_line");
    expect(battleHtml(saberBattle([]))).not.toContain("lab-slash-overlay");
  });

  it("桩格用水墨桩图；助战符用本系立绘", () => {
    const staked = saberBattle();
    staked.player.pos = 0;
    staked.enemy.pos = 6;
    staked.stakes = [3];
    expect(battleHtml(staked)).toContain("stake-low.png");
    const aid = saberBattle();
    aid.player.pos = 0;
    aid.enemy.pos = 6;
    aid.labSummon = { school: "palm", name: "铁牛", pos: 3, hp: 10, maxHp: 10, taunt: true };
    const html = battleHtml(aid);
    expect(html).toContain("art/char/");
    expect(html).toContain("铁牛");
  });

  it("战场恢复码头背景图（水墨画框方案已回退）", () => {
    const html = battleHtml(saberBattle());
    expect(html).toContain("background-image");
    // 预演条已恢复：悬停卡牌亮实际效果，无悬停亮态势行
    expect(html).toContain('id="preview-slot"');
  });

  it("素材文件齐备：立绘原图 / 刀光×2 / 音效×4 / 多曲 BGM", () => {
    for (const p of [
      "art/char/hero/full.png",
      "art/char/baimenghe/full.png",
      "art/char/elite_monk_ward/full.png",
      "art/char/mook_road_saber/full.png",
      "art/vfx/slash_arc.png",
      "art/vfx/slash_line.png",
      "art/vfx/stake-low.png",
      "art/vfx/stake-high.png",
      "art/audio/sfx/swing.mp3",
      "art/audio/sfx/clash.wav",
      "art/audio/sfx/page.wav",
      "art/audio/sfx/drop.mp3",
      "art/audio/bgm/hall_a.mp3",
      "art/audio/bgm/hall_b.mp3",
      "art/audio/bgm/hall_c.mp3",
      "art/audio/bgm/hall_voice.mp3",
      "art/audio/bgm/jianghu_gym.mp3",
      "art/audio/bgm/break_voice.mp3",
      "art/audio/bgm/break_campaign.mp3",
      "art/audio/bgm/jianghu_normal.mp3",
      "art/audio/bgm/jianghu_normal_b.mp3",
      "art/audio/bgm/jianghu_elite.mp3",
      "art/audio/bgm/jianghu_boss.mp3",
      "art/audio/bgm/shaolin_normal.mp3",
      "art/audio/bgm/shaolin_elite.mp3",
      "art/audio/bgm/shaolin_boss.mp3",
      "art/audio/bgm/court_normal.mp3",
      "art/audio/bgm/court_elite.mp3",
      "art/audio/bgm/court_boss.mp3",
      "art/audio/bgm/sting_win.mp3",
      "art/audio/bgm/sting_lose.mp3",
      "art/ui/ink-border-a.png",
      "art/ui/ink-border-b.png",
      "art/scenes/scene-quiet-gate.png",
      "art/scenes/scene-quiet-fork.png",
    ]) {
      expect(existsSync(resolve(PUB, p)), p).toBe(true);
    }
  });

  it("水墨边框是真透明通道，中心不是棋盘格 RGB", () => {
    for (const p of ["art/ui/ink-border-a.png", "art/ui/ink-border-b.png"]) {
      const buf = readFileSync(resolve(PUB, p));
      expect(buf[25], p).toBe(6); // IHDR color type: RGBA
    }
  });
});
