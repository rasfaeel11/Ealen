import * as Phaser from "phaser";
import { CLASS_INFO, type CharacterClass } from "@ealen/shared";
import { CLASS_COLOR } from "./sprites";

/**
 * Sprites de quem anda pelo mapa.
 *
 * Cada personagem é uma folha de 4 linhas x 4 colunas: uma linha por
 * direção (baixo, esquerda, direita, cima), quatro quadros de caminhada em
 * cada, com o PRIMEIRO quadro da linha servindo de "parado". Enquanto não
 * há arte, o jogo desenha um boneco provisório com esse mesmo layout.
 *
 * Pra trocar pela arte final: salve a folha em client/public/sprites/ e
 * registre em WALK_SHEETS, com a chave do personagem. O pé do personagem
 * fica no meio da base do quadro.
 */

export type Facing = "down" | "left" | "right" | "up";

/** A ordem das linhas da folha. */
const FACINGS: Facing[] = ["down", "left", "right", "up"];
const FRAMES_PER_FACING = 4;
const WALK_FRAME_RATE = 8;

export interface WalkSheetDef {
  /** Caminho relativo a client/public (ex: "sprites/luminar-walk.png"). */
  url: string;
  frameWidth: number;
  frameHeight: number;
}

/**
 * Folhas de arte final, por chave de personagem (ver classWalkKey). Vazio =
 * todo mundo usa o provisório. Exemplo:
 *
 *   "walk:luminar": { url: "sprites/luminar-walk.png", frameWidth: 24, frameHeight: 32 },
 */
export const WALK_SHEETS: Record<string, WalkSheetDef> = {};

export function classWalkKey(characterClass: CharacterClass): string {
  return `walk:${characterClass}`;
}

export function walkAnimKey(spriteKey: string, facing: Facing): string {
  return `${spriteKey}:${facing}`;
}

/** O quadro de "parado" olhando pra `facing`. */
export function standingFrame(facing: Facing): number {
  return FACINGS.indexOf(facing) * FRAMES_PER_FACING;
}

const PLACEHOLDER_WIDTH = 16;
const PLACEHOLDER_HEIGHT = 24;

function drawPlaceholderFrame(ctx: CanvasRenderingContext2D, color: string, facing: Facing, step: number): void {
  // Passos 1 e 3 são as passadas: o corpo sobe um pixel e uma perna encolhe.
  const striding = step % 2 === 1;
  const lift = striding ? -1 : 0;
  const dark = "#141110";

  ctx.fillStyle = dark;
  ctx.fillRect(4, 18, 3, step === 1 ? 3 : 6);
  ctx.fillRect(9, 18, 3, step === 3 ? 3 : 6);

  ctx.fillStyle = color;
  ctx.fillRect(3, 10 + lift, 10, 8);

  ctx.fillStyle = facing === "up" ? "#5a4a3a" : "#cfc6b8";
  ctx.fillRect(4, 2 + lift, 8, 8);
  ctx.fillStyle = "#5a4a3a";
  ctx.fillRect(4, 2 + lift, 8, 2);

  ctx.fillStyle = dark;
  if (facing === "down") {
    ctx.fillRect(6, 6 + lift, 1, 2);
    ctx.fillRect(9, 6 + lift, 1, 2);
  } else if (facing === "left") {
    ctx.fillRect(5, 6 + lift, 1, 2);
  } else if (facing === "right") {
    ctx.fillRect(10, 6 + lift, 1, 2);
  }
}

function createPlaceholderSheet(scene: Phaser.Scene, spriteKey: string, color: string): void {
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
      drawPlaceholderFrame(ctx, color, facing, step);
      ctx.restore();
      texture.add(row * FRAMES_PER_FACING + step, 0, x, y, PLACEHOLDER_WIDTH, PLACEHOLDER_HEIGHT);
    }
  });
  texture.refresh();
}

/** Enfileira no loader as folhas de arte final registradas. Chamado no preload da cena de boot. */
export function preloadWalkSheets(scene: Phaser.Scene): void {
  for (const [spriteKey, def] of Object.entries(WALK_SHEETS)) {
    scene.load.spritesheet(spriteKey, def.url, { frameWidth: def.frameWidth, frameHeight: def.frameHeight });
  }
}

/**
 * Garante que toda Ordem tenha textura e animações de caminhada: usa a
 * folha carregada quando existe, senão gera o provisório. Chamado uma vez,
 * no create da cena de boot.
 */
export function registerWalkSprites(scene: Phaser.Scene): void {
  for (const characterClass of Object.keys(CLASS_INFO) as CharacterClass[]) {
    const spriteKey = classWalkKey(characterClass);
    if (!scene.textures.exists(spriteKey)) createPlaceholderSheet(scene, spriteKey, CLASS_COLOR[characterClass]);
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
