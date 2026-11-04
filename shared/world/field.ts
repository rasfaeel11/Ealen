import { breathOf, healCap, healToll } from "../breath";
import { CONCEPTS, manaLimit, manaOf } from "../mana";
import { gearedAttributes } from "../equipment";
import { applyImmediateHeal, consumeInventoryCharge, findInventorySlot } from "../inventoryEffects";
import { findBestiaryEntry, spawnCreature } from "../data/bestiary";
import { castOf, keepsVow, magicOf } from "../party";
import { GIFTS, abilitiesFor, engravedAbilities } from "../tactics/abilities";
import { AUTO_ORDER, findSkill, skillRefusal, withSkills, skillPassive, type SkillNode, type SkillRefusal } from "../skillTree";
import { distance, hasLineOfSight, type Pos } from "../tactics/grid";
import { reachableTiles } from "../tactics/movement";
import { isBreakable, type Prop } from "../tactics/props";
import type { StatusId } from "../tactics/statuses";
import { rollDice, type RngHolder } from "../tactics/rng";
import type { Ability, Encounter } from "../tactics/types";
import { isRecited, unitFromCharacter } from "../tactics/units";
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
 *   até o alvo antes — a investida. Magia recitada não abre luta (leva
 *   tempo); a GRAVADA, sim: é a emboscada do mago, o círculo preparado antes.
 * - No descanso, quem conjura GRAVA magias (`engrave`): o texto escrito antes
 *   num objeto ou num círculo no chão, uma por gravação, até o nível de mago
 *   dele (`engravingSlots`). Na luta, cada uma sai na hora e serve uma vez.
 *
 * Fora de luta uma habilidade custa o mesmo Fôlego e a mesma mana que dentro
 * (ver ../breath.ts e ../mana.ts) — a cura na hora, o golpe de abertura pelo
 * motor, ao começar a luta. Recarga não há: é coisa de turno. Também não há
 * turno pro limite de mana: fora de luta, só passa dele a magia que custa mais
 * que ele de uma vez (`burstMark`). A cura ainda gasta o relógio (ver quem
 * chama). TUDO PROVISÓRIO, como os kits.
 */

type Knower = Pick<Character, "id" | "characterClass" | "level" | "equipment" | "arts" | "engraved" | "skills" | "mageLevel">;

/** Tudo que uma ficha sabe fazer: o kit da classe, o que só ela sabe (`gifts` no elenco) e o que deixou gravado. */
export function sheetAbilities(character: Knower): Ability[] {
  const gifts = castOf(character)?.gifts ?? [];
  const own = withSkills(character, [...abilitiesFor(character), ...gifts.map((gift): Ability => ({ ...GIFTS[gift] }))]);
  return [...own, ...engravedAbilities(own, character.engraved)];
}

/**
 * Leva ou deixa de levar `abilityId` pra luta. Recusa deixar de fora o último
 * golpe que ele sabe: ninguém entra numa luta sem poder bater. Devolve se mudou.
 */
export function toggleBenched(character: Character, abilityId: string): boolean {
  const benched = character.benched ?? [];
  if (benched.includes(abilityId)) {
    character.benched = benched.filter((id) => id !== abilityId);
    if (character.benched.length === 0) delete character.benched;
    return true;
  }
  const blows = sheetAbilities(character).filter((ability) => !ability.engraved && ability.attack && !benched.includes(ability.id));
  if (blows.length === 1 && blows[0].id === abilityId) return false;
  character.benched = [...benched, abilityId];
  return true;
}

/** Por que `character` não aprende `node` agora (ver skillRefusal em ../skillTree.ts), com a escola e o nível de mago dele. */
export function learnRefusal(character: Character, node: SkillNode): SkillRefusal | undefined {
  return skillRefusal(character, node, { school: castOf(character)?.style?.id, mageLevel: magicOf(character)?.level });
}

/**
 * Gasta um ponto e aprende o nó `nodeId` da árvore. A vida que ele dá entra na
 * ficha na hora (e enche junto); o resto a ficha lê quando precisa. Devolve o
 * que impediu, ou undefined se aprendeu.
 */
