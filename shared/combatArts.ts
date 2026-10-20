import type { CharacterClass } from "./types/characterClass";

/**
 * As Artes de combate: o nome e o que cada postura É, por classe. As do trio
 * vêm do repertório do cânone (`magia` §3.5 no repositório da história: o que
 * atração e repulsão faz em cada nível) e da aura do espadachim (§5); as das
 * Ordens (ver LORE.md §7) ficam só nas criaturas provisórias do Eälen.
 *
 * Toda Ordem tem as mesmas cinco posturas; o que muda é o que elas SÃO. Um
 * Guardião dobra a densidade local, um Cantor ajusta uma frequência, um
 * Rachador procura a falha do padrão — chamar tudo isso de "ataque pesado"
 * joga fora justamente o que diferencia as classes. Aqui ficam só o nome e
 * o que a Arte é no mundo; o que cada uma FAZ em combate (alcance, custo,
 * efeitos) é o kit da Ordem, em shared/tactics/abilities.ts — e lá cada
 * postura já faz uma coisa diferente em cada Ordem.
 *
 * Além das Artes, cada Ordem tem Técnicas (CLASS_TECHNIQUES): o que se
 * aprende subindo de nível.
 */

/** As cinco posturas que toda Ordem tem (menos as que o Princípio dela nega). */
export type CombatStance = "quick_attack" | "attack" | "heavy_attack" | "defend" | "heal";

export interface CombatArt {
  /** Nome exibido no botão e na narração ("Fulano usa Peso do Mundo!"). */
  name: string;
  /** O que a Arte é, no mundo — não o que ela faz em números. */
  flavor: string;
}

/**
 * Uma Técnica: o que uma Ordem ensina além das cinco Artes, e só a quem já
 * chegou no nível `level`. Como nas Artes, aqui ficam o nome e o que ela é no
 * mundo; o que FAZ está em shared/tactics/abilities.ts, pela mesma chave.
 */
export interface Technique extends CombatArt {
  level: number;
  /**
   * O nível de mago que ela pede, além do nível (`Character.mageLevel`, ver
   * ./mana.ts): o repertório de cada nível de mago (`magia` §3.5). Sem isto,
   * só o nível conta.
   */
  mage?: number;
}

/** Ordem de exibição das posturas, da mais segura à mais arriscada. */
export const STANCE_ORDER: CombatStance[] = ["quick_attack", "attack", "heavy_attack", "defend", "heal"];

/**
 * `null` em `heal` significa que a Ordem não cura — e não é falta de
 * conteúdo, é consequência do Princípio: gravidade não devolve, ausência
 * não preenche, e fratura não remenda.
 */
