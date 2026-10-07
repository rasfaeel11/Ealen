import type { CharacterClass } from "./types/characterClass";

/**
 * As Artes de combate (ver LORE.md §7).
 *
 * Toda Ordem tem as mesmas cinco posturas; o que muda é o que elas SÃO. Um
 * Guardião dobra a densidade local, um Cantor ajusta uma frequência, um
 * Rachador procura a falha do padrão — chamar tudo isso de "ataque pesado"
 * joga fora justamente o que diferencia as classes. Aqui ficam só o nome e
 * o que a Arte é no mundo; o que cada uma FAZ em combate (alcance, custo,
 * efeitos) é montado em shared/tactics/abilities.ts.
 */

/** As cinco posturas que toda Ordem tem (menos as que o Princípio dela nega). */
export type CombatStance = "quick_attack" | "attack" | "heavy_attack" | "defend" | "heal";

export interface CombatArt {
  /** Nome exibido no botão e na narração ("Fulano usa Peso do Mundo!"). */
  name: string;
  /** O que a Arte é, no mundo — não o que ela faz em números. */
  flavor: string;
}

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

