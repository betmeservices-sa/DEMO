"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Leaf, User } from "lucide-react";

// Misma puerta de entrada que el demo de Grupo Q: fondo negro y gradiente
// cian-violeta-magenta de MiAgentIA. El panel de adentro va en tema claro.
export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setError(false);
    setEnviando(true);
    try {
      const r = await fetch("/demonutricion/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      if (r.ok) {
        const { inicio } = (await r.json()) as { inicio?: string };
        window.location.assign(inicio ?? "/demonutricion");
      } else setError(true);
    } finally {
      setEnviando(false);
    }
  }

  const inputWrap =
    "flex items-center gap-2 rounded-xl border border-white/10 bg-[#12121c] px-3.5 py-3 transition focus-within:border-[#8b5cf6] focus-within:bg-[#16161f] focus-within:shadow-[0_0_0_4px_rgba(139,92,246,0.12)]";
  const inputBase = "w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05050A] px-4">
      <div className="pointer-events-none absolute -top-32 left-1/3 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.28),transparent_60%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.20),transparent_62%)] blur-2xl" />

      <div className="relative w-full max-w-sm">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d18] shadow-2xl shadow-black/60">
          <div className="h-1 bg-gradient-to-r from-[#22d3ee] via-[#8b5cf6] to-[#e879f9]" />
          <div className="px-7 pb-8 pt-8">
            <div className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/miagentia-lockup.png" alt="MiAgentIA" className="h-11 w-auto" />
            </div>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[13px] font-semibold text-white/90">
              <Leaf size={14} /> Balance Nutrición · Centro de Comunicación
            </p>
            <p className="mt-1 text-center text-[12.5px] text-white/40">Ingresa con tu cuenta para continuar</p>

            <form onSubmit={entrar} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-semibold text-white/80">Usuario</span>
                <div className={inputWrap}>
                  <User size={16} className="shrink-0 text-white/40" />
                  <input
                    type="text"
                    value={usuario}
                    onChange={(e) => { setUsuario(e.target.value); setError(false); }}
                    placeholder="usuario"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    className={inputBase}
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-semibold text-white/80">Contraseña</span>
                <div className={inputWrap}>
                  <Lock size={16} className="shrink-0 text-white/40" />
                  <input
                    type={verPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(false); }}
                    placeholder="••••••"
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    className={inputBase}
                  />
                  <button type="button" onClick={() => setVerPass((v) => !v)} aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"} className="shrink-0 text-white/40 transition hover:text-white/70">
                    {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {error && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12.5px] font-semibold text-red-300">Usuario o contraseña incorrectos.</p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full rounded-xl bg-gradient-to-r from-[#22d3ee] via-[#8b5cf6] to-[#e879f9] py-2.5 text-sm font-bold text-white shadow-lg shadow-[#8b5cf6]/25 transition hover:opacity-90 disabled:opacity-50"
              >
                {enviando ? "Entrando..." : "Iniciar sesión"}
              </button>
            </form>
          </div>
        </div>
        <p className="mt-4 text-center text-[12px] font-medium text-white/30">Consultas y entregas · WhatsApp, Instagram y Facebook</p>
      </div>
    </main>
  );
}
