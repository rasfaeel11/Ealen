import { Link, useNavigate } from "react-router-dom";
import { CLASS_INFO, RACE_INFO } from "@ealen/shared";
import { useAuth } from "../hooks/useAuth";
import { useGameSession } from "../hooks/useGameSession";
import { CLASS_GLYPH } from "../lib/glyphs";

function HomePage() {
  const { user } = useAuth();
  const { mode, character, exitSession } = useGameSession();
  const navigate = useNavigate();

  async function handleExit() {
    await exitSession();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-codex-bg px-4 py-10 text-codex-ink">
      <div className="text-center">
        <h1 className="font-cinzel text-2xl tracking-wide text-codex-goldBright">
          Eälen: O Canto das Primeiras Luzes
        </h1>
        <p className="mt-2 max-w-md font-garamond text-sm leading-relaxed text-codex-inkDim">
          Em Talys, magia não é exceção à física — é interpretação dela. Seis Ordens disputam qual lei
          fundamental deveria reger a realidade.
        </p>
      </div>

      {character && (
        <div className="battle-frame flex w-full max-w-sm items-center gap-4 px-5 py-4">
          <span className="font-cinzel text-3xl leading-none text-codex-gold">
            {CLASS_GLYPH[character.characterClass]}
          </span>
          <div className="min-w-0">
            <p className="font-cinzel text-sm tracking-wide text-codex-goldBright">{character.name}</p>
            <p className="font-garamond text-xs text-codex-inkDim">
              {RACE_INFO[character.race].name} · {CLASS_INFO[character.characterClass].name} · Nível{" "}
              {character.level}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/map"
          className="battle-frame px-5 py-2 font-cinzel text-xs tracking-wide text-codex-goldBright hover:bg-codex-gold/10"
        >
          {character ? "Continuar a jornada" : "Explorar o mapa"}
        </Link>
        <Link
          to="/codice"
          className="battle-frame-dim px-5 py-2 font-cinzel text-xs tracking-wide text-codex-ink hover:text-codex-goldBright"
        >
          Códice
        </Link>
        <Link
          to="/prologo"
          className="battle-frame-dim px-5 py-2 font-cinzel text-xs tracking-wide text-codex-ink hover:text-codex-goldBright"
        >
          Reler o prólogo
        </Link>
      </div>

      {mode === "account" ? (
        <p className="font-garamond text-xs text-codex-inkDim">Logado como {user?.email}</p>
      ) : (
        <div className="max-w-sm text-center">
          <p className="font-garamond text-xs text-codex-inkDim">
            Modo convidado — seu progresso fica só neste navegador. Para jogar de qualquer lugar sem risco de
            perder o personagem, saia e entre com seu email.
          </p>
        </div>
      )}

      <button onClick={handleExit} className="font-garamond text-xs text-codex-inkDim hover:text-codex-ink">
        {mode === "account" ? "Sair" : "Sair do modo convidado"}
      </button>
    </div>
  );
}

export default HomePage;
