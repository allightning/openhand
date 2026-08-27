import { weaponArt, weaponDetail } from "../art/weaponArt";

/** Lab / 主线共用兵刃详情层（§30.1）。 */
export function renderWeaponSheet(id: string): string {
  const d = weaponDetail(id);
  if (!d) return "";
  return `
    <div class="sheet-mask lab-weapon-mask" id="weapon-mask">
      <div class="sheet-panel weapon-sheet ink-sheet">
        <button type="button" class="sheet-close" id="weapon-sheet-close" aria-label="关闭">×</button>
        <div class="kicker">兵刃</div>
        <div class="weapon-sheet-art">${weaponArt(id)}</div>
        <h2>${d.name}</h2>
        <p class="weapon-school">${d.school}</p>
        <p>${d.text}</p>
        <p class="flavor">${d.tip}</p>
      </div>
    </div>`;
}
