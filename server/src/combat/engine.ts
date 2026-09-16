import type { Attributes, Character, CombatAction, CombatEvent } from "@ealen/shared";
import { CLASS_INFO, applyImmediateHeal, consumeInventoryCharge, findInventorySlot } from "@ealen/shared";
import { buffBonus, consumeGuaranteedCrit, hasGuaranteedCrit, type ActiveBuff } from "./buffs";

type AttackAction = "attack" | "quick_attack" | "heavy_attack";

/** Modificador de acerto (somado ao d20) por tipo de ataque. */
const TO_HIT_MODIFIER: Record<AttackAction, number> = {
  attack: 0,
  quick_attack: 3,
  heavy_attack: -4,
};

function rollD20(): number {
  return 1 + Math.floor(Math.random() * 20);
}

function rollD6(): number {
  return 1 + Math.floor(Math.random() * 6);
}

function rollDamageDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

function primaryAttribute(character: Character): keyof Attributes {
  return CLASS_INFO[character.characterClass].primaryAttributes[0];
}

function canHeal(character: Character): boolean {
  return CLASS_INFO[character.characterClass].primaryAttributes.includes("eir");
}

/**
 * Penalidades temporárias de Or (Densidade) sofridas nesta chamada de
 * resolveCombatTurn — ex: "Desequilibrado" após uma Falha Crítica. Como
 * cada chamada já resolve o turno inteiro (ação do jogador + ação do
 * inimigo), a penalidade "até o próximo turno" nunca precisa sobreviver
 * além do escopo desta função: se a unidade ainda vai agir de novo nesta
 * mesma chamada, a penalidade já caiu; se não vai, a próxima chamada já é
 * o "próximo turno" dela, quando a penalidade deveria ter expirado mesmo.
 */
type OrPenalty = Record<string, number>;

/** Valor efetivo de um atributo: base + buffs ativos (multi-turno) - penalidade de Or do turno atual. */
function effectiveAttr(unit: Character, stat: keyof Attributes, activeBuffs: ActiveBuff[], orPenalty: OrPenalty): number {
  const penalty = stat === "or" ? (orPenalty[unit.id] ?? 0) : 0;
  return Math.max(0, unit.attributes[stat] + buffBonus(unit, stat, activeBuffs) - penalty);
}

/**
 * Dano bruto de um ataque, antes da mitigação pela defesa do alvo: atributo
 * primário do atacante (+ buffs ativos) + 1d6, escalado pelo tipo de
 * ataque. Ataques pesados somam um bônus fixo de Dain (o golpe puxa força
 * bruta, não só técnica).
 */
function rawAttackDamage(attacker: Character, action: AttackAction, activeBuffs: ActiveBuff[]): number {
  const attackAttr = primaryAttribute(attacker);
  const attrValue = attacker.attributes[attackAttr] + buffBonus(attacker, attackAttr, activeBuffs);
  const base = attrValue + rollDamageDie();

  if (action === "quick_attack") return Math.round(base * 0.6);
  if (action === "heavy_attack") return Math.round(base * 1.8) + Math.floor(attacker.attributes.dain / 2);
  return base;
}

/**
 * IA simples do inimigo: abaixo de 30% de HP, prioriza cura (se a classe
 * tiver "eir" como atributo primário) ou defesa. Acima disso, reage ao
 * estado do combate: se pressente um golpe pesado vindo, se defende; se o
 * oponente está quase morto, prioriza precisão pra garantir o abate; com
 * folga de HP, arrisca um golpe esmagador; caso contrário, ataque padrão.
 */
function decideEnemyAction(enemy: Character, opponent: Character, opponentAction: CombatAction): CombatAction {
  const hpPercent = enemy.currentHp / enemy.maxHp;
  if (hpPercent < 0.3) {
    return canHeal(enemy) ? "heal" : "defend";
  }
  if (opponentAction === "heavy_attack") {
    return "defend";
  }
  const opponentHpPercent = opponent.currentHp / opponent.maxHp;
  if (opponentHpPercent < 0.25) {
    return "quick_attack";
  }
  if (hpPercent > 0.7) {
    return "heavy_attack";
  }
  return "attack";
}

/**
 * Resolve um ataque de `attacker` contra `defender`, considerando o tipo de
 * ataque (attack/quick_attack/heavy_attack), crítico/falha críticos no d20
 * puro (ou um crítico garantido por item), e o bloqueio dinâmico caso o
 * defensor esteja em postura defensiva. Muta `defender` (currentHp) e
 * `orPenalty` (debuff de Desequilibrado ao tirar 1 natural), empilhando os
 * eventos correspondentes. Retorna true se o defensor morreu.
 */
