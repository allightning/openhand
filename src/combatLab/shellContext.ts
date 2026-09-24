import { getContentOverrides } from "../game/labContentOverrides";
import { getLabTuning, isLabMode } from "../game/labTuning";
import { makeContext, type RunContext } from "../game/runContext";
import { getLabRuleset } from "./labRuleset";

/** 壳层战斗入口的 rc。每次按当前 mode / tuning / lab 现造，与 contextNow 同值。 */
export function shellRunContext(): RunContext {
  return makeContext(getLabRuleset(), getLabTuning(), isLabMode(), getContentOverrides());
}
