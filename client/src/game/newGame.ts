import type * as Phaser from "phaser";
import { createProtagonist, newGame } from "@jogo/shared";
import { REGISTRY_NEW_GAME_SLOT, REGISTRY_SESSION, SCENES } from "./config";
import { firstEmptySlot, readSlots } from "./save";
import { GameSession } from "./session";

/**
 * Começa uma partida nova e entra no mundo. O protagonista é sempre Endyru.
 */
export function beginNewGame(scene: Phaser.Scene): void {
  // O espaço vem de quem abriu o jogo novo (título ou lista de saves); sem isso, o primeiro livre.
  const chosen = scene.registry.get(REGISTRY_NEW_GAME_SLOT) as number | undefined;
  const session = new GameSession(chosen ?? firstEmptySlot(readSlots()) ?? 0, newGame(createProtagonist()));
  session.commit();
  scene.registry.remove(REGISTRY_NEW_GAME_SLOT);
  scene.registry.set(REGISTRY_SESSION, session);
  scene.scene.start(SCENES.world);
}
