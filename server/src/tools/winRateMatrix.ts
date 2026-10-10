/**
 * Matriz de taxa de vitória, rodada pelo motor REAL do jogo: cada Ordem, no
 * nível 1, sozinha contra cada criatura do bestiário, numa arena aberta.
 *
 *     npm run balance:matrix --workspace=server
 *     npm run balance:matrix --workspace=server -- 100 lobo     (menos lutas, só uma criatura)
 *
 * Os dois lados são jogados pela IA do jogo (chooseCommand) — a criatura
 * com os pesos, o estilo, as manias, a mochila e o que ela veste no bestiário, o herói com os
 * pesos padrão, o equipamento de começo da Ordem e sem item. Um jogador de verdade joga melhor que a IA: os números não medem
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
 */
import {
  BESTIARY,
  CLASS_INFO,
  applyCommand,
  chooseCommand,
  createStartingAttributes,
  creatureQuirks,
  gridFromAscii,
  spawnCreature,
  startEncounter,
  startingEquipment,
  startingMaxHp,
  unitFromCharacter,
  type Character,
  type CharacterClass,
} from "@ealen/shared";

// `npm run balance:matrix --workspace=server -- 100 lobo` roda 100 lutas por célula, só contra as criaturas
// cujo id tem "lobo": é o jeito rápido de conferir uma mudança num lugar só.
const [countArg, filterArg] = process.argv.slice(2);
const N = Number(countArg) > 0 ? Math.floor(Number(countArg)) : 300;
/** Uma luta que passe disto não vai acabar: é contada como derrota e como empate eterno. */
const MAX_COMMANDS = 2000;

const ARENA = gridFromAscii(["............", "............", "P..........E", "............", "............"]);

function makePlayer(characterClass: CharacterClass): Character {
  const attributes = createStartingAttributes("althirim", characterClass);
  const maxHp = startingMaxHp(attributes);
  return {
    id: "hero",
    name: "Herói",
    race: "althirim",
    characterClass,
    level: 1,
    xp: 0,
    attributes,
    currentHp: maxHp,
    maxHp,
    currentNodeId: "n",
    // Vestido como quem começa naquela Ordem: é com a arma e a armadura dela que o kit foi pensado.
    equipment: startingEquipment(characterClass),
  };
}

interface FightResult {
  won: boolean;
  rounds: number;
  endless: boolean;
}

function fight(characterClass: CharacterClass, creatureId: string, seed: number): FightResult {
  const creature = BESTIARY[creatureId];
  const { encounter } = startEncounter({
    grid: ARENA.grid,
    units: [
      unitFromCharacter(makePlayer(characterClass), { team: "party", pos: ARENA.markers.P[0] }),
      unitFromCharacter(spawnCreature(creature), {
        team: "enemy",
        pos: ARENA.markers.E[0],
        ai: creature.ai,
        style: creature.style,
        quirks: creatureQuirks(creature, "hero"),
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

const header = ["Ordem".padEnd(28), ...creatures.map((id) => BESTIARY[id].template.name.slice(0, 14).padEnd(15))].join("");
console.log(header);
let endless = 0;
for (const characterClass of classes) {
  const cells = creatures.map((creatureId) => {
    let wins = 0;
    let rounds = 0;
    let stuck = 0;
    for (let seed = 1; seed <= N; seed++) {
      const result = fight(characterClass, creatureId, seed);
      if (result.won) wins++;
      if (result.endless) stuck++;
      rounds += result.rounds;
    }
    endless += stuck;
    // Um "!n" na célula diz ONDE estão as lutas que não acabaram.
    return `${Math.round((wins / N) * 100)}% / ${(rounds / N).toFixed(1)}r${stuck > 0 ? ` !${stuck}` : ""}`.padEnd(15);
  });
  console.log([CLASS_INFO[characterClass].name.padEnd(28), ...cells].join(""));
}
console.log(`\n(nivel 1, povo althirim, ${N} combates por celula, os dois lados jogados pela IA do jogo)`);
console.log(`lutas que nao acabaram: ${endless}`);
console.log("niveis das criaturas:", creatures.map((id) => `${BESTIARY[id].template.name}=${BESTIARY[id].template.level}`).join(", "));
