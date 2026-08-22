/**
 * 四维度 NPC 立绘（北宋市井）
 * A 年龄轮廓 · B 性别轮廓 · C 职业装 · D 配色（仅微调，不单独区分身份）
 * 禁止：纯换色 / scale 冒充年龄 / 蓝色主色 / 同轮廓跨身份
 */
export type NpcAge = "child" | "young" | "mid" | "old";
export type NpcGender = "m" | "f";
export type NpcJob =
  | "yamen"
  | "yanbo"
  | "taibai"
  | "martial"
  | "merchant"
  | "folk"
  | "clergy"
  | "post"
  | "foreign"; // 胡商

/** 禁蓝；商贾靛青改为赭黄镶边 */
export type NpcPalette =
  | "yamenInk"
  | "yanboRouge"
  | "taibaiEarth"
  | "martialIron"
  | "merchantOchre"
  | "folkInk"
  | "clergyOchre"
  | "postOchre"
  | "foreignSand";

/** 轮廓变体：同 A×B×C 时靠 variant 拉开唯一性 */
export type ContourVariant =
  | "base"
  | "apron"
  | "fat"
  | "belt"
  | "shawl"
  | "staff"
  | "satchel"
  | "patch"
  | "wrap"
  | "skirt"
  | "topknot"
  | "twinbun"
  | "ragged"
  | "lute"
  | "blade";

export interface SpriteDims {
  age: NpcAge;
  gender: NpcGender;
  job: NpcJob;
  variant: ContourVariant;
  palette: NpcPalette;
}

export function silhouetteKey(d: SpriteDims): string {
  return `${d.age}_${d.gender}_${d.job}_${d.variant}`;
}

/** 职业 → 默认配色（北宋土色系，无蓝） */
export const JOB_PALETTE: Record<NpcJob, NpcPalette> = {
  yamen: "yamenInk",
  yanbo: "yanboRouge",
  taibai: "taibaiEarth",
  martial: "martialIron",
  merchant: "merchantOchre",
  folk: "folkInk",
  clergy: "clergyOchre",
  post: "postOchre",
  foreign: "foreignSand",
};

/** 任意两 NPC 的 silhouetteKey 不得相同 */
export function assertSpriteUniqueness(
  list: { id: string; dims: SpriteDims }[],
): { ok: boolean; dupes: string[] } {
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const n of list) {
    const k = silhouetteKey(n.dims);
    if (seen.has(k)) dupes.push(`${n.id}~${seen.get(k)}:${k}`);
    else seen.set(k, n.id);
  }
  return { ok: dupes.length === 0, dupes };
}

/** 男女比 ≈ target（男/女），默认 1.5±0.3 */
export function assertGenderRatio(
  list: { gender: NpcGender }[],
  target = 1.5,
  tolerance = 0.3,
): { ok: boolean; male: number; female: number; ratio: number } {
  const male = list.filter((n) => n.gender === "m").length;
  const female = list.filter((n) => n.gender === "f").length;
  const ratio = female === 0 ? Infinity : male / female;
  const ok = Number.isFinite(ratio) && Math.abs(ratio - target) <= tolerance;
  return { ok, male, female, ratio };
}

/**
 * 内联 SVG 轮廓：年龄/性别/职业配饰各自改 path，禁止用 transform:scale 冒充。
 * viewBox 统一 0 0 40 48，脚底对齐。
 */
export function silhouetteSvg(d: SpriteDims): string {
  const skin = d.age === "old" ? "#cbb896" : "#d4b896";
  const cloth = clothColor(d.palette);
  const accent = accentColor(d.palette, d.job);
  const body = bodyPaths(d);
  return `<svg class="npc-sil age-${d.age} gen-${d.gender} job-${d.job} var-${d.variant}" viewBox="0 0 40 48" width="36" height="44" aria-hidden="true">
    <ellipse cx="20" cy="45" rx="8" ry="2" fill="#1a1410" opacity=".25"/>
    ${body.staff ?? ""}
    ${body.legs}
    ${body.torso}
    ${body.arms}
    ${body.head}
    ${body.hair}
    ${body.gear ?? ""}
    <style>
      .npc-sil .skin{fill:${skin}}
      .npc-sil .cloth{fill:${cloth}}
      .npc-sil .accent{fill:${accent}}
      .npc-sil .ink{fill:#2a2218}
      .npc-sil .warm{fill:#cbb896}
    </style>
  </svg>`;
}

