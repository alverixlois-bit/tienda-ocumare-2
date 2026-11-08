import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";

export const metadata: Metadata = {
  title: "OcumareHub | Tienda Online por Encargos",
  description: "Plataforma de comercio electrónico por encargos para Venezuela con pagos multidivisa (USD/VES) y seguimiento en tiempo real.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
