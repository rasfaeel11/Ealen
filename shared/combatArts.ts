import type { CharacterClass } from "./types/characterClass";

/**
 * As Artes de combate: o nome e o que cada postura É, por classe. Vêm do
 * repertório do cânone (`magia` §3.5 no repositório da história: o que
 * atração e repulsão faz em cada nível) e da aura do espadachim (§5).
 *
 * Toda classe tem as mesmas cinco posturas; o que muda é o que elas SÃO: o
 * Puxão do mago é um verso, o golpe rápido do espadachim é a lâmina. Aqui
 * ficam só o nome e o que a Arte é no mundo; o que cada uma FAZ em combate
 * (alcance, custo, efeitos) é o kit da classe, em shared/tactics/abilities.ts.
 *
 * Além das Artes, uma classe pode ter Técnicas (CLASS_TECHNIQUES): o que se
 * aprende subindo de nível, ou de nível de mago.
 */

/** As cinco posturas que toda classe tem (menos as que ela não sabe: o espadachim não cura). */
export type CombatStance = "quick_attack" | "attack" | "heavy_attack" | "defend" | "heal";

export interface CombatArt {
  /** Nome exibido no botão e na narração ("Fulano usa Peso do Mundo!"). */
  name: string;
  /** O que a Arte é, no mundo — não o que ela faz em números. */
  flavor: string;
}

/**
 * Uma Técnica: o que uma classe ensina além das cinco Artes, e só a quem já
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

/** A ordem de exibição das posturas, da mais segura à mais arriscada. */
export const STANCE_ORDER: CombatStance[] = ["quick_attack", "attack", "heavy_attack", "defend", "heal"];

/** `null` numa postura significa que a classe não a tem: o espadachim não cura. */
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
};

/**
 * As Técnicas de cada classe, pela chave que o kit usa: o que ela faz além
 * das cinco Artes. As do mago chegam com o nível de mago (`mage`). A Disparada
 * e o Ajudar são de todo mundo, desde o começo: verbos de luta, não técnica.
 */
export const CLASS_TECHNIQUES: Record<CharacterClass, Record<string, Technique>> = {
  // O que atração e repulsão faz no Círculo (`magia` §3.5): chega quando ele chega lá (`mage`), não com o nível.
  atracao_repulsao: {
    disparada: {
      name: "Disparada",
      flavor: "O livro debaixo do braço e as pernas na frente. Estudante também corre.",
      level: 1,
    },
    ajudar: {
      name: "Ajudar",
      flavor: "Apontar a brecha, puxar a manga, gritar de que lado o outro vai cair.",
      level: 1,
    },
    vigiar: {
      name: "Vigiar",
      flavor: "O bordão em riste e o olho no caminho. Quem vier por ali chega na ponta dele.",
      level: 1,
    },
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
  espadachim: {
    disparada: {
      name: "Disparada",
      flavor: "A espada baixa e o corpo inteiro na corrida. Chega antes, e chega sem golpe.",
      level: 1,
    },
    ajudar: {
      name: "Ajudar",
      flavor: "O ombro no escudo do outro, a lâmina prendendo a dele: o golpe do companheiro entra.",
      level: 1,
    },
    vigiar: {
      name: "Vigiar",
      flavor: "A espada parada e o pé atrás. Quem atravessar a distância dela atravessa a lâmina primeiro.",
      level: 1,
    },
  },
};

