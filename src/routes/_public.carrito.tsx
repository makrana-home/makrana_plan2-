import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { readCart, writeCart, type CartItem } from "@/lib/cart";
import { priceCart } from "@/lib/commerce.functions";

export const Route = createFileRoute("/_public/carrito")({ component: CartPage });

function CartPage() {
  const price = useServerFn(priceCart);
  const [items, setItems] = useState<CartItem[]>([]);
  const [priced, setPriced] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => setItems(readCart()), []);
  useEffect(() => {
    if (!items.length) return setPriced([]);
    price({
      data: {
        items: items.map((item) => ({
          product_id: item.productId,
          presentation_id: item.presentationId,
          quantity: item.quantity,
        })),
      },
    })
      .then(setPriced)
      .catch((reason) => setError(reason.message));
  }, [items, price]);
  function change(index: number, quantity: number) {
    const next = items
      .map((item, itemIndex) => (itemIndex === index ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);
    writeCart(next);
    setItems(next);
  }
  const total = priced.reduce((sum, item) => sum + item.subtotal, 0);
  return (
    <section className="bg-cream/45 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[.24em] text-brand-terracotta">
          Tu selección
        </p>
        <h1 className="mt-2 font-display text-4xl">Carrito</h1>
        {!items.length ? (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <ShoppingBag className="size-10 text-brand-terracotta" />
              <p className="mt-4 text-muted-foreground">Tu carrito está vacío.</p>
              <Button asChild className="mt-5">
                <Link to="/catalogo">Explorar catálogo</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {items.map((item, index) => {
                const row = priced[index];
                return (
                  <Card key={`${item.productId}-${item.presentationId ?? ""}`}>
                    <CardContent className="flex gap-4 p-4">
                      <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-sand/30">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt="" className="size-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{row?.name ?? item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row?.physical ? "Artículo físico" : "Contenido digital"}
                          {row?.presentation_label ? ` · ${row.presentation_label}` : ""}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            aria-label="Reducir"
                            onClick={() => change(index, item.quantity - 1)}
                          >
                            <Minus />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            aria-label="Aumentar"
                            onClick={() => change(index, Math.min(100, item.quantity + 1))}
                          >
                            <Plus />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Eliminar"
                            onClick={() => change(index, 0)}
                          >
                            <Trash2 />
                          </Button>
                          <span className="ml-auto font-semibold">
                            S/ {Number(row?.subtotal ?? 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Card className="h-fit">
              <CardContent className="p-5">
                <h2 className="font-display text-2xl">Resumen</h2>
                <div className="mt-5 flex justify-between border-t pt-4">
                  <span>Subtotal</span>
                  <strong>S/ {total.toFixed(2)}</strong>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  El envío y la disponibilidad se confirman en el checkout.
                </p>
                {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
                <Button
                  asChild
                  className="mt-5 w-full"
                  disabled={Boolean(error) || priced.length !== items.length}
                >
                  <Link to="/checkout">Continuar</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
