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
export const ITEMS: ConsumableItem[] = [
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
  // O óleo de lampião do armazém da guilda (ybytugua.ink, saqueadores_caem): o barril que se derrama, num pote só.
  {
    id: "item-pote-de-oleo",
    name: "Pote de Óleo",
    description:
      "Óleo de lampião da guilda dos barqueiros, num pote de barro sem asa e com a boca tapada de pano. Quebra onde cai, e o que cai pega fogo. Na água, não.",
    category: "consumable",
    rarity: "common",
    data: {
      effect: { kind: "throw", dice: { count: 1, sides: 4 }, type: "impacto", surface: { id: "fire", rounds: 2, radius: 0 } },
      usesRemaining: 1,
      maxUses: 1,
    },
  },
];

/** Busca um item do catálogo pelo id. */
export function findItemTemplate(itemId: string): ConsumableItem | undefined {
  return ITEMS.find((item) => item.id === itemId);
}
