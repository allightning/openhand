import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Severity = "hard" | "warn";

interface Hit {
  severity: Severity;
  rule: string;
  line: number;
  excerpt: string;
}

interface WhitelistEntry {
  rule: string;
  excerpt: string;
  why: string;
}

const root = resolve(import.meta.dirname, "../..");
const target = resolve(root, "src/combatLab/storyBeats.ts");
const whitelistPath = resolve(import.meta.dirname, "whitelist.json");

const HARD_PHRASES: { rule: string; re: RegExp }[] = [
  { rule: "关联词组", re: /于是|终究|其实|所谓|归根/ },
  { rule: "不是而是", re: /不是[^。]{0,24}而是/ },
  { rule: "假对峙", re: /你不开口|他不摊开|得你先说|局就开了|这一碗/ },
  { rule: "仿佛如同", re: /仿佛|如同/ },
];

const WARN_CHARS = ["便", "却", "只", "亦", "忽", "遂", "乃", "方", "而", "像"] as const;

function loadWhitelist(): WhitelistEntry[] {
  const raw = readFileSync(whitelistPath, "utf8");
  return JSON.parse(raw) as WhitelistEntry[];
}

function allowed(list: WhitelistEntry[], rule: string, excerpt: string): boolean {
  return list.some((w) => w.rule === rule && excerpt.includes(w.excerpt));
}

function stringsOf(source: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  const re = /"((?:[^"\\]|\\.)*)"/g;
  const lines = source.split("\n");
  lines.forEach((line, i) => {
    for (const m of line.matchAll(re)) {
      const text = m[1] ?? "";
      if (/[\u4e00-\u9fff]/.test(text)) out.push({ line: i + 1, text });
    }
  });
  return out;
}

function sentences(text: string): string[] {
  return text
    .replace(/\*\*/g, "")
    .split("。")
    .map((s) => s.trim())
    .filter(Boolean);
}

function scan(source: string, list: WhitelistEntry[]): Hit[] {
  const hits: Hit[] = [];
  for (const { line, text } of stringsOf(source)) {
    for (const { rule, re } of HARD_PHRASES) {
      if (re.test(text) && !allowed(list, rule, text)) {
        hits.push({ severity: "hard", rule, line, excerpt: text.slice(0, 48) });
      }
    }
    const parts = sentences(text);
    let shortRun = 0;
    let negRun = 0;
    for (const part of parts) {
      shortRun = part.length < 12 ? shortRun + 1 : 0;
      negRun = /[没不]$/.test(part) ? negRun + 1 : 0;
      if (shortRun >= 3 && !allowed(list, "超短句排比", text)) {
        hits.push({ severity: "hard", rule: "超短句排比", line, excerpt: text.slice(0, 48) });
        shortRun = 0;
      }
      if (negRun >= 3 && !allowed(list, "否定撑场三连", text)) {
        hits.push({ severity: "hard", rule: "否定撑场三连", line, excerpt: text.slice(0, 48) });
        negRun = 0;
      }
    }
    for (const ch of WARN_CHARS) {
      if (text.includes(ch) && !allowed(list, `单字:${ch}`, text)) {
        hits.push({ severity: "warn", rule: `单字:${ch}`, line, excerpt: text.slice(0, 48) });
      }
    }
  }
  return hits;
}

const source = readFileSync(target, "utf8");
const hits = scan(source, loadWhitelist());
const hard = hits.filter((h) => h.severity === "hard");
const warn = hits.filter((h) => h.severity === "warn");

console.log(`proseLint ${target}`);
console.log(`强制 ${hard.length} · 警告 ${warn.length}`);
for (const h of hard) console.log(`HARD ${h.rule} L${h.line} ${h.excerpt}`);
for (const h of warn) console.log(`WARN ${h.rule} L${h.line} ${h.excerpt}`);

if (hard.length > 0) process.exit(1);
