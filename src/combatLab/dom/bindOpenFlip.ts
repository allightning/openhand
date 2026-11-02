import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { flipOpenCard, openPageId, pickOpenCard, writeHeroName } from "../render/openFlip";

function bindOpenFlip(): void {
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-open-flip]")) {
    el.addEventListener("click", () => {
      if (!S.gauntletRun || el.disabled) return;
      const page = openPageId(S.gauntletRun);
      if (page !== "s3-open-a" && page !== "s3-open-b") return;
      const index = Number(el.dataset.openFlip);
      if (!Number.isFinite(index)) return;
      const flipped = (S.gauntletRun as { openFlipped?: number[] }).openFlipped ?? [];
      S.gauntletRun = flipped.includes(index) ? pickOpenCard(S.gauntletRun, index) : flipOpenCard(S.gauntletRun, index);
      api.render();
    });
  }
  S.root.querySelector("#open-name-keep")?.addEventListener("click", () => {
    if (!S.gauntletRun || openPageId(S.gauntletRun) !== "s3-open-name") return;
    const input = S.root.querySelector<HTMLInputElement>("#open-hero-name");
    S.gauntletRun = writeHeroName(S.gauntletRun, input?.value ?? "");
    api.render();
  });
}
api.bindOpenFlip = bindOpenFlip;
