import type { Attributes, Character, CharacterClass, Race } from "@ealen/shared";

/** Formato de uma linha da tabela `characters` no Supabase (snake_case). */
export interface CharacterRow {
  id: string;
  user_id: string;
  name: string;
  race: string;
  character_class: string;
  level: number;
  xp: number;
  attributes: Attributes;
  current_hp: number;
  max_hp: number;
  current_node_id: string;
  created_at: string;
}

export function rowToCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    name: row.name,
    race: row.race as Race,
    characterClass: row.character_class as CharacterClass,
    level: row.level,
    xp: row.xp,
    attributes: row.attributes,
    currentHp: row.current_hp,
    maxHp: row.max_hp,
    currentNodeId: row.current_node_id,
  };
}
