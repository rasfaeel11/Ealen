import rawTuning from "./data/iaTuning.json";
import type { CharacterClass } from "./types/characterClass";
import type { EnemyPolicy, IaTuning, PolicyEntry, TunedAttributes, XpCurve } from "./types/iaTuning";

/**
 * Leitura do artefato do projeto irmão `ealen-IA` (ver shared/types/iaTuning.ts
 * e INTEGRACAO_COM_O_JOGO.md).
 *
 * Regra de ouro deste módulo: **nada aqui pode lançar**. Um artefato ausente,
 * de versão futura ou corrompido faz tudo cair pra `null`, e cada consumidor
 * (criação de personagem, IA de inimigo, curva de XP) volta à regra escrita
 * à mão que existia antes da integração. O jogo continua jogável sem o
 * arquivo; ele só fica menos afinado.
 */

/** Versão de esquema que este código sabe ler. */
const SUPPORTED_SCHEMA_VERSION = 1;

/**
 * Abaixo desta diferença entre o melhor Q e o segundo melhor, o agente
 * treinado está essencialmente em dúvida — no artefato atual são os estados
 * raros (os dois lados de guarda levantada ao mesmo tempo), onde os valores
 * ficaram todos em torno de 0.01. Deixar a heurística autoral decidir esses
 * casos evita trocar uma decisão de design por ruído de treino.
 */
export const POLICY_MIN_CONFIDENCE = 0.01;

/** Atributos que o simulador em Python modela, na ordem em que ele os trata. */
export const TUNED_ATTRIBUTE_KEYS = ["dain", "eir", "nath", "il", "or"] as const;
export type TunedAttributeKey = (typeof TUNED_ATTRIBUTE_KEYS)[number];

const CLASS_IDS: CharacterClass[] = [
  "luminar",
  "entropista",
  "cantor_de_ealen",
  "guardiao",
  "sombrilico",
  "rachador",
];

const POLICY_ACTIONS = new Set(["attack", "defend", "heavy_attack"]);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isTunedAttributes(value: unknown): value is TunedAttributes {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return TUNED_ATTRIBUTE_KEYS.every((key) => isFiniteNumber(record[key]) && (record[key] as number) > 0);
}

function isPolicyEntry(value: unknown): value is PolicyEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.action === "string" && POLICY_ACTIONS.has(entry.action) && isFiniteNumber(entry.confidence);
}

/**
 * Valida o JSON importado. Retorna null (e avisa no console) em vez de
 * lançar: ver a "regra de ouro" no topo do módulo.
 */
function parseTuning(value: unknown): IaTuning | null {
  if (typeof value !== "object" || value === null) return null;
  const tuning = value as Partial<IaTuning>;

  if (tuning.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    console.warn(
      `[ealen] iaTuning.json tem schemaVersion ${String(tuning.schemaVersion)}; este código lê ${SUPPORTED_SCHEMA_VERSION}. Ignorando o artefato.`,
    );
    return null;
  }

  const baselines = tuning.classBaselines;
  if (!baselines || !CLASS_IDS.every((id) => isTunedAttributes(baselines[id]))) {
    console.warn("[ealen] iaTuning.json sem atributos válidos para as seis Ordens. Ignorando o artefato.");
    return null;
  }

  const policy = tuning.enemyPolicy;
  if (!policy || !isFiniteNumber(policy.hpBands) || policy.hpBands < 1 || typeof policy.states !== "object") {
    console.warn("[ealen] iaTuning.json sem política de inimigo válida. Ignorando o artefato.");
    return null;
  }

  return tuning as IaTuning;
}

export const IA_TUNING: IaTuning | null = parseTuning(rawTuning);

/**
 * Atributos balanceados da Ordem, na escala BRUTA do simulador (valores de
 * ~3 a ~15, nada a ver com o orçamento de pontos do jogo). Converter isso pra
 * escala do jogo é decisão de design do jogo, e mora em characterCreation.ts.
 */
export function classBaseline(characterClass: CharacterClass): TunedAttributes | null {
  return IA_TUNING?.classBaselines[characterClass] ?? null;
}

/** Quantas faixas de HP a política usa — o motor precisa discretizar igual ao treino. */
export const ENEMY_POLICY_HP_BANDS = IA_TUNING?.enemyPolicy.hpBands ?? 5;

export const ENEMY_POLICY: EnemyPolicy | null = IA_TUNING?.enemyPolicy ?? null;

/**
 * Mesma discretização de `_faixa_de_hp` no outro repo: a fração de HP cai numa
 * de N faixas, e HP cheio entra na última faixa em vez de estourar o índice.
 */
export function hpBand(currentHp: number, maxHp: number, bands: number = ENEMY_POLICY_HP_BANDS): number {
  if (maxHp <= 0) return 0;
  const fraction = Math.max(0, Math.min(1, currentHp / maxHp));
  return Math.min(Math.floor(fraction * bands), bands - 1);
}

export interface PolicyState {
  /** Faixa de HP de quem está decidindo. */
  selfBand: number;
  /** Faixa de HP do oponente. */
  opponentBand: number;
  /** Quem decide está com a guarda levantada. */
  selfGuard: boolean;
  /** O oponente está com a guarda levantada. */
  opponentGuard: boolean;
}

export function policyStateKey(state: PolicyState): string {
  return `${state.selfBand}|${state.opponentBand}|${state.selfGuard ? 1 : 0}|${state.opponentGuard ? 1 : 0}`;
}

/**
 * Consulta a política treinada. Retorna null quando não há artefato, quando o
 * estado nunca foi visitado no treino, ou quando o agente está em dúvida
 * (ver POLICY_MIN_CONFIDENCE) — em todos esses casos quem decide é a
 * heurística do motor.
 */
export function lookupEnemyPolicy(state: PolicyState): PolicyEntry | null {
  const entry = ENEMY_POLICY?.states[policyStateKey(state)];
  if (!entry || !isPolicyEntry(entry)) return null;
  if (entry.confidence < POLICY_MIN_CONFIDENCE) return null;
  return entry;
}

/**
 * Curva de XP registrada no artefato, f(n) = a + b*n. Aqui o sentido da
 * travessia é o inverso do resto: o jogo é a fonte da verdade e o outro repo
 * só analisou essa curva, então o padrão abaixo é a fórmula original do jogo
 * (100 XP por nível) e o artefato serve pra manter os dois lados visivelmente
 * sincronizados.
 */
export const XP_CURVE: XpCurve = IA_TUNING?.xpCurve ?? { kind: "linear", a: 0, b: 100 };
