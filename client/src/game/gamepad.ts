import { keyOf, settings, type KeyAction } from "./settings";

/**
 * O controle vira teclado: cada botão aperta a tecla que aquilo já usa, e toda
 * tela do jogo funciona sem saber que controle existe. Na luta, que se joga
 * com o mouse, o analógico anda com um cursor e o A clica.
 */

/** O que a cena está fazendo: é o que decide o que cada botão quer dizer. */
export type PadMode = "field" | "menu" | "fight";

const FIXED_KEY_CODES: Record<string, number> = {
  Enter: 13,
  Escape: 27,
  Tab: 9,
  Space: 32,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
};
for (let digit = 0; digit <= 9; digit++) FIXED_KEY_CODES[`Digit${digit}`] = 48 + digit;

const DEAD_ZONE = 0.45;
const REPEAT_DELAY_MS = 380;
const REPEAT_EVERY_MS = 130;
/** Pixels de janela por segundo, com o analógico no fim. */
const CURSOR_SPEED = 620;
const CURSOR_DEAD_ZONE = 0.18;

const BUTTON = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, select: 8, start: 9, up: 12, down: 13, left: 14, right: 15 } as const;

type Press = { key: string; keyCode: number } | "click";

let mode: PadMode = "menu";
const held = new Map<string, { key: Press; next: number }>();
let cursor: { x: number; y: number; dot: HTMLElement } | undefined;
let fightSlot = 0;
let lastFrame = 0;

export function setPadMode(next: PadMode): void {
  mode = next;
  if (mode !== "fight" && cursor) cursor.dot.style.display = "none";
}

function fixed(code: string): Press {
  return { key: code, keyCode: FIXED_KEY_CODES[code] };
}

function bound(action: KeyAction): Press {
  const { code, keyCode } = keyOf(action);
  return { key: code, keyCode };
}

function dispatchKey(type: "keydown" | "keyup", { key, keyCode }: { key: string; keyCode: number }): void {
  window.dispatchEvent(new KeyboardEvent(type, { code: key, key, keyCode, which: keyCode, bubbles: true } as KeyboardEventInit));
}

function canvas(): HTMLCanvasElement | null {
  return document.querySelector("#game canvas");
}

function moveCursor(dx: number, dy: number): void {
  if (!cursor) {
    const dot = document.createElement("div");
    dot.style.cssText = "position:fixed;width:12px;height:12px;margin:-6px 0 0 -6px;border:2px solid #e8c47a;border-radius:50%;pointer-events:none;z-index:10";
    document.body.appendChild(dot);
    cursor = { x: window.innerWidth / 2, y: window.innerHeight / 2, dot };
  }
  cursor.x = Math.max(0, Math.min(window.innerWidth - 1, cursor.x + dx));
  cursor.y = Math.max(0, Math.min(window.innerHeight - 1, cursor.y + dy));
  cursor.dot.style.display = "block";
  cursor.dot.style.left = `${cursor.x}px`;
  cursor.dot.style.top = `${cursor.y}px`;
  canvas()?.dispatchEvent(new MouseEvent("mousemove", { clientX: cursor.x, clientY: cursor.y, bubbles: true }));
}

function click(type: "mousedown" | "mouseup"): void {
  const target = canvas();
  if (!target) return;
  const at = cursor ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  target.dispatchEvent(new MouseEvent(type, { clientX: at.x, clientY: at.y, button: 0, buttons: type === "mousedown" ? 1 : 0, bubbles: true }));
}

/** O que cada botão aperta agora, no modo em que o jogo está. */
function buttonsNow(): [number, Press][] {
  if (mode === "field") {
    return [
      [BUTTON.a, bound("interact")],
      [BUTTON.b, fixed("Escape")],
      [BUTTON.x, bound("ambush")],
      [BUTTON.y, bound("bag")],
      [BUTTON.rb, bound("sneak")],
      [BUTTON.lt, bound("rest")],
      [BUTTON.rt, bound("sheet")],
      [BUTTON.select, bound("map")],
      [BUTTON.start, fixed("Escape")],
    ];
  }
  if (mode === "fight") {
    return [
      [BUTTON.a, "click"],
      [BUTTON.b, fixed("Escape")],
      [BUTTON.y, fixed("Enter")],
    ];
  }
  return [
    [BUTTON.a, fixed("Enter")],
    [BUTTON.b, fixed("Escape")],
    [BUTTON.start, fixed("Escape")],
    [BUTTON.lb, fixed("Tab")],
    [BUTTON.rb, fixed("Tab")],
    [BUTTON.x, bound("interact")],
  ];
}

