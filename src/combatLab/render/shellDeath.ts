function markActions(inner: string): string {
  return inner
    .replace('class="gauntlet-result-actions"', 'class="gauntlet-result-actions" data-overlap-group="death-actions"')
    .replace('class="gauntlet-wager-row"', 'class="gauntlet-wager-row" data-overlap-group="death-revive"');
}

function emptyComment(inner: string, loss: boolean): string {
  if (!loss || inner.includes("gauntlet-result-potline")) return inner;
  return inner.replace(
    '<div class="gauntlet-result-hero">',
    '<p class="shell-empty" data-shell-empty="death">这一馆没有另写评语。</p><div class="gauntlet-result-hero">',
  );
}

function emptyRevive(inner: string): string {
  if (inner.includes("data-lifeline")) return inner;
  return inner.replace(
    'data-overlap-group="death-revive"',
    'data-overlap-group="death-revive"><p class="shell-empty">这一局没有复活赛。</p>',
  );
}

export function renderShellDeath(inner: string, kind: "result" | "lifeline", loss = false): string {
  const kicker = kind === "lifeline" ? "复活赛" : loss ? "死亡" : "结算";
  let body = markActions(inner);
  if (kind === "result") body = emptyComment(body, loss);
  if (kind === "lifeline") body = emptyRevive(body);
  return `<div class="shell-death" data-shell="death" data-death="${kind}"><p class="shell-kicker">${kicker}</p>${body}</div>`;
}
