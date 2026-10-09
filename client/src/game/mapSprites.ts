import * as Phaser from "phaser";
import { BESTIARY, CLASS_INFO, type CharacterClass, type Principle } from "@ealen/shared";

/**
 * Sprites de quem está no mapa — personagens e criaturas, andando ou
 * lutando (o combate acontece no próprio mapa, com os mesmos sprites).
 *
 * Cada um é uma folha de 4 linhas x 4 colunas: uma linha por direção
 * (baixo, esquerda, direita, cima), quatro quadros de caminhada em cada,
 * com o PRIMEIRO quadro da linha servindo de "parado". Enquanto não há
 * arte, o jogo desenha um provisório com esse mesmo layout: um boneco por
 * Ordem, um vulto por criatura (e um boneco pra criatura que é gente).
 *
 * Pra trocar pela arte final: salve a folha em client/public/sprites/ e
 * registre em MAP_SHEETS, com a chave de quem ela representa. O pé fica no
 * meio da base do quadro.
 */

export type Facing = "down" | "left" | "right" | "up";

/** A ordem das linhas da folha. */
const FACINGS: Facing[] = ["down", "left", "right", "up"];
const FRAMES_PER_FACING = 4;
const WALK_FRAME_RATE = 8;

export interface MapSheetDef {
  /** Caminho relativo a client/public (ex: "sprites/luminar.png"). */
  url: string;
  frameWidth: number;
  frameHeight: number;
}

/**
 * Folhas de arte final, por chave (ver classSpriteKey e creatureSpriteKey).
 * Vazio = todo mundo usa o provisório. Exemplo:
 *
 *   "class:luminar": { url: "sprites/luminar.png", frameWidth: 24, frameHeight: 32 },
 */
export const MAP_SHEETS: Record<string, MapSheetDef> = {};

export function classSpriteKey(characterClass: CharacterClass): string {
  return `class:${characterClass}`;
}

/** `creatureId` é a chave da criatura no bestiário. */
export function creatureSpriteKey(creatureId: string): string {
  return `creature:${creatureId}`;
}

export function walkAnimKey(spriteKey: string, facing: Facing): string {
  return `${spriteKey}:${facing}`;
}

/** O quadro de "parado" olhando pra `facing`. */
export function standingFrame(facing: Facing): number {
  return FACINGS.indexOf(facing) * FRAMES_PER_FACING;
}

const CLASS_COLOR: Record<CharacterClass, string> = {
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

const PLACEHOLDER_WIDTH = 16;
const PLACEHOLDER_HEIGHT = 24;
const DARK = "#141110";

type DrawFrame = (ctx: CanvasRenderingContext2D, facing: Facing, step: number) => void;

/** Passos 1 e 3 são as passadas: o corpo sobe um pixel. */
function liftOf(step: number): number {
  return step % 2 === 1 ? -1 : 0;
}

function drawEyes(ctx: CanvasRenderingContext2D, facing: Facing, y: number): void {
  ctx.fillStyle = DARK;
  if (facing === "down") {
    ctx.fillRect(6, y, 1, 2);
    ctx.fillRect(9, y, 1, 2);
  } else if (facing === "left") {
    ctx.fillRect(5, y, 1, 2);
  } else if (facing === "right") {
    ctx.fillRect(10, y, 1, 2);
  }
}

function humanoid(color: string): DrawFrame {
  return (ctx, facing, step) => {
    const lift = liftOf(step);

    // Uma perna encolhe em cada passada.
    ctx.fillStyle = DARK;
    ctx.fillRect(4, 18, 3, step === 1 ? 3 : 6);
    ctx.fillRect(9, 18, 3, step === 3 ? 3 : 6);

    ctx.fillStyle = color;
    ctx.fillRect(3, 10 + lift, 10, 8);

    ctx.fillStyle = facing === "up" ? "#5a4a3a" : "#cfc6b8";
    ctx.fillRect(4, 2 + lift, 8, 8);
    ctx.fillStyle = "#5a4a3a";
    ctx.fillRect(4, 2 + lift, 8, 2);

    drawEyes(ctx, facing, 6 + lift);
  };
}

function creature(color: string): DrawFrame {
  return (ctx, facing, step) => {
    const lift = liftOf(step);

    ctx.fillStyle = color;
    ctx.fillRect(4, 8 + lift, 8, 2);
    ctx.fillRect(3, 10 + lift, 10, 12 - lift);
    ctx.fillRect(4, 22, 8, 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(4, 10 + lift, 2, 5);

    drawEyes(ctx, facing, 13 + lift);
  };
}

function createPlaceholderSheet(scene: Phaser.Scene, spriteKey: string, draw: DrawFrame): void {
  const texture = scene.textures.createCanvas(
    spriteKey,
    PLACEHOLDER_WIDTH * FRAMES_PER_FACING,
    PLACEHOLDER_HEIGHT * FACINGS.length,
  );
  if (!texture) return;

  const ctx = texture.getContext();
  FACINGS.forEach((facing, row) => {
    for (let step = 0; step < FRAMES_PER_FACING; step++) {
      const x = step * PLACEHOLDER_WIDTH;
      const y = row * PLACEHOLDER_HEIGHT;
      ctx.save();
      ctx.translate(x, y);
      draw(ctx, facing, step);
      ctx.restore();
      texture.add(row * FRAMES_PER_FACING + step, 0, x, y, PLACEHOLDER_WIDTH, PLACEHOLDER_HEIGHT);
    }
  });
  texture.refresh();
}

/** Enfileira no loader as folhas de arte final registradas. Chamado no preload da cena de boot. */
export function preloadMapSheets(scene: Phaser.Scene): void {
  for (const [spriteKey, def] of Object.entries(MAP_SHEETS)) {
    scene.load.spritesheet(spriteKey, def.url, { frameWidth: def.frameWidth, frameHeight: def.frameHeight });
  }
}

/**
 * Garante que toda Ordem e toda criatura do bestiário tenha textura e
 * animações de caminhada: usa a folha carregada quando existe, senão gera
 * o provisório. Chamado uma vez, no create da cena de boot.
 */
export function registerMapSprites(scene: Phaser.Scene): void {
  const placeholders: Record<string, DrawFrame> = {};
  for (const characterClass of Object.keys(CLASS_INFO) as CharacterClass[]) {
    placeholders[classSpriteKey(characterClass)] = humanoid(CLASS_COLOR[characterClass]);
  }
  for (const [creatureId, entry] of Object.entries(BESTIARY)) {
    const color = PRINCIPLE_COLOR[entry.principle];
    placeholders[creatureSpriteKey(creatureId)] = entry.person ? humanoid(color) : creature(color);
  }

  for (const [spriteKey, draw] of Object.entries(placeholders)) {
    if (!scene.textures.exists(spriteKey)) createPlaceholderSheet(scene, spriteKey, draw);
    // Pixel art: sem suavização ao ampliar (o resto do jogo, texto incluso, fica suave).
    scene.textures.get(spriteKey).setFilter(Phaser.Textures.FilterMode.NEAREST);

    for (const facing of FACINGS) {
      const start = standingFrame(facing);
      scene.anims.create({
        key: walkAnimKey(spriteKey, facing),
        frames: scene.anims.generateFrameNumbers(spriteKey, { start, end: start + FRAMES_PER_FACING - 1 }),
        frameRate: WALK_FRAME_RATE,
        repeat: -1,
      });
    }
  }
}
