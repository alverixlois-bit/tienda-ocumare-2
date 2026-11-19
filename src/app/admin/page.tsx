"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  Tag,
  DollarSign,
  Landmark,
  History,
  Store,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  LogOut,
  Menu,
  X,
  ShoppingBag,
  User,
} from "lucide-react";
import { CentroMandoTab } from "@/components/admin/CentroMandoTab";
import { BifurcatedChatTab } from "@/components/admin/BifurcatedChatTab";
import { InventoryTab } from "@/components/admin/InventoryTab";
import { CategoriesTab } from "@/components/admin/CategoriesTab";
import { PosFinancesTab } from "@/components/admin/PosFinancesTab";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { SettingsGatewayTab } from "@/components/admin/SettingsGatewayTab";
import { AuditTab } from "@/components/admin/AuditTab";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { BcvRateModal } from "@/components/admin/BcvRateModal";
import { AdminProfilePanel } from "@/components/admin/AdminProfilePanel";
import { Toast, ToastProps } from "@/components/ui/Toast";
import { obtenerConfiguracionTienda } from "@/actions/config";
import { createClient } from "@/lib/supabase/client";



type AdminTabId =
  | "centro_mando"
  | "encargos"
  | "chats_bifurcados"
  | "inventario"
  | "categorias"
  | "caja_finanzas"
  | "ajustes_gateway"
  | "auditoria";

// Tabs para la barra inferior móvil (4 principales)
const BOTTOM_NAV: { id: AdminTabId; label: string; icon: React.ElementType }[] = [
  { id: "centro_mando", label: "Mando", icon: LayoutDashboard },
  { id: "encargos", label: "Encargos", icon: ShoppingBag },
  { id: "inventario", label: "Productos", icon: Package },
  { id: "chats_bifurcados", label: "Chats", icon: MessageSquare },
];