export function learnSkill(character: Character, nodeId: string): SkillRefusal | "unknown" | undefined {
  const node = findSkill(nodeId);
  if (!node) return "unknown";
  const refusal = learnRefusal(character, node);
  if (refusal) return refusal;
  character.skills = [...(character.skills ?? []), node.id];
  const hp = node.passive?.maxHp ?? 0;
  if (hp) {
    character.maxHp += hp;
    character.currentHp += hp;
  }
  return undefined;
}

/**
 * Gasta sozinho os pontos de `character`, pela ordem da classe dele
 * (AUTO_ORDER em ../skillTree.ts), até acabarem ou não haver o que aprender.
 * Devolve o que aprendeu, na ordem. É pra quem o jogador deixou escolher sozinho.
 */
export function autoLearn(character: Character): SkillNode[] {
  const learned: SkillNode[] = [];
  const order = AUTO_ORDER[character.characterClass].flatMap((id) => {
    const node = findSkill(id);
    return node ? [node] : [];
  });
  for (;;) {
    const next = order.find((node) => learnRefusal(character, node) === undefined);
    if (!next || learnSkill(character, next.id)) break;
    learned.push(next);
  }
  return learned;
}

/**
 * Desaprende a árvore inteira de `character`: os pontos voltam, e a vida que os
 * nós davam sai da ficha (sem matar ninguém: fica pelo menos 1). Só o
 * acampamento chama. Devolve quantos nós ele esquecia.
 */
export function unlearnSkills(character: Character): number {
  const known = character.skills ?? [];
  if (known.length === 0) return 0;
  const hp = skillPassive(character, "maxHp");
  delete character.skills;
  if (hp) {
    character.maxHp -= hp;
    character.currentHp = Math.max(1, Math.min(character.maxHp, character.currentHp - hp));
  }
  return known.length;
}

/** Pra que uma habilidade serve fora de luta: `mend` cura alguém do grupo, `opening` abre uma luta. */
export type FieldUse = "mend" | "opening";

/**
 * O uso de `ability` fora de luta. Undefined em quem só faz sentido dentro
 * dela (pôr-se em guarda), na magia recitada que se mira em alguém (recitar
 * leva tempo: não abre luta) e na cura gravada (fora de luta, recitar não
 * custa nada; a gravação fica pra luta).
 */
export function fieldUse(ability: Ability): FieldUse | undefined {
  if (ability.targets === "ally" || ability.targets === "self") {
    return !ability.engraved && ability.effects.some((effect) => effect.kind === "heal") ? "mend" : undefined;
  }
  return isRecited(ability) ? undefined : "opening";
}

/** Quantas gravações cabem nele ao mesmo tempo: o nível de mago. Quem não conjura não grava nada. */
export function engravingSlots(character: Pick<Character, "id" | "skills">): number {
  const level = magicOf(character)?.level;
  return level === undefined ? 0 : level + skillPassive(character, "engravings");
}

/** As magias de `character` que dá pra gravar: as que custam mana, do kit e as que só ele sabe. */
export function engravable(character: Knower): Ability[] {
  return sheetAbilities(character).filter((ability) => (ability.mana ?? 0) > 0 && !ability.engraved);
}

/**
 * Grava a magia `abilityId` num objeto ou num círculo: é coisa do descanso, e
 * quem chama é ele. Recusa (e não muda nada) se não cabe mais nenhuma ou se
 * não é uma magia dele. Devolve se gravou.
 */
export function engrave(character: Character, abilityId: string): boolean {
  if ((character.engraved?.length ?? 0) >= engravingSlots(character)) return false;
  if (!engravable(character).some((ability) => ability.id === abilityId)) return false;
  character.engraved = [...(character.engraved ?? []), abilityId];
  return true;
}

type Payer = Pick<Character, "id" | "level" | "attributes" | "breath" | "mana">;

/** O que falta a `character` pra usar `ability` fora de luta: `breath` (Fôlego), `mana` (numa magia; quem não conjura não tem nenhuma), ou nada. */
export function missing(character: Payer, ability: Ability): "breath" | "mana" | undefined {
  if (breathOf(character) < (ability.breath ?? 0)) return "breath";
  if (!ability.mana) return undefined;
  const magic = magicOf(character);
  return magic !== undefined && manaOf(character, magic) >= ability.mana ? undefined : "mana";
}

