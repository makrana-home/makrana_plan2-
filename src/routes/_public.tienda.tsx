import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/tienda")({
  beforeLoad: () => {
    throw redirect({ to: "/catalogo" });
  },
});
