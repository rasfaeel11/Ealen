import { addItemToInventory } from "../inventoryEffects";
import { applyXpGain, xpForEnemy } from "../leveling";
import { findBestiaryEntry, spawnCreature } from "../mock/bestiary";
import { findItemTemplate } from "../mock/items";
import { startEncounter } from "../tactics/engine";
import { distance, hasLineOfSight, inBounds, samePos, tileAt, type Pos } from "../tactics/grid";
import { isPropId, standProp, type Prop } from "../tactics/props";
import { isStatusId, type StatusId } from "../tactics/statuses";
import { nextRandom, type RngHolder } from "../tactics/rng";
import type { Cue, CueStatus, Encounter, TacticalEvent, TeamId } from "../tactics/types";
import { findUnit, syncCharacterFromUnit, unitFromCharacter } from "../tactics/units";
import type { Character } from "../types/character";
import type { ConsumableItem } from "../types/inventory";
import type { LevelUpResult } from "../types/levelUp";
import { HERO_ID, castOf, companionId, supportOf } from "../party";
import { CUE_ON_ENEMIES, tileOfPixel, type AreaCue, type AreaEnemy, type AreaMap, type PixelPos } from "./tiledMap";

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
 *
 * E acaba de dois: um lado inteiro no chão, ou uma DEIXA do roteiro dela (os
 * objetos `cue` do mapa, ver fightCues) — a luta que acaba numa rodada, num
 * objetivo cumprido, ou que não se perde.
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

/** Uma ficha do lado do jogador e o quadrado em que ela entra na luta. */
export interface PartyFighter {
  character: Character;
  tile: Pos;
}

/**
 * Onde o grupo entra na luta. O personagem fica onde está (`heroTile`); cada
 * companheiro, no quadrado em que vinha andando (`at`), se der pra ficar de
 * pé nele — senão, no quadrado livre mais perto do personagem. `taken` são os
 * quadrados que já têm dono e a grade não mostra: os dos inimigos que lutam.
 */
export function placeParty(
  map: AreaMap,
  hero: Character,
  heroTile: Pos,
  companions: { character: Character; at: PixelPos }[],
  taken: readonly Pos[] = [],
): PartyFighter[] {
  const used = [heroTile, ...taken];
  const isFree = (tile: Pos) =>
    inBounds(map.grid, tile) && !tileAt(map.grid, tile)!.blocksMove && !used.some((other) => samePos(other, tile));

  const party: PartyFighter[] = [{ character: hero, tile: heroTile }];
  for (const { character, at } of companions) {
    const wanted = tileOfPixel(map, at);
    const tile = isFree(wanted) ? wanted : nearestFree(heroTile, isFree, map.grid.width + map.grid.height);
    // Sem um quadrado livre no mapa inteiro, fica de fora desta luta.
    if (!tile) continue;
    used.push(tile);
    party.push({ character, tile });
  }
  return party;
}

/** O quadrado livre mais perto de `center`, em anéis cada vez maiores. */
function nearestFree(center: Pos, isFree: (tile: Pos) => boolean, maxRadius: number): Pos | undefined {
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let y = center.y - radius; y <= center.y + radius; y++) {
      for (let x = center.x - radius; x <= center.x + radius; x++) {
        const tile = { x, y };
        if (distance(center, tile) === radius && isFree(tile)) return tile;
      }
    }
  }
  return undefined;
}

/** Quem uma deixa aponta quando não é um inimigo: a protagonista, um companheiro, o grupo inteiro. */
const CUE_HERO = "hero";
const CUE_COMPANION = "party:";
const CUE_PARTY = "party";

/** O id, na luta, de quem o mapa chama de `who`: `hero`, `party:chave` ou o Nome de um inimigo dos que lutam. */
function cueUnit(who: string, enemies: readonly AreaEnemy[]): string | undefined {
  if (who === CUE_HERO) return HERO_ID;
  if (who.startsWith(CUE_COMPANION)) return companionId(who.slice(CUE_COMPANION.length));
  return enemies.find((candidate) => candidate.name === who)?.id;
}

/** A condição de uma deixa, com o `on` do mapa trocado pelos ids de quem a recebe. Undefined se a condição não existe ou não há quem a receba. */
function cueStatus(
  apply: NonNullable<AreaCue["apply"]>,
  enemies: readonly AreaEnemy[],
  party: readonly string[],
): CueStatus | undefined {
  if (!isStatusId(apply.status)) return undefined;
  let units: string[];
  if (apply.on === CUE_ON_ENEMIES) units = enemies.map((enemy) => enemy.id);
  else if (apply.on === CUE_PARTY) units = [...party];
  else units = [cueUnit(apply.on, enemies)].filter((id): id is string => id !== undefined);
  return units.length > 0 ? { statusId: apply.status, turns: apply.turns, units } : undefined;
}

/**
 * O roteiro de uma luta, na língua do motor: as deixas de `cues` (as do
 * grupo que vai lutar e que valem agora — quem filtra é quem chama) com os
 * nomes do mapa trocados por ids. `enemies` são os que entram na luta e
 * `party`, os ids de quem luta do lado do jogador (só importa pra condição
 * que cai sobre o grupo inteiro). Uma deixa que espera a queda de quem não
 * está nela, ou um objeto que a área não tem, fica de fora: não dispararia
 * nunca.
 */
