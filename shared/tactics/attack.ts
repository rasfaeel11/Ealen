import { distance, tileAt, tilesBetween, type Pos } from "./grid";
import { gradeToHit, parries, punishesRepeat, styleMatchup } from "./styles";
import type { Ability, Encounter, Unit } from "./types";
import { defenseBonus, effectiveAttribute, isAlive, primaryAttribute } from "./units";

/**
 * A CHANCE de um golpe (`combate` §5.1 no repositório da história), numa conta
 * só pro motor (que rola o dado), pra IA (que trabalha com a média) e pra
 * interface (que mostra a chance antes do clique).
 *
 * - COBERTURA: o alvo está colado num quadrado de `cover` (pedra, mureta) e
 *   a reta de quem ataca passa por ele. Soma na defesa do alvo. Só existe a
 *   dois quadrados ou mais: de perto não há o que se esconder atrás. E quem
 *   ataca de um chão mais alto mira por cima dela.
 * - FLANCO: golpe corpo a corpo com um aliado de pé do outro lado do alvo
 *   (qualquer um dos três quadrados opostos a quem bate). Número contra número.
 * - ALTURA: quem ataca de um chão mais alto soma no ataque; de um mais
 *   baixo, perde o mesmo tanto.
 * - EXPOSTO: o alvo que acabou de errar (ou de repetir a combinação diante da
 *   Tsvirana, a Rachadura) está aberto: o golpe contra ele sai mais fácil.
 *   A condição Exposto (e Prensado, Caído) entra pela defesa; a Rachadura, aqui.
 * - GRAU: a proficiência na escola soma 1 por grau acima do 2.
 * - CURVA DE PODER (`magia` §7.3): espadachim contra mago, pelo nível do mago
 *   (Verso a Divindade): até o 3, o espadachim leva vantagem; no 4, empata; a
 *   partir do 5, o mago.
 * - DIFERENÇA DE NÍVEL (aura ou mago, 1 a 7): cada nível de diferença pesa, e
 *   de IMPROBABLE_GAP pra cima o de baixo nem tem o improvável.
 * - TIRO (golpe de arma com alcance de 3 ou mais, ver `isShot`): na segunda
 *   metade do alcance perde acerto; com um inimigo colado, também. De um chão
 *   mais alto, alcança um quadrado a mais (ver canTarget em ./targeting.ts).
 *
 * O TRIÂNGULO DAS ESCOLAS não soma nada aqui (`combate` §4): ele sai do jeito
 * de encadear verbos (ver ./styles.ts).
 *
 * AS TRÊS FAIXAS (`combate` §2.1): d20 + bônus contra a defesa. Alcançou a
 * defesa com COST_BAND de folga, sucesso pleno; alcançou sem a folga, sucesso
 * com custo; não alcançou, falha (e quem falhou fica Exposto). O 1 natural
 * falha sempre. O 20 natural é o IMPROVÁVEL (§5.2): pega, dobra, e cobra o
 * custo se a rolagem não chegava ao pleno — menos de quem está IMPROBABLE_GAP
 * níveis abaixo, que no 20 só rola como qualquer outro número.
 *
 * Numa área, a cobertura é medida a partir do ponto de impacto, não de quem
 * a lançou, e não existe flanco.
 */

/** Quanto a cobertura soma na defesa do alvo. */
export const COVER_DEFENSE = 2;
/** Quanto flanquear soma no ataque. */
export const FLANK_TO_HIT = 2;
/** Quanto atacar de cima soma no ataque (e atacar de baixo tira). */
export const HEIGHT_TO_HIT = 2;
/** Quanto o tiro perde na segunda metade do alcance. */
export const LONG_SHOT_TO_HIT = 2;
/** Quanto o tiro perde com um inimigo colado em quem atira. */
export const POINT_BLANK_TO_HIT = 2;
/** Quanto o alvo que repetiu a combinação soma no golpe da Tsvirana (a Rachadura: ele fica Exposto pra ela). */
export const EXPOSED_TO_HIT = 2;
/** Quanto a curva de poder soma pra quem leva vantagem nela (`magia` §7.3). */
export const CURVE_TO_HIT = 2;
/** Quanto cada nível de diferença (aura ou mago) pesa, até LEVEL_GAP_MAX. */
export const LEVEL_TO_HIT = 1;
const LEVEL_GAP_MAX = 3;
/** De quantos níveis abaixo o improvável não entra (`combate` §5.1: de três ou mais, o de baixo não vence). */
export const IMPROBABLE_GAP = 3;
/** A folga sobre a defesa que separa o sucesso pleno do sucesso com custo. */
export const COST_BAND = 3;
/** O alcance a partir do qual um golpe de arma é um tiro. */
const SHOT_RANGE = 3;

