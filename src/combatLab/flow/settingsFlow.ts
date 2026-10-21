import { S } from "./shellState";
import { api } from "./shellApi";
import { renderSettingsSheet } from "../render/shellChrome";
import { bgmPlaying, cycleHallTrack, ensureBgm, getBgmPlayback, playSfx, seekBgm, selectHallTrack, setBgmPlayMode, setBgmVolume, setSfxVolume, toggleBgmPause, unlockAudio } from "../labAudio";
import { sfxSlot } from "../sfxMap";

function paintSettingsMusic(): void {
  if (!S.settingsHost || S.settingsSeekDragging) return;
  const pb = getBgmPlayback();
  const title = S.settingsHost.querySelector("#lab-music-title");
  if (title) title.textContent = pb.label;
  const cur = S.settingsHost.querySelector("#lab-music-cur");
  if (cur) cur.textContent = pb.currentText;
  const dur = S.settingsHost.querySelector("#lab-music-dur");
  if (dur) dur.textContent = pb.durationText;
  const pause = S.settingsHost.querySelector("#lab-music-pause");
  if (pause) pause.textContent = pb.paused || !pb.playing ? "播放" : "暂停";
  S.settingsHost.querySelectorAll("[data-hall-pick]").forEach((el) => {
    const i = Number((el as HTMLElement).dataset.hallPick);
    el.classList.toggle("is-on", i === pb.hallIndex);
  });
  S.settingsHost.querySelectorAll("[data-bgm-mode]").forEach((el) => {
    const m = (el as HTMLElement).dataset.bgmMode;
    el.classList.toggle("primary", m === pb.playMode);
  });
  const seek = S.settingsHost.querySelector<HTMLInputElement>("#sl-music-seek");
  if (seek) {
    const max = pb.duration > 0 ? pb.duration : 1;
    if (Number(seek.max) !== max) seek.max = String(max);
    seek.value = String(pb.duration > 0 ? pb.current : 0);
  }
}
api.paintSettingsMusic = paintSettingsMusic;

function openSettings(): void {
  api.closeSettings();
  S.settingsHost = document.createElement("div");
  S.settingsHost.id = "lab-settings-root";
  S.settingsHost.innerHTML = renderSettingsSheet();
  api.labShell().overlays.appendChild(S.settingsHost);
  S.settingsSeekDragging = false;

  S.settingsHost.querySelector("#lab-settings-close")?.addEventListener("click", api.closeSettings);
  S.settingsHost.querySelector("#lab-settings-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "lab-settings-mask") api.closeSettings();
  });

  const slSfx = S.settingsHost.querySelector<HTMLInputElement>("#sl-sfx");
  slSfx?.addEventListener("input", () => {
    const v = Number(slSfx.value);
    setSfxVolume(v);
    const label = S.settingsHost?.querySelector("#val-sfx");
    if (label) label.textContent = String(v);
    const now = Date.now();
    if (now - S.sfxPreviewAt > 180) {
      S.sfxPreviewAt = now;
      playSfx(sfxSlot("ui_confirm"));
    }
  });

  const slBgm = S.settingsHost.querySelector<HTMLInputElement>("#sl-bgm");
  slBgm?.addEventListener("input", () => {
    const v = Number(slBgm.value);
    setBgmVolume(v);
    const label = S.settingsHost?.querySelector("#val-bgm");
    if (label) label.textContent = String(v);
    if (!bgmPlaying()) ensureBgm();
  });

  const onCycle = (dir: 1 | -1) => {
    unlockAudio();
    cycleHallTrack(dir);
    api.paintSettingsMusic();
  };
  S.settingsHost.querySelector("#lab-music-prev")?.addEventListener("click", () => onCycle(-1));
  S.settingsHost.querySelector("#lab-music-next")?.addEventListener("click", () => onCycle(1));
  S.settingsHost.querySelector("#lab-music-pause")?.addEventListener("click", () => {
    unlockAudio();
    toggleBgmPause();
    api.paintSettingsMusic();
  });
  S.settingsHost.querySelectorAll("[data-hall-pick]").forEach((el) => {
    el.addEventListener("click", () => {
      unlockAudio();
      selectHallTrack(Number((el as HTMLElement).dataset.hallPick));
      api.paintSettingsMusic();
    });
  });
  S.settingsHost.querySelectorAll("[data-bgm-mode]").forEach((el) => {
    el.addEventListener("click", () => {
      const m = (el as HTMLElement).dataset.bgmMode;
      if (m === "single" || m === "random" || m === "sequence") setBgmPlayMode(m);
      api.paintSettingsMusic();
    });
  });

  const seek = S.settingsHost.querySelector<HTMLInputElement>("#sl-music-seek");
  seek?.addEventListener("pointerdown", () => {
    S.settingsSeekDragging = true;
  });
  const endSeek = () => {
    if (!S.settingsSeekDragging) return;
    S.settingsSeekDragging = false;
    api.paintSettingsMusic();
  };
  seek?.addEventListener("pointerup", endSeek);
  seek?.addEventListener("pointercancel", endSeek);
  seek?.addEventListener("change", endSeek);
  seek?.addEventListener("input", () => {
    if (!seek) return;
    unlockAudio();
    if (!bgmPlaying()) ensureBgm();
    seekBgm(Number(seek.value));
    const pb = getBgmPlayback();
    const cur = S.settingsHost?.querySelector("#lab-music-cur");
    if (cur) cur.textContent = pb.currentText;
  });

  if (S.settingsBgmPoll) clearInterval(S.settingsBgmPoll);
  S.settingsBgmPoll = setInterval(api.paintSettingsMusic, 250);
  api.paintSettingsMusic();
}
api.openSettings = openSettings;

function closeSettings(): void {
  if (S.settingsBgmPoll) {
    clearInterval(S.settingsBgmPoll);
    S.settingsBgmPoll = null;
  }
  S.settingsSeekDragging = false;
  if (!S.settingsHost) return;
  S.settingsHost.remove();
  S.settingsHost = null;
  api.syncBgmWithScreen();
}
api.closeSettings = closeSettings;
