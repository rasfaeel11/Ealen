/**
 * As lutas do jogo como elas acontecem, rodadas pelo motor REAL: o trio inteiro (Endyru, Jarupã e Xanduí, com
 * Oryndu de apoio) contra cada grupo de inimigos dos quatro mapas, no próprio mapa, com o chão, a altura, a água,
 * os destrutíveis, a cheia e as deixas da luta (o guincho que vence o pedágio, o estouro forçado do ato 3).
 *
 *     npm run balance:grupo
 *     npm run balance:grupo -- 50 ponte   (menos lutas, só os grupos cujo nome tem "ponte")
 *
 * O grupo segue uma campanha: começa no nível 1, na Página e no Fio, e depois de cada luta ganha o XP dela como se
 * a tivesse vencido (todo mundo ganha o XP inteiro, como no jogo), gasta os pontos de árvore e de atributo pela ordem
 * automática da classe (`autoLearn`, `autoRaise`) e descansa. Endyru chega ao Círculo depois da primeira ida aos
 * baixios (a margem, `mage_rise(4)`), e Jarupã e Xanduí ao Corpo depois da ponte (`aura_rise`). A ordem é a do
 * roteiro, com as lutas que dá pra não lutar (o pedágio, o armazém, o portão) lutadas. A luta final roda duas vezes:
 * com os círculos e os barris do preparo na margem, e sem.
 *
 * O grupo começa onde a luta começaria: no gatilho mais perto do grupo inimigo (o barco no pedágio, a porta do
 * armazém), ou, sem gatilho perto, chegando pelo ponto de chegada mais perto até ficar a 6 quadrados do primeiro
 * inimigo (o olhar de quem vigia). Os dois lados são jogados pela IA do jogo (chooseCommand), Endyru também: um
 * jogador de verdade joga melhor, então os números servem pra comparar antes e depois de mexer, não pra medir a
 * dificuldade. As seeds são fixas (1 a N).
 *
 * Por luta: quantas o grupo vence, em quantas rodadas, quantos do trio caem em média, quantas vezes Endyru cai, e
 * as lutas que não acabam ("!n"), que são defeito. Com `TRACE=1` no ambiente, cada golpe, dano e passo sai na tela
 * (use com poucas lutas: `TRACE=1 npm run balance:grupo -- 1 patrulha`).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyCommand,
  applyXpGain,
  autoLearn,
  autoRaise,
  chooseCommand,
  createProtagonist,
  findBestiaryEntry,
  fightCues,
  inBounds,
  isOver,
  isActive,
  joinParty,
  parseTiledMap,
  pixelOfTile,
  placeParty,
  restoreParty,
  standAreaProps,
  startAreaEncounter,
  tileAt,
  tileOfPixel,
  xpForEnemy,
  type AreaMap,
  type Character,
  type PartyMember,
  type Pos,
} from "@jogo/shared";

const args = process.argv.slice(2);
const [countArg, filterArg] = args;
const N = Number(countArg) > 0 ? Math.floor(Number(countArg)) : 100;
const MAX_COMMANDS = 4000;
/** A distância do primeiro inimigo em que o grupo chega, quando a luta não começa num gatilho. */
const ARRIVAL = 6;
/** Um gatilho mais longe que isto do grupo inimigo não é o que abre aquela luta. */
const TRIGGER_REACH = 12;

const MAPS_DIR = resolve(import.meta.dirname, "../public/maps");
const maps = new Map<string, AreaMap>();
function mapOf(area: string): AreaMap {
  if (!maps.has(area)) maps.set(area, parseTiledMap(JSON.parse(readFileSync(resolve(MAPS_DIR, `${area}.tmj`), "utf8"))));
  return maps.get(area)!;
}

/** Um passo da campanha: uma luta, ou o que a história muda no grupo entre uma e outra. */
type Step =
  | { kind: "fight"; area: string; group: string; label: string; flags?: string[] }
  | { kind: "mage"; level: number }
  | { kind: "aura"; level: number };

