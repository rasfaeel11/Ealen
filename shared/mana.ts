import type { StatusId } from "./tactics/statuses";
import type { Character } from "./types/character";

/**
 * A mana: o que quem conjura gasta (`magia` §4 no repositório da história).
 *
 * Magia não é de graça, e o que pesa não é o total, é a PRESSA: gastar mana
 * demais DE UMA VEZ cobra do corpo. Quem conjura tem três números:
 *
 * - a MANA que tem (`Character.mana`; ausente = cheia), que só o descanso
 *   devolve — o que se gasta numa luta continua gasto na seguinte, como o
 *   Fôlego (ver ./breath.ts), que fica pra técnica de espadachim;
 * - o TETO dela (`maxMana`), que cresce com o nível de mago e com Eir;
 * - o LIMITE por turno (`manaLimit`): quanto ele gasta num turno sem que o
 *   corpo pague. É o nível de mago (Verso 1, Estrofe 2, Página 3, Círculo 4...).
 *
 * Passou do limite num turno, vem a MARCA do conceito dele (`CONCEPTS`): a de
 * atração e repulsão é sangue pelo nariz e tremor. O motor a põe na hora
 * (evento `manaBurst`, ver ../tactics/engine.ts) e, acabada a luta, ela vira
 * uma condição que dura entre lutas (`afflict`, ver ../story/runner.ts) até o
 * próximo descanso: é a exaustão LEVE, que passa em dias. A enorme, que fica
 * pra sempre, não acontece com o trio.
 *
 * Quem conjura é quem tem `magic` no elenco (ver ../party.ts): o conceito e o
 * nível. Os números são PROVISÓRIOS, como os kits.
 */

/** Os níveis de mago, do 1 ao 7 (`magia` §7.1): o tamanho do texto que ele domina. */
export const MAGE_LEVELS = ["Verso", "Estrofe", "Página", "Círculo", "Tratado", "Tomo", "Divindade"] as const;

/** O nome do nível de mago `level` ("Página"). Vazio fora de 1 a 7. */
export function mageLevelName(level: number): string {
  return MAGE_LEVELS[level - 1] ?? "";
}

/**
 * Os conceitos que alguém do jogo conjura. Só existe o que uma cena pede: o
 * de Endyru. Cada um diz a marca que deixa em quem passa do limite.
 */
export const CONCEPTS = {
  atracao_repulsao: { name: "Atração e repulsão", mark: "bloodied" },
} satisfies Record<string, { name: string; mark: StatusId }>;

export type ConceptId = keyof typeof CONCEPTS;

export function isConceptId(id: unknown): id is ConceptId {
  return typeof id === "string" && id in CONCEPTS;
}

/** O que faz de alguém um mago: o conceito do sangue dele e o nível (1 a 7). */
export interface Magic {
  concept: ConceptId;
  level: number;
}

/** Quanta mana o nível de mago dá, por nível. */
const MANA_PER_LEVEL = 2;
/** Quantos pontos de Eir (Ressonância) dão um de mana. */
const EIR_PER_MANA = 2;

/** A mana de quem está descansado. */
export function maxMana(character: Pick<Character, "attributes">, magic: Magic): number {
  return MANA_PER_LEVEL * magic.level + Math.floor(character.attributes.eir / EIR_PER_MANA);
}

/** Quanto ele gasta num turno sem o corpo pagar: o nível de mago. */
export function manaLimit(magic: Magic): number {
  return magic.level;
}

/** A mana que `character` tem agora. Ficha que nunca gastou está cheia. */
export function manaOf(character: Pick<Character, "attributes" | "mana">, magic: Magic): number {
  const max = maxMana(character, magic);
  const { mana } = character;
  return typeof mana === "number" && Number.isFinite(mana) ? Math.max(0, Math.min(max, Math.floor(mana))) : max;
}

/** Devolve a mana inteira: é o que o descanso faz. */
export function restoreMana(character: Character, magic: Magic): void {
  character.mana = maxMana(character, magic);
}
