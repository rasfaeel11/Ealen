import { breathOf, maxBreath } from "../breath";
import { manaLimit, manaOf, maxMana, type Magic } from "../mana";
import { gearDefense, gearSpeed, gearedAttributes } from "../equipment";
import type { Attributes } from "../types/attributes";
import type { Character } from "../types/character";
import { CLASS_INFO } from "../types/characterClass";
import { GIFTS, abilitiesFor, engravedAbilities, engravedId, type GiftId } from "./abilities";
import { proficiency, type StyleId } from "./styles";
import { samePos, type Pos } from "./grid";
import type { Ability, AiProfile, AiQuirks, Encounter, TeamId, Unit } from "./types";

/** Quadrados de movimento por turno de quem não diz o contrário. */
export const DEFAULT_SPEED = 6;

export interface UnitPlacement {
  team: TeamId;
  pos: Pos;
  /** Obrigatório quando a mesma ficha entra mais de uma vez na luta (três lobos = três ids). */
  id?: string;
  /** Pesos da IA de quem não é comandado pelo jogador (ver AiProfile). */
  ai?: Partial<AiProfile>;
  /** Não tem vida pra perder (ver `invulnerable` em Unit). */
  invulnerable?: boolean;
  /** Manias da IA (ver AiQuirks). */
  quirks?: AiQuirks;
  /** A escola (ou o Baluarte) e a proficiência nela (ver ./styles.ts). A proficiência entra limitada por `aura`. */
  style?: { id: StyleId; grade: number };
  /** O nível de aura, 1 a 7: o teto da proficiência. */
  aura?: number;
  /** Habilidades próprias, além das da Ordem (ver GIFTS em ./abilities.ts). */
  gifts?: readonly GiftId[];
  /** Conjura: o conceito e o nível de mago (ver ../mana.ts). A mana dele vem da ficha. */
  magic?: Magic;
  /** Bicho de rio, o peso dele e se a mana gasta de uma vez o atrai (ver `river`, `heft` e `drawnToMana` em Unit). */
  river?: boolean;
  heft?: number;
  drawnToMana?: boolean;
}

/**
 * Põe uma ficha (personagem do jogador ou criatura do bestiário) dentro de
 * uma luta. Copia o que a luta precisa: nada do que acontecer no combate
 * mexe em `character` até alguém chamar syncCharacterFromUnit.
 */
export function unitFromCharacter(character: Character, placement: UnitPlacement): Unit {
  const own = [...abilitiesFor(character), ...(placement.gifts ?? []).map((gift): Ability => ({ ...GIFTS[gift] }))];
  return {
    id: placement.id ?? character.id,
    name: character.name,
    team: placement.team,
    characterClass: character.characterClass,
    level: character.level,
    // O que ele veste entra aqui (ver ../equipment.ts): o acessório nos atributos, a armadura na defesa e no passo.
    attributes: gearedAttributes(character),
    currentHp: character.currentHp,
    maxHp: character.maxHp,
    pos: { ...placement.pos },
    speed: Math.max(1, DEFAULT_SPEED + gearSpeed(character)),
    ...(gearDefense(character) ? { defense: gearDefense(character) } : {}),
    // O que ele sabe, e as magias que deixou gravadas no descanso (ver engravedAbilities em ./abilities.ts).
    abilities: [...own, ...engravedAbilities(own, character.engraved)],
    statuses: [],
    breath: breathOf(character),
    maxBreath: maxBreath(character),
    ...(placement.magic
      ? {
          mana: manaOf(character, placement.magic),
          maxMana: maxMana(character, placement.magic),
          manaLimit: manaLimit(placement.magic),
          concept: placement.magic.concept,
        }
      : {}),
    inventory: character.inventory ? structuredClone(character.inventory) : undefined,
    ai: placement.ai ? { ...placement.ai } : undefined,
    ...(placement.invulnerable ? { invulnerable: true } : {}),
    ...(placement.river ? { river: true } : {}),
    ...(placement.heft ? { heft: placement.heft } : {}),
    ...(placement.drawnToMana ? { drawnToMana: true } : {}),
    ...(placement.quirks ? { quirks: { ...placement.quirks } } : {}),
    ...(placement.style ? { style: placement.style.id, grade: proficiency(placement.style.grade, placement.aura) } : {}),
    ...(placement.aura !== undefined ? { aura: placement.aura } : {}),
    turn: { movement: 0, action: false, bonus: false, reaction: true },
  };
}

/** Devolve à ficha o que a luta gastou: HP, Fôlego, mana, as gravações ativadas e a mochila. */
export function syncCharacterFromUnit(character: Character, unit: Unit): void {
  character.currentHp = unit.currentHp;
  character.breath = unit.breath;
  if (unit.mana !== undefined) character.mana = unit.mana;
  if (character.engraved) {
    // Cada gravação serve uma vez: a que a luta ativou sai da ficha.
    const left = character.engraved.filter((abilityId, index) => !unit.used?.[engravedId(abilityId, index)]);
    if (left.length > 0) character.engraved = left;
    else delete character.engraved;
  }
  if (unit.inventory) character.inventory = structuredClone(unit.inventory);
}

