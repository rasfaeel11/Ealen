import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";

function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100">
      <p className="text-lg">Eälen: O Canto das Primeiras Luzes — em construção.</p>
      <p className="text-sm text-neutral-400">Logado como {user?.email}</p>
      <button
        onClick={() => supabase.auth.signOut()}
        className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-500"
      >
        Sair
      </button>
    </div>
  );
}

export default HomePage;
