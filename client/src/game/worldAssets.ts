import * as Phaser from "phaser";
import { AREAS } from "@ealen/shared";

/**
 * Imagens dos tilesets, pelo NOME que o tileset tem dentro do mapa do Tiled.
 * Tileset novo: salve a imagem em client/public/tilesets/ e registre aqui.
 */
export const TILESETS: Record<string, string> = {
  placeholder: "tilesets/placeholder.png",
  "placeholder-tall": "tilesets/placeholder-tall.png",
  "placeholder-high": "tilesets/placeholder-high.png",
};

/** A história compilada (client/story -> public/story.json, ver vite.config.ts), guardada como texto. */
export const STORY_KEY = "story";

export function mapKey(areaId: string): string {
  return `map:${areaId}`;
}

export function tilesetKey(tilesetName: string): string {
  return `tileset:${tilesetName}`;
}

/** Enfileira no loader todos os mapas, os tilesets e a história. Chamado no preload da cena de boot. */
export function preloadWorld(scene: Phaser.Scene): void {
  scene.load.text(STORY_KEY, "story.json");
  for (const area of Object.values(AREAS)) scene.load.tilemapTiledJSON(mapKey(area.id), area.map);
  for (const [name, url] of Object.entries(TILESETS)) scene.load.image(tilesetKey(name), url);
}

/** Pixel art: tileset sem suavização ao ampliar. Chamado no create da cena de boot. */
export function prepareWorldTextures(scene: Phaser.Scene): void {
  for (const name of Object.keys(TILESETS)) {
    scene.textures.get(tilesetKey(name)).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}