/**
 * O contrário: a mochila da ficha passa a ser a da unidade. É como o que a
 * história dá ou tira NO MEIO de uma luta (uma deixa) chega a quem está lutando.
 */
export function syncUnitInventory(unit: Unit, character: Character): void {
  unit.inventory = character.inventory ? structuredClone(character.inventory) : undefined;
}

/** Quantas vezes `unit` ainda pode usar `ability` nesta luta. Infinito em quem não tem `limit`. */
export function usesLeft(unit: Unit, ability: Ability): number {
  return ability.limit === undefined ? Infinity : Math.max(0, ability.limit - (unit.used?.[ability.id] ?? 0));
}

/** Por quantos turnos de `unit` a habilidade ainda fica em recarga. 0 = pronta. */
export function cooldownLeft(unit: Unit, ability: Ability): number {
  return Math.min(unit.cooldowns?.[ability.id] ?? 0, ability.cooldown ?? 0);
}

/**
 * Por que `unit` não pode usar `ability` agora — ou `ready`, se pode: `spent`
 * é a ação (ou a bônus) do turno já gasta, `limit` os usos da luta,
 * `recharging` a recarga, `breath` o Fôlego que falta, `mana` a mana que
 * falta (quem não conjura não tem nenhuma) e `reciting` uma magia recitada
 * pedida por quem já está recitando outra. Não olha alvo.
 */
export type Readiness = "ready" | "spent" | "limit" | "recharging" | "breath" | "mana" | "reciting";

/** Magia que se recita: leva tempo (sai no turno seguinte) e pode quebrar. A gravada, não. */
export function isRecited(ability: Ability): boolean {
  return (ability.mana ?? 0) > 0 && !ability.engraved;
}

/**
 * `unit` pode usar `ability` agora? É a mesma pergunta pro motor, pra IA e
 * pra interface. Com `outOfTurn`, não confere a ação do turno: é o golpe dado
 * fora dele (o de abertura, o ataque de oportunidade).
 */
export function readiness(unit: Unit, ability: Ability, outOfTurn = false): Readiness {
  if (!outOfTurn && !(ability.cost === "action" ? unit.turn.action : unit.turn.bonus)) return "spent";
  if (usesLeft(unit, ability) <= 0) return "limit";
  if ((unit.cooldowns?.[ability.id] ?? 0) > 0) return "recharging";
  if (unit.breath < (ability.breath ?? 0)) return "breath";
  if ((ability.mana ?? 0) > 0 && (unit.mana ?? 0) < ability.mana!) return "mana";
  if (isRecited(ability) && unit.reciting) return "reciting";
  return "ready";
}

export function isAlive(unit: Unit): boolean {
  return unit.currentHp > 0;
}

export function findUnit(encounter: Encounter, id: string): Unit | undefined {
  return encounter.units.find((unit) => unit.id === id);
}

/** A luta acabou: um lado venceu, ou uma deixa a parou sem vencedor. */
export function isOver(encounter: Encounter): boolean {
  return encounter.winner !== undefined || encounter.stopped === true;
}

/** Quem está no turno — o do turno a mais, se há um acontecendo (`interlude`). Undefined só depois que a luta acabou. */
export function activeUnit(encounter: Encounter): Unit | undefined {
  if (isOver(encounter)) return undefined;
  return findUnit(encounter, encounter.interlude ?? encounter.order[encounter.turnIndex]);
}

/** Quem está de pé neste quadrado. Mortos não ocupam espaço. */
export function unitAt(encounter: Encounter, pos: Pos): Unit | undefined {
  return encounter.units.find((unit) => isAlive(unit) && samePos(unit.pos, pos));
}

export function primaryAttribute(unit: Pick<Unit, "characterClass">): keyof Attributes {
  return CLASS_INFO[unit.characterClass].primaryAttributes[0];
}

/** Os quadrados de movimento que `unit` tem num turno, com as condições que prendem (ou soltam) o passo. Nunca abaixo de zero. */
export function movementOf(unit: Unit): number {
  return Math.max(0, unit.speed + unit.statuses.reduce((sum, status) => sum + (status.speed ?? 0), 0));
}

/** O que as condições de `unit` somam (ou tiram) de cada golpe que ele recebe, antes da armadura. */
export function damageTakenOf(unit: Unit): number {
  return unit.statuses.reduce((sum, status) => sum + (status.damageTaken ?? 0), 0);
}

/** A defesa de `unit` além do Couro: o que a armadura dá e o que as condições de esquiva somam. */
export function defenseBonus(unit: Unit): number {
  return (unit.defense ?? 0) + unit.statuses.reduce((sum, status) => sum + (status.evasion ?? 0), 0);
}

/** Atributo já com as condições ativas somadas. Nunca fica negativo. */
export function effectiveAttribute(unit: Unit, stat: keyof Attributes): number {
  const bonus = unit.statuses.reduce((sum, status) => sum + (status.attributeBonus?.[stat] ?? 0), 0);
  return Math.max(0, unit.attributes[stat] + bonus);
}
