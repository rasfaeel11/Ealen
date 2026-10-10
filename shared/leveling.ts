import type { Character } from "./types/character";
import type { LearnedAbility, LevelUpResult } from "./types/levelUp";
import { ATTRIBUTE_KEYS } from "./types/attributes";
import { CLASS_INFO } from "./types/characterClass";
import { learnedAt } from "./tactics/abilities";

/** XP concedido por vencer um inimigo, baseado no nível dele. */
export function xpForEnemy(enemy: Pick<Character, "level">): number {
  return enemy.level * 10;
}

const XP_PER_LEVEL = 100;

/** XP necessário pra sair de `level` e ir pro próximo: uma reta — o mesmo custo extra a cada nível, sem paredão no fim. */
export function xpToNextLevel(level: number): number {
  return XP_PER_LEVEL * level;
}

/**
 * Aplica XP ganho a `character`, subindo de nível quantas vezes o XP
 * acumulado permitir. Muta `character` (xp, level, attributes, maxHp,
 * currentHp) e retorna o resultado a mostrar no fim do combate.
 *
 * O atributo primário da classe sobe mais que os demais a cada nível; Nath
 * (Vitalidade) também aumenta o HP máximo, já que é o atributo que o
 * governa. As Técnicas que a Ordem dá em cada nível alcançado (ver
 * `learnedAt` em ./tactics/abilities.ts) voltam em `learned`: a ficha já as
 * tem — o kit se monta pelo nível —, isto é só o que há pra anunciar.
 */
export function applyXpGain(character: Character, xpGained: number): LevelUpResult {
  character.xp += xpGained;

  let leveledUp = false;
  const learned: LearnedAbility[] = [];
  const primaryAttributes = CLASS_INFO[character.characterClass].primaryAttributes;

  while (character.xp >= xpToNextLevel(character.level)) {
    character.xp -= xpToNextLevel(character.level);
    character.level += 1;
    leveledUp = true;

    for (const key of ATTRIBUTE_KEYS) {
      const growth = primaryAttributes.includes(key) ? 2 : 1;
      character.attributes[key] += growth;
      if (key === "nath") {
        const hpGrowth = growth * 3;
        character.maxHp += hpGrowth;
        character.currentHp = Math.min(character.maxHp, character.currentHp + hpGrowth);
      }
    }

    for (const { id, name, flavor } of learnedAt(character.characterClass, character.level)) learned.push({ id, name, flavor });
  }

  return leveledUp ? { leveledUp: true, newLevel: character.level, learned } : { leveledUp: false };
}
