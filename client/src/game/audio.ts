/**
 * O som do jogo, inteiro SINTETIZADO na hora (Web Audio): não há arquivo de
 * áudio nenhum. É provisório como os sprites gerados em `mapSprites.ts` — dá
 * ao jogo música por lugar, música de luta e os efeitos, até existir trilha
 * de verdade. Pra trocar por áudio gravado, o que muda é este arquivo: quem
 * chama (`sfx("hit")`, `playMusic("battle")`) continua igual.
 *
 * Três volumes (geral, música, efeitos), guardados neste dispositivo numa
 * chave própria: são do jogador, não de uma partida, como o perfil.
 *
 * O navegador só deixa tocar depois do primeiro clique ou tecla; até lá a
 * música fica armada e os efeitos são descartados.
 */

const SETTINGS_KEY = "ealen:audio";

export type VolumeKind = "master" | "music" | "sfx";
export type Volumes = Record<VolumeKind, number>;

const DEFAULT_VOLUMES: Volumes = { master: 0.8, music: 0.6, sfx: 0.8 };

function readVolumes(): Volumes {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null") as Partial<Volumes> | null;
    const level = (kind: VolumeKind) => {
      const value = saved?.[kind];
      return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_VOLUMES[kind];
    };
    return { master: level("master"), music: level("music"), sfx: level("sfx") };
  } catch {
    return { ...DEFAULT_VOLUMES };
  }
}

const levels = readVolumes();

// ------------------------------------------------------------------ o motor

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  noise: AudioBuffer;
}

let engine: Engine | null | undefined;

/** As notas da música são escritas baixas (somam muitas de uma vez): o canal dela as levanta. */
const BUS_GAIN: Record<VolumeKind, number> = { master: 1, music: 2.2, sfx: 1 };

/** O volume da tela (0 a 1) vira ganho ao quadrado: o ouvido não é linear. */
const gainOf = (kind: VolumeKind) => levels[kind] * levels[kind] * BUS_GAIN[kind];

function boot(): Engine | null {
  if (engine !== undefined) return engine;
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return (engine = null);

  const ctx = new Context();
  // Um limitador no fim: golpe forte em cima da música não estoura.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.ratio.value = 8;
  limiter.connect(ctx.destination);

  const master = ctx.createGain();
  master.gain.value = gainOf("master");
  master.connect(limiter);

  const sfxBus = ctx.createGain();
  sfxBus.gain.value = gainOf("sfx");
  sfxBus.connect(master);

  const music = ctx.createGain();
  music.gain.value = gainOf("music");
  music.connect(master);
  // Um eco curto só na música: é o que dá sala a três osciladores.
  const echo = ctx.createDelay(1);
  echo.delayTime.value = 0.36;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  const wet = ctx.createGain();
  wet.gain.value = 0.3;
  music.connect(echo);
  echo.connect(feedback);
  feedback.connect(echo);
  echo.connect(wet);
  wet.connect(master);

  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  const unlock = () => {
    if (!document.hidden && ctx.state === "suspended") void ctx.resume();
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  // Aba escondida não toca; e o relógio do áudio para junto, então a música retoma de onde estava.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) void ctx.suspend();
    else unlock();
  });

  return (engine = { ctx, master, music, sfx: sfxBus, noise });
}

export function volumes(): Volumes {
  return { ...levels };
}

export function setVolume(kind: VolumeKind, level: number): void {
  levels[kind] = Math.min(1, Math.max(0, level));
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(levels));
  } catch {
    // Sem onde guardar, vale só nesta sessão.
  }
  const audio = boot();
  audio?.[kind].gain.setTargetAtTime(gainOf(kind), audio.ctx.currentTime, 0.03);
}

// ------------------------------------------------------------------ as peças

interface Tone {
  freq: number;
  /** Pra onde a frequência escorrega até o fim. */
  to?: number;
  wave?: OscillatorType;
  dur: number;
  gain: number;
  attack?: number;
  /** Segundos depois do começo do efeito. */
  delay?: number;
}

interface Noise {
  dur: number;
  gain: number;
  filter: BiquadFilterType;
  freq: number;
  to?: number;
  q?: number;
  attack?: number;
  delay?: number;
}

