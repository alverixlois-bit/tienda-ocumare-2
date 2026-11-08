"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ProductoRow } from "@/types/database.types";
import { convertirUsdaVes } from "@/utils/currency";
import Decimal from "decimal.js";

export interface CartItem {
  producto: ProductoRow;
  cantidad: number;
}

interface CartContextType {
  items: CartItem[];
  tasaBcv: number;
  setTasaBcv: (tasa: number) => void;
  totalItems: number;
  subtotalUSD: number;
  subtotalVES: number;
  abonoUSD: number;
  abonoVES: number;
  saldoPendienteUSD: number;
  saldoPendienteVES: number;
  agregarProducto: (producto: ProductoRow, cantidad?: number) => void;
  removerProducto: (productoId: string) => void;
  actualizarCantidad: (productoId: string, cantidad: number) => void;
  limpiarCarrito: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [tasaBcv, setTasaBcv] = useState<number>(52.5);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Cargar tasa y carrito guardado desde localStorage
  useEffect(() => {
    try {
      const savedTasa = localStorage.getItem("ocumare_tasa_bcv");
      if (savedTasa) {
        const parsed = parseFloat(savedTasa);
        if (!isNaN(parsed) && parsed > 0) setTasaBcv(parsed);
      }

      const savedCart = localStorage.getItem("ocumare_cart_items");
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
    } catch (e) {
      console.warn("Error leyendo localStorage:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("ocumare_cart_items", JSON.stringify(items));
    } catch (e) {
      console.warn("Error guardando carrito:", e);
    }
  }, [items, isHydrated]);

  function agregarProducto(producto: ProductoRow, cantidad = 1) {
    setItems((prev) => {
      const existente = prev.find((item) => item.producto.id === producto.id);
      if (existente) {
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        );
      }
      return [...prev, { producto, cantidad }];
    });
    setIsCartOpen(true);
  }

  function removerProducto(productoId: string) {
    setItems((prev) => prev.filter((item) => item.producto.id !== productoId));
  }

  function actualizarCantidad(productoId: string, cantidad: number) {
    if (cantidad <= 0) {
      removerProducto(productoId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.producto.id === productoId ? { ...item, cantidad } : item
      )
    );
  }

  function limpiarCarrito() {
    setItems([]);
  }

  // Cálculos financieros precisos
  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

  let subtotalUsdDec = new Decimal(0);
  items.forEach((item) => {
    const precio = item.producto.en_oferta && item.producto.precio_oferta
      ? item.producto.precio_oferta
      : item.producto.precio_base;
    const precioDec = new Decimal(precio || 0);
    subtotalUsdDec = subtotalUsdDec.plus(precioDec.times(item.cantidad));
  });

  const subtotalUSD = subtotalUsdDec.toNumber();
  const subtotalVES = Number(convertirUsdaVes(subtotalUSD, tasaBcv));

  // Metodología de encargo: 50% abono inicial y 50% contra entrega
  const abonoUSD = subtotalUsdDec.dividedBy(2).toNumber();
  const abonoVES = Number(convertirUsdaVes(abonoUSD, tasaBcv));

  const saldoPendienteUSD = subtotalUsdDec.minus(abonoUSD).toNumber();
  const saldoPendienteVES = Number(convertirUsdaVes(saldoPendienteUSD, tasaBcv));

  return (
    <CartContext.Provider
      value={{
        items,
        tasaBcv,
        setTasaBcv,
        totalItems,
        subtotalUSD,
        subtotalVES,
        abonoUSD,
        abonoVES,
        saldoPendienteUSD,
        saldoPendienteVES,
        agregarProducto,
        removerProducto,
        actualizarCantidad,
        limpiarCarrito,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe ser usado dentro de un CartProvider");
  }
  return context;
}
