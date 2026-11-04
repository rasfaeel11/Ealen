import * as Phaser from "phaser";
import { sfx } from "./audio";
import { COLORS, FONT_BODY, FONT_TITLE, GAME_HEIGHT, GAME_WIDTH, TEXT_COLORS } from "./config";
import { codeOfName, textPx } from "./settings";
import { portraitKey } from "./dialogue/portraits";
import { iconKey, type IconName } from "./icons";

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

/** Põe um objeto na cena de modo que só a câmera da interface o desenhe. */
export type AddHud = <T extends Phaser.GameObjects.GameObject>(object: T) => T;

/** Texto de corpo (Spectral). `resolution: 2` mantém a letra nítida quando o canvas é ampliado. */
export function addBodyText(scene: Phaser.Scene, x: number, y: number, text: string, style: TextStyle = {}): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: FONT_BODY,
    fontSize: "20px",
    color: TEXT_COLORS.ink,
    resolution: 2,
    ...style,
  });
}

/**
 * O rodapé de teclas ("Enter: usar  ·  Esc: voltar") em que cada pedaço é
 * clicável: o clique aperta a tecla que ele mostra, então quem lê o teclado
 * (o painel, o menu, a grade) responde ao mouse sem saber dele. O que não é
 * uma tecla só ("Setas: ...") fica só escrito. Troca-se o texto com setText.
 */
export class KeyHints {
  readonly root: Phaser.GameObjects.Container;
  private parts: Phaser.GameObjects.Text[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly style: { fontSize?: string; color?: string; originX?: number } = {},
  ) {
    this.root = scene.add.container(x, y);
  }

  setText(text: string): this {
    for (const part of this.parts) part.destroy();
    this.parts = [];
    const pieces = text.split("  ·  ").filter(Boolean);
    let x = 0;
    pieces.forEach((piece, index) => {
      const label = index < pieces.length - 1 ? `${piece}  ·  ` : piece;
      const part = addBodyText(this.scene, x, 0, label, { fontSize: this.style.fontSize ?? "14px", color: this.style.color ?? TEXT_COLORS.inkDim }).setOrigin(0, 0.5);
      const code = codeOfName(piece.split(":")[0].trim().split(" ")[0]);
      if (code && piece.includes(":")) {
        part.setInteractive({ useHandCursor: true });
        part.on(Phaser.Input.Events.POINTER_OVER, () => part.setColor(TEXT_COLORS.goldBright));
        part.on(Phaser.Input.Events.POINTER_OUT, () => part.setColor(this.style.color ?? TEXT_COLORS.inkDim));
        part.on(Phaser.Input.Events.POINTER_DOWN, () => pressKey(code));
      }
      this.root.add(part);
      this.parts.push(part);
      x += part.width;
    });
    const shift = -x * (this.style.originX ?? 0);
    for (const part of this.parts) part.x += shift;
    return this;
  }

  setVisible(visible: boolean): this {
    this.root.setVisible(visible);
    return this;
  }

  destroy(): void {
    this.root.destroy();
  }
}

/** Aperta e solta a tecla `code`, como se fosse o teclado: todo mundo que lê teclado recebe. */
export function pressKey(code: string): void {
  const fixed: Record<string, [string, number]> = { Escape: ["Escape", 27], Enter: ["Enter", 13], Tab: ["Tab", 9], Space: [" ", 32], Backspace: ["Backspace", 8] };
  const plain = code.replace(/^(Key|Digit)/, "");
  const [key, keyCode] = fixed[code] ?? [plain.toLowerCase(), plain.length === 1 ? plain.charCodeAt(0) : 0];
  for (const type of ["keydown", "keyup"] as const) {
    window.dispatchEvent(new KeyboardEvent(type, { code, key, keyCode, which: keyCode, bubbles: true } as KeyboardEventInit));
  }
}

/** Texto de título (Cinzel, dourado). */
export function addTitleText(scene: Phaser.Scene, x: number, y: number, text: string, style: TextStyle = {}): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: FONT_TITLE,
    fontStyle: "bold",
    fontSize: "28px",
    color: TEXT_COLORS.gold,
    resolution: 2,
    ...style,
  });
}

// ---------------------------------------------------------------- molduras

