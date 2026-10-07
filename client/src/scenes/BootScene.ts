import * as Phaser from "phaser";
import { SCENES } from "../game/config";
import { preloadSpriteSheets, registerAllSprites } from "../game/sprites";

/** Carrega o que o jogo inteiro usa (as folhas de sprite) e passa a vez pro título. */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload(): void {
    preloadSpriteSheets(this);
  }

  create(): void {
    registerAllSprites(this);
    this.scene.start(SCENES.title);
  }
}
