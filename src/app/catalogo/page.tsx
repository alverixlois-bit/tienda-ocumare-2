import { redirect } from "next/navigation";

/**
 * /catalogo redirige a / (Portal del Comprador unificado).
 * La experiencia principal del catálogo vive en src/app/page.tsx
 */
export default function CatalogoPage() {
  redirect("/");
}
