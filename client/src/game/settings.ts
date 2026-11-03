/**
 * As opções do jogador: guardadas neste dispositivo, como o volume, e não numa
 * partida. Sem Phaser nem nada da tela: quem desenha é `OptionsPanel`, e cada
 * parte do jogo lê daqui o que lhe toca.
 */
import type { Difficulty } from "@jogo/shared";
import { STORAGE_PREFIX, adoptOldKeys } from "./storage";

const SETTINGS_KEY = `${STORAGE_PREFIX}opcoes`;

/** O que se faz andando pelo mundo, e por isso se pode trocar de tecla. Esc, Enter, setas e números ficam fixos. */
export type KeyAction = "up" | "down" | "left" | "right" | "interact" | "ambush" | "sneak" | "rest" | "sheet" | "bag" | "journal" | "map";

export interface KeyBinding {
  code: string;
  keyCode: number;
}

export type BarMode = "sempre" | "parado" | "nunca";
export type LogMode = "curto" | "longo" | "nenhum";

export interface Settings {
  difficulty: Difficulty;
  /** O quanto as animações da luta correm: 1 é o normal. */
  animSpeed: number;
  /** O tamanho do boneco, em quadrados. */
  actorSize: number;
  /** A aproximação da câmera do mundo. */
  zoom: number;
  /** O tamanho da letra da conversa, do cartão e do registro: 1 é o normal. */
  textSize: number;
  /** A voz de quem começa a falar. */
  voice: boolean;
  /** Os companheiros jogam a vez deles sozinhos. A protagonista é sempre do jogador. */
  companionsAuto: boolean;
  /** Os companheiros gastam sozinhos os pontos da árvore ao subir de nível (ver autoLearn). A protagonista, nunca. */
  skillsAuto: boolean;
  /** Milissegundos por letra pra conversa passar sozinha; 0 espera o jogador. */
  autoAdvance: number;
  shake: boolean;
  minimap: boolean;
  bar: BarMode;
  log: LogMode;
  /** A vida em números, no cartão de cada um. */
  hpNumbers: boolean;
  gamepad: boolean;
  keys: Record<KeyAction, KeyBinding>;
}

const key = (letter: string): KeyBinding => ({ code: `Key${letter}`, keyCode: letter.charCodeAt(0) });

export const DEFAULT_KEYS: Record<KeyAction, KeyBinding> = {
  up: key("W"),
  down: key("S"),
  left: key("A"),
  right: key("D"),
  interact: key("E"),
  ambush: key("F"),
  sneak: key("Q"),
  rest: key("Z"),
  sheet: key("C"),
  bag: key("I"),
  journal: key("J"),
  map: key("M"),
};

export const DEFAULT_SETTINGS: Settings = {
  difficulty: "normal",
  animSpeed: 1,
  actorSize: 1.5,
  zoom: 3,
  textSize: 1,
  voice: true,
  companionsAuto: false,
  skillsAuto: false,
  autoAdvance: 0,
  shake: true,
  minimap: true,
  bar: "sempre",
  log: "curto",
  hpNumbers: false,
  gamepad: true,
  keys: DEFAULT_KEYS,
};

/** Estas têm função fixa em toda tela: não se dá outra a elas. */
const RESERVED = /^(Escape|Enter|NumpadEnter|Tab|Space|Backspace|Arrow.*|Digit\d|Numpad\d)$/;

export function isReservedKey(code: string): boolean {
  return RESERVED.test(code);
}

function validBinding(value: unknown): value is KeyBinding {
  const binding = value as KeyBinding | null;
  return typeof binding?.code === "string" && typeof binding.keyCode === "number" && !isReservedKey(binding.code);
}

/** Lê o que veio guardado: o que falta ou está errado fica no padrão, e o jogo nunca deixa de abrir por causa disso. */
export function parseSettings(raw: unknown): Settings {
  const saved = (raw ?? {}) as Partial<Settings>;
  const merged: Settings = { ...DEFAULT_SETTINGS };
  for (const name of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (name !== "keys" && typeof saved[name] === typeof DEFAULT_SETTINGS[name]) (merged as unknown as Record<string, unknown>)[name] = saved[name];
  }
  const keys = { ...DEFAULT_KEYS };
  for (const action of Object.keys(DEFAULT_KEYS) as KeyAction[]) {
    const binding = saved.keys?.[action];
    if (validBinding(binding)) keys[action] = { code: binding.code, keyCode: binding.keyCode };
  }
  merged.keys = keys;
  return merged;
}

/**
 * Põe `binding` em `action`. Se a tecla já era de outra ação, as duas trocam,
 * e ninguém fica sem tecla nem com duas ações na mesma.
 */
export function rebound(keys: Record<KeyAction, KeyBinding>, action: KeyAction, binding: KeyBinding): Record<KeyAction, KeyBinding> {
  const next = { ...keys };
  const holder = (Object.keys(keys) as KeyAction[]).find((other) => keys[other].code === binding.code);
  if (holder && holder !== action) next[holder] = keys[action];
  next[action] = binding;
  return next;
}

/** O nome da tecla na tela. */
export function keyName(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  const names: Record<string, string> = {
    ShiftLeft: "Shift",
    ShiftRight: "Shift dir.",
    ControlLeft: "Ctrl",
    ControlRight: "Ctrl dir.",
    AltLeft: "Alt",
    AltRight: "Alt dir.",
    Semicolon: "Ç",
    Comma: ",",
    Period: ".",
    Slash: ";",
    Minus: "-",
    Equal: "=",
    BracketLeft: "´",
    BracketRight: "[",
    Backslash: "]",
    Quote: "~",
    Backquote: "'",
    CapsLock: "Caps",
  };
  return names[code] ?? code;
}

function readSaved(): Settings {
  adoptOldKeys();
  try {
    return parseSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null"));
  } catch {
    return parseSettings(null);
  }
}

let current: Settings | undefined;

export function settings(): Settings {
  return (current ??= readSaved());
}

export function setOption<K extends keyof Settings>(name: K, value: Settings[K]): void {
  settings()[name] = value;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings()));
  } catch {
    // Sem onde guardar, vale só nesta sessão.
  }
}

/** A tecla de agora de uma ação. */
export function keyOf(action: KeyAction): KeyBinding {
  return settings().keys[action];
}

/** O nome, na tela, da tecla de agora de uma ação. */
export function keyLabel(action: KeyAction): string {
  return keyName(keyOf(action).code);
}

/** Esta tecla é a da ação? */
export function isAction(event: KeyboardEvent, action: KeyAction): boolean {
  return event.code === keyOf(action).code;
}

/** Um tamanho de letra, em px, com o tamanho escolhido nas opções. */
export function textPx(size: number): string {
  return `${Math.round(size * settings().textSize)}px`;
}
