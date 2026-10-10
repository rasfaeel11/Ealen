/** Uma Técnica aprendida ao subir de nível: o nome e o que ela é, pra quem anuncia. */
export interface LearnedAbility {
  id: string;
  name: string;
  flavor: string;
}

/** Resultado da progressão de nível aplicada ao final de um combate vitorioso. */
export interface LevelUpResult {
  leveledUp: boolean;
  newLevel?: number;
  /** As Técnicas da Ordem que os níveis ganhos deram, na ordem em que vieram (ver KITS em ../tactics/abilities.ts). */
  learned?: LearnedAbility[];
}
