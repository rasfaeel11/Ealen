import { BESTIARY } from "../../mock/bestiary";
import { EQUIPMENT } from "../../mock/equipment";
import type { BestiaryEntry } from "../../types/bestiary";
import type { Character } from "../../types/character";
import type { EquipmentItem } from "../../types/inventory";

/**
 * O que os testes do mundo põem no catálogo do jogo, e que o jogo não tem.
 * Importar este arquivo registra tudo.
 *
 * - As criaturas dos mapas de teste (./fixtures/*.tmj), com ids
 *   `encounter-teste-*`: exercitam o que o mundo faz com uma entrada do
 *   bestiário — o que ela larga e carrega, a escola, a aura, a mania de
 *   espelhar, quem não tem vida pra perder. São gente do mundo (humanos,
 *   espadachins, com o que o jogo tem pra vestir).
 * - As peças `gear-teste-*`: o que o equipamento faz e nenhuma peça do jogo
 *   faz ainda (o acessório, a armadura que pesa no passo, a arma que qualquer
 *   classe usa).
 */

export const TEST_GEAR: EquipmentItem[] = [
  {
    id: "gear-teste-gancho",
    name: "Gancho",
    description: "",
    category: "equipment",
    rarity: "common",
    data: { slot: "weapon", dice: { count: 1, sides: 8 }, range: 2, toHit: -1 },
  },
  {
    id: "gear-teste-placa",
    name: "Placa",
    description: "",
    category: "equipment",
    rarity: "common",
    data: { slot: "armor", defense: 3, speed: -1 },
  },
  {
    id: "gear-teste-anel-de-forca",
    name: "Anel de Força",
    description: "",
    category: "equipment",
    rarity: "common",
    data: { slot: "accessory", attributes: { forca: 2 } },
  },
  {
    id: "gear-teste-anel-de-labia",
    name: "Anel de Lábia",
    description: "",
    category: "equipment",
    rarity: "common",
    data: { slot: "accessory", attributes: { labia: 2 } },
  },
];

function template(id: string, name: string, level: number, hp: number, extra: Partial<Character> = {}): Character {
  return {
    id: `enemy-teste-${id}`,
    name,
    race: "humano",
    characterClass: "espadachim",
    level,
    xp: 0,
    attributes: { forca: 5, fator: 1, vigor: 5, olho: 5, couro: 4, labia: 2, saber: 2 },
    currentHp: hp,
    maxHp: hp,
    ...extra,
  };
}

