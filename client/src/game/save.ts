import type { Character } from "@ealen/shared";

/**
 * Save do jogo: um personagem e onde ele está no mundo, guardados neste
 * dispositivo via localStorage. Não depende de servidor nem de login —
 * funciona igual no navegador e dentro de um empacotador desktop.
 */
const SAVE_KEY = "ealen:save";
const LOCATION_KEY = "ealen:location";
const DEFEATED_KEY = "ealen:defeated";
const SAVE_VERSION = 1;

interface SaveFile {
  version: number;
  character: Character;
}

/** Onde o personagem está: a área e o ponto do mapa dela, em pixels. */
export interface SaveLocation {
  areaId: string;
  x: number;
  y: number;
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

export function loadLocation(): SaveLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    return raw ? (JSON.parse(raw) as SaveLocation) : null;
  } catch {
    return null;
  }
}

export function writeLocation(location: SaveLocation): void {
  localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
}

/** Grupos de inimigos já vencidos, como "área:grupo". Vencido não volta. */
export function loadDefeated(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DEFEATED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function markDefeated(key: string): void {
  localStorage.setItem(DEFEATED_KEY, JSON.stringify([...loadDefeated().add(key)]));
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(LOCATION_KEY);
  localStorage.removeItem(DEFEATED_KEY);
}
