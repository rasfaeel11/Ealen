import type { CharacterClass } from "./characterClass";

/**
 * Formato do artefato produzido pelo projeto irmão "Balanceador de Combate +
 * IA de Inimigo" (`ealen-IA`, Python) e versionado aqui em
 * `shared/data/iaTuning.json`.
 *
 * Esse arquivo é a ÚNICA coisa que atravessa a fronteira entre os dois
 * repositórios: o jogo não executa Python e o balanceador não importa
 * TypeScript. Quem gera é `exportar_para_o_jogo.py`, do outro lado.
 *
 * Tudo aqui é opcional na prática: `shared/iaTuning.ts` valida o arquivo ao
 * carregar e, se algo não bater, o jogo volta às regras escritas à mão. Um
 * artefato quebrado não pode derrubar o combate.
 */

/** Só três ações do motor têm equivalente no simulador em Python (ver shared/iaTuning.ts). */
export type PolicyAction = "attack" | "defend" | "heavy_attack";

export interface PolicyEntry {
  /** Ação de maior valor Q nesse estado — a decisão que o agente treinado tomaria. */
  action: PolicyAction;
  /**
   * Distância entre o melhor valor Q e o segundo melhor. Perto de zero
   * significa que o agente é indiferente entre duas ações ali, e o motor
   * prefere a heurística autoral nesses casos (ver POLICY_MIN_CONFIDENCE).
   */
  confidence: number;
  /** Valor Q de cada ação, pra inspeção/diagnóstico. */
  q: Record<PolicyAction, number>;
}

export interface EnemyPolicy {
  /** Em quantas faixas o HP foi discretizado no treino (o jogo precisa usar o mesmo número). */
  hpBands: number;
  /** Taxa de vitória média do agente contra a política ingênua "sempre ataca", no simulador. */
  winRateVsNaive: number;
  /**
   * Política gulosa, indexada por
   * "faixaHpPropria|faixaHpOponente|euComGuarda|oponenteComGuarda"
   * (guardas como 0/1). Estados nunca visitados no treino não aparecem.
   */
  states: Record<string, PolicyEntry>;
}

/** Atributos que o simulador em Python modela — Len e Ul ficam de fora porque lá não afetam combate. */
export type TunedAttributes = Record<"dain" | "eir" | "nath" | "il" | "or", number>;

/** f(n) = a + b*n, a convenção de `progressao_xp.curva_linear` do outro repo. */
export interface XpCurve {
  kind: "linear";
  a: number;
  b: number;
}

export interface IaTuning {
  schemaVersion: number;
  generatedAt: string;
  source: {
    project: string;
    script: string;
    balanceamento: string;
    seed: number;
    trainingEpisodes: number;
  };
  /** Atributos por Ordem que o auto-tuner convergiu, na escala BRUTA do simulador (não a do jogo). */
  classBaselines: Record<CharacterClass, TunedAttributes>;
  enemyPolicy: EnemyPolicy;
  xpCurve: XpCurve;
}
