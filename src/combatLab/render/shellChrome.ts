import { getBgmPlayback, getBgmPlayMode, getBgmVolume, getSfxVolume, HALL_PLAYLIST } from "../labAudio";
import { getLabTuning } from "../labTuning";
import { escapeHtml } from "../setupUi";

/** 按钮外包一层悬停说明。无壳层状态。 */
export function actionTipWrap(btnHtml: string, tip: string): string {
  return `<span class="lab-action-tip-wrap" data-tip="${escapeHtml(tip)}">${btnHtml}<span class="status-tip">${escapeHtml(tip)}</span></span>`;
}

/** 设置面板 HTML。只读当前音量 / 歌单，不碰战斗壳变量。 */
export function renderSettingsSheet(): string {
  const pb = getBgmPlayback();
  const max = pb.duration > 0 ? pb.duration : 1;
  const pos = pb.duration > 0 ? pb.current : 0;
  const mode = getBgmPlayMode();
  const modeBtn = (id: "single" | "random" | "sequence", label: string) =>
    `<button type="button" class="lab-btn lab-music-mode${mode === id ? " primary" : ""}" data-bgm-mode="${id}">${label}</button>`;
  const tracks = HALL_PLAYLIST.map(
    (t, i) =>
      `<button type="button" class="lab-music-pick${pb.hallIndex === i ? " is-on" : ""}" data-hall-pick="${i}">${t.label}</button>`,
  ).join("");
  return `<div class="lab-overlay lab-settings-mask" id="lab-settings-mask">
    <div class="lab-overlay-panel lab-settings-panel" role="dialog" aria-label="设置">
      <h3>设置</h3>
      <div class="lab-slider-row"><label><span>音效音量</span><span id="val-sfx">${getSfxVolume()}</span></label>
        <input type="range" id="sl-sfx" min="0" max="100" step="1" value="${getSfxVolume()}"/></div>
      <div class="lab-slider-row"><label><span>乐音音量</span><span id="val-bgm">${getBgmVolume()}</span></label>
        <input type="range" id="sl-bgm" min="0" max="100" step="1" value="${getBgmVolume()}"/></div>
      <div class="lab-music-block">
        <div class="lab-music-head">
          <span class="lab-music-kicker">歌单</span>
          <span class="lab-music-title" id="lab-music-title">${pb.label}</span>
        </div>
        <div class="lab-music-transport">
          <button type="button" class="lab-btn lab-music-nav" id="lab-music-prev" aria-label="上一曲">上一曲</button>
          <button type="button" class="lab-btn lab-music-nav" id="lab-music-pause">${pb.paused || !pb.playing ? "播放" : "暂停"}</button>
          <button type="button" class="lab-btn lab-music-nav" id="lab-music-next" aria-label="下一曲">下一曲</button>
        </div>
        <div class="lab-music-modes">
          ${modeBtn("single", "单曲循环")}
          ${modeBtn("random", "随机")}
          ${modeBtn("sequence", "顺序循环")}
        </div>
        <div class="lab-music-picks" id="lab-music-picks">${tracks}</div>
        <div class="lab-slider-row lab-music-seek">
          <label><span id="lab-music-cur">${pb.currentText}</span><span id="lab-music-dur">${pb.durationText}</span></label>
          <input type="range" id="sl-music-seek" min="0" max="${max}" step="0.1" value="${pos}" aria-label="音乐进度"/>
        </div>
        <p class="lab-music-hint">点歌写入偏好；暂停不换曲。单曲循环 / 随机 / 顺序循环三种模式。</p>
      </div>
      <button type="button" class="lab-btn primary" id="lab-settings-close">好了</button>
    </div>
  </div>`;
}

/** 暂停面板里的行路调参滑条。只读 getLabTuning()。 */
export function renderSliders(enabled: boolean): string {
  const t = getLabTuning();
  const dis = enabled ? "" : "disabled";
  const breakRow = `<div class="lab-slider-row"><label><span>破招窗口（遗留）</span><span id="val-break">${t.breakWindow}</span></label>
      <input type="range" id="sl-break" min="0" max="100" step="5" value="${t.breakWindow}" ${dis}/></div>`;
  return `
    <p class="muted lab-pause-mode">行路调参</p>
    <div class="lab-slider-row"><label><span>伤害系数</span><span id="val-dmg">${t.dmgCoef.toFixed(2)}</span></label>
      <input type="range" id="sl-dmg" min="0.25" max="2" step="0.05" value="${t.dmgCoef}" ${dis}/></div>
    ${breakRow}
    <div class="lab-slider-row"><label><span>先机偏置</span><span id="val-pace">${t.paceBias}</span></label>
      <input type="range" id="sl-pace" min="-3" max="5" step="1" value="${t.paceBias}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>敌招激进度</span><span id="val-ai">${t.aiAggression}</span></label>
      <input type="range" id="sl-ai" min="0" max="100" step="5" value="${t.aiAggression}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>单回合时限(秒)</span><span id="val-limit">${t.turnLimitSec}</span></label>
      <input type="range" id="sl-limit" min="0" max="120" step="5" value="${t.turnLimitSec}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>牌堆乘数</span><span id="val-deck-mult-pause">${t.deckMultiplier}</span></label>
      <input type="range" id="sl-deck-mult-pause" min="1" max="10" step="1" value="${t.deckMultiplier}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>敌气血倍率</span><span id="val-enemy-hp">${t.enemyHpMul.toFixed(2)}</span></label>
      <input type="range" id="sl-enemy-hp" min="1" max="2.5" step="0.05" value="${t.enemyHpMul}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>敌段加成</span><span id="val-enemy-seg">${t.enemySegBonus}</span></label>
      <input type="range" id="sl-enemy-seg" min="0" max="3" step="1" value="${t.enemySegBonus}" ${dis}/></div>
    <div class="lab-slider-row"><label><span>应激上限（含破招应激）</span><span id="val-enemy-stress">${t.enemyStressCap}</span></label>
      <input type="range" id="sl-enemy-stress" min="0" max="5" step="1" value="${t.enemyStressCap}" ${dis}/></div>
    <div class="lab-v2-toggles">
      <label class="lab-check"><input type="checkbox" id="tog-v2" ${t.rulesV2 ? "checked" : ""} ${dis}/><span>v2 规则</span></label>
      <label class="lab-check"><input type="checkbox" id="tog-fx" ${t.v2Fx ? "checked" : ""} ${dis}/><span>演出</span></label>
      <label class="lab-check"><input type="checkbox" id="tog-variant" ${t.v2VariantAi ? "checked" : ""} ${dis}/><span>变招</span></label>
      <label class="lab-check"><input type="checkbox" id="tog-grudge" ${t.v2Grudge ? "checked" : ""} ${dis}/><span>鏖战</span></label>
      <label class="lab-check"><input type="checkbox" id="tog-combo" ${t.rulesCombo ? "checked" : ""} ${dis}/><span>组合技 §16</span></label>
    </div>`;
}
