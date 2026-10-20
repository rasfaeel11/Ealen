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
 * Os das Ordens do Eälen vieram de um balanceador numérico (o projeto
 * `ealen-IA`, hoje aposentado) rodado sobre o combate ANTIGO, de posturas.
 * Ficaram porque dão a cada Ordem um perfil próprio — um tanque de verdade,
 * um canhão de vidro de verdade —, não porque estejam balanceados pro
 * combate tático: são ponto de partida, pra ajustar à mão. Os do trio são
 * provisórios do mesmo jeito: o mago lê (Fator e Saber), o espadachim aguenta e
 * acerta (Força e Olho), e nenhum dos dois é culto no que não é dele.
 */
const CLASS_BASE_ATTRIBUTES: Record<CharacterClass, Attributes> = {
  atracao_repulsao: { forca: 3, fator: 8, vigor: 5, olho: 5, couro: 4, labia: 6, saber: 8 },
  espadachim: { forca: 8, fator: 2, vigor: 7, olho: 7, couro: 6, labia: 4, saber: 3 },
  luminar: { forca: 3, fator: 7, vigor: 7, olho: 4, couro: 8, labia: 5, saber: 5 },
  entropista: { forca: 4, fator: 9, vigor: 4, olho: 6, couro: 4, labia: 5, saber: 7 },
  cantor_de_ealen: { forca: 3, fator: 10, vigor: 4, olho: 6, couro: 4, labia: 7, saber: 5 },
  guardiao: { forca: 8, fator: 3, vigor: 7, olho: 4, couro: 6, labia: 5, saber: 5 },
  sombrilico: { forca: 8, fator: 4, vigor: 7, olho: 8, couro: 5, labia: 5, saber: 5 },
  rachador: { forca: 10, fator: 3, vigor: 6, olho: 9, couro: 3, labia: 5, saber: 5 },
};

/** Atributos iniciais de um personagem novo: base da Ordem + modificador do Povo. */
export function createStartingAttributes(race: Race, characterClass: CharacterClass): Attributes {
  const attributes = { ...CLASS_BASE_ATTRIBUTES[characterClass] };
  const raceModifier = RACE_MODIFIERS[race];
  for (const key of ATTRIBUTE_KEYS) attributes[key] += raceModifier[key] ?? 0;
  return attributes;
}

/** HP máximo inicial, derivado de Vigor. */
export function startingMaxHp(attributes: Attributes): number {
  return 20 + attributes.vigor * 4;
}

/** Mochila inicial de um personagem novo: algumas Lágrimas de Fator pra já dar pra testar o sistema de itens. */
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
