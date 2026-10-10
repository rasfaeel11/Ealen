import { gearedAttributes } from "../equipment";
import { rollDie, type RngHolder } from "../tactics/rng";
import type { Attributes } from "../types/attributes";
import { ATTRIBUTE_KEYS } from "../types/attributes";
import type { Character } from "../types/character";

/**
 * Testes de atributo fora de combate — os de Len (persuasão) e Ul (saber)
 * que o texto de um diálogo chama. A conta é a mesma do ataque: d20 +
 * atributo contra uma dificuldade, com o 20 natural sempre passando e o 1
 * sempre falhando. O atributo é o da ficha com o que ela veste somado (um
 * acessório de Len ajuda a convencer).
 *
 * Régua de dificuldade pra quem escreve (atributo de nível 1 fica entre 3
 * e 8): 10 é fácil, 13 é pra quem tem o atributo, 16 é difícil, 19 é quase
 * só com sorte.
 */
export interface SkillCheck {
  attribute: keyof Attributes;
  difficulty: number;
}

export interface CheckResult extends SkillCheck {
  /** O d20 puro. */
  natural: number;
  total: number;
  success: boolean;
}

export function isAttribute(name: unknown): name is keyof Attributes {
  return ATTRIBUTE_KEYS.includes(name as keyof Attributes);
}

export function rollCheck(rng: RngHolder, character: Character, check: SkillCheck): CheckResult {
  const natural = rollDie(rng, 20);
  const total = natural + gearedAttributes(character)[check.attribute];
  const success = natural === 20 || (natural !== 1 && total >= check.difficulty);
  return { ...check, natural, total, success };
}

/** A chance de `character` passar no teste, sem rolar nada. Espelha rollCheck. */
export function checkChance(character: Character, check: SkillCheck): number {
  const needed = check.difficulty - gearedAttributes(character)[check.attribute];
  return Math.min(19, Math.max(1, 21 - needed)) / 20;
}
