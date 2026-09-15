import type { Character } from "@ealen/shared";
import { MOCK_MAP_NODES } from "@ealen/shared";
import { ENEMY_TEMPLATES } from "./enemyTemplates";

/**
 * Instâncias de inimigos ativas por combate (chave: characterId + nodeId).
 * Guardado em memória por enquanto — cada instância é mutada diretamente
 * pelo motor de combate a cada ação.
 */
const activeEnemies = new Map<string, Character>();

function sessionKey(characterId: string, nodeId: string): string {
  return `${characterId}:${nodeId}`;
}

/**
 * Retorna o inimigo ativo do combate, criando a instância a partir do
 * template do encontro do nó na primeira ação. Retorna undefined se o nó
 * não existir ou não tiver um encontro de combate.
 */
export function getOrCreateEnemy(characterId: string, nodeId: string): Character | undefined {
  const key = sessionKey(characterId, nodeId);
  const existing = activeEnemies.get(key);
  if (existing) return existing;

  const node = MOCK_MAP_NODES.find((n) => n.id === nodeId);
  if (!node || node.encounterType !== "combat" || !node.encounterId) return undefined;

  const template = ENEMY_TEMPLATES[node.encounterId];
  if (!template) return undefined;

  const instance = structuredClone(template);
  activeEnemies.set(key, instance);
  return instance;
}

export function clearEnemy(characterId: string, nodeId: string): void {
  activeEnemies.delete(sessionKey(characterId, nodeId));
}
