import { CLASS_COMBAT_ARTS, STANCE_ORDER, type CombatArt, type CombatStance } from "../combatArts";
import type { Character } from "../types/character";
import type { CharacterClass } from "../types/characterClass";
import type { Ability, Effect } from "./types";

/**
 * As habilidades de cada Ordem, montadas a partir das Artes que já existiam
 * (nome e flavor vêm de shared/combatArts.ts).
 *
 * TUDO AQUI É PROVISÓRIO. Os números e os alcances existem pra exercitar o
 * motor — distância, área, empurrão, ação bônus — enquanto a história não
 * diz o que cada Ordem realmente faz. Trocar o kit de uma Ordem é editar
 * dados neste arquivo; o motor não muda.
 *
 * O que custa Fôlego (ver ../breath.ts) é o que pesa: o golpe pesado, a cura
 * e o que só uma pessoa sabe. Golpe comum e golpe rápido não cansam, e quem
 * se põe em guarda TOMA fôlego: sempre há o que fazer com ele no zero, e o
 * jeito de tê-lo de volta no meio da luta é gastar a ação do turno nisso.
 */

/** Alcance dos ataques de cada Ordem, em quadrados. 1 = corpo a corpo. */
const ATTACK_RANGE: Record<CharacterClass, number> = {
  luminar: 1,
  guardiao: 1,
  sombrilico: 1,
  rachador: 6,
  cantor_de_ealen: 5,
  entropista: 5,
};

const HEAL_RANGE = 4;

const HEAVY_BREATH = 2;
/** O golpe pesado não sai em dois turnos seguidos. */
const HEAVY_COOLDOWN = 1;
const HEAL_BREATH = 2;
/** O Fôlego que um turno em guarda devolve. */
const GUARD_BREATH = 1;

const D6 = { count: 1, sides: 6 };

const HEAVY_DAMAGE: Effect = {
  kind: "damage",
  dice: D6,
  attribute: "primary",
  multiplier: 1.8,
  bonus: { attribute: "dain", divisor: 2 },
};

function buildAbility(characterClass: CharacterClass, stance: CombatStance, art: CombatArt): Ability {
  const base = { id: `${characterClass}.${stance}`, name: art.name, flavor: art.flavor };
  const range = ATTACK_RANGE[characterClass];

  switch (stance) {
    // O golpe rápido cabe na ação bônus: fraco, mas vem ALÉM do ataque do turno.
    case "quick_attack":
      return {
        ...base,
        cost: "bonus",
        range,
        targets: "enemy",
        attack: { toHit: 3 },
        effects: [{ kind: "damage", dice: D6, attribute: "primary", multiplier: 0.6 }],
      };
    case "attack":
      return {
        ...base,
        cost: "action",
        range,
        targets: "enemy",
        attack: { toHit: 0 },
        effects: [{ kind: "damage", dice: D6, attribute: "primary" }],
        // Só quem luta de perto pune quem sai de perto.
        opportunity: range === 1,
      };
    case "heavy_attack":
      return {
        ...base,
        cost: "action",
        range,
        targets: "enemy",
        attack: { toHit: -4 },
        effects: [HEAVY_DAMAGE],
        breath: HEAVY_BREATH,
        cooldown: HEAVY_COOLDOWN,
      };
    case "defend":
      return {
        ...base,
        cost: "action",
        range: 0,
        targets: "self",
        effects: [
          { kind: "status", statusId: "guarding", turns: 1 },
          { kind: "breath", amount: GUARD_BREATH },
        ],
      };
    case "heal":
      return {
        ...base,
        cost: "action",
        range: HEAL_RANGE,
        targets: "ally",
        effects: [{ kind: "heal", dice: D6, attribute: "eir" }],
        breath: HEAL_BREATH,
      };
  }
}

/**
 * Onde uma Ordem foge do molde. Um exemplo de cada peça que o molde não usa:
 * o Guardião arremessa o alvo, o Cantor acerta uma área e deixa nela um chão
 * que prende o passo, o Entropista deixa o chão do alvo em chamas.
 */
const CLASS_TWISTS: Partial<Record<CharacterClass, Partial<Record<CombatStance, Partial<Ability>>>>> = {
  guardiao: {
    heavy_attack: { effects: [HEAVY_DAMAGE, { kind: "push", distance: 2 }] },
  },
  cantor_de_ealen: {
    heavy_attack: { targets: "tile", radius: 1, surface: { id: "frost", rounds: 2 } },
  },
  entropista: {
    heavy_attack: { surface: { id: "fire", rounds: 2 } },
  },
};

/**
 * Habilidades que são de UMA pessoa, não de uma Ordem: o que alguém do elenco
 * sabe fazer além do kit (`gifts` em ../party.ts). Provisórias como o resto.
 *
 * `tide_pull` é o repuxo de Varel: adianta a maré e abre a guarda de todo
 * inimigo de pé. Uma vez por luta, e a magia cobra — Fôlego, e o turno
 * seguinte dele.
 */
export const GIFTS = {
  tide_pull: {
    id: "gift.tide_pull",
    name: "Adiantar a Maré",
    flavor: "A água chega antes da hora e leva o chão de quem estava firme. Quem a chamou fica sem fôlego.",
    cost: "action",
    range: 0,
    targets: "foes",
    effects: [{ kind: "status", statusId: "exposed", turns: 2 }],
    limit: 1,
    breath: 3,
    backlash: { statusId: "winded", turns: 1 },
  },
} satisfies Record<string, Ability>;

export type GiftId = keyof typeof GIFTS;

export function isGiftId(id: unknown): id is GiftId {
  return typeof id === "string" && id in GIFTS;
}

/**
 * As habilidades de um combatente: as da Ordem dele, com os nomes próprios
 * da criatura por cima quando houver (um Lobo-de-Bruma dá um Bote
 * Silencioso, não uma "Lâmina Não-Vista").
 */
export function abilitiesFor(character: Pick<Character, "characterClass" | "arts">): Ability[] {
  const { characterClass } = character;
  const abilities: Ability[] = [];

  for (const stance of STANCE_ORDER) {
    const art = CLASS_COMBAT_ARTS[characterClass][stance];
    if (!art) continue;

    abilities.push({
      ...buildAbility(characterClass, stance, art),
      ...CLASS_TWISTS[characterClass]?.[stance],
      name: character.arts?.[stance] ?? art.name,
    });
  }
  return abilities;
}