export const CLASS_COMBAT_ARTS: Record<CharacterClass, Record<CombatStance, CombatArt | null>> = {
  // Endyru: o que ele lê. Toda magia é recitada (sai no turno seguinte) e custa mana; o bordão, não.
  atracao_repulsao: {
    quick_attack: {
      name: "Puxão",
      flavor: "Um verso curto lido em voz alta, o mesmo de puxar o balde do poço. O outro vem dois passos.",
    },
    attack: {
      name: "Bordão",
      flavor: "A madeira do bordão, sem texto nenhum. Quem estuda também apanha na estrada.",
    },
    heavy_attack: {
      name: "Empurrão",
      flavor: "A repulsão de uma página inteira: o outro é jogado pra trás e cai pesado.",
    },
    defend: {
      name: "Guarda",
      flavor: "O bordão atravessado na frente do corpo. Dá tempo de tomar fôlego.",
    },
    heal: {
      name: "Cura",
      flavor: "O texto de primeiros socorros que toda escola ensina. Acelera o que o corpo faria sozinho, e o corpo cobra.",
    },
  },

  // Jarupã e Xanduí: a lâmina e a aura. A escola de cada um (Gryskar, Ipojy) é o que muda a luta.
  espadachim: {
    quick_attack: {
      name: "Golpe Rápido",
      flavor: "A ponta da lâmina antes do corpo. Fere pouco, mas não deixa o outro respirar.",
    },
    attack: {
      name: "Golpe",
      flavor: "A lâmina com a aura no fio. É o que sobra quando o resto falha.",
    },
    heavy_attack: {
      name: "Golpe Pesado",
      flavor: "A aura inteira num golpe só. Cansa, e leva um tempo pra vir de novo.",
    },
    defend: {
      name: "Guarda",
      flavor: "Lâmina na frente do corpo e o pé firme. Dá tempo de tomar fôlego.",
    },
    heal: null,
  },

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

/**
 * As Técnicas de cada Ordem, pela chave que o kit usa. Duas por Ordem: a
 * primeira chega cedo e diz o que a Ordem É além de bater e se guardar; a
 * segunda é o que ela faz que ninguém mais faz.
 */
export const CLASS_TECHNIQUES: Record<CharacterClass, Record<string, Technique>> = {
  // O que atração e repulsão faz no Círculo (`magia` §3.5): chega quando ele chega lá (`mage`), não com o nível.
  atracao_repulsao: {
    desarmar: {
      name: "Desarmar",
      flavor: "Atração na arma, não no corpo: o cabo escorrega da mão de quem a segurava.",
      level: 1,
      mage: 4,
    },
    arremesso: {
      name: "Arremesso",
      flavor: "Repulsão do tamanho de um círculo: o outro voa três passos e se arrebenta no que encontrar.",
      level: 1,
      mage: 4,
    },
  },

  // O golpe-selo de cada escola só vem por iniciação, a partir do grau 4: o trio não chega lá.
  espadachim: {},

  luminar: {
    muralha_de_prumo: {
      name: "Muralha de Prumo",
      flavor: "Fixa no ar um plano perfeitamente reto, na frente de quem precisa. O que é simétrico demais não se dobra.",
      level: 2,
    },
    antifona_de_aurora: {
      name: "Antífona de Aurora",
      flavor: "Responde ao próprio golpe com o golpe simétrico: o que a lâmina tirou de um lado volta do outro.",
      level: 4,
    },
  },

  entropista: {
    marca_de_decaimento: {
      name: "Marca de Decaimento",
      flavor: "Grava no alvo o selo do fim dele. A armadura passa a envelhecer sozinha.",
      level: 2,
    },
    lei_irreversivel: {
      name: "Lei Irreversível",
      flavor: "Trava o alvo no estado em que ele está. Enquanto a lei durar, nada nele se cura nem se restaura.",
      level: 5,
    },
  },

  cantor_de_ealen: {
    refrao_do_silencio: {
      name: "Refrão do Silêncio",
      flavor: "Sobrepõe à voz do alvo a onda invertida dela. O que ele tentar em seguida sai abafado.",
      level: 2,
    },
    coro_de_uma_voz_so: {
      name: "Coro de Uma Voz Só",
      flavor: "Multiplica a própria frequência até soar como muitos. Por algumas respirações, cada Arte ressoa em dobro.",
      level: 5,
    },
  },

  guardiao: {
    puxao_de_mare: {
      name: "Puxão de Maré",
      flavor: "Dobra por um instante a gravidade sob os pés do alvo. Ele cai, e o chão não o larga logo.",
      level: 2,
    },
    ancora_da_singularidade: {
      name: "Âncora da Singularidade",
      flavor: "Prende o próprio corpo às constantes do lugar. Enquanto durar, nada o move e tudo chega mais leve.",
      level: 5,
    },
  },

  sombrilico: {
    deixar_de_ser_notado: {
      name: "Deixar de Ser Notado",
      flavor: "Sai do campo do observável. Quem não é visto escolhe com calma onde o próximo corte entra.",
      level: 3,
    },
    corte_do_nao_dito: {
      name: "Corte do Não-Dito",
      flavor: "Acerta a parte do alvo que ninguém estava olhando — inclusive ele. Não há guarda pro que não se viu.",
      level: 6,
    },
  },

  rachador: {
    falha_no_padrao: {
      name: "Falha no Padrão",
      flavor: "Um golpe calculado contra a imperfeição que toda defesa previsível cria. A armadura não está onde ele entra.",
      level: 2,
    },
    simetria_quebrada: {
      name: "Simetria Quebrada",
      flavor: "Quebra o padrão do alvo de vez: cada golpe seguinte contra ele encontra uma abertura nova.",
      level: 4,
    },
  },
};

