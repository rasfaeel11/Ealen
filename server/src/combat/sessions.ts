import type { Character } from "@ealen/shared";
import { MOCK_MAP_NODES, findBestiaryEntry } from "@ealen/shared";
import type { ActiveBuff } from "./buffs";

export interface CombatSession {
  enemy: Character;
  /** Id do encontro no bestiário — usado pra resolver o loot na vitória. */
  encounterId: string;
  /** Efeitos ativos de itens (buffs de atributo, crítico garantido...), de ambos os lados da luta. */
  buffs: ActiveBuff[];
}

/**
 * Sessões de combate ativas (chave: characterId + nodeId). Guardado em
 * memória por enquanto — cada uma é mutada diretamente pelo motor de
 * combate a cada ação, e sobrevive só até a luta acabar (ver clearSession).
 */
const activeSessions = new Map<string, CombatSession>();

function sessionKey(characterId: string, nodeId: string): string {
  return `${characterId}:${nodeId}`;
}

/**
 * Retorna a sessão de combate ativa, criando a criatura a partir da ficha
 * do bestiário na primeira ação. Retorna undefined se o nó não existir ou
 * não tiver um encontro de combate.
 */
export function getOrCreateSession(characterId: string, nodeId: string): CombatSession | undefined {
  const key = sessionKey(characterId, nodeId);
  const existing = activeSessions.get(key);
  if (existing) return existing;

  const node = MOCK_MAP_NODES.find((n) => n.id === nodeId);
  if (!node || node.encounterType !== "combat" || !node.encounterId) return undefined;

  const entry = findBestiaryEntry(node.encounterId);
  if (!entry) return undefined;

  const session: CombatSession = {
    enemy: structuredClone(entry.template),
    encounterId: node.encounterId,
    buffs: [],
  };
  activeSessions.set(key, session);
  return session;
}

export function clearSession(characterId: string, nodeId: string): void {
  activeSessions.delete(sessionKey(characterId, nodeId));
}
