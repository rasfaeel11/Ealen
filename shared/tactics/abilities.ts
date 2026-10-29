import { CLASS_COMBAT_ARTS, CLASS_TECHNIQUES, STANCE_ORDER, type CombatArt, type CombatStance } from "../combatArts";
import { armOf, type Arm } from "../equipment";
import type { Character } from "../types/character";
import type { CharacterClass } from "../types/characterClass";
import type { Dice } from "./rng";
import type { Ability, Effect } from "./types";

/**
 * Os kits: o que cada classe sabe fazer numa luta.
 *
 * Um kit são as cinco Artes da classe (as posturas de ../combatArts.ts) mais
 * as Técnicas dela, que chegam com o nível. As posturas têm o mesmo NOME de
 * papel em toda classe — golpe rápido, golpe, golpe pesado, guarda, cura —,
 * mas cada uma faz com elas o que ela é:
 *
 * - ATRAÇÃO E REPULSÃO (Endyru): puxa e empurra de longe, desarma e
 *   arremessa, e cura — tudo magia, paga em mana e recitada. Só o bordão é
 *   de graça e sai na hora. Nos níveis baixos o espadachim amassa o mago
 *   (`magia` §5.3): ele é controle e preparo; quem mata são os outros dois.
 * - ESPADACHIM (Jarupã, Xanduí): golpe rápido, golpe, golpe pesado (que
 *   custa Fôlego) e guarda. O que diferencia um do outro é a escola.
 *
 * O motor sabe mais do que esses dois kits pedem (área, chão que queima ou
 * gela, golpe que fura a armadura ou devolve vida, condições de toda sorte):
 * são peças pras criaturas e os dons que vierem, e os testes as exercitam com
 * um kit deles.
 *
 * Um GOLPE DE ARMA tira o dado, o alcance e o acerto de com o que a pessoa
 * bate (`Arm`, ver ../equipment.ts): a arma que empunha ou, de mãos vazias,
 * 1d6 de perto. O que não é golpe de arma (a magia, a guarda) tem os próprios
 * números. Tudo se resolve AQUI, ao montar o kit: a luta recebe habilidades
 * prontas, e o motor não sabe que arma existe.
 *
 * O que custa Fôlego (ver ../breath.ts) é o que pesa: o golpe pesado e o que
 * só uma pessoa sabe; a magia custa mana. Golpe comum e golpe rápido não
 * cansam, e quem se põe em guarda TOMA fôlego: sempre há o que fazer com ele
 * no zero, e o jeito de tê-lo de volta no meio da luta é gastar a ação do
 * turno nisso.
 *
 * OS NÚMEROS SÃO PROVISÓRIOS (o `balance:matrix` é quem os confere); as
 * peças, não. Mexer num kit é editar dados neste arquivo.
 */

const HEAL_RANGE = 4;

const HEAVY_BREATH = 2;
/** O golpe pesado não sai em dois turnos seguidos. */
const HEAVY_COOLDOWN = 1;
/** O Fôlego que um turno em guarda devolve. */
const GUARD_BREATH = 1;

const D6: Dice = { count: 1, sides: 6 };
const D8: Dice = { count: 1, sides: 8 };

type Damage = Extract<Effect, { kind: "damage" }>;
/** Uma habilidade do kit, sem o que vem de fora: o id (a classe e a chave) e o nome e o flavor (de ../combatArts.ts). */
type Body = Omit<Ability, "id" | "name" | "flavor">;

/** O dano de um golpe de arma: o dado dela mais o atributo primário da classe. */
function hurt(arm: Arm, extra: Partial<Damage> = {}): Damage {
  return { kind: "damage", dice: arm.dice, attribute: "primary", ...extra };
}

/** O golpe pesado: quase o dobro, com metade do Força por cima. */
function heavy(arm: Arm): Damage {
  return hurt(arm, { multiplier: 1.8, bonus: { attribute: "forca", divisor: 2 } });
}

/** De onde e com que acerto sai um golpe de arma num inimigo. */
function wield(arm: Arm, toHit = 0): Pick<Body, "range" | "targets" | "attack"> {
  return { range: arm.range, targets: "enemy", attack: { toHit: toHit + arm.toHit } };
}

/** Só quem luta de perto pune quem sai de perto. */
function punishes(arm: Arm): boolean {
  return arm.range <= 2;
}

/** A guarda comum: bloqueia até o próximo turno e devolve Fôlego. */
const GUARD: Body = {
  cost: "action",
  range: 0,
  targets: "self",
  effects: [
    { kind: "status", statusId: "guarding", turns: 1 },
    { kind: "breath", amount: GUARD_BREATH },
  ],
};

