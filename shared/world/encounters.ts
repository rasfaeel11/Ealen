import { addItemToInventory } from "../inventoryEffects";
import { applyXpGain, xpForEnemy } from "../leveling";
import { findBestiaryEntry } from "../mock/bestiary";
import { findItemTemplate } from "../mock/items";
import { startEncounter } from "../tactics/engine";
import { distance, hasLineOfSight, type Pos } from "../tactics/grid";
import { nextRandom, type RngHolder } from "../tactics/rng";
import type { Encounter, TacticalEvent } from "../tactics/types";
import { unitFromCharacter } from "../tactics/units";
import type { Character } from "../types/character";
import type { ConsumableItem } from "../types/inventory";
import type { LevelUpResult } from "../types/levelUp";
import { tileOfPixel, type AreaEnemy, type AreaMap } from "./tiledMap";

/**
 * A ponte entre o mundo e o combate: quando uma luta começa, quem entra
 * nela, e o que o vencedor leva.
 *
 * Inimigos ficam de pé no mapa, à vista. Cada um pertence a um GRUPO; ver
 * um deles de perto puxa o grupo inteiro pra luta, que acontece ali mesmo,
 * na grade da própria área.
 */

/** A quantos quadrados um inimigo percebe o jogador (precisa também enxergá-lo). */
export const AGGRO_RANGE = 5;

/** O grupo que percebeu o jogador em `playerTile`, se algum. `enemies` são só os que ainda estão de pé. */
export function aggroedGroup(map: AreaMap, enemies: AreaEnemy[], playerTile: Pos): string | undefined {
  return enemies.find((enemy) => {
    const tile = tileOfPixel(map, enemy);
    return distance(tile, playerTile) <= AGGRO_RANGE && hasLineOfSight(map.grid, tile, playerTile);
  })?.group;
}

/**
 * Abre a luta entre o personagem (em `playerTile`) e um grupo de inimigos
 * da área. Inimigo cuja criatura não exista no bestiário é ignorado — o
 * teste dos mapas acusa esse erro antes de ele chegar aqui.
 */
export function startAreaEncounter(
  map: AreaMap,
  character: Character,
  playerTile: Pos,
  enemies: AreaEnemy[],
  seed: number,
): { encounter: Encounter; events: TacticalEvent[] } {
  const units = [unitFromCharacter(character, { team: "party", pos: playerTile })];
  for (const enemy of enemies) {
    const entry = findBestiaryEntry(enemy.creature);
    if (!entry) continue;
    units.push(
      unitFromCharacter(entry.template, { team: "enemy", pos: tileOfPixel(map, enemy), id: enemy.id, ai: entry.ai }),
    );
  }
  return startEncounter({ grid: map.grid, units, seed });
}

export interface EncounterRewards {
  xpGained: number;
  levelUp: LevelUpResult;
  /** Itens deixados pelas criaturas, já somados à mochila de `character`. */
  loot: ConsumableItem[];
}

/**
 * O que uma vitória rende: XP de cada criatura vencida, o level up que
 * couber e o que elas deixaram cair. Muta `character`. Item sorteado com a
 * mochila cheia é perdido — não trava a vitória.
 */
export function grantEncounterRewards(character: Character, creatures: string[], rng: RngHolder): EncounterRewards {
  let xpGained = 0;
  const loot: ConsumableItem[] = [];

  for (const creature of creatures) {
    const entry = findBestiaryEntry(creature);
    if (!entry) continue;
    xpGained += xpForEnemy(entry.template);

    for (const drop of entry.drops) {
      if (nextRandom(rng) > drop.chance) continue;
      const item = findItemTemplate(drop.itemId);
      if (item && addItemToInventory(character, item)) loot.push(item);
    }
  }

  return { xpGained, levelUp: applyXpGain(character, xpGained), loot };
}
