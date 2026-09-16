import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { CharacterClass, MapNode, Race } from "@ealen/shared";
import { CLASS_INFO } from "@ealen/shared";
import { apiFetch } from "../lib/api";
import { useGameSession } from "../hooks/useGameSession";

const RACE_LABELS: Record<Race, string> = {
  althirim: "Althirim — povo da contemplação e da sabedoria",
  miraven: "Miraven — povo da memória e da lua",
  taharim: "Taharim — povo do trabalho e do sol",
  kelbar: "Kelbar — povo da sombra e da compaixão",
};

const CLASS_ORDER: CharacterClass[] = [
  "luminar",
  "entropista",
  "cantor_de_ealen",
  "guardiao",
  "sombrilico",
  "rachador",
];

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-codex-bg px-4 text-codex-ink">
      <div className="w-full max-w-md rounded-sm border border-codex-border bg-codex-panel p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <h1 className="mb-2 font-cinzel text-xl tracking-wide text-codex-goldBright">Forje seu destino</h1>
        <p className="mb-6 font-garamond text-sm text-codex-inkDim">
          Escolha o povo e a Ordem que vão guiar sua jornada por Eälen.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-cinzel text-xs tracking-wide text-codex-inkDim">Nome</span>
            <input
              type="text"
              required
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-sm border border-codex-border bg-codex-bg px-3 py-2 font-garamond text-sm text-codex-ink outline-none focus:border-codex-gold"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-cinzel text-xs tracking-wide text-codex-inkDim">Povo</span>
            <select
              value={race}
              onChange={(e) => setRace(e.target.value as Race)}
              className="rounded-sm border border-codex-border bg-codex-bg px-3 py-2 font-garamond text-sm text-codex-ink outline-none focus:border-codex-gold"
            >
              {(Object.keys(RACE_LABELS) as Race[]).map((r) => (
                <option key={r} value={r}>
                  {RACE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-cinzel text-xs tracking-wide text-codex-inkDim">Ordem</span>
            <select
              value={characterClass}
              onChange={(e) => setCharacterClass(e.target.value as CharacterClass)}
              className="rounded-sm border border-codex-border bg-codex-bg px-3 py-2 font-garamond text-sm text-codex-ink outline-none focus:border-codex-gold"
            >
              {CLASS_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")} — {CLASS_INFO[c].role}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="font-garamond text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !startNodeId}
            className="mt-2 rounded-sm border border-codex-gold/60 px-3 py-2 font-cinzel text-xs tracking-wide text-codex-goldBright hover:bg-codex-gold/10 disabled:opacity-50"
          >
            {submitting ? "Forjando..." : "Começar a jornada"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CharacterCreatePage;
