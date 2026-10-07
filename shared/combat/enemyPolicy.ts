import type { Character } from "../types/character";
import type { CombatAction, CombatEvent } from "../types/combatEvent";
import { CLASS_INFO } from "../types/characterClass";
import { hpBand, lookupEnemyPolicy } from "../iaTuning";

/**
 * Decisão do inimigo em combate.
 *
 * Duas camadas, nesta ordem:
 *
 * 1. **Regras autorais** — o que o agente treinado no projeto irmão não pode
 *    saber, porque o simulador dele não tem: cura. Uma criatura que cura e
 *    está quase morta cura, ponto; deixar um agente que nunca viu uma poção
 *    decidir isso seria pior IA, não melhor.
 * 2. **Política treinada** (Q-learning, ver shared/iaTuning.ts) — para o
 *    resto. Ela foi aprendida sobre um estado que este motor observa sem
 *    adaptação: faixa de HP própria, faixa de HP do oponente e quem está de
 *    guarda.
 *
 * Se a política não tiver opinião sobre o estado (nunca visitado no treino,
 * artefato ausente, ou empate entre ações), cai na heurística escrita à mão
 * que existia antes — `heuristicEnemyAction`, preservada integralmente.
 */

/** As três ações que o simulador em Python modela têm este significado aqui. */
const ATTACK_ACTIONS = new Set<CombatAction>(["attack", "quick_attack", "heavy_attack"]);

/** Uma Ordem cura se Eir (Ressonância) é um dos atributos que ela escala. */
export function canHeal(character: Character): boolean {
  return CLASS_INFO[character.characterClass].primaryAttributes.includes("eir");
}

/**
 * A heurística original do motor, agora usada como rede de segurança da
 * política treinada: abaixo de 30% de HP prioriza cura ou defesa; senão
 * reage ao estado do combate — se pressente um golpe pesado vindo, se
 * defende; se o oponente está quase morto, prioriza precisão pra garantir o
 * abate; com folga de HP, arrisca um golpe esmagador.
 */
export function heuristicEnemyAction(
  enemy: Character,
  opponent: Character,
  opponentAction: CombatAction,
): CombatAction {
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

export interface EnemyDecisionContext {
  /** O inimigo entrou neste turno com a guarda do turno anterior ainda de pé (ver enemyGuardSurvives). */
  enemyGuardUp?: boolean;
}

/**
 * Escolhe a ação do inimigo neste turno. `opponentAction` é a ação que o
 * jogador já declarou — o inimigo decide depois, então pode reagir a ela; é
 * também o que preenche "oponente com guarda" no estado da política, já que
 * no motor a postura defensiva vale dentro do próprio turno.
 */
export function decideEnemyAction(
  enemy: Character,
  opponent: Character,
  opponentAction: CombatAction,
  context: EnemyDecisionContext = {},
): CombatAction {
  const hpPercent = enemy.currentHp / enemy.maxHp;

  // Camada 1: cura é decisão do jogo, não do agente — ele nunca viu uma.
  if (hpPercent < 0.3 && canHeal(enemy)) {
    return "heal";
  }

  // Camada 2: a política treinada.
  const learned = lookupEnemyPolicy({
    selfBand: hpBand(enemy.currentHp, enemy.maxHp),
    opponentBand: hpBand(opponent.currentHp, opponent.maxHp),
    selfGuard: context.enemyGuardUp === true,
    opponentGuard: opponentAction === "defend",
  });

  if (!learned) {
    return heuristicEnemyAction(enemy, opponent, opponentAction);
  }

  // "attack" da política é "bater de forma equilibrada". Contra um oponente
  // quase morto o motor tem uma opção melhor pra isso — o ataque rápido, com
  // +3 de acerto — que o simulador nem tem; a intenção aprendida é a mesma,
  // e o abate fica mais confiável.
  if (learned.action === "attack" && opponent.currentHp / opponent.maxHp < 0.25) {
    return "quick_attack";
  }

  return learned.action;
}

/**
 * Diz se a guarda do inimigo sobrevive pro próximo turno, lendo os eventos
 * que o motor acabou de produzir.
 *
 * Mesma regra do simulador (`combate_decisorio.py`): a guarda dura até quem
 * a levantou ser alvo de uma ação ofensiva — acertando ou errando. Aqui isso
 * significa: o inimigo escolheu "defend" neste turno E o jogador não atacou.
 * Se o jogador atacou, a postura já cumpriu o papel dela dentro deste turno
 * (o bloqueio foi resolvido) e não sobra nada pro próximo.
 */
export function enemyGuardSurvives(enemyId: string, opponentId: string, events: CombatEvent[]): boolean {
  let enemyDefended = false;
  let opponentAttacked = false;

  for (const event of events) {
    if (event.type !== "action") continue;
    if (event.actor === enemyId && event.action === "defend") enemyDefended = true;
    if (event.actor === opponentId && ATTACK_ACTIONS.has(event.action)) opponentAttacked = true;
  }

  return enemyDefended && !opponentAttacked;
}