/** Os oito pontos de um retângulo de cantos cortados. */
function chamfered(x: number, y: number, width: number, height: number, cut: number): Phaser.Types.Math.Vector2Like[] {
  return [
    { x: x + cut, y },
    { x: x + width - cut, y },
    { x: x + width, y: y + cut },
    { x: x + width, y: y + height - cut },
    { x: x + width - cut, y: y + height },
    { x: x + cut, y: y + height },
    { x, y: y + height - cut },
    { x, y: y + cut },
  ];
}

/** Um losango cheio: o enfeite dos cantos e dos títulos. */
export function drawDiamond(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, color: number = COLORS.goldBright): void {
  g.fillStyle(color, 1);
  g.fillPoints(
    [
      { x, y: y - radius },
      { x: x + radius, y },
      { x, y: y + radius },
      { x: x - radius, y },
    ],
    true,
  );
}

/** Desenha a moldura em `g`, no lugar do que houvesse nele: é como um painel muda de tamanho sem sair da ordem de desenho. */
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, dim = false): Phaser.GameObjects.Graphics {
  g.clear();
  const cut = Math.min(14, width / 6, height / 6);
  g.fillStyle(COLORS.panelDeep, dim ? 0.92 : 0.98);
  g.fillPoints(chamfered(x, y, width, height, cut), true);
  // A luz vem de cima: o alto do painel é um pouco mais claro.
  const sheen = Math.min(height * 0.4, 120);
  g.fillGradientStyle(COLORS.panelTop, COLORS.panelTop, COLORS.panelDeep, COLORS.panelDeep, dim ? 0.6 : 0.9);
  g.fillRect(x + cut / 2, y + 2, width - cut, sheen);
  g.lineStyle(2, dim ? COLORS.bronze : COLORS.gold, 1);
  g.strokePoints(chamfered(x, y, width, height, cut), true, true);
  g.lineStyle(1, COLORS.bronze, dim ? 0.3 : 0.55);
  g.strokePoints(chamfered(x + 5, y + 5, width - 10, height - 10, Math.max(2, cut - 2)), true, true);
  if (!dim) {
    for (const [cx, cy] of [
      [x + width / 2, y],
      [x + width / 2, y + height],
    ]) {
      drawDiamond(g, cx, cy, 5);
    }
  }
  return g;
}

/** Moldura do códice: painel escuro de cantos cortados, com borda dourada dupla. */
export function addPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number, dim = false): Phaser.GameObjects.Graphics {
  return drawPanel(scene.add.graphics(), x, y, width, height, dim);
}

/** O escuro que cobre o mundo atrás de um painel. Pega o clique: o que está embaixo não responde. */
export function addModalDim(scene: Phaser.Scene, alpha = 0.72): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, alpha).setOrigin(0).setInteractive();
}

/** Um título de painel: o nome entre dois fios dourados com losango. Devolve os objetos, e o texto pra quem precisa trocá-lo. */
export function addHeading(scene: Phaser.Scene, x: number, y: number, text: string, width: number, size = 26): { rule: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; setText: (next: string) => void } {
  const label = addTitleText(scene, x, y, "", { fontSize: `${size}px` }).setOrigin(0.5);
  const rule = scene.add.graphics();
  const setText = (next: string) => {
    label.setText(next);
    rule.clear();
    const gap = label.width / 2 + 16;
    const end = width / 2;
    if (end <= gap) return;
    rule.lineStyle(1, COLORS.gold, 0.7);
    rule.lineBetween(x - end, y, x - gap, y);
    rule.lineBetween(x + gap, y, x + end, y);
    drawDiamond(rule, x - gap, y, 3.5);
    drawDiamond(rule, x + gap, y, 3.5);
  };
  setText(text);
  return { rule, label, setText };
}

/** Uma barra de recurso: fundo, cheio e borda fina. */
export function drawBar(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, ratio: number, color: number): void {
  g.fillStyle(0x070605, 0.95);
  g.fillRect(x, y, width, height);
  const filled = Math.round(width * Math.max(0, Math.min(1, ratio)));
  if (filled > 0) {
    g.fillStyle(color, 1);
    g.fillRect(x, y, filled, height);
    // O brilho de cima dá volume à barra.
    if (height >= 6) {
      g.fillStyle(0xffffff, 0.16);
      g.fillRect(x, y, filled, Math.floor(height / 3));
    }
  }
  g.lineStyle(1, COLORS.bronze, 0.9);
  g.strokeRect(x - 0.5, y - 0.5, width + 1, height + 1);
}

