import * as Phaser from "phaser";
import { COLORS, TEXT_COLORS } from "../config";
import { Tooltip, addBodyText, addTitleText, drawBar, drawDiamond, fitFace, hpColor, type AddHud, type FaceRef } from "../ui";

/** Uma pessoa na coluna do grupo. Sem `hp`, acompanha sem lutar: o cartão é menor, e mostra o apoio. */
export interface PartyEntry {
  id: string;
  name: string;
  face: FaceRef;
  level?: number;
  hp?: { now: number; max: number };
  breath?: { now: number; max: number };
  mana?: { now: number; max: number };
  /** A vez é dele. */
  active?: boolean;
  /** Caiu na luta. */
  down?: boolean;
  /** As condições que ele carrega, pelo nome, e se fazem mal. */
  statuses?: { name: string; bad: boolean; note?: string }[];
  /** Quem só acompanha: o que oferece, e se ainda dá nesta rodada. */
  support?: { name: string; ready: boolean };
  /** A primeira linha do cartão de detalhe: a classe, a escola. */
  calling?: string;
}

const X = 10;
const Y = 12;
const WIDTH = 88;
const FACE_HEIGHT = 92;
const HP_HEIGHT = 15;
const THIN = 5;
const GAP = 10;
const CHIP = 18;

/**
 * Um cartão: o rosto, a vida por cima do pé dele, Fôlego e mana em filetes, o
 * nível num losango e as condições em fichas ao lado.
 */
class PartyCard {
  readonly root: Phaser.GameObjects.Container;
  readonly height: number;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly face: Phaser.GameObjects.Image;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly level: Phaser.GameObjects.Text;
  private readonly flash: Phaser.GameObjects.Rectangle;
  private chips: Phaser.GameObjects.GameObject[] = [];
  private lastHp?: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private entry: PartyEntry,
    handlers: { over: (card: PartyCard) => void; out: () => void; down?: (id: string) => void },
  ) {
    const fights = entry.hp !== undefined;
    const faceHeight = fights ? FACE_HEIGHT : FACE_HEIGHT - 28;
    this.height = faceHeight + (fights ? HP_HEIGHT + 4 + (entry.breath ? THIN + 2 : 0) + (entry.mana ? THIN + 2 : 0) : 0) + 2;
    this.frame = scene.add.graphics();
    this.face = scene.add.image(0, 0, entry.face.key, entry.face.frame);
    fitFace(this.face, entry.face, 1, 1, WIDTH - 2, faceHeight, entry.name);
    this.bars = scene.add.graphics();
    this.flash = scene.add.rectangle(1, 1, WIDTH - 2, faceHeight, COLORS.hpLow, 1).setOrigin(0).setAlpha(0);
    this.hpText = addBodyText(scene, WIDTH / 2, faceHeight + 3, "", { fontSize: "13px", color: TEXT_COLORS.white })
      .setOrigin(0.5, 0)
      .setShadow(0, 1, "#000000", 3);
    this.level = addBodyText(scene, WIDTH - 11, 11, "", { fontSize: "13px", color: "#1a120a", fontStyle: "bold" }).setOrigin(0.5);
    const zone = scene.add.zone(0, 0, WIDTH, this.height).setOrigin(0).setInteractive({ useHandCursor: handlers.down !== undefined });
    zone.on(Phaser.Input.Events.POINTER_OVER, () => handlers.over(this));
    zone.on(Phaser.Input.Events.POINTER_OUT, () => handlers.out());
    if (handlers.down) zone.on(Phaser.Input.Events.POINTER_DOWN, () => handlers.down!(this.entry.id));
    this.root = scene.add.container(0, 0, [this.frame, this.face, this.flash, this.bars, this.hpText, this.level, zone]);
    this.set(entry);
  }

  get current(): PartyEntry {
    return this.entry;
  }

  set(entry: PartyEntry): void {
    this.entry = entry;
    const fights = entry.hp !== undefined;
    const faceHeight = fights ? FACE_HEIGHT : FACE_HEIGHT - 28;
    const lit = entry.active === true;

    const g = this.frame;
    g.clear();
    g.fillStyle(0x0a0807, 1);
    g.fillRect(0, 0, WIDTH, this.height);
    g.lineStyle(lit ? 3 : 1, lit ? COLORS.goldBright : COLORS.bronze, 1);
    g.strokeRect(0, 0, WIDTH, this.height);

    this.face.setAlpha(entry.down ? 0.35 : 1);
    if (entry.down) this.face.setTint(0x6a4a4a);
    else this.face.clearTint();

    const bars = this.bars;
    bars.clear();
    let y = faceHeight + 1;
    if (entry.hp) {
      const ratio = entry.hp.max > 0 ? entry.hp.now / entry.hp.max : 0;
      drawBar(bars, 1, y + 1, WIDTH - 2, HP_HEIGHT, ratio, hpColor(ratio));
      this.hpText.setText(`${entry.hp.now}/${entry.hp.max}`);
      y += HP_HEIGHT + 3;
      if (this.lastHp !== undefined && entry.hp.now < this.lastHp) {
        // O golpe aparece no rosto também: é por aqui que se sabe quem apanhou fora de vista.
        this.flash.setAlpha(0.6);
        this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: 380, ease: "Cubic.easeOut" });
      }
      this.lastHp = entry.hp.now;
    } else {
      this.hpText.setText("");
    }
    if (entry.breath) {
      drawBar(bars, 1, y, WIDTH - 2, THIN, entry.breath.max > 0 ? entry.breath.now / entry.breath.max : 0, COLORS.breath);
      y += THIN + 2;
    }
    if (entry.mana) drawBar(bars, 1, y, WIDTH - 2, THIN, entry.mana.max > 0 ? entry.mana.now / entry.mana.max : 0, COLORS.mana);

    if (entry.level !== undefined) {
      drawDiamond(bars, WIDTH - 11, 11, 10, COLORS.gold);
      this.level.setText(`${entry.level}`);
    } else {
      this.level.setText("");
    }
    // Quem só acompanha: o ponto aceso diz que o apoio dele ainda vale nesta rodada.
    if (entry.support) {
      bars.fillStyle(entry.support.ready ? COLORS.action : 0x3a3a3a, 1);
      bars.fillCircle(10, 10, 5);
      bars.lineStyle(1, 0x000000, 1);
      bars.strokeCircle(10, 10, 5);
    }

    this.drawChips(entry.statuses ?? []);
  }

  /** As condições em fichas ao lado do cartão; a letra é a primeira do nome, e a cor diz se faz mal. */
  private drawChips(statuses: NonNullable<PartyEntry["statuses"]>): void {
    for (const chip of this.chips) chip.destroy();
    this.chips = [];
    statuses.slice(0, 5).forEach((status, i) => {
      const y = i * (CHIP + 2);
      const color = status.bad ? COLORS.hpLow : COLORS.guard;
      const box = this.scene.add.rectangle(WIDTH + 4, y, CHIP, CHIP, 0x0a0807, 0.95).setOrigin(0).setStrokeStyle(1, color, 1);
      const letter = addTitleText(this.scene, WIDTH + 4 + CHIP / 2, y + CHIP / 2, status.name.charAt(0), {
        fontSize: "12px",
        color: status.bad ? TEXT_COLORS.danger : TEXT_COLORS.guard,
      }).setOrigin(0.5);
      this.root.add([box, letter]);
      this.chips.push(box, letter);
    });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.flash);
    this.root.destroy();
  }
}