/** Cobra de `character` o Fôlego e a mana de `ability`, fora de luta: o golpe que só quebra um destrutível. */
export function payOutside(character: Character, ability: Ability): void {
  if (ability.breath) character.breath = breathOf(character) - ability.breath;
  const magic = magicOf(character);
  if (ability.mana && magic) character.mana = manaOf(character, magic) - ability.mana;
}

/** `character` tem com que pagar `ability` fora de luta? */
export function canAfford(character: Payer, ability: Ability): boolean {
  return missing(character, ability) === undefined;
}

/**
 * A marca que `character` leva se usar `ability` fora de luta: a do conceito
 * dele, se a magia custa mais que o limite dele de uma vez. Undefined se o
 * corpo aguenta (ou se não é magia). Quem a põe na história é quem chama.
 */
export function burstMark(character: Pick<Character, "id">, ability: Ability): StatusId | undefined {
  const magic = magicOf(character);
  if (!magic || (ability.mana ?? 0) <= manaLimit(magic)) return undefined;
  return CONCEPTS[magic.concept].mark;
}

/**
 * `caster` usa a habilidade de cura `ability` em `target`, fora de luta.
 * Muta `target`, cobra o Fôlego (e a mana) de `caster` e devolve quanto
 * curou; undefined se não é uma cura, se ela só serve em quem a faz e o alvo é
 * outro, se falta o que pagar (ver canAfford), se o alvo não precisa ou não
 * tem Fôlego pra pagar a cura — e aí nada se gasta, nem o dado rola.
 *
 * Quem paga a cura é o paciente, como dentro da luta (ver HEAL_PER_BREATH em
 * ../breath.ts): `target` perde o Fôlego dela, e a cura não vai além do que
 * ele tem. Com fome (`hungry`: a condição que a história guarda pra ele), o
 * dobro. A fome que ela deixa (`HUNGER`) quem põe na história é quem chama.
 */
