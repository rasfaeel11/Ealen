import type { Ability, Character, MapNode } from "../types";

/**
 * Dados de exemplo, só para visualização. Nada disso é persistido —
 * será substituído por dados reais vindos do Supabase nos próximos passos.
 */

export const MOCK_CHARACTERS: Character[] = [
  {
    id: "char-faelan",
    name: "Faelan Orwen",
    race: "althirim",
    characterClass: "luminar",
    level: 5,
    xp: 340,
    attributes: { dain: 3, eir: 6, nath: 7, il: 5, or: 8, len: 4, ul: 7 },
    currentHp: 52,
    maxHp: 60,
    currentNodeId: "node-portas-de-tiran",
  },
  {
    id: "char-mira",
    name: "Mira Duskveil",
    race: "kelbar",
    characterClass: "sombrilico",
    level: 3,
    xp: 120,
    attributes: { dain: 5, eir: 5, nath: 5, il: 8, or: 3, len: 7, ul: 5 },
    currentHp: 34,
    maxHp: 38,
    currentNodeId: "node-clareira-do-eco",
  },
  {
    id: "char-toran",
    name: "Toran Ashgrave",
    race: "taharim",
    characterClass: "rachador",
    level: 7,
    xp: 610,
    attributes: { dain: 8, eir: 3, nath: 6, il: 9, or: 5, len: 4, ul: 4 },
    currentHp: 58,
    maxHp: 64,
    currentNodeId: "node-santuario-primeiras-luzes",
  },
];

export const MOCK_MAP_NODES: MapNode[] = [
  {
    id: "node-portas-de-tiran",
    name: "Portas de Tirán",
    description:
      "O limiar de pedra rúnica que separa as terras conhecidas do interior de Eälen. Aqui a jornada começa.",
    connections: ["node-clareira-do-eco"],
    encounterType: "none",
  },
  {
    id: "node-clareira-do-eco",
    name: "Clareira do Eco",
    description:
      "Uma clareira onde os sussurros da floresta se repetem fora de ordem. Algo hostil se move entre as árvores.",
    connections: ["node-portas-de-tiran", "node-santuario-primeiras-luzes"],
    encounterType: "combat",
    encounterId: "encounter-lobo-cinzento",
  },
  {
    id: "node-santuario-primeiras-luzes",
    name: "Santuário das Primeiras Luzes",
    description:
      "Ruínas onde, segundo a lenda, o Canto original foi entoado pela primeira vez. O ar aqui vibra com Eir antigo.",
    connections: ["node-clareira-do-eco"],
    encounterType: "lore",
    encounterId: "lore-canto-primordial",
  },
];

export const MOCK_ABILITIES: Ability[] = [
  {
    id: "ability-escudo-de-luz",
    name: "Escudo de Luz",
    characterClass: "luminar",
    scalingAttribute: "or",
    description:
      "Ergue uma barreira de luz condensada ao redor de um aliado, absorvendo dano proporcional à Densidade (Or) do Luminar.",
    unlockLevel: 1,
  },
  {
    id: "ability-veu-sombrio",
    name: "Véu Sombrio",
    characterClass: "sombrilico",
    scalingAttribute: "il",
    description:
      "Dobra as sombras ao redor do Sombrílico, aumentando a chance de esquiva e revelando fraquezas mágicas do alvo com base em sua Percepção (Il).",
    unlockLevel: 3,
  },
  {
    id: "ability-tiro-perfurante",
    name: "Tiro Perfurante",
    characterClass: "rachador",
    scalingAttribute: "il",
    description:
      "Um disparo calculado que ignora parte da armadura do alvo, com precisão escalando pela Percepção (Il) do Rachador.",
    unlockLevel: 1,
  },
];
