import type { Attributes, Character, CombatAction, CombatEvent } from "@ealen/shared";
import { CLASS_INFO } from "@ealen/shared";

function rollD20(): number {
  return 1 + Math.floor(Math.random() * 20);
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
 * IA simples do inimigo: abaixo de 30% de HP, prioriza cura (se a classe
 * tiver "eir" como atributo primário) ou defesa; caso contrário, ataca.
 */
function decideEnemyAction(enemy: Character): CombatAction {
  const hpPercent = enemy.currentHp / enemy.maxHp;
  if (hpPercent < 0.3) {
    return canHeal(enemy) ? "heal" : "defend";
  }
  return "attack";
}

/**
 * Resolve um ataque de `attacker` contra `defender`: rola d20 + atributo
 * primário do atacante vs 10 + Densidade (Or) do defensor. Se acertar,
 * aplica dano baseado no atributo primário do atacante. Muta `defender`
 * (currentHp) e empilha os eventos correspondentes. Retorna true se o
 * defensor morreu.
 */
function resolveAttack(
  attacker: Character,
  defender: Character,
  events: CombatEvent[],
  defendingIds: Set<string>,
): boolean {
  const attackAttr = primaryAttribute(attacker);
  const attackValue = rollD20() + attacker.attributes[attackAttr];
  const defenseTarget = 10 + defender.attributes.or;

  events.push({ type: "roll", actor: attacker.id, value: attackValue, target: defenseTarget });

  const hit = attackValue >= defenseTarget;
  events.push({ type: hit ? "hit" : "miss", actor: attacker.id });
  if (!hit) return false;

  let damage = Math.max(
    1,
    attacker.attributes[attackAttr] + rollDamageDie() - Math.floor(defender.attributes.or / 2),
  );
  if (defendingIds.has(defender.id)) {
    damage = Math.max(1, Math.floor(damage / 2));
  }

  defender.currentHp = Math.max(0, defender.currentHp - damage);
  events.push({ type: "damage", target: defender.id, amount: damage, remainingHp: defender.currentHp });

  return defender.currentHp <= 0;
}

/**
 * Resolve a ação de `unit` contra `opponent`. Muta o estado envolvido e
 * empilha os eventos correspondentes. Retorna true se `opponent` morreu.
 */
function performAction(
  unit: Character,
  opponent: Character,
  action: CombatAction,
  events: CombatEvent[],
  defendingIds: Set<string>,
): boolean {
  if (action === "defend") {
    defendingIds.add(unit.id);
    events.push({ type: "statusApplied", target: unit.id, status: "Defendendo" });
    return false;
  }

  if (action === "heal") {
    if (!canHeal(unit)) {
      // Classe sem afinidade com Eir não tem cura — cai pro ataque padrão.
      return resolveAttack(unit, opponent, events, defendingIds);
    }
    const amount = Math.min(unit.maxHp - unit.currentHp, unit.attributes.eir + rollDamageDie());
    unit.currentHp += amount;
    events.push({ type: "heal", target: unit.id, amount, remainingHp: unit.currentHp });
    return false;
  }

  return resolveAttack(unit, opponent, events, defendingIds);
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
): CombatEvent[] {
  const events: CombatEvent[] = [];
  const defendingIds = new Set<string>();

  // 1. Iniciativa, baseada em Il (Percepção).
  const characterInitiative = rollD20() + character.attributes.il;
  const enemyInitiative = rollD20() + enemy.attributes.il;
  events.push({ type: "roll", actor: character.id, value: characterInitiative, target: enemyInitiative });
  events.push({ type: "roll", actor: enemy.id, value: enemyInitiative, target: characterInitiative });

  const enemyAction = decideEnemyAction(enemy);

  const turnOrder =
    characterInitiative >= enemyInitiative
      ? [
          { unit: character, opponent: enemy, action },
          { unit: enemy, opponent: character, action: enemyAction },
        ]
      : [
          { unit: enemy, opponent: character, action: enemyAction },
          { unit: character, opponent: enemy, action },
        ];

  for (const turn of turnOrder) {
    if (turn.unit.currentHp <= 0) continue; // já morto, não age

    const opponentDied = performAction(turn.unit, turn.opponent, turn.action, events, defendingIds);
    if (opponentDied) {
      events.push({ type: "death", actor: turn.opponent.id });
      events.push({ type: "victory", winner: turn.unit.id });
      break;
    }
  }

  return events;
}
