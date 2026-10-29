import type { ConsumableItem } from "../types/inventory";

/**
 * Os consumíveis. `usesRemaining`/`maxUses` modelam cargas de UM item
 * (ex: um pão que dá duas refeições); `quantity` no InventorySlot modela
 * quantas cópias empilhadas existem no slot — pra itens de uso único, ambos
 * ficam em 1.
 *
 * Nada aqui é "poção genérica": a descrição diz o que a coisa É; o campo
 * `effect` diz o que ela faz. Quem larga cada um está em ./bestiary.ts. Os
 * efeitos que nenhum item do jogo usa ainda (reforço de atributo, foco,
 * purificar) continuam no motor, e os testes os exercitam com itens deles.
 */
export const MOCK_ITEMS: ConsumableItem[] = [
  {
    id: "item-unguento-de-barqueiro",
    name: "Unguento de Barqueiro",
    description:
      "Gordura de peixe batida com casca amarga, num pote de barro com tampa de cera. Arde mais que o corte, e fecha o corte.",
    category: "consumable",
    rarity: "common",
    data: { effect: { kind: "heal_hp", amount: 15 }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-pao-de-viagem",
    name: "Pão de Viagem",
    description:
      "Pão escuro e duro, assado pra durar a descida do rio. Tem gosto de fumaça e segura alguém de pé por mais um dia.",
    category: "consumable",
    rarity: "common",
    data: { effect: { kind: "heal_hp", amount: 8 }, usesRemaining: 2, maxUses: 2 },
  },
];

/** Busca um item do catálogo pelo id. */
export function findItemTemplate(itemId: string): ConsumableItem | undefined {
  return MOCK_ITEMS.find((item) => item.id === itemId);
}
