import type { Character } from "./types/character";
import type { LearnedAbility, LevelUpResult } from "./types/levelUp";
import { ATTRIBUTE_KEYS, type Attributes } from "./types/attributes";
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
 * O atributo primário da classe sobe mais que os demais a cada nível; Vigor
 * também aumenta o HP máximo, já que é o atributo que o
 * governa. As Técnicas que a classe dá em cada nível alcançado (ver
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
      if (key === "vigor") {
        const hpGrowth = growth * 3;
        character.maxHp += hpGrowth;
        character.currentHp = Math.min(character.maxHp, character.currentHp + hpGrowth);
      }
    }

    for (const { id, name, flavor } of learnedAt(character.characterClass, character.level)) learned.push({ id, name, flavor });
  }

  return leveledUp ? { leveledUp: true, newLevel: character.level, learned } : { leveledUp: false };
}

/** Os pontos de atributo que cada nível depois do primeiro dá, pra pôr onde o jogador quiser (além do que o nível já soma sozinho). */
export const ATTRIBUTE_POINTS_PER_LEVEL = 1;
/** A vida máxima que cada ponto posto em Vigor dá: o mesmo que o nível dá por ponto de Vigor. */
const HP_PER_VIGOR = 3;

/** Os pontos de atributo que `character` ainda tem pra pôr: um por nível depois do primeiro, menos o que já pôs. */
export function attributePoints(character: Pick<Character, "level" | "raised">): number {
  const spent = Object.values(character.raised ?? {}).reduce((sum, n) => sum + (n ?? 0), 0);
  return Math.max(0, (character.level - 1) * ATTRIBUTE_POINTS_PER_LEVEL - spent);
}

/**
 * Põe um ponto em `key`. Vigor dá vida na hora (e enche junto), como o nível
 * dá. Falso se não há ponto.
 */
export function raiseAttribute(character: Character, key: keyof Attributes): boolean {
  if (attributePoints(character) < 1) return false;
  character.raised = { ...character.raised, [key]: (character.raised?.[key] ?? 0) + 1 };
  character.attributes[key] += 1;
  if (key === "vigor") {
    character.maxHp += HP_PER_VIGOR;
    character.currentHp += HP_PER_VIGOR;
  }
  return true;
}

/**
 * Põe sozinho os pontos de `character`, revezando entre os atributos que a
 * classe escala (o que recebeu menos primeiro). É pra quem o jogador deixou
 * escolher sozinho. Devolve onde pôs, na ordem.
 */
export function autoRaise(character: Character): (keyof Attributes)[] {
  const primary = CLASS_INFO[character.characterClass].primaryAttributes;
  const raised: (keyof Attributes)[] = [];
  while (attributePoints(character) > 0) {
    const key = primary.reduce((best, each) => ((character.raised?.[each] ?? 0) < (character.raised?.[best] ?? 0) ? each : best));
    raiseAttribute(character, key);
    raised.push(key);
  }
  return raised;
}
