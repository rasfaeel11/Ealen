import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CharacterClass, MapNode, Race } from "@ealen/shared";
import {
  ATTRIBUTE_KEYS,
  CLASS_INFO,
  CLASS_PRINCIPLE,
  PRINCIPLE_INFO,
  RACE_INFO,
  RACE_MODIFIERS,
  createStartingAttributes,
  startingMaxHp,
} from "@ealen/shared";
import { apiFetch } from "../lib/api";
import { useGameSession } from "../hooks/useGameSession";
import { CLASS_GLYPH } from "../lib/glyphs";
import { CLASS_PORTRAIT } from "../lib/portraits";
import { randomCharacterName } from "../lib/nameGenerator";

const RACE_ORDER: Race[] = ["althirim", "miraven", "taharim", "kelbar"];

const CLASS_ORDER: CharacterClass[] = [
  "luminar",
  "entropista",
  "cantor_de_ealen",
  "guardiao",
  "sombrilico",
  "rachador",
];

/** Nome curto de cada runa, pro bloco de atributos — a sigla sozinha (DAIN, OR...) não diz nada a quem não decorou a tabela. */
const ATTRIBUTE_LABEL: Record<(typeof ATTRIBUTE_KEYS)[number], string> = {
  dain: "Força",
  eir: "Ressonância",
  nath: "Vitalidade",
  il: "Percepção",
  or: "Densidade",
  len: "Voz",
  ul: "Mistério",
};

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** "OR +1  ·  DAIN -1" a partir dos modificadores de um povo. */
function formatModifiers(race: Race): string {
  const modifiers = RACE_MODIFIERS[race];
  return ATTRIBUTE_KEYS.filter((key) => modifiers[key] !== undefined)
    .map((key) => `${key.toUpperCase()} ${modifiers[key]! > 0 ? "+" : ""}${modifiers[key]}`)
    .join("   ");
}

/**
 * Criação de personagem, em disposição de "câmara de forja": Povo e Ordem se
 * escolhem em duas fileiras no topo, o retrato de quem está sendo forjado
 * ocupa a esquerda (grande, com o nome escrito sobre ele), e a direita lê o
 * resultado — lore do Povo, lore da Ordem, atributos Tirán resultantes.
 */
