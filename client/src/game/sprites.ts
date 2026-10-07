import * as Phaser from "phaser";
import { BESTIARY, CLASS_INFO, type CharacterClass, type Principle } from "@ealen/shared";

/**
 * Sprites dos combatentes.
 *
 * Cada combatente é uma spritesheet com quatro animações: idle, attack, hurt
 * e die. Enquanto a arte de verdade não existe, o jogo desenha uma folha
 * provisória em tempo de execução (um boneco por Ordem, um vulto por
 * criatura) — com o mesmo layout de quadros de uma folha real, pra que a
 * cena de combate já toque as animações do jeito definitivo.
 *
 * Pra trocar um provisório pela arte final:
 *   1. salve a folha em client/public/sprites/ (personagens desenhados
 *      OLHANDO PRA DIREITA; o inimigo é espelhado pela cena);
 *   2. registre em SPRITE_SHEETS abaixo, com a chave do combatente.
 * Nada mais muda.
 */

export type SpriteAnim = "idle" | "attack" | "hurt" | "die";

interface AnimRange {
  /** Primeiro e último quadro (índices na folha, contados da esquerda pra direita, de cima pra baixo). */
  start: number;
  end: number;
  frameRate: number;
  /** -1 repete pra sempre; 0 toca uma vez. */
  repeat: number;
}

export interface SpriteSheetDef {
  /** Caminho relativo a client/public (ex: "sprites/luminar.png"). */
  url: string;
  frameWidth: number;
  frameHeight: number;
  /** Omitido = mesmo layout da folha provisória (DEFAULT_ANIMS). */
  anims?: Record<SpriteAnim, AnimRange>;
}

/** Layout padrão: 14 quadros — 4 de idle, 4 de ataque, 2 de dano, 4 de morte. */
export const DEFAULT_ANIMS: Record<SpriteAnim, AnimRange> = {
  idle: { start: 0, end: 3, frameRate: 5, repeat: -1 },
  attack: { start: 4, end: 7, frameRate: 14, repeat: 0 },
  hurt: { start: 8, end: 9, frameRate: 8, repeat: 0 },
  die: { start: 10, end: 13, frameRate: 7, repeat: 0 },
};

/**
 * Folhas de arte final, por chave de combatente (ver classSpriteKey e
 * enemySpriteKey). Vazio = todo mundo usa o provisório. Exemplo:
 *
 *   "class:luminar": { url: "sprites/luminar.png", frameWidth: 96, frameHeight: 96 },
 */
export const SPRITE_SHEETS: Record<string, SpriteSheetDef> = {};

export function classSpriteKey(characterClass: CharacterClass): string {
  return `class:${characterClass}`;
}

export function enemySpriteKey(encounterId: string): string {
  return `enemy:${encounterId}`;
}

export function animKey(spriteKey: string, anim: SpriteAnim): string {
  return `${spriteKey}:${anim}`;
}

/** Altura (em px de tela) com que todo combatente é exibido, qualquer que seja o tamanho do quadro da folha. */
const DISPLAY_HEIGHT = 256;

export function spriteDisplayScale(scene: Phaser.Scene, spriteKey: string): number {
  return DISPLAY_HEIGHT / scene.textures.getFrame(spriteKey, 0).height;
}

const PLACEHOLDER_FRAME = 64;
const PLACEHOLDER_FRAME_COUNT = 14;

export const CLASS_COLOR: Record<CharacterClass, string> = {
  luminar: "#e8c47a",
  entropista: "#b0623a",
  cantor_de_ealen: "#5fb8b0",
  guardiao: "#7a5cc0",
  sombrilico: "#56607a",
  rachador: "#c0455a",
};

const PRINCIPLE_COLOR: Record<Principle, string> = {
  singularidade: "#7a5cc0",
  harmonia: "#e8c47a",
  entropia: "#b0623a",
  fratura: "#c0455a",
  ealen: "#5fb8b0",
  ausencia: "#56607a",
};

interface Pose {
  /** Deslocamento do corpo, em px do quadro. */
  dx: number;
  dy: number;
  /** Achatamento vertical (1 = em pé; perto de 0 = caído). */
  squash: number;
  alpha: number;
  /** Braço/arma estendido pra frente (quadros de impacto do ataque). */
  strike: boolean;
  /** Corpo todo claro (quadro de dano). */
  flash: boolean;
}

const STAND: Pose = { dx: 0, dy: 0, squash: 1, alpha: 1, strike: false, flash: false };

/** A pose de cada um dos 14 quadros, na ordem de DEFAULT_ANIMS. */
const PLACEHOLDER_POSES: Pose[] = [
  // idle
  STAND,
  { ...STAND, dy: -2 },
  { ...STAND, dy: -2 },
  STAND,
  // attack
  { ...STAND, dx: -4 },
  { ...STAND, dx: 6, strike: true },
  { ...STAND, dx: 10, strike: true },
  { ...STAND, dx: 2 },
  // hurt
  { ...STAND, dx: -6, flash: true },
  { ...STAND, dx: -3 },
  // die
  { ...STAND, squash: 0.8, alpha: 0.9 },
  { ...STAND, squash: 0.55, alpha: 0.7 },
  { ...STAND, squash: 0.3, alpha: 0.45 },
  { ...STAND, squash: 0.15, alpha: 0.2 },
];

