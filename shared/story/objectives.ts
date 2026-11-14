/**
 * O OBJETIVO DE AGORA: o próximo passo do caminho principal da história, numa
 * linha, pra quem joga não ficar perdido. Não é cânone novo: só diz aonde ir e o
 * que fazer, com os nomes que o jogo já mostra. O primeiro da lista cuja condição
 * vale é o de agora (ver currentObjective).
 *
 * `area` e `tile` são o lugar do passo: o minimapa marca o ponto, se o grupo está
 * na área, ou a saída que leva até lá. Os quadrados são os dos mapas do Tiled
 * (client/public/maps): o gatilho, o objeto ou a pessoa daquele passo.
 */

/** Lê uma variável da história (ou uma condição de mapa, como `party:jarupa`). */
type FlagReader = (name: string) => unknown;

export interface Objective {
  id: string;
  text: string;
  area: string;
  tile: { x: number; y: number };
}

interface Step extends Objective {
  when: (flag: (name: string) => boolean) => boolean;
}

const STEPS: Step[] = [
  {
    id: "pedagio",
    when: (f) => !f("pedagio_resolvido") && !f("chegou"),
    text: "Passe pela corrente do pedágio: pague, discuta com o sargento ou solte o guincho do cais.",
    area: "ymonha",
    tile: { x: 19, y: 11 },
  },
  {
    id: "descer",
    when: (f) => !f("chegou"),
    text: "Fale com Oryndu no barco e desça o rio até Ybytuguá.",
    area: "ymonha",
    tile: { x: 24, y: 14 },
  },
  {
    id: "quadro",
    when: (f) => !f("contrato") && !f("leu_edital"),
    text: "Suba até a Mesa dos Contratos, no alto da cidade, e leia o quadro.",
    area: "ybytugua",
    tile: { x: 22, y: 4 },
  },
  {
    id: "conselheira",
    when: (f) => !f("contrato"),
    text: "Fale com a conselheira, na Mesa dos Contratos.",
    area: "ybytugua",
    tile: { x: 20, y: 6 },
  },
  {
    id: "primeira",
    when: (f) => !f("ato2"),
    text: "Vá aos baixios, pela saída leste da cidade, e procure o Ykuruã.",
    area: "baixios",
    tile: { x: 11, y: 1 },
  },
  {
    id: "margem",
    when: (f) => !f("circulo"),
    text: "Na margem dos baixios, espere com Oryndu.",
    area: "baixios",
    tile: { x: 1, y: 5 },
  },
  {
    id: "ponte",
    when: (f) => !f("castelao_vencido"),
    text: "Descubra quem acorda o bicho: pela estrada do norte, atravesse a floresta entre as bacias até a ponte do afluente.",
    area: "floresta",
    tile: { x: 6, y: 10 },
  },
  {
    id: "chamado",
    when: (f) => !f("ato3"),
    text: "Volte a Ybytuguá e fale com a conselheira.",
    area: "ybytugua",
    tile: { x: 20, y: 6 },
  },
  {
    id: "cheia",
    when: (f) => !f("ykurua_morto"),
    text: "A cheia está no alto. Vá aos baixios e enfrente o Ykuruã. Se quiser, prepare a margem antes.",
    area: "baixios",
    tile: { x: 11, y: 1 },
  },
  {
    id: "relatorio",
    when: () => true,
    text: "Volte à Mesa dos Contratos, em Ybytuguá, com o relatório.",
    area: "ybytugua",
    tile: { x: 20, y: 10 },
  },
];

/** O passo de agora do caminho principal, pelo que a história já marcou. */
export function currentObjective(flag: FlagReader): Objective {
  const truthy = (name: string) => {
    const value = flag(name);
    return value === true || (typeof value === "number" && value > 0) || (typeof value === "string" && value !== "");
  };
  const step = STEPS.find((candidate) => candidate.when(truthy)) ?? STEPS[STEPS.length - 1];
  const { when: _when, ...objective } = step;
  return objective;
}

/** Todos os passos, na ordem (os testes conferem que cada lugar existe no mapa). */
export const OBJECTIVE_STEPS: readonly Objective[] = STEPS.map(({ when: _when, ...objective }) => objective);
