import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useGameSession } from "../hooks/useGameSession";

function HomePage() {
  const { user } = useAuth();
  const { mode, exitSession } = useGameSession();
  const navigate = useNavigate();

  async function handleExit() {
    await exitSession();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-codex-bg text-codex-ink">
      <h1 className="font-cinzel text-xl tracking-wide text-codex-goldBright">
        Eälen: O Canto das Primeiras Luzes
      </h1>

      {mode === "account" ? (
        <p className="font-garamond text-sm text-codex-inkDim">Logado como {user?.email}</p>
      ) : (
        <div className="max-w-sm text-center">
          <p className="font-garamond text-sm text-codex-inkDim">
            Modo convidado — seu progresso fica só neste navegador.
          </p>
          <p className="mt-1 font-garamond text-xs text-codex-inkDim">
            Quer jogar de qualquer lugar sem risco de perder o personagem? Saia e entre com seu email.
          </p>
        </div>
      )}

      <Link
        to="/map"
        className="rounded-sm border border-codex-gold/60 px-4 py-1.5 font-cinzel text-xs tracking-wide text-codex-goldBright hover:bg-codex-gold/10"
      >
        Explorar o mapa
      </Link>
      <button onClick={handleExit} className="font-garamond text-xs text-codex-inkDim hover:text-codex-ink">
        {mode === "account" ? "Sair" : "Sair do modo convidado"}
      </button>
    </div>
  );
}

export default HomePage;