function resolveAttack(
  attacker: Character,
  defender: Character,
  action: AttackAction,
  events: CombatEvent[],
  defendingIds: Set<string>,
  orPenalty: OrPenalty,
  activeBuffs: ActiveBuff[],
): boolean {
  const attackAttr = primaryAttribute(attacker);
  const naturalRoll = rollD20();
  const guaranteedCrit = hasGuaranteedCrit(attacker, activeBuffs);
  const attrValue = effectiveAttr(attacker, attackAttr, activeBuffs, orPenalty);
  const attackValue = naturalRoll + attrValue + TO_HIT_MODIFIER[action];
  const defenderOr = effectiveAttr(defender, "or", activeBuffs, orPenalty);
  const defenseTarget = 10 + defenderOr;

  events.push({ type: "roll", actor: attacker.id, value: attackValue, target: defenseTarget });

  if (naturalRoll === 1 && !guaranteedCrit) {
    orPenalty[attacker.id] = (orPenalty[attacker.id] ?? 0) + 3;
    events.push({
      type: "fumble",
      actor: attacker.id,
      naturalRoll: 1,
      penaltyDescription: "Desequilibrado (-3 Or até o próximo turno)",
    });
    events.push({ type: "miss", actor: attacker.id });
    return false;
  }

  const isCritical = naturalRoll === 20 || guaranteedCrit;
  if (guaranteedCrit) consumeGuaranteedCrit(attacker, activeBuffs);

  const hit = isCritical || attackValue >= defenseTarget;

  if (isCritical) {
    events.push({ type: "criticalHit", actor: attacker.id, naturalRoll: 20, multiplier: 2 });
  }
  events.push({ type: hit ? "hit" : "miss", actor: attacker.id });
  if (!hit) return false;

  let damage = rawAttackDamage(attacker, action, activeBuffs);
  if (isCritical) damage *= 2;
  damage = Math.max(1, damage - Math.floor(defenderOr / 2));

  if (defendingIds.has(defender.id)) {
    const blockPower = defenderOr + rollD6();
    if (blockPower >= damage) {
      events.push({ type: "block", defender: defender.id, blockedAmount: damage, remainingDamage: 0 });
      return false;
    }
    events.push({ type: "block", defender: defender.id, blockedAmount: blockPower, remainingDamage: damage - blockPower });
    damage -= blockPower;
  }

  defender.currentHp = Math.max(0, defender.currentHp - damage);
  events.push({ type: "damage", target: defender.id, amount: damage, remainingHp: defender.currentHp });

  return defender.currentHp <= 0;
}

/**
 * Usa um consumível da mochila de `unit`: valida posse, aplica o efeito
 * (cura imediata, buff de atributo, crítico garantido no próximo golpe ou
 * purificação) e consome uma carga do item. Não causa dano nem morte —
 * ocupa a ação do turno como qualquer outra escolha.
 */
function useItem(unit: Character, itemId: string | undefined, events: CombatEvent[], activeBuffs: ActiveBuff[]): void {
  const slot = itemId ? findInventorySlot(unit, itemId) : undefined;

  if (!slot || slot.quantity <= 0) {
    events.push({
      type: "itemUsed",
      actor: unit.id,
      itemId: itemId ?? "desconhecido",
      itemName: "Item indisponível",
      effectDescription: "O item não foi encontrado na mochila.",
    });
    return;
  }

  // Anuncia o uso do item ANTES de eventuais eventos derivados (heal),
  // pra narração ler "X usa Y: <efeito>" seguido do resultado mecânico.
  function finish(effectDescription: string, derivedEvents: CombatEvent[] = []): void {
    consumeInventoryCharge(unit, slot!);
    events.push({ type: "itemUsed", actor: unit.id, itemId: slot!.item.id, itemName: slot!.item.name, effectDescription });
    events.push(...derivedEvents);
  }

  const { effect } = slot.item.data;

  switch (effect.kind) {
    case "heal_hp":
    case "cure_status": {
      const { healed, description } = applyImmediateHeal(unit, effect);
      const derived: CombatEvent[] =
        healed > 0 ? [{ type: "heal", target: unit.id, amount: healed, remainingHp: unit.currentHp }] : [];
      finish(description, derived);
      return;
    }
    case "buff_stat": {
      activeBuffs.push({
        kind: "stat",
        targetId: unit.id,
        stat: effect.stat,
        bonus: effect.bonus,
        turnsRemaining: effect.durationTurns,
      });
      finish(`+${effect.bonus} de ${effect.stat.toUpperCase()} por ${effect.durationTurns} turnos.`);
      return;
    }
    case "focus_charge": {
      // turnsRemaining começa em 2, não 1: o tick de fim-de-rodada já roda
      // na mesma chamada em que o item foi usado (ver settle/tickBuffs no
      // caller), então precisa sobreviver a esse primeiro tick pra ainda
      // valer no próximo golpe do personagem.
      activeBuffs.push({ kind: "guaranteed_crit", targetId: unit.id, turnsRemaining: 2 });
      finish("Garante um acerto crítico no próximo golpe.");
      return;
    }
  }
}

