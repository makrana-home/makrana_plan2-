import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/_public/pago/retorno")({
  validateSearch: (s: Record<string, unknown>) => ({ code: String(s.code ?? "") }),
  component: PaymentReturn,
});

function PaymentReturn() {
  const { code } = Route.useSearch();
  return (
    <section className="px-4 py-24 text-center">
      <h1 className="font-display text-4xl">Estamos verificando tu pago</h1>
      <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
        Volver de Easy Pay no confirma el pago. Makrana validará la operación desde administración.
      </p>
      {code && (
        <Button asChild className="mt-6">
          <Link to="/pedido/$code" params={{ code }} search={{ token: "" }}>
            Consultar pedido
          </Link>
        </Button>
      )}
    </section>
  );
}
