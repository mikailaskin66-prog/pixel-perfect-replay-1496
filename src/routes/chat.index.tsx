import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Composer } from "@/components/chat/Composer";
import { useAuth } from "@/hooks/use-auth";
import { createConversation, pendingKey } from "@/lib/chat-data";

export const Route = createFileRoute("/chat/")({
  component: NewChat,
});

const suggestions = [
  "Je veux lancer une petite activité de vente en ligne, par où commencer ?",
  "Aide-moi à créer le plan d'un site pour mon restaurant",
  "Rédige un message pour demander une augmentation",
  "Organise ma semaine pour avancer sur mon projet",
];

function NewChat() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  async function start(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const id = await createConversation();
      sessionStorage.setItem(pendingKey(id), text);
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
      navigate({ to: "/chat/$threadId", params: { threadId: id } });
    } catch {
      toast.error("Impossible de créer la conversation. Réessaie.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10">
        <h1 className="text-4xl font-extrabold md:text-6xl">
          Qu'est-ce qu'on <span className="text-signal">fait</span> ?
        </h1>
        <p className="mt-3 text-muted-foreground">Décris ton idée ou ton problème avec tes mots, même vaguement.</p>
        <div className="mt-8">
          <Composer onSend={start} status={busy ? "submitted" : "ready"} />
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {suggestions.map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => start(s)}
              className="rounded-xl border bg-card p-3 text-left text-sm transition-colors hover:border-primary"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
