import type { Character } from "./types/character";
import type { CharacterClass } from "./types/characterClass";
import type { CombatAction } from "./types/combatEvent";

/**
 * As Artes de combate (ver LORE.md §7).
 *
 * Mecanicamente cada Ordem tem as mesmas cinco escolhas de postura; o que
 * muda é o que elas SÃO. Um Guardião dobra a densidade local, um Cantor
 * ajusta uma frequência, um Rachador procura a falha do padrão — chamar
 * tudo isso de "ataque pesado" joga fora justamente o que diferencia as
 * classes. Por isso o nome exibido vem daqui, e só o efeito numérico vive
 * no motor (server/src/combat/engine.ts).
 */

/** Postura de combate: toda ação menos "usar item", que não é uma Arte. */
export type CombatStance = Exclude<CombatAction, "use_item">;

export interface CombatArt {
  /** Nome exibido no botão e na narração ("Fulano usa Peso do Mundo!"). */
  name: string;
  /** O que a Arte é, no mundo — não o que ela faz em números. */
  flavor: string;
}

/**
 * Efeito numérico de cada postura, igual pra todas as Ordens. Fica separado
 * do `flavor` porque é a parte que o jogador precisa ler pra decidir, e a
 * única que muda se o balanceamento mudar.
 */
export const STANCE_MECHANICS: Record<CombatStance, string> = {
  quick_attack: "+3 de acerto, 60% do dano.",
  attack: "Equilibrado, sem modificadores.",
  heavy_attack: "-4 de acerto, 180% do dano + Dain.",
  defend: "Bloqueia dano por Or (Densidade) + 1d6.",
  heal: "Restaura HP com base em Eir (Ressonância).",
};

/** Ordem de exibição das posturas, da mais segura à mais arriscada. */
export const STANCE_ORDER: CombatStance[] = ["quick_attack", "attack", "heavy_attack", "defend", "heal"];

/**
 * `null` em `heal` significa que a Ordem não cura — e não é falta de
 * conteúdo, é consequência do Princípio: gravidade não devolve, ausência
 * não preenche, e fratura não remenda.
 */
