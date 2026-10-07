/**
 * Matriz de taxa de vitória, rodada pelo motor REAL do jogo: cada Ordem, no
 * nível 1, sozinha contra cada criatura do bestiário, numa arena aberta.
 *
 *     npm run balance:matrix --workspace=server
 *
 * Os dois lados são jogados pela IA provisória (basicCommand): bate em quem
 * alcança, senão anda até alcançar. Ninguém cura, se defende ou usa item,
 * então os números não medem dificuldade — servem pra comparar ANTES e
 * DEPOIS de mexer em atributos, habilidades ou no bestiário.
 *
 * As lutas usam seeds fixas (1 a N): rodar duas vezes sem mudar nada dá a
 * mesma tabela, e qualquer diferença é efeito da mudança, não do dado.
 */
import {
  BESTIARY,
  CLASS_INFO,
  applyCommand,
  basicCommand,
  createStartingAttributes,
  gridFromAscii,
  startEncounter,
  startingMaxHp,
  unitFromCharacter,
  type Character,
  type CharacterClass,
} from "@ealen/shared";

const N = 300;
/** Uma luta que passe disto é contada como derrota (dois lados que não se alcançam). */
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
  };
}

function fight(characterClass: CharacterClass, creatureId: string, seed: number): boolean {
  const { encounter } = startEncounter({
    grid: ARENA.grid,
    units: [
      unitFromCharacter(makePlayer(characterClass), { team: "party", pos: ARENA.markers.P[0] }),
      unitFromCharacter(BESTIARY[creatureId].template, { team: "enemy", pos: ARENA.markers.E[0] }),
    ],
    seed,
  });

  for (let i = 0; i < MAX_COMMANDS && !encounter.winner; i++) {
    if (!applyCommand(encounter, basicCommand(encounter)).ok) break;
  }
  return encounter.winner === "party";
}

const creatures = Object.keys(BESTIARY);
const classes = Object.keys(CLASS_INFO) as CharacterClass[];

const header = ["Ordem".padEnd(28), ...creatures.map((id) => BESTIARY[id].template.name.slice(0, 14).padEnd(15))].join("");
console.log(header);
for (const characterClass of classes) {
  const cells = creatures.map((creatureId) => {
    let wins = 0;
    for (let seed = 1; seed <= N; seed++) if (fight(characterClass, creatureId, seed)) wins++;
    return `${Math.round((wins / N) * 100)}%`.padEnd(15);
  });
  console.log([CLASS_INFO[characterClass].name.padEnd(28), ...cells].join(""));
}
console.log(`\n(nivel 1, povo althirim, ${N} combates por celula, os dois lados jogados pela IA provisoria)`);
console.log("niveis das criaturas:", creatures.map((id) => `${BESTIARY[id].template.name}=${BESTIARY[id].template.level}`).join(", "));
