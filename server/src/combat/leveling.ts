import type { Character, LevelUpResult } from "@ealen/shared";
import { ATTRIBUTE_KEYS, CLASS_INFO, MOCK_ABILITIES } from "@ealen/shared";

/** XP concedido por vencer um inimigo, baseado no nível dele. */
export function xpForEnemy(enemy: Character): number {
  return enemy.level * 10;
}

/** XP necessário pra sair de `level` e ir pro próximo. */
function xpToNextLevel(level: number): number {
  return level * 100;
}

/**
 * Aplica XP ganho a `character`, subindo de nível quantas vezes o XP
 * acumulado permitir. Muta `character` (xp, level, attributes, maxHp,
 * currentHp) e retorna o resultado a expor no response do combate.
 *
 * O atributo primário da classe sobe mais que os demais a cada nível; Nath
 * (Vitalidade) também aumenta o HP máximo, já que é o atributo que o
 * governa. Se o novo nível bater com o unlockLevel de alguma Ability da
 * classe, ela é retornada como habilidade recém-desbloqueada (a última,
 * se o personagem subir mais de um nível de uma vez).
 */
export function applyXpGain(character: Character, xpGained: number): LevelUpResult {
  character.xp += xpGained;

  let leveledUp = false;
  let newAbility: LevelUpResult["newAbility"];
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

    const unlocked = MOCK_ABILITIES.find(
      (ability) => ability.characterClass === character.characterClass && ability.unlockLevel === character.level,
    );
    if (unlocked) newAbility = unlocked;
  }

  return leveledUp ? { leveledUp: true, newLevel: character.level, newAbility } : { leveledUp: false };
}
