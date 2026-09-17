import type { BestiaryEntry } from "../types/bestiary";

/**
 * O bestiário de Talys, indexado pelo `encounterId` que os MapNodes
 * referenciam (ver ./seed.ts).
 *
 * Regra do mundo: nada aqui é "monstro" por natureza. Toda criatura é um
 * Princípio operando sem ninguém no controle — um som que se desgarrou, uma
 * ordem que sobreviveu a quem a deu, um padrão que não parou de quebrar.
 * Por isso cada uma tem um `principle` e nomes próprios de ação: um
 * Lobo-de-Bruma é modelado como sombrílico, mas dá um Bote Silencioso, não
 * uma "Fome do Vazio".
 */
export const BESTIARY: Record<string, BestiaryEntry> = {
  "encounter-fiapo-de-ruido": {
    glyph: "〰",
    principle: "ealen",
    summary: "Sobra de frequência desgarrada de um canto que ninguém terminou.",
    lore: "Não tem intenção nem apetite: repete o último som que ouviu, alto demais e fora de hora. No silêncio é quase inofensivo. Perto de uma voz, gruda nela.",
    drops: [{ itemId: "item-lagrima-de-eir", chance: 0.5 }],
    template: {
      id: "enemy-fiapo-de-ruido",
      name: "Fiapo de Ruído",
      race: "althirim",
      characterClass: "cantor_de_ealen",
      level: 1,
      xp: 0,
      attributes: { dain: 2, eir: 4, nath: 3, il: 3, or: 2, len: 5, ul: 2 },
      currentHp: 24,
      maxHp: 24,
      currentNodeId: "node-clareira-do-eco",
      arts: {
        quick_attack: "Chiado",
        attack: "Eco Torto",
        heavy_attack: "Lamento Repetido",
        defend: "Encolher o Som",
        heal: "Reafinar-se",
      },
    },
  },

  "encounter-lobo-de-bruma": {
    glyph: "☾",
    principle: "ausencia",
    summary: "Um lobo comum que aprendeu a não estar onde se olha.",
    lore: "Passou tempo demais numa região que ninguém observava e pegou o vício do lugar. Caça exatamente como caçava antes — só que agora erra muito menos, porque é difícil desviar do que não se viu chegar.",
    drops: [{ itemId: "item-pao-de-cinza", chance: 0.6 }],
    template: {
      id: "enemy-lobo-de-bruma",
      name: "Lobo-de-Bruma",
      race: "kelbar",
      characterClass: "sombrilico",
      level: 3,
      xp: 0,
      attributes: { dain: 6, eir: 1, nath: 5, il: 7, or: 4, len: 2, ul: 1 },
      currentHp: 28,
      maxHp: 28,
      currentNodeId: "node-vau-de-bruma",
      arts: {
        quick_attack: "Bote Silencioso",
        attack: "Dentada",
        heavy_attack: "Investida Cega",
        defend: "Sumir no Vau",
      },
    },
  },

  "encounter-servo-enferrujado": {
    glyph: "⚙",
    principle: "entropia",
    summary: "Autômato taharim de mineração, abandonado tempo demais.",
    lore: "A Entropia já comeu as ordens que ele seguia; sobrou o gesto de bater. Bate com o que restou do braço, e o que restou do braço ainda pesa meia tonelada.",
    drops: [{ itemId: "item-balsamo-de-pedra-de-taharim", chance: 0.5 }],
    template: {
      id: "enemy-servo-enferrujado",
      name: "Servo Enferrujado",
      race: "taharim",
      characterClass: "guardiao",
      level: 4,
      xp: 0,
      attributes: { dain: 7, eir: 1, nath: 7, il: 3, or: 7, len: 1, ul: 1 },
      currentHp: 42,
      maxHp: 42,
      currentNodeId: "node-oficina-morta",
      arts: {
        quick_attack: "Engrenagem Solta",
        attack: "Braço de Ferro",
        heavy_attack: "Queda de Bigorna",
        defend: "Travar as Juntas",
      },
    },
  },

  "encounter-coletor-de-lembrancas": {
    glyph: "⌛",
    principle: "entropia",
    summary: "Padrão de informação órfão, procurando um corpo que o guarde.",
    lore: "Rouba memórias recentes para se completar, e nunca se completa. Quem escapa dele volta sem lembrar por quê — e às vezes volta chamando o próprio nome errado.",
    drops: [
      { itemId: "item-oleo-da-coruja-de-miraven", chance: 0.35 },
      { itemId: "item-lagrima-de-eir", chance: 0.5 },
    ],
    template: {
      id: "enemy-coletor-de-lembrancas",
      name: "Coletor de Lembranças",
      race: "miraven",
      characterClass: "entropista",
      level: 5,
      xp: 0,
      attributes: { dain: 3, eir: 9, nath: 6, il: 6, or: 4, len: 4, ul: 8 },
      currentHp: 38,
      maxHp: 38,
      currentNodeId: "node-arquivo-submerso",
      arts: {
        quick_attack: "Roubo de Instante",
        attack: "Toque Amnésico",
        heavy_attack: "Extração Profunda",
        defend: "Casulo de Memória",
        heal: "Recomposição",
      },
    },
  },

  "encounter-vigia-do-umbral": {
    glyph: "▣",
    principle: "ausencia",
    summary: "Não é criatura: é uma instrução que sobreviveu a quem a deu.",
    lore: "Alguém, muito atrás, determinou que nada atravessasse aquele limiar. Quem determinou já não existe. A determinação, sim — e ela não negocia, não cansa e não pergunta quem você é.",
    drops: [{ itemId: "item-estilhaco-de-prumo", chance: 0.55 }],
    template: {
      id: "enemy-vigia-do-umbral",
      name: "Vigia do Umbral",
      race: "kelbar",
      characterClass: "sombrilico",
      level: 6,
      xp: 0,
      attributes: { dain: 7, eir: 3, nath: 8, il: 10, or: 7, len: 2, ul: 6 },
      currentHp: 50,
      maxHp: 50,
      currentNodeId: "node-umbral",
      arts: {
        quick_attack: "Negativa Breve",
        attack: "Interdito",
        heavy_attack: "Ninguém Passa",
        defend: "Posto Fechado",
      },
    },
  },

  "encounter-cisma-errante": {
    glyph: "✶",
    principle: "fratura",
    summary: "Uma quebra de simetria que nunca parou de quebrar.",
    lore: "Anda porque um lado seu é sempre mais pesado que o outro, e cair para frente é a única coisa que sabe fazer. Fere só de encostar: perto dela, coisas simétricas deixam de ser.",
    drops: [
      { itemId: "item-brasa-de-forjardente", chance: 0.5 },
      { itemId: "item-calice-de-aguas-lentas", chance: 0.3 },
    ],
    template: {
      id: "enemy-cisma-errante",
      name: "Cisma Errante",
      race: "althirim",
      characterClass: "rachador",
      level: 7,
      xp: 0,
      attributes: { dain: 10, eir: 2, nath: 9, il: 11, or: 5, len: 1, ul: 3 },
      currentHp: 56,
      maxHp: 56,
      currentNodeId: "node-fenda-de-prumo",
      arts: {
        quick_attack: "Lasca",
        attack: "Desencontro",
        heavy_attack: "Rachadura Total",
        defend: "Lado Torto",
      },
    },
  },

  "encounter-coro-mudo": {
    glyph: "◉",
    principle: "ealen",
    summary: "Arauto do Silente. Canta invertido, e o mundo fica menos existente.",
    lore: "Onde o Coro Mudo passa, as frequências se cancelam: primeiro somem os ecos, depois os sons, depois a lembrança de ter havido som. Não ataca por raiva — está apenas apagando um trecho, e você está no trecho.",
    drops: [
      { itemId: "item-diapasao-de-bolso", chance: 0.8 },
      { itemId: "item-semente-de-horizonte", chance: 0.4 },
    ],
    template: {
      id: "enemy-coro-mudo",
      name: "O Coro Mudo",
      race: "miraven",
      characterClass: "cantor_de_ealen",
      level: 9,
      xp: 0,
      attributes: { dain: 6, eir: 12, nath: 12, il: 9, or: 9, len: 13, ul: 11 },
      currentHp: 84,
      maxHp: 84,
      currentNodeId: "node-anfiteatro-silente",
      arts: {
        quick_attack: "Antífona Curta",
        attack: "Verso Invertido",
        heavy_attack: "Silêncio Absoluto",
        defend: "Pausa",
        heal: "Sustentar a Nota",
      },
    },
  },
};

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