/** A cor da vida: vai do verde ao vermelho conforme ela acaba. */
export function hpColor(ratio: number): number {
  return ratio > 0.5 ? COLORS.hp : ratio > 0.25 ? COLORS.hpMid : COLORS.hpLow;
}

// ----------------------------------------------------------------- retratos

/** Onde o rosto está em cada retrato, quando foge do padrão (ver FACE). Frações da largura e da altura da imagem. */
const FACE: { cx: number; top: number; width: number } = { cx: 0.53, top: 0.03, width: 0.62 };
const FACE_OF: Record<string, Partial<typeof FACE>> = {
  Xanduí: { cx: 0.56, top: 0, width: 0.54 },
  Jarupã: { cx: 0.56, top: 0.03, width: 0.56 },
  Endyru: { cx: 0.5, top: 0.02, width: 0.66 },
};

/** O que mostra alguém na interface: o retrato, se há; senão o quadro parado da folha do mapa. */
export interface FaceRef {
  key: string;
  frame?: number;
}

/** O retrato de `name`, se a arte (ou o provisório) existe. */
export function portraitRef(scene: Phaser.Scene, name: string): FaceRef | undefined {
  const key = portraitKey(name);
  return scene.textures.exists(key) ? { key } : undefined;
}

/**
 * Enquadra `image` em (x, y, width, height), recortando o que sobra: do retrato,
 * o rosto; da folha do mapa, o miolo do quadro. `image` é sempre uma imagem de
 * origem no canto. O recorte é na própria textura, por isso não precisa de máscara.
 */
export function fitFace(image: Phaser.GameObjects.Image, ref: FaceRef, x: number, y: number, width: number, height: number, name?: string): void {
  image.setTexture(ref.key, ref.frame).setOrigin(0);
  const fw = image.frame.realWidth;
  const fh = image.frame.realHeight;
  const aspect = width / height;
  let box: { x: number; y: number; w: number; h: number };
  if (ref.frame === undefined && ref.key.startsWith("portrait:")) {
    const face = { ...FACE, ...(name ? FACE_OF[name] : undefined) };
    const w = Math.min(fw, fw * face.width);
    const h = Math.min(fh, w / aspect);
    box = { x: Math.max(0, Math.min(fw - w, fw * face.cx - w / 2)), y: Math.min(fh - h, fh * face.top), w, h };
  } else {
    const w = Math.min(fw, fh * aspect);
    const h = w / aspect;
    box = { x: (fw - w) / 2, y: Math.max(0, fh - h - fh * 0.04), w, h };
  }
  const scale = width / box.w;
  image.setCrop(box.x, box.y, box.w, box.h).setScale(scale).setPosition(x - box.x * scale, y - box.y * scale);
}

// ------------------------------------------------------------------ tooltip

export interface TipContent {
  title: string;
  /** A linha logo abaixo do título: custo, tipo, nível. */
  meta?: string;
  body?: string;
  /** Em vermelho, por último: por que não dá. */
  warn?: string;
}

const TIP_WIDTH = 320;
const TIP_PAD = 14;

/**
 * O cartão que aparece ao parar o mouse em algo: título, linha de custo,
 * texto e, em vermelho, o que impede. Fica acima de `bottom`, centrado em `x`,
 * sem sair da tela.
 */
