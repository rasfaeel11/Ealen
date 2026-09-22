import { ATTRIBUTE_KEYS, type Attributes } from "./types/attributes";
import { RACE_MODIFIERS, type Race } from "./types/race";
import { CLASS_INFO, type CharacterClass } from "./types/characterClass";
import type { ConsumableItem, Inventory } from "./types/inventory";
import { MOCK_ITEMS } from "./mock/items";
import { TUNED_ATTRIBUTE_KEYS, classBaseline, type TunedAttributeKey } from "./iaTuning";

const STARTING_INVENTORY_MAX_SLOTS = 12;
const STARTING_ITEM_ID = "item-lagrima-de-eir";
const STARTING_ITEM_QUANTITY = 2;

const BASE_ATTRIBUTE_VALUE = 5;
/** Bônus aplicado a cada atributo primário da classe na criação. */
const PRIMARY_ATTRIBUTE_BONUS = 2;

/** Nenhum atributo de combate começa abaixo disso, por mais que a Ordem o despreze. */
const BASELINE_FLOOR = 3;

/**
 * Quanto da forma proposta pelo auto-tuner realmente entra: 0 mantém a regra
 * original (5 em tudo, +2 nos primários), 1 usa os números dele inteiros,
 * valores intermediários interpolam.
 *
 * Existe porque a importação tem um efeito colateral medido, não suposto:
 * rodando `npm run balance:matrix --workspace=server` antes e depois, as
 * Ordens deixaram de ficar todas na mesma faixa e se espalharam bastante
 * (contra o Servo Enferrujado, nível 4, o Luminar foi de 36% para 51% de
 * vitória e o Cantor de Eälen de 22% para 9%). Isso é o esperado — o tuner
 * inventou um tanque de verdade e um canhão de vidro de verdade onde antes
 * havia seis fichas quase iguais —, mas é também mais variação do que alguns
 * projetos querem, e ela não vem acompanhada de nenhuma garantia: o 50/50 do
 * tuner vale no modelo probabilístico dele, não no d20 daqui.
 *
 * Baixe este número se o espalhamento incomodar; a matriz de vitória mostra
 * o efeito de cada escolha.
 */
const BASELINE_BLEND = 1;

/** Valor de um atributo pela regra original: base fixa + bônus se for primário da Ordem. */
function flatBaseValue(key: keyof Attributes, characterClass: CharacterClass): number {
  const isPrimary = CLASS_INFO[characterClass].primaryAttributes.includes(key);
  return BASE_ATTRIBUTE_VALUE + (isPrimary ? PRIMARY_ATTRIBUTE_BONUS : 0);
}

function isTunedKey(key: keyof Attributes): key is TunedAttributeKey {
  return (TUNED_ATTRIBUTE_KEYS as readonly string[]).includes(key);
}

/**
 * Fator que traz a escala do auto-tuner (valores de ~3 a ~15) pra escala de
 * pontos do jogo, calculado uma vez a partir dos próprios dados: a soma dos
 * cinco atributos de combate, somada sobre as seis Ordens, passa a valer
 * exatamente o que a regra original gastava no total.
 *
 * A escolha de normalizar pelo TOTAL das seis, e não Ordem por Ordem, é
 * deliberada: o tuner não só redistribuiu pontos dentro de cada classe, ele
 * também concluiu que algumas precisam de mais pontos brutos que outras pra
 * empatar (o Sombrílico soma ~50 contra ~41 do Cantor). Normalizar cada uma
 * pro mesmo total jogaria fora metade do resultado.
 *
 * `null` quando não há artefato válido — aí vale a regra original inteira.
 */
const BASELINE_SCALE: number | null = (() => {
  const classes = Object.keys(CLASS_INFO) as CharacterClass[];
  let gameBudget = 0;
  let tunedTotal = 0;

  for (const characterClass of classes) {
    const baseline = classBaseline(characterClass);
    if (!baseline) return null;
    for (const key of TUNED_ATTRIBUTE_KEYS) {
      gameBudget += flatBaseValue(key, characterClass);
      tunedTotal += baseline[key];
    }
  }

  return tunedTotal > 0 ? gameBudget / tunedTotal : null;
})();

/**
 * Atributos iniciais de um personagem novo: base da Ordem + modificador racial.
 *
 * A base dos cinco atributos de combate vem do auto-tuner do projeto irmão
 * `ealen-IA` (ver shared/iaTuning.ts), reescalada pro orçamento do jogo — é
 * o que diferencia numericamente as seis Ordens no nível 1, em vez de todas
 * saírem com 5 em tudo e +2 nos primários. Len e Ul continuam na regra
 * original: aquele simulador não os modela, porque lá nada fora de combate
 * existe.
 *
 * O que o tuner garante é 50/50 no MODELO DELE (probabilidade direta, sem
 * d20). O motor daqui é outro — d20 contra 10+Or, bloqueio, crítico natural
 * —, então isto é um ponto de partida informado, não um balanceamento
 * provado. Ajustar à mão em cima destes números é esperado.
 */
export function createStartingAttributes(race: Race, characterClass: CharacterClass): Attributes {
  const attributes = {} as Attributes;
  const raceModifier = RACE_MODIFIERS[race];
  const baseline = BASELINE_SCALE === null ? null : classBaseline(characterClass);

  for (const key of ATTRIBUTE_KEYS) {
    const flat = flatBaseValue(key, characterClass);
    const base =
      baseline && isTunedKey(key)
        ? Math.max(BASELINE_FLOOR, Math.round(flat + (baseline[key] * BASELINE_SCALE! - flat) * BASELINE_BLEND))
        : flat;

    attributes[key] = base + (raceModifier[key] ?? 0);
  }

  return attributes;
}

/** HP máximo inicial, derivado de Nath (Vitalidade). */
export function startingMaxHp(attributes: Attributes): number {
  return 20 + attributes.nath * 4;
}

/** Mochila inicial de um personagem novo: algumas Lágrimas de Eir pra já dar pra testar o sistema de itens. */
export function createStartingInventory(): Inventory<ConsumableItem> {
  const startingItem = MOCK_ITEMS.find((item) => item.id === STARTING_ITEM_ID);
  if (!startingItem) {
    return { slots: [], maxSlots: STARTING_INVENTORY_MAX_SLOTS };
  }

  return {
    maxSlots: STARTING_INVENTORY_MAX_SLOTS,
    slots: [{ slotIndex: 0, item: structuredClone(startingItem), quantity: STARTING_ITEM_QUANTITY }],
  };
}
