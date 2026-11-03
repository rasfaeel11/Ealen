import type { StyleId } from "./tactics/styles";
import type { Ability } from "./tactics/types";
import type { Character } from "./types/character";
import type { CharacterClass } from "./types/characterClass";

/**
 * A árvore de habilidades: o que se ESCOLHE aprender subindo de nível.
 *
 * Cada nível depois do primeiro dá um ponto (`skillPoints`), e cada nó custa
 * um. Os nós moram em ramos, e dentro de um ramo cada um pede o anterior: é
 * uma escada por ramo, e o jogador escolhe em que escada sobe. Um nó pode pedir
 * também um nível, o nível de mago (o que só existe no Círculo) ou uma escola
 * de espada (o ramo da escola de cada um).
 *
 * Nenhum nó é técnica nova do mundo: é o que a pessoa já sabe, feito melhor.
 * Um nó mexe numa habilidade que ela já tem (`tweak`, pelo id: alcance, acerto,
 * custo, recarga, o quanto empurra ou puxa, o quanto dura a condição, o peso do
 * dano) ou no corpo dela (`passive`: vida, Fôlego, passo, gravações). Golpe-selo
 * e repertório novo de mago ficam de fora: o primeiro só vem por iniciação, e o
 * segundo vem com o nível de mago (ver CLASS_TECHNIQUES em ./combatArts.ts).
 *
 * Os nomes e os números são PROVISÓRIOS: os nomes esperam o autor (§1 do
 * AGENTS.md), os números o `balance:matrix`. Mexer na árvore é editar dados aqui.
 */

/** O que um nó muda numa habilidade. Tudo soma ao que ela já tem; custo nunca cai abaixo de 1. */
export interface AbilityTweak {
  range?: number;
  toHit?: number;
  mana?: number;
  breath?: number;
  cooldown?: number;
  /** Soma ao tamanho de todo empurrão (ou puxão) dela, sem mudar o sentido. */
  push?: number;
  /** Soma à duração de toda condição que ela põe. */
  turns?: number;
  /** Soma ao multiplicador de todo dano dela (sem multiplicador, 1). */
  multiplier?: number;
}

/** O que um nó muda no corpo de quem o aprende. */
export interface SkillPassive {
  /** Vida máxima: entra na ficha na hora de aprender. */
  maxHp?: number;
  /** Fôlego máximo (ver ./breath.ts). */
  breath?: number;
  /** Quadrados a mais de passo na luta. */
  speed?: number;
  /** Gravações a mais no descanso (ver engravingSlots em ./world/field.ts). */
  engravings?: number;
}

export interface SkillNode {
  id: string;
  name: string;
  /** O que o nó é, no mundo — não o que faz em números (isso o `describeSkill` diz). */
  flavor: string;
  /** O ramo em que ele mora; dentro do ramo, a ordem do array é a escada. */
  branch: string;
  /** O nível que ele pede. Sem isto, qualquer um. */
  level?: number;
  /** O nível de mago que ele pede (o Círculo é 4). */
  mage?: number;
  /** A escola de espada de quem pode aprendê-lo. */
  school?: StyleId;
  /** As habilidades que ele melhora, pelo id. */
  tweaks?: Record<string, AbilityTweak>;
  passive?: SkillPassive;
}

export interface SkillBranch {
  id: string;
  name: string;
  /** Só quem é desta escola vê o ramo. */
  school?: StyleId;
  nodes: SkillNode[];
}

type BranchSpec = Omit<SkillBranch, "nodes"> & { nodes: Omit<SkillNode, "branch" | "school">[] };

function branch(spec: BranchSpec): SkillBranch {
  return { ...spec, nodes: spec.nodes.map((node) => ({ ...node, branch: spec.id, ...(spec.school ? { school: spec.school } : {}) })) };
}

const AR = "atracao_repulsao";
const ES = "espadachim";

