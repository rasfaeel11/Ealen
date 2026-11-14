/** Resolução interna do jogo. O Phaser escala isso pra caber na janela (Scale.FIT). */
export const GAME_HEIGHT = 720;
/** A tela mais estreita pra que a interface foi feita (16:9) e a mais larga que ainda faz sentido (21:9, com folga). */
const MIN_WIDTH = 1280;
const MAX_WIDTH = 1728;

/** A largura interna que enche uma janela deste formato, sem barra preta dos lados. A altura é sempre a mesma. */
export function widthForWindow(width: number, height: number): number {
  return Math.round(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, (GAME_HEIGHT * width) / Math.max(1, height))));
}

export const GAME_WIDTH = typeof window === "undefined" ? MIN_WIDTH : widthForWindow(window.innerWidth, window.innerHeight);

/** Paleta do códice: fundo escuro, dourado como destaque. */
export const COLORS = {
  bg: 0x141110,
  panel: 0x1c1815,
  /** O fundo dos painéis: embaixo o mais fundo, em cima a luz que cai. */
  panelDeep: 0x120e0c,
  panelTop: 0x2a221b,
  border: 0x3a2f22,
  bronze: 0x7d6239,
  gold: 0xc9a15a,
  goldBright: 0xe8c47a,
  ink: 0xcfc6b8,
  inkDim: 0x8c8375,
  hp: 0x7fb069,
  hpMid: 0xc9a13f,
  hpLow: 0xc0455a,
  guard: 0x6fa8dc,
  item: 0x9b7fd1,
  /** Os recursos do turno: a ação, o bônus, o passo, o Fôlego e a mana. */
  action: 0x6fbf5a,
  bonus: 0xe0913a,
  movement: 0xd9b44a,
  breath: 0x5fb3a4,
  mana: 0x5f8fd6,
  /** Quem é de que lado, na ordem dos turnos. */
  ally: 0xc9a15a,
  enemy: 0xb0413f,
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
  saves: "Saves",
  world: "World",
  intro: "Intro",
} as const;

/** Chave do registry do Phaser onde vive a partida aberta (uma GameSession). */
export const REGISTRY_SESSION = "session";
/** Chave do registry com o espaço de save que o jogo novo em criação vai ocupar. */
export const REGISTRY_NEW_GAME_SLOT = "newGameSlot";
