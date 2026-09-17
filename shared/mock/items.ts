import type { ConsumableItem } from "../types/inventory";

/**
 * Consumíveis de Talys. `usesRemaining`/`maxUses` modelam cargas de UM item
 * (ex: um frasco com 3 goles); `quantity` no InventorySlot modela quantas
 * cópias empilhadas existem no slot — pra itens de uso único, ambos ficam
 * em 1.
 *
 * Cada item é um Princípio engarrafado: nada aqui é "poção genérica". A
 * descrição diz o que a coisa É; o campo `effect` diz o que ela faz.
 * Quem larga cada um está em ./bestiary.ts.
 */
export const MOCK_ITEMS: ConsumableItem[] = [
  {
    id: "item-lagrima-de-eir",
    name: "Lágrima de Eir",
    description:
      "Uma gota de ressonância pura, cristalizada antes de evaporar. Dissolvida na boca, devolve ao corpo a frequência que a ferida levou embora.",
    category: "consumable",
    rarity: "common",
    data: { effect: { kind: "heal_hp", amount: 15 }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-pao-de-cinza",
    name: "Pão de Cinza",
    description:
      "Ração de peregrino, assada com a brasa que os Entropistas deixam para trás. Tem gosto de fim de fogueira e segura alguém de pé por mais um dia.",
    category: "consumable",
    rarity: "common",
    data: { effect: { kind: "heal_hp", amount: 8 }, usesRemaining: 2, maxUses: 2 },
  },
  {
    id: "item-balsamo-de-pedra-de-taharim",
    name: "Bálsamo de Pedra de Taharim",
    description:
      "Unguento mineral batido nas fornalhas das Gargantas. A pele não endurece: fica densa, e o que é denso não cede.",
    category: "consumable",
    rarity: "uncommon",
    data: { effect: { kind: "buff_stat", stat: "or", bonus: 4, durationTurns: 2 }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-brasa-de-forjardente",
    name: "Brasa de Forjardente",
    description:
      "Um carvão que nunca apagou, arrancado de uma forja sagrada. Segurá-la queima — e o braço que queima bate mais forte antes de doer.",
    category: "consumable",
    rarity: "uncommon",
    data: { effect: { kind: "buff_stat", stat: "dain", bonus: 4, durationTurns: 2 }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-estilhaco-de-prumo",
    name: "Estilhaço de Prumo",
    description:
      "Lasca de um instrumento de medir que os Rachadores quebraram de propósito. Desde então mede melhor: o olho que o carrega enxerga onde as coisas fecham mal.",
    category: "consumable",
    rarity: "uncommon",
    data: { effect: { kind: "buff_stat", stat: "il", bonus: 4, durationTurns: 2 }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-incenso-purificador-de-althir",
    name: "Incenso Purificador de Althir",
    description:
      "Fumaça dos planaltos althirim, queimada para devolver a um corpo o padrão que ele perdeu. Dissipa corrupções e fecha o que estava só mal fechado.",
    category: "consumable",
    rarity: "uncommon",
    data: { effect: { kind: "cure_status" }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-oleo-da-coruja-de-miraven",
    name: "Óleo da Coruja de Miraven",
    description:
      "Extrato destilado sob maré alta. Por alguns segundos o mundo fica devagar o bastante para se escolher exatamente onde acertar.",
    category: "consumable",
    rarity: "rare",
    data: { effect: { kind: "focus_charge", guaranteedCritNextHit: true }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-diapasao-de-bolso",
    name: "Diapasão de Bolso",
    description:
      "Ferramenta de Cantor, do tamanho de um dedo. Batido no osso, afina quem o carrega com Eälen — e por algumas respirações tudo que ele emite ressoa mais fundo.",
    category: "consumable",
    rarity: "rare",
    data: { effect: { kind: "buff_stat", stat: "eir", bonus: 5, durationTurns: 3 }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-calice-de-aguas-lentas",
    name: "Cálice de Águas Lentas",
    description:
      "Água recolhida de um trecho de rio onde o tempo passa errado. Beber devolve o corpo a um estado anterior ao machucado — mas só o corpo, e só uma vez.",
    category: "consumable",
    rarity: "rare",
    data: { effect: { kind: "heal_hp", amount: 35 }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-semente-de-horizonte",
    name: "Semente de Horizonte",
    description:
      "Um grão pesado demais para o tamanho que tem. Os Guardiões dizem que é um pedaço de limite: enquanto estiver na mão, quase nada consegue atravessar.",
    category: "consumable",
    rarity: "sacred",
    data: { effect: { kind: "buff_stat", stat: "or", bonus: 7, durationTurns: 3 }, usesRemaining: 1, maxUses: 1 },
  },
];

/** Busca um item do catálogo pelo id. */
export function findItemTemplate(itemId: string): ConsumableItem | undefined {
  return MOCK_ITEMS.find((item) => item.id === itemId);
}
