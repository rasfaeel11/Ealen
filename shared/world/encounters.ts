import { addItemToInventory } from "../inventoryEffects";
import { applyXpGain, xpForEnemy } from "../leveling";
import { findBestiaryEntry, spawnCreature } from "../mock/bestiary";
import { findItemTemplate } from "../mock/items";
import { startEncounter } from "../tactics/engine";
import { distance, hasLineOfSight, type Pos } from "../tactics/grid";
import { isPropId, standProp, type Prop } from "../tactics/props";
import { nextRandom, type RngHolder } from "../tactics/rng";
import type { Encounter, TacticalEvent, TeamId } from "../tactics/types";
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
 *
 * Uma luta começa de três jeitos:
 * - o grupo PERCEBE o personagem (aggroedGroup): luta comum;
 * - o personagem ataca primeiro, antes de ser percebido (ambushableGroup):
 *   EMBOSCADA, o grupo entra surpreso e perde o primeiro turno;
 * - a história manda (start_fight no texto, ver ../story/runner.ts): luta
 *   comum, e o único jeito de lutar com um grupo `passive`.
 */

/**
 * Põe de pé, na grade da área, os destrutíveis que ainda não foram quebrados
 * (`broken` são os ids dos que já foram). Muta `map.grid`: a partir daqui
 * eles barram o passo de quem explora e de quem luta, do mesmo jeito. Os
 * objetos devolvidos são os que a luta recebe — quebrado um deles, a grade
 * se abre de novo sozinha.
 */
export function standAreaProps(map: AreaMap, broken: ReadonlySet<string> = new Set()): Prop[] {
  const standing: Prop[] = [];
  for (const prop of map.props) {
    if (broken.has(prop.id) || !isPropId(prop.kind)) continue;
    standing.push(standProp(map.grid, prop.id, prop.kind, prop.tile));
  }
  return standing;
}

/** A quantos quadrados um inimigo percebe o jogador (precisa também enxergá-lo). */
export const AGGRO_RANGE = 5;

/** O grupo que percebeu o jogador em `playerTile`, se algum. `enemies` são só os que ainda estão de pé. */
export function aggroedGroup(map: AreaMap, enemies: AreaEnemy[], playerTile: Pos): string | undefined {
  return enemies.find((enemy) => {
    if (enemy.passive) return false;
    const tile = tileOfPixel(map, enemy);
    return distance(tile, playerTile) <= AGGRO_RANGE && hasLineOfSight(map.grid, tile, playerTile);
  })?.group;
}

/**
 * De quão longe dá pra armar uma emboscada. Maior que AGGRO_RANGE: a faixa
 * entre os dois é de onde se ataca à vista sem ter sido visto. Mais perto
 * que isso, só fora da linha de visão (atrás de uma parede, de uma árvore).
 */
export const AMBUSH_RANGE = 9;

/**
 * O grupo que o jogador, em `playerTile`, pode pegar de surpresa: o do
 * inimigo mais próximo dentro de AMBUSH_RANGE. Não precisa enxergá-lo — quem
 * está ali ainda não percebeu ninguém (se tivesse, aggroedGroup já teria
 * começado a luta). Grupo `passive` não entra: essa luta é da história.
 */
export function ambushableGroup(map: AreaMap, enemies: AreaEnemy[], playerTile: Pos): string | undefined {
  let nearest: AreaEnemy | undefined;
  let best = AMBUSH_RANGE;
  for (const enemy of enemies) {
    if (enemy.passive) continue;
    const gap = distance(tileOfPixel(map, enemy), playerTile);
    if (gap <= best && (gap < best || !nearest)) {
      nearest = enemy;
      best = gap;
    }
  }
  return nearest?.group;
}

/**
 * Abre a luta entre o personagem (em `playerTile`) e um grupo de inimigos
 * da área, com os destrutíveis de pé nela (`props`, de standAreaProps).
 * Inimigo cuja criatura não exista no bestiário é ignorado — o teste dos
 * mapas acusa esse erro antes de ele chegar aqui. `surprised` é o lado pego
 * de surpresa, numa emboscada (ver EncounterSetup).
 */
export function startAreaEncounter(
  map: AreaMap,
  character: Character,
  playerTile: Pos,
  enemies: AreaEnemy[],
  seed: number,
  props: Prop[] = [],
  surprised?: TeamId,
): { encounter: Encounter; events: TacticalEvent[] } {
  const units = [unitFromCharacter(character, { team: "party", pos: playerTile })];
  for (const enemy of enemies) {
    const entry = findBestiaryEntry(enemy.creature);
    if (!entry) continue;
    units.push(
      unitFromCharacter(spawnCreature(entry), { team: "enemy", pos: tileOfPixel(map, enemy), id: enemy.id, ai: entry.ai }),
    );
  }
  return startEncounter({ grid: map.grid, units, props, surprised, seed });
}

/**
 * O que o lado `team` levou pra luta e não usou, uma entrada por unidade de
 * item. É o que os vencidos deixam no chão: derrubar o inimigo antes de ele
 * beber a poção é ficar com ela.
 */
export function unusedItems(encounter: Encounter, team: TeamId): ConsumableItem[] {
  const items: ConsumableItem[] = [];
  for (const unit of encounter.units) {
    if (unit.team !== team) continue;
    for (const slot of unit.inventory?.slots ?? []) {
      for (let i = 0; i < slot.quantity; i++) items.push(slot.item);
    }
  }
  return items;
}

export interface EncounterRewards {
  xpGained: number;
  levelUp: LevelUpResult;
  /** Itens deixados pelas criaturas, já somados à mochila de `character`. */
  loot: ConsumableItem[];
}

/**
 * O que uma vitória rende: XP de cada criatura vencida, o level up que
 * couber, o que elas carregavam sem usar (`carried`, ver unusedItems) e o
 * que deixaram cair por sorteio. Muta `character`. Item que não cabe na
 * mochila é perdido — não trava a vitória.
 */
export function grantEncounterRewards(
  character: Character,
  creatures: string[],
  rng: RngHolder,
  carried: ConsumableItem[] = [],
): EncounterRewards {
  let xpGained = 0;
  const loot: ConsumableItem[] = [];

  for (const item of carried) {
    // O molde, não o item da luta: a mochila guarda itens inteiros.
    const whole = findItemTemplate(item.id) ?? item;
    if (addItemToInventory(character, whole)) loot.push(whole);
  }

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
