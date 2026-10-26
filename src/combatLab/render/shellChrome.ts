import { getBgmPlayback, getBgmPlayMode, getBgmVolume, getSfxVolume, HALL_PLAYLIST } from "../labAudio";
import { getLabTuning } from "../labTuning";
import { escapeHtml } from "../setupUi";

/** 按钮外包一层悬停说明。无壳层状态。 */
export function actionTipWrap(btnHtml: string, tip: string): string {
  return `<span class="lab-action-tip-wrap" data-tip="${escapeHtml(tip)}">${btnHtml}<span class="status-tip">${escapeHtml(tip)}</span></span>`;
}

export interface SettingsTrack {
  label: string;
  on: boolean;
}

export interface SettingsView {
  sfx: number;
  bgm: number;
  label: string;
  paused: boolean;
  mode: "single" | "random" | "sequence";
  tracks: SettingsTrack[];
  currentText: string;
  durationText: string;
  seekMax: number;
  seekPos: number;
}

function modeButton(view: SettingsView, id: SettingsView["mode"], label: string): string {
  const on = view.mode === id ? " primary" : "";
  return `<button type="button" class="lab-btn lab-music-mode shell-btn${on}" data-bgm-mode="${id}">${label}</button>`;
}

function trackButtons(tracks: SettingsTrack[]): string {
  if (!tracks.length) return `<p class="shell-empty">歌单是空的。</p>`;
  return tracks
    .map(
      (track, i) =>
        `<button type="button" class="lab-music-pick shell-btn${track.on ? " is-on" : ""}" data-hall-pick="${i}">${escapeHtml(track.label)}</button>`,
    )
    .join("");
}

/** 设置面板。音量、试听、歌单分成三截。 */
export function renderShellSettings(view: SettingsView): string {
  const pause = view.paused ? "播放" : "暂停";
  return `<div class="lab-overlay lab-settings-mask" id="lab-settings-mask">
    <div class="lab-overlay-panel lab-settings-panel shell-settings" data-shell="settings" role="dialog" aria-label="设置">
      <p class="shell-kicker">设置</p>
      <h3>音量与试听</h3>
      <section class="shell-settings-volume" aria-label="音量">
        <h4>音量</h4>
        <div class="lab-slider-row"><label><span>音效音量</span><span id="val-sfx">${view.sfx}</span></label>
          <input type="range" id="sl-sfx" min="0" max="100" step="1" value="${view.sfx}"/></div>
        <div class="lab-slider-row"><label><span>乐音音量</span><span id="val-bgm">${view.bgm}</span></label>
          <input type="range" id="sl-bgm" min="0" max="100" step="1" value="${view.bgm}"/></div>
        <p class="lab-music-hint">拖音效音量会响一声。</p>
      </section>
      <section class="shell-settings-audition" aria-label="试听">
        <h4>试听</h4>
        <div class="lab-music-head">
          <span class="lab-music-title" id="lab-music-title">${escapeHtml(view.label)}</span>
        </div>
        <div class="lab-music-transport" data-overlap-group="settings-audition">
          <button type="button" class="lab-btn lab-music-nav shell-btn" id="lab-music-prev" aria-label="上一曲">上一曲</button>
          <button type="button" class="lab-btn lab-music-nav shell-btn" id="lab-music-pause">${pause}</button>
          <button type="button" class="lab-btn lab-music-nav shell-btn" id="lab-music-next" aria-label="下一曲">下一曲</button>
        </div>
        <div class="lab-slider-row lab-music-seek">
          <label><span id="lab-music-cur">${escapeHtml(view.currentText)}</span><span id="lab-music-dur">${escapeHtml(view.durationText)}</span></label>
          <input type="range" id="sl-music-seek" min="0" max="${view.seekMax}" step="0.1" value="${view.seekPos}" aria-label="音乐进度"/>
        </div>
      </section>
      <section class="shell-settings-list" aria-label="歌单">
        <h4>歌单</h4>
        <div class="lab-music-modes" data-overlap-group="settings-modes">
          ${modeButton(view, "single", "单曲循环")}
          ${modeButton(view, "random", "随机")}
          ${modeButton(view, "sequence", "顺序循环")}
        </div>
        <div class="lab-music-picks" id="lab-music-picks" data-overlap-group="settings-tracks">${trackButtons(view.tracks)}</div>
        <p class="lab-music-hint">点歌写入偏好。暂停不换曲。</p>
      </section>
      <div data-overlap-group="settings-close">
        <button type="button" class="lab-btn primary shell-btn" id="lab-settings-close">好了</button>
      </div>
    </div>
  </div>`;
}

/** 设置面板 HTML。读当前音量与歌单，不碰战斗壳变量。 */
export function renderSettingsSheet(): string {
  const pb = getBgmPlayback();
  return renderShellSettings({
    sfx: getSfxVolume(),
    bgm: getBgmVolume(),
    label: pb.label,
    paused: pb.paused || !pb.playing,
    mode: getBgmPlayMode(),
    tracks: HALL_PLAYLIST.map((track, i) => ({ label: track.label, on: pb.hallIndex === i })),
    currentText: pb.currentText,
    durationText: pb.durationText,
    seekMax: pb.duration > 0 ? pb.duration : 1,
    seekPos: pb.duration > 0 ? pb.current : 0,
  });
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
