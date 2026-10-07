/** Resolução interna do jogo. O Phaser escala isso pra caber na janela (Scale.FIT). */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Paleta do códice: fundo escuro, dourado como destaque. */
export const COLORS = {
  bg: 0x141110,
  panel: 0x1c1815,
  border: 0x3a2f22,
  gold: 0xc9a15a,
  goldBright: 0xe8c47a,
  ink: 0xcfc6b8,
  inkDim: 0x8c8375,
  hp: 0x7fb069,
  hpLow: 0xc0455a,
  guard: 0x6fa8dc,
  item: 0x9b7fd1,
} as const;

/** As mesmas cores, no formato que os estilos de texto do Phaser esperam. */
export const TEXT_COLORS = {
  gold: "#c9a15a",
  goldBright: "#e8c47a",
  ink: "#cfc6b8",
  inkDim: "#8c8375",
  hp: "#7fb069",
  danger: "#e0566c",
  guard: "#6fa8dc",
  item: "#b79cf0",
  white: "#ffffff",
} as const;

export const FONT_TITLE = '"Cinzel", serif';
export const FONT_BODY = '"Spectral", Georgia, serif';

/** Chaves das cenas, pra ninguém errar a string num scene.start(). */
export const SCENES = {
  boot: "Boot",
  title: "Title",
  prologue: "Prologue",
  classSelect: "ClassSelect",
  world: "World",
} as const;

/** Chave do registry do Phaser onde vive o personagem da sessão atual. */
export const REGISTRY_CHARACTER = "character";
