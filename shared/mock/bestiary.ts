import { addItemToInventory } from "../inventoryEffects";
import type { AiQuirks } from "../tactics/types";
import type { UnitPlacement } from "../tactics/units";
import type { BestiaryEntry } from "../types/bestiary";
import type { Character } from "../types/character";
import { findItemTemplate } from "./items";

/**
 * O bestiário: quem se enfrenta, indexado pelo id que os mapas usam
 * (`creature` num inimigo do Tiled).
 *
 * Primeiro o que é do mundo da série: o Ykuruã (`referencias/bestiario.md` no
 * repositório da história) e a gente do Ymonhã e de Ymboripe — gente não pede
 * entrada no bestiário da história; criatura pede. Criatura nova (os bichos da
 * floresta entre as bacias, se o autor quiser) só entra depois de gravada lá.
 * Quem não tem nome aprovado aparece pelo papel: o castelão, o recitador.
 *
 * `template.arts` é também O KIT da criatura: do kit da classe dela, ela sabe
 * só o que nomeia ali (ver abilitiesFor em ../tactics/abilities.ts). Dar uma
 * Técnica a uma criatura é dar um nome a ela. Quem é gente (`person`) ainda
 * veste: `template.equipment` é a arma e a armadura com que luta.
 */
export const BESTIARY: Record<string, BestiaryEntry> = {
  // O Ykuruã, o Bebe-Cheia: a primeira criatura do bestiário do mundo (`referencias/bestiario.md` §1 no
  // repositório da história). Animal, não monstro de mito. Os números e os nomes dos golpes são
  // provisórios; a classe é só de onde ele tira o golpe de corpo (bicho não tem escola de espada).
  "encounter-ykurua": {
    // Na água se cura e é rápido, na terra seca e racha (ver soak em ../tactics/engine.ts); sente mana gasta de
    // uma vez e vem atrás de quem a gastou; e é grande demais pra se puxar de uma vez.
    river: true,
    heft: 1,
    drawnToMana: true,
    style: { id: "baluarte", grade: 1 },
    glyph: "≈",
    summary: "Bicho de rio, anfíbio, do tamanho de um barco de carga. Na língua dos portos, o Bebe-Cheia.",
    lore: "Couro grosso como casca de árvore velha, coberto de lodo e conchas; boca larga, olhos pequenos, quase cego. Dorme enterrado no lodo dos baixios a maior parte do ano e acorda com a cheia. Sente mana gasta de uma vez e vem até onde ela bateu.",
    // Animal: vai pra cima, sem medo e sem pensar.
    ai: { aggression: 1.3, caution: 0.4 },
    drops: [],
    template: {
      id: "enemy-ykurua",
      name: "Ykuruã",
      race: "bicho",
      characterClass: "espadachim",
      level: 5,
      xp: 0,
      attributes: { forca: 9, fator: 1, vigor: 12, olho: 3, couro: 8, labia: 1, saber: 1 },
      currentHp: 90,
      maxHp: 90,
      currentNodeId: "",
      arts: {
        attack: "Bocada",
        heavy_attack: "Investida",
      },
    },
  },

  // O Ykuruã da primeira ida aos baixios, no ato 1: o mesmo bicho, na cheia que acabou de chegar. Bater nele ali é
  // inútil (`invulnerable`): a luta só acaba por uma deixa, e é Oryndu quem tira o grupo da água.
  "encounter-ykurua-desperto": {
    river: true,
    heft: 1,
    drawnToMana: true,
    invulnerable: true,
    style: { id: "baluarte", grade: 1 },
    glyph: "≈",
    summary: "O Ykuruã, acordado pela cheia. Na água, nada que se faça a ele pega.",
    lore: "Só a ponta das costas à vista, e o lodo subindo onde ele passa. Nenhum barqueiro bate nele: espera.",
    ai: { aggression: 1.3, caution: 0.4 },
    drops: [],
    template: {
      id: "enemy-ykurua",
      name: "Ykuruã",
      race: "bicho",
      characterClass: "espadachim",
      level: 5,
      xp: 0,
      attributes: { forca: 9, fator: 1, vigor: 12, olho: 3, couro: 8, labia: 1, saber: 1 },
      currentHp: 90,
      maxHp: 90,
      currentNodeId: "",
      arts: { attack: "Bocada", heavy_attack: "Investida" },
    },
  },

  // --- A gente do castelo de pedágio ------------------------------------------------------------------------------
  // Homens de um senhor de margem do Ymonhã. Ganham por barco parado.
  "encounter-guarda-do-pedagio": {
    person: true,
    style: { id: "gryskar", grade: 1 },
    aura: 1,
    glyph: "⛓",
    summary: "Guarda de corrente de um castelo de pedágio do Ymonhã.",
    lore: "Ganha por barco parado, não por barco que passa. Sabe que o pedágio subiu de novo; não sabe por quê, e não pergunta.",
    ai: { aggression: 1.1 },
    drops: [{ itemId: "item-pao-de-cinza", chance: 0.4 }],
    template: {
      id: "enemy-guarda-do-pedagio",
      name: "Guarda do pedágio",
      race: "humano",
      characterClass: "espadachim",
      level: 1,
      xp: 0,
      attributes: { forca: 5, fator: 1, vigor: 5, olho: 4, couro: 4, labia: 2, saber: 1 },
      currentHp: 22,
      maxHp: 22,
      currentNodeId: "",
      equipment: { weapon: "gear-chuco", armor: "gear-gibao-de-couro" },
      arts: { quick_attack: "Ponta do Chuço", attack: "Chuçada", defend: "Fechar a Passagem" },
    },
  },

  "encounter-besteiro-do-pedagio": {
    person: true,
    glyph: "➶",
    summary: "Besteiro da muralha de um castelo de pedágio.",
    lore: "Não tem escola nenhuma: tem a besta e a muralha. Atira em quem está mais perto da corrente.",
    // De longe, e sem se expor.
    ai: { caution: 1.3 },
    drops: [{ itemId: "item-lagrima-de-eir", chance: 0.3 }],
    template: {
      id: "enemy-besteiro-do-pedagio",
      name: "Besteiro",
      race: "humano",
      characterClass: "espadachim",
      level: 1,
      xp: 0,
      attributes: { forca: 3, fator: 1, vigor: 4, olho: 6, couro: 3, labia: 2, saber: 1 },
      currentHp: 16,
      maxHp: 16,
      currentNodeId: "",
      equipment: { weapon: "gear-besta", armor: "gear-tunica-de-linho" },
      arts: { attack: "Virote", defend: "Atrás da Ameia" },
    },
  },

  // O castelão: o primeiro chefe. Da Tsvirana (lê quem se repete), Corpo de aura. Sem nome aprovado: é o papel.
  "encounter-castelao": {
    person: true,
    style: { id: "tsvirana", grade: 3 },
    aura: 3,
    glyph: "♜",
    summary: "O castelão do pedágio: dono de uma margem do Ymonhã e da corrente atravessada nela.",
    lore: "Cobra de quem desce o que o senhor de cima manda cobrar, e guarda a diferença. Aprendeu a espada com quem lia o outro antes de bater; bate quando o outro se repete.",
    ai: { finisher: 1.2, caution: 0.8 },
    drops: [{ itemId: "item-lagrima-de-eir", chance: 1 }],
    template: {
      id: "enemy-castelao",
      name: "Castelão",
      race: "humano",
      characterClass: "espadachim",
      level: 4,
      xp: 0,
      attributes: { forca: 7, fator: 1, vigor: 8, olho: 7, couro: 6, labia: 5, saber: 4 },
      currentHp: 60,
      maxHp: 60,
      currentNodeId: "",
      equipment: { weapon: "gear-espada-reta", armor: "gear-cota-de-escamas" },
      arts: { quick_attack: "Corte Curto", attack: "Corte do Castelão", heavy_attack: "Fechar a Corrente", defend: "Mudar o Pé" },
    },
  },

  // --- A gente de Ymboripe, o ducado de cima ----------------------------------------------------------------------
  // Andam à paisana na terra de ninguém entre as bacias. Ninguém deles diz de quem recebe; quem lê descobre.
  "encounter-espada-de-ymboripe": {
    person: true,
    style: { id: "gryskar", grade: 2 },
    aura: 2,
    glyph: "⚔",
    summary: "Soldado do ducado de cima, sem a cor do ducado.",
    lore: "Anda à paisana na floresta entre as bacias. Recebe de Ymboripe e não diz de quem recebe; bate antes de alguém perguntar.",
    ai: { aggression: 1.2 },
    drops: [{ itemId: "item-pao-de-cinza", chance: 0.5 }],
    template: {
      id: "enemy-espada-de-ymboripe",
      name: "Espada de Ymboripe",
      race: "humano",
      characterClass: "espadachim",
      level: 3,
      xp: 0,
      attributes: { forca: 7, fator: 1, vigor: 6, olho: 5, couro: 5, labia: 2, saber: 2 },
      currentHp: 30,
      maxHp: 30,
      currentNodeId: "",
      equipment: { weapon: "gear-espada-pesada", armor: "gear-gibao-de-couro" },
      arts: { quick_attack: "Golpe de Escolta", attack: "Golpe", heavy_attack: "Golpe de Cima", defend: "Guarda" },
    },
  },

  // Da Ipojy, como Xanduí: não dá o primeiro golpe. Quem a encontra parada no caminho decide se começa.
  "encounter-lanca-de-ymboripe": {
    person: true,
    style: { id: "ipojy", grade: 2 },
    aura: 2,
    glyph: "⚚",
    summary: "Lança do ducado de cima, da Espera.",
    lore: "Fica no caminho e espera. Fez o voto da Ipojy numa escola rio acima; quem paga a escola é o ducado.",
    ai: { aggression: 0.9, caution: 1.1 },
    drops: [{ itemId: "item-lagrima-de-eir", chance: 0.3 }],
    template: {
      id: "enemy-lanca-de-ymboripe",
      name: "Lança de Ymboripe",
      race: "humano",
      characterClass: "espadachim",
      level: 3,
      xp: 0,
      attributes: { forca: 5, fator: 1, vigor: 6, olho: 6, couro: 6, labia: 2, saber: 3 },
      currentHp: 28,
      maxHp: 28,
      currentNodeId: "",
      equipment: { weapon: "gear-chuco", armor: "gear-gibao-de-couro" },
      arts: { quick_attack: "Ponta", attack: "Estocada", defend: "Esperar" },
    },
  },

  // Quem conjura grande no rio, de propósito, pra acordar o Ykuruã: atração e repulsão, Página, como Endyru.
  "encounter-recitador-de-ymboripe": {
    person: true,
    magic: { concept: "atracao_repulsao", level: 3 },
    glyph: "✎",
    summary: "Estudante pago pelo ducado de cima pra ler alto na beira do rio.",
    lore: "Lê grande onde a gente do rio não lê nada: na água, na cheia. O que vem depois não é problema dele; é o que foi pago pra chamar.",
    // Fica longe e recita. É Página, como Endyru: de perto, o espadachim o amassa.
    ai: { caution: 1.4, support: 0.6 },
    drops: [{ itemId: "item-lagrima-de-eir", chance: 0.5 }],
    template: {
      id: "enemy-recitador-de-ymboripe",
      name: "Recitador",
      race: "humano",
      characterClass: "atracao_repulsao",
      level: 3,
      xp: 0,
      attributes: { forca: 3, fator: 8, vigor: 4, olho: 5, couro: 3, labia: 4, saber: 8 },
      currentHp: 22,
      maxHp: 22,
      currentNodeId: "",
      equipment: { weapon: "gear-bordao", armor: "gear-tunica-de-linho" },
      arts: { quick_attack: "Puxão", attack: "Bordão", heavy_attack: "Empurrão", defend: "Guarda" },
    },
  },

  // Gente de contrato: assinou escolta numa Mesa rio acima, e o contrato não dizia o que se escoltava.
  "encounter-aventureiro-contratado": {
    person: true,
    style: { id: "tsvirana", grade: 2 },
    aura: 2,
    glyph: "✦",
    summary: "Aventureiro de contrato, pago pelo ducado sem saber pra quê.",
    lore: "Assinou escolta numa Mesa dos Contratos rio acima. O contrato não dizia o que se escoltava, e ele não lê.",
    ai: { finisher: 1.2 },
    drops: [{ itemId: "item-pao-de-cinza", chance: 0.5 }],
    template: {
      id: "enemy-aventureiro-contratado",
      name: "Aventureiro contratado",
      race: "humano",
      characterClass: "espadachim",
      level: 3,
      xp: 0,
      attributes: { forca: 6, fator: 1, vigor: 6, olho: 6, couro: 4, labia: 3, saber: 1 },
      currentHp: 28,
      maxHp: 28,
      currentNodeId: "",
      equipment: { weapon: "gear-espada-reta", armor: "gear-gibao-de-couro" },
      arts: { quick_attack: "Golpe Rápido", attack: "Golpe", heavy_attack: "Golpe Pesado", defend: "Guarda" },
    },
  },
};

