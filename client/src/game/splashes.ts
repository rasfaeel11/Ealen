import * as Phaser from "phaser";
import { SPLASHES } from "./generatedArt";

/**
 * As ilustrações de tela cheia — a do título, o mapa do mundo, a de cada um
 * do grupo —, geradas por art/gerar_arte.py e listadas em generatedArt.ts.
 * Quem não tem arquivo simplesmente não aparece: quem usa pergunta se a
 * textura existe.
 */

export function splashKey(id: string): string {
  return `splash:${id}`;
}

/** Enfileira no loader as ilustrações que existem. Chamado no preload da cena de boot. */
export function preloadSplashes(scene: Phaser.Scene): void {
  for (const [id, url] of Object.entries(SPLASHES)) scene.load.image(splashKey(id), url);
}