function CharacterCreatePage() {
  const navigate = useNavigate();
  const { character, createCharacter } = useGameSession();

  const [startNodeId, setStartNodeId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [race, setRace] = useState<Race>("althirim");
  const [characterClass, setCharacterClass] = useState<CharacterClass>("luminar");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (character) {
      navigate("/map", { replace: true });
      return;
    }
    apiFetch<MapNode[]>("/api/map/nodes")
      .then((nodes) => setStartNodeId(nodes[0]?.id ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar o mapa"));
  }, [character, navigate]);

  const preview = useMemo(() => {
    const attributes = createStartingAttributes(race, characterClass);
    return { attributes, maxHp: startingMaxHp(attributes) };
  }, [race, characterClass]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !startNodeId || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await createCharacter({ name: name.trim(), race, characterClass, currentNodeId: startNodeId });
      navigate("/map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o personagem");
    } finally {
      setSubmitting(false);
    }
  }

  function randomizeAll() {
    const nextRace = pick(RACE_ORDER);
    const nextClass = pick(CLASS_ORDER);
    setRace(nextRace);
    setCharacterClass(nextClass);
    setName(randomCharacterName(nextRace));
  }

  const raceInfo = RACE_INFO[race];
  const classInfo = CLASS_INFO[characterClass];
  const principle = PRINCIPLE_INFO[CLASS_PRINCIPLE[characterClass]];

  return (
    <div className="min-h-screen bg-codex-bg px-4 py-8 text-codex-ink">
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-cinzel text-2xl tracking-wide text-codex-goldBright">Forje seu destino</h1>
            <Link to="/prologo" className="font-garamond text-sm text-codex-inkDim underline-offset-2 hover:text-codex-gold hover:underline">
              Ler o prólogo
            </Link>
          </div>
          <button
            type="button"
            onClick={randomizeAll}
            className="battle-frame-dim shrink-0 px-4 py-2 font-cinzel text-xs uppercase tracking-[0.2em] text-codex-gold hover:bg-codex-gold/10"
          >
            🎲 Sortear destino
          </button>
        </header>

        {/* Fileira 1: Povo */}
        <section>
          <h2 className="mb-2 font-cinzel text-xs uppercase tracking-[0.3em] text-codex-inkDim">Povo</h2>
          <div className="flex flex-wrap gap-2">
            {RACE_ORDER.map((option) => {
              const info = RACE_INFO[option];
              const selected = race === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRace(option)}
                  className={`px-4 py-2 font-cinzel text-sm tracking-wide transition-colors ${
                    selected
                      ? "battle-frame text-codex-goldBright"
                      : "battle-frame-dim text-codex-ink hover:bg-codex-gold/5"
                  }`}
                >
                  {info.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Fileira 2: Ordem */}
        <section>
          <h2 className="mb-2 font-cinzel text-xs uppercase tracking-[0.3em] text-codex-inkDim">Ordem</h2>
          <div className="flex flex-wrap gap-2">
            {CLASS_ORDER.map((option) => {
              const info = CLASS_INFO[option];
              const selected = characterClass === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCharacterClass(option)}
                  className={`flex items-center gap-2 px-4 py-2 font-cinzel text-sm tracking-wide transition-colors ${
                    selected
                      ? "battle-frame text-codex-goldBright"
                      : "battle-frame-dim text-codex-ink hover:bg-codex-gold/5"
                  }`}
                >
                  <span className={selected ? "text-codex-goldBright" : "text-codex-gold/60"}>
                    {CLASS_GLYPH[option]}
                  </span>
                  {info.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Câmara: retrato à esquerda, lore + atributos à direita */}
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className="battle-frame relative h-[420px] shrink-0 overflow-hidden sm:h-[480px] lg:h-auto">
            <img
              key={characterClass}
              src={CLASS_PORTRAIT[characterClass]}
              alt={classInfo.name}
              className="h-full w-full select-none object-cover [image-rendering:pixelated]"
              draggable={false}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-4 pb-4">
              <input
                type="text"
                required
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do herói"
                className="w-full bg-transparent text-center font-cinzel text-xl tracking-wide text-codex-goldBright placeholder:text-codex-goldBright/40 outline-none"
              />
              <button
                type="button"
                onClick={() => setName(randomCharacterName(race))}
                className="font-cinzel text-[11px] uppercase tracking-[0.2em] text-codex-ink/70 hover:text-codex-gold"
              >
                🎲 sortear nome
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="battle-frame-dim p-4">
              <p className="font-cinzel text-sm tracking-wide text-codex-goldBright">{raceInfo.name}</p>
              <p className="mt-1 font-garamond text-sm text-codex-inkDim">
                {raceInfo.homeland} · {raceInfo.temperament}
              </p>
              <p className="mt-2 font-garamond text-base italic leading-snug text-codex-ink">&ldquo;{raceInfo.creed}&rdquo;</p>
              {formatModifiers(race) && (
                <p className="mt-2 font-cinzel text-sm tracking-wider text-codex-gold">{formatModifiers(race)}</p>
              )}
            </div>

            <div className="battle-frame-dim p-4">
              <div className="flex items-start gap-3">
                <span className="font-cinzel text-3xl leading-none text-codex-gold">{CLASS_GLYPH[characterClass]}</span>
                <div className="min-w-0">
                  <p className="font-cinzel text-sm tracking-wide text-codex-goldBright">{classInfo.name}</p>
                  <p className="font-garamond text-sm text-codex-inkDim">
                    {classInfo.title} · {classInfo.role} · {principle.name}
                  </p>
                  <p className="mt-2 font-garamond text-base italic leading-snug text-codex-ink">&ldquo;{classInfo.creed}&rdquo;</p>
                </div>
              </div>
            </div>

            <div className="battle-frame-dim p-4">
              <h3 className="font-cinzel text-xs uppercase tracking-[0.3em] text-codex-inkDim">Atributos</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ATTRIBUTE_KEYS.map((key) => (
                  <div key={key} className="border border-codex-border px-2 py-1.5 text-center">
                    <p className="font-cinzel text-lg leading-none text-codex-ink">{preview.attributes[key]}</p>
                    <p className="mt-1 font-cinzel text-[10px] uppercase tracking-widest text-codex-inkDim">
                      {ATTRIBUTE_LABEL[key]}
                    </p>
                  </div>
                ))}
                <div className="border border-codex-gold/60 px-2 py-1.5 text-center">
                  <p className="font-cinzel text-lg leading-none text-codex-goldBright">{preview.maxHp}</p>
                  <p className="mt-1 font-cinzel text-[10px] uppercase tracking-widest text-codex-gold">HP</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="font-garamond text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !startNodeId || !name.trim()}
          className="battle-frame w-full px-4 py-3 font-cinzel text-sm uppercase tracking-[0.25em] text-codex-goldBright hover:bg-codex-gold/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {submitting ? "Forjando..." : "Atravessar as Portas de Tirán"}
        </button>
      </form>
    </div>
  );
}

export default CharacterCreatePage;
