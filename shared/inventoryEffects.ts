import { addGear, gearCount, removeGear } from "./equipment";
import { findEquipment } from "./mock/equipment";
import { findItemTemplate } from "./mock/items";
import type { Character } from "./types/character";
import type { ConsumableItem, EquipmentItem, Inventory, InventorySlot } from "./types/inventory";

/**
 * Helpers puros de inventário, compartilhados entre o motor de combate
 * (shared/tactics), o client e a rota de uso de item do servidor. Nenhuma
 * função aqui faz I/O — só muta o `Character` recebido e devolve o que
 * aconteceu.
 */

export function findInventorySlot(
  character: Pick<Character, "inventory">,
  itemId: string,
): InventorySlot<ConsumableItem> | undefined {
  return character.inventory?.slots.find((s) => s.item.id === itemId);
}

/** Remove uma carga do item; se acabarem as cargas, tira uma unidade da pilha (e o slot, se zerar). */
export function consumeInventoryCharge(
  character: Pick<Character, "inventory">,
  slot: InventorySlot<ConsumableItem>,
): void {
  slot.item.data.usesRemaining -= 1;
  if (slot.item.data.usesRemaining <= 0) {
    slot.quantity -= 1;
    slot.item.data.usesRemaining = slot.quantity > 0 ? slot.item.data.maxUses : 0;
  }
  if (slot.quantity <= 0 && character.inventory) {
    character.inventory.slots = character.inventory.slots.filter((s) => s !== slot);
  }
}

const DEFAULT_MAX_SLOTS = 12;

/**
 * Guarda um item na mochila: empilha no slot existente se o personagem já
 * tiver aquele item, senão ocupa um slot novo. Retorna false quando a
 * mochila está cheia — o item é perdido, e quem chama decide se avisa.
 */
export function addItemToInventory(character: Character, item: ConsumableItem): boolean {
  const inventory: Inventory<ConsumableItem> = character.inventory ?? { slots: [], maxSlots: DEFAULT_MAX_SLOTS };
  character.inventory = inventory;

  const existing = inventory.slots.find((slot) => slot.item.id === item.id);
  if (existing) {
    existing.quantity += 1;
    // Uma pilha que tinha zerado as cargas volta a ter um item inteiro.
    if (existing.item.data.usesRemaining <= 0) {
      existing.item.data.usesRemaining = existing.item.data.maxUses;
    }
    return true;
  }

  if (inventory.slots.length >= inventory.maxSlots) return false;

  const usedIndexes = new Set(inventory.slots.map((slot) => slot.slotIndex));
  let slotIndex = 0;
  while (usedIndexes.has(slotIndex)) slotIndex += 1;

  inventory.slots.push({ slotIndex, item: structuredClone(item), quantity: 1 });
  return true;
}

export interface ImmediateHealResult {
  healed: number;
  description: string;
}

/**
 * Aplica um efeito de cura imediata (heal_hp ou cure_status) — os únicos
 * efeitos que fazem sentido fora de combate. buff_stat e focus_charge só
 * existem dentro de uma luta (ver shared/tactics/engine.ts).
 */
export function applyImmediateHeal(
  character: Pick<Character, "currentHp" | "maxHp">,
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

/** Qualquer coisa que se guarda: o que se gasta (a mochila) e o que se veste (o guardado). */
export type GameItem = ConsumableItem | EquipmentItem;

/** O molde do item `itemId`, consumível ou equipamento. Undefined se não existe. */
export function findItem(itemId: string): GameItem | undefined {
  return findItemTemplate(itemId) ?? findEquipment(itemId);
}

/**
 * Entrega `item` a `owner`, a dona da mochila: o consumível vai pra mochila
 * (e pode não caber — aí volta false e o item se perde), a peça de
 * equipamento vai pro guardado, que não tem limite.
 */
export function giveItem(owner: Character, item: GameItem): boolean {
  if (item.category === "consumable") return addItemToInventory(owner, item);
  addGear(owner, item.id);
  return true;
}

/** Quantas unidades de `itemId` `owner` tem pra dar: na mochila ou, se é equipamento, GUARDADAS (o que está vestido não conta). */
export function itemCount(owner: Pick<Character, "inventory" | "gear">, itemId: string): number {
  return (findInventorySlot(owner, itemId)?.quantity ?? 0) + gearCount(owner, itemId);
}

/**
 * Tira de `owner` UMA unidade inteira de `itemId` — não uma carga: o item
 * muda de mão. Diz se havia o que tirar.
 */
export function takeItem(owner: Character, itemId: string): boolean {
  const { inventory } = owner;
  const slot = findInventorySlot(owner, itemId);
  if (!inventory || !slot || slot.quantity <= 0) return removeGear(owner, itemId);

  slot.quantity -= 1;
  if (slot.quantity <= 0) inventory.slots = inventory.slots.filter((other) => other !== slot);
  else slot.item.data.usesRemaining = slot.item.data.maxUses;
  return true;
}