export default function UnifiedAdminMasterSPA() {
  const [activeTab, setActiveTab] = useState<AdminTabId>("centro_mando");
  const [tasaBcv, setTasaBcv] = useState<number>(64.5);
  const [toast, setToast] = useState<Omit<ToastProps, "onClose"> | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isBcvModalOpen, setIsBcvModalOpen] = useState(false);
  const [chatTargetOrdenId, setChatTargetOrdenId] = useState<string | null>(null);
  const [operadorAlias, setOperadorAlias] = useState<string>("@operador");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ocumare_tasa_bcv");
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val > 0) setTasaBcv(val);
      }
    } catch {}

    obtenerConfiguracionTienda().then((conf) => {
      if (conf?.tasa_bcv) {
        const num = parseFloat(String(conf.tasa_bcv));
        if (!isNaN(num) && num > 0) setTasaBcv(num);
      }
    });

    // Cargar alias real del admin autenticado
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const userId = data?.user?.id;
      if (!userId) return;
      (supabase as any)
        .from("perfiles_admin")
        .select("alias, nombre")
        .eq("id", userId)
        .maybeSingle()
        .then(({ data: perfil }: { data: any }) => {
          if (perfil?.alias) setOperadorAlias(perfil.alias);
          else if (perfil?.nombre) setOperadorAlias(`@${perfil.nombre.split(" ")[0].toLowerCase()}`);
        });
      // Heartbeat de presencia
      (supabase as any)
        .from("perfiles_admin")
        .update({ en_linea: true, ultima_conexion: new Date().toISOString() })
        .eq("id", userId)
        .then(() => {});
    });
  }, []);

  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    setToast({ message, type });
  }

  function handleNavigateToChat(ordenId: string) {
    setChatTargetOrdenId(ordenId);
    setActiveTab("chats_bifurcados");
  }

  function handleNavigateToEncargos() {
    setActiveTab("encargos");
  }

  const navItems: { id: AdminTabId; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: "centro_mando", label: "Centro de Mando", icon: LayoutDashboard },
    { id: "encargos", label: "Gestión de Encargos", icon: ShoppingBag },
    { id: "chats_bifurcados", label: "Gestor de Chats P2P", icon: MessageSquare, badge: "En Vivo" },
    { id: "inventario", label: "Inventario & Catálogo", icon: Package },
    { id: "categorias", label: "Categorías al Vuelo", icon: Tag },
    { id: "caja_finanzas", label: "Caja POS & Finanzas P&L", icon: DollarSign },
    { id: "ajustes_gateway", label: "Pagos & Puntos Seguros", icon: Landmark },
    { id: "auditoria", label: "Auditoría & Bitácora", icon: History },
  ];

  const activeLabel = navItems.find((n) => n.id === activeTab)?.label || activeTab;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#0F172A] text-slate-100 font-sans select-none w-full max-w-[100vw]">

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modal Tasa BCV */}
      {isBcvModalOpen && (
        <BcvRateModal
          tasaActual={tasaBcv}
          onClose={() => setIsBcvModalOpen(false)}
          onSaved={(nt) => {
            setTasaBcv(nt);
            showToast(`Tasa BCV fijada a Bs. ${nt.toFixed(2)}`, "success");
          }}
          showToast={showToast}
        />
      )}

      {/* Panel de Perfil Admin */}
      <AdminProfilePanel
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        showToast={showToast}
      />

      {/* ── SIDEBAR ── */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0B1320] border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out md:static md:w-64 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo sidebar */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#064E3B] text-[#84CC16] flex items-center justify-center font-black shadow-md shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-black text-sm text-white block leading-tight tracking-tight">Encargos Boutique</span>
                <span className="text-[10px] text-cyan-400 font-mono tracking-wider uppercase block">Master Control ERP</span>
              </div>
            </Link>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav sidebar */}
          <nav className="p-3 space-y-1.5 flex-1">
            <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Módulos Principales</span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-display font-bold text-xs transition-all ${
                    isActive
                      ? "bg-[#064E3B] text-[#84CC16] border border-[#0D6E53] shadow-md shadow-[#064E3B]/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#84CC16]" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#84CC16]/20 text-[#84CC16] border border-[#84CC16]/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer sidebar */}
        <div className="p-4 border-t border-slate-800 bg-[#070D18] space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 hover:bg-slate-800 rounded-xl px-2 py-1 transition-colors flex-1 min-w-0"
              title="Ver mi perfil"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-mono font-bold text-white block truncate">{operadorAlias}</span>
                <span className="text-[10px] text-slate-500 block">En Línea · Admin</span>
              </div>
              <User className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-auto" />
            </button>
            <LogoutButton />
          </div>
          <div className="pt-2 border-t border-slate-800/60">
            <Link
              href="/"
              target="_blank"
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ver Tienda Pública</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">/</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* ── ÁREA PRINCIPAL ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header superior */}
        <header className="h-14 sm:h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white bg-slate-800/80 active:scale-95 transition-all shrink-0"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5 text-[#84CC16]" />
            </button>
            <div className="min-w-0">
              <h2 className="font-display font-extrabold text-xs sm:text-base text-white capitalize leading-tight truncate">
                {activeLabel}
              </h2>
              <span className="text-[10px] text-slate-500 hidden xs:block">Encargos Boutique · OcumareHub</span>
            </div>
          </div>

          {/* Tasa BCV — clicar abre el modal */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsBcvModalOpen(true)}
              title="Tocar para actualizar la tasa BCV"
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-[#84CC16]/40 hover:bg-[#064E3B]/20 transition-all text-[11px] sm:text-xs"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-400 hidden sm:inline">BCV:</span>
              <span className="font-mono font-bold text-[#84CC16]">
                Bs. {tasaBcv.toFixed(2)}
              </span>
            </button>

            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              Realtime
            </span>
          </div>
        </header>

        {/* Contenido dinámico — `pb-24 md:pb-0` para que el bottom nav no tape */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 bg-[#0B1320]/60 pb-24 md:pb-6">
          <div className="max-w-7xl mx-auto w-full">
            {activeTab === "centro_mando" && (
              <CentroMandoTab
                tasaBcv={tasaBcv}
                onTasaUpdated={(nt) => { setTasaBcv(nt); showToast(`Tasa BCV fijada a Bs. ${nt.toFixed(2)}`, "success"); }}
                showToast={showToast}
                onNavigateToChat={handleNavigateToChat}
              />
            )}
            {activeTab === "encargos" && (
              <OrdersTab showToast={showToast} />
            )}
            {activeTab === "chats_bifurcados" && (
              <BifurcatedChatTab initialOrdenId={chatTargetOrdenId} showToast={showToast} />
            )}
            {activeTab === "inventario" && (
              <InventoryTab tasaBcv={tasaBcv} showToast={showToast} />
            )}
            {activeTab === "categorias" && (
              <CategoriesTab showToast={showToast} />
            )}
            {activeTab === "caja_finanzas" && (
              <PosFinancesTab tasaBcv={tasaBcv} showToast={showToast} />
            )}
            {activeTab === "ajustes_gateway" && (
              <SettingsGatewayTab onTasaUpdated={(nt) => setTasaBcv(nt)} showToast={showToast} />
            )}
            {activeTab === "auditoria" && (
              <AuditTab showToast={showToast} />
            )}
          </div>
        </main>
      </div>

      {/* ✅ BARRA DE NAVEGACIÓN INFERIOR FIJA — SOLO MÓVIL */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0B1320]/95 backdrop-blur-md border-t border-slate-800 shadow-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid grid-cols-4 h-16">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-all ${
                  isActive ? "text-[#84CC16]" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? "bg-[#064E3B]/60" : ""
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-bold leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
