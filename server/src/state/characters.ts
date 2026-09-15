import type { Character } from "@ealen/shared";
import { MOCK_CHARACTERS } from "@ealen/shared";

/**
 * Estado em memória dos personagens, semeado a partir dos mocks de /shared.
 * Será substituído pelo Supabase no próximo passo — por enquanto é só um
 * Map mutável pra permitir que o combate persista HP entre requisições.
 */
const characters = new Map<string, Character>(
  MOCK_CHARACTERS.map((character) => [character.id, structuredClone(character)]),
);

export function getCharacter(id: string): Character | undefined {
  return characters.get(id);
}
