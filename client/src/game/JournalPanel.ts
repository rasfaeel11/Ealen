import * as Phaser from "phaser";
import type { JournalEntry } from "@ealen/shared";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import { addBodyText, addPanel, addTitleText } from "./ui";

/** Põe um objeto na cena de modo que só a câmera da interface o desenhe. */
type AddHud = <T extends Phaser.GameObjects.GameObject>(object: T) => T;

const WIDTH = 820;
const HEIGHT = 560;
const X = (GAME_WIDTH - WIDTH) / 2;
const Y = (GAME_HEIGHT - HEIGHT) / 2;
const PADDING = 36;
const LIST_TOP = Y + 96;
const LIST_BOTTOM = Y + HEIGHT - 60;
const ENTRY_GAP = 14;
/** O que se lê no lugar de uma anotação apagada: o espaço dela continua lá. */
const LOST_TEXT = "·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·";
/** A tecla que abriu o diário não pode ser a mesma que o fecha. */
const INPUT_GRACE_MS = 200;

/**
 * O diário de pistas, aberto por cima do mundo. Mostra as anotações na ordem
 * em que foram feitas, uma página por vez, abrindo na mais recente; as
 * apagadas aparecem em branco no lugar delas. Só lê: quem escreve e apaga é
 * a história (ver shared/story/memory.ts).
 *
 * ↑/↓ (ou W/S) trocam de página; Esc, J ou Enter fecham.
 */
export class JournalPanel {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private entryTexts: Phaser.GameObjects.Text[] = [];
  private readonly footer: Phaser.GameObjects.Text;
  /** Cada página é uma faixa de `entries`: [primeira, depois da última). */
  private readonly pages: [number, number][];
  private page: number;
  private readonly openedAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addHud: AddHud,
    private readonly entries: readonly JournalEntry[],
    private readonly onClose: () => void,
  ) {
    this.objects.push(
      addHud(scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.6).setOrigin(0)),
      addHud(addPanel(scene, X, Y, WIDTH, HEIGHT)),
      addHud(addTitleText(scene, GAME_WIDTH / 2, Y + 48, "DIÁRIO", { fontSize: "32px" }).setOrigin(0.5)),
    );
    this.footer = addHud(
      addBodyText(scene, GAME_WIDTH / 2, Y + HEIGHT - 36, "", { fontSize: "16px", color: TEXT_COLORS.inkDim }).setOrigin(0.5),
    );
    this.objects.push(this.footer);

    this.pages = this.paginate();
    this.page = this.pages.length - 1;
    this.openedAt = scene.time.now;
    this.show();
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    for (const object of [...this.objects, ...this.entryTexts]) object.destroy();
    this.entryTexts = [];
  }

  private entryText(entry: JournalEntry, y: number): Phaser.GameObjects.Text {
    return addBodyText(this.scene, X + PADDING, y, entry.lost ? LOST_TEXT : `—  ${entry.text}`, {
      fontSize: "20px",
      lineSpacing: 4,
      color: entry.lost ? TEXT_COLORS.inkDim : TEXT_COLORS.ink,
      wordWrap: { width: WIDTH - PADDING * 2 },
    });
  }

  /**
   * Reparte as anotações em páginas pelo tamanho que cada uma ocupa escrita.
   * Enche de trás pra frente: a última página, a que se abre, é a das mais
   * recentes e vem cheia; o que sobra fica na primeira.
   */
  private paginate(): [number, number][] {
    const heights = this.entries.map((entry) => {
      const probe = this.entryText(entry, 0);
      const height = probe.height + ENTRY_GAP;
      probe.destroy();
      return height;
    });

    const pages: [number, number][] = [];
    let end = this.entries.length;
    let used = 0;
    for (let index = this.entries.length - 1; index >= 0; index--) {
      if (used + heights[index] > LIST_BOTTOM - LIST_TOP && index < end - 1) {
        pages.unshift([index + 1, end]);
        end = index + 1;
        used = 0;
      }
      used += heights[index];
    }
    pages.unshift([0, end]);
    return pages;
  }

  private show(): void {
    for (const text of this.entryTexts) text.destroy();
    this.entryTexts = [];

    const [first, end] = this.pages[this.page];
    let y = LIST_TOP;
    for (const entry of this.entries.slice(first, end)) {
      const text = this.addHud(this.entryText(entry, y));
      this.entryTexts.push(text);
      y += text.height + ENTRY_GAP;
    }
    if (this.entries.length === 0) {
      this.entryTexts.push(
        this.addHud(
          addBodyText(this.scene, GAME_WIDTH / 2, LIST_TOP + 40, "Nada anotado ainda.", {
            fontSize: "20px",
            fontStyle: "italic",
            color: TEXT_COLORS.inkDim,
          }).setOrigin(0.5, 0),
        ),
      );
    }

    const pages = this.pages.length > 1 ? `↑/↓: página ${this.page + 1} de ${this.pages.length}  ·  ` : "";
    this.footer.setText(`${pages}Esc: fechar`);
  }

  private onKey(event: KeyboardEvent): void {
    if (this.scene.time.now - this.openedAt < INPUT_GRACE_MS) return;
    if (event.code === "Escape" || event.code === "KeyJ" || event.code === "Enter" || event.code === "Space") {
      this.onClose();
      return;
    }
    const step = event.code === "ArrowUp" || event.code === "KeyW" ? -1 : event.code === "ArrowDown" || event.code === "KeyS" ? 1 : 0;
    const next = Math.max(0, Math.min(this.pages.length - 1, this.page + step));
    if (next === this.page) return;
    this.page = next;
    this.show();
  }
}
