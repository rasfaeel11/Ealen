import { CLASS_COMBAT_ARTS, CLASS_TECHNIQUES, STANCE_ORDER, type CombatArt, type CombatStance } from "../combatArts";
import { armOf, type Arm } from "../equipment";
import type { Character } from "../types/character";
import type { CharacterClass } from "../types/characterClass";
import type { Dice } from "./rng";
import type { Ability, Effect } from "./types";

/**
 * Os kits: o que cada Ordem sabe fazer numa luta.
 *
 * Um kit são as cinco Artes da Ordem (as posturas de ../combatArts.ts) mais
 * as Técnicas dela, que chegam com o nível. As posturas têm o mesmo NOME de
 * papel em toda Ordem — golpe rápido, golpe, golpe pesado, guarda, cura —,
 * mas cada Ordem faz com elas o que o Princípio dela faz:
 *
 * - GUARDIÃO (gravidade): puxa de longe quem ele quer por perto, arremessa,
 *   prende o passo, e se ancora — nada o move.
 * - LUMINAR (ordem): acerta sempre, tira o prumo de quem apanha, põe uma
 *   guarda na frente de um aliado e devolve a si o que tirou do outro.
 * - ENTROPISTA (desgaste): enferruja a guarda, deixa o alvo decaindo, queima
 *   o chão, envelhece a armadura e trava a cura.
 * - CANTOR (frequência): canta em área, gela o chão, abafa o golpe de alguém
 *   e ressoa em dobro.
 * - SOMBRÍLICO (ausência): cada corte leva Fôlego junto, a guarda dele é não
 *   estar lá, e o melhor golpe não tem defesa.
 * - RACHADOR (fratura): abre trincas que o próximo golpe aproveita, fura a
 *   armadura, e se defende ficando torto.
 *
 * Um GOLPE DE ARMA tira o dado, o alcance e o acerto de com o que a pessoa
 * bate (`Arm`, ver ../equipment.ts): a arma que empunha ou, de mãos vazias, o
 * natural da Ordem. O que não é golpe de arma (o puxão do Guardião, a guarda)
 * tem os próprios números. Tudo se resolve AQUI, ao montar o kit: a luta
 * recebe habilidades prontas, e o motor não sabe que arma existe.
 *
 * O que custa Fôlego (ver ../breath.ts) é o que pesa: o golpe pesado, a cura,
 * as Técnicas e o que só uma pessoa sabe. Golpe comum e golpe rápido não
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
const HEAL_BREATH = 2;
/** O Fôlego que um turno em guarda devolve. */
const GUARD_BREATH = 1;

const D6: Dice = { count: 1, sides: 6 };

type Damage = Extract<Effect, { kind: "damage" }>;
/** Uma habilidade do kit, sem o que vem de fora: o id (a Ordem e a chave) e o nome e o flavor (de ../combatArts.ts). */
type Body = Omit<Ability, "id" | "name" | "flavor">;

/** O dano de um golpe de arma: o dado dela mais o atributo primário da Ordem. */
function hurt(arm: Arm, extra: Partial<Damage> = {}): Damage {
  return { kind: "damage", dice: arm.dice, attribute: "primary", ...extra };
}