/** As árvores de cada classe. O espadachim divide os dois primeiros ramos; o terceiro é o da escola de cada um. */
export const SKILL_TREES: Record<CharacterClass, SkillBranch[]> = {
  // Endyru: controle e preparo. O ramo do Preparo é o que o jogo ensina: quem prepara vence quem tem pressa.
  atracao_repulsao: [
    branch({
      id: "atracao",
      name: "Atração",
      nodes: [
        {
          id: "ar.puxao_longe",
          name: "Verso de Longe",
          flavor: "O mesmo verso do balde do poço, lido com a voz mais alta. Alcança quem está do outro lado do barranco.",
          tweaks: { [`${AR}.quick_attack`]: { range: 1 } },
        },
        {
          id: "ar.puxao_fundo",
          name: "Puxão Fundo",
          flavor: "Ele aprendeu a não soltar no fim da linha. O outro vem um passo a mais.",
          level: 3,
          tweaks: { [`${AR}.quick_attack`]: { push: 1 } },
        },
        {
          id: "ar.desarmar_firme",
          name: "Cabo Escorregadio",
          flavor: "A atração fica no cabo depois do texto. A mão que pega de volta escorrega de novo.",
          mage: 4,
          tweaks: { [`${AR}.desarmar`]: { turns: 1 } },
        },
      ],
    }),
    branch({
      id: "repulsao",
      name: "Repulsão",
      nodes: [
        {
          id: "ar.empurrao_certo",
          name: "Página Certa",
          flavor: "Ele parou de folhear na hora de ler. A página inteira acerta onde ele olhou.",
          tweaks: { [`${AR}.heavy_attack`]: { toHit: 1 } },
        },
        {
          id: "ar.empurrao_longe",
          name: "Empurrão Largo",
          flavor: "A repulsão vai até o fim do fôlego dele. O outro cai um passo mais longe, e o que estiver lá atrás sente.",
          level: 3,
          tweaks: { [`${AR}.heavy_attack`]: { push: 1 } },
        },
        {
          id: "ar.arremesso_pesado",
          name: "Arremesso Pesado",
          flavor: "O círculo inteiro atrás de um corpo só. Quem voa cai pior.",
          mage: 4,
          tweaks: { [`${AR}.arremesso`]: { multiplier: 0.3 } },
        },
      ],
    }),
    branch({
      id: "preparo",
      name: "Preparo",
      nodes: [
        {
          id: "ar.leitura_calma",
          name: "Leitura Sem Pressa",
          flavor: "O texto de primeiros socorros lido devagar, palavra por palavra. Gasta menos de quem lê.",
          tweaks: { [`${AR}.heal`]: { mana: -1 } },
        },
        {
          id: "ar.folego_de_estudante",
          name: "Fôlego de Biblioteca",
          flavor: "Anos lendo em voz alta pra sala vazia. O ar dura mais.",
          level: 3,
          passive: { breath: 2 },
        },
        {
          id: "ar.mais_um_texto",
          name: "Mais um Texto",
          flavor: "Giz no bolso, corda medida duas vezes. Cabe mais uma gravação antes da luta.",
          level: 4,
          passive: { engravings: 1 },
        },
      ],
    }),
  ],

  espadachim: [
    branch({
      id: "lamina",
      name: "Lâmina",
      nodes: [
        {
          id: "es.golpe_firme",
          name: "Pulso Firme",
          flavor: "A lâmina para onde o olho parou, sem tremer no fim.",
          tweaks: { [`${ES}.attack`]: { toHit: 1 } },
        },
        {
          id: "es.ponta_funda",
          name: "Ponta Funda",
          flavor: "O golpe rápido deixa de ser só pra incomodar.",
          level: 3,
          tweaks: { [`${ES}.quick_attack`]: { multiplier: 0.2 } },
        },
        {
          id: "es.pesado_leve",
          name: "Peso Sem Esforço",
          flavor: "A aura inteira num golpe só, e o corpo já não reclama tanto.",
          level: 4,
          tweaks: { [`${ES}.heavy_attack`]: { breath: -1 } },
        },
      ],
    }),
    branch({
      id: "corpo",
      name: "Corpo",
      nodes: [
        {
          id: "es.couro_grosso",
          name: "Couro de Estrada",
          flavor: "Cada escolta deixa uma cicatriz, e a cicatriz segura melhor que a pele.",
          passive: { maxHp: 4 },
        },
        {
          id: "es.folego_longo",
          name: "Fôlego Longo",
          flavor: "Remar contra a corrente o dia inteiro ensina a respirar.",
          level: 3,
          passive: { breath: 2 },
        },
        {
          id: "es.pe_leve",
          name: "Pé de Convés",
          flavor: "Quem anda em barco que sacode anda em qualquer chão.",
          level: 4,
          passive: { speed: 1 },
        },
      ],
    }),
    branch({
      id: "gryskar",
      name: "Gryskar",
      school: "gryskar",
      nodes: [
        {
          id: "es.ombrada_pronta",
          name: "Ombro Pronto",
          flavor: "O ombro já vai antes de ele pensar em ir.",
          tweaks: { "gift.shoulder": { cooldown: -1 } },
        },
        {
          id: "es.ombrada_funda",
          name: "Ombrada Funda",
          flavor: "Quem leva o ombro dele anda dois passos sem querer.",
          level: 4,
          tweaks: { "gift.shoulder": { push: 1 } },
        },
      ],
    }),
    branch({
      id: "ipojy",
      name: "Ipojy",
      school: "ipojy",
      nodes: [
        {
          id: "es.bote_longo",
          name: "Mão Que Não Solta",
          flavor: "O braço que mostrou onde ia estar fica preso ali mais um pouco.",
          tweaks: { "gift.hold_the_lunge": { turns: 1 } },
        },
        {
          id: "es.bote_leve",
          name: "Segurar Sem Cansar",
          flavor: "Ela segura como quem segura a corda do barco: sem força a mais que a precisa.",
          level: 4,
          tweaks: { "gift.hold_the_lunge": { breath: -1 } },
        },
      ],
    }),
  ],
};

