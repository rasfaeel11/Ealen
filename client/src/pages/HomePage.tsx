import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";

function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-codex-bg text-codex-ink">
      <h1 className="font-cinzel text-xl tracking-wide text-codex-goldBright">
        Eälen: O Canto das Primeiras Luzes
      </h1>
      <p className="font-garamond text-sm text-codex-inkDim">Logado como {user?.email}</p>
      <Link
        to="/map"
        className="rounded-sm border border-codex-gold/60 px-4 py-1.5 font-cinzel text-xs tracking-wide text-codex-goldBright hover:bg-codex-gold/10"
      >
        Explorar o mapa
      </Link>
      <button
        onClick={() => supabase.auth.signOut()}
        className="font-garamond text-xs text-codex-inkDim hover:text-codex-ink"
      >
        Sair
      </button>
    </div>
  );
}

export default HomePage;
