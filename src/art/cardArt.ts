/** Wuxia card 立绘. Ink figure + cinnabar motion, not a face portrait. */

const INK = "#1a1410";
const WASH = "#3a2a22";
const CINN = "#c43a32";
const GOLD = "#d4b45a";
const PAPER = "#e8dcc4";

function sky(id: string, warm = false): string {
  const a = warm ? "#4a2418" : "#2a221c";
  const b = warm ? "#1a100c" : "#120e0c";
  return `<defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${a}"/>
      <stop offset="1" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="120" height="90" fill="url(#${id})"/>
  <path d="M0 72 Q30 64 60 74 T120 70 V90 H0 Z" fill="${WASH}" opacity=".55"/>`;
}

function bun(x: number, y: number): string {
  return `<circle cx="${x}" cy="${y - 8}" r="4" fill="${INK}"/>
    <circle cx="${x}" cy="${y}" r="7" fill="${INK}"/>`;
}

const ART: Record<string, () => string> = {
  strike: strikeArt,
  defend: defendArt,
  push: pushArt,
  charge: chargeArt,
  advance: advanceArt,
  drawcut: drawcutArt,
  backpalm: backpalmArt,
  split: splitArt,
  close: closeArt,
  elbow: elbowArt,
  sweep: sweepArt,
  mend: mendArt,
  cut: cutArt,
  thrust: thrustArt,
  pierce: pierceArt,
  plant: plantArt,
  hookpull: hookArt,
  bleedcut: bleedArt,
  expose: exposeArt,
  thorns: thornArt,
  inbreath: breathArt,
  combo: comboArt,
  haste: hasteArt,
  follow: comboArt,
  twinpalm: strikeArt,
  brace: defendArt,
  chain: comboArt,
  gather: breathArt,
  setup: comboArt,
  finisher: strikeArt,
  weave: defendArt,
  echo: breathArt,
  ironform: thornArt,
  marking: exposeArt,
  rift: cutArt,
  mirror: defendArt,
  layer: strikeArt,
  tide: breathArt,
};

export function cardArt(id: string): string {
  const key = id.replace(/2$/, "");
  return (ART[key] ?? strikeArt)();
}

function strikeArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-strike", true)}
    <path d="M18 40 L70 22 L78 28 L40 58 Z" fill="${CINN}" opacity=".85"/>
    <path d="M22 44 L74 26" stroke="${PAPER}" stroke-width="2" opacity=".5"/>
    ${bun(44, 28)}
    <path d="M36 36 L58 38 L70 78 L32 78 Z" fill="${INK}"/>
    <path d="M58 42 L96 30 L100 36 L64 52 Z" fill="${INK}"/>
    <path d="M32 78 L28 90 L40 90 L44 78 L52 90 L64 90 L58 78 Z" fill="${INK}"/>
    <circle cx="98" cy="28" r="5" fill="${GOLD}" opacity=".8"/>
  </svg>`;
}

function defendArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-defend")}
    <path d="M60 16 L96 34 L96 58 L60 78 L24 58 L24 34 Z" fill="none" stroke="${GOLD}" stroke-width="3" opacity=".85"/>
    <path d="M60 22 L88 36 L88 54 L60 70 L32 54 L32 36 Z" fill="none" stroke="${PAPER}" stroke-width="1.5" opacity=".4"/>
    ${bun(60, 30)}
    <path d="M46 38 L74 38 L70 78 L50 78 Z" fill="${INK}"/>
    <path d="M46 44 L22 58 L28 64 L50 50 Z" fill="${INK}"/>
    <path d="M74 44 L98 58 L92 64 L70 50 Z" fill="${INK}"/>
    <path d="M50 78 L46 90 L56 90 L60 80 L64 90 L74 90 L70 78 Z" fill="${INK}"/>
  </svg>`;
}

function pushArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-push", true)}
    <path d="M70 20 H118 M78 12 L118 24 L78 36" fill="none" stroke="${CINN}" stroke-width="3"/>
    <path d="M74 48 H114" stroke="${GOLD}" stroke-width="2" opacity=".7"/>
    ${bun(38, 26)}
    <path d="M28 34 L54 36 L62 78 L26 78 Z" fill="${INK}"/>
    <path d="M54 42 L88 34 L92 42 L58 52 Z" fill="${INK}"/>
    <path d="M50 48 L86 50 L88 58 L52 56 Z" fill="${INK}"/>
    <path d="M26 78 L22 90 L34 90 L38 80 L46 90 L58 90 L52 78 Z" fill="${INK}"/>
  </svg>`;
}

function chargeArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-charge")}
    <circle cx="60" cy="52" r="22" fill="none" stroke="${GOLD}" stroke-width="2" opacity=".7"/>
    <circle cx="60" cy="52" r="12" fill="none" stroke="${CINN}" stroke-width="2"/>
    <circle cx="60" cy="52" r="4" fill="${GOLD}"/>
    ${bun(60, 24)}
    <path d="M42 32 L78 32 L74 58 L46 58 Z" fill="${INK}"/>
    <path d="M46 58 L38 82 L50 82 L54 60 L66 82 L78 82 L70 58 Z" fill="${INK}"/>
    <path d="M42 40 L22 56 L28 60 L48 46 Z" fill="${INK}"/>
    <path d="M78 40 L98 56 L92 60 L72 46 Z" fill="${INK}"/>
  </svg>`;
}

function advanceArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-advance")}
    <ellipse cx="78" cy="84" rx="22" ry="5" fill="${PAPER}" opacity=".2"/>
    <path d="M18 78 Q50 70 88 80" fill="none" stroke="${GOLD}" stroke-width="2" opacity=".5"/>
    ${bun(52, 22)}
    <path d="M40 30 L68 34 L72 70 L36 66 Z" fill="${INK}"/>
    <path d="M68 40 L96 28 L100 36 L72 50 Z" fill="${INK}"/>
    <path d="M36 66 L28 88 L40 88 L48 70 Z" fill="${INK}"/>
    <path d="M56 68 L70 50 L80 56 L62 78 Z" fill="${INK}"/>
  </svg>`;
}

function drawcutArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-cut", true)}
    <path d="M28 70 L102 18 L108 26 L36 78 Z" fill="${CINN}"/>
    <path d="M32 72 L104 22" stroke="${PAPER}" stroke-width="1.5" opacity=".45"/>
    ${bun(40, 28)}
    <path d="M30 36 L54 38 L58 78 L28 78 Z" fill="${INK}"/>
    <path d="M54 44 L86 36 L80 44 L56 52 Z" fill="${INK}"/>
    <rect x="52" y="48" width="10" height="4" fill="${GOLD}"/>
    <path d="M28 78 L24 90 L36 90 L40 80 L48 90 L56 90 L50 78 Z" fill="${INK}"/>
  </svg>`;
}

function backpalmArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-back")}
    <path d="M96 30 H40 M52 16 L28 32 L52 48" fill="none" stroke="${CINN}" stroke-width="3"/>
    ${bun(70, 26)}
    <path d="M56 34 L84 32 L88 78 L52 78 Z" fill="${INK}"/>
    <path d="M56 44 L24 40 L22 50 L54 54 Z" fill="${INK}"/>
    <path d="M52 78 L48 90 L60 90 L64 80 L72 90 L84 90 L78 78 Z" fill="${INK}"/>
  </svg>`;
}

function splitArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-split", true)}
    <path d="M60 8 V78" stroke="${GOLD}" stroke-width="3"/>
    <path d="M36 28 L84 62 M84 28 L36 62" stroke="${CINN}" stroke-width="3"/>
    ${bun(60, 22)}
    <path d="M46 32 L74 32 L70 70 L50 70 Z" fill="${INK}"/>
    <path d="M50 70 L42 90 L54 90 L58 74 L62 90 L74 90 L66 70 Z" fill="${INK}"/>
    <path d="M46 40 L22 58 L28 64 L50 48 Z" fill="${INK}"/>
    <path d="M74 40 L98 58 L92 64 L70 48 Z" fill="${INK}"/>
  </svg>`;
}

function closeArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-close")}
    <circle cx="40" cy="48" r="10" fill="${INK}"/>
    <circle cx="86" cy="44" r="12" fill="none" stroke="${CINN}" stroke-width="3"/>
    ${bun(48, 24)}
    <path d="M36 32 L64 36 L70 78 L34 74 Z" fill="${INK}"/>
    <path d="M64 42 L92 38 L94 48 L66 52 Z" fill="${INK}"/>
    <path d="M34 74 L28 90 L40 90 L46 76 L54 90 L66 90 L58 76 Z" fill="${INK}"/>
  </svg>`;
}

function elbowArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-elbow", true)}
    <path d="M30 70 L60 16 L90 70" fill="none" stroke="${CINN}" stroke-width="3"/>
    <circle cx="60" cy="72" r="8" fill="${GOLD}"/>
    ${bun(52, 28)}
    <path d="M40 36 L68 34 L72 78 L38 78 Z" fill="${INK}"/>
    <path d="M68 40 L96 22 L102 30 L72 50 Z" fill="${INK}"/>
    <path d="M38 78 L34 90 L46 90 L50 80 L58 90 L70 90 L64 78 Z" fill="${INK}"/>
  </svg>`;
}

function sweepArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-sweep")}
    <path d="M16 70 Q60 28 108 66" fill="none" stroke="${CINN}" stroke-width="3"/>
    <path d="M22 74 Q60 40 102 70" fill="none" stroke="${GOLD}" stroke-width="2" opacity=".7"/>
    ${bun(44, 24)}
    <path d="M32 32 L60 36 L58 62 L30 58 Z" fill="${INK}"/>
    <path d="M30 58 L22 78 L36 80 L42 62 Z" fill="${INK}"/>
    <path d="M48 60 L92 72 L86 80 L44 68 Z" fill="${INK}"/>
    <path d="M60 36 L84 28 L88 36 L64 44 Z" fill="${INK}"/>
  </svg>`;
}

function mendArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-mend")}
    <path d="M48 78 Q60 18 72 78" fill="none" stroke="${GOLD}" stroke-width="2.5" opacity=".8"/>
    <path d="M54 70 Q60 28 66 70" fill="none" stroke="${CINN}" stroke-width="1.6" opacity=".7"/>
    ${bun(60, 26)}
    <path d="M44 36 L76 36 L72 62 L48 62 Z" fill="${INK}"/>
    <path d="M48 62 L36 86 L50 86 L54 64 L66 86 L80 86 L68 62 Z" fill="${INK}"/>
    <circle cx="60" cy="48" r="5" fill="${GOLD}" opacity=".75"/>
  </svg>`;
}

function cutArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-slash", true)}
    <path d="M18 62 L108 20 L112 28 L24 72 Z" fill="${CINN}"/>
    <path d="M20 64 L110 24" stroke="${PAPER}" stroke-width="1.4" opacity=".4"/>
    ${bun(42, 26)}
    <path d="M30 34 L56 38 L60 78 L28 76 Z" fill="${INK}"/>
    <path d="M56 44 L92 22 L98 30 L60 52 Z" fill="${INK}"/>
    <path d="M28 76 L22 90 L36 90 L40 78 L50 90 L62 90 L54 76 Z" fill="${INK}"/>
  </svg>`;
}

function thrustArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-thrust")}
    <path d="M28 58 L112 28" stroke="${CINN}" stroke-width="4"/>
    <path d="M104 22 L116 30 L100 36 Z" fill="${GOLD}"/>
    ${bun(36, 24)}
    <path d="M24 32 L50 36 L54 78 L22 76 Z" fill="${INK}"/>
    <path d="M50 42 L86 34 L88 42 L52 50 Z" fill="${INK}"/>
    <path d="M22 76 L16 90 L30 90 L34 78 L44 90 L56 90 L48 76 Z" fill="${INK}"/>
  </svg>`;
}

function pierceArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-pierce", true)}
    <path d="M40 70 L108 18" stroke="${INK}" stroke-width="3"/>
    <path d="M42 66 L106 16" stroke="${CINN}" stroke-width="1.6"/>
    <path d="M100 12 L114 20 L96 24 Z" fill="${GOLD}"/>
    ${bun(38, 26)}
    <path d="M26 34 L52 36 L56 78 L24 76 Z" fill="${INK}"/>
    <path d="M52 44 L78 30 L82 38 L54 52 Z" fill="${INK}"/>
    <path d="M24 76 L18 90 L32 90 L36 78 L46 90 L58 90 L50 76 Z" fill="${INK}"/>
  </svg>`;
}

function plantArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-plant")}
    <rect x="56" y="8" width="8" height="70" fill="${GOLD}"/>
    <path d="M48 78 L72 78 L80 90 L40 90 Z" fill="${WASH}"/>
    ${bun(40, 24)}
    <path d="M28 34 L50 36 L54 70 L26 68 Z" fill="${INK}"/>
    <path d="M50 42 L64 20 L72 24 L54 48 Z" fill="${INK}"/>
    <path d="M26 68 L20 88 L34 88 L38 70 L46 88 L56 88 L48 68 Z" fill="${INK}"/>
  </svg>`;
}

function hookArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-hook", true)}
    <path d="M70 22 Q108 18 104 52 Q98 72 78 68" fill="none" stroke="${CINN}" stroke-width="4"/>
    <path d="M78 68 L70 60" stroke="${GOLD}" stroke-width="3"/>
    ${bun(38, 26)}
    <path d="M26 34 L52 36 L56 78 L24 76 Z" fill="${INK}"/>
    <path d="M52 42 L78 28 L84 36 L54 50 Z" fill="${INK}"/>
    <path d="M24 76 L18 90 L32 90 L36 78 L46 90 L58 90 L50 76 Z" fill="${INK}"/>
  </svg>`;
}

function bleedArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-bleed", true)}
    <rect x="58" y="10" width="6" height="64" fill="${INK}"/>
    <path d="M48 22 L74 18 L76 26 L50 30 Z" fill="${GOLD}"/>
    <path d="M64 74 Q68 82 62 90" fill="none" stroke="${CINN}" stroke-width="3"/>
    <circle cx="62" cy="88" r="3" fill="${CINN}"/>
    ${bun(40, 26)}
    <path d="M26 34 L50 36 L54 74 L24 72 Z" fill="${INK}"/>
    <path d="M50 42 L66 24 L72 30 L54 48 Z" fill="${INK}"/>
    <path d="M24 72 L18 90 L32 90 L36 74 L46 90 L56 90 L48 72 Z" fill="${INK}"/>
  </svg>`;
}

function exposeArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-expose")}
    <path d="M28 28 L52 48 M68 22 L92 50" stroke="${CINN}" stroke-width="3"/>
    <path d="M36 70 L84 70" stroke="${GOLD}" stroke-width="2" opacity=".6"/>
    ${bun(60, 24)}
    <path d="M46 34 L74 34 L70 64 L50 64 Z" fill="${INK}"/>
    <path d="M46 42 L24 58 L30 64 L50 48 Z" fill="${INK}"/>
    <path d="M74 42 L102 36 L106 44 L76 50 Z" fill="${INK}"/>
    <path d="M50 64 L44 90 L56 90 L60 68 L64 90 L76 90 L70 64 Z" fill="${INK}"/>
  </svg>`;
}

function thornArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-thorn")}
    <path d="M60 16 L96 48 L60 80 L24 48 Z" fill="none" stroke="${GOLD}" stroke-width="2.4"/>
    <path d="M60 28 L84 48 L60 68 L36 48 Z" fill="none" stroke="${CINN}" stroke-width="2"/>
    ${bun(60, 22)}
    <path d="M46 34 L74 34 L70 62 L50 62 Z" fill="${INK}"/>
    <path d="M50 62 L42 86 L54 86 L58 64 L62 86 L74 86 L66 62 Z" fill="${INK}"/>
  </svg>`;
}

function breathArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-breath")}
    <circle cx="60" cy="56" r="18" fill="none" stroke="${GOLD}" stroke-width="2"/>
    <circle cx="60" cy="56" r="8" fill="${CINN}" opacity=".8"/>
    ${bun(60, 20)}
    <path d="M42 30 L78 30 L74 54 L46 54 Z" fill="${INK}"/>
    <path d="M46 54 L34 84 L48 84 L52 56 L68 84 L82 84 L70 54 Z" fill="${INK}"/>
    <path d="M42 38 L20 52 L26 58 L48 44 Z" fill="${INK}"/>
    <path d="M78 38 L100 52 L94 58 L72 44 Z" fill="${INK}"/>
  </svg>`;
}

function comboArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-combo", true)}
    <path d="M18 50 L50 28 L56 36 L28 56 Z" fill="${CINN}" opacity=".85"/>
    <path d="M70 24 L108 42 L100 50 L66 34 Z" fill="${GOLD}" opacity=".8"/>
    ${bun(52, 22)}
    <path d="M38 32 L70 34 L74 76 L36 74 Z" fill="${INK}"/>
    <path d="M36 74 L28 90 L42 90 L46 76 L56 90 L70 90 L62 76 Z" fill="${INK}"/>
  </svg>`;
}

function hasteArt(): string {
  return `<svg class="card-art" viewBox="0 0 120 90" aria-hidden="true">
    ${sky("g-haste")}
    <path d="M12 48 H52 M20 40 L8 48 L20 56" fill="none" stroke="${GOLD}" stroke-width="3"/>
    <path d="M18 62 H58" stroke="${CINN}" stroke-width="2" opacity=".7"/>
    ${bun(70, 22)}
    <path d="M56 30 L86 34 L88 70 L54 66 Z" fill="${INK}"/>
    <path d="M86 40 L110 28 L114 36 L88 50 Z" fill="${INK}"/>
    <path d="M54 66 L48 88 L60 88 L66 70 Z" fill="${INK}"/>
    <path d="M70 68 L92 52 L100 58 L76 78 Z" fill="${INK}"/>
  </svg>`;
}
