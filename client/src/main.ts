import * as Phaser from "phaser";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "./game/config";
import BootScene from "./scenes/BootScene";
import TitleScene from "./scenes/TitleScene";
import PrologueScene from "./scenes/PrologueScene";
import ClassSelectScene from "./scenes/ClassSelectScene";
import SaveSlotsScene from "./scenes/SaveSlotsScene";
import WorldScene from "./scenes/WorldScene";

const FONT_LOAD_TIMEOUT_MS = 3000;

/**
 * O Phaser desenha texto num canvas, e um canvas não redesenha sozinho
 * quando a webfont chega: se o jogo subir antes, o primeiro texto sai na
 * fonte de fallback e fica assim. Por isso espera as fontes (com teto de
 * tempo — sem rede o jogo sobe do mesmo jeito, só que em Georgia).
 */
async function waitForFonts(): Promise<void> {
  const faces = ['bold 16px "Cinzel"', '16px "Spectral"', 'italic 16px "Spectral"'];
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, FONT_LOAD_TIMEOUT_MS));
  const loaded = Promise.all(faces.map((face) => document.fonts.load(face))).then(
    () => undefined,
    () => undefined,
  );
  await Promise.race([loaded, timeout]);
}

void waitForFonts().then(() => {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: COLORS.bg,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, TitleScene, SaveSlotsScene, PrologueScene, ClassSelectScene, WorldScene],
  });
});
