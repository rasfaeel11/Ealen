export type EncounterType = "combat" | "dialogue" | "lore" | "none";

export interface MapNode {
  id: string;
  name: string;
  description: string;
  /** Ids de outros MapNodes acessíveis a partir deste. */
  connections: string[];
  encounterType: EncounterType;
  /** Id do encontro/inimigo/diálogo associado, quando encounterType !== "none". */
  encounterId?: string;
}
