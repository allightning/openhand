import { BOARD_SIZE, type Battle } from "../../game/types";

/** 行路缺省板长。结算字段未写入前，画面用这个。 */
export const CLIMB_BOARD_DEFAULT = 9;
/** 登门缺省板长，与改前 7 格末格壁一致。 */
export const BREAK_BOARD_DEFAULT = 7;

export type WallEnds = "both" | "high" | "low" | "none";
export type BoardEnv = "" | "burn" | "nowall" | "gap-end" | "gap-mid";

const ENVS = new Set<BoardEnv>(["burn", "nowall", "gap-end", "gap-mid"]);

type BoardFields = {
  boardSize?: number;
  wallEnds?: WallEnds;
  wallSide?: "low" | "high";
  boardEnv?: string;
};

export type BoardLayout = {
  size: number;
  wallEnds: WallEnds;
  wallSide: "low" | "high";
  env: BoardEnv;
  /** 文案键。正文留给遭遇窗，这里只留键。 */
  envKey: string;
  fieldsMissing: boolean;
  gapCells: number[];
};

export function boardLayout(b: Battle, mode: "climb" | "break"): BoardLayout {
  const extra = b as Battle & BoardFields;
  const fieldsMissing = typeof extra.boardSize !== "number";
  const size = fieldsMissing
    ? mode === "break"
      ? BREAK_BOARD_DEFAULT
      : CLIMB_BOARD_DEFAULT
    : Math.max(1, extra.boardSize ?? BOARD_SIZE);
  let wallEnds: WallEnds = extra.wallEnds ?? (mode === "break" && fieldsMissing ? "both" : "high");
  if (wallEnds !== "both" && wallEnds !== "high" && wallEnds !== "low" && wallEnds !== "none") {
    wallEnds = "high";
  }
  const wallSide = extra.wallSide === "low" ? "low" : "high";
  const rawEnv = extra.boardEnv ?? "";
  const env: BoardEnv = ENVS.has(rawEnv as BoardEnv) ? (rawEnv as BoardEnv) : "";
  const gapCells: number[] = [];
  if (env === "gap-end" && size > 1) gapCells.push(size - 1);
  if (env === "gap-mid" && size > 2) gapCells.push(Math.floor(size / 2));
  return {
    size,
    wallEnds,
    wallSide,
    env,
    envKey: env ? `env.${env}` : "",
    fieldsMissing,
    gapCells,
  };
}

/** 单墙画在高侧还是低侧外面。两端都有壁时不另画墙标。 */
export function outsideWallSide(layout: BoardLayout): "low" | "high" | null {
  if (layout.wallEnds === "both" || layout.wallEnds === "none") return null;
  if (layout.wallEnds === "low") return "low";
  return layout.wallSide === "low" ? "low" : "high";
}

export function cellIsWall(layout: BoardLayout, index: number): boolean {
  return layout.wallEnds === "both" && index === layout.size - 1;
}
