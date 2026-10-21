import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { recentReports } from "../storage";
import { renderProdBoard } from "../prodBattleUi";
import { moveGhostPreview } from "../moveGhost";
import { threatCellsForHover } from "../labV2Ui";
import { bindLabTooltips } from "../labTooltip";
import { syncBreakDemoBattle, dismissDemoFoeDebrief } from "../breakDemo";
import { dismissHallFoeDebrief, syncHallBattle } from "../trainingHall";
import { dismissCampaignFoeDebrief, syncCampaignBattle } from "../breakCampaign";

function bindDomPart17(): void {
S.root.querySelector("#demo-foe-debrief-ok")?.addEventListener("click", () => {
    if (S.breakDemoRun && S.battle) {
      S.breakDemoRun = dismissDemoFoeDebrief(S.breakDemoRun);
      S.battle = syncBreakDemoBattle(S.battle, S.breakDemoRun);
      api.render();
      return;
    }
    if (S.hallRun && S.battle) {
      S.hallRun = dismissHallFoeDebrief(S.hallRun);
      S.battle = syncHallBattle(S.battle, S.hallRun);
      api.render();
      return;
    }
    if (S.campaignRun && S.battle) {
      S.campaignRun = dismissCampaignFoeDebrief(S.campaignRun);
      S.battle = syncCampaignBattle(S.battle, S.campaignRun);
      api.render();
    }
  });
  for (const el of S.root.querySelectorAll<HTMLButtonElement>(".lab-intent-seg[data-intent-idx]")) {
    el.addEventListener("mouseenter", () => {
      S.hoverIntentIdx = Number(el.dataset.intentIdx);
      const slot = S.root.querySelector("#strip");
      if (slot && S.battle) {
        const prev = moveGhostPreview(S.battle, S.hoverUid);
        slot.innerHTML = renderProdBoard(S.battle, prev, threatCellsForHover(S.battle, S.hoverIntentIdx));
      }
    });
    el.addEventListener("mouseleave", () => {
      S.hoverIntentIdx = null;
      const slot = S.root.querySelector("#strip");
      if (slot && S.battle) {
        const prev = moveGhostPreview(S.battle, S.hoverUid);
        slot.innerHTML = renderProdBoard(S.battle, prev, []);
      }
    });
  }
  S.root.querySelector("#btn-abort")?.addEventListener("click", () => api.endBattle("abort"));
  for (const el of S.root.querySelectorAll<HTMLElement>("[data-weapon-open]")) {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = (el as HTMLElement).dataset.weaponOpen!;
      S.weaponOpen = S.weaponOpen === id ? null : id;
      api.render();
    });
  }
  S.root.querySelector("#weapon-mask")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "weapon-mask") {
      S.weaponOpen = null;
      api.render();
    }
  });
  S.root.querySelector("#weapon-sheet-close")?.addEventListener("click", () => {
    S.weaponOpen = null;
    api.render();
  });
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-report-idx]")) {
    el.addEventListener("click", () => {
      const idx = Number(el.dataset.reportIdx);
      const r = recentReports()[idx];
      if (r) {
        S.telemetry = r;
        api.render();
      }
    });
  }
  bindLabTooltips(S.root);
}
api.bindDomPart17 = bindDomPart17;
