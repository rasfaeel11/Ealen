// Gerado por art/gerar_arte.py (register): não edite à mão. Ver docs/arte.md.
import type { MapSheetDef } from "./mapSprites";

/** As folhas de mapa geradas, pela chave de quem representam (ver MAP_SHEETS). */
export const GENERATED_SHEETS: Record<string, MapSheetDef> = {
  "person:Endyru": { url: "sprites/endyru.png", frameWidth: 48, frameHeight: 48 },
};

/** Os retratos gerados, pelo nome de quem fala (ver PORTRAITS). */
export const GENERATED_PORTRAITS: Record<string, { url: string; smooth?: boolean }> = {
  "Endyru": { url: "sprites/portraits/endyru.png", smooth: true },
  "Jarupã": { url: "sprites/portraits/jarupa.png", smooth: true },
  "Xanduí": { url: "sprites/portraits/xandui.png", smooth: true },
  "Oryndu": { url: "sprites/portraits/oryndu.png", smooth: true },
  "Conselheira": { url: "sprites/portraits/conselheira.png", smooth: true },
  "Escrivão da Mesa": { url: "sprites/portraits/escrivao.png", smooth: true },
  "Mestre da guilda": { url: "sprites/portraits/mestre_da_guilda.png", smooth: true },
};

/** As ilustrações de tela cheia (título, mapa do mundo, splash de cada um), pelo id. */
export const SPLASHES: Record<string, string> = {
};