/**
 * Resolve a ação de `unit` contra `opponent`. Muta o estado envolvido e
 * empilha os eventos correspondentes. Retorna true se `opponent` morreu.
 */
function performAction(
  unit: Character,
  opponent: Character,
  action: CombatAction,
  itemId: string | undefined,
  events: CombatEvent[],
  defendingIds: Set<string>,
  orPenalty: OrPenalty,
  activeBuffs: ActiveBuff[],
): boolean {
  if (action === "defend") {
    defendingIds.add(unit.id);
    events.push({ type: "statusApplied", target: unit.id, status: "Defendendo" });
    return false;
  }

  if (action === "use_item") {
    useItem(unit, itemId, events, activeBuffs);
    return false;
  }

  if (action === "heal") {
    if (!canHeal(unit)) {
      // Classe sem afinidade com Eir não tem cura — cai pro ataque padrão.
      return resolveAttack(unit, opponent, "attack", events, defendingIds, orPenalty, activeBuffs);
    }
    const eirValue = effectiveAttr(unit, "eir", activeBuffs, orPenalty);
    const amount = Math.min(unit.maxHp - unit.currentHp, eirValue + rollDamageDie());
    unit.currentHp += amount;
    events.push({ type: "heal", target: unit.id, amount, remainingHp: unit.currentHp });
    return false;
  }

  return resolveAttack(unit, opponent, action, events, defendingIds, orPenalty, activeBuffs);
}

export interface ResolveCombatTurnOptions {
  /** Necessário quando `action` (do personagem) é "use_item". */
  itemId?: string;
  /**
   * Buffs ativos da sessão de combate (ver server/src/combat/sessions.ts),
   * passada por referência: este turno pode empurrar novos buffs nela
   * (item usado) — quem chama é responsável por, depois, chamar tickBuffs.
   */
  activeBuffs?: ActiveBuff[];
}

/**
 * Resolve um turno completo de combate entre `character` e `enemy`.
 * O servidor nunca anima nada aqui — só calcula e retorna a lista
 * ORDENADA de eventos que aconteceram, pro frontend animar depois.
 *
 * Muta `character` e `enemy` diretamente (HP atual etc.) para que o
 * chamador possa ler o estado pós-turno nos mesmos objetos.
 */
export function resolveCombatTurn(
  character: Character,
  enemy: Character,
  action: CombatAction,
  options: ResolveCombatTurnOptions = {},
): CombatEvent[] {
  const { itemId, activeBuffs = [] } = options;
  const events: CombatEvent[] = [];
  const defendingIds = new Set<string>();
  const orPenalty: OrPenalty = {};

  // 1. Iniciativa, baseada em Il (Percepção).
  const characterInitiative = rollD20() + character.attributes.il;
  const enemyInitiative = rollD20() + enemy.attributes.il;
  events.push({ type: "roll", actor: character.id, value: characterInitiative, target: enemyInitiative });
  events.push({ type: "roll", actor: enemy.id, value: enemyInitiative, target: characterInitiative });

  const enemyAction = decideEnemyAction(enemy, character, action);

  const turnOrder =
    characterInitiative >= enemyInitiative
      ? [
          { unit: character, opponent: enemy, action, itemId },
          { unit: enemy, opponent: character, action: enemyAction, itemId: undefined },
        ]
      : [
          { unit: enemy, opponent: character, action: enemyAction, itemId: undefined },
          { unit: character, opponent: enemy, action, itemId },
        ];

  for (const turn of turnOrder) {
    if (turn.unit.currentHp <= 0) continue; // já morto, não age

    const opponentDied = performAction(
      turn.unit,
      turn.opponent,
      turn.action,
      turn.itemId,
      events,
      defendingIds,
      orPenalty,
      activeBuffs,
    );
    if (opponentDied) {
      events.push({ type: "death", actor: turn.opponent.id });
      events.push({ type: "victory", winner: turn.unit.id });
      break;
    }
  }

  return events;
}
