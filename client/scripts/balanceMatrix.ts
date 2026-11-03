/**
 * Matriz de taxa de vitória, rodada pelo motor REAL do jogo: cada classe do
 * trio, no nível 1, sozinha contra cada criatura do
 * bestiário, numa arena aberta. O mago entra com a magia de Endyru.
 *
 *     npm run balance:matrix
 *     npm run balance:matrix -- 100 ymboripe (menos lutas, só umas criaturas)
 *     npm run balance:matrix -- --nos 100 (cada nó da árvore, contra quem não o tem)
 *
 * Os dois lados são jogados pela IA do jogo (chooseCommand) — a criatura
 * com os pesos, o estilo, as manias, a mochila e o que ela veste no bestiário, o herói com os
 * pesos padrão, o equipamento de começo da classe e sem item. Um jogador de verdade joga melhor que a IA: os números não medem
 * dificuldade, servem pra comparar ANTES e DEPOIS de mexer em atributos,
 * habilidades, no bestiário ou na própria IA.
 *
 * Cada célula é "vitórias do herói / rodadas em média". Luta que não acaba
 * conta como derrota, aparece na célula como "!n" e no total do rodapé: se esse número não for
 * zero, alguma combinação empata pra sempre (dois lados que se curam mais do
 * que se ferem, por exemplo) e isso é defeito a consertar.
 *
 * As lutas usam seeds fixas (1 a N): rodar duas vezes sem mudar nada dá a
 * mesma tabela, e qualquer diferença é efeito da mudança, não do dado.
 *
 * Com `--nos`, a tabela é da árvore de habilidades (ver ../../shared/skillTree.ts):
 * uma linha por nó, com a pessoa ainda no nível 1 e só aquele nó aprendido, e
 * em cada célula a vitória e quanto ela mudou (em pontos) contra a mesma pessoa
 * sem nó nenhum. O espadachim entra uma vez por escola do trio (Gryskar com a
 * Ombrada de Jarupã, Ipojy com o Segurar o Bote de Xanduí), com o ramo dela; o
 * mago, na Página e, pros nós que pedem o Círculo, no Círculo. É o que acha o
 * nó que vale demais (ou nada).
 */
import {
  BESTIARY,
  CLASS_INFO,
  COMPANIONS,
  PROTAGONIST,
  applyCommand,
  branchesFor,
  chooseCommand,
  createStartingAttributes,
  creaturePlacement,
  gridFromAscii,
  spawnCreature,
  startEncounter,
  startingEquipment,
  startingMaxHp,
  unitFromCharacter,
  type Character,
  type CharacterClass,
  type SkillNode,
  type Unit,
  type UnitPlacement,
} from "@jogo/shared";

// `npm run balance:matrix -- 100 ymboripe` roda 100 lutas por célula, só contra as criaturas
// cujo id tem "ymboripe": é o jeito rápido de conferir uma mudança num lugar só.
const args = process.argv.slice(2);
const byNode = args.includes("--nos");
const [countArg, filterArg] = args.filter((arg) => arg !== "--nos");
const N = Number(countArg) > 0 ? Math.floor(Number(countArg)) : byNode ? 100 : 300;
/** Uma luta que passe disto não vai acabar: é contada como derrota e como empate eterno. */
const MAX_COMMANDS = 2000;
/** O nível de mago do Círculo, onde moram o Desarmar, o Arremesso e os nós deles. */
const CIRCLE = 4;

const ARENA = gridFromAscii(["............", "............", "P..........E", "............", "............"]);

function makePlayer(characterClass: CharacterClass): Character {
  const attributes = createStartingAttributes("humano", characterClass);
  const maxHp = startingMaxHp(attributes);
  return {
    id: "hero",
    name: "Herói",
    race: "humano",
    characterClass,
    level: 1,
    xp: 0,
    attributes,
    currentHp: maxHp,
    maxHp,
    // Vestido como quem começa naquela classe: é com a arma e a armadura dela que o kit foi pensado.
    equipment: startingEquipment(characterClass),
  };
}

/**
 * Quem luta pelo herói. Só com a classe, a classe pura (o mago com a magia de
 * Endyru, na Página). `mage` põe o mago noutro nível; `as`, a escola, a aura e
 * o dom de quem é do trio; `skills`, os nós aprendidos.
 */
interface Hero {
  characterClass: CharacterClass;
  mage?: number;
  /** A chave do companheiro de quem se copia a escola, a aura e o dom. */
  as?: string;
  skills?: string[];
}

const NODES = new Map<string, SkillNode>();

function heroUnit(hero: Hero): Unit {
  const character = makePlayer(hero.characterClass);
  const casts = hero.characterClass === PROTAGONIST.characterClass;
  const mage = hero.mage ?? PROTAGONIST.magic!.level;
  if (casts) character.mageLevel = mage;
  if (hero.skills?.length) {
    // Aprendido à força, sem pedir nível nem ponto: é o nó sozinho que se mede. A vida que ele dá entra na ficha.
    character.skills = [...hero.skills];
    for (const id of hero.skills) {
      const hp = NODES.get(id)?.passive?.maxHp ?? 0;
      character.maxHp += hp;
      character.currentHp += hp;
    }
  }
  const member = hero.as ? COMPANIONS[hero.as] : undefined;
  const placement: UnitPlacement = {
    team: "party",
    pos: ARENA.markers.P[0],
    // O mago luta com a magia de Endyru: sem ela, não tem mana pra nada além do bordão.
    ...(casts ? { magic: { ...PROTAGONIST.magic!, level: mage } } : {}),
    ...(member?.style ? { style: member.style, aura: member.aura, gifts: member.gifts } : {}),
  };
  return unitFromCharacter(character, placement);
}