const ALL_NODES = new Map(Object.values(SKILL_TREES).flatMap((branches) => branches.flatMap((b) => b.nodes.map((node) => [node.id, node] as const))));

export function findSkill(id: string): SkillNode | undefined {
  return ALL_NODES.get(id);
}

/** Os ramos que `characterClass` mostra a quem é da escola `school` (o da escola dos outros, não). */
export function branchesFor(characterClass: CharacterClass, school: StyleId | undefined): SkillBranch[] {
  return SKILL_TREES[characterClass].filter((b) => b.school === undefined || b.school === school);
}

/** Os nós que a ficha aprendeu, os que ainda existem. */
function learnedNodes(character: Pick<Character, "skills">): SkillNode[] {
  return (character.skills ?? []).flatMap((id) => {
    const node = findSkill(id);
    return node ? [node] : [];
  });
}

/** Os pontos que `character` ainda tem pra gastar: um por nível depois do primeiro, menos o que já aprendeu. */
export function skillPoints(character: Pick<Character, "level" | "skills">): number {
  return Math.max(0, character.level - 1 - learnedNodes(character).length);
}

/** O quanto do corpo os nós aprendidos somam, numa medida. */
export function skillPassive(character: Pick<Character, "skills">, key: keyof SkillPassive): number {
  return learnedNodes(character).reduce((sum, node) => sum + (node.passive?.[key] ?? 0), 0);
}

function sumCost(value: number | undefined, delta: number | undefined): number | undefined {
  if (value === undefined || delta === undefined) return value;
  return Math.max(1, value + delta);
}

/** `ability` com um tweak por cima. */
export function tweakAbility(ability: Ability, tweak: AbilityTweak): Ability {
  const out: Ability = { ...ability, effects: ability.effects.map((effect) => ({ ...effect })) };
  if (tweak.range) out.range = Math.max(1, out.range + tweak.range);
  if (tweak.toHit && out.attack) out.attack = { toHit: out.attack.toHit + tweak.toHit };
  out.mana = sumCost(out.mana, tweak.mana);
  out.breath = sumCost(out.breath, tweak.breath);
  if (tweak.cooldown && out.cooldown !== undefined) {
    const cooldown = out.cooldown + tweak.cooldown;
    if (cooldown > 0) out.cooldown = cooldown;
    else delete out.cooldown;
  }
  if (out.mana === undefined) delete out.mana;
  if (out.breath === undefined) delete out.breath;
  out.effects = out.effects.map((effect) => {
    if (effect.kind === "push" && tweak.push) return { ...effect, distance: effect.distance + Math.sign(effect.distance) * tweak.push };
    if (effect.kind === "status" && tweak.turns) return { ...effect, turns: effect.turns + tweak.turns };
    if (effect.kind === "damage" && tweak.multiplier) return { ...effect, multiplier: (effect.multiplier ?? 1) + tweak.multiplier };
    return effect;
  });
  return out;
}

