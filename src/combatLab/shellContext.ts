import { getContentOverrides } from "./labContentOverrides";
import { getLabTuning, isLabMode, resolveFightScale } from "./labTuning";
import { makeContext, type RunContext } from "../game/runContext";
import { getLabRuleset } from "./labRuleset";

/** 壳层战斗入口的 rc。每次按当前 mode / tuning / lab 现造。 */
export function shellRunContext(): RunContext {
  return makeContext(getLabRuleset(), getLabTuning(), isLabMode(), getContentOverrides(), resolveFightScale());
}
