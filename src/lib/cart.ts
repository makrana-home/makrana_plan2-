import { useEffect, useState } from "react";

export type CartItem = {
  productId: string;
  presentationId?: string;
  name: string;
  imageUrl?: string | null;
  type: string;
  quantity: number;
};

const key = "makrana:cart:v1";
const eventName = "makrana-cart-change";

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter(validItem) : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(key, JSON.stringify(items.filter(validItem)));
  window.dispatchEvent(new Event(eventName));
}

export function addToCart(item: CartItem) {
  const items = readCart();
  const existing = items.find(
    (entry) => entry.productId === item.productId && entry.presentationId === item.presentationId,
  );
  if (existing) existing.quantity = Math.min(100, existing.quantity + item.quantity);
  else items.push(item);
  writeCart(items);
}

export function clearCart() {
  writeCart([]);
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    const refresh = () => setItems(readCart());
    refresh();
    window.addEventListener(eventName, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(eventName, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return { items, writeCart, clearCart };
}

function validItem(value: any): value is CartItem {
  return (
    value &&
    typeof value.productId === "string" &&
    typeof value.name === "string" &&
    Number.isFinite(value.quantity) &&
    value.quantity > 0 &&
    value.quantity <= 100
  );
}