/** Um tiro: golpe de arma que vai longe. Magia não é tiro: quem recita não mira, lê. */
export function isShot(ability: Ability): boolean {
  return ability.attack !== undefined && ability.range >= SHOT_RANGE && !ability.mana && ability.radius === undefined;
}

export interface AttackEdge {
  cover: boolean;
  flanked: boolean;
  /** 1 = quem ataca está acima do alvo; -1 = abaixo; 0 = no mesmo nível. */
  height: -1 | 0 | 1;
  /** 1 = o estilo de quem ataca vence o do alvo; -1 = perde pra ele; 0 = neutro. */
  style: -1 | 0 | 1;
  /** O que o grau da escola de quem ataca soma na rolagem. */
  styleToHit: number;
  /** O alvo repetiu a combinação diante da Tsvirana (a Rachadura). */
  exposed: boolean;
  /** O que a curva de poder e a diferença de nível somam (ou tiram). */
  levelToHit: number;
  /** Tiro na segunda metade do alcance. */
  far: boolean;
  /** Tiro com um inimigo colado em quem atira. */
  crowded: boolean;
  /** O alvo apara (ver PARRY_DEFENSE): a lâmina dele está no caminho deste golpe. */
  parry: boolean;
  /** O que tudo isso soma na rolagem de ataque. */
  toHit: number;
  /** O que tudo isso soma na defesa do alvo. */
  defense: number;
}

function hasCover(encounter: Encounter, origin: Pos, target: Pos): boolean {
  if (distance(origin, target) < 2) return false;
  return tilesBetween(encounter.grid, origin, target).some(
    (pos) => distance(pos, target) === 1 && tileAt(encounter.grid, pos)?.cover === true,
  );
}

function isFlanked(encounter: Encounter, actor: Unit, target: Unit): boolean {
  if (distance(actor.pos, target.pos) !== 1) return false;
  const dx = actor.pos.x - target.pos.x;
  const dy = actor.pos.y - target.pos.y;
  return encounter.units.some(
    (ally) =>
      ally !== actor &&
      ally !== target &&
      ally.team === actor.team &&
      isAlive(ally) &&
      distance(ally.pos, target.pos) === 1 &&
      (ally.pos.x - target.pos.x) * dx + (ally.pos.y - target.pos.y) * dy < 0,
  );
}

/** O nível de quem luta, de 1 a 7: a aura de quem é de espada, o nível de mago de quem conjura. Bicho não tem. */
export function tierOf(unit: Pick<Unit, "aura" | "concept" | "manaLimit">): number | undefined {
  if (unit.aura !== undefined) return unit.aura;
  return unit.concept !== undefined ? unit.manaLimit : undefined;
}

function isSword(unit: Unit): boolean {
  return unit.aura !== undefined && unit.concept === undefined;
}

/** A CURVA DE PODER (`magia` §7.3): espadachim contra mago, pelo nível do mago. */
function curveToHit(actor: Unit, target: Unit): number {
  const mage = isSword(actor) && target.concept !== undefined ? target : actor.concept !== undefined && isSword(target) ? actor : undefined;
  const level = mage && tierOf(mage);
  if (level === undefined || level === 4) return 0;
  const swordLeads = level < 4;
  return (swordLeads === (mage === target) ? 1 : -1) * CURVE_TO_HIT;
}

/** A DIFERENÇA DE NÍVEL: positivo, `actor` está acima de `target`. Sem nível dos dois lados, nada. */
export function tierGap(actor: Unit, target: Unit): number {
  const mine = tierOf(actor);
  const theirs = tierOf(target);
  return mine === undefined || theirs === undefined ? 0 : mine - theirs;
}

function gapToHit(actor: Unit, target: Unit): number {
  const gap = tierGap(actor, target);
  return Math.sign(gap) * Math.min(LEVEL_GAP_MAX, Math.abs(gap)) * LEVEL_TO_HIT;
}

/**
 * APARAR (`combate` §3.2: "reação; Exposto, no outro, se ele falhar"): quem é
 * de escola de espada põe a lâmina no caminho do golpe de perto que vem nele,
 * e o golpe precisa de PARRY_DEFENSE a mais pra passar. Custa a reação, sem
 * Fôlego. Se o outro falha, fica Exposto (como toda falha), e na Ipojy o
 * Contragolpe sai na mesma reação. Magia, tiro, área e o verbo trocado da
 * Tsvirana não se aparam; caído, ou perdendo a vez, ninguém apara.
 */
export const PARRY_DEFENSE = 2;

/** `target` apara este golpe de `actor`? (ver PARRY_DEFENSE) */
export function parryReady(actor: Unit, ability: Ability, target: Unit, feint = false): boolean {
  if (feint || actor.team === target.team || ability.mana || ability.radius !== undefined || ability.range > 2 || !ability.attack) return false;
  if (!target.turn.reaction || !parries(target) || !isAlive(target)) return false;
  return !target.statuses.some((status) => status.skipsTurn || status.prone || (status.speed ?? 0) <= -99);
}