export class Tooltip {
  readonly root: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly meta: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly warn: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const wrap = { wordWrap: { width: TIP_WIDTH - TIP_PAD * 2 } };
    this.frame = scene.add.graphics();
    this.title = addTitleText(scene, TIP_PAD, TIP_PAD, "", { fontSize: textPx(18), color: TEXT_COLORS.goldBright, ...wrap });
    this.meta = addBodyText(scene, TIP_PAD, 0, "", { fontSize: textPx(14), color: TEXT_COLORS.gold, ...wrap });
    this.body = addBodyText(scene, TIP_PAD, 0, "", { fontSize: textPx(15), lineSpacing: 3, ...wrap });
    this.warn = addBodyText(scene, TIP_PAD, 0, "", { fontSize: textPx(15), color: TEXT_COLORS.danger, ...wrap });
    this.root = scene.add.container(0, 0, [this.frame, this.title, this.meta, this.body, this.warn]).setVisible(false);
  }

  /** O mesmo cartão, mas descendo de `top`: pra quem está no alto da tela. */
  showBelow(x: number, top: number, content: TipContent): void {
    this.show(x, top + this.measure(content), content);
  }

  /** Escreve o conteúdo e devolve a altura que o cartão toma. */
  private measure(content: TipContent): number {
    this.title.setText(content.title);
    let y = TIP_PAD + this.title.height + 2;
    for (const [text, value] of [
      [this.meta, content.meta],
      [this.body, content.body],
      [this.warn, content.warn],
    ] as const) {
      text.setText(value ?? "").setVisible(Boolean(value));
      if (!value) continue;
      text.setY(y);
      y += text.height + 6;
    }
    return y + TIP_PAD - 6;
  }

  show(x: number, bottom: number, content: TipContent): void {
    const height = this.measure(content);
    drawPanel(this.frame, 0, 0, TIP_WIDTH, height);
    this.root.setPosition(
      Math.max(8, Math.min(GAME_WIDTH - TIP_WIDTH - 8, x - TIP_WIDTH / 2)),
      Math.max(8, bottom - height),
    );
    this.root.setVisible(true);
  }

  hide(): void {
    this.root.setVisible(false);
  }

  destroy(): void {
    this.root.destroy();
  }
}

// -------------------------------------------------------------------- slots

/** O que um quadrado da grade mostra. */
export interface SlotView {
  icon?: IconName;
  /** A tecla, no canto de cima. */
  hotkey?: string;
  /** A quantidade, no canto de baixo. */
  count?: number;
  /** O número grande por cima do ícone apagado: em quantos turnos volta. */
  wait?: number;
  /** O que custa: a marca no canto (verde a ação, laranja o bônus). */
  cost?: "action" | "bonus" | "free";
  enabled?: boolean;
  selected?: boolean;
}

/**
 * Um quadrado de grade: fundo fundo, ícone, tecla e quantidade. Vazio, é só o
 * encaixe. Quem o usa dá os três retornos do mouse e chama `set` com o que mostrar.
 */