/**
 * A ficha de uma criatura pronta pra entrar numa luta: uma cópia do molde,
 * com a mochila cheia do que ela carrega.
 */
export function spawnCreature(entry: BestiaryEntry): Character {
  const character = structuredClone(entry.template);
  for (const itemId of entry.carries ?? []) {
    const item = findItemTemplate(itemId);
    if (item) addItemToInventory(character, item);
  }
  return character;
}

/**
 * Como a criatura `entry` entra numa luta (ver UnitPlacement em
 * ../tactics/units.ts): os pesos e as manias da IA, a escola ou o Baluarte, o
 * que ela é no corpo (sem vida, bicho de rio, pesada, atraída pela mana). Falta
 * só o lado, o quadrado e o id, que são de quem a põe ali. `heroId` é quem faz
 * o papel do protagonista nas manias (ver creatureQuirks).
 */
export function creaturePlacement(entry: BestiaryEntry, heroId: string): Omit<UnitPlacement, "team" | "pos" | "id"> {
  return {
    ai: entry.ai,
    invulnerable: entry.invulnerable,
    style: entry.style,
    aura: entry.aura,
    quirks: creatureQuirks(entry, heroId),
    river: entry.river,
    heft: entry.heft,
    drawnToMana: entry.drawnToMana,
    magic: entry.magic,
  };
}

/**
 * As manias da criatura na língua da luta: no bestiário quem ela espelha é
 * "hero", a protagonista; na luta é o id de quem faz esse papel (`heroId`).
 */
export function creatureQuirks(entry: BestiaryEntry, heroId: string): AiQuirks | undefined {
  const { quirks } = entry;
  if (!quirks) return undefined;
  return quirks.mirrors === "hero" ? { ...quirks, mirrors: heroId } : quirks;
}

/** Entrada do bestiário de um encontro, se existir. */
export function findBestiaryEntry(encounterId: string): BestiaryEntry | undefined {
  return BESTIARY[encounterId];
}

/** O bestiário em ordem crescente de nível, pro códice. */
export function bestiaryByLevel(): BestiaryEntry[] {
  return Object.values(BESTIARY).sort((a, b) => a.template.level - b.template.level);
}

/** Entrada do bestiário a partir do id da criatura em combate (não do encontro). */
export function findBestiaryEntryByEnemyId(enemyId: string): BestiaryEntry | undefined {
  return Object.values(BESTIARY).find((entry) => entry.template.id === enemyId);
}
