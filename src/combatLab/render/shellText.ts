/** 正文里的数字单独包一层，方便扫读。不改原文。 */
export function emphasizeNumbers(html: string): string {
  return html.replace(/>([^<]+)</g, (full, text: string) => {
    if (!/\d/.test(text)) return full;
    return `>${text.replace(/(\d+)/g, '<span class="shell-num">$1</span>')}<`;
  });
}
