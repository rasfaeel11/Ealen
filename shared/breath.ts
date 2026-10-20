import type { StatusId } from "./tactics/statuses";
import type { Character } from "./types/character";

/**
 * O Fôlego: o que uma habilidade gasta além da ação do turno.
 *
 * É um número só por pessoa, da ficha (`Character.breath`), e NÃO volta
 * sozinho: o que se gasta numa luta continua gasto na seguinte, e na cura
 * feita andando pelo mapa. Quem o devolve inteiro é o descanso; dentro de uma
 * luta, só uma habilidade com o efeito `breath` (hoje, pôr-se em guarda), e
 * isso custa a ação do turno.
 *
 * O ritmo de DENTRO da luta tem outra peça, a recarga (`cooldown` na
 * habilidade, ver ./tactics/types.ts): quantos turnos ela leva pra voltar.
 *
 * Os números são PROVISÓRIOS, como os kits.
 */

const BREATH_BASE = 3;
/** Quantos pontos de Vigor dão um de Fôlego. */
const NATH_PER_BREATH = 2;

/** O Fôlego de quem está descansado: cresce com o nível e com Vigor. */
export function maxBreath(character: Pick<Character, "level" | "attributes">): number {
  return BREATH_BASE + character.level + Math.floor(character.attributes.vigor / NATH_PER_BREATH);
}

/** O Fôlego que `character` tem agora. Ficha que nunca gastou (ou de antes de ele existir) está cheia. */
export function breathOf(character: Pick<Character, "level" | "attributes" | "breath">): number {
  const max = maxBreath(character);
  const { breath } = character;
  return typeof breath === "number" && Number.isFinite(breath) ? Math.max(0, Math.min(max, Math.floor(breath))) : max;
}

/**
 * A CURA cobra do paciente (`magia` §4.3): ela acelera o que o corpo faria
 * sozinho, e quem paga é o corpo dele. Cada HEAL_PER_BREATH de vida devolvida
 * custa um de Fôlego de quem a recebe, e a cura nunca vai além do que ele tem
 * pra pagar: sem Fôlego, nada se acelera. E fica a FOME (a condição `hungry`,
 * ver ./tactics/statuses.ts): até o descanso, a cura custa a ele o dobro.
 */
export const HEAL_PER_BREATH = 3;

/** A condição que a cura deixa em quem a recebeu: a fome, até o descanso. */
export const HUNGER: StatusId = "hungry";

/** Quanta vida a cura pode devolver a quem tem `breath` de Fôlego; com fome (`hungry`), a metade. */
export function healCap(breath: number, hungry = false): number {
  return Math.floor((Math.max(0, breath) * HEAL_PER_BREATH) / (hungry ? 2 : 1));
}

/** Quanto Fôlego o paciente paga por `healed` de vida devolvida; com fome, o dobro. */
export function healToll(healed: number, hungry = false): number {
  return Math.ceil((Math.max(0, healed) * (hungry ? 2 : 1)) / HEAL_PER_BREATH);
}

/** Devolve o Fôlego inteiro: é o que o descanso faz. */
export function restoreBreath(character: Character): void {
  character.breath = maxBreath(character);
}
