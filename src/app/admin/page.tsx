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
  Users,
  Menu,
  X,
  Bell,
  Clock,
  KeyRound,
} from "lucide-react";
import { CentroMandoTab } from "@/components/admin/CentroMandoTab";
import { BifurcatedChatTab } from "@/components/admin/BifurcatedChatTab";
import { InventoryTab } from "@/components/admin/InventoryTab";
import { CategoriesTab } from "@/components/admin/CategoriesTab";
import { PosFinancesTab } from "@/components/admin/PosFinancesTab";
import { SettingsGatewayTab } from "@/components/admin/SettingsGatewayTab";
import { AuditTab } from "@/components/admin/AuditTab";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { Toast, ToastProps } from "@/components/ui/Toast";
import { obtenerConfiguracionTienda } from "@/actions/config";

type AdminTabId =
  | "centro_mando"
  | "chats_bifurcados"
  | "inventario"
  | "categorias"
  | "caja_finanzas"
  | "ajustes_gateway"
  | "auditoria";

export default function UnifiedAdminMasterSPA() {
  const [activeTab, setActiveTab] = useState<AdminTabId>("centro_mando");
  const [tasaBcv, setTasaBcv] = useState<number>(64.5);
  const [toast, setToast] = useState<Omit<ToastProps, "onClose"> | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatTargetOrdenId, setChatTargetOrdenId] = useState<string | null>(null);
  const [operadorAlias, setOperadorAlias] = useState<string>("@carlos_admin");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ocumare_tasa_bcv");
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val > 0) setTasaBcv(val);
      }
    } catch {
      // LocalStorage fallback
    }

    obtenerConfiguracionTienda().then((conf) => {
      if (conf?.tasa_bcv) {
        const num = parseFloat(String(conf.tasa_bcv));
        if (!isNaN(num) && num > 0) setTasaBcv(num);
      }
    });
  }, []);

  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    setToast({ message, type });
  }

  function handleNavigateToChat(ordenId: string) {
    setChatTargetOrdenId(ordenId);
    setActiveTab("chats_bifurcados");
  }

  const navItems: { id: AdminTabId; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: "centro_mando", label: "Centro de Mando", icon: LayoutDashboard },
    { id: "chats_bifurcados", label: "Gestor de Chats P2P", icon: MessageSquare, badge: "En Vivo" },
    { id: "inventario", label: "Inventario & Catálogo", icon: Package },
    { id: "categorias", label: "Categorías al Vuelo", icon: Tag },
    { id: "caja_finanzas", label: "Caja POS & Finanzas P&L", icon: DollarSign },
    { id: "ajustes_gateway", label: "Pagos & Puntos Seguros", icon: Landmark },
    { id: "auditoria", label: "Auditoría & Bitácora", icon: History },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F172A] text-slate-100 font-sans select-none">
      
      {/* Toast Notificaciones */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* 1. Sidebar Fijo Master ERP (Stitch Design) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1320] border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo y Encabezado Sidebar */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#064E3B] text-[#84CC16] flex items-center justify-center font-black shadow-md">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-black text-sm text-white block leading-tight tracking-tight">
                  Encargos Boutique
                </span>
                <span className="text-[10px] text-cyan-400 font-mono tracking-wider uppercase block">
                  Master Control ERP
                </span>
              </div>
            </Link>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menú de Navegación SPA */}
          <nav className="p-3 space-y-1.5 flex-1">
            <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
              Módulos Principales
            </span>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
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

        {/* Footer Sidebar: Perfil de Operador y Acceso a la Tienda */}
        <div className="p-4 border-t border-slate-800 bg-[#070D18] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-xs font-mono font-bold text-white block">
                  {operadorAlias}
                </span>
                <span className="text-[10px] text-slate-500 block">En Línea &bull; Vendedor</span>
              </div>
            </div>

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
              <span className="text-[10px] text-slate-500 font-mono">/catalogo</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* 2. Área de Contenido Principal (SPA) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Barra Superior */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h2 className="font-display font-extrabold text-sm sm:text-base text-white capitalize leading-tight">
                {activeTab.replace("_", " ")}
              </h2>
              <span className="text-[11px] text-slate-400">
                Encargos Boutique &bull; OcumareHub Central Control
              </span>
            </div>
          </div>

          {/* Tasa BCV & Indicadores de Estado */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Tasa Oficial BCV:</span>
              <span className="font-mono font-bold text-[#84CC16]">
                Bs. {tasaBcv.toFixed(2)}
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Supabase Realtime</span>
            </span>
          </div>
        </header>

        {/* Contenido Dinámico de la Pestaña Activa */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0B1320]/60">
          <div className="max-w-7xl mx-auto">
            {activeTab === "centro_mando" && (
              <CentroMandoTab
                tasaBcv={tasaBcv}
                onTasaUpdated={(nt) => {
                  setTasaBcv(nt);
                  showToast(`Tasa BCV fijada a Bs. ${nt.toFixed(2)}`, "success");
                }}
                showToast={showToast}
                onNavigateToChat={handleNavigateToChat}
              />
            )}

            {activeTab === "chats_bifurcados" && (
              <BifurcatedChatTab
                initialOrdenId={chatTargetOrdenId}
                showToast={showToast}
              />
            )}

            {activeTab === "inventario" && (
              <InventoryTab
                tasaBcv={tasaBcv}
                showToast={showToast}
              />
            )}

            {activeTab === "categorias" && (
              <CategoriesTab showToast={showToast} />
            )}

            {activeTab === "caja_finanzas" && (
              <PosFinancesTab
                tasaBcv={tasaBcv}
                showToast={showToast}
              />
            )}

            {activeTab === "ajustes_gateway" && (
              <SettingsGatewayTab
                onTasaUpdated={(nt) => setTasaBcv(nt)}
                showToast={showToast}
              />
            )}

            {activeTab === "auditoria" && (
              <AuditTab showToast={showToast} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