export const CLASS_COMBAT_ARTS: Record<CharacterClass, Record<CombatStance, CombatArt | null>> = {
  luminar: {
    quick_attack: {
      name: "Cadência Justa",
      flavor: "Três tempos exatos. A ordem não erra o compasso — só não bate com toda a força.",
    },
    attack: {
      name: "Lâmina de Aurora",
      flavor: "Luz condensada até virar fio. Não queima: corrige o que estava fora do lugar.",
    },
    heavy_attack: {
      name: "Sentença de Simetria",
      flavor: "Impõe ao alvo o peso de toda a ordem que ele violou. Leva um tempo insuportável pra cair.",
    },
    defend: {
      name: "Círculo Inquebrável",
      flavor: "Um traçado perfeito ao redor dos pés. Enquanto a figura fechar, o golpe não entra.",
    },
    heal: {
      name: "Restituição",
      flavor: "Nada se perde: a energia que escapou da ferida é reunida e devolvida ao corpo.",
    },
  },

  entropista: {
    quick_attack: {
      name: "Sopro de Ferrugem",
      flavor: "Um bafo de anos. Enferruja a guarda antes de tocar em quem a segura.",
    },
    attack: {
      name: "Toque de Decaimento",
      flavor: "Encosta e adianta o relógio. O que envelhece rápido demais racha sozinho.",
    },
    heavy_attack: {
      name: "Décadas num Instante",
      flavor: "Despeja um século inteiro de desgaste de uma vez. Difícil mirar: o tempo não anda reto.",
    },
    defend: {
      name: "Manto de Cinzas",
      flavor: "Deixa que o golpe chegue — e que chegue gasto, sem metade do que saiu.",
    },
    heal: {
      name: "Cicatriz Acelerada",
      flavor: "Empurra a ferida até o fim natural dela. Fecha em segundos, e fecha feio.",
    },
  },

  cantor_de_ealen: {
    quick_attack: {
      name: "Nota Aguda",
      flavor: "Uma única frequência, fininha e certeira, entrando pelo lugar errado do ouvido.",
    },
    attack: {
      name: "Verso Dissonante",
      flavor: "Canta contra a vibração do alvo. Onde as ondas brigam, a matéria se desmancha.",
    },
    heavy_attack: {
      name: "Refrão de Ruína",
      flavor: "Encontra a frequência em que o alvo ressoa inteiro — e insiste nela até algo ceder.",
    },
    defend: {
      name: "Contracanto",
      flavor: "A onda exata, invertida, sobreposta ao golpe que vem. Interferência destrutiva, literal.",
    },
    heal: {
      name: "Cantiga de Restauro",
      flavor: "Devolve ao corpo a frequência que ele tinha antes de ser ferido.",
    },
  },

  guardiao: {
    quick_attack: {
      name: "Arranque Gravítico",
      flavor: "Puxa o alvo meio passo pra dentro e deixa o próprio peso dele fazer o resto.",
    },
    attack: {
      name: "Impacto Denso",
      flavor: "O braço pesa mais do que deveria, e pesa só no instante em que encosta.",
    },
    heavy_attack: {
      name: "Peso do Mundo",
      flavor: "Comprime tudo acima do alvo num ponto só. Lento de armar, impossível de discutir.",
    },
    defend: {
      name: "Horizonte de Eventos",
      flavor: "Traça um limite. O que cruza não volta, e o que não cruza não chega.",
    },
    heal: null,
  },

  sombrilico: {
    quick_attack: {
      name: "Lâmina Não-Vista",
      flavor: "O corte já aconteceu quando alguém pensa em olhar.",
    },
    attack: {
      name: "Corte de Ausência",
      flavor: "Não retira carne: retira a parte que ninguém estava observando. O corpo percebe depois.",
    },
    heavy_attack: {
      name: "Fome do Vazio",
      flavor: "Abre um pedaço de não-observado do tamanho do alvo. Custa caro mirar no escuro.",
    },
    defend: {
      name: "Despercebido",
      flavor: "Deixa de ser notado. O golpe passa exatamente por onde ele já não está.",
    },
    heal: null,
  },

  rachador: {
    quick_attack: {
      name: "Trinca",
      flavor: "Uma fissura mínima na guarda. Não dói agora — dói no próximo golpe.",
    },
    attack: {
      name: "Ponto de Ruptura",
      flavor: "Estudou o padrão o combate inteiro só pra bater onde ele fecha mal.",
    },
    heavy_attack: {
      name: "Grande Fratura",
      flavor: "Quebra a simetria toda de uma vez. Se acertar, nada volta a ser o que era.",
    },
    defend: {
      name: "Postura Oblíqua",
      flavor: "Fica torto de propósito. Quem treinou pra acertar o certo erra o torto.",
    },
    heal: null,
  },
};

/** Conjunto de Artes da Ordem de um personagem. */
export function artsFor(characterClass: CharacterClass): Record<CombatStance, CombatArt | null> {
  return CLASS_COMBAT_ARTS[characterClass];
}

/** true se a Ordem tem uma Arte pra essa postura (ex: Guardião não tem cura). */
export function hasArt(characterClass: CharacterClass, stance: CombatStance): boolean {
  return CLASS_COMBAT_ARTS[characterClass][stance] !== null;
}

/**
 * Nome a exibir pra uma ação de `unit`. Criaturas do bestiário trazem seus
 * próprios nomes em `unit.arts` (um Lobo-de-Bruma não usa "Fome do Vazio",
 * ele dá um Bote Silencioso); sem isso, cai nas Artes da Ordem.
 */
export function artNameFor(unit: Pick<Character, "characterClass" | "arts">, action: CombatAction): string {
  const own = unit.arts?.[action];
  if (own) return own;

  if (action === "use_item") return "Item";
  return CLASS_COMBAT_ARTS[unit.characterClass][action]?.name ?? "Investida";
}
