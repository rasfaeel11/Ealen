import * as Phaser from "phaser";
import { AREAS } from "@jogo/shared";

/** A história compilada (client/story -> public/story.json, ver vite.config.ts), guardada como texto. */
export const STORY_KEY = "story";

export function mapKey(areaId: string): string {
  return `map:${areaId}`;
}

/** Enfileira no loader todos os mapas e a história (o cenário pintado é de `Scenery.ts`). Chamado no preload da cena de boot. */
export function preloadWorld(scene: Phaser.Scene): void {
  scene.load.text(STORY_KEY, "story.json");
  for (const area of Object.values(AREAS)) scene.load.tilemapTiledJSON(mapKey(area.id), area.map);
}
