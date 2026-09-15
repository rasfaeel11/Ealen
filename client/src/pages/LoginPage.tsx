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
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-neutral-100">
      <div className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-900 p-8">
        <h1 className="mb-2 text-xl font-semibold">Eälen</h1>
        <p className="mb-6 text-sm text-neutral-400">
          O Canto das Primeiras Luzes. Entre com seu email pra receber um link de acesso.
        </p>

        {status === "sent" ? (
          <p className="text-sm text-emerald-400">
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
              className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-950 disabled:opacity-50"
            >
              {status === "sending" ? "Enviando..." : "Enviar link"}
            </button>
            {status === "error" && <p className="text-sm text-red-400">{errorMessage}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