export class UiSlot {
  readonly root: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly key: Phaser.GameObjects.Text;
  private readonly count: Phaser.GameObjects.Text;
  private readonly wait: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Zone;
  private view: SlotView = {};
  private hovered = false;
  private focused = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly size: number,
    handlers: { over?: () => void; out?: () => void; down?: () => void } = {},
  ) {
    this.frame = scene.add.graphics();
    this.icon = scene.add.image(size / 2, size / 2, "__DEFAULT").setDisplaySize(size - 12, size - 12).setVisible(false);
    const small = Math.max(11, Math.round(size / 4));
    this.key = addBodyText(scene, 4, 1, "", { fontSize: `${small}px`, color: TEXT_COLORS.inkDim }).setShadow(0, 1, "#000000", 2);
    this.count = addBodyText(scene, size - 4, size - 2, "", { fontSize: `${small + 1}px`, color: TEXT_COLORS.white })
      .setOrigin(1, 1)
      .setShadow(0, 1, "#000000", 3);
    this.wait = addTitleText(scene, size / 2, size / 2, "", { fontSize: `${Math.round(size / 2)}px`, color: TEXT_COLORS.white }).setOrigin(0.5);
    this.zone = scene.add.zone(0, 0, size, size).setOrigin(0).setInteractive({ useHandCursor: true });
    this.zone.on(Phaser.Input.Events.POINTER_OVER, () => {
      this.hovered = true;
      this.draw();
      handlers.over?.();
    });
    this.zone.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.hovered = false;
      this.draw();
      handlers.out?.();
    });
    this.zone.on(Phaser.Input.Events.POINTER_DOWN, () => handlers.down?.());
    this.root = scene.add.container(x, y, [this.frame, this.icon, this.key, this.count, this.wait, this.zone]);
    this.draw();
  }

  set(view: SlotView): void {
    this.view = view;
    this.draw();
  }

  /** O cursor do teclado está aqui: desenha como se o mouse estivesse em cima. */
  setFocused(focused: boolean): void {
    this.focused = focused;
    this.draw();
  }

  private draw(): void {
    const { size, view } = this;
    const enabled = view.enabled !== false;
    const lit = view.selected || this.focused;
    const g = this.frame;
    g.clear();
    g.fillStyle(0x0a0807, 0.95);
    g.fillRect(0, 0, size, size);
    g.fillGradientStyle(COLORS.panelTop, COLORS.panelTop, 0x0a0807, 0x0a0807, 0.8);
    g.fillRect(1, 1, size - 2, size / 2);
    if (lit && view.icon) {
      g.fillStyle(COLORS.goldBright, 0.14);
      g.fillRect(1, 1, size - 2, size - 2);
    }
    const hot = lit || (this.hovered && view.icon !== undefined);
    g.lineStyle(hot ? 2 : 1, hot ? COLORS.goldBright : COLORS.bronze, hot ? 1 : 0.8);
    g.strokeRect(0.5, 0.5, size - 1, size - 1);
    if (view.icon && view.cost === "action") {
      g.fillStyle(COLORS.action, enabled ? 1 : 0.4);
      g.fillCircle(size - 7, 7, 3.5);
    } else if (view.icon && view.cost === "bonus") {
      g.fillStyle(COLORS.bonus, enabled ? 1 : 0.4);
      g.fillTriangle(size - 11, 11, size - 3, 11, size - 7, 3);
    }

    this.icon.setVisible(view.icon !== undefined);
    if (view.icon) {
      this.icon.setTexture(iconKey(view.icon)).setDisplaySize(size - 14, size - 14);
      this.icon.setAlpha(enabled ? 1 : 0.28);
      if (lit) this.icon.setTint(0xffffff);
      else this.icon.clearTint();
    }
    this.key.setText(view.icon ? (view.hotkey ?? "") : "");
    this.count.setText(view.count !== undefined && view.count > 1 ? `${view.count}` : "");
    this.wait.setText(view.wait ? `${view.wait}` : "");
  }

  destroy(): void {
    this.root.destroy();
  }
}

// --------------------------------------------------------------- grade

export interface GridOption extends SlotView {
  onSelect: () => void;
  /** O cursor parou aqui (teclado ou mouse): quem usa mostra a descrição. */
  onFocus?: () => void;
}

export interface GridConfig {
  cols: number;
  rows: number;
  size: number;
  gap?: number;
  onCancel?: () => void;
  adopt?: (root: Phaser.GameObjects.Container) => void;
}

/**
 * Uma grade de quadrados navegável por teclado (setas/WASD, Enter/Espaço) e
 * mouse. Mostra sempre `cols` x `rows` encaixes: os sem opção ficam vazios,
 * como numa mochila. Ativa ou não como o `Menu`.
 */