/** O golpe pesado: quase o dobro, com metade do Dain por cima. */
function heavy(arm: Arm): Damage {
  return hurt(arm, { multiplier: 1.8, bonus: { attribute: "dain", divisor: 2 } });
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

const HEAL: Body = {
  cost: "action",
  range: HEAL_RANGE,
  targets: "ally",
  effects: [{ kind: "heal", dice: D6, attribute: "eir" }],
  breath: HEAL_BREATH,
};

/**
 * O kit de cada Ordem: as habilidades dela pela chave (as posturas e as
 * Técnicas de ../combatArts.ts), montadas sobre com o que a pessoa bate.
 */
const KITS: Record<CharacterClass, (arm: Arm) => Record<string, Body>> = {
  guardiao: (arm) => ({
    // Não é a arma, é o peso: de longe, puxa o alvo pra dentro do próprio alcance.
    quick_attack: {
      cost: "bonus",
      range: 3,
      targets: "enemy",
      attack: { toHit: 3 },
      effects: [
        { kind: "damage", dice: D6, attribute: "primary", multiplier: 0.6 },
        { kind: "push", distance: -2 },
      ],
    },
    attack: { cost: "action", ...wield(arm), effects: [hurt(arm)], opportunity: punishes(arm) },
    heavy_attack: {
      cost: "action",
      ...wield(arm, -4),
      effects: [heavy(arm), { kind: "push", distance: 2 }],
      breath: HEAVY_BREATH,
      cooldown: HEAVY_COOLDOWN,
    },
    defend: GUARD,
    puxao_de_mare: {
      cost: "action",
      range: 4,
      targets: "enemy",
      attack: { toHit: 0 },
      effects: [
        { kind: "damage", dice: D6, attribute: "dain" },
        { kind: "status", statusId: "heavy", turns: 2 },
      ],
      breath: 1,
      cooldown: 2,
    },
    ancora_da_singularidade: {
      cost: "bonus",
      range: 0,
      targets: "self",
      effects: [{ kind: "status", statusId: "anchored", turns: 3 }],
      breath: 2,
      cooldown: 4,
    },
  }),

  luminar: (arm) => ({
    // Três tempos exatos: quase não erra.
    quick_attack: { cost: "bonus", ...wield(arm, 5), effects: [hurt(arm, { multiplier: 0.6 })] },
    attack: { cost: "action", ...wield(arm), effects: [hurt(arm)], opportunity: punishes(arm) },
    heavy_attack: {
      cost: "action",
      ...wield(arm, -4),
      effects: [heavy(arm), { kind: "status", statusId: "off_balance", turns: 2 }],
      breath: HEAVY_BREATH,
      cooldown: HEAVY_COOLDOWN,
    },
    defend: GUARD,
    heal: HEAL,
    muralha_de_prumo: {
      cost: "bonus",
      range: 4,
      targets: "ally",
      effects: [{ kind: "status", statusId: "warded", turns: 1 }],
      breath: 1,
      cooldown: 1,
    },
    antifona_de_aurora: {
      cost: "action",
      ...wield(arm),
      effects: [hurt(arm, { leech: 1 })],
      breath: 2,
      cooldown: 2,
    },
  }),

  entropista: (arm) => ({
    // A ferrugem chega antes do golpe: derruba a guarda que estiver de pé.
    quick_attack: {
      cost: "bonus",
      ...wield(arm, 3),
      effects: [hurt(arm, { multiplier: 0.5 }), { kind: "status", statusId: "rusted", turns: 2 }],
    },
    attack: {
      cost: "action",
      ...wield(arm),
      effects: [hurt(arm), { kind: "status", statusId: "decaying", turns: 2 }],
      opportunity: punishes(arm),
    },
    heavy_attack: {
      cost: "action",
      ...wield(arm, -4),
      effects: [heavy(arm)],
      surface: { id: "fire", rounds: 2 },
      breath: HEAVY_BREATH,
      cooldown: HEAVY_COOLDOWN,
    },
    defend: GUARD,
    heal: HEAL,
    marca_de_decaimento: {
      cost: "action",
      range: arm.range,
      targets: "enemy",
      effects: [{ kind: "status", statusId: "decay_mark", turns: 3 }],
      breath: 1,
      cooldown: 2,
    },
    lei_irreversivel: {
      cost: "action",
      ...wield(arm),
      effects: [hurt(arm), { kind: "status", statusId: "irreversible", turns: 3 }],
      breath: 2,
      cooldown: 3,
    },
  }),

  cantor_de_ealen: (arm) => ({
    quick_attack: { cost: "bonus", ...wield(arm, 3), effects: [hurt(arm, { multiplier: 0.6 })] },
    attack: { cost: "action", ...wield(arm), effects: [hurt(arm)], opportunity: punishes(arm) },
    // O refrão não escolhe ouvido: pega todo mundo em volta do ponto, e o chão fica gelado.
    heavy_attack: {
      cost: "action",
      range: arm.range,
      targets: "tile",
      radius: 1,
      attack: { toHit: -4 + arm.toHit },
      effects: [heavy(arm)],
      surface: { id: "frost", rounds: 2 },
      breath: HEAVY_BREATH,
      cooldown: HEAVY_COOLDOWN,
    },
    defend: GUARD,
    heal: HEAL,
    refrao_do_silencio: {
      cost: "bonus",
      range: arm.range,
      targets: "enemy",
      effects: [{ kind: "status", statusId: "muffled", turns: 2 }],
      breath: 1,
      cooldown: 2,
    },
    coro_de_uma_voz_so: {
      cost: "bonus",
      range: 0,
      targets: "self",
      effects: [{ kind: "status", statusId: "chorus", turns: 3 }],
      breath: 3,
      limit: 1,
    },
  }),

  sombrilico: (arm) => ({
    quick_attack: { cost: "bonus", ...wield(arm, 3), effects: [hurt(arm, { multiplier: 0.6 })] },
    // O corte leva o que ninguém estava olhando: o Fôlego de quem apanha.
    attack: {
      cost: "action",
      ...wield(arm),
      effects: [hurt(arm), { kind: "breath", amount: -1 }],
      opportunity: punishes(arm),
    },
    heavy_attack: {
      cost: "action",
      ...wield(arm, -4),
      effects: [heavy(arm), { kind: "breath", amount: -2 }],
      breath: HEAVY_BREATH,
      cooldown: HEAVY_COOLDOWN,
    },
    // Não bloqueia: não está lá.
    defend: {
      cost: "action",
      range: 0,
      targets: "self",
      effects: [
        { kind: "status", statusId: "unseen", turns: 1 },
        { kind: "breath", amount: GUARD_BREATH },
      ],
    },
    // Some até a vez dele chegar, e o golpe que vier depois é crítico. Custa o golpe deste turno.
    deixar_de_ser_notado: {
      cost: "action",
      range: 0,
      targets: "self",
      effects: [
        { kind: "status", statusId: "unseen", turns: 1 },
        { kind: "status", statusId: "focused", turns: 2 },
      ],
      breath: 2,
      cooldown: 3,
    },
    // Sem rolagem: não há o que esquivar no que não se viu. E a armadura não conta.
    corte_do_nao_dito: {
      cost: "action",
      range: arm.range,
      targets: "enemy",
      effects: [hurt(arm, { multiplier: 1.2, piercing: true })],
      breath: 3,
      cooldown: 2,
    },
  }),

  rachador: (arm) => ({
    // Quase não fere: abre a trinca que o próximo golpe aproveita.
    quick_attack: {
      cost: "bonus",
      ...wield(arm, 3),
      effects: [hurt(arm, { multiplier: 0.4 }), { kind: "status", statusId: "cracked", turns: 2 }],
    },
    attack: { cost: "action", ...wield(arm), effects: [hurt(arm)], opportunity: punishes(arm) },
    heavy_attack: {
      cost: "action",
      ...wield(arm, -4),
      effects: [heavy(arm), { kind: "status", statusId: "exposed", turns: 2 }],
      breath: HEAVY_BREATH,
      cooldown: HEAVY_COOLDOWN,
    },
    // Não bloqueia: fica onde o golpe certo não passa.
    defend: {
      cost: "action",
      range: 0,
      targets: "self",
      effects: [
        { kind: "status", statusId: "oblique", turns: 1 },
        { kind: "breath", amount: GUARD_BREATH },
      ],
    },
    falha_no_padrao: {
      cost: "action",
      ...wield(arm, 2),
      effects: [hurt(arm, { piercing: true })],
      breath: 1,
      cooldown: 1,
    },
    simetria_quebrada: {
      cost: "action",
      ...wield(arm),
      effects: [hurt(arm), { kind: "status", statusId: "broken_symmetry", turns: 3 }],
      breath: 2,
      cooldown: 3,
    },
  }),
};

/** O nome, o que é no mundo e a partir de que nível se sabe a habilidade `slug` da Ordem. Undefined se a Ordem não a tem (a cura de quem não cura). */
function artOf(characterClass: CharacterClass, slug: string): (CombatArt & { level: number }) | undefined {
  const technique = CLASS_TECHNIQUES[characterClass][slug];
  if (technique) return technique;
  const art = STANCE_ORDER.includes(slug as CombatStance) ? CLASS_COMBAT_ARTS[characterClass][slug as CombatStance] : null;
  return art ? { ...art, level: 1 } : undefined;
}

/**
 * Habilidades que são de UMA pessoa, não de uma Ordem: o que alguém do elenco
 * sabe fazer além do kit (`gifts` em ../party.ts). Vêm do que a história diz
 * de cada um; os números são provisórios como o resto.
 *
 * - `tide_pull` é o repuxo de Varel: adianta a maré e abre a guarda de todo
 *   inimigo de pé. Uma vez por luta, e a magia cobra — Fôlego, e o turno
 *   seguinte dele.
 * - `net_cast` é a rede de coleta de Halmira, aberta em cima de alguém: quem
 *   fica enredado quase não anda.
 * - `crooked_step` é o pé torto de Lish: fora de prumo de propósito, sem
 *   gastar o golpe do turno.
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
  net_cast: {
    id: "gift.net_cast",
    name: "Lançar a Rede",
    flavor: "A rede de coleta aberta no ar, como sobre um cardume. Quem ela pega passa os próximos passos se soltando.",
    cost: "bonus",
    range: 3,
    targets: "enemy",
    attack: { toHit: 2 },
    effects: [{ kind: "status", statusId: "netted", turns: 2 }],
    breath: 1,
    cooldown: 3,
  },
  crooked_step: {
    id: "gift.crooked_step",
    name: "Pé Torto",
    flavor: "A faca na mão errada, o peso no pé errado. Quem aprendeu a acertar gente de prumo não acha onde bater.",
    cost: "bonus",
    range: 0,
    targets: "self",
    effects: [{ kind: "status", statusId: "oblique", turns: 1 }],
    cooldown: 2,
  },
} satisfies Record<string, Ability>;

export type GiftId = keyof typeof GIFTS;

export function isGiftId(id: unknown): id is GiftId {
  return typeof id === "string" && id in GIFTS;
}

/** Uma habilidade do kit de uma Ordem, com o nível em que se aprende. */
export interface KitAbility {
  /** A chave dela no kit: o fim do id (`guardiao.puxao_de_mare`). */
  slug: string;
  level: number;
  ability: Ability;
}

type Fighter = Pick<Character, "characterClass" | "equipment">;

/**
 * O kit inteiro da Ordem de `character`, na ordem em que aparece (as Artes,
 * depois as Técnicas), montado sobre com o que ele bate. Não olha o nível:
 * é o que a ficha usa pra mostrar o que ainda vem.
 */
export function kitOf(character: Fighter): KitAbility[] {
  const { characterClass } = character;
  return Object.entries(KITS[characterClass](armOf(character))).flatMap(([slug, body]) => {
    const art = artOf(characterClass, slug);
    if (!art) return [];
    const ability: Ability = { id: `${characterClass}.${slug}`, name: art.name, flavor: art.flavor, ...body };
    return [{ slug, level: art.level, ability }];
  });
}

/**
 * As habilidades de um combatente: do kit da Ordem dele, as que o nível já
 * deu. Uma criatura (`arts`) sabe só o que nomeia, com os nomes próprios
 * dela por cima (um Lobo-de-Bruma dá um Bote Silencioso, não uma "Lâmina
 * Não-Vista") — o nível não entra.
 */
export function abilitiesFor(character: Fighter & Pick<Character, "level" | "arts">): Ability[] {
  const { arts } = character;
  return kitOf(character).flatMap(({ slug, level, ability }) => {
    if (arts ? arts[slug] === undefined : level > character.level) return [];
    return [{ ...ability, name: arts?.[slug] ?? ability.name }];
  });
}

/** As Técnicas que a Ordem dá exatamente no nível `level`: o que se aprende ao chegar nele. */
export function learnedAt(characterClass: CharacterClass, level: number): Ability[] {
  return kitOf({ characterClass })
    .filter((entry) => entry.level === level && level > 1)
    .map((entry) => entry.ability);
}
