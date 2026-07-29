import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/routes/auth";

export const Route = createFileRoute("/plataforma")({
  head: () => ({
    meta: [
      { title: "Plataforma · Makrana Home Art" },
      {
        name: "description",
        content: "Acceso privado a la plataforma interna de Makrana Home Art.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});