export const TEST_CREATURES: Record<string, BestiaryEntry> = {
  /** O mais fraco: bate e larga o unguento metade das vezes. */
  "encounter-teste-fraco": {
    glyph: "·",
    summary: "",
    lore: "",
    ai: { caution: 0.1, support: 0.4 },
    drops: [{ itemId: "item-unguento-de-barqueiro", chance: 0.5 }],
    template: template("fraco", "Fraco", 1, 24, { arts: { quick_attack: "Tapa", attack: "Soco", defend: "Encolher" } }),
  },
  /** Caçador: vai no ferido; larga pão e, às vezes, um anel (equipamento vai pro guardado, não pra mochila). */
  "encounter-teste-cacador": {
    glyph: "☾",
    summary: "",
    lore: "",
    ai: { finisher: 2, caution: 0.8 },
    drops: [
      { itemId: "item-pao-de-viagem", chance: 0.6 },
      { itemId: "gear-teste-anel-de-forca", chance: 0.3 },
    ],
    template: template("cacador", "Caçador", 3, 28, {
      attributes: { forca: 6, fator: 1, vigor: 5, olho: 7, couro: 4, labia: 2, saber: 1 },
      arts: { quick_attack: "Bote", attack: "Dentada", heavy_attack: "Investida", defend: "Recuar" },
    }),
  },
  /** O bruto: carrega um pão que come na luta e às vezes larga outro, ou a placa. */
  "encounter-teste-bruto": {
    style: { id: "baluarte", grade: 2 },
    glyph: "⚙",
    summary: "",
    lore: "",
    ai: { aggression: 1.3, finisher: 0, caution: 0 },
    carries: ["item-pao-de-viagem"],
    drops: [
      { itemId: "item-pao-de-viagem", chance: 0.5 },
      { itemId: "gear-teste-placa", chance: 0.25 },
    ],
    template: template("bruto", "Bruto", 4, 42, {
      attributes: { forca: 7, fator: 1, vigor: 7, olho: 3, couro: 7, labia: 1, saber: 1 },
      arts: { quick_attack: "Empurrão", attack: "Braçada", heavy_attack: "Queda", defend: "Travar" },
    }),
  },
  /** Sem vida pra perder: a luta com ele acaba por uma deixa. */
  "encounter-teste-sem-vida": {
    glyph: "⌛",
    summary: "",
    lore: "",
    ai: { caution: 1.2, support: 1.3 },
    invulnerable: true,
    carries: ["item-unguento-de-barqueiro"],
    drops: [{ itemId: "item-unguento-de-barqueiro", chance: 0.5 }],
    template: template("sem-vida", "Sem Vida", 5, 38, { arts: { attack: "Toque", defend: "Casulo" } }),
  },
  /** Da Ipojy: não dá o primeiro golpe. */
  "encounter-teste-espera": {
    person: true,
    style: { id: "ipojy", grade: 2 },
    aura: 2,
    glyph: "⚖",
    summary: "",
    lore: "",
    ai: { aggression: 0.8, caution: 1.2 },
    drops: [{ itemId: "item-pao-de-viagem", chance: 0.5 }],
    template: template("espera", "Espera", 2, 30, {
      equipment: { weapon: "gear-chuco", armor: "gear-gibao-de-couro" },
      arts: { quick_attack: "Ponta", attack: "Estocada", heavy_attack: "Pôr pra Fora", defend: "Fechar o Ombro" },
    }),
  },
  /** Do Gryskar, de longe e sempre no mesmo alvo. */
  "encounter-teste-atirador": {
    person: true,
    style: { id: "gryskar", grade: 2 },
    aura: 2,
    glyph: "➶",
    summary: "",
    lore: "",
    ai: { finisher: 1.3, caution: 1 },
    drops: [{ itemId: "item-unguento-de-barqueiro", chance: 0.4 }],
    template: template("atirador", "Atirador", 3, 24, {
      attributes: { forca: 4, fator: 2, vigor: 4, olho: 7, couro: 3, labia: 2, saber: 3 },
      equipment: { weapon: "gear-besta", armor: "gear-tunica-de-linho" },
      arts: { quick_attack: "Virote Curto", attack: "Virote", heavy_attack: "Virote Pesado", defend: "Abaixar" },
    }),
  },
  /** Da Tsvirana, e espelha o tipo da última ação da protagonista. */
  "encounter-teste-espelho": {
    person: true,
    style: { id: "tsvirana", grade: 3 },
    aura: 3,
    glyph: "≋",
    summary: "",
    lore: "",
    quirks: { mirrors: "hero" },
    drops: [],
    template: template("espelho", "Espelho", 5, 60, {
      attributes: { forca: 8, fator: 2, vigor: 8, olho: 8, couro: 8, labia: 4, saber: 4 },
      equipment: { weapon: "gear-espada-reta", armor: "gear-tunica-de-linho" },
      arts: { quick_attack: "O Mesmo Corte Curto", attack: "O Mesmo Golpe", heavy_attack: "Devolver com Peso", defend: "A Mesma Guarda" },
    }),
  },
};

Object.assign(BESTIARY, TEST_CREATURES);
for (const item of TEST_GEAR) if (!EQUIPMENT.some((known) => known.id === item.id)) EQUIPMENT.push(item);
