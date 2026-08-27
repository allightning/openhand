import type { LabPreset, LabStorageFile, LabTelemetry } from "./types";
import { BUILTIN_PRESETS } from "./presets";

const STORAGE_KEY = "openhand-combat-lab";
const MAX_REPORTS = 12;

const EMPTY: LabStorageFile = {
  customPresets: [],
  lastPresetId: BUILTIN_PRESETS[0]?.id ?? null,
  recentReports: [],
};

function load(): LabStorageFile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY, customPresets: [], recentReports: [] };
    const parsed = JSON.parse(raw) as Partial<LabStorageFile>;
    return {
      customPresets: parsed.customPresets ?? [],
      lastPresetId: parsed.lastPresetId ?? EMPTY.lastPresetId,
      recentReports: parsed.recentReports ?? [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function save(data: LabStorageFile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

export function allPresets(): LabPreset[] {
  const data = load();
  return [...BUILTIN_PRESETS, ...data.customPresets];
}

export function getLastPresetId(): string | null {
  return load().lastPresetId;
}

export function setLastPresetId(id: string): void {
  const data = load();
  data.lastPresetId = id;
  save(data);
}

export function saveCustomPreset(preset: LabPreset): void {
  const data = load();
  const idx = data.customPresets.findIndex((p) => p.id === preset.id);
  const next = { ...preset, id: preset.id.startsWith("custom-") ? preset.id : `custom-${Date.now()}` };
  if (idx >= 0) data.customPresets[idx] = next;
  else data.customPresets.push(next);
  data.lastPresetId = next.id;
  save(data);
}

export function deleteCustomPreset(id: string): void {
  const data = load();
  data.customPresets = data.customPresets.filter((p) => p.id !== id);
  save(data);
}

export function pushReport(report: LabTelemetry): void {
  const data = load();
  data.recentReports = [report, ...data.recentReports].slice(0, MAX_REPORTS);
  save(data);
}

export function recentReports(): LabTelemetry[] {
  return load().recentReports;
}

/** Combat Lab never touches openhand-mingshou save. */
export function labStorageKey(): string {
  return STORAGE_KEY;
}
