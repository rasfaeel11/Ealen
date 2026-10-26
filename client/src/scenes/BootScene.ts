import * as Phaser from "phaser";
import { SCENES } from "../game/config";
import { preloadPortraits, registerPortraits } from "../game/dialogue/portraits";
import { preloadMapSheets, registerMapSprites } from "../game/mapSprites";
import { preloadWorld, prepareWorldTextures } from "../game/worldAssets";

/** Carrega o que o jogo inteiro usa (folhas de sprite, retratos, mapas e tilesets) e passa a vez pro título. */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload(): void {
    preloadMapSheets(this);
    preloadPortraits(this);
    preloadWorld(this);
  }

  create(): void {
    registerMapSprites(this);
    registerPortraits(this);
    prepareWorldTextures(this);
    this.scene.start(SCENES.title);
  }
}