export function fightCues(
  map: AreaMap,
  cues: readonly AreaCue[],
  enemies: readonly AreaEnemy[],
  party: readonly string[] = [HERO_ID],
): Cue[] {
  return cues.flatMap(({ id, when, ends, apply }): Cue[] => {
    const status = apply && cueStatus(apply, enemies, party);
    const cue = (resolved: Cue["when"]): Cue[] => [
      { id, when: resolved, ...(status ? { apply: status } : {}), ...(ends ? { ends } : {}) },
    ];
    switch (when.kind) {
      case "round":
      case "defeat":
        return cue(when);
      case "down": {
        const unit = cueUnit(when.who, enemies);
        return unit !== undefined ? cue({ kind: "down", unit }) : [];
      }
      case "broken": {
        const prop = map.props.find((candidate) => candidate.name === when.prop);
        return prop ? cue({ kind: "broken", prop: prop.id }) : [];
      }
      case "used": {
        const props = when.props.map((name) => map.props.find((candidate) => candidate.name === name)?.id);
        return props.every((prop): prop is string => prop !== undefined) ? cue({ kind: "used", props }) : [];
      }
    }
  });
}

/**
 * Abre a luta entre o grupo do jogador (`party`, de placeParty — o primeiro é
 * o personagem) e um grupo de inimigos da área, com os destrutíveis de pé
 * nela (`props`, de standAreaProps). Inimigo cuja criatura não exista no
 * bestiário é ignorado — o teste dos mapas acusa esse erro antes de ele
 * chegar aqui. `surprised` é o lado pego de surpresa, numa emboscada (ver
 * EncounterSetup); `cues`, o roteiro da luta (de fightCues); `onlookers`, as
 * fichas de quem acompanha o grupo sem lutar — não viram unidade, viram o
 * apoio que oferecem (quem não oferece nenhum é ignorado); `lasting`, as
 * condições com que alguém já chega e que duram a luta toda, pelo id (o que
 * a história pôs com `afflict`).
 *
 * O estilo e o que cada um do grupo sabe além do kit vêm do elenco
 * (../party.ts); os das criaturas, do bestiário.
 */
export function startAreaEncounter(
  map: AreaMap,
  party: PartyFighter[],
  enemies: AreaEnemy[],
  seed: number,
  props: Prop[] = [],
  surprised?: TeamId,
  cues: Cue[] = [],
  onlookers: readonly Character[] = [],
  lasting: Record<string, readonly StatusId[]> = {},
): { encounter: Encounter; events: TacticalEvent[] } {
  const supporters = onlookers.flatMap((character) => {
    const support = supportOf(character);
    return support ? [{ id: character.id, name: character.name, support }] : [];
  });
  const units = party.map(({ character, tile }) => {
    const cast = castOf(character);
    return unitFromCharacter(character, { team: "party", pos: tile, style: cast?.style, gifts: cast?.gifts });
  });
  for (const enemy of enemies) {
    const entry = findBestiaryEntry(enemy.creature);
    if (!entry) continue;
    units.push(
      unitFromCharacter(spawnCreature(entry), {
        team: "enemy",
        pos: tileOfPixel(map, enemy),
        id: enemy.id,
        ai: entry.ai,
        invulnerable: entry.invulnerable,
        style: entry.style,
        // No bestiário "hero" é a protagonista; na luta, o id dela.
        quirks: entry.quirks && { ...entry.quirks, ...(entry.quirks.mirrors === CUE_HERO ? { mirrors: HERO_ID } : {}) },
      }),
    );
  }
  return startEncounter({ grid: map.grid, units, props, surprised, cues, supporters, lasting, seed });
}

/**
 * Devolve às fichas do grupo o que a luta gastou. Numa vitória (`won`), quem
 * caiu se levanta com 1 de vida: só o grupo inteiro no chão é derrota.
 */
export function syncPartyFromEncounter(encounter: Encounter, party: Character[], won: boolean): void {
  for (const character of party) {
    const unit = findUnit(encounter, character.id);
    if (!unit) continue;
    syncCharacterFromUnit(character, unit);
    if (won) character.currentHp = Math.max(1, character.currentHp);
  }
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
  /** Os companheiros que subiram de nível, e pra qual. */
  companionLevels: { name: string; level: number }[];
}

/**
 * O que uma vitória rende: XP de cada criatura vencida, o level up que
 * couber, o que elas carregavam sem usar (`carried`, ver unusedItems) e o
 * que deixaram cair por sorteio. Muta `character`. Item que não cabe na
 * mochila é perdido — não trava a vitória. Cada um dos `companions` ganha o
 * mesmo XP, inteiro (não se divide); o espólio vai pra mochila do personagem,
 * que é a do grupo.
 */
export function grantEncounterRewards(
  character: Character,
  creatures: string[],
  rng: RngHolder,
  carried: ConsumableItem[] = [],
  companions: Character[] = [],
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

  const companionLevels: EncounterRewards["companionLevels"] = [];
  for (const companion of companions) {
    if (applyXpGain(companion, xpGained).leveledUp) companionLevels.push({ name: companion.name, level: companion.level });
  }
  return { xpGained, levelUp: applyXpGain(character, xpGained), loot, companionLevels };
}