/** A Cura de quem conjura (`magia` §4.3): o mesmo texto de primeiros socorros, pago em mana, e recitado. */
const CURE: Body = { cost: "action", range: HEAL_RANGE, targets: "ally", effects: [{ kind: "heal", dice: D6, attribute: "fator" }], mana: 2 };

/**
 * O kit de cada classe: as habilidades dela pela chave (as posturas e as
 * Técnicas de ../combatArts.ts), montadas sobre com o que a pessoa bate.
 */
const KITS: Record<CharacterClass, (arm: Arm) => Record<string, Body>> = {
  // Endyru: atração e repulsão. A magia (o que custa mana) é recitada: sai no começo do turno seguinte e pode
  // quebrar (ver `mana` em Ability). Os números são provisórios: o Puxão é um verso, o Empurrão uma página, e o
  // Arremesso e o Desarmar são do Círculo (só chegam com ele, ver CLASS_TECHNIQUES): o Arremesso custa o limite
  // inteiro de um Círculo num turno, e qualquer verso a mais no mesmo turno passa dele.
  atracao_repulsao: (arm) => ({
    quick_attack: {
      cost: "bonus",
      range: 4,
      targets: "enemy",
      attack: { toHit: 2 },
      effects: [{ kind: "push", distance: -2 }],
      mana: 1,
    },
    attack: { cost: "action", ...wield(arm), effects: [hurt(arm)], opportunity: punishes(arm) },
    heavy_attack: {
      cost: "action",
      range: 3,
      targets: "enemy",
      attack: { toHit: 0 },
      effects: [
        { kind: "damage", dice: D6, attribute: "primary" },
        { kind: "push", distance: 2 },
      ],
      mana: 2,
    },
    defend: GUARD,
    heal: CURE,
    desarmar: {
      cost: "action",
      range: 4,
      targets: "enemy",
      attack: { toHit: 1 },
      effects: [{ kind: "status", statusId: "disarmed", turns: 2 }],
      mana: 3,
    },
    arremesso: {
      cost: "action",
      range: 4,
      targets: "enemy",
      attack: { toHit: 0 },
      effects: [
        { kind: "damage", dice: D8, attribute: "primary", multiplier: 1.5 },
        { kind: "push", distance: 3 },
      ],
      mana: 4,
    },
  }),

  // Jarupã e Xanduí: a lâmina. O que pesa custa Fôlego; a escola (o traço, o triângulo) vem do elenco.
  espadachim: (arm) => ({
    quick_attack: { cost: "bonus", ...wield(arm, 3), effects: [hurt(arm, { multiplier: 0.6 })] },
    attack: { cost: "action", ...wield(arm), effects: [hurt(arm)], opportunity: punishes(arm) },
    heavy_attack: {
      cost: "action",
      ...wield(arm, -4),
      effects: [heavy(arm)],
      breath: HEAVY_BREATH,
      cooldown: HEAVY_COOLDOWN,
    },
    defend: GUARD,
  }),
};

/** O nome, o que é no mundo e a partir de que nível se sabe a habilidade `slug` da classe. Undefined se a classe não a tem (a cura do espadachim). */
function artOf(characterClass: CharacterClass, slug: string): (CombatArt & { level: number; mage?: number }) | undefined {
  const technique = CLASS_TECHNIQUES[characterClass][slug];
  if (technique) return technique;
  const art = STANCE_ORDER.includes(slug as CombatStance) ? CLASS_COMBAT_ARTS[characterClass][slug as CombatStance] : null;
  return art ? { ...art, level: 1 } : undefined;
}

/**
 * Habilidades que são de UMA pessoa, não de uma classe: o que alguém do
 * elenco sabe fazer além do kit (`gifts` em ../party.ts). Nenhum é golpe-selo
 * (`magia` §5.6): é o costume de cada um, não técnica de iniciação. Os números
 * são provisórios como o resto.
 *
 * - `shoulder` é de Jarupã: o ombro antes da espada. Empurra um quadrado, e
 *   quem estava de costas pra parede bate nela (ver push em ./engine.ts).
 * - `hold_the_lunge` é de Xanduí: ela não bate, segura. Quem fica Seguro quase
 *   não anda — o bicho em seco não volta pra água. É golpe: o voto da Ipojy vale.

 */
