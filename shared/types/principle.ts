import type { CharacterClass } from "./characterClass";
import type { Race } from "./race";

/**
 * Os Princípios Fundamentais da realidade (ver LORE.md §4). Em Talys não
 * existem elementos (fogo/água/terra) — existem aspectos da física que uma
 * pessoa aprende a manipular, e cada Ordem jogável é a disciplina
 * construída em torno de um deles.
 *
 * Só os seis com Ordem jogável estão aqui. Entalma, Taluen, Lunath e
 * Forjardente existem no cânone mas ainda não têm classe (ver LORE.md §10).
 */
export type Principle = "singularidade" | "harmonia" | "entropia" | "fratura" | "ealen" | "ausencia";

export interface PrincipleInfo {
  name: string;
  /** O conceito físico real por trás do princípio. */
  physics: string;
  /** Resumo em uma frase, pro códice. */
  summary: string;
}

export const PRINCIPLE_INFO: Record<Principle, PrincipleInfo> = {
  singularidade: {
    name: "Singularidade",
    physics: "Singularidade gravitacional, colapso do espaço-tempo, densidade infinita.",
    summary:
      "A origem absoluta, onde todas as leis deixam de fazer sentido. Toda criação tende ao colapso — preservá-la é impedir que o tecido já rompido se rasgue mais.",
  },
  harmonia: {
    name: "Harmonia",
    physics: "Simetria, conservação de energia, equilíbrio dinâmico.",
    summary:
      "A tendência do universo a criar padrões: órbitas, cristais, vida, música, matemática. Beleza e ordem não são coincidência — são propriedade fundamental.",
  },
  entropia: {
    name: "Entropia",
    physics: "Segunda Lei da Termodinâmica, irreversibilidade, calor.",
    summary:
      "Toda estrutura se degrada. Não é maldade — é a única verdade que nunca mentiu. Nada aqui cria: só acelera o que já estava acontecendo.",
  },
  fratura: {
    name: "Fratura Harmônica",
    physics: "Quebra espontânea de simetria.",
    summary:
      "Quando uma simetria perfeita se rompe, nascem forças e estados novos. Perfeição impede evolução; a inovação só vem da ruptura.",
  },
  ealen: {
    name: "Eälen",
    physics: "Ondas, frequência, interferência construtiva e destrutiva.",
    summary:
      "A vibração original da Primeira Ruptura, ainda se propagando. Antes de existir matéria já existia frequência — matéria é frequência que ficou lenta o bastante para ser tocada.",
  },
  ausencia: {
    name: "Ausência",
    physics: "Matéria escura, vazio, regiões não observadas.",
    summary:
      "Não é a sombra projetada pela luz: é o que não está sendo observado. Quanto menos percebido, mais perto do vazio verdadeiro.",
  },
};

/** Princípio que cada Ordem jogável manipula. */
export const CLASS_PRINCIPLE: Record<CharacterClass, Principle> = {
  luminar: "harmonia",
  entropista: "entropia",
  cantor_de_ealen: "ealen",
  guardiao: "singularidade",
  sombrilico: "ausencia",
  rachador: "fratura",
};

export interface RaceInfo {
  name: string;
  /** Onde o povo vive em Talys. */
  homeland: string;
  /** Temperamento cultural, em poucas palavras. */
  temperament: string;
  /** Uma frase de como esse povo enxerga o mundo. */
  creed: string;
}

/**
 * Os quatro Povos de Talys (ver LORE.md §5). Repare que nenhum deles está
 * atrelado a uma Ordem jogável: os Povos cresceram perto de Princípios que
 * em boa parte ainda não viraram classe. Isso é proposital.
 */
export const RACE_INFO: Record<Race, RaceInfo> = {
  althirim: {
    name: "Althirim",
    homeland: "Planaltos altos e secos, longe de tudo",
    temperament: "Contemplação, sabedoria, lentidão deliberada",
    creed: "Se o universo é feito de padrão, entender o padrão é a única obrigação séria.",
  },
  miraven: {
    name: "Miraven",
    homeland: "Cidades submersas sob marés lunares",
    temperament: "Memória, arquivo, luto",
    creed: "Nada se apaga de verdade. O trabalho é guardar até que alguém saiba ler de novo.",
  },
  taharim: {
    name: "Taharim",
    homeland: "Gargantas de pedra e fornalhas",
    temperament: "Trabalho, sol, materialismo prático",
    creed: "Filosofia é o que sobra do dia depois que a forja esfria.",
  },
  kelbar: {
    name: "Kelbar",
    homeland: "As bordas não-mapeadas",
    temperament: "Sombra, compaixão, discrição",
    creed: "Quem ninguém vê enxerga melhor quem precisa de ajuda.",
  },
};
