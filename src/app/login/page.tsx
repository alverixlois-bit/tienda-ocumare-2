"use client";

import React, { useState, useTransition, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Lock, Mail, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight,
  Fingerprint, MessageCircle, KeyRound,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Biométrica
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricPending, setBiometricPending] = useState(false);
  const [biometricMsg, setBiometricMsg] = useState<string | null>(null);

  useEffect(() => {
    // Detectar si el navegador soporta WebAuthn / Biometría
    if (
      typeof window !== "undefined" &&
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    ) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => setBiometricAvailable(available))
        .catch(() => setBiometricAvailable(false));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg("Por favor ingresa tu correo y contraseña.");
      return;
    }
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          setErrorMsg(
            error.message.includes("Invalid login credentials")
              ? "Credenciales inválidas. Revisa tu correo y contraseña."
              : error.message
          );
          return;
        }
        router.push(nextUrl);
        router.refresh();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error desconocido al iniciar sesión");
      }
    });
  };

  async function handleBiometricLogin() {
    setBiometricPending(true);
    setBiometricMsg(null);
    try {
      // WebAuthn get — solo verifica identidad local (no registra credencial nueva aquí)
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "required",
          rpId: window.location.hostname,
        },
      });

      if (credential) {
        // Si el dispositivo verificó biométricamente, intentamos login con credencial guardada en localStorage
        const savedEmail = localStorage.getItem("ocumare_admin_email");
        const savedToken = localStorage.getItem("ocumare_admin_refresh");

        if (savedEmail && savedToken) {
          const supabase = createClient();
          const { error } = await supabase.auth.refreshSession({ refresh_token: savedToken });
          if (!error) {
            setBiometricMsg("✅ Acceso biométrico concedido");
            router.push(nextUrl);
            return;
          }
        }
        setBiometricMsg("⚠️ Biometría verificada pero sesión expirada. Inicia sesión con contraseña.");
      }
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setBiometricMsg("❌ Biometría cancelada o no autorizada.");
      } else if (err?.name === "InvalidStateError" || err?.name === "NotSupportedError") {
        setBiometricMsg("⚠️ No hay credencial biométrica registrada. Inicia sesión con contraseña primero.");
      } else {
        setBiometricMsg("⚠️ Biometría no disponible en este dispositivo o navegador.");
      }
    } finally {
      setBiometricPending(false);
    }
  }

  function handleRecuperarWhatsApp() {
    const msg = encodeURIComponent(
      `Hola 👋, necesito recuperar acceso a mi panel de administración de Encargos Boutique.\n\n📧 Correo registrado: ${email || "(no ingresado)"}\n\nPor favor envíame el código OTP de recuperación. Gracias.`
    );
    window.open(`https://api.whatsapp.com/send?phone=584129998877&text=${msg}`, "_blank");
  }

  return (
    <div className="w-full max-w-md bg-neutral-900/80 border border-neutral-800 rounded-2xl p-7 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col items-center text-center mb-7">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">Acceso Administrativo</h1>
        <p className="text-sm text-neutral-400 mt-1">Encargos Boutique · OcumareHub</p>
      </div>

      {errorMsg && (
        <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {biometricMsg && (
        <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center">
          {biometricMsg}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            Correo Electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ocumarehub.com"
              className="w-full pl-11 pr-4 py-3 bg-neutral-950/60 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type={showPassword ? "text" : "password"} required value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••"
              className="w-full pl-11 pr-11 py-3 bg-neutral-950/60 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm"
            />
            <button
              type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit" disabled={isPending}
          className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-sm shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          {isPending ? (
            <><div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" /><span>Verificando...</span></>
          ) : (
            <><span>Iniciar Sesión</span><ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      {/* ✅ ACCESOS RÁPIDOS ALTERNATIVOS */}
      <div className="mt-5 space-y-2.5">
        {/* Biometría / Huella / Face ID */}
        {biometricAvailable ? (
          <button
            type="button"
            onClick={handleBiometricLogin}
            disabled={biometricPending}
            className="w-full py-3 rounded-xl border border-neutral-700 bg-neutral-950/60 hover:border-amber-500/50 hover:bg-amber-500/5 text-neutral-300 hover:text-amber-400 font-semibold text-sm flex items-center justify-center gap-2.5 transition-all"
          >
            {biometricPending ? (
              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Fingerprint className="w-5 h-5" />
            )}
            {biometricPending ? "Verificando biometría..." : "Desbloquear con Huella / Face ID"}
          </button>
        ) : (
          <div className="w-full py-3 rounded-xl border border-neutral-800 bg-neutral-950/30 text-neutral-600 text-xs flex items-center justify-center gap-2">
            <Fingerprint className="w-4 h-4" />
            Biometría no disponible en este dispositivo
          </div>
        )}

        {/* Recuperar por WhatsApp */}
        <button
          type="button"
          onClick={handleRecuperarWhatsApp}
          className="w-full py-3 rounded-xl border border-neutral-800 bg-neutral-950/40 hover:border-[#25D366]/40 hover:bg-[#25D366]/5 text-neutral-400 hover:text-[#25D366] font-medium text-sm flex items-center justify-center gap-2 transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          ¿Olvidaste tu contraseña? Recuperar por WhatsApp
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <Suspense fallback={
        <div className="w-full max-w-md bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 flex items-center justify-center text-neutral-400">
          Cargando acceso...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