export function mend(caster: Character, ability: Ability, target: Character, rng: RngHolder, hungry = false): number | undefined {
  if (fieldUse(ability) !== "mend") return undefined;
  if (ability.targets === "self" && target !== caster) return undefined;
  if (target.currentHp >= target.maxHp || !canAfford(caster, ability) || healCap(breathOf(target), hungry) <= 0) return undefined;

  if (ability.breath) caster.breath = breathOf(caster) - ability.breath;
  const magic = magicOf(caster);
  if (ability.mana && magic) caster.mana = manaOf(caster, magic) - ability.mana;
  let healed = 0;
  for (const effect of ability.effects) {
    if (effect.kind !== "heal") continue;
    const attribute = effect.attribute === "primary" ? CLASS_INFO[caster.characterClass].primaryAttributes[0] : effect.attribute;
    const amount = (attribute ? gearedAttributes(caster)[attribute] : 0) + rollDice(rng, effect.dice);
    const gained = Math.min(target.maxHp - target.currentHp, amount, healCap(breathOf(target), hungry));
    target.breath = breathOf(target) - healToll(gained, hungry);
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

/**
 * Um golpe de abertura possível: em quem, de onde (o quadrado até onde se
 * corre; o próprio, se não precisa) e o quadrado mirado. Mirado num
 * destrutível (`prop`), `enemy` é quem está perto dele e entra na luta — sem
 * ninguém perto, o golpe só quebra o destrutível, fora de luta.
 */
export interface OpeningStrike {
  enemy?: AreaEnemy;
  prop?: Prop;
  from: Pos;
  target: Pos;
}

/** De quão perto de um destrutível quebrado um inimigo acorda pra luta: o barulho do barril arrebentando. */
export const PROP_ALARM = 4;

/**
 * Em quem `hero`, parado em `heroTile`, pode abrir uma luta com `ability`:
 * os inimigos que ainda não o perceberam (a mesma faixa da emboscada,
 * AMBUSH_RANGE; os `passive` não entram) e que ele alcança com ela — de onde
 * está ou, se não der, do quadrado mais perto aonde chega com o movimento de
 * um turno. `enemies` são os que estão de pé na área; todos barram o caminho.
 * Do mais próximo pro mais distante. Sem Fôlego pra ela (ver canAfford),
 * ninguém.
 *
 * Uma habilidade que não mira (`foes`) abre a luta com o grupo mais próximo.
 *
 * Golpe que fere também mira os destrutíveis ao alcance (`props`): o barril de
 * óleo ao lado de quem não viu ninguém. O inimigo de pé a até PROP_ALARM dele
 * entra na luta; sem nenhum, o golpe só quebra o destrutível (ver OpeningStrike).
 * Numa área, além do inimigo, vale mirar o quadrado que pega mais gente do grupo.
 */
export function openingStrikes(
  map: AreaMap,
  hero: Character,
  heroTile: Pos,
  ability: Ability,
  enemies: readonly AreaEnemy[],
  props: Prop[] = [],
): OpeningStrike[] {
  if (fieldUse(ability) !== "opening" || !canAfford(hero, ability)) return [];
  // Quem é da Ipojy não dá golpe de abertura: é o voto.
  if (keepsVow(hero)) return [];
  const hostile = enemies.filter((enemy) => !enemy.passive && findBestiaryEntry(enemy.creature));
  const gap = (enemy: AreaEnemy) => distance(tileOfPixel(map, enemy), heroTile);
  const near = hostile.filter((enemy) => gap(enemy) <= AMBUSH_RANGE).sort((a, b) => gap(a) - gap(b));
  const breakable = props.filter((prop) => isBreakable(prop) && distance(prop.pos, heroTile) <= AMBUSH_RANGE);
  const hurts = ability.effects.some((effect) => effect.kind === "damage") && ability.targets !== "foes";
  if (near.length === 0 && !(hurts && breakable.length > 0)) return [];
  if (ability.targets === "foes") return near.length > 0 ? [{ enemy: near[0], from: { ...heroTile }, target: { ...heroTile } }] : [];

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

  const reach = (target: Pos) => spots.find(({ pos }) => distance(pos, target) <= ability.range && hasLineOfSight(map.grid, pos, target));
  const strikes: OpeningStrike[] = near.flatMap((enemy) => {
    const target = tileOfPixel(map, enemy);
    const spot = reach(target);
    return spot ? [{ enemy, from: spot.pos, target }] : [];
  });

  // Numa área mirada no chão, o quadrado que pega mais gente de cada grupo (se pega mais de um).
  if (ability.targets === "tile" && ability.radius !== undefined) {
    const radius = ability.radius;
    for (const group of new Set(near.map((enemy) => enemy.group))) {
      const members = near.filter((enemy) => enemy.group === group).map((enemy) => ({ enemy, tile: tileOfPixel(map, enemy) }));
      let best: { target: Pos; count: number; from: Pos; enemy: AreaEnemy } | undefined;
      for (const { tile } of members) {
        for (let y = tile.y - radius; y <= tile.y + radius; y++) {
          for (let x = tile.x - radius; x <= tile.x + radius; x++) {
            const target = { x, y };
            const hit = members.filter((member) => distance(member.tile, target) <= radius && hasLineOfSight(map.grid, target, member.tile));
            const spot = hit.length > 1 ? reach(target) : undefined;
            if (spot && (!best || hit.length > best.count)) best = { target, count: hit.length, from: spot.pos, enemy: hit[0].enemy };
          }
        }
      }
      if (best) strikes.push({ enemy: best.enemy, from: best.from, target: best.target });
    }
  }

  if (hurts) {
    for (const prop of breakable) {
      const spot = reach(prop.pos);
      if (!spot) continue;
      const woken = hostile
        .filter((enemy) => distance(tileOfPixel(map, enemy), prop.pos) <= PROP_ALARM)
        .sort((a, b) => distance(tileOfPixel(map, a), prop.pos) - distance(tileOfPixel(map, b), prop.pos))[0];
      // Sem ninguém perto, o golpe só quebra: a gravação, que serve uma vez, fica pra luta.
      if (!woken && ability.engraved) continue;
      strikes.push({ ...(woken ? { enemy: woken } : {}), prop, from: spot.pos, target: { ...prop.pos } });
    }
  }
  return strikes;
}
