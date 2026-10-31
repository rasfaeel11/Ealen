import * as Phaser from "phaser";
import { setVolume, sfx, volumes, type VolumeKind } from "./audio";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import { DEFAULT_KEYS, isReservedKey, keyName, rebound, setOption, settings, type KeyAction, type Settings } from "./settings";
import { addBodyText, addCloseButton, addHeading, addModalDim, addPanel, drawBar, type AddHud } from "./ui";

const WIDTH = 760;
const HEIGHT = 680;
const X = (GAME_WIDTH - WIDTH) / 2;
const Y = (GAME_HEIGHT - HEIGHT) / 2;
const TABS_Y = Y + 84;
const LIST_Y = Y + 126;
const ROW_HEIGHT = 36;
const VALUE_X = X + 470;
const VALUE_WIDTH = 190;
/** A tecla (ou o clique) que abriu o painel não é uma tecla dentro dele. */
const INPUT_GRACE_MS = 120;

interface Choice<T> {
  value: T;
  label: string;
}

/** Uma linha do painel. */
type Row =
  | { kind: "choice"; label: string; hint?: string; choices: Choice<unknown>[]; get: () => unknown; set: (value: unknown) => void }
  | { kind: "volume"; label: string; hint?: string; volume: VolumeKind }
  | { kind: "key"; label: string; hint?: string; action: KeyAction }
  | { kind: "button"; label: string; hint?: string; run: () => void }
  | { kind: "note"; label: string; hint?: string; value: string };

const ON_OFF: Choice<unknown>[] = [
  { value: true, label: "Sim" },
  { value: false, label: "Não" },
];

function option<K extends keyof Settings>(name: K, label: string, choices: Choice<Settings[K]>[], hint?: string): Row {
  return {
    kind: "choice",
    label,
    hint,
    choices: choices as Choice<unknown>[],
    get: () => settings()[name],
    set: (value) => setOption(name, value as Settings[K]),
  };
}

const KEY_ROWS: { action: KeyAction; label: string }[] = [
  { action: "up", label: "Andar pra cima" },
  { action: "down", label: "Andar pra baixo" },
  { action: "left", label: "Andar pra esquerda" },
  { action: "right", label: "Andar pra direita" },
  { action: "interact", label: "Falar, examinar" },
  { action: "ambush", label: "Emboscar, investir" },
  { action: "sneak", label: "Esgueirar" },
  { action: "rest", label: "Descansar" },
  { action: "sheet", label: "Ficha" },
  { action: "bag", label: "Mochila" },
  { action: "journal", label: "Diário" },
  { action: "map", label: "Mapa" },
];

