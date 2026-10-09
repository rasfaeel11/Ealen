import type * as Phaser from "phaser";
import { createProtagonist, newGame, type CharacterClass } from "@ealen/shared";
import { REGISTRY_NEW_GAME_SLOT, REGISTRY_SESSION, SCENES } from "./config";
import { firstEmptySlot, readSlots } from "./save";
import { GameSession } from "./session";

/**
 * Começa uma partida nova e entra no mundo. A protagonista é sempre Halmira;
 * `order` só vem de quem já destravou outra Ordem pra ela (ver ./profile.ts).
 */
export function beginNewGame(scene: Phaser.Scene, order?: CharacterClass): void {
  // O espaço vem de quem abriu o jogo novo (título ou lista de saves); sem isso, o primeiro livre.
  const chosen = scene.registry.get(REGISTRY_NEW_GAME_SLOT) as number | undefined;
  const session = new GameSession(chosen ?? firstEmptySlot(readSlots()) ?? 0, newGame(createProtagonist(order)));
  session.commit();
  scene.registry.remove(REGISTRY_NEW_GAME_SLOT);
  scene.registry.set(REGISTRY_SESSION, session);
  scene.scene.start(SCENES.world);
}
