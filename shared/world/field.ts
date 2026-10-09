import { applyImmediateHeal, consumeInventoryCharge, findInventorySlot } from "../inventoryEffects";
import { findBestiaryEntry, spawnCreature } from "../mock/bestiary";
import { castOf } from "../party";
import { GIFTS, abilitiesFor } from "../tactics/abilities";
import { distance, hasLineOfSight, type Pos } from "../tactics/grid";
import { reachableTiles } from "../tactics/movement";
import type { Prop } from "../tactics/props";
import { rollDice, type RngHolder } from "../tactics/rng";
import type { Ability, Encounter } from "../tactics/types";
import { unitFromCharacter } from "../tactics/units";
import type { Character } from "../types/character";
import { CLASS_INFO } from "../types/characterClass";
import type { ConsumableItem } from "../types/inventory";
import { AMBUSH_RANGE } from "./encounters";
import { tileOfPixel, type AreaEnemy, type AreaMap } from "./tiledMap";

/**
 * Fora de luta: o que dá pra fazer com a mochila e com as habilidades
 * enquanto se anda pelo mapa.
 *
 * - Um ITEM que cura se usa em qualquer um do grupo; os que só mexem numa
 *   luta (um atributo por alguns turnos, o Foco) ficam pra ela.
 * - Uma habilidade que CURA se usa em quem está no grupo, com a mesma conta
 *   do motor (atributo + dados).
 * - Uma habilidade que se mira num inimigo ABRE a luta: quem ainda não
 *   percebeu o personagem leva o golpe antes de a luta começar e entra nela
 *   surpreso (ver Opening em ../tactics/engine.ts). Quem luta de perto corre
 *   até o alvo antes — a investida.
 *
 * TUDO PROVISÓRIO, como os kits: não há recurso que uma habilidade gaste
 * fora de luta (o que há é o relógio — ver quem chama).
 */

/** Tudo que uma ficha sabe fazer: o kit da Ordem e o que só ela sabe (`gifts` no elenco). */
export function sheetAbilities(character: Pick<Character, "id" | "characterClass" | "arts">): Ability[] {
  const gifts = castOf(character)?.gifts ?? [];
  return [...abilitiesFor(character), ...gifts.map((gift): Ability => ({ ...GIFTS[gift] }))];
}

/** Pra que uma habilidade serve fora de luta: `mend` cura alguém do grupo, `opening` abre uma luta. */
export type FieldUse = "mend" | "opening";

/** O uso de `ability` fora de luta. Undefined em quem só faz sentido dentro dela (pôr-se em guarda). */
export function fieldUse(ability: Ability): FieldUse | undefined {
  if (ability.targets === "ally" || ability.targets === "self") {
    return ability.effects.some((effect) => effect.kind === "heal") ? "mend" : undefined;
  }
  return "opening";
}

/**
 * `caster` usa a habilidade de cura `ability` em `target`, fora de luta.
 * Muta `target` e devolve quanto curou; undefined se não é uma cura, se ela
 * só serve em quem a faz e o alvo é outro, ou se o alvo não precisa (e aí o
 * dado nem rola).
 */
export function mend(caster: Character, ability: Ability, target: Character, rng: RngHolder): number | undefined {
  if (fieldUse(ability) !== "mend") return undefined;
  if (ability.targets === "self" && target !== caster) return undefined;
  if (target.currentHp >= target.maxHp) return undefined;

  let healed = 0;
  for (const effect of ability.effects) {
    if (effect.kind !== "heal") continue;
    const attribute = effect.attribute === "primary" ? CLASS_INFO[caster.characterClass].primaryAttributes[0] : effect.attribute;
    const amount = (attribute ? caster.attributes[attribute] : 0) + rollDice(rng, effect.dice);
    const gained = Math.min(target.maxHp - target.currentHp, amount);
    target.currentHp += gained;
    healed += gained;
  }
  return healed;
}

/** Dá pra usar este item andando pelo mapa? Só o que cura: o resto é condição de luta. */
export function usableOutside(item: ConsumableItem): boolean {
  const { kind } = item.data.effect;
  return kind === "heal_hp" || kind === "cure_status";
}

