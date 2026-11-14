import * as Phaser from "phaser";
import { GAME_WIDTH, TEXT_COLORS } from "./config";
import { settings } from "./settings";
import { STORAGE_PREFIX } from "./storage";
import { addBodyText, addPanel, type AddHud } from "./ui";

/**
 * As dicas de primeira vez (task 79, `docs/propostas-corpo.md`): uma linha, na hora em que a coisa acontece pela
 * primeira vez, e nunca mais. A abertura ensina pelo que acontece (o voto de Xanduí, o "Deixa que eu abro", o "Não no
 * rio, rapaz"); a dica só aponta pra o que a tela já mostra. É texto da interface, não fala de ninguém. Desligam nas
 * Opções (Jogo, Dicas). O que já se viu fica neste dispositivo, como as opções.
 */
export const TIPS = {
  turn: "Na barra: o verde gasta a ação, o laranja o bônus, e o Passo é o quanto ainda anda. O botão redondo (ou Espaço) encerra a vez.",
  bands: "Todo golpe cai numa de três faixas: pleno; com custo, que pega mas cobra de quem bateu; ou falha, que deixa quem errou Exposto.",
  chain: "O verbo que pega abre a cadeia: até três no mesmo alvo, e cada um depois do primeiro custa 1 de Fôlego no lugar da ação.",
  recite: "Magia recitada sai no começo da próxima vez de Endyru. Se ele apanhar no meio, o texto pode quebrar.",
  vow: "Xanduí é da Ipojy: não dá o primeiro golpe da luta. Quem abre é outro; depois disso, ela devolve em quem a ataca e erra.",
  goal: "Esta luta tem um objetivo, no alto da tela: cumprido, a luta acaba.",
  sneak: "Aqui tem quem vigia. Q agacha e anda devagar fora do olhar deles; escondido, F embosca. À vista, F é a investida.",
} as const;

export type TipId = keyof typeof TIPS;

const SEEN_KEY = `${STORAGE_PREFIX}dicas`;
const TIP_WIDTH = 640;
const TIP_Y = 128;
/** Quanto a dica fica na tela antes de sumir sozinha. */
const TIP_MS = 9000;

let seen: Set<string> | undefined;
let showing: { objects: Phaser.GameObjects.GameObject[]; timer?: Phaser.Time.TimerEvent } | undefined;

function seenTips(): Set<string> {
  if (seen) return seen;
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
    seen = new Set(Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : []);
  } catch {
    seen = new Set();
  }
  return seen;
}

function markSeen(id: TipId): void {
  seenTips().add(id);
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seenTips()]));
  } catch {
    // Sem onde guardar, a dica volta na próxima vez que o jogo abrir: melhor que travar.
  }
}

/** Some com a dica que está na tela, se houver. */
export function hideTip(): void {
  showing?.timer?.remove();
  for (const object of showing?.objects ?? []) object.destroy();
  showing = undefined;
}

/**
 * Mostra a dica `id`, se as dicas estão ligadas e ela nunca foi vista: uma faixa no alto, que some sozinha ou num
 * clique. Devolve se mostrou. Uma de cada vez: a nova toma o lugar da que estava.
 */
export function showTip(scene: Phaser.Scene, addHud: AddHud, id: TipId): boolean {
  if (!settings().tips || seenTips().has(id)) return false;
  markSeen(id);
  hideTip();
  const text = addHud(
    addBodyText(scene, GAME_WIDTH / 2, TIP_Y, `Dica  ·  ${TIPS[id]}`, {
      fontSize: "17px",
      color: TEXT_COLORS.ink,
      align: "center",
      wordWrap: { width: TIP_WIDTH - 40 },
    })
      .setOrigin(0.5, 0)
      .setDepth(10_000),
  );
  const height = text.height + 20;
  const frame = addHud(addPanel(scene, (GAME_WIDTH - TIP_WIDTH) / 2, TIP_Y - 10, TIP_WIDTH, height).setDepth(9_999));
  const zone = addHud(
    scene.add
      .zone(GAME_WIDTH / 2, TIP_Y - 10 + height / 2, TIP_WIDTH, height)
      .setInteractive({ useHandCursor: true })
      .setDepth(10_001),
  );
  zone.on(Phaser.Input.Events.POINTER_DOWN, () => hideTip());
  showing = { objects: [frame, text, zone], timer: scene.time.delayedCall(TIP_MS, () => hideTip()) };
  return true;
}