export const GIFTS = {
  shoulder: {
    id: "gift.shoulder",
    name: "Ombrada",
    flavor: "O ombro antes da espada. Quem estava de costas pra parede descobre a parede.",
    cost: "bonus",
    range: 1,
    targets: "enemy",
    attack: { toHit: 1 },
    effects: [{ kind: "push", distance: 1 }],
    breath: 1,
    cooldown: 2,
  },
  hold_the_lunge: {
    id: "gift.hold_the_lunge",
    name: "Segurar o Bote",
    flavor: "Ela não bate: segura. O braço que mostrou onde ia estar fica preso ali.",
    cost: "bonus",
    range: 1,
    targets: "enemy",
    attack: { toHit: 1 },
    effects: [{ kind: "status", statusId: "held", turns: 2 }],
    breath: 2,
    cooldown: 3,
  },
} satisfies Record<string, Ability>;

export type GiftId = keyof typeof GIFTS;

export function isGiftId(id: unknown): id is GiftId {
  return typeof id === "string" && id in GIFTS;
}

/** O id de uma gravação na luta: a magia e a posição dela entre as gravações da ficha (`atracao_repulsao.quick_attack#gravada1`). */
export function engravedId(abilityId: string, index: number): string {
  return `${abilityId}#gravada${index + 1}`;
}

/**
 * As gravações de uma ficha (`Character.engraved`, ver ../world/field.ts) como
 * habilidades de luta: cada uma é a magia de `own` que ela guarda, com id
 * próprio, sem o tempo de recitar (`engraved`) e de um uso só (`limit`). A
 * mana se paga na ativação, como na recitada. Gravação de magia que ele não
 * tem (mais) não vira nada.
 */
export function engravedAbilities(own: readonly Ability[], engraved: readonly string[] | undefined): Ability[] {
  return (engraved ?? []).flatMap((abilityId, index) => {
    const spell = own.find((ability) => ability.id === abilityId && (ability.mana ?? 0) > 0);
    if (!spell) return [];
    return [{ ...spell, id: engravedId(abilityId, index), name: `${spell.name} (gravada)`, engraved: true, limit: 1 }];
  });
}

/** Uma habilidade do kit de uma classe, com o nível em que se aprende. */
export interface KitAbility {
  /** A chave dela no kit: o fim do id (`atracao_repulsao.desarmar`). */
  slug: string;
  level: number;
  /** O nível de mago que ela pede, além do nível (ver `mage` em Technique, ../combatArts.ts). */
  mage?: number;
  ability: Ability;
}

type Fighter = Pick<Character, "characterClass" | "equipment">;

/**
 * O kit inteiro da classe de `character`, na ordem em que aparece (as Artes,
 * depois as Técnicas), montado sobre com o que ele bate. Não olha o nível:
 * é o que a ficha usa pra mostrar o que ainda vem.
 */
export function kitOf(character: Fighter): KitAbility[] {
  const { characterClass } = character;
  return Object.entries(KITS[characterClass](armOf(character))).flatMap(([slug, body]) => {
    const art = artOf(characterClass, slug);
    if (!art) return [];
    const ability: Ability = { id: `${characterClass}.${slug}`, name: art.name, flavor: art.flavor, ...body };
    return [{ slug, level: art.level, ...(art.mage !== undefined ? { mage: art.mage } : {}), ability }];
  });
}

/**
 * As habilidades de um combatente: do kit da classe dele, as que o nível (e o
 * nível de mago, nas que o pedem) já deu. Uma criatura (`arts`) sabe só o que
 * nomeia, com os nomes próprios dela por cima (o Ykuruã dá uma Bocada, não
 * um "Golpe") — o nível não entra.
 */
export function abilitiesFor(character: Fighter & Pick<Character, "level" | "arts" | "mageLevel">): Ability[] {
  const { arts } = character;
  return kitOf(character).flatMap(({ slug, level, mage, ability }) => {
    if (arts ? arts[slug] === undefined : level > character.level || (mage ?? 0) > (character.mageLevel ?? 0)) return [];
    return [{ ...ability, name: arts?.[slug] ?? ability.name }];
  });
}

/** As Técnicas que a classe dá exatamente no nível `level`: o que se aprende ao chegar nele. As do nível de mago, não. */
export function learnedAt(characterClass: CharacterClass, level: number): Ability[] {
  return kitOf({ characterClass })
    .filter((entry) => entry.level === level && level > 1 && entry.mage === undefined)
    .map((entry) => entry.ability);
}

/** As Técnicas que a classe dá exatamente no nível de mago `mage`: o que se aprende ao chegar nele. */
export function learnedAtMage(characterClass: CharacterClass, mage: number): Ability[] {
  return kitOf({ characterClass })
    .filter((entry) => entry.mage === mage)
    .map((entry) => entry.ability);
}
