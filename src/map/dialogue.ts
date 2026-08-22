/**
 * 对话富文本：`**粗体线索**` · `{{红字重点}}`
 */
export interface DialogueFrag {
  text: string;
  bold?: boolean;
  color?: "danger" | "default";
}

const TOKEN =
  /(\*\*([^*]+)\*\*)|(\{\{([^}]+)\}\})|([^*{]+|\*+|\{+)/g;

/** 解析一句对白为带样式片段 */
export function parseDialogue(raw: string): DialogueFrag[] {
  if (!raw) return [];
  const out: DialogueFrag[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN.source, "g");
  while ((m = re.exec(raw))) {
    if (m[2] != null) out.push({ text: m[2], bold: true, color: "default" });
    else if (m[4] != null) out.push({ text: m[4], bold: false, color: "danger" });
    else if (m[5]) out.push({ text: m[5], color: "default" });
  }
  return out.length ? out : [{ text: raw, color: "default" }];
}

/** 渲染为 HTML（对话栏用） */
export function dialogueToHtml(raw: string): string {
  return parseDialogue(raw)
    .map((f) => {
      const cls = [
        f.bold ? "dlg-bold" : "",
        f.color === "danger" ? "dlg-danger" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const esc = f.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return cls ? `<span class="${cls}">${esc}</span>` : esc;
    })
    .join("");
}

/** 去掉标记，供需要纯文本的场合 */
export function dialoguePlain(raw: string): string {
  return parseDialogue(raw)
    .map((f) => f.text)
    .join("");
}
