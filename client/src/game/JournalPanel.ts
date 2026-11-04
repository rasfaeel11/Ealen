import * as Phaser from "phaser";
import type { JournalEntry, Quest, QuestState } from "@jogo/shared";
import { GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import { isAction } from "./settings";
import { addBodyText, addCloseButton, addHeading, addModalDim, addPanel, type AddHud } from "./ui";

const WIDTH = 820;
const HEIGHT = 560;
const X = (GAME_WIDTH - WIDTH) / 2;
const Y = (GAME_HEIGHT - HEIGHT) / 2;
const PADDING = 36;
const TABS_Y = Y + 92;
const LIST_TOP = Y + 126;
const LIST_BOTTOM = Y + HEIGHT - 60;
const ENTRY_GAP = 14;
/** A tecla que abriu o diário não pode ser a mesma que o fecha. */
const INPUT_GRACE_MS = 200;

/** Uma linha da página: o que se escreve e a cor. */
interface Line {
  text: string;
  color: string;
}

/** A marca de cada estado de missão, antes do título. */
const QUEST_MARK: Record<QuestState, string> = { open: "◇", done: "◆", failed: "✕" };
const QUEST_WORD: Record<QuestState, string> = { open: "", done: "  ·  cumprida", failed: "  ·  falhada" };

/** As missões em linhas: as abertas primeiro, na ordem em que abriram; depois as fechadas, a mais recente em cima. */
function questLines(quests: readonly Quest[]): Line[] {
  const open = quests.filter((quest) => quest.state === "open");
  const closed = quests.filter((quest) => quest.state !== "open").reverse();
  return [...open, ...closed].map((quest) => ({
    text: `${QUEST_MARK[quest.state]}  ${quest.title}${QUEST_WORD[quest.state]}\n${quest.text}`,
    color: quest.state === "open" ? TEXT_COLORS.ink : TEXT_COLORS.inkDim,
  }));
}

/** As anotações em linhas, na ordem em que foram feitas. */
function journalLines(entries: readonly JournalEntry[]): Line[] {
  return entries.map((entry) => ({ text: `—  ${entry.text}`, color: TEXT_COLORS.ink }));
}

/** As duas abas: o diário de pistas e o registro de missões. A página abre onde fica o mais novo de cada uma. */
const TABS: { name: string; empty: string; lines: (panel: JournalPanel) => Line[]; openAt: "first" | "last" }[] = [
  { name: "Diário", empty: "Nada anotado ainda.", lines: (panel) => journalLines(panel.entries), openAt: "last" },
  { name: "Missões", empty: "Nada pra fazer ainda.", lines: (panel) => questLines(panel.quests), openAt: "first" },
];

/**
 * O diário, aberto por cima do mundo, em duas abas: as anotações (pistas, na
 * ordem em que foram feitas, abrindo na mais recente) e as missões (as abertas
 * em cima, depois as cumpridas e as falhadas). Só lê: quem escreve é a
 * história (ver shared/story/memory.ts).
 *
 * Tab (ou clique) troca de aba; ↑/↓ (ou W/S) trocam de página; Esc, J ou Enter fecham.
 */
export class JournalPanel {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private entryTexts: Phaser.GameObjects.Text[] = [];
  private readonly tabLabels: Phaser.GameObjects.Text[] = [];
  private readonly footer: Phaser.GameObjects.Text;
  private tab = 0;
  private lines: Line[] = [];
  /** Cada página é uma faixa de `lines`: [primeira, depois da última). */
  private pages: [number, number][] = [];
  private page = 0;
  private readonly openedAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addHud: AddHud,
    readonly entries: readonly JournalEntry[],
    readonly quests: readonly Quest[],
    private readonly onClose: () => void,
  ) {
    this.objects.push(addHud(addModalDim(scene)), addHud(addPanel(scene, X, Y, WIDTH, HEIGHT)));
    const heading = addHeading(scene, GAME_WIDTH / 2, Y + 46, "DIÁRIO", WIDTH - 120, 28);
    this.objects.push(
      addHud(heading.rule),
      addHud(heading.label),
      addHud(addCloseButton(scene, X + WIDTH - 28, Y + 28, () => this.onClose())),
    );
    const tabWidth = 180;
    TABS.forEach((tab, i) => {
      const label = addHud(addBodyText(scene, GAME_WIDTH / 2 + (i - (TABS.length - 1) / 2) * tabWidth, TABS_Y, tab.name, { fontSize: "19px" }).setOrigin(0.5));
      label.setInteractive({ useHandCursor: true });
      label.on(Phaser.Input.Events.POINTER_DOWN, () => this.showTab(i));
      this.tabLabels.push(label);
      this.objects.push(label);
    });
    this.footer = addHud(
      addBodyText(scene, GAME_WIDTH / 2, Y + HEIGHT - 36, "", { fontSize: "16px", color: TEXT_COLORS.inkDim }).setOrigin(0.5),
    );
    this.objects.push(this.footer);

    this.openedAt = scene.time.now;
    this.showTab(0);
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    for (const object of [...this.objects, ...this.entryTexts]) object.destroy();
    this.entryTexts = [];
  }

  private lineText(line: Line, y: number): Phaser.GameObjects.Text {
    return addBodyText(this.scene, X + PADDING, y, line.text, {
      fontSize: "20px",
      lineSpacing: 4,
      color: line.color,
      wordWrap: { width: WIDTH - PADDING * 2 },
    });
  }

  private showTab(tab: number): void {
    this.tab = tab;
    this.lines = TABS[tab].lines(this);
    this.pages = this.paginate();
    this.page = TABS[tab].openAt === "last" ? this.pages.length - 1 : 0;
    this.tabLabels.forEach((label, i) => label.setColor(i === tab ? TEXT_COLORS.goldBright : TEXT_COLORS.inkDim));
    this.show();
  }

  /**
   * Reparte as linhas em páginas pelo tamanho que cada uma ocupa escrita.
   * Enche de trás pra frente: a última página vem cheia, e o que sobra fica na
   * primeira (no diário, a que se abre é a última, das mais recentes).
   */
  private paginate(): [number, number][] {
    const heights = this.lines.map((line) => {
      const probe = this.lineText(line, 0);
      const height = probe.height + ENTRY_GAP;
      probe.destroy();
      return height;
    });

    const pages: [number, number][] = [];
    let end = this.lines.length;
    let used = 0;
    for (let index = this.lines.length - 1; index >= 0; index--) {
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
    for (const line of this.lines.slice(first, end)) {
      const text = this.addHud(this.lineText(line, y));
      this.entryTexts.push(text);
      y += text.height + ENTRY_GAP;
    }
    if (this.lines.length === 0) {
      this.entryTexts.push(
        this.addHud(
          addBodyText(this.scene, GAME_WIDTH / 2, LIST_TOP + 40, TABS[this.tab].empty, {
            fontSize: "20px",
            fontStyle: "italic",
            color: TEXT_COLORS.inkDim,
          }).setOrigin(0.5, 0),
        ),
      );
    }

    const pages = this.pages.length > 1 ? `↑/↓: página ${this.page + 1} de ${this.pages.length}  ·  ` : "";
    this.footer.setText(`Tab: ${TABS[(this.tab + 1) % TABS.length].name.toLowerCase()}  ·  ${pages}Esc: fechar`);
  }

  private onKey(event: KeyboardEvent): void {
    if (this.scene.time.now - this.openedAt < INPUT_GRACE_MS) return;
    if (event.code === "Escape" || isAction(event, "journal") || event.code === "Enter" || event.code === "Space") {
      this.onClose();
      return;
    }
    if (event.code === "Tab") {
      event.preventDefault();
      this.showTab((this.tab + 1) % TABS.length);
      return;
    }
    const step = event.code === "ArrowUp" || event.code === "KeyW" ? -1 : event.code === "ArrowDown" || event.code === "KeyS" ? 1 : 0;
    const next = Math.max(0, Math.min(this.pages.length - 1, this.page + step));
    if (next === this.page) return;
    this.page = next;
    this.show();
  }
}

