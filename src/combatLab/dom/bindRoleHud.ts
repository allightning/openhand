import type { WeaponId } from "../../game/types";
import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { gauntletFieldMate } from "../gauntlet";
import { applyProfAct, type ProfAct } from "../render/roleHud";
import { applyHallSwap } from "../render/weaponSwap";

function isProfAct(value: string | undefined): value is ProfAct {
  return value === "advance" || value === "see" || value === "cheat";
}

function bindRoleHud(): void {
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-swap-school]")) {
    el.addEventListener("click", () => {
      if (!S.gauntletRun || el.disabled) return;
      const school = el.dataset.swapSchool as WeaponId;
      const mate = S.loadoutFocusMate ?? gauntletFieldMate(S.gauntletRun.school);
      S.gauntletRun = applyHallSwap(S.gauntletRun, mate, school, S.phase === "battle");
      api.render();
    });
  }
  for (const el of S.root.querySelectorAll<HTMLButtonElement>("[data-prof-act]")) {
    el.addEventListener("click", () => {
      if (!S.battle || el.disabled || !isProfAct(el.dataset.profAct)) return;
      const note = applyProfAct(S.battle, el.dataset.profAct);
      if (note) S.battle.lastHitRead = note;
      api.render();
    });
  }
}
api.bindRoleHud = bindRoleHud;