function clothColor(p: NpcPalette): string {
  switch (p) {
    case "yamenInk":
      return "#2a2a2e";
    case "yanboRouge":
      return "#8b3a4a";
    case "taibaiEarth":
      return "#6b4a32";
    case "martialIron":
      return "#4a4a52";
    case "merchantOchre":
      return "#8a6a38";
    case "folkInk":
      return "#5a5248";
    case "clergyOchre":
      return "#c4a070";
    case "postOchre":
      return "#9a6a40";
    case "foreignSand":
      return "#a07850";
  }
}

function accentColor(p: NpcPalette, job: NpcJob): string {
  if (job === "yamen") return "#8b2a24";
  if (job === "yanbo") return "#e8c4b8";
  if (job === "martial") return "#8b2a24";
  if (job === "taibai") return "#e8dcc0";
  if (p === "merchantOchre") return "#c4a060";
  return "#cbb896";
}

function bodyPaths(d: SpriteDims): {
  head: string;
  hair: string;
  torso: string;
  arms: string;
  legs: string;
  staff?: string;
  gear?: string;
} {
  const child = d.age === "child";
  const old = d.age === "old";
  const fem = d.gender === "f";

  // —— 头：孩童大头；老者略小+白须 ——
  let head: string;
  let hair: string;
  if (child) {
    head = `<circle class="skin" cx="20" cy="11" r="7"/>`;
    if (fem || d.variant === "twinbun") {
      hair = `<circle class="ink" cx="14" cy="8" r="3"/><circle class="ink" cx="26" cy="8" r="3"/><path class="ink" d="M13 12 Q20 6 27 12"/>`;
    } else {
      hair = `<path class="ink" d="M13 10 Q20 4 27 10 L26 14 Q20 11 14 14 Z"/><circle class="ink" cx="20" cy="6" r="2.2"/>`; // 总角
    }
  } else if (old) {
    head = `<circle class="skin" cx="20" cy="${fem ? 12 : 13}" r="5.5"/>`;
    hair = fem
      ? `<path class="warm" d="M14 12 Q20 5 26 12 L25 16 Q20 13 15 16 Z"/>`
      : `<path class="warm" d="M14 13 Q20 7 26 13"/><path class="warm" d="M16 18 Q20 22 24 18"/>`; // 白须
  } else if (fem) {
    head = `<circle class="skin" cx="20" cy="12" r="5.5"/>`;
    hair =
      d.variant === "shawl" || d.job === "yanbo"
        ? `<path class="ink" d="M12 14 Q20 4 28 14 L27 22 Q20 18 13 22 Z"/><path class="accent" d="M10 20 Q20 28 30 20" opacity=".85"/>`
        : `<path class="ink" d="M13 12 Q20 5 27 12 L26 18 Q20 15 14 18 Z"/>`;
  } else {
    head = `<circle class="skin" cx="20" cy="12" r="5.2"/>`;
    hair =
      d.job === "yamen" || d.variant === "belt"
        ? `<path class="ink" d="M12 12 L20 6 L28 12 L26 14 L14 14 Z"/>` // 幞头意象
        : `<path class="ink" d="M14 11 Q20 5 26 11 L25 14 Q20 12 15 14 Z"/>`;
  }

  // —— 躯干：女窄腰襦裙；男宽肩；孩短褐；老佝偻 ——
  let torso: string;
  let arms: string;
  let legs: string;
  if (child) {
    torso = `<path class="cloth" d="M14 18 L26 18 L25 30 L15 30 Z"/>`;
    if (d.variant === "apron" || d.job === "taibai") {
      torso += `<path class="accent" d="M16 22 L24 22 L23 30 L17 30 Z"/>`;
    }
    arms = `<path class="cloth" d="M14 19 L10 28 L13 29 L16 21"/><path class="cloth" d="M26 19 L30 28 L27 29 L24 21"/>`;
    legs = `<path class="cloth" d="M16 30 L14 40 L18 40 L19 31"/><path class="cloth" d="M24 30 L26 40 L22 40 L21 31"/>`;
  } else if (old) {
    // 佝偻：躯干前倾
    torso = `<path class="cloth" d="M15 18 L27 20 L24 34 L14 32 Z"/>`;
    arms = `<path class="cloth" d="M15 20 L9 30 L12 31 L17 22"/><path class="cloth" d="M26 21 L32 29 L29 31 L24 23"/>`;
    legs = `<path class="cloth" d="M15 33 L13 44 L17 44 L18 34"/><path class="cloth" d="M23 34 L25 44 L21 44 L20 35"/>`;
  } else if (fem) {
    torso = `<path class="cloth" d="M15 17 L25 17 L27 28 L24 36 L16 36 L13 28 Z"/>`; // 束腰+襦裙下摆
    if (d.variant === "shawl" || d.job === "yanbo") {
      torso += `<path class="accent" d="M12 18 Q20 24 28 18 L27 22 Q20 26 13 22 Z" opacity=".9"/>`;
    }
    if (d.variant === "apron") {
      torso += `<path class="accent" d="M17 24 L23 24 L22 34 L18 34 Z"/>`;
    }
    arms = `<path class="cloth" d="M15 18 L10 28 L13 29 L17 20"/><path class="cloth" d="M25 18 L30 28 L27 29 L23 20"/>`;
    legs = `<path class="cloth" d="M17 36 L16 44 L19 44 L19 36"/><path class="cloth" d="M23 36 L24 44 L21 44 L21 36"/>`;
  } else {
    // 男：宽肩袍裤；厨子胖轮廓
    if (d.variant === "fat") {
      torso = `<path class="cloth" d="M12 17 L28 17 L29 34 L11 34 Z"/>`;
    } else {
      torso = `<path class="cloth" d="M13 17 L27 17 L26 34 L14 34 Z"/>`;
    }
    if (d.variant === "apron" || d.job === "taibai") {
      torso += `<path class="accent" d="M16 22 L24 22 L23 34 L17 34 Z"/>`;
    }
    if (d.variant === "belt" || d.job === "yamen") {
      torso += `<rect class="accent" x="14" y="26" width="12" height="2.5"/>`;
    }
    if (d.variant === "patch") {
      torso += `<rect class="accent" x="22" y="28" width="4" height="4" opacity=".7"/>`;
    }
    arms = `<path class="cloth" d="M13 18 L8 30 L11 31 L16 20"/><path class="cloth" d="M27 18 L32 30 L29 31 L24 20"/>`;
    if (d.variant === "wrap" || d.job === "martial") {
      legs = `<path class="cloth" d="M15 34 L13 44 L18 44 L19 34"/><path class="cloth" d="M25 34 L27 44 L22 44 L21 34"/><rect class="accent" x="13" y="40" width="5" height="2"/><rect class="accent" x="22" y="40" width="5" height="2"/>`;
    } else {
      legs = `<path class="cloth" d="M15 34 L13 44 L18 44 L19 34"/><path class="cloth" d="M25 34 L27 44 L22 44 L21 34"/>`;
    }
  }

  let staff: string | undefined;
  if (old || d.variant === "staff") {
    staff = `<path stroke="#6b5344" stroke-width="1.6" d="M28 16 L32 44"/>`;
  }

  let gear: string | undefined;
  if (d.variant === "satchel" || d.job === "post") {
    gear = `<path class="accent" d="M24 24 L30 26 L29 32 L23 30 Z"/>`;
  }
  if (d.variant === "lute") {
    gear = `<ellipse class="accent" cx="30" cy="28" rx="4" ry="6"/><rect class="ink" x="29" y="18" width="2" height="10"/>`;
  }
  if (d.variant === "blade" || (d.job === "martial" && d.variant === "wrap")) {
    gear = (gear ?? "") + `<path class="accent" d="M8 22 L6 34 L9 34 L10 24 Z"/>`;
  }
  if (d.variant === "ragged") {
    torso += `<path class="accent" d="M14 30 L12 36 L16 34" opacity=".8"/>`;
  }

  return { head, hair, torso, arms, legs, staff, gear };
}

/** 从身份字段解析四维（供表驱动） */
export function resolveDims(input: {
  age: NpcAge;
  gender: NpcGender;
  job: NpcJob;
  variant?: ContourVariant;
  palette?: NpcPalette;
}): SpriteDims {
  return {
    age: input.age,
    gender: input.gender,
    job: input.job,
    variant: input.variant ?? "base",
    palette: input.palette ?? JOB_PALETTE[input.job],
  };
}
