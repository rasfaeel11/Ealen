/**
 * Apoios: o que faz na luta quem acompanha o grupo SEM lutar (o escrivão que
 * anota, não o que bate).
 *
 * Quem apoia não é uma unidade: não tem vez na iniciativa, não ocupa
 * quadrado, não apanha e não conta pra vitória nem pra derrota. O que ele
 * tem é UM apoio, que qualquer um do grupo pode chamar na própria vez (o
 * comando `support`), sem gastar ação — uma vez por rodada.
 *
 * Como o resto, é dado: apoio novo que só combine o que já existe é uma
 * linha em `SUPPORTS`.
 */
export interface SupportTemplate {
  id: string;
  name: string;
  /** O que o apoio é, no mundo. */
  flavor: string;
  /**
   * O que ele faz. Hoje só `reveal`: mostra o que um inimigo pretende fazer
   * na vez dele — o plano que a IA tem pra ele AGORA (ver foresee em ./ai.ts).
   * É uma intenção, não uma promessa: se a luta mudar até lá, o plano muda.
   */
  kind: "reveal";
}

export const SUPPORTS = {
  annotate: {
    id: "annotate",
    name: "Anotar",
    flavor: "Quem passa o dia lendo o que os outros vão fazer lê também um golpe antes de ele sair.",
    kind: "reveal",
  },
} satisfies Record<string, SupportTemplate>;

export type SupportId = keyof typeof SUPPORTS;

export function isSupportId(id: unknown): id is SupportId {
  return typeof id === "string" && id in SUPPORTS;
}

/** Alguém que acompanha o grupo numa luta sem lutar, e o apoio que oferece. */
export interface Supporter {
  id: string;
  name: string;
  support: SupportId;
  /** Ainda não foi chamado nesta rodada. Volta a valer quando a rodada vira. */
  ready: boolean;
}
