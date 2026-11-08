import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Entrar — Gui Treinador" }, { name: "description", content: "Entre na plataforma Gui Treinador." }, { property: "og:title", content: "Entrar — Gui Treinador" }, { property: "og:description", content: "Entre na plataforma Gui Treinador." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
