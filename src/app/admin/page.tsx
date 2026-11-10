"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Package,
  ShoppingBag,
  History,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { StoreSettingsTab } from "@/components/admin/StoreSettingsTab";
import { InventoryTab } from "@/components/admin/InventoryTab";
import { CategoriesTab } from "@/components/admin/CategoriesTab";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { AuditTab } from "@/components/admin/AuditTab";
import { Toast, ToastProps } from "@/components/ui/Toast";
import { Tag } from "lucide-react";

type TabId = "inventario" | "categorias" | "pedidos" | "ajustes" | "auditoria";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>("inventario");
  const [tasaBcv, setTasaBcv] = useState<number>(52.50);
  const [toast, setToast] = useState<Omit<ToastProps, "onClose"> | null>(null);

  // Cargar tasa de respaldo desde almacenamiento
  useEffect(() => {
    const saved = localStorage.getItem("ocumare_tasa_bcv");
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) {
        setTasaBcv(parsed);
      }
    }
  }, []);

  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    setToast({ message, type });
  }

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "inventario", label: "Inventario de Productos", icon: Package },
    { id: "categorias", label: "Categorías", icon: Tag },
    { id: "pedidos", label: "Monitor de Pedidos & Chat P2P", icon: ShoppingBag },
    { id: "ajustes", label: "Ajustes de Tienda & Tasa BCV", icon: Settings },
    { id: "auditoria", label: "Historial y Auditoría", icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* Barra de pestañas */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-3">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Indicador de Tasa BCV Global */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">Tasa BCV del Sistema:</span>
          <span className="font-mono font-bold text-emerald-400">
            Bs. {tasaBcv.toFixed(2)} / USD
          </span>
        </div>
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="mt-4">
        {activeTab === "ajustes" && (
          <StoreSettingsTab
            onTasaUpdated={(nuevaTasa) => setTasaBcv(nuevaTasa)}
            showToast={showToast}
          />
        )}

        {activeTab === "inventario" && (
          <InventoryTab tasaBcv={tasaBcv} showToast={showToast} />
        )}

        {activeTab === "categorias" && (
          <CategoriesTab showToast={showToast} />
        )}

        {activeTab === "pedidos" && <OrdersTab showToast={showToast} />}

        {activeTab === "auditoria" && <AuditTab showToast={showToast} />}
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