const CAMPAIGN: Step[] = [
  { kind: "fight", area: "ymonha", group: "pedagio", label: "pedágio (abertura)" },
  { kind: "fight", area: "ybytugua", group: "armazem", label: "armazém" },
  { kind: "fight", area: "baixios", group: "primeira", label: "primeira ida (não se vence)" },
  { kind: "mage", level: 4 },
  { kind: "fight", area: "floresta", group: "patrulha", label: "patrulha" },
  { kind: "fight", area: "floresta", group: "vau", label: "vau" },
  { kind: "fight", area: "floresta", group: "contratados", label: "batedores" },
  { kind: "fight", area: "ymonha", group: "portao", label: "portão (por terra)" },
  { kind: "fight", area: "floresta", group: "ponte", label: "ponte (Jurendy e Mbyraku)" },
  { kind: "aura", level: 3 },
  { kind: "fight", area: "baixios", group: "final", label: "final, com preparo", flags: ["preparo"] },
  { kind: "fight", area: "baixios", group: "final", label: "final, sem preparo" },
];

// O grupo da campanha.
const hero = createProtagonist();
const members: PartyMember[] = [];
for (const key of ["oryndu", "jarupa", "xandui"]) joinParty(members, key, hero.level);
const companions = () => members.filter((member) => member.present).map((member) => member.character);
const fighters = () => [hero, ...companions().filter((character) => character.id !== "companion:oryndu")];

const clone = <T>(value: T): T => structuredClone(value);
const cheb = (a: Pos, b: Pos) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** Onde o grupo está quando a luta começa (ver o comentário do topo). */
function arrival(map: AreaMap, enemyTiles: Pos[]): Pos {
  const walkable = (tile: Pos) => inBounds(map.grid, tile) && !tileAt(map.grid, tile)!.blocksMove;
  const free = (tile: Pos) => walkable(tile) && !enemyTiles.some((enemy) => enemy.x === tile.x && enemy.y === tile.y);
  const near = (from: Pos) => Math.min(...enemyTiles.map((enemy) => cheb(from, enemy)));
  const center = { x: Math.round(enemyTiles.reduce((s, t) => s + t.x, 0) / enemyTiles.length), y: Math.round(enemyTiles.reduce((s, t) => s + t.y, 0) / enemyTiles.length) };

  const trigger = map.triggers
    .map((t) => ({ t, tile: tileOfPixel(map, { x: t.x + t.width / 2, y: t.y + t.height / 2 }) }))
    .filter(({ tile }) => cheb(tile, center) <= TRIGGER_REACH)
    .sort((a, b) => cheb(a.tile, center) - cheb(b.tile, center))[0];
  const spawn = Object.values(map.spawns).map((pixel) => tileOfPixel(map, pixel)).sort((a, b) => cheb(a, center) - cheb(b, center))[0];
  const from = trigger?.tile ?? spawn;

  // Do ponto de partida, pelo chão que se anda, até o primeiro quadrado livre perto o bastante (com gatilho, ele mesmo).
  const seen = new Set<string>([`${from.x},${from.y}`]);
  const queue: Pos[] = [from];
  while (queue.length) {
    const tile = queue.shift()!;
    if (free(tile) && (trigger || near(tile) <= ARRIVAL)) return tile;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: tile.x + dx, y: tile.y + dy };
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || !inBounds(map.grid, next)) continue;
      // Do gatilho (que pode estar em cima da água, como o barco) sai-se por qualquer quadrado até achar chão.
      if (!walkable(next) && !trigger) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return from;
}

interface Tally {
  wins: number;
  rounds: number;
  fallen: number;
  heroDown: number;
  endless: number;
}