export type FieldItemError = "item_unavailable" | "only_in_fight" | "no_effect";

export type FieldItemResult =
  | { ok: true; healed: number; description: string }
  | { ok: false; reason: FieldItemError };

/**
 * Usa em `target` um item da mochila de `owner` (a do grupo), fora de luta.
 * Recusado, não gasta nada: item que não está lá, item que só serve numa
 * luta, ou alvo que já está inteiro.
 */
export function useItemOutside(owner: Character, itemId: string, target: Character): FieldItemResult {
  const slot = findInventorySlot(owner, itemId);
  if (!slot || slot.quantity <= 0) return { ok: false, reason: "item_unavailable" };
  const { effect } = slot.item.data;
  if (effect.kind !== "heal_hp" && effect.kind !== "cure_status") return { ok: false, reason: "only_in_fight" };
  if (target.currentHp >= target.maxHp) return { ok: false, reason: "no_effect" };

  consumeInventoryCharge(owner, slot);
  return { ok: true, ...applyImmediateHeal(target, effect) };
}

/** Um golpe de abertura possível: em quem, de onde (o quadrado até onde se corre; o próprio, se não precisa) e o quadrado mirado. */
export interface OpeningStrike {
  enemy: AreaEnemy;
  from: Pos;
  target: Pos;
}

/**
 * Em quem `hero`, parado em `heroTile`, pode abrir uma luta com `ability`:
 * os inimigos que ainda não o perceberam (a mesma faixa da emboscada,
 * AMBUSH_RANGE; os `passive` não entram) e que ele alcança com ela — de onde
 * está ou, se não der, do quadrado mais perto aonde chega com o movimento de
 * um turno. `enemies` são os que estão de pé na área; todos barram o caminho.
 * Do mais próximo pro mais distante.
 *
 * Uma habilidade que não mira (`foes`) abre a luta com o grupo mais próximo.
 */
export function openingStrikes(
  map: AreaMap,
  hero: Character,
  heroTile: Pos,
  ability: Ability,
  enemies: readonly AreaEnemy[],
  props: Prop[] = [],
): OpeningStrike[] {
  if (fieldUse(ability) !== "opening") return [];
  const hostile = enemies.filter((enemy) => !enemy.passive && findBestiaryEntry(enemy.creature));
  const gap = (enemy: AreaEnemy) => distance(tileOfPixel(map, enemy), heroTile);
  const near = hostile.filter((enemy) => gap(enemy) <= AMBUSH_RANGE).sort((a, b) => gap(a) - gap(b));
  if (near.length === 0) return [];
  if (ability.targets === "foes") return [{ enemy: near[0], from: { ...heroTile }, target: { ...heroTile } }];

  // Uma luta de mentira, só pra perguntar ao motor aonde ele chega: a mesma regra de movimento de dentro dela.
  const unit = unitFromCharacter(hero, { team: "party", pos: heroTile });
  unit.turn.movement = unit.speed;
  const probe: Encounter = {
    grid: map.grid,
    units: [
      unit,
      ...hostile.map((enemy) =>
        unitFromCharacter(spawnCreature(findBestiaryEntry(enemy.creature)!), {
          team: "enemy",
          pos: tileOfPixel(map, enemy),
          id: enemy.id,
        }),
      ),
    ],
    order: [],
    turnIndex: -1,
    round: 1,
    props,
    surfaces: [],
    cues: [],
    supporters: [],
    rngState: 0,
  };
  const spots = [{ pos: { ...heroTile }, cost: 0 }, ...reachableTiles(probe, unit)].sort((a, b) => a.cost - b.cost);

  return near.flatMap((enemy) => {
    const target = tileOfPixel(map, enemy);
    const spot = spots.find(
      ({ pos }) => distance(pos, target) <= ability.range && hasLineOfSight(map.grid, pos, target),
    );
    return spot ? [{ enemy, from: spot.pos, target }] : [];
  });
}