function press(id: string, key: Press, down: boolean, now: number, repeats: boolean): void {
  const state = held.get(id);
  if (down && !state) {
    held.set(id, { key, next: now + REPEAT_DELAY_MS });
    if (key === "click") click("mousedown");
    else dispatchKey("keydown", key);
  } else if (down && state && repeats && now >= state.next && state.key !== "click") {
    state.next = now + REPEAT_EVERY_MS;
    dispatchKey("keydown", state.key);
  } else if (!down && state) {
    held.delete(id);
    if (state.key === "click") click("mouseup");
    else dispatchKey("keyup", state.key);
  }
}

function poll(pad: Gamepad, now: number, delta: number): void {
  const pressed = (index: number) => pad.buttons[index]?.pressed === true;
  const stick = { x: pad.axes[0] ?? 0, y: pad.axes[1] ?? 0 };

  for (const [button, key] of buttonsNow()) press(`b${button}:${mode}`, key, pressed(button), now, false);
  // Botão que mudou de sentido porque o modo mudou solta o que apertava.
  for (const [id, state] of held) {
    if (id.startsWith("b") && !id.endsWith(`:${mode}`)) press(id, state.key, false, now, false);
  }

  if (mode === "fight") {
    const scale = (CURSOR_SPEED * delta) / 1000;
    const dx = Math.abs(stick.x) > CURSOR_DEAD_ZONE ? stick.x : pressed(BUTTON.left) ? -0.5 : pressed(BUTTON.right) ? 0.5 : 0;
    const dy = Math.abs(stick.y) > CURSOR_DEAD_ZONE ? stick.y : pressed(BUTTON.up) ? -0.5 : pressed(BUTTON.down) ? 0.5 : 0;
    if (dx !== 0 || dy !== 0) moveCursor(dx * scale, dy * scale);
    for (const id of ["up", "down", "left", "right"]) {
      const state = held.get(id);
      if (state) press(id, state.key, false, now, false);
    }
    // RB anda pelas ações da barra: 1, 2, 3...
    const rb = pressed(BUTTON.rb);
    if (rb && !held.has("slot")) {
      fightSlot = (fightSlot + 1) % 10;
      const key = fixed(`Digit${fightSlot}`) as { key: string; keyCode: number };
      held.set("slot", { key, next: Number.POSITIVE_INFINITY });
      dispatchKey("keydown", key);
    } else if (!rb && held.has("slot")) {
      dispatchKey("keyup", held.get("slot")!.key as { key: string; keyCode: number });
      held.delete("slot");
    }
    return;
  }

  // Andando, a tecla é a do jogador (o mesmo caminho do teclado); num menu, as setas.
  const direction = (name: "up" | "down" | "left" | "right", arrow: string, down: boolean) => {
    press(name, mode === "field" ? bound(name) : fixed(arrow), down, now, mode !== "field");
  };
  direction("up", "ArrowUp", pressed(BUTTON.up) || stick.y < -DEAD_ZONE);
  direction("down", "ArrowDown", pressed(BUTTON.down) || stick.y > DEAD_ZONE);
  direction("left", "ArrowLeft", pressed(BUTTON.left) || stick.x < -DEAD_ZONE);
  direction("right", "ArrowRight", pressed(BUTTON.right) || stick.x > DEAD_ZONE);
}

/** Começa a olhar o controle, a cada quadro. Sem controle ligado, não faz nada. */
export function watchGamepad(): void {
  const frame = (now: number) => {
    const delta = Math.min(50, now - lastFrame);
    lastFrame = now;
    const pad = settings().gamepad ? [...(navigator.getGamepads?.() ?? [])].find((candidate) => candidate?.connected) : undefined;
    if (pad) poll(pad, now, delta);
    window.requestAnimationFrame(frame);
  };
  window.requestAnimationFrame(frame);
}
