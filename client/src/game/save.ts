import { parseSave, serializeSave, type GameSave, type SaveProblem } from "@ealen/shared";

/**
 * Onde os saves ficam guardados: neste dispositivo, via localStorage, um
 * jogo inteiro por espaço. Não depende de servidor nem de login — funciona
 * igual no navegador e dentro de um empacotador desktop. O formato do save
 * e a conferência dele são de shared/save; aqui só se guarda e se busca.
 */
export const SLOT_COUNT = 3;

const SLOT_KEY = (slot: number) => `ealen:slot:${slot}`;
const LAST_SLOT_KEY = "ealen:lastSlot";

/** As chaves do save antigo (versão 1): o personagem numa, o resto espalhado. */
const LEGACY_KEYS = {
  save: "ealen:save",
  location: "ealen:location",
  defeated: "ealen:defeated",
  broken: "ealen:broken",
  story: "ealen:story",
} as const;

export type SlotState =
  | { status: "empty" }
  | { status: "ok"; save: GameSave }
  /** Tem algo gravado que este jogo não consegue ler. Não se sobrescreve sem o jogador mandar. */
  | { status: "unreadable"; problem: SaveProblem };

export function readSlot(slot: number): SlotState {
  const raw = readRaw(slot);
  if (raw === null) return { status: "empty" };
  const parsed = parseSave(raw);
  return parsed.ok ? { status: "ok", save: parsed.save } : { status: "unreadable", problem: parsed.problem };
}

/** Todos os espaços, em ordem. Na primeira vez, traz pra dentro deles o save do formato antigo. */
export function readSlots(): SlotState[] {
  adoptLegacySave();
  return Array.from({ length: SLOT_COUNT }, (_, slot) => readSlot(slot));
}

/** Grava o jogo inteiro de uma vez. False se o dispositivo recusou (sem espaço, armazenamento bloqueado). */
export function writeSlot(slot: number, save: GameSave): boolean {
  try {
    localStorage.setItem(SLOT_KEY(slot), serializeSave(save));
    localStorage.setItem(LAST_SLOT_KEY, String(slot));
    return true;
  } catch {
    return false;
  }
}

export function deleteSlot(slot: number): void {
  try {
    localStorage.removeItem(SLOT_KEY(slot));
  } catch {
    // Sem armazenamento não há o que apagar.
  }
}

/** O texto gravado num espaço, como está — é o que se exporta, legível ou não. */
export function readRaw(slot: number): string | null {
  try {
    return localStorage.getItem(SLOT_KEY(slot));
  } catch {
    return null;
  }
}

/** O espaço que "Continuar" abre: o último em que se jogou, se ainda houver um jogo nele. */
export function lastPlayedSlot(slots: SlotState[]): number | null {
  let last = -1;
  try {
    last = Number(localStorage.getItem(LAST_SLOT_KEY) ?? -1);
  } catch {
    // Cai no mais recente, abaixo.
  }
  if (slots[last]?.status === "ok") return last;

  let best: number | null = null;
  let bestSavedAt = -1;
  for (const [slot, state] of slots.entries()) {
    if (state.status !== "ok" || state.save.savedAt <= bestSavedAt) continue;
    best = slot;
    bestSavedAt = state.save.savedAt;
  }
  return best;
}

export function firstEmptySlot(slots: SlotState[]): number | null {
  const slot = slots.findIndex((state) => state.status === "empty");
  return slot === -1 ? null : slot;
}

// ------------------------------------------------------------------ arquivo

/** Baixa o save de um espaço como arquivo, pra guardar ou levar pra outro dispositivo. */
export function exportSlot(slot: number, fileName: string): void {
  const raw = readRaw(slot);
  if (raw === null) return;
  const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export type ImportResult = { ok: true; save: GameSave } | { ok: false; problem: SaveProblem | "cancelled" };

/** Abre o seletor de arquivo do sistema e lê o save escolhido. Não grava nada: quem chama decide onde. */
export function pickSaveFile(): Promise<ImportResult> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("cancel", () => resolve({ ok: false, problem: "cancelled" }));
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ ok: false, problem: "cancelled" });
        return;
      }
      file.text().then(
        (text) => resolve(parseSave(text)),
        () => resolve({ ok: false, problem: "invalid" }),
      );
    });
    input.click();
  });
}

// ------------------------------------------------------------------- legado

/**
 * O save da versão 1 passa pro primeiro espaço livre e as chaves antigas
 * somem. Só as apaga depois de gravar: se não der, tenta de novo na próxima.
 */
function adoptLegacySave(): void {
  try {
    const raw = localStorage.getItem(LEGACY_KEYS.save);
    if (raw === null) return;

    const read = (key: string): unknown => {
      try {
        return JSON.parse(localStorage.getItem(key) ?? "null");
      } catch {
        return null;
      }
    };
    const old = read(LEGACY_KEYS.save);
    const parsed = parseSave({
      ...(typeof old === "object" && old !== null ? old : {}),
      location: read(LEGACY_KEYS.location),
      defeated: read(LEGACY_KEYS.defeated),
      broken: read(LEGACY_KEYS.broken),
      // A história já era guardada como texto, sem passar por JSON.parse.
      story: localStorage.getItem(LEGACY_KEYS.story),
    });

    if (parsed.ok) {
      const slot = Array.from({ length: SLOT_COUNT }, (_, index) => index).find((index) => readRaw(index) === null);
      if (slot === undefined || !writeSlot(slot, parsed.save)) return;
    }
    for (const key of Object.values(LEGACY_KEYS)) localStorage.removeItem(key);
  } catch {
    // Sem acesso ao armazenamento: não há save antigo pra trazer.
  }
}