/** O que `PartyColumn` escreve no cartão de detalhe de quem está sob o mouse. */
function describe(entry: PartyEntry): { title: string; meta?: string; body?: string } {
  const lines: string[] = [];
  if (entry.hp) lines.push(`Vida ${entry.hp.now}/${entry.hp.max}`);
  if (entry.breath) lines.push(`Fôlego ${entry.breath.now}/${entry.breath.max}`);
  if (entry.mana) lines.push(`Mana ${entry.mana.now}/${entry.mana.max}`);
  if (entry.support) lines.push(`${entry.support.name}: ${entry.support.ready ? "pronto nesta rodada" : "já usado nesta rodada"}`);
  for (const status of entry.statuses ?? []) lines.push(status.note ? `${status.name}: ${status.note}` : status.name);
  return {
    title: entry.name,
    meta: [entry.level !== undefined ? `Nível ${entry.level}` : undefined, entry.calling].filter(Boolean).join("  ·  ") || undefined,
    body: lines.join("\n") || undefined,
  };
}

/**
 * O grupo na coluna da esquerda: o retrato de cada um, com a vida embaixo, o
 * Fôlego, a mana e o que carrega. Serve à exploração e à luta, que só diferem
 * no que entregam em `set`.
 */
export class PartyColumn {
  private readonly root: Phaser.GameObjects.Container;
  private readonly tip: Tooltip;
  private cards: PartyCard[] = [];
  private signature = "";

  constructor(
    private readonly scene: Phaser.Scene,
    addHud: AddHud,
    private readonly onSelect?: (id: string) => void,
  ) {
    this.root = addHud(scene.add.container(X, Y));
    this.tip = new Tooltip(scene);
    addHud(this.tip.root);
  }

  /** Os objetos de topo, pra quem precisa da ordem de desenho. */
  get objects(): Phaser.GameObjects.Container[] {
    return [this.root, this.tip.root];
  }

  set(entries: PartyEntry[]): void {
    // Muda quem está no grupo (ou se acompanha ou luta): refaz os cartões. Senão, só atualiza.
    const signature = entries.map((entry) => `${entry.id}:${entry.hp !== undefined}:${entry.breath !== undefined}:${entry.mana !== undefined}`).join("|");
    if (signature !== this.signature) {
      this.signature = signature;
      for (const card of this.cards) card.destroy();
      this.cards = entries.map(
        (entry) =>
          new PartyCard(this.scene, entry, {
            over: (card) => this.showTip(card),
            out: () => this.tip.hide(),
            down: this.onSelect,
          }),
      );
      let y = 0;
      for (const card of this.cards) {
        card.root.setY(y);
        y += card.height + GAP;
        this.root.add(card.root);
      }
      return;
    }
    this.cards.forEach((card, i) => card.set(entries[i]));
  }

  setVisible(visible: boolean): void {
    this.root.setVisible(visible);
    if (!visible) this.tip.hide();
  }

  destroy(): void {
    for (const card of this.cards) card.destroy();
    this.root.destroy();
    this.tip.destroy();
  }

  private showTip(card: PartyCard): void {
    const content = describe(card.current);
    // À direita da coluna, na altura do cartão.
    const bottom = Y + card.root.y + card.height + 40;
    this.tip.show(X + WIDTH + 30 + 160, bottom, content);
  }
}