/** Sobe em `attack` e cai até o silêncio em `dur`. */
function envelope(ctx: AudioContext, out: AudioNode, at: number, dur: number, gain: number, attack: number): GainNode {
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.linearRampToValueAtTime(gain, at + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  amp.connect(out);
  return amp;
}

function tone({ ctx }: Engine, out: AudioNode, start: number, { freq, to, wave = "sine", dur, gain, attack = 0.005, delay = 0 }: Tone): void {
  const at = start + delay;
  const osc = ctx.createOscillator();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, at);
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(to, at + dur);
  osc.connect(envelope(ctx, out, at, dur, gain, Math.min(attack, dur / 2)));
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function noise({ ctx, noise: buffer }: Engine, out: AudioNode, start: number, { dur, gain, filter, freq, to, q = 1, attack = 0.004, delay = 0 }: Noise): void {
  const at = start + delay;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const shape = ctx.createBiquadFilter();
  shape.type = filter;
  shape.Q.value = q;
  shape.frequency.setValueAtTime(freq, at);
  if (to !== undefined) shape.frequency.exponentialRampToValueAtTime(to, at + dur);
  source.connect(shape);
  shape.connect(envelope(ctx, out, at, dur, gain, Math.min(attack, dur / 2)));
  // Cada vez um pedaço diferente do ruído: dois passos seguidos não soam idênticos.
  source.start(at, Math.random() * 0.9);
  source.stop(at + dur + 0.02);
}

// ------------------------------------------------------------------ efeitos

type Recipe = { tones?: Tone[]; noises?: Noise[] };

const midi = (note: number) => 440 * 2 ** ((note - 69) / 12);

/** Cada efeito é uma receita de tons e ruídos. Tudo provisório: os números são de ouvido. */
const SFX = {
  // Interface
  uiMove: { tones: [{ freq: 620, wave: "triangle", dur: 0.05, gain: 0.07 }] },
  uiSelect: { tones: [{ freq: 520, to: 780, wave: "triangle", dur: 0.09, gain: 0.1 }] },
  uiCancel: { tones: [{ freq: 440, to: 290, wave: "triangle", dur: 0.1, gain: 0.09 }] },
  uiOpen: { tones: [{ freq: 392, wave: "triangle", dur: 0.08, gain: 0.07 }, { freq: 587, wave: "triangle", dur: 0.1, gain: 0.07, delay: 0.05 }] },
  deny: { tones: [{ freq: 150, wave: "square", dur: 0.12, gain: 0.05 }] },
  /** Passar uma fala. */
  advance: { tones: [{ freq: 880, dur: 0.04, gain: 0.05 }] },
  /** A caixa anuncia alguma coisa (item, pista, quem entra no grupo). */
  notice: { tones: [{ freq: 659, dur: 0.14, gain: 0.07 }, { freq: 988, dur: 0.22, gain: 0.07, delay: 0.09 }] },

  // Mundo
  step: { noises: [{ dur: 0.06, gain: 0.1, filter: "lowpass", freq: 650 }] },
  rest: { tones: [{ freq: 392, dur: 0.7, gain: 0.08, attack: 0.1 }, { freq: 523, dur: 0.9, gain: 0.08, attack: 0.1, delay: 0.3 }, { freq: 659, dur: 1.1, gain: 0.07, attack: 0.1, delay: 0.6 }] },
  travel: { noises: [{ dur: 0.4, gain: 0.07, filter: "bandpass", freq: 300, to: 1400, q: 0.8, attack: 0.15 }] },

  // Luta
  fightStart: {
    tones: [{ freq: 95, to: 42, dur: 0.4, gain: 0.5 }, { freq: 95, to: 42, dur: 0.5, gain: 0.5, delay: 0.22 }],
    noises: [{ dur: 0.5, gain: 0.08, filter: "highpass", freq: 3000, attack: 0.2 }],
  },
  ambush: {
    tones: [{ freq: 110, to: 220, wave: "sawtooth", dur: 0.3, gain: 0.1 }, { freq: 95, to: 42, dur: 0.5, gain: 0.5, delay: 0.28 }],
    noises: [{ dur: 0.32, gain: 0.12, filter: "bandpass", freq: 500, to: 3000, attack: 0.25 }],
  },
  turn: { tones: [{ freq: 784, dur: 0.1, gain: 0.05 }, { freq: 1047, dur: 0.16, gain: 0.05, delay: 0.07 }] },
  swing: { noises: [{ dur: 0.13, gain: 0.12, filter: "bandpass", freq: 1600, to: 500, q: 1.4, attack: 0.03 }] },
  hit: {
    tones: [{ freq: 170, to: 70, dur: 0.13, gain: 0.35 }],
    noises: [{ dur: 0.1, gain: 0.3, filter: "lowpass", freq: 2200, to: 300 }],
  },
  heavyHit: {
    tones: [{ freq: 130, to: 42, dur: 0.3, gain: 0.5 }],
    noises: [{ dur: 0.2, gain: 0.4, filter: "lowpass", freq: 3000, to: 200 }],
  },
  crit: { tones: [{ freq: 1320, to: 1980, wave: "triangle", dur: 0.18, gain: 0.1 }, { freq: 1760, wave: "triangle", dur: 0.25, gain: 0.07, delay: 0.06 }] },
  miss: { noises: [{ dur: 0.16, gain: 0.07, filter: "highpass", freq: 2400, attack: 0.06 }] },
  block: { tones: [{ freq: 940, wave: "square", dur: 0.05, gain: 0.05 }, { freq: 1410, wave: "triangle", dur: 0.12, gain: 0.08 }] },
  immune: { tones: [{ freq: 220, to: 207, dur: 0.4, gain: 0.1, attack: 0.05 }, { freq: 311, to: 293, dur: 0.4, gain: 0.07, attack: 0.05 }] },
  heal: { tones: [{ freq: 523, dur: 0.2, gain: 0.08 }, { freq: 659, dur: 0.2, gain: 0.08, delay: 0.07 }, { freq: 784, dur: 0.32, gain: 0.08, delay: 0.14 }] },
  status: { tones: [{ freq: 392, to: 311, wave: "triangle", dur: 0.22, gain: 0.08 }] },
  /** Uma condição ou o chão ferindo alguém. */
  sting: { tones: [{ freq: 300, to: 180, wave: "sawtooth", dur: 0.14, gain: 0.05 }], noises: [{ dur: 0.12, gain: 0.08, filter: "bandpass", freq: 2000, q: 2 }] },
  surface: { noises: [{ dur: 0.45, gain: 0.1, filter: "bandpass", freq: 700, to: 2200, q: 0.7, attack: 0.1 }] },
  push: { noises: [{ dur: 0.18, gain: 0.12, filter: "lowpass", freq: 900, to: 250, attack: 0.02 }] },
  item: { tones: [{ freq: 700, to: 1050, wave: "triangle", dur: 0.1, gain: 0.08 }, { freq: 1320, dur: 0.16, gain: 0.06, delay: 0.09 }] },
  support: { tones: [{ freq: 880, wave: "triangle", dur: 0.06, gain: 0.06 }, { freq: 880, wave: "triangle", dur: 0.06, gain: 0.06, delay: 0.09 }, { freq: 1175, wave: "triangle", dur: 0.14, gain: 0.06, delay: 0.18 }] },
  skipped: { tones: [{ freq: 330, to: 220, dur: 0.25, gain: 0.06, attack: 0.03 }] },
  propHit: { noises: [{ dur: 0.09, gain: 0.22, filter: "bandpass", freq: 900, q: 1.5 }], tones: [{ freq: 210, to: 140, wave: "triangle", dur: 0.08, gain: 0.15 }] },
  propBreak: {
    noises: [{ dur: 0.3, gain: 0.3, filter: "lowpass", freq: 2600, to: 400 }, { dur: 0.12, gain: 0.15, filter: "bandpass", freq: 1800, q: 3, delay: 0.08 }],
    tones: [{ freq: 180, to: 60, wave: "triangle", dur: 0.2, gain: 0.25 }],
  },
  /** Mexer num objeto: hoje, o sino. */
  bell: { tones: [{ freq: 587, dur: 1.4, gain: 0.14 }, { freq: 1180, dur: 1.0, gain: 0.07 }, { freq: 1772, dur: 0.6, gain: 0.04 }, { freq: 2390, dur: 0.3, gain: 0.03 }] },
  death: {
    tones: [{ freq: 220, to: 52, wave: "sawtooth", dur: 0.5, gain: 0.08 }, { freq: 110, to: 40, dur: 0.5, gain: 0.25 }],
    noises: [{ dur: 0.45, gain: 0.1, filter: "lowpass", freq: 1200, to: 150 }],
  },
  /** A história fala no meio da luta. */
  cue: { tones: [{ freq: 294, dur: 0.9, gain: 0.09, attack: 0.05 }, { freq: 440, dur: 0.9, gain: 0.07, attack: 0.05, delay: 0.12 }] },
  round: { tones: [{ freq: 196, wave: "triangle", dur: 0.25, gain: 0.07 }] },
  victory: {
    tones: [60, 64, 67, 72, 76].map((note, i) => ({ freq: midi(note), wave: "triangle" as const, dur: i === 4 ? 0.9 : 0.22, gain: 0.11, delay: i * 0.13 })),
  },
  defeat: {
    tones: [57, 53, 50, 45].map((note, i) => ({ freq: midi(note), wave: "triangle" as const, dur: i === 3 ? 1.4 : 0.5, gain: 0.11, attack: 0.03, delay: i * 0.38 })),
  },
} satisfies Record<string, Recipe>;

export type SfxName = keyof typeof SFX;

/** Efeitos que se repetem muito de perto (passos, cursor) não se empilham. */
const lastPlayed = new Map<SfxName, number>();
const MIN_GAP_S = 0.03;

export function sfx(name: SfxName): void {
  const audio = boot();
  // Antes do primeiro clique o navegador não toca: o efeito some, em vez de ficar na fila pra sair todo junto.
  if (!audio || audio.ctx.state !== "running") return;
  const now = audio.ctx.currentTime;
  if (now - (lastPlayed.get(name) ?? -1) < MIN_GAP_S) return;
  lastPlayed.set(name, now);

  const recipe: Recipe = SFX[name];
  for (const part of recipe.tones ?? []) tone(audio, audio.sfx, now, part);
  for (const part of recipe.noises ?? []) noise(audio, audio.sfx, now, part);
}

// ------------------------------------------------------------------- música

/**
 * Uma voz da música. `notes` anda um item a cada `every` semicolcheias e dá
 * a volta sozinha — vozes de tamanhos diferentes se desencontram, e a mesma
 * meia dúzia de notas demora a se repetir igual.
 */
interface Voice {
  /** `kick` é um bumbo (tom que despenca); `noise`, um chiado curto (prato). */
  wave: OscillatorType | "kick" | "noise";
  /** Nota MIDI, acorde, ou 0 pra pausa. */
  notes: (number | number[])[];
  every: number;
  /** Quanto a nota dura, em semicolcheias. */
  hold: number;
  gain: number;
  /** `pad` entra e sai devagar; `pluck` bate e some. */
  shape?: "pad" | "pluck";
  /** Corta o agudo (Hz): amacia serra e quadrada. */
  cutoff?: number;
}

interface Track {
  bpm: number;
  voices: Voice[];
}

/**
 * As músicas. Provisórias como tudo: uma por lugar, a do título e a de luta.
 * Cada uma é meia dúzia de linhas de notas — trocar o clima de um lugar é
 * mexer aqui.
 */
const TRACKS = {
  // Ré menor, lento: o título e o prólogo.
  title: {
    bpm: 60,
    voices: [
      { wave: "sine", shape: "pad", every: 16, hold: 17, gain: 0.05, notes: [[50, 57, 62, 65], [46, 53, 58, 65], [48, 55, 60, 64], [45, 52, 57, 64]] },
      { wave: "triangle", shape: "pad", every: 16, hold: 16, gain: 0.03, notes: [38, 34, 36, 33] },
      { wave: "triangle", shape: "pluck", every: 2, hold: 6, gain: 0.06, notes: [74, 0, 0, 72, 0, 69, 0, 0, 0, 65, 0, 0, 67, 0, 69, 0, 72, 0, 0, 0, 69, 0, 0, 0, 0, 64, 0, 0, 65, 0, 0, 0] },
      { wave: "sine", shape: "pluck", every: 6, hold: 8, gain: 0.03, notes: [81, 0, 86, 0, 0, 84, 0] },
    ],
  },
  // Dó maior pentatônico, calmo: a clareira.
  clareira: {
    bpm: 76,
    voices: [
      { wave: "sine", shape: "pad", every: 16, hold: 17, gain: 0.045, notes: [[48, 55, 64], [53, 60, 69], [45, 52, 60], [55, 62, 71]] },
      { wave: "triangle", shape: "pluck", every: 2, hold: 5, gain: 0.06, notes: [72, 0, 76, 0, 79, 0, 0, 81, 0, 79, 0, 76, 0, 0, 72, 0, 74, 0, 0, 76, 0, 72, 0, 0, 69, 0, 0, 67, 0, 0, 0, 0] },
      { wave: "sine", shape: "pluck", every: 3, hold: 6, gain: 0.035, notes: [84, 0, 0, 88, 0, 0, 0, 91, 0, 0, 86, 0, 0] },
      { wave: "triangle", shape: "pluck", every: 8, hold: 7, gain: 0.05, notes: [36, 43, 41, 48, 33, 40, 43, 38] },
    ],
  },
  // Ré dórico, andando: a estrada.
  estrada: {
    bpm: 88,
    voices: [
      { wave: "triangle", shape: "pluck", every: 4, hold: 4, gain: 0.07, notes: [38, 45, 38, 50, 36, 43, 36, 48, 43, 50, 43, 47, 41, 48, 45, 40] },
      { wave: "sine", shape: "pad", every: 16, hold: 17, gain: 0.04, notes: [[50, 57, 65], [48, 55, 64], [55, 59, 62], [53, 57, 60]] },
      { wave: "triangle", shape: "pluck", every: 2, hold: 4, gain: 0.055, notes: [62, 0, 65, 67, 0, 69, 0, 0, 67, 0, 65, 0, 62, 0, 0, 0, 64, 0, 67, 0, 71, 0, 69, 0, 0, 67, 0, 0, 62, 0, 0, 0] },
      { wave: "noise", every: 4, hold: 1, gain: 0.012, cutoff: 5000, notes: [0, 1, 0, 1, 0, 1, 1, 1] },
    ],
  },
  // Grave, com trítono, quase parada: as ruínas.
  ruinas: {
    bpm: 52,
    voices: [
      { wave: "sine", shape: "pad", every: 16, hold: 18, gain: 0.06, notes: [[38, 45, 53], [37, 44, 53], [36, 43, 51], [34, 44, 50]] },
      { wave: "triangle", shape: "pad", every: 32, hold: 30, gain: 0.03, notes: [26, 25] },
      { wave: "sine", shape: "pluck", every: 5, hold: 10, gain: 0.04, notes: [77, 0, 0, 74, 0, 0, 0, 80, 0, 0, 69, 0, 0, 0, 0] },
      { wave: "triangle", shape: "pluck", every: 7, hold: 8, gain: 0.03, notes: [62, 0, 65, 0, 0, 61, 0, 0] },
    ],
  },
  // Ré menor, rápido, com bumbo: qualquer luta.
  battle: {
    bpm: 132,
    voices: [
      { wave: "kick", every: 4, hold: 2, gain: 0.3, notes: [1] },
      { wave: "noise", every: 2, hold: 1, gain: 0.02, cutoff: 7000, notes: [0, 1, 0, 1, 0, 1, 1, 1] },
      { wave: "sawtooth", shape: "pluck", every: 2, hold: 2, gain: 0.07, cutoff: 520, notes: [38, 38, 50, 38, 38, 38, 48, 38, 34, 34, 46, 34, 34, 34, 45, 34, 36, 36, 48, 36, 36, 36, 46, 36, 33, 33, 45, 33, 33, 45, 40, 37] },
      { wave: "square", shape: "pluck", every: 2, hold: 3, gain: 0.03, cutoff: 1700, notes: [62, 0, 65, 0, 69, 0, 67, 65, 0, 62, 0, 0, 60, 0, 62, 0, 65, 0, 69, 0, 72, 0, 70, 69, 0, 65, 0, 0, 64, 0, 61, 0] },
      { wave: "sine", shape: "pad", every: 16, hold: 16, gain: 0.035, notes: [[50, 57, 65], [46, 53, 62], [48, 55, 64], [45, 52, 61]] },
    ],
  },
} satisfies Record<string, Track>;

export type TrackId = keyof typeof TRACKS;

/** A música de cada área (a chave de `AREAS`). Área que não está aqui toca a da clareira. */
const AREA_MUSIC: Record<string, TrackId> = { clareira: "clareira", estrada: "estrada", ruinas: "ruinas" };

export function areaMusic(areaId: string): TrackId {
  return AREA_MUSIC[areaId] ?? "clareira";
}

/** De quanto em quanto o agendador acorda, e até quanto adiante ele agenda. */
const TICK_MS = 60;
const AHEAD_S = 0.25;
const FADE_S = 1.2;

let playing: { id: TrackId; out: GainNode; step: number; next: number; timer: number } | undefined;

function playNote(audio: Engine, out: AudioNode, voice: Voice, note: number, at: number, dur: number): void {
  const { ctx } = audio;
  if (voice.wave === "kick") {
    tone(audio, out, at, { freq: 120, to: 44, dur: 0.22, gain: voice.gain });
    return;
  }
  if (voice.wave === "noise") {
    noise(audio, out, at, { dur: 0.05, gain: voice.gain, filter: "highpass", freq: voice.cutoff ?? 6000 });
    return;
  }

  const pad = voice.shape !== "pluck";
  const amp = ctx.createGain();
  const attack = pad ? Math.min(1.2, dur * 0.35) : 0.008;
  const release = pad ? Math.min(1.5, dur * 0.4) : dur * 0.3;
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.linearRampToValueAtTime(voice.gain, at + attack);
  if (pad) {
    // O colchão segura até perto do fim e sai devagar.
    amp.gain.setValueAtTime(voice.gain, at + dur - release);
    amp.gain.linearRampToValueAtTime(0.0001, at + dur);
  } else {
    // A corda bate e vai morrendo sozinha.
    amp.gain.setTargetAtTime(0.0001, at + attack, dur / 4);
  }

  let head: AudioNode = amp;
  if (voice.cutoff) {
    const soften = ctx.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.value = voice.cutoff;
    soften.connect(amp);
    head = soften;
  }
  amp.connect(out);

  const osc = ctx.createOscillator();
  osc.type = voice.wave;
  osc.frequency.value = midi(note);
  // Um nada de desafinação: três senoides juntas deixam de soar como um bipe.
  osc.detune.value = pad ? (note % 3) * 4 - 4 : 0;
  osc.connect(head);
  osc.start(at);
  osc.stop(at + dur + (pad ? 0.05 : release));
}

function schedule(audio: Engine): void {
  if (!playing) return;
  const { ctx } = audio;
  const track: Track = TRACKS[playing.id];
  const stepS = 60 / track.bpm / 4;
  // Ficou pra trás (o temporizador dormiu): recomeça de agora, sem despejar o atraso de uma vez.
  if (playing.next < ctx.currentTime) playing.next = ctx.currentTime + 0.05;

  while (playing.next < ctx.currentTime + AHEAD_S) {
    for (const voice of track.voices) {
      if (playing.step % voice.every !== 0) continue;
      const entry = voice.notes[(playing.step / voice.every) % voice.notes.length];
      for (const note of Array.isArray(entry) ? entry : [entry]) {
        if (note > 0) playNote(audio, playing.out, voice, note, playing.next, voice.hold * stepS);
      }
    }
    playing.step += 1;
    playing.next += stepS;
  }
}

/** Troca a música (a que toca sai devagar e a nova entra), ou a tira com `null`. A mesma de novo não recomeça. */
export function playMusic(id: TrackId | null): void {
  const audio = boot();
  if (!audio || playing?.id === id) return;
  const { ctx } = audio;

  if (playing) {
    const old = playing;
    window.clearInterval(old.timer);
    old.out.gain.cancelScheduledValues(ctx.currentTime);
    old.out.gain.setTargetAtTime(0, ctx.currentTime, FADE_S / 4);
    window.setTimeout(() => old.out.disconnect(), FADE_S * 2000);
    playing = undefined;
  }
  if (id === null) return;

  const out = ctx.createGain();
  out.gain.setValueAtTime(0, ctx.currentTime);
  out.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_S);
  out.connect(audio.music);
  playing = { id, out, step: 0, next: ctx.currentTime + 0.1, timer: window.setInterval(() => schedule(audio), TICK_MS) };
  schedule(audio);
}