type PlaceholderShape = { kind: "humanoid"; color: string } | { kind: "creature"; color: string; glyph: string };

function drawHumanoid(ctx: CanvasRenderingContext2D, color: string, pose: Pose): void {
  const body = pose.flash ? "#ffffff" : color;
  const dark = pose.flash ? "#ffffff" : "#141110";

  // Pernas, tronco e cabeça — o pé fica em (0, 0), o boneco cresce pra cima.
  ctx.fillStyle = dark;
  ctx.fillRect(-7, -14, 5, 14);
  ctx.fillRect(2, -14, 5, 14);
  ctx.fillStyle = body;
  ctx.fillRect(-9, -36, 18, 22);
  ctx.fillStyle = pose.flash ? "#ffffff" : "#cfc6b8";
  ctx.fillRect(-6, -48, 12, 12);

  // Arma: erguida em repouso, estendida no golpe.
  ctx.fillStyle = pose.flash ? "#ffffff" : "#e8c47a";
  if (pose.strike) ctx.fillRect(9, -30, 20, 3);
  else ctx.fillRect(11, -50, 3, 28);
}

function drawCreature(ctx: CanvasRenderingContext2D, color: string, glyph: string, pose: Pose): void {
  ctx.fillStyle = pose.flash ? "#ffffff" : color;
  ctx.beginPath();
  ctx.ellipse(0, -22, pose.strike ? 24 : 20, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#141110";
  ctx.font = "22px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, 0, -22);
}

/** Desenha a folha provisória inteira num canvas e registra os quadros numerados, como numa spritesheet carregada. */
function createPlaceholderSheet(scene: Phaser.Scene, spriteKey: string, shape: PlaceholderShape): void {
  const texture = scene.textures.createCanvas(spriteKey, PLACEHOLDER_FRAME * PLACEHOLDER_FRAME_COUNT, PLACEHOLDER_FRAME);
  if (!texture) return;

  const ctx = texture.getContext();
  PLACEHOLDER_POSES.forEach((pose, index) => {
    ctx.save();
    // Origem no pé do combatente, no centro do quadro.
    ctx.translate(index * PLACEHOLDER_FRAME + PLACEHOLDER_FRAME / 2 + pose.dx, PLACEHOLDER_FRAME - 4 + pose.dy);
    ctx.scale(1 + (1 - pose.squash) * 0.5, pose.squash);
    ctx.globalAlpha = pose.alpha;
    if (shape.kind === "humanoid") drawHumanoid(ctx, shape.color, pose);
    else drawCreature(ctx, shape.color, shape.glyph, pose);
    ctx.restore();

    texture.add(index, 0, index * PLACEHOLDER_FRAME, 0, PLACEHOLDER_FRAME, PLACEHOLDER_FRAME);
  });
  texture.refresh();
}

function createAnims(scene: Phaser.Scene, spriteKey: string): void {
  const ranges = SPRITE_SHEETS[spriteKey]?.anims ?? DEFAULT_ANIMS;
  for (const anim of Object.keys(ranges) as SpriteAnim[]) {
    const { start, end, frameRate, repeat } = ranges[anim];
    scene.anims.create({
      key: animKey(spriteKey, anim),
      frames: scene.anims.generateFrameNumbers(spriteKey, { start, end }),
      frameRate,
      repeat,
    });
  }
}

/** Enfileira no loader as folhas de arte final registradas. Chamado no preload da cena de boot. */
export function preloadSpriteSheets(scene: Phaser.Scene): void {
  for (const [spriteKey, def] of Object.entries(SPRITE_SHEETS)) {
    scene.load.spritesheet(spriteKey, def.url, { frameWidth: def.frameWidth, frameHeight: def.frameHeight });
  }
}

/**
 * Garante que toda Ordem e toda criatura do bestiário tenha textura e
 * animações: usa a folha carregada quando existe, senão gera o provisório.
 * Chamado uma vez, no create da cena de boot.
 */
export function registerAllSprites(scene: Phaser.Scene): void {
  const shapes: Record<string, PlaceholderShape> = {};

  for (const characterClass of Object.keys(CLASS_INFO) as CharacterClass[]) {
    shapes[classSpriteKey(characterClass)] = { kind: "humanoid", color: CLASS_COLOR[characterClass] };
  }
  for (const [encounterId, entry] of Object.entries(BESTIARY)) {
    shapes[enemySpriteKey(encounterId)] = {
      kind: "creature",
      color: PRINCIPLE_COLOR[entry.principle],
      glyph: entry.glyph,
    };
  }

  for (const [spriteKey, shape] of Object.entries(shapes)) {
    if (!scene.textures.exists(spriteKey)) createPlaceholderSheet(scene, spriteKey, shape);
    // Pixel art: sem suavização ao ampliar (o resto do jogo, texto incluso, fica suave).
    scene.textures.get(spriteKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    createAnims(scene, spriteKey);
  }
}
