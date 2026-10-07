import { ATTRIBUTE_KEYS, type Attributes } from "./types/attributes";
import { RACE_MODIFIERS, type Race } from "./types/race";
import type { CharacterClass } from "./types/characterClass";
import type { ConsumableItem, Inventory } from "./types/inventory";
import { MOCK_ITEMS } from "./mock/items";

const STARTING_INVENTORY_MAX_SLOTS = 12;
const STARTING_ITEM_ID = "item-lagrima-de-eir";
const STARTING_ITEM_QUANTITY = 2;

/**
 * Atributos de cada Ordem no nível 1, antes do modificador do Povo.
 *
 * Os cinco de combate vieram de um balanceador numérico (o projeto
 * `ealen-IA`, hoje aposentado) rodado sobre o combate ANTIGO, de posturas.
 * Ficaram porque dão a cada Ordem um perfil próprio — um tanque de verdade,
 * um canhão de vidro de verdade —, não porque estejam balanceados pro
 * combate tático: são ponto de partida, pra ajustar à mão.
 */
const CLASS_BASE_ATTRIBUTES: Record<CharacterClass, Attributes> = {
  luminar: { dain: 3, eir: 7, nath: 7, il: 4, or: 8, len: 5, ul: 5 },
  entropista: { dain: 4, eir: 9, nath: 4, il: 6, or: 4, len: 5, ul: 7 },
  cantor_de_ealen: { dain: 3, eir: 10, nath: 4, il: 6, or: 4, len: 7, ul: 5 },
  guardiao: { dain: 8, eir: 3, nath: 7, il: 4, or: 6, len: 5, ul: 5 },
  sombrilico: { dain: 8, eir: 4, nath: 7, il: 8, or: 5, len: 5, ul: 5 },
  rachador: { dain: 10, eir: 3, nath: 6, il: 9, or: 3, len: 5, ul: 5 },
};

/** Atributos iniciais de um personagem novo: base da Ordem + modificador do Povo. */
export function createStartingAttributes(race: Race, characterClass: CharacterClass): Attributes {
  const attributes = { ...CLASS_BASE_ATTRIBUTES[characterClass] };
  const raceModifier = RACE_MODIFIERS[race];
  for (const key of ATTRIBUTE_KEYS) attributes[key] += raceModifier[key] ?? 0;
  return attributes;
}

/** HP máximo inicial, derivado de Nath (Vitalidade). */
export function startingMaxHp(attributes: Attributes): number {
  return 20 + attributes.nath * 4;
}

/** Mochila inicial de um personagem novo: algumas Lágrimas de Eir pra já dar pra testar o sistema de itens. */
export function createStartingInventory(): Inventory<ConsumableItem> {
  const startingItem = MOCK_ITEMS.find((item) => item.id === STARTING_ITEM_ID);
  if (!startingItem) {
    return { slots: [], maxSlots: STARTING_INVENTORY_MAX_SLOTS };
  }

  return {
    maxSlots: STARTING_INVENTORY_MAX_SLOTS,
    slots: [{ slotIndex: 0, item: structuredClone(startingItem), quantity: STARTING_ITEM_QUANTITY }],
  };
}
