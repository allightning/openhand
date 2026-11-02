import { S } from "../flow/shellState";
import { api } from "../flow/shellApi";
import { shellRunContext } from "../shellContext";
import { applyReactChoice, isReactSec, writeReactSec, type ReactBattle } from "./reactChoice";

let waitTimer: number | null = null;
let armedKey: string | null = null;
let afterReact: (() => void) | null = null;

function deferUntilReact(go: () => void): boolean {
  if (!S.battle?.reactionWindow) return false;
  afterReact = go;
  api.render();
  return true;
}

function continueAfterReact(): void {
  const go = afterReact;
  afterReact = null;
  go?.();
}
api.deferUntilReact = deferUntilReact;
api.continueAfterReact = continueAfterReact;

function clearWait(): void {
  if (waitTimer != null) window.clearTimeout(waitTimer);
  waitTimer = null;
}

function battle(): ReactBattle | null {
  return (S.battle as ReactBattle | null) ?? null;
}

function finishChoice(next: ReactBattle): void {
  S.battle = next;
  api.render();
  if (next.reactionWindow) return;
  const go = (): void => {
    if (S.battle && (S.battle as ReactBattle).reactionLanded) {
      const cur = S.battle as ReactBattle;
      S.battle = { ...cur, reactionLanded: undefined };
      api.render();
    }
    api.continueAfterReact();
  };
  if (next.reactionLanded) window.setTimeout(go, 320);
  else go();
}

function choose(take: boolean): void {
  const b = battle();
  if (!b?.reactionWindow || S.paused) return;
  clearWait();
  armedKey = null;
  finishChoice(applyReactChoice(b, take, shellRunContext()));
}

function setSec(sec: number): void {
  const b = battle();
  if (!b?.reactionWindow || !isReactSec(sec)) return;
  clearWait();
  armedKey = null;
  S.battle = writeReactSec(b, sec);
  api.render();
}

function armWait(): void {
  const b = battle();
  if (!b?.reactionWindow || b.reactionLanded) {
    clearWait();
    armedKey = null;
    return;
  }
  const sec = isReactSec(b.reactionSec ?? 0) ? b.reactionSec! : 5;
  const key = `${b.turn}:${b.reactionWindow.kind}:${sec}`;
  if (armedKey === key) return;
  clearWait();
  armedKey = key;
  waitTimer = window.setTimeout(() => choose(false), sec * 1000);
}

function bindReact(): void {
  S.root.querySelector("#react-take")?.addEventListener("click", () => choose(true));
  S.root.querySelector("#react-drop")?.addEventListener("click", () => choose(false));
  for (const sec of [3, 5, 10]) {
    S.root.querySelector(`#react-sec-${sec}`)?.addEventListener("click", () => setSec(sec));
  }
  armWait();
}
api.bindReact = bindReact;
