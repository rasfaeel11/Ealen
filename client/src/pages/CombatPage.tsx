import { useParams, Link } from "react-router-dom";

function CombatPage() {
  const { nodeId } = useParams<{ nodeId: string }>();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-codex-bg text-codex-ink">
      <h1 className="font-cinzel text-lg tracking-wide text-codex-goldBright">Combate</h1>
      <p className="font-garamond text-sm text-codex-inkDim">
        A tela de combate animada chega em breve. Nó do encontro: {nodeId}
      </p>
      <Link
        to="/map"
        className="rounded-sm border border-codex-gold/60 px-4 py-1.5 font-cinzel text-xs tracking-wide text-codex-goldBright hover:bg-codex-gold/10"
      >
        Voltar ao mapa
      </Link>
    </div>
  );
}

export default CombatPage;
