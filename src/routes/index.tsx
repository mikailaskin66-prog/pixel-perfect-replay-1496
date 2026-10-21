import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, ListChecks, PenLine, Wrench } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FAIS-LE — Transforme tes idées en actions" },
      { name: "description", content: "Explique ce que tu veux avec tes mots. FAIS-LE le transforme en plan clair, en texte rédigé ou en solution concrète." },
      { property: "og:title", content: "FAIS-LE — Transforme tes idées en actions" },
      { property: "og:description", content: "L'assistant IA qui transforme tes idées en plans et résultats concrets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Compass, title: "Clarifier une idée", text: "Il pose les bonnes questions et reformule ton objectif." },
  { icon: ListChecks, title: "Un plan étape par étape", text: "Ton projet découpé en actions simples et ordonnées." },
  { icon: PenLine, title: "Rédiger pour toi", text: "Textes, messages, pages de site, présentations." },
  { icon: Wrench, title: "Résoudre un problème", text: "Il cherche la cause et propose une solution adaptée." },
];

function Index() {
  const { user } = useAuth();
  const cta = user ? "/chat" : "/auth";
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <Button asChild variant="ghost">
          <Link to={cta}>{user ? "Ouvrir l'assistant" : "Se connecter"}</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        <section className="py-16 md:py-28">
          <p className="mb-5 inline-flex rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
            100 messages offerts à l'inscription
          </p>
          <h1 className="max-w-4xl text-5xl font-extrabold leading-[0.95] md:text-8xl">
            Tu as une idée.
            <br />
            <span className="text-signal">On la fait.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
            Explique ce que tu veux avec tes propres mots. FAIS-LE le transforme en plan clair, en texte prêt à
            l'emploi ou en solution concrète.
          </p>
          <Button asChild size="lg" className="mt-9 h-12 rounded-full px-7 text-base">
            <Link to={cta}>
              Commencer maintenant <ArrowRight />
            </Link>
          </Button>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-soft">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        FAIS-LE · L'assistant ne peut pas agir à ta place sur internet : il te donne tout pour le faire.
      </footer>
    </div>
  );
}
