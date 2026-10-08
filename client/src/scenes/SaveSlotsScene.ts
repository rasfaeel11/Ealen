import * as Phaser from "phaser";
import { summarizeSave, type GameSave } from "@ealen/shared";
import { GAME_HEIGHT, GAME_WIDTH, REGISTRY_NEW_GAME_SLOT, REGISTRY_SESSION, SCENES, TEXT_COLORS } from "../game/config";
import { deleteSlot, exportSlot, pickSaveFile, readSlots, writeSlot, type SlotState } from "../game/save";
import { GameSession } from "../game/session";
import { Menu, addBodyText, addTitleText, type MenuOption } from "../game/ui";

export interface SaveSlotsData {
  /** Um aviso no alto da tela, pra quem chega aqui sem ter pedido (ex: jogo novo sem espaço livre). */
  notice?: string;
}

const MENU_X = 170;
const MENU_Y = 250;
const DEFAULT_NOTICE = "Cada espaço guarda um jogo inteiro. O jogo grava sozinho no espaço em que se joga.";

const PROBLEM_TEXT = {
  invalid: "Esse arquivo não é um save do Eälen, ou está estragado.",
  newer: "Esse save é de uma versão mais nova do jogo.",
} as const;

/**
 * Os espaços de save: continuar, começar, apagar, e levar um jogo pra fora
 * (ou trazer de volta) como arquivo. Um menu só, que troca de opções:
 * a lista de espaços, o que fazer com o escolhido, e a confirmação do que
 * não tem volta.
 */
export default class SaveSlotsScene extends Phaser.Scene {
  private slots: SlotState[] = [];
  private menu!: Menu;
  private heading!: Phaser.GameObjects.Text;
  private notice!: Phaser.GameObjects.Text;
  /** O que Esc faz agora: depende de em que parte do menu se está. */
  private back: () => void = () => undefined;

  constructor() {
    super(SCENES.saves);
  }

  create(data: SaveSlotsData): void {
    const centerX = GAME_WIDTH / 2;
    addTitleText(this, centerX, 100, "JOGOS SALVOS", { fontSize: "48px" }).setOrigin(0.5);
    this.notice = addBodyText(this, centerX, 160, "", { fontSize: "18px", color: TEXT_COLORS.inkDim }).setOrigin(0.5);
    this.heading = addBodyText(this, MENU_X, MENU_Y - 50, "", { fontSize: "22px", color: TEXT_COLORS.gold });
    addBodyText(this, centerX, GAME_HEIGHT - 40, "Setas e Enter, ou o mouse. Esc volta.", {
      fontSize: "16px",
      color: TEXT_COLORS.inkDim,
    }).setOrigin(0.5);

    this.menu = new Menu(this, MENU_X, MENU_Y, [], { lineHeight: 46, fontSize: 22, onCancel: () => this.back() });
    this.showSlots(data?.notice ?? DEFAULT_NOTICE);
  }

  // ------------------------------------------------------------------- telas

  private showSlots(notice?: string): void {
    this.slots = readSlots();
    if (notice !== undefined) this.notice.setText(notice);
    this.heading.setText("");
    this.back = () => this.scene.start(SCENES.title);
    this.setOptions([
      ...this.slots.map((state, slot) => ({
        label: `${slot + 1} · ${describe(state)}`,
        onSelect: () => this.showActions(slot),
      })),
      { label: "Voltar", onSelect: this.back },
    ]);
  }

  private showActions(slot: number): void {
    const state = this.slots[slot];
    this.heading.setText(`${slot + 1} · ${describe(state)}`);
    this.back = () => this.showSlots();

    const startNew = () => {
      this.registry.set(REGISTRY_NEW_GAME_SLOT, slot);
      this.scene.start(SCENES.prologue);
    };
    const erase: MenuOption = {
      label: "Apagar",
      onSelect: () =>
        this.confirm(slot, "Apagar este jogo? Não tem volta.", () => {
          deleteSlot(slot);
          this.showSlots("Jogo apagado.");
        }),
    };
    const exportFile: MenuOption = {
      label: "Exportar pra arquivo",
      onSelect: () => {
        exportSlot(slot, fileName(state));
        this.notice.setText("Arquivo do save baixado.");
      },
    };
    const importFile: MenuOption = { label: "Importar de arquivo", onSelect: () => void this.importInto(slot) };
    const goBack: MenuOption = { label: "Voltar", onSelect: this.back };

    if (state.status === "empty") {
      this.setOptions([{ label: "Novo jogo", onSelect: startNew }, importFile, goBack]);
      return;
    }
    if (state.status === "unreadable") {
      // Não dá pra jogar, mas o arquivo ainda pode servir numa versão mais nova: deixa levar antes de apagar.
      this.setOptions([exportFile, erase, goBack]);
      return;
    }

    const { save } = state;
    this.setOptions([
      {
        label: "Continuar",
        onSelect: () => {
          this.registry.set(REGISTRY_SESSION, new GameSession(slot, save));
          this.scene.start(SCENES.world);
        },
      },
      exportFile,
      {
        label: "Novo jogo neste espaço",
        onSelect: () => this.confirm(slot, `Recomeçar por cima de ${save.character.name}? O jogo atual se perde.`, startNew),
      },
      erase,
      goBack,
    ]);
  }

  /** Pergunta antes do que não tem volta. O cursor começa no "Não". */
  private confirm(slot: number, question: string, onYes: () => void): void {
    this.heading.setText(question);
    this.back = () => this.showActions(slot);
    this.setOptions([
      { label: "Não", onSelect: this.back },
      { label: "Sim", onSelect: onYes },
    ]);
  }

  private async importInto(slot: number): Promise<void> {
    const result = await pickSaveFile();
    // A cena pode ter fechado enquanto o seletor de arquivo estava aberto.
    if (!this.scene.isActive()) return;
    if (!result.ok) {
      if (result.problem !== "cancelled") this.notice.setText(PROBLEM_TEXT[result.problem]);
      return;
    }
    const written = writeSlot(slot, result.save);
    this.showSlots(written ? `${result.save.character.name} foi importado.` : "Não foi possível gravar neste dispositivo.");
  }

  /**
   * Troca as opções do menu no quadro seguinte: a opção que acabou de ser
   * clicada ainda está no meio do próprio evento, e é destruída na troca.
   */
  private setOptions(options: MenuOption[]): void {
    this.time.delayedCall(0, () => this.menu.setOptions(options));
  }
}

function describe(state: SlotState): string {
  if (state.status === "empty") return "vazio";
  if (state.status === "unreadable") {
    return state.problem === "newer" ? "save de uma versão mais nova do jogo" : "save ilegível";
  }
  const { name, className, level, areaName, playTime } = summarizeSave(state.save);
  return `${name} — ${className}, nível ${level}  ·  ${areaName}  ·  ${playTime}${savedWhen(state.save)}`;
}

function savedWhen(save: GameSave): string {
  if (save.savedAt === 0) return "";
  const when = new Date(save.savedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  return `  ·  ${when}`;
}

function fileName(state: SlotState): string {
  if (state.status !== "ok") return "ealen-save.json";
  const { name, level } = state.save.character;
  // Só o que qualquer sistema de arquivos aceita num nome.
  const safe = name.normalize("NFD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return `ealen-${safe || "save"}-nivel-${level}.json`;
}
