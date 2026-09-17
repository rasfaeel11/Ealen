import type { Character, CombatEvent, ConsumableItem, LevelUpResult } from "@ealen/shared";
import { addItemToInventory, findBestiaryEntry, findItemTemplate } from "@ealen/shared";
import { applyXpGain, xpForEnemy } from "./leveling";

export interface SettleResult {
  combatEnded: boolean;
  playerWon: boolean;
  xpGained: number;
  levelUp: LevelUpResult;
  /** Itens deixados pela criatura, já somados ao inventário de `character`. */
  loot: ConsumableItem[];
}

/**
 * Sorteia o que a criatura deixou cair e guarda na mochila do vencedor.
 * Item sorteado com a mochila cheia é simplesmente perdido — não trava a
 * vitória, e o jogador vê no resumo do combate só o que de fato entrou.
 */
function rollLoot(character: Character, encounterId: string): ConsumableItem[] {
  const entry = findBestiaryEntry(encounterId);
  if (!entry) return [];

  const collected: ConsumableItem[] = [];
  for (const drop of entry.drops) {
    if (Math.random() > drop.chance) continue;

    const item = findItemTemplate(drop.itemId);
    if (!item) continue;
    if (addItemToInventory(character, item)) collected.push(item);
  }
  return collected;
}

/**
 * Interpreta o resultado de um turno de combate: se houve vitória, aplica
 * XP/level up e loot em `character` (mutando-o) quando quem venceu foi o
 * jogador. Não persiste nada — quem chama decide o que fazer com o
 * resultado (gravar no Supabase, ou só devolver pro cliente, no caso do
 * convidado).
 */
export function settleCombat(
  character: Character,
  enemy: Character,
  events: CombatEvent[],
  encounterId: string,
): SettleResult {
  const victoryEvent = events.find(
    (event): event is Extract<CombatEvent, { type: "victory" }> => event.type === "victory",
  );
  if (!victoryEvent) {
    return { combatEnded: false, playerWon: false, xpGained: 0, levelUp: { leveledUp: false }, loot: [] };
  }

  const playerWon = victoryEvent.winner === character.id;
  const xpGained = playerWon ? xpForEnemy(enemy) : 0;
  const levelUp = playerWon ? applyXpGain(character, xpGained) : { leveledUp: false };
  const loot = playerWon ? rollLoot(character, encounterId) : [];

  return { combatEnded: true, playerWon, xpGained, levelUp, loot };
}
