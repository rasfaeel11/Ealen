import * as Phaser from "phaser";

/**
 * O cenário pintado de uma área (`art/pintar_cenario.py`, `docs/arte.md`): a água
 * que corre por baixo, o chão inteiro numa imagem só, as peças de pé ordenadas
 * por Y junto com os personagens e, nos baixios, a bruma.
 *
 * Só desenha. O que barra, o que é água e onde cada um fica continua nos mapas
 * do Tiled, e a regra nunca lê nada daqui.
 */

interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Uma peça de pé, com o pé no meio da base, em pixels de mundo. */
interface StandEntry {
  frame: string;
  x: number;
  y: number;
  /** A altura em que ela entra na ordem, quando não é a do próprio pé. */
  depth?: number;
  /** Quem está neste retângulo (em quadrados) vê através dela: é o telhado de uma casa ou o muro de um pátio. */
  fade?: TileRect;
  fadeTo?: number;
  /** De onde sai a fumaça, em pixels de arte a partir do pé. */
  smoke?: [number, number];
  /** Só de pé com esta variável da história desligada. */
  unless?: string;
}

interface SceneData {
  scale: number;
  flow: [number, number];
  mist: boolean;
  frames: Record<string, Frame>;
  stand: StandEntry[];
}

interface PropsData {
  scale: number;
  frames: Record<string, Frame>;
}

const WATER_KEY = "scene:agua";
const GLINT_KEY = "scene:agua-brilho";
const MIST_KEY = "scene:bruma";
const PROPS_KEY = "scene:props";
const FLOOR_DEPTH = -1000;
/** Por cima de quem anda, abaixo da interface da luta. */
const MIST_DEPTH = 900_000;
/** O quanto o brilho corre mais que o fundo, pra água não parecer um pano sendo puxado. */
const GLINT_SPEED = 1.7;
/** A velocidade com que um telhado some e volta, por milissegundo. */
const FADE_PER_MS = 0.004;
const SMOKE_EVERY_MS = 620;
const SMOKE_LIFE_MS = 3200;

function groundKey(areaId: string): string {
  return `scene:${areaId}:ground`;
}

function atlasKey(areaId: string): string {
  return `scene:${areaId}:atlas`;
}

function dataKey(areaId: string): string {
  return `scene:${areaId}:data`;
}

/** Enfileira no loader o cenário de todas as áreas. Chamado no preload da cena de boot. */
export function preloadScenery(scene: Phaser.Scene, areaIds: string[]): void {
  scene.load.image(WATER_KEY, "scenes/agua.png");
  scene.load.image(GLINT_KEY, "scenes/agua-brilho.png");
  scene.load.image(MIST_KEY, "scenes/bruma.png");
  scene.load.image(PROPS_KEY, "scenes/props.png");
  scene.load.json(PROPS_KEY, "scenes/props.json");
  for (const id of areaIds) {
    scene.load.image(groundKey(id), `scenes/${id}.ground.png`);
    scene.load.image(atlasKey(id), `scenes/${id}.atlas.png`);
    scene.load.json(dataKey(id), `scenes/${id}.json`);
  }
}

/** Nomeia os quadros dos atlas. Chamado no create da cena de boot. */
export function prepareScenery(scene: Phaser.Scene, areaIds: string[]): void {
  const name = (key: string, frames: Record<string, Frame>): void => {
    const texture = scene.textures.get(key);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const [frame, at] of Object.entries(frames)) texture.add(frame, 0, at.x, at.y, at.w, at.h);
  };
  name(PROPS_KEY, (scene.cache.json.get(PROPS_KEY) as PropsData).frames);
  for (const id of areaIds) {
    name(atlasKey(id), (scene.cache.json.get(dataKey(id)) as SceneData).frames);
    scene.textures.get(groundKey(id)).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  for (const key of [WATER_KEY, GLINT_KEY]) scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
}

interface Standing {
  entry: StandEntry;
  image: Phaser.GameObjects.Image;
  smokeIn: number;
}

export class Scenery {
  private readonly data: SceneData;
  private readonly stands: Standing[] = [];
  private readonly water: Phaser.GameObjects.TileSprite;
  private readonly glint: Phaser.GameObjects.TileSprite;
  private readonly mist: Phaser.GameObjects.TileSprite[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly areaId: string,
    private readonly addWorld: <T extends Phaser.GameObjects.GameObject>(object: T) => T,
    width: number,
    height: number,
  ) {
    this.data = scene.cache.json.get(dataKey(areaId)) as SceneData;
    const { scale } = this.data;

    const sheet = (key: string, depth: number, alpha = 1): Phaser.GameObjects.TileSprite => {
      const sprite = scene.add.tileSprite(0, 0, width, height, key).setOrigin(0).setTileScale(scale).setDepth(depth).setAlpha(alpha);
      return addWorld(sprite);
    };
    this.water = sheet(WATER_KEY, FLOOR_DEPTH - 2);
    this.glint = sheet(GLINT_KEY, FLOOR_DEPTH - 1);
    addWorld(scene.add.image(0, 0, groundKey(areaId)).setOrigin(0).setScale(scale).setDepth(FLOOR_DEPTH));

    for (const entry of this.data.stand) {
      const image = scene.add
        .image(entry.x, entry.y, atlasKey(areaId), entry.frame)
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setDepth(entry.depth ?? entry.y);
      this.stands.push({ entry, image: addWorld(image), smokeIn: Math.random() * SMOKE_EVERY_MS });
    }

    if (this.data.mist) {
      this.mist.push(sheet(MIST_KEY, MIST_DEPTH, 0.16), sheet(MIST_KEY, MIST_DEPTH + 1, 0.1));
      this.mist[1].setTileScale(scale * 1.6);
    }
  }

