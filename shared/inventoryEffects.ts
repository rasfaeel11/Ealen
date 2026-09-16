import type { Character } from "./types/character";
import type { ConsumableItem, InventorySlot } from "./types/inventory";

/**
 * Helpers puros de inventário, compartilhados entre o motor de combate do
 * servidor, a rota de uso de item fora de combate, e o modo convidado no
 * client (que resolve tudo localmente, sem servidor). Nenhuma função aqui
 * faz I/O — só muta o `Character` recebido e devolve o que aconteceu.
 */

export function findInventorySlot(character: Character, itemId: string): InventorySlot<ConsumableItem> | undefined {
  return character.inventory?.slots.find((s) => s.item.id === itemId);
}

/** Remove uma carga do item; se acabarem as cargas, tira uma unidade da pilha (e o slot, se zerar). */
export function consumeInventoryCharge(character: Character, slot: InventorySlot<ConsumableItem>): void {
  slot.item.data.usesRemaining -= 1;
  if (slot.item.data.usesRemaining <= 0) {
    slot.quantity -= 1;
    slot.item.data.usesRemaining = slot.quantity > 0 ? slot.item.data.maxUses : 0;
  }
  if (slot.quantity <= 0 && character.inventory) {
    character.inventory.slots = character.inventory.slots.filter((s) => s !== slot);
  }
}

export interface ImmediateHealResult {
  healed: number;
  description: string;
}

/**
 * Aplica um efeito de cura imediata (heal_hp ou cure_status) — os únicos
 * efeitos que fazem sentido fora de combate. buff_stat e focus_charge só
 * existem dentro de uma sessão de combate (ver server/src/combat/engine.ts).
 */
export function applyImmediateHeal(
  character: Character,
  effect: { kind: "heal_hp"; amount: number } | { kind: "cure_status" },
): ImmediateHealResult {
  const amount = effect.kind === "heal_hp" ? effect.amount : 5;
  const healed = Math.min(character.maxHp - character.currentHp, amount);
  character.currentHp += healed;
  const description =
    effect.kind === "heal_hp"
      ? `Restaura ${healed} HP.`
      : `Purifica corrupções recentes${healed > 0 ? ` e restaura ${healed} HP.` : "."}`;
  return { healed, description };
}
