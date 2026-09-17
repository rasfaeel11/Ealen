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

const RACE_ORDER: Race[] = ["althirim", "miraven", "taharim", "kelbar"];

const CLASS_ORDER: CharacterClass[] = [
  "luminar",
  "entropista",
  "cantor_de_ealen",
  "guardiao",
  "sombrilico",
  "rachador",
];

/** "OR +1  ·  DAIN -1" a partir dos modificadores de um povo. */
function formatModifiers(race: Race): string {
  const modifiers = RACE_MODIFIERS[race];
  return ATTRIBUTE_KEYS.filter((key) => modifiers[key] !== undefined)
    .map((key) => `${key.toUpperCase()} ${modifiers[key]! > 0 ? "+" : ""}${modifiers[key]}`)
    .join("  ·  ");
}

/**
 * Criação de personagem. Em vez de dois selects, mostra os quatro Povos e as
 * seis Ordens como cartas: a escolha aqui é a escolha de uma filosofia sobre
 * como o universo deveria existir, e o jogador precisa conseguir ler isso
 * antes de decidir. O painel de baixo mostra ao vivo os atributos Tirán
 * resultantes da combinação.
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

  const classInfo = CLASS_INFO[characterClass];
  const principle = PRINCIPLE_INFO[CLASS_PRINCIPLE[characterClass]];

  return (
    <div className="min-h-screen bg-codex-bg px-4 py-10 text-codex-ink">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="font-cinzel text-2xl tracking-wide text-codex-goldBright">Forje seu destino</h1>
          <p className="mt-2 font-garamond text-sm leading-relaxed text-codex-inkDim">
            Escolha o povo em que nasceu e a Ordem que decidiu seguir. A Ordem define qual Princípio da realidade
            você manipula — e, com ele, o que você acredita que o universo deveria ser.{" "}
            <Link to="/prologo" className="text-codex-gold underline-offset-2 hover:underline">
              Ler o prólogo
            </Link>
            .
          </p>
        </header>

        <section className="mb-8">
          <label className="flex flex-col gap-2">
            <span className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-codex-inkDim">Nome</span>
            <input
              type="text"
              required
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como o mundo vai te chamar"
              className="battle-frame-dim bg-codex-bg px-3 py-2.5 font-garamond text-base text-codex-ink outline-none focus:border-codex-gold"
            />
          </label>
        </section>

        <section className="mb-8">
          <h2 className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-codex-inkDim">Povo</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {RACE_ORDER.map((option) => {
              const info = RACE_INFO[option];
              const selected = race === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRace(option)}
                  className={`p-4 text-left transition-colors ${
                    selected ? "battle-frame" : "battle-frame-dim hover:bg-codex-gold/5"
                  }`}
                >
                  <p
                    className={`font-cinzel text-sm tracking-wide ${
                      selected ? "text-codex-goldBright" : "text-codex-ink"
                    }`}
                  >
                    {info.name}
                  </p>
                  <p className="mt-1 font-garamond text-[11px] text-codex-inkDim">{info.temperament}</p>
                  <p className="mt-2 font-garamond text-[12px] italic leading-snug text-codex-ink">
                    &ldquo;{info.creed}&rdquo;
                  </p>
                  <p className="mt-2 font-cinzel text-[10px] tracking-wider text-codex-gold">
                    {formatModifiers(option)}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-codex-inkDim">Ordem</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CLASS_ORDER.map((option) => {
              const info = CLASS_INFO[option];
              const selected = characterClass === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCharacterClass(option)}
                  className={`p-4 text-left transition-colors ${
                    selected ? "battle-frame" : "battle-frame-dim hover:bg-codex-gold/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`font-cinzel text-2xl leading-none ${selected ? "text-codex-goldBright" : "text-codex-gold/60"}`}>
                      {CLASS_GLYPH[option]}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`font-cinzel text-xs leading-snug tracking-wide ${
                          selected ? "text-codex-goldBright" : "text-codex-ink"
                        }`}
                      >
                        {info.name}
                      </p>
                      <p className="mt-1 font-garamond text-[11px] text-codex-inkDim">{info.role}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="battle-frame-dim mb-8 p-5">
          <div className="flex items-start gap-4">
            <span className="font-cinzel text-3xl leading-none text-codex-gold">{CLASS_GLYPH[characterClass]}</span>
            <div className="min-w-0">
              <p className="font-cinzel text-sm tracking-wide text-codex-goldBright">{classInfo.name}</p>
              <p className="font-garamond text-[11px] text-codex-inkDim">
                {classInfo.title} · Princípio: {principle.name}
              </p>
              <p className="mt-2 font-garamond text-sm italic text-codex-ink">&ldquo;{classInfo.creed}&rdquo;</p>
              <p className="mt-2 font-garamond text-[12px] leading-snug text-codex-inkDim">{principle.summary}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-codex-border/60 pt-4">
            {ATTRIBUTE_KEYS.map((key) => (
              <span
                key={key}
                className="border border-codex-border px-2 py-1 font-cinzel text-[10px] tracking-wider text-codex-ink"
              >
                {key.toUpperCase()} {preview.attributes[key]}
              </span>
            ))}
            <span className="border border-codex-gold/60 px-2 py-1 font-cinzel text-[10px] tracking-wider text-codex-goldBright">
              HP {preview.maxHp}
            </span>
          </div>
        </section>

        {error && <p className="mb-4 font-garamond text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !startNodeId || !name.trim()}
          className="battle-frame w-full px-4 py-3 font-cinzel text-xs uppercase tracking-[0.25em] text-codex-goldBright hover:bg-codex-gold/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {submitting ? "Forjando..." : "Atravessar as Portas de Tirán"}
        </button>
      </form>
    </div>
  );
}

export default CharacterCreatePage;
