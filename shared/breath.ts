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
/** Quantos pontos de Nath (Vitalidade) dão um de Fôlego. */
const NATH_PER_BREATH = 2;

/** O Fôlego de quem está descansado: cresce com o nível e com Nath. */
export function maxBreath(character: Pick<Character, "level" | "attributes">): number {
  return BREATH_BASE + character.level + Math.floor(character.attributes.nath / NATH_PER_BREATH);
}

/** O Fôlego que `character` tem agora. Ficha que nunca gastou (ou de antes de ele existir) está cheia. */
export function breathOf(character: Pick<Character, "level" | "attributes" | "breath">): number {
  const max = maxBreath(character);
  const { breath } = character;
  return typeof breath === "number" && Number.isFinite(breath) ? Math.max(0, Math.min(max, Math.floor(breath))) : max;
}

/** Devolve o Fôlego inteiro: é o que o descanso faz. */
export function restoreBreath(character: Character): void {
  character.breath = maxBreath(character);
}
