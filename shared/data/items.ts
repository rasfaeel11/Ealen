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

  // Os itens-chave: o que a história dá e pede de volta. Não se usam, não se passam, não se jogam fora.
  // A banha e os pregos da receita de Thrykar (cena 1.2 do roteiro): o grupo os traz, e ele tempera as duas espadas.
  {
    id: "item-banha-de-bagre",
    name: "Banha de Bagre Cego",
    description: "Um pote de barro com banha amarela de bagre, que cheira a rio parado. A guilda guardava pra engraxar remo.",
    category: "consumable",
    rarity: "common",
    key: true,
    data: { effect: { kind: "none" }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-pregos-de-barco",
    name: "Pregos de Barco Afundado",
    description: "Três pregos verdes de ferrugem, tirados do costado da barcaça de grãos que afundou nos baixios com a carga paga.",
    category: "consumable",
    rarity: "common",
    key: true,
    data: { effect: { kind: "none" }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-estaca-de-ymboripe",
    name: "Estaca dos Baixios",
    description:
      "Um pedaço de estaca do comprimento de um braço, tirado do lodo dos baixios. Na cabeça, ferro batido com letras cavadas: Ymboripe. Na madeira, um círculo de atração riscado a faca, torto e aberto.",
    category: "consumable",
    rarity: "common",
    key: true,
    data: { effect: { kind: "none" }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-carta-de-mbyraku",
    name: "Carta ao Senhor de Ymboripe",
    description:
      "Tirada do gibão de Mbyraku, com a dobra gasta de quem já leu muitas vezes. Três conselheiros de Ybytuguá escrevem ao senhor de Ymboripe: se o rio continuar fechado até a lua cheia, levam os termos do duque ao conselho. Três nomes embaixo.",
    category: "consumable",
    rarity: "common",
    key: true,
    data: { effect: { kind: "none" }, usesRemaining: 1, maxUses: 1 },
  },
  {
    id: "item-copia-do-contrato",
    name: "Cópia Selada do Contrato",
    description:
      "O edital da cheia copiado numa folha estreita pelo escrivão da Mesa, com o selo de cera embaixo. Cópia selada, a família recebe a parte. Dobrada em quatro, e nunca desdobrada.",
    category: "consumable",
    rarity: "common",
    key: true,
    data: { effect: { kind: "none" }, usesRemaining: 1, maxUses: 1 },
  },
];

/** Busca um item do catálogo pelo id. */
export function findItemTemplate(itemId: string): ConsumableItem | undefined {
  return ITEMS.find((item) => item.id === itemId);
}
