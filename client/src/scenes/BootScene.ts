import * as Phaser from "phaser";
import { SCENES } from "../game/config";
import { preloadSpriteSheets, registerAllSprites } from "../game/sprites";
import { preloadWalkSheets, registerWalkSprites } from "../game/walkSprites";
import { preloadWorld, prepareWorldTextures } from "../game/worldAssets";

/** Carrega o que o jogo inteiro usa (folhas de sprite, mapas e tilesets) e passa a vez pro título. */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload(): void {
    preloadSpriteSheets(this);
    preloadWalkSheets(this);
    preloadWorld(this);
  }

  create(): void {
    registerAllSprites(this);
    registerWalkSprites(this);
    prepareWorldTextures(this);
    this.scene.start(SCENES.title);
  }
}
