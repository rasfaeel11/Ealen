/// <reference types="vite/client" />
import * as Phaser from "phaser";
// As fontes vão dentro do jogo, não da rede: o jogo empacotado (Electron, Steam) abre sem internet.
import "@fontsource/cinzel/latin-700.css";
import "@fontsource/spectral/latin-400.css";
import "@fontsource/spectral/latin-400-italic.css";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "./game/config";
import BootScene from "./scenes/BootScene";
import TitleScene from "./scenes/TitleScene";
import SaveSlotsScene from "./scenes/SaveSlotsScene";
import WorldScene from "./scenes/WorldScene";
import IntroScene from "./scenes/IntroScene";
import { watchGamepad } from "./game/gamepad";
import { watchWindowShape } from "./game/viewport";

const FONT_LOAD_TIMEOUT_MS = 3000;

/**
 * O Phaser desenha texto num canvas, e um canvas não redesenha sozinho
 * quando a webfont chega: se o jogo subir antes, o primeiro texto sai na
 * fonte de fallback e fica assim. Por isso espera as fontes (com teto de
 * tempo — se a fonte não carregar, o jogo sobe do mesmo jeito, só que em Georgia).
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
  watchWindowShape();
  watchGamepad();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: COLORS.bg,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // O som do jogo é sintetizado em `game/audio.ts`, com o contexto de áudio dele: o do Phaser não é usado.
    audio: { noAudio: true },
    scene: [BootScene, TitleScene, SaveSlotsScene, IntroScene, WorldScene],
  });
  // Só no servidor de desenvolvimento: deixa um teste no navegador chegar à cena e mexer nela. O build não leva.
  if (import.meta.env.DEV) (window as unknown as { __jogo?: Phaser.Game }).__jogo = game;
});
