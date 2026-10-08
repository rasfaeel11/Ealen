import type { Character, GameSave } from "@ealen/shared";
import { writeSlot } from "./save";

/**
 * A partida aberta: o save em memória e o espaço em que ele mora. As cenas
 * mudam `save` à vontade e chamam `commit` nos pontos em que o jogo grava
 * sozinho — o arquivo inteiro vai de uma vez, então nunca fica pela metade.
 */
export class GameSession {
  constructor(
    readonly slot: number,
    readonly save: GameSave,
  ) {}

  get character(): Character {
    return this.save.character;
  }

  /** Grava a partida no espaço dela. False se o dispositivo recusou. */
  commit(): boolean {
    this.save.savedAt = Date.now();
    return writeSlot(this.slot, this.save);
  }
}