  /** O chão inteiro, pra quem precisar desenhá-lo em miniatura. */
  get groundSource(): CanvasImageSource {
    return this.scene.textures.get(groundKey(this.areaId)).getSourceImage() as CanvasImageSource;
  }

  /**
   * A área inteira numa tela só, pro mapa da região: a água, o chão e o que está
   * de pé, cada coisa onde está. Os telhados ficam: ninguém vê dentro das casas no mapa.
   */
  paintRegion(c: CanvasRenderingContext2D, width: number, height: number, flag: (name: string) => unknown): void {
    const { scale, frames } = this.data;
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    // O chão pintado é furado onde há água: a cor de baixo é a do rio.
    c.fillStyle = "#3a4d44";
    c.fillRect(0, 0, width, height);
    const ground = this.groundSource as HTMLImageElement;
    c.drawImage(ground, 0, 0, width, height);
    const per = width / (ground.width * scale);
    const atlas = this.scene.textures.get(atlasKey(this.areaId)).getSourceImage() as HTMLImageElement;
    const inOrder = [...this.data.stand].sort((a, b) => (a.depth ?? a.y) - (b.depth ?? b.y));
    for (const entry of inOrder) {
      if (entry.unless && flag(entry.unless)) continue;
      const frame = frames[entry.frame];
      const w = frame.w * scale;
      const h = frame.h * scale;
      c.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, (entry.x - w / 2) * per, (entry.y - h) * per, w * per, h * per);
    }
  }

  /** O que a história tirou de cena (o barco que afundou) some; o que ela não tirou fica. */
  sync(flag: (name: string) => unknown): void {
    for (const { entry, image } of this.stands) {
      if (entry.unless) image.setVisible(!flag(entry.unless));
    }
  }

  /** Um destrutível de pé, com a arte pintada do tipo dele. */
  standProp(kind: string, x: number, y: number, tileSize: number): Phaser.GameObjects.Image {
    const { scale } = this.scene.cache.json.get(PROPS_KEY) as PropsData;
    const base = (y + 1) * tileSize;
    return this.addWorld(
      this.scene.add
        .image((x + 0.5) * tileSize, base, PROPS_KEY, kind)
        .setOrigin(0.5, 1)
        .setScale(scale)
        // O círculo é riscado no chão: quem pisa fica por cima dele, de qualquer lado.
        .setDepth(kind === "circle" ? FLOOR_DEPTH + 1 : base),
    );
  }

  /** A água corre, a bruma anda, os telhados somem pra quem entrou e a fumaça sobe. `who`: quem conta, em quadrados. */
  tick(delta: number, who: { x: number; y: number }[]): void {
    const seconds = delta / 1000;
    const [vx, vy] = this.data.flow;
    this.water.tilePositionX -= vx * seconds;
    this.water.tilePositionY -= vy * seconds;
    this.glint.tilePositionX -= vx * GLINT_SPEED * seconds;
    this.glint.tilePositionY -= vy * GLINT_SPEED * seconds;
    this.mist.forEach((sheet, index) => {
      sheet.tilePositionX -= (index ? -7 : 11) * seconds;
      sheet.tilePositionY -= (index ? 2 : 3) * seconds;
    });

    for (const stand of this.stands) {
      const { entry, image } = stand;
      if (entry.fade) {
        const { x, y, w, h } = entry.fade;
        const inside = who.some((pos) => pos.x >= x && pos.x < x + w && pos.y >= y && pos.y < y + h);
        const target = inside ? (entry.fadeTo ?? 0) : 1;
        const step = FADE_PER_MS * delta;
        image.setAlpha(image.alpha < target ? Math.min(target, image.alpha + step) : Math.max(target, image.alpha - step));
      }
      if (entry.smoke && image.alpha > 0.5) {
        stand.smokeIn -= delta;
        if (stand.smokeIn <= 0) {
          stand.smokeIn = SMOKE_EVERY_MS * (0.7 + Math.random() * 0.6);
          this.puff(image.x + entry.smoke[0] * this.data.scale, image.y + entry.smoke[1] * this.data.scale, image.depth);
        }
      }
    }
  }

  /** Um fio de fumaça: quem ainda mora aqui acendeu o fogo. */
  private puff(x: number, y: number, depth: number): void {
    const puff = this.addWorld(this.scene.add.circle(x, y, 1.2, 0xb8b6ae, 0.32).setDepth(depth + 1));
    this.scene.tweens.add({
      targets: puff,
      x: x + 5 + Math.random() * 7,
      y: y - 14 - Math.random() * 10,
      scale: 3.2,
      alpha: 0,
      duration: SMOKE_LIFE_MS,
      ease: "Sine.easeOut",
      onComplete: () => puff.destroy(),
    });
  }
}