interface FightResult {
  won: boolean;
  rounds: number;
  endless: boolean;
}

function fight(hero: Hero, creatureId: string, seed: number): FightResult {
  const creature = BESTIARY[creatureId];
  const { encounter } = startEncounter({
    grid: ARENA.grid,
    units: [
      heroUnit(hero),
      unitFromCharacter(spawnCreature(creature), {
        team: "enemy",
        pos: ARENA.markers.E[0],
        ...creaturePlacement(creature, "hero"),
      }),
    ],
    seed,
  });

  for (let i = 0; i < MAX_COMMANDS && !encounter.winner; i++) {
    const command = chooseCommand(encounter);
    if (!applyCommand(encounter, command).ok) throw new Error(`a IA pediu o impossível: ${JSON.stringify(command)}`);
  }
  return { won: encounter.winner === "party", rounds: encounter.round, endless: !encounter.winner };
}

const creatures = Object.keys(BESTIARY).filter((id) => !filterArg || id.includes(filterArg));
const classes = Object.keys(CLASS_INFO) as CharacterClass[];

interface Cell {
  wins: number;
  rounds: number;
  stuck: number;
}

let endless = 0;

/** As N lutas de `hero` contra `creatureId`. */
function cell(hero: Hero, creatureId: string): Cell {
  const out: Cell = { wins: 0, rounds: 0, stuck: 0 };
  for (let seed = 1; seed <= N; seed++) {
    const result = fight(hero, creatureId, seed);
    if (result.won) out.wins++;
    if (result.endless) out.stuck++;
    out.rounds += result.rounds;
  }
  endless += out.stuck;
  return out;
}

const percent = (c: Cell) => Math.round((c.wins / N) * 100);
// Um "!n" na célula diz ONDE estão as lutas que não acabaram.
const stuckMark = (c: Cell) => (c.stuck > 0 ? ` !${c.stuck}` : "");
const row = (label: string, cells: string[]) => console.log([label.slice(0, 27).padEnd(28), ...cells.map((text) => text.padEnd(15))].join(""));

/** Cada pessoa que a árvore distingue, com os nós que ela vê e que se medem nela. */
function people(): { label: string; hero: Hero; nodes: SkillNode[] }[] {
  const out: { label: string; hero: Hero; nodes: SkillNode[] }[] = [];
  for (const characterClass of classes) {
    const name = CLASS_INFO[characterClass].name;
    if (characterClass === PROTAGONIST.characterClass) {
      const nodes = branchesFor(characterClass, undefined).flatMap((b) => b.nodes);
      // O que pede o Círculo se mede no Círculo, contra o Círculo sem nó; o resto, na Página.
      out.push({ label: `${name} (Página)`, hero: { characterClass }, nodes: nodes.filter((node) => node.mage === undefined) });
      out.push({ label: `${name} (Círculo)`, hero: { characterClass, mage: CIRCLE }, nodes: nodes.filter((node) => node.mage !== undefined) });
      continue;
    }
    for (const as of ["jarupa", "xandui"]) {
      const school = COMPANIONS[as].style!.id;
      out.push({ label: `${name} (${school})`, hero: { characterClass, as }, nodes: branchesFor(characterClass, school).flatMap((b) => b.nodes) });
    }
  }
  for (const { nodes } of out) for (const node of nodes) NODES.set(node.id, node);
  return out.filter((person) => person.nodes.length > 0);
}

row("Classe", creatures.map((id) => BESTIARY[id].template.name.slice(0, 14)));
if (!byNode) {
  for (const characterClass of classes) {
    row(
      CLASS_INFO[characterClass].name,
      creatures.map((creatureId) => {
        const c = cell({ characterClass }, creatureId);
        return `${percent(c)}% / ${(c.rounds / N).toFixed(1)}r${stuckMark(c)}`;
      }),
    );
  }
} else {
  for (const { label, hero, nodes } of people()) {
    const base = creatures.map((creatureId) => cell(hero, creatureId));
    row(label, base.map((c) => `${percent(c)}%${stuckMark(c)}`));
    for (const node of nodes) {
      row(
        `  ${node.name}`,
        creatures.map((creatureId, i) => {
          const c = cell({ ...hero, skills: [node.id] }, creatureId);
          const delta = percent(c) - percent(base[i]);
          return `${percent(c)}% (${delta >= 0 ? "+" : ""}${delta})${stuckMark(c)}`;
        }),
      );
    }
  }
}
console.log(`\n(nivel 1, humano, ${N} combates por celula, os dois lados jogados pela IA do jogo${byNode ? "; cada no sozinho, aprendido a forca" : ""})`);
console.log(`lutas que nao acabaram: ${endless}`);
console.log("niveis das criaturas:", creatures.map((id) => `${BESTIARY[id].template.name}=${BESTIARY[id].template.level}`).join(", "));