export class SlotGrid {
  private readonly slots: UiSlot[];
  private options: GridOption[] = [];
  private index = 0;
  private active = true;
  private capacity = Number.POSITIVE_INFINITY;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly config: GridConfig,
  ) {
    const { cols, rows, size, gap = 6 } = config;
    this.slots = Array.from({ length: cols * rows }, (_, i) => {
      const slot = new UiSlot(scene, x + (i % cols) * (size + gap), y + Math.floor(i / cols) * (size + gap), size, {
        over: () => {
          if (this.active && this.options[i]) this.focus(i);
        },
        down: () => {
          if (!this.active || !this.options[i]) return;
          this.focus(i);
          this.choose();
        },
      });
      config.adopt?.(slot.root);
      return slot;
    });
    scene.input.keyboard?.on("keydown", this.onKey, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  setOptions(options: GridOption[], focus = 0): void {
    this.options = options.slice(0, this.slots.length);
    this.slots.forEach((slot, i) => slot.set(this.options[i] ?? {}));
    if (this.options.length > 0) this.focus(Math.min(focus, this.options.length - 1));
    else this.slots.forEach((slot) => slot.setFocused(false));
  }

  setActive(active: boolean): void {
    this.active = active;
    this.slots.forEach((slot, i) => slot.setFocused(active && i === this.index && this.options[i] !== undefined));
    for (const slot of this.slots) slot.root.setAlpha(active ? 1 : 0.4);
  }

  setVisible(visible: boolean): void {
    this.slots.forEach((slot, i) => slot.root.setVisible(visible && i < this.capacity));
    this.active = visible;
  }

  /** Só os primeiros `capacity` encaixes aparecem: um cinto é menor que uma mochila. */
  setCapacity(capacity: number): void {
    this.capacity = capacity;
    this.slots.forEach((slot, i) => slot.root.setVisible(i < capacity));
  }

  get focusIndex(): number {
    return this.index;
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    for (const slot of this.slots) slot.destroy();
  }

  private focus(index: number): void {
    this.index = index;
    this.slots.forEach((slot, i) => slot.setFocused(i === index));
    if (this.active) this.options[index]?.onFocus?.();
  }

  private choose(): void {
    const option = this.options[this.index];
    if (!option) return;
    if (option.enabled === false) {
      sfx("deny");
      return;
    }
    sfx("uiSelect");
    option.onSelect();
  }

  private move(dx: number, dy: number): void {
    const count = this.options.length;
    if (count === 0) return;
    const { cols } = this.config;
    let next = this.index + dx + dy * cols;
    if (dx !== 0 && Math.floor(next / cols) !== Math.floor(this.index / cols)) return;
    if (next < 0) return;
    if (next >= count) {
      // Descendo pra uma linha mais curta, cai no último; à direita do último, para.
      if (dy > 0 && Math.floor((count - 1) / cols) > Math.floor(this.index / cols)) next = count - 1;
      else return;
    }
    if (next !== this.index) sfx("uiMove");
    this.focus(next);
  }

  private onKey(event: KeyboardEvent): void {
    if (!this.active) return;
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        this.move(0, -1);
        break;
      case "ArrowDown":
      case "KeyS":
        this.move(0, 1);
        break;
      case "ArrowLeft":
      case "KeyA":
        this.move(-1, 0);
        break;
      case "ArrowRight":
      case "KeyD":
        this.move(1, 0);
        break;
      case "Enter":
      case "NumpadEnter":
      case "Space":
        this.choose();
        break;
      case "Escape":
      case "Backspace":
        if (this.config.onCancel) sfx("uiCancel");
        this.config.onCancel?.();
        break;
    }
  }
}

// --------------------------------------------------------------- lista

export interface MenuOption {
  label: string;
  disabled?: boolean;
  onSelect: () => void;
  /** Chamado quando o cursor para em cima da opção (ex: pra mostrar uma descrição). */
  onFocus?: () => void;
}

export interface MenuConfig {
  lineHeight?: number;
  fontSize?: number;
  /** A largura da faixa de cada linha; sem ela, a da linha mais larga. */
  width?: number;
  /** Esc / Backspace. */
  onCancel?: () => void;
  /** Recebe cada objeto criado — pra cena que separa câmeras dizer qual delas desenha o menu. */
  adopt?: (item: Phaser.GameObjects.GameObject) => void;
}

interface MenuRow {
  band: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
}

/**
 * Lista vertical de opções, navegável por teclado (setas/W-S, Enter/Espaço)
 * e por mouse. Cada linha é uma faixa que acende sob o cursor. Uma cena pode
 * ter várias; só as ativas e visíveis respondem.
 */
