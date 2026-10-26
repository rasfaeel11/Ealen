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
 * meio da base do quadro. O quadro pode ser maior que o quadrado do mapa (o
 * Ykuruã é 48x32): a regra continua pondo cada um num quadrado só.
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

/**
 * A folha de quem está Em seco (o bicho de rio fora da água): o mesmo layout,
 * com o couro rachado. Arte final registra as duas em MAP_SHEETS; sem a seca,
 * o ator usa a normal.
 */
export function drySpriteKey(spriteKey: string): string {
  return `${spriteKey}:seco`;
}

export function walkAnimKey(spriteKey: string, facing: Facing): string {
  return `${spriteKey}:${facing}`;
}

/** O quadro de "parado" olhando pra `facing`. */
export function standingFrame(facing: Facing): number {
  return FACINGS.indexOf(facing) * FRAMES_PER_FACING;
}

const CLASS_COLOR: Record<CharacterClass, string> = {
  atracao_repulsao: "#5f86c8",
  espadachim: "#b08a4a",
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

/** O vulto de criatura sem Princípio (o bicho do mundo da série). */
const CREATURE_COLOR = "#5a7a5e";
/** O lodo seco do bicho de rio fora da água. */
const DRY_MUD = "#8a7c5e";

const PLACEHOLDER_WIDTH = 16;
const PLACEHOLDER_HEIGHT = 24;
/** O bicho de rio é maior que o quadrado: a regra o põe em um, a tela o mostra do tamanho de um barco de carga. */
const RIVER_WIDTH = 48;
const RIVER_HEIGHT = 32;
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

/** As conchas presas no lodo das costas, nos mesmos lugares em todo quadro. */
const SHELLS: [number, number][] = [[12, 12], [19, 9], [26, 11], [33, 9], [38, 14], [16, 16], [29, 15]];
/** As rachaduras do couro seco: onde começam e quantos degraus andam. */
const CRACKS: [number, number, number][] = [[8, 15, 5], [22, 12, 6], [31, 18, 5], [14, 21, 4]];

/**
 * O bicho de rio (o Ykuruã), 48x32: um monte baixo e largo de lodo, as
 * conchas nas costas, a boca larga e os olhos pequenos. `dry` é o couro fora
 * da água: mais claro, e rachado.
 */
function riverBeast(color: string, dry: boolean): DrawFrame {
  return (ctx, facing, step) => {
    const lift = liftOf(step);

    ctx.fillStyle = color;
    ctx.fillRect(14, 6 + lift, 20, 3);
    ctx.fillRect(7, 9 + lift, 34, 4);
    ctx.fillRect(3, 13 + lift, 42, 15 - lift);
    ctx.fillRect(6, 28, 36, 3);
    // A barriga mais escura, e no alto das costas o brilho do molhado (em seco, o pó).
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fillRect(6, 25, 36, 3);
    ctx.fillStyle = dry ? "rgba(255, 240, 210, 0.18)" : "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(10, 10 + lift, 12, 2);

    ctx.fillStyle = dry ? "#a89a80" : "#c8c0a8";
    for (const [x, y] of SHELLS) ctx.fillRect(x, y + lift, 2, 2);

    if (dry) {
      ctx.fillStyle = "#2a2418";
      for (const [x, y, run] of CRACKS) {
        for (let i = 0; i < run; i++) ctx.fillRect(x + i * 2, y + lift + (i % 2), 2, 1);
      }
    }

    // A boca larga e os olhos pequenos; de costas, nada.
    ctx.fillStyle = DARK;
    if (facing === "down") {
      ctx.fillRect(12, 23 + lift, 24, 2);
      ctx.fillRect(15, 18 + lift, 2, 1);
      ctx.fillRect(31, 18 + lift, 2, 1);
    } else if (facing === "left") {
      ctx.fillRect(3, 21 + lift, 12, 2);
      ctx.fillRect(8, 16 + lift, 2, 1);
    } else if (facing === "right") {
      ctx.fillRect(33, 21 + lift, 12, 2);
      ctx.fillRect(38, 16 + lift, 2, 1);
    }
  };
}

function createPlaceholderSheet(
  scene: Phaser.Scene,
  spriteKey: string,
  draw: DrawFrame,
  width = PLACEHOLDER_WIDTH,
  height = PLACEHOLDER_HEIGHT,
): void {
  const texture = scene.textures.createCanvas(spriteKey, width * FRAMES_PER_FACING, height * FACINGS.length);
  if (!texture) return;

  const ctx = texture.getContext();
  FACINGS.forEach((facing, row) => {
    for (let step = 0; step < FRAMES_PER_FACING; step++) {
      const x = step * width;
      const y = row * height;
      ctx.save();
      ctx.translate(x, y);
      draw(ctx, facing, step);
      ctx.restore();
      texture.add(row * FRAMES_PER_FACING + step, 0, x, y, width, height);
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
  const placeholders: Record<string, { draw: DrawFrame; width?: number; height?: number }> = {};
  for (const characterClass of Object.keys(CLASS_INFO) as CharacterClass[]) {
    placeholders[classSpriteKey(characterClass)] = { draw: humanoid(CLASS_COLOR[characterClass]) };
  }
  for (const [creatureId, entry] of Object.entries(BESTIARY)) {
    // Bicho do mundo da série não é Princípio nenhum: a cor do lodo.
    const color = entry.principle ? PRINCIPLE_COLOR[entry.principle] : CREATURE_COLOR;
    const spriteKey = creatureSpriteKey(creatureId);
    if (!entry.river) {
      placeholders[spriteKey] = { draw: entry.person ? humanoid(color) : creature(color) };
      continue;
    }
    placeholders[spriteKey] = { draw: riverBeast(color, false), width: RIVER_WIDTH, height: RIVER_HEIGHT };
    // A seca provisória só acompanha a normal provisória: arte final sem folha seca usa a normal (ver drySpriteKey).
    if (!scene.textures.exists(spriteKey)) {
      placeholders[drySpriteKey(spriteKey)] = { draw: riverBeast(DRY_MUD, true), width: RIVER_WIDTH, height: RIVER_HEIGHT };
    } else if (scene.textures.exists(drySpriteKey(spriteKey))) {
      // A folha seca da arte final já está carregada: aqui ela só ganha as animações.
      placeholders[drySpriteKey(spriteKey)] = { draw: riverBeast(DRY_MUD, true) };
    }
  }

  for (const [spriteKey, { draw, width, height }] of Object.entries(placeholders)) {
    if (!scene.textures.exists(spriteKey)) createPlaceholderSheet(scene, spriteKey, draw, width, height);
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
