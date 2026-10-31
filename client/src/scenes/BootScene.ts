import * as Phaser from "phaser";
import { SCENES } from "../game/config";
import { preloadPortraits, registerPortraits } from "../game/dialogue/portraits";
import { registerIcons } from "../game/icons";
import { preloadMapSheets, registerMapSprites } from "../game/mapSprites";
import { preloadSplashes } from "../game/splashes";
import { AREAS } from "@jogo/shared";
import { preloadScenery, prepareScenery } from "../game/Scenery";
import { preloadWorld } from "../game/worldAssets";

/** Carrega o que o jogo inteiro usa (folhas de sprite, retratos, ilustrações, mapas e cenário) e passa a vez pro título. */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload(): void {
    preloadMapSheets(this);
    preloadPortraits(this);
    preloadSplashes(this);
    preloadWorld(this);
    preloadScenery(this, Object.keys(AREAS));
  }

  create(): void {
    registerMapSprites(this);
    registerPortraits(this);
    registerIcons(this);
    prepareScenery(this, Object.keys(AREAS));
    this.scene.start(SCENES.title);
  }
}
