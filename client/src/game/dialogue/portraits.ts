import * as Phaser from "phaser";

/**
 * Retratos de quem fala na caixa de diálogo: um busto grande, no canto de
 * baixo, passando da borda de cima da caixa. A chave é o nome exatamente como
 * aparece no Ink (`Xanduí: ...`, `Guarda do pedágio: ...`); quem não tem
 * retrato fala sem busto, como a narração.
 *
 * Enquanto não há arte, o jogo desenha um provisório: um busto liso na cor de
 * quem fala, sem traço nenhum de rosto (o que a tela mostra vira cânone, §1).
 *
 * Pra trocar pela arte final: salve o PNG em client/public/sprites/portraits/
 * e registre em PORTRAITS, com o nome de quem fala. O quadro tem a proporção
 * de PORTRAIT_WIDTH x PORTRAIT_HEIGHT (pixel art em escala inteira disso fica
 * nítida); a base do busto encosta na borda de baixo da tela.
 */

/** Tamanho do busto na tela, na resolução interna do jogo. */
export const PORTRAIT_WIDTH = 320;
export const PORTRAIT_HEIGHT = 400;

export interface PortraitDef {
  /** Caminho relativo a client/public (ex: "sprites/portraits/xandui.png"). */
  url: string;
  /**
   * Os outros rostos, pelo nome que a fala pede no Ink (`# rosto: riso`).
   * Rosto pedido sem arte aqui mostra o retrato de sempre.
   */
  faces?: Record<string, string>;
}

/**
 * Retratos de arte final, pelo nome de quem fala. Vazio = todo mundo usa o
 * provisório (que não tem rosto, então não tem expressão). Exemplo:
 *
 *   Xanduí: { url: "sprites/portraits/xandui.png", faces: { riso: "sprites/portraits/xandui-riso.png" } },
 */
export const PORTRAITS: Record<string, PortraitDef> = {};

/** Quem ganha busto provisório, e em que cor. Quem não está aqui não tem retrato. */
const PLACEHOLDER_COLOR: Record<string, string> = {
  Endyru: "#5f86c8",
  Jarupã: "#b08a4a",
  Xanduí: "#8f6b3c",
  Oryndu: "#5a7a5e",
  Conselheira: "#7a6a8a",
  Castelão: "#6a6f78",
  Ferreiro: "#7a4a3a",
  "Mestre da guilda": "#4f6a6a",
  Mercador: "#8a7a4a",
  "Escrivão da Mesa": "#6a5f50",
  "Guarda do pedágio": "#5f5a52",
  "Guarda do portão": "#5f5a52",
  "Mulher da família": "#7a6050",
  Contratada: "#6a5040",
};

/** A textura do retrato de `speaker`; com `face`, a daquele rosto. */
export function portraitKey(speaker: string, face?: string): string {
  return face === undefined ? `portrait:${speaker}` : `portrait:${speaker}:${face}`;
}

/** A textura que mostra `speaker` com `face`: a do rosto, se tem arte; senão a de sempre. */
export function portraitFor(scene: Phaser.Scene, speaker: string, face?: string): string {
  const key = portraitKey(speaker, face);
  return face !== undefined && scene.textures.exists(key) ? key : portraitKey(speaker);
}

/** Busto provisório em pixels grandes: 64x80, ampliado 5x sem suavização. */
const PIXEL = 5;
const PLACEHOLDER_W = PORTRAIT_WIDTH / PIXEL;
const PLACEHOLDER_H = PORTRAIT_HEIGHT / PIXEL;
const SKIN = "#cfc6b8";
const HAIR = "#5a4a3a";
const SHADOW = "rgba(0, 0, 0, 0.25)";

function drawPlaceholderBust(ctx: CanvasRenderingContext2D, color: string): void {
  // Ombros: um trapézio até a base do quadro.
  ctx.fillStyle = color;
  for (let y = 52; y < PLACEHOLDER_H; y++) {
    const half = Math.min(30, 14 + (y - 52));
    ctx.fillRect(PLACEHOLDER_W / 2 - half, y, half * 2, 1);
  }
  ctx.fillStyle = SHADOW;
  ctx.fillRect(PLACEHOLDER_W / 2 + 4, 56, 26, PLACEHOLDER_H - 56);

  // Pescoço e cabeça.
  ctx.fillStyle = SKIN;
  ctx.fillRect(27, 44, 10, 10);
  ctx.fillRect(20, 14, 24, 32);
  ctx.fillRect(22, 46, 20, 2);
  ctx.fillStyle = SHADOW;
  ctx.fillRect(36, 14, 8, 32);

  // Cabelo: só o topo, sem desenho de rosto.
  ctx.fillStyle = HAIR;
  ctx.fillRect(18, 10, 28, 8);
  ctx.fillRect(18, 18, 4, 10);
}

/** Enfileira no loader os retratos de arte final. Chamado no preload da cena de boot. */
export function preloadPortraits(scene: Phaser.Scene): void {
  for (const [speaker, def] of Object.entries(PORTRAITS)) {
    scene.load.image(portraitKey(speaker), def.url);
    for (const [face, url] of Object.entries(def.faces ?? {})) scene.load.image(portraitKey(speaker, face), url);
  }
}

/** Gera o provisório de quem ainda não tem arte. Chamado uma vez, no create da cena de boot. */
export function registerPortraits(scene: Phaser.Scene): void {
  for (const [speaker, color] of Object.entries(PLACEHOLDER_COLOR)) {
    const key = portraitKey(speaker);
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.createCanvas(key, PLACEHOLDER_W, PLACEHOLDER_H);
    if (!texture) continue;
    drawPlaceholderBust(texture.getContext(), color);
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  for (const [speaker, def] of Object.entries(PORTRAITS)) {
    for (const face of [undefined, ...Object.keys(def.faces ?? {})]) {
      scene.textures.get(portraitKey(speaker, face)).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }
}
