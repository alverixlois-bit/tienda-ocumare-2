import { createClient } from "@/lib/supabase/server";

export interface AuditoriaParams {
  email?: string | null;
  accion: string;
  tabla?: string | null;
  registroId?: string | number | null;
  detalles: any;
}

/**
 * Registra una acción de auditoría en la tabla `auditoria_logs` de Supabase.
 * Diseñado con tolerancia a fallos para no interrumpir operaciones principales.
 */
export async function registrarAccionAuditoria({
  email,
  accion,
  tabla,
  registroId,
  detalles,
}: AuditoriaParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Intentar obtener el correo del admin autenticado si no fue especificado
    let adminEmail = email;
    if (!adminEmail) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          adminEmail = user.email;
        }
      } catch {
        // Ignorar si no hay sesión activa
      }
    }

    if (!adminEmail) {
      adminEmail = "admin@ocumarehub.com";
    }

    const payload: Record<string, any> = {
      email: adminEmail,
      accion,
      tabla: tabla || null,
      registro_id: registroId !== undefined && registroId !== null ? String(registroId) : null,
      detalles: typeof detalles === "string" ? { mensaje: detalles } : detalles,
      created_at: new Date().toISOString(),
    };

    // 1. Intentar inserción con todas las columnas
    const { error } = await supabase.from("auditoria_logs").insert([payload as any]);

    // 2. Si falla por columnas que aún no se hayan migrado en Supabase
    if (error) {
      console.warn("Aviso auditoría (reintentando con formato simplificado):", error.message);
      const fallbackPayload = {
        accion: `${accion} [${tabla || "sistema"}]`,
        detalles: JSON.stringify({
          email: adminEmail,
          tabla,
          registroId,
          ...payload.detalles,
        }),
      };
      await supabase.from("auditoria_logs").insert([fallbackPayload as any]);
    }

    return { success: true };
  } catch (err: unknown) {
    console.warn("Excepción al registrar auditoría:", err);
    return { success: false, error: String(err) };
  }
}
