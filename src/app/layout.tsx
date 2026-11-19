import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Encargos Boutique | Tienda Online por Encargo y Despachos",
  description:
    "Boutique digital de compras por encargo en Venezuela. Envíos nacionales y entregas personales con abono del 50%, tasa oficial BCV y seguimiento en vivo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${plusJakarta.variable} ${instrumentSans.variable}`}>
      <body className="antialiased min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#FAFAF9] text-slate-900 font-sans selection:bg-[#84CC16]/30">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