/** As habilidades de `character` com o que a árvore dele melhorou. A que nenhum nó toca sai como entrou. */
export function withSkills(character: Pick<Character, "skills">, abilities: readonly Ability[]): Ability[] {
  const nodes = learnedNodes(character);
  if (nodes.length === 0) return [...abilities];
  return abilities.map((ability) =>
    nodes.reduce((current, node) => {
      const tweak = node.tweaks?.[ability.id];
      return tweak ? tweakAbility(current, tweak) : current;
    }, ability),
  );
}

/** Por que `node` ainda não se aprende: o que falta, na ordem em que o jogador o resolveria. Undefined = pode. */
export type SkillRefusal = "known" | "school" | "previous" | "level" | "mage" | "points";

export function skillRefusal(
  character: Pick<Character, "level" | "skills" | "characterClass">,
  node: SkillNode,
  context: { school?: StyleId; mageLevel?: number },
): SkillRefusal | undefined {
  const known = new Set(character.skills ?? []);
  if (known.has(node.id)) return "known";
  const owner = SKILL_TREES[character.characterClass].find((b) => b.id === node.branch);
  if (!owner || (node.school !== undefined && node.school !== context.school)) return "school";
  const index = owner.nodes.findIndex((other) => other.id === node.id);
  if (index > 0 && !known.has(owner.nodes[index - 1].id)) return "previous";
  if (node.level !== undefined && character.level < node.level) return "level";
  if (node.mage !== undefined && (context.mageLevel ?? 0) < node.mage) return "mage";
  if (skillPoints(character) < 1) return "points";
  return undefined;
}

/** O que um nó faz, em números, pra ficha. `names` dá o nome de cada habilidade pelo id. */
export function describeSkill(node: SkillNode, names: (abilityId: string) => string | undefined): string {
  const parts: string[] = [];
  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  for (const [abilityId, tweak] of Object.entries(node.tweaks ?? {})) {
    const name = names(abilityId) ?? "uma habilidade que ainda não sabe";
    const bits: string[] = [];
    if (tweak.range) bits.push(`${signed(tweak.range)} de alcance`);
    if (tweak.toHit) bits.push(`${signed(tweak.toHit)} de acerto`);
    if (tweak.mana) bits.push(`${signed(tweak.mana)} de mana`);
    if (tweak.breath) bits.push(`${signed(tweak.breath)} de Fôlego`);
    if (tweak.cooldown) bits.push(`${signed(tweak.cooldown)} de recarga`);
    if (tweak.push) bits.push(`${signed(tweak.push)} quadrado${Math.abs(tweak.push) > 1 ? "s" : ""} no empurrão ou no puxão`);
    if (tweak.turns) bits.push(`${signed(tweak.turns)} turno${Math.abs(tweak.turns) > 1 ? "s" : ""} na condição`);
    if (tweak.multiplier) bits.push(`${signed(Math.round(tweak.multiplier * 100))}% de dano`);
    parts.push(`${name}: ${bits.join(", ")}.`);
  }
  const passive = node.passive ?? {};
  if (passive.maxHp) parts.push(`${signed(passive.maxHp)} de vida máxima.`);
  if (passive.breath) parts.push(`${signed(passive.breath)} de Fôlego máximo.`);
  if (passive.speed) parts.push(`${signed(passive.speed)} quadrado de passo na luta.`);
  if (passive.engravings) parts.push(`${signed(passive.engravings)} gravação no descanso.`);
  return parts.join("\n");
}
