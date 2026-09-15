import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";

type Status = "idle" | "sending" | "sent" | "error";

function LoginPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: import.meta.env.VITE_SITE_URL ?? window.location.origin },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-codex-bg px-4 text-codex-ink">
      <div className="w-full max-w-sm rounded-sm border border-codex-border bg-codex-panel p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <h1 className="mb-2 font-cinzel text-xl tracking-wide text-codex-goldBright">Eälen</h1>
        <p className="mb-6 font-garamond text-sm text-codex-inkDim">
          O Canto das Primeiras Luzes. Entre com seu email pra receber um link de acesso.
        </p>

        {status === "sent" ? (
          <p className="font-garamond text-sm text-codex-goldBright">
            Link enviado! Confira sua caixa de entrada (e o spam) pra continuar.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "sending"}
              className="rounded-sm border border-codex-border bg-codex-bg px-3 py-2 font-garamond text-sm text-codex-ink outline-none focus:border-codex-gold"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="rounded-sm border border-codex-gold/60 px-3 py-2 font-cinzel text-xs tracking-wide text-codex-goldBright hover:bg-codex-gold/10 disabled:opacity-50"
            >
              {status === "sending" ? "Enviando..." : "Enviar link"}
            </button>
            {status === "error" && <p className="font-garamond text-sm text-red-400">{errorMessage}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
