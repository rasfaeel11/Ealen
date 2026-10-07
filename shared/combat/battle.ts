import type { Character } from "../types/character";
import type { CombatAction, CombatEvent } from "../types/combatEvent";
import { findBestiaryEntry } from "../mock/bestiary";
import { tickBuffs, type ActiveBuff } from "./buffs";
import { enemyGuardSurvives } from "./enemyPolicy";
import { resolveCombatTurn } from "./engine";
import { settleCombat, type SettleResult } from "./settle";

/**
 * Estado de uma luta em andamento: tudo que precisa sobreviver de um turno
 * pro outro além da ficha do próprio jogador. Vive na memória da cena de
 * combate — o motor roda inteiro no navegador, sem servidor no meio.
 */
export interface BattleState {
  enemy: Character;
  /** Id do encontro no bestiário — usado pra resolver o loot na vitória. */
  encounterId: string;
  /** Efeitos ativos de itens (buffs de atributo, crítico garantido...), de ambos os lados da luta. */
  buffs: ActiveBuff[];
  /**
   * A criatura terminou o turno anterior com a guarda ainda de pé (defendeu
   * e não foi atacada). É parte do estado que a IA treinada observa — ver
   * enemyGuardSurvives em ./enemyPolicy.
   */
  enemyGuardUp: boolean;
}

/** Começa uma luta contra a criatura do bestiário. Retorna undefined se o encontro não existir. */
export function startBattle(encounterId: string): BattleState | undefined {
  const entry = findBestiaryEntry(encounterId);
  if (!entry) return undefined;

  return {
    enemy: structuredClone(entry.template),
    encounterId,
    buffs: [],
    enemyGuardUp: false,
  };
}

export interface BattleTurnResult extends SettleResult {
  events: CombatEvent[];
}

/**
 * Joga um turno completo: resolve as duas ações, atualiza o que a luta
 * carrega entre turnos (guarda do inimigo, duração dos buffs) e, se o
 * combate acabou, já aplica XP/level up/loot em `character`. Muta
 * `character` e `battle`; quem chama anima `events` e decide quando salvar.
 */
export function playBattleTurn(
  character: Character,
  battle: BattleState,
  action: CombatAction,
  itemId?: string,
): BattleTurnResult {
  const events = resolveCombatTurn(character, battle.enemy, action, {
    itemId,
    activeBuffs: battle.buffs,
    enemyGuardUp: battle.enemyGuardUp,
  });
  battle.enemyGuardUp = enemyGuardSurvives(battle.enemy.id, character.id, events);
  tickBuffs(battle.buffs);

  return { events, ...settleCombat(character, battle.enemy, events, battle.encounterId) };
}