export class Menu {
  private rows: MenuRow[] = [];
  private options: MenuOption[] = [];
  private index = 0;
  private active = true;
  private visible = true;
  private readonly lineHeight: number;
  private readonly fontSize: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    options: MenuOption[],
    private readonly config: MenuConfig = {},
  ) {
    this.lineHeight = config.lineHeight ?? 30;
    this.fontSize = config.fontSize ?? 22;

    scene.input.keyboard?.on("keydown", this.onKey, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);

    this.setOptions(options);
  }

  setOptions(options: MenuOption[]): void {
    this.clearRows();
    this.options = options;

    const labels = options.map((option) =>
      addBodyText(this.scene, 0, 0, option.label, {
        fontSize: `${this.fontSize}px`,
      }),
    );
    const width = this.config.width ?? Math.max(160, ...labels.map((label) => label.width + 44));

    this.rows = options.map((option, i) => {
      const top = this.y + i * this.lineHeight;
      const band = this.scene.add.rectangle(this.x, top, width, this.lineHeight - 3, COLORS.gold, 0).setOrigin(0);
      band.setVisible(this.visible);
      const text = labels[i];
      // A faixa nasce depois do texto: ele passa pra cima dela.
      this.scene.children.moveAbove(text as never, band as never);
      text.setPosition(this.x + 28, top + (this.lineHeight - 3) / 2).setOrigin(0, 0.5);
      text.setVisible(this.visible);
      this.config.adopt?.(band);
      this.config.adopt?.(text);
      if (!option.disabled) {
        band.setInteractive({ useHandCursor: true });
        band.on(Phaser.Input.Events.POINTER_OVER, () => {
          if (this.active) this.focus(i);
        });
        band.on(Phaser.Input.Events.POINTER_DOWN, () => {
          if (!this.active) return;
          this.focus(i);
          this.choose();
        });
      }
      return { band, text };
    });

    const firstEnabled = options.findIndex((option) => !option.disabled);
    this.focus(firstEnabled === -1 ? 0 : firstEnabled);
  }

  /** Põe o cursor na opção `index`, se ela existe e pode ser escolhida. */
  focusOn(index: number): void {
    if (this.options[index] && !this.options[index].disabled) this.focus(index);
  }

  /** Menu inativo continua na tela (apagado), mas não responde. */
  setActive(active: boolean): void {
    this.active = active;
    this.refresh();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    for (const { band, text } of this.rows) {
      band.setVisible(visible);
      text.setVisible(visible);
    }
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.clearRows();
  }

  private clearRows(): void {
    for (const { band, text } of this.rows) {
      band.destroy();
      text.destroy();
    }
    this.rows = [];
  }

  private focus(index: number): void {
    this.index = index;
    this.refresh();
    if (this.active && this.visible) this.options[index]?.onFocus?.();
  }

  private refresh(): void {
    this.rows.forEach(({ band, text }, i) => {
      const option = this.options[i];
      const focused = i === this.index && !option.disabled;
      band.setFillStyle(COLORS.gold, focused && this.active ? 0.16 : 0);
      band.setStrokeStyle(1, COLORS.gold, focused && this.active ? 0.55 : 0);
      text.setText(`${option.label}`);
      text.setX(this.x + (focused ? 28 : 18));
      text.setColor(option.disabled ? TEXT_COLORS.inkDim : focused ? TEXT_COLORS.goldBright : TEXT_COLORS.ink);
      text.setAlpha(this.active ? (option.disabled ? 0.5 : 1) : 0.35);
    });
  }

  private move(step: number): void {
    const count = this.options.length;
    for (let i = 1; i <= count; i++) {
      const next = (this.index + step * i + count * i) % count;
      if (!this.options[next].disabled) {
        if (next !== this.index) sfx("uiMove");
        this.focus(next);
        return;
      }
    }
  }

  private choose(): void {
    const option = this.options[this.index];
    if (!option || option.disabled) return;
    sfx("uiSelect");
    option.onSelect();
  }

  private onKey(event: KeyboardEvent): void {
    if (!this.active || !this.visible || this.options.length === 0) return;

    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        this.move(-1);
        break;
      case "ArrowDown":
      case "KeyS":
        this.move(1);
        break;
      case "Enter":
      case "NumpadEnter":
      case "Space":
        this.choose();
        break;
      case "Escape":
      case "Backspace":
        if (this.config.onCancel) sfx("uiCancel");
        this.config.onCancel?.();
        break;
    }
  }
}

/** O botão de fechar, no canto de um painel. */
export function addCloseButton(scene: Phaser.Scene, x: number, y: number, onClose: () => void): Phaser.GameObjects.Image {
  const button = scene.add.image(x, y, iconKey("close")).setDisplaySize(18, 18).setAlpha(0.75);
  button.setInteractive({ useHandCursor: true });
  button.on(Phaser.Input.Events.POINTER_OVER, () => button.setAlpha(1));
  button.on(Phaser.Input.Events.POINTER_OUT, () => button.setAlpha(0.75));
  button.on(Phaser.Input.Events.POINTER_DOWN, () => onClose());
  return button;
}