/** A vantagem (ou desvantagem) de posição de `actor` usando `ability` em `target`, mirada em `aim`. */
export function attackEdge(
  encounter: Encounter,
  actor: Unit,
  ability: Ability,
  target: Unit,
  aim: Pos = target.pos,
  feint = false,
): AttackEdge {
  const area = ability.radius !== undefined;
  const rise = (tileAt(encounter.grid, actor.pos)?.elevation ?? 0) - (tileAt(encounter.grid, target.pos)?.elevation ?? 0);
  const height = Math.sign(rise) as -1 | 0 | 1;
  const cover = actor !== target && !(height > 0 && !area) && hasCover(encounter, area ? aim : actor.pos, target.pos);
  const flanked = !area && actor.team !== target.team && isFlanked(encounter, actor, target);
  const foes = actor.team !== target.team;
  const style = foes ? styleMatchup(actor.style, target.style) : 0;
  const styleToHit = foes && !area ? gradeToHit(actor) : 0;
  const exposed = foes && !area && punishesRepeat(actor) && target.habit?.repeated === true;
  const levelToHit = foes ? curveToHit(actor, target) + gapToHit(actor, target) : 0;
  const shot = isShot(ability);
  const far = shot && distance(actor.pos, aim) > Math.ceil(ability.range / 2);
  const crowded = shot && encounter.units.some((other) => other.team !== actor.team && isAlive(other) && distance(other.pos, actor.pos) === 1);
  const parry = !area && parryReady(actor, ability, target, feint);

  return {
    cover,
    flanked,
    height,
    style,
    styleToHit,
    exposed,
    levelToHit,
    far,
    crowded,
    parry,
    toHit:
      (flanked ? FLANK_TO_HIT : 0) +
      height * HEIGHT_TO_HIT +
      styleToHit +
      (exposed ? EXPOSED_TO_HIT : 0) +
      levelToHit -
      (far ? LONG_SHOT_TO_HIT : 0) -
      (crowded ? POINT_BLANK_TO_HIT : 0),
    defense: (cover ? COVER_DEFENSE : 0) + (parry ? PARRY_DEFENSE : 0),
  };
}

/** O total que `actor` soma ao d20 e a defesa que ele precisa alcançar em `target`. */
export function attackTotals(actor: Unit, ability: Ability, target: Unit, edge: AttackEdge): { bonus: number; defense: number } {
  // O que as condições de quem ataca somam ou tiram da mão dele (um braço ferido).
  const condition = actor.statuses.reduce((sum, status) => sum + (status.toHit ?? 0), 0);
  return {
    bonus: effectiveAttribute(actor, primaryAttribute(actor)) + (ability.attack?.toHit ?? 0) + edge.toHit + condition,
    // A armadura e a esquiva só dificultam o acerto; quem tira dano do golpe que pega é o Couro.
    defense: 10 + effectiveAttribute(target, "couro") + defenseBonus(target) + edge.defense,
  };
}

export interface AttackOdds {
  /** Chance de pegar SEM ser o improvável: o sucesso pleno e o sucesso com custo juntos. */
  hit: number;
  /** Dessa chance, a parte que é sucesso com custo. */
  cost: number;
  crit: number;
  edge: AttackEdge;
}

/** O 20 natural é o improvável de `actor` contra `target`? Não, de IMPROBABLE_GAP níveis abaixo. */
export function canBeImprobable(actor: Unit, target: Unit): boolean {
  return tierGap(actor, target) > -IMPROBABLE_GAP;
}

/**
 * As chances do ataque, sem rolar nada. Espelha rollAttack em ./engine.ts:
 * dos 20 lados, o 20 é o improvável, o 1 falha sempre, e de 2 a 19 pega quem
 * alcança a defesa — com COST_BAND de folga, pleno; sem, com custo.
 * Habilidade sem rolagem de ataque sempre pega, plena.
 */
export function attackOdds(encounter: Encounter, actor: Unit, ability: Ability, target: Unit, aim?: Pos): AttackOdds {
  const edge = attackEdge(encounter, actor, ability, target, aim);
  if (!ability.attack) return { hit: 1, cost: 0, crit: 0, edge };
  if (actor.statuses.some((status) => status.guaranteedCrit)) return { hit: 0, cost: 0, crit: 1, edge };
  const { bonus, defense } = attackTotals(actor, ability, target, edge);
  const improbable = canBeImprobable(actor, target);
  // Quantos dos números de 2 a 19 (e o 20, quando ele não é o improvável) chegam a `needed`.
  const reaching = (needed: number) => Math.max(0, (improbable ? 19 : 20) - Math.max(2, needed - bonus) + 1);
  const hits = reaching(defense);
  const plain = reaching(defense + COST_BAND);
  return { hit: hits / 20, cost: (hits - plain) / 20, crit: improbable ? 1 / 20 : 0, edge };
}
