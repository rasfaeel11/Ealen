// Gerado por art/gerar_arte.py (register): não edite à mão. Ver docs/arte.md.
import type { MapSheetDef } from "./mapSprites";

/** As folhas de mapa geradas, pela chave de quem representam (ver MAP_SHEETS). */
export const GENERATED_SHEETS: Record<string, MapSheetDef> = {
  "person:Endyru": { url: "sprites/endyru.png", frameWidth: 48, frameHeight: 48 },
};

/** Os retratos gerados, pelo nome de quem fala (ver PORTRAITS). */
export const GENERATED_PORTRAITS: Record<string, { url: string; smooth?: boolean }> = {
  "Endyru": { url: "sprites/portraits/endyru.png", smooth: true },
};

/** As ilustrações de tela cheia (título, mapa do mundo, splash de cada um), pelo id. */
export const SPLASHES: Record<string, string> = {
};
