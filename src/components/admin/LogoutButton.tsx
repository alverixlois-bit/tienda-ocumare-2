"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      } catch (err) {
        console.error("Error signing out:", err);
      }
    });
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-900/40 bg-red-950/20 hover:bg-red-950/50 text-red-400 hover:text-red-300 text-xs font-medium transition-colors disabled:opacity-50"
      title="Cerrar Sesión"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>{isPending ? "Saliendo..." : "Cerrar Sesión"}</span>
    </button>
  );
}
