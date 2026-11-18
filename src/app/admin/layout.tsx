import React from "react";

export const metadata = {
  title: "Admin ERP Unificado — Control Total & Despachos | Encargos Boutique",
  description: "Master Control ERP: Centro de Mando, Despachos, Chats Bifurcados, Caja POS y Finanzas P&L.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans">
      {children}
    </div>
  );
}