function runFight(step: Extract<Step, { kind: "fight" }>, seed: number): { won: boolean; rounds: number; fallen: number; heroDown: boolean; endless: boolean } {
  const map = mapOf(step.area);
  const flags = new Set(step.flags ?? []);
  const flag = (name: string) => flags.has(name);
  const enemies = map.enemies.filter((enemy) => enemy.group === step.group);
  const enemyTiles = enemies.map((enemy) => tileOfPixel(map, enemy));
  // Uma cópia do mapa por luta: os destrutíveis se põem de pé na grade dela, e a cheia a alaga.
  const local: AreaMap = clone(map);
  const props = standAreaProps(local, new Set(), (prop) => isActive(prop, flag));

  // Cópias: a campanha não muda com o que acontece numa luta.
  const me = clone(hero);
  const mates = companions().map(clone);
  const start = arrival(local, enemyTiles);
  const placed = placeParty(
    local,
    me,
    start,
    mates.map((character) => ({ character, at: pixelOfTile(local, start) })),
    enemyTiles,
  );
  const party = placed.filter((fighter) => fighter.character.id !== "companion:oryndu");
  const onlookers = mates.filter((character) => character.id === "companion:oryndu");
  const cues = map.cues.filter((cue) => cue.group === step.group && isActive(cue, flag));
  const { encounter } = startAreaEncounter(
    local,
    party,
    enemies,
    seed,
    props,
    undefined,
    fightCues(local, cues, enemies, party.map((fighter) => fighter.character.id)),
    onlookers,
  );
  for (let i = 0; i < MAX_COMMANDS && !isOver(encounter); i++) {
    const command = chooseCommand(encounter);
    const applied = applyCommand(encounter, command);
    if (process.env.TRACE && applied.ok) for (const event of applied.events) if (["damage", "attackRoll", "unitDefeated", "moved", "battleEnded", "cueFired"].includes(event.type)) console.log("   ", JSON.stringify(event).slice(0, 160));
    if (!applied.ok) throw new Error(`a IA pediu o impossível em ${step.label}: ${JSON.stringify(command)}`);
  }
  const trio = encounter.units.filter((unit) => unit.team === "party");
  return {
    won: encounter.winner === "party",
    rounds: encounter.round,
    fallen: trio.filter((unit) => unit.currentHp <= 0).length,
    heroDown: trio.some((unit) => unit.id === "hero" && unit.currentHp <= 0),
    // Parada por uma deixa sem vencedor (a primeira ida, que Oryndu encerra) não é luta sem fim.
    endless: !isOver(encounter),
  };
}

/** O que a luta deixa: o XP de quem caiu, pra todo mundo, e os pontos gastos sozinhos. Depois, a noite. */
function advance(step: Extract<Step, { kind: "fight" }>): void {
  const xp = mapOf(step.area)
    .enemies.filter((enemy) => enemy.group === step.group)
    .reduce((sum, enemy) => sum + xpForEnemy(findBestiaryEntry(enemy.creature)!.template), 0);
  for (const character of [hero, ...companions()]) applyXpGain(character, xp);
  for (const character of fighters()) {
    autoLearn(character);
    autoRaise(character);
  }
  restoreParty(hero, members);
}

const describe = (character: Character) =>
  `${character.name} nv ${character.level}${character.mageLevel ? ` (mago ${character.mageLevel})` : ""}${character.aura ? ` (aura ${character.aura})` : ""}`;

console.log(`${N} lutas por linha, seeds 1 a ${N}. Vitória do grupo / rodadas em média / do trio caídos em média / Endyru caído.\n`);
console.log(["luta".padEnd(30), "grupo".padEnd(42), "vence".padEnd(8), "rodadas".padEnd(9), "caídos".padEnd(8), "Endyru cai"].join(""));
let endlessTotal = 0;
for (const step of CAMPAIGN) {
  if (step.kind === "mage") {
    hero.mageLevel = step.level;
    continue;
  }
  if (step.kind === "aura") {
    for (const character of companions()) if (character.id !== "companion:oryndu") character.aura = step.level;
    continue;
  }
  if (!filterArg || step.label.includes(filterArg) || step.group.includes(filterArg)) {
    const tally: Tally = { wins: 0, rounds: 0, fallen: 0, heroDown: 0, endless: 0 };
    for (let seed = 1; seed <= N; seed++) {
      const result = runFight(step, seed);
      tally.wins += result.won ? 1 : 0;
      tally.rounds += result.rounds;
      tally.fallen += result.fallen;
      tally.heroDown += result.heroDown ? 1 : 0;
      tally.endless += result.endless ? 1 : 0;
    }
    endlessTotal += tally.endless;
    const who = fighters().map((character) => character.level).join("/");
    console.log(
      [
        step.label.slice(0, 29).padEnd(30),
        `nv ${who}${hero.mageLevel === 4 ? ", Círculo" : ", Página"}${companions().some((c) => c.aura === 3) ? ", Corpo" : ", Fio"}`.padEnd(42),
        `${Math.round((tally.wins / N) * 100)}%${tally.endless ? ` !${tally.endless}` : ""}`.padEnd(8),
        (tally.rounds / N).toFixed(1).padEnd(9),
        (tally.fallen / N).toFixed(1).padEnd(8),
        `${Math.round((tally.heroDown / N) * 100)}%`,
      ].join(""),
    );
  }
  // A campanha anda sempre, mesmo pras lutas filtradas: o nível de cada luta é o mesmo, com ou sem filtro.
  if (!(step.flags ?? []).length) advance(step);
}
console.log(`\nLutas sem fim: ${endlessTotal}.`);
console.log(`No fim da campanha: ${fighters().map(describe).join(", ")}.`);