const TABS: { name: string; rows: () => Row[] }[] = [
  {
    name: "Jogo",
    rows: () => [
      option(
        "difficulty",
        "Dificuldade",
        [
          { value: "facil", label: "Fácil" },
          { value: "normal", label: "Normal" },
          { value: "dificil", label: "Difícil" },
        ],
        "Quanta vida os inimigos têm. Vale a partir da próxima luta.",
      ),
      option(
        "animSpeed",
        "Velocidade da luta",
        [
          { value: 0.75, label: "Lenta" },
          { value: 1, label: "Normal" },
          { value: 1.5, label: "Rápida" },
          { value: 2, label: "Muito rápida" },
        ],
        "A velocidade das animações e da vez dos inimigos.",
      ),
      option(
        "companionsAuto",
        "Companheiros na luta",
        [
          { value: false, label: "Eu comando" },
          { value: true, label: "Por conta própria" },
        ],
        "Por conta própria, Jarupã e Xanduí jogam a vez deles sozinhos. Endyru é sempre seu.",
      ),
      option(
        "autoAdvance",
        "Conversa passa sozinha",
        [
          { value: 0, label: "Não" },
          { value: 70, label: "Devagar" },
          { value: 45, label: "Depressa" },
        ],
        "Escolha continua esperando o jogador.",
      ),
    ],
  },
  {
    name: "Tela",
    rows: () => [
      option(
        "actorSize",
        "Tamanho dos bonecos",
        [
          { value: 1, label: "Pequeno" },
          { value: 1.25, label: "Médio" },
          { value: 1.5, label: "Grande" },
          { value: 2, label: "Enorme" },
        ],
        "A regra não muda: cada um continua ocupando um quadrado.",
      ),
      option(
        "zoom",
        "Câmera",
        [
          { value: 3, label: "Normal" },
          { value: 4, label: "Perto" },
        ],
        "Perto, tudo fica maior, e cabe menos mapa na tela.",
      ),
      option(
        "textSize",
        "Tamanho da letra",
        [
          { value: 1, label: "Normal" },
          { value: 1.2, label: "Grande" },
          { value: 1.4, label: "Enorme" },
        ],
        "Na conversa, nos cartões e no registro da luta.",
      ),
      option("minimap", "Minimapa", ON_OFF as Choice<boolean>[]),
      option(
        "bar",
        "Barra de ações",
        [
          { value: "sempre", label: "Sempre" },
          { value: "parado", label: "Só parado" },
          { value: "nunca", label: "Nunca" },
        ],
        "Andando pelo mundo. Na luta ela fica sempre. As teclas funcionam de todo jeito.",
      ),
      option(
        "log",
        "Registro da luta",
        [
          { value: "curto", label: "Curto" },
          { value: "longo", label: "Longo" },
          { value: "nenhum", label: "Nenhum" },
        ],
      ),
      option("hpNumbers", "Números de vida", ON_OFF as Choice<boolean>[], "No cartão de cada um. O cartão de detalhe sempre os mostra."),
      option("shake", "Tremer a tela", ON_OFF as Choice<boolean>[], "No golpe forte e no estouro de mana."),
    ],
  },
  {
    name: "Som",
    rows: () => [
      { kind: "volume", label: "Geral", volume: "master" },
      { kind: "volume", label: "Música", volume: "music" },
      { kind: "volume", label: "Efeitos", volume: "sfx" },
      option("voice", "Voz nas conversas", ON_OFF as Choice<boolean>[], "Um som de gente quando alguém começa a falar."),
    ],
  },
  {
    name: "Teclas",
    rows: () => [
      ...KEY_ROWS.map(({ action, label }): Row => ({ kind: "key", label, action, hint: "Enter e aperte a tecla nova. Se ela já tem dono, as duas trocam." })),
      { kind: "button", label: "Voltar às teclas de fábrica", run: () => setOption("keys", DEFAULT_KEYS) },
    ],
  },
  {
    name: "Controle",
    rows: () => [
      option("gamepad", "Usar controle", ON_OFF as Choice<boolean>[], "Qualquer controle ligado ao computador."),
      { kind: "note", label: "Analógico ou direcional", value: "Andar, escolher" },
      { kind: "note", label: "A", value: "Falar, confirmar" },
      { kind: "note", label: "B", value: "Voltar" },
      { kind: "note", label: "X", value: "Emboscar" },
      { kind: "note", label: "Y", value: "Mochila" },
      { kind: "note", label: "LB e RB", value: "Trocar, esgueirar" },
      { kind: "note", label: "LT e RT", value: "Descansar, ficha" },
      { kind: "note", label: "Select e Start", value: "Mapa, pausa" },
      { kind: "note", label: "Na luta", value: "Analógico: cursor; A: clique", hint: "RB troca de ação, Y encerra o turno, B desiste." },
    ],
  },
];

/**
 * As opções do jogo, por cima do que estiver aberto: abas (`Tab` ou clique),
 * ↑/↓ escolhem a linha, ←/→ mudam o valor (ou clicar nas setas), Enter troca
 * uma tecla. O que se muda fica guardado na hora. Esc fecha.
 */
