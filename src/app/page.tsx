import Link from "next/link";
import { ShoppingBag, Store, ShieldCheck, ArrowRight, Zap, RefreshCw } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-700/60 backdrop-blur-md bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              OcumareHub
            </span>
            <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              v2.0
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-300">
            <span className="inline-flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Supabase Conectado
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700/70 px-4 py-1.5 rounded-full text-xs text-slate-300 mb-6">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>E-commerce por Encargo para Venezuela • 50% Inicial / 50% Entrega</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight sm:leading-tight">
          Tu Tienda Virtual <br />
          <span className="bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Moderna, Rápida y Multidivisa
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
          Plataforma dual integrada: experiencia dinámica para compradores y panel de control administrativo en tiempo real para el vendedor con soporte de pagos en USD y tasa BCV.
        </p>

        {/* Portals Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-4xl mx-auto">
          {/* Card Comprador */}
          <Link
            href="/catalogo"
            className="p-8 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-emerald-500/50 transition-all group backdrop-blur block shadow-lg hover:shadow-emerald-500/5"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-6">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">
              Explorar Catálogo
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Catálogo visual dinámico, precios duales en USD y Bolívares (BCV), carrito de compras por abono y pasarela de pago segura con chat directo estilo Binance P2P.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Ir a la tienda</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card Modalidad Encargos */}
          <div className="p-8 rounded-2xl bg-slate-800/40 border border-slate-700/50 transition-all backdrop-blur block">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-6">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white">
              Modalidad por Encargo
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Aparta tu producto abonando sólo el 50% inicial en Bolívares a tasa oficial BCV o divisas. El 50% restante lo cancelas contra entrega o previo al despacho por Zoom / MRW / Tealca.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm font-medium text-cyan-400">
              <span>100% Garantizado y seguro</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>OcumareHub &copy; {new Date().getFullYear()} — Diseñado para el comercio nacional y envíos Zoom/MRW/Tealca.</p>
      </footer>
    </main>
  );
}
