import * as Phaser from "phaser";
import { AREAS } from "@ealen/shared";

/**
 * Imagens dos tilesets, pelo NOME que o tileset tem dentro do mapa do Tiled.
 * Tileset novo: salve a imagem em client/public/tilesets/ e registre aqui.
 */
export const TILESETS: Record<string, string> = {
  placeholder: "tilesets/placeholder.png",
  "placeholder-tall": "tilesets/placeholder-tall.png",
};

export function mapKey(areaId: string): string {
  return `map:${areaId}`;
}

export function tilesetKey(tilesetName: string): string {
  return `tileset:${tilesetName}`;
}

/** Enfileira no loader todos os mapas e tilesets. Chamado no preload da cena de boot. */
export function preloadWorld(scene: Phaser.Scene): void {
  for (const area of Object.values(AREAS)) scene.load.tilemapTiledJSON(mapKey(area.id), area.map);
  for (const [name, url] of Object.entries(TILESETS)) scene.load.image(tilesetKey(name), url);
}

/** Pixel art: tileset sem suavização ao ampliar. Chamado no create da cena de boot. */
export function prepareWorldTextures(scene: Phaser.Scene): void {
  for (const name of Object.keys(TILESETS)) {
    scene.textures.get(tilesetKey(name)).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}
