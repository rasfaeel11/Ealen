import { ATTRIBUTE_KEYS, type Attributes } from "./types/attributes";
import { RACE_MODIFIERS, type Race } from "./types/race";
import { CLASS_INFO, type CharacterClass } from "./types/characterClass";

const BASE_ATTRIBUTE_VALUE = 5;
/** Bônus aplicado a cada atributo primário da classe na criação. */
const PRIMARY_ATTRIBUTE_BONUS = 2;

/** Atributos iniciais de um personagem novo: base + modificador racial + bônus de classe. */
export function createStartingAttributes(race: Race, characterClass: CharacterClass): Attributes {
  const attributes = {} as Attributes;
  const raceModifier = RACE_MODIFIERS[race];
  const primaryAttributes = CLASS_INFO[characterClass].primaryAttributes;

  for (const key of ATTRIBUTE_KEYS) {
    attributes[key] =
      BASE_ATTRIBUTE_VALUE + (raceModifier[key] ?? 0) + (primaryAttributes.includes(key) ? PRIMARY_ATTRIBUTE_BONUS : 0);
  }

  return attributes;
}

/** HP máximo inicial, derivado de Nath (Vitalidade). */
export function startingMaxHp(attributes: Attributes): number {
  return 20 + attributes.nath * 4;
}