export class OptionsPanel {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private rowObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly tabLabels: Phaser.GameObjects.Text[] = [];
  private readonly hint: Phaser.GameObjects.Text;
  private tab = 0;
  private rows: Row[] = [];
  private index = 0;
  /** Esperando a tecla nova desta ação. */
  private capturing?: KeyAction;
  private readonly openedAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly addHud: AddHud,
    private readonly onClose: () => void,
  ) {
    this.objects.push(addHud(addModalDim(scene)), addHud(addPanel(scene, X, Y, WIDTH, HEIGHT)));
    const heading = addHeading(scene, GAME_WIDTH / 2, Y + 42, "OPÇÕES", WIDTH - 80, 28);
    this.objects.push(addHud(heading.rule), addHud(heading.label), addHud(addCloseButton(scene, X + WIDTH - 28, Y + 28, () => this.onClose())));

    const tabWidth = (WIDTH - 80) / TABS.length;
    TABS.forEach((tab, i) => {
      const label = addHud(addBodyText(scene, X + 40 + tabWidth * (i + 0.5), TABS_Y, tab.name, { fontSize: "19px" }).setOrigin(0.5));
      label.setInteractive({ useHandCursor: true });
      label.on(Phaser.Input.Events.POINTER_DOWN, () => this.showTab(i));
      this.tabLabels.push(label);
      this.objects.push(label);
    });
    this.hint = addHud(
      addBodyText(scene, GAME_WIDTH / 2, Y + HEIGHT - 58, "", {
        fontSize: "15px",
        align: "center",
        fontStyle: "italic",
        color: TEXT_COLORS.ink,
        wordWrap: { width: WIDTH - 80 },
      }).setOrigin(0.5),
    );
    this.objects.push(
      this.hint,
      addHud(
        addBodyText(scene, GAME_WIDTH / 2, Y + HEIGHT - 26, "Tab: aba  ·  ↑/↓: escolher  ·  ←/→: mudar  ·  Esc: fechar", {
          fontSize: "15px",
          color: TEXT_COLORS.inkDim,
        }).setOrigin(0.5),
      ),
    );

    this.openedAt = scene.time.now;
    this.showTab(0);
    scene.input.keyboard?.on("keydown", this.onKey, this);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    for (const object of [...this.rowObjects, ...this.objects]) object.destroy();
  }

  private showTab(tab: number): void {
    this.tab = tab;
    this.rows = TABS[tab].rows();
    this.index = 0;
    this.capturing = undefined;
    this.tabLabels.forEach((label, i) => label.setColor(i === tab ? TEXT_COLORS.goldBright : TEXT_COLORS.inkDim));
    this.draw();
  }

  private draw(): void {
    for (const object of this.rowObjects) object.destroy();
    this.rowObjects = [];
    const { scene, addHud } = this;
    const keep = <T extends Phaser.GameObjects.GameObject>(object: T): T => {
      addHud(object);
      this.rowObjects.push(object);
      return object;
    };

    this.rows.forEach((row, i) => {
      const y = LIST_Y + i * ROW_HEIGHT;
      const focused = i === this.index;
      const band = keep(scene.add.rectangle(X + 30, y - 3, WIDTH - 60, ROW_HEIGHT - 4, COLORS.gold, focused ? 0.14 : 0).setOrigin(0));
      band.setStrokeStyle(1, COLORS.gold, focused ? 0.5 : 0);
      if (row.kind !== "note") {
        band.setInteractive({ useHandCursor: true });
        band.on(Phaser.Input.Events.POINTER_OVER, () => this.focus(i));
        band.on(Phaser.Input.Events.POINTER_DOWN, () => {
          this.focus(i);
          if (row.kind === "key" || row.kind === "button") this.press();
        });
      }
      const color = row.kind === "note" ? TEXT_COLORS.inkDim : focused ? TEXT_COLORS.goldBright : TEXT_COLORS.ink;
      keep(addBodyText(scene, X + 44, y + 2, row.label, { fontSize: "18px", color }));
      this.drawValue(row, i, y, focused, keep);
    });
    this.showHint();
  }

  private drawValue(row: Row, i: number, y: number, focused: boolean, keep: <T extends Phaser.GameObjects.GameObject>(object: T) => T): void {
    const { scene } = this;
    const color = focused ? TEXT_COLORS.goldBright : TEXT_COLORS.ink;
    const center = VALUE_X + VALUE_WIDTH / 2;
    const arrows = () => {
      const arrow = (x: number, text: string, step: number) => {
        const button = keep(addBodyText(scene, x, y, text, { fontSize: "20px", color: TEXT_COLORS.gold }).setOrigin(0.5, 0));
        button.setInteractive({ useHandCursor: true });
        button.on(Phaser.Input.Events.POINTER_DOWN, () => {
          this.focus(i);
          this.change(step);
        });
      };
      arrow(VALUE_X - 14, "◂", -1);
      arrow(VALUE_X + VALUE_WIDTH + 14, "▸", 1);
    };
    switch (row.kind) {
      case "choice": {
        const now = row.choices.find((choice) => choice.value === row.get());
        keep(addBodyText(scene, center, y + 2, now?.label ?? "", { fontSize: "17px", color }).setOrigin(0.5, 0));
        arrows();
        break;
      }
      case "volume": {
        const level = volumes()[row.volume];
        const bar = keep(scene.add.graphics());
        drawBar(bar, VALUE_X, y + 8, VALUE_WIDTH, 12, level, focused ? COLORS.goldBright : COLORS.gold);
        arrows();
        break;
      }
      case "key": {
        const text = this.capturing === row.action ? "aperte a tecla…" : keyName(settings().keys[row.action].code);
        keep(addBodyText(scene, center, y + 2, text, { fontSize: "17px", color }).setOrigin(0.5, 0));
        break;
      }
      case "note":
        keep(addBodyText(scene, center + 30, y + 3, row.value, { fontSize: "16px", color: TEXT_COLORS.ink }).setOrigin(0.5, 0));
        break;
      case "button":
        break;
    }
  }

  private showHint(): void {
    this.hint.setText(this.rows[this.index]?.hint ?? "");
  }

  private focus(index: number): void {
    if (index === this.index) return;
    this.index = index;
    this.draw();
  }

  private step(by: number): void {
    const count = this.rows.length;
    this.index = (this.index + by + count) % count;
    sfx("uiMove");
    this.draw();
  }

  private change(step: number): void {
    const row = this.rows[this.index];
    if (row.kind === "choice") {
      const count = row.choices.length;
      const now = row.choices.findIndex((choice) => choice.value === row.get());
      row.set(row.choices[(Math.max(0, now) + step + count) % count].value);
      sfx("uiSelect");
    } else if (row.kind === "volume") {
      const now = Math.round(volumes()[row.volume] * 10);
      const next = Math.max(0, Math.min(10, now + step));
      if (next !== now) setVolume(row.volume, next / 10);
      // O efeito de exemplo sai já no volume novo: é ouvindo que se acerta.
      sfx(row.volume === "music" ? "uiMove" : "uiSelect");
    } else {
      return;
    }
    this.draw();
  }

  /** Enter (ou clique) numa linha que faz alguma coisa. */
  private press(): void {
    const row = this.rows[this.index];
    if (row.kind === "key") {
      this.capturing = row.action;
      sfx("uiSelect");
      this.draw();
    } else if (row.kind === "button") {
      row.run();
      sfx("uiSelect");
      this.draw();
    } else if (row.kind === "choice") {
      this.change(1);
    }
  }

  private capture(event: KeyboardEvent, action: KeyAction): void {
    this.capturing = undefined;
    if (event.code === "Escape") {
      sfx("uiCancel");
    } else if (isReservedKey(event.code)) {
      sfx("deny");
    } else {
      setOption("keys", rebound(settings().keys, action, { code: event.code, keyCode: event.keyCode }));
      sfx("uiSelect");
    }
    this.draw();
  }

  private onKey(event: KeyboardEvent): void {
    if (this.scene.time.now - this.openedAt < INPUT_GRACE_MS) return;
    if (this.capturing) {
      this.capture(event, this.capturing);
      return;
    }
    switch (event.code) {
      case "Escape":
      case "Backspace":
        sfx("uiCancel");
        this.onClose();
        return;
      case "Tab":
        event.preventDefault();
        sfx("uiMove");
        this.showTab((this.tab + 1) % TABS.length);
        return;
      case "Enter":
      case "NumpadEnter":
      case "Space":
        this.press();
        return;
      case "ArrowUp":
      case "KeyW":
        this.step(-1);
        return;
      case "ArrowDown":
      case "KeyS":
        this.step(1);
        return;
      case "ArrowLeft":
      case "KeyA":
        this.change(-1);
        return;
      case "ArrowRight":
      case "KeyD":
        this.change(1);
        return;
    }
  }
}
