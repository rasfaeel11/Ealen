import type { Character } from "@ealen/shared";

/**
 * Save do jogo: um personagem, guardado neste dispositivo via localStorage.
 * Não depende de servidor nem de login — funciona igual no navegador e
 * dentro de um empacotador desktop.
 */
const SAVE_KEY = "ealen:save";
const SAVE_VERSION = 1;

interface SaveFile {
  version: number;
  character: Character;
}

export function loadSave(): Character | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw) as SaveFile;
    return save.version === SAVE_VERSION ? save.character : null;
  } catch {
    return null;
  }
}

export function writeSave(character: Character): void {
  const save: SaveFile = { version: SAVE_VERSION, character };
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
