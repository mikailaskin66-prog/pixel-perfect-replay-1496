import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, Menu, MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { conversationsQuery, profileQuery } from "@/lib/chat-data";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Assistant — FAIS-LE" },
      { name: "description", content: "Discute avec FAIS-LE pour transformer tes idées en actions." },
      { property: "og:title", content: "Assistant — FAIS-LE" },
      { property: "og:description", content: "Discute avec FAIS-LE pour transformer tes idées en actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: ChatLayout,
});

function ChatLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="grid h-dvh place-items-center text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-72 shrink-0 border-r bg-sidebar md:flex">
        <Sidebar userId={user.id} email={user.email ?? ""} onNavigate={() => {}} />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-80 bg-sidebar p-0">
          <SheetTitle className="sr-only">Conversations</SheetTitle>
          <Sidebar userId={user.id} email={user.email ?? ""} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <Menu />
          </Button>
          <Logo className="text-lg" />
        </header>
        <Outlet />
      </div>
    </div>
  );
}

function Sidebar({ userId, email, onNavigate }: { userId: string; email: string; onNavigate: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const params = useParams({ strict: false }) as { threadId?: string };
  const { data: conversations = [] } = useQuery(conversationsQuery(userId));
  const { data: profile } = useQuery(profileQuery(userId));

  async function remove(id: string) {
    if (!confirm("Supprimer cette conversation ? Cette action est définitive.")) return;
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (error) return toast.error("Suppression impossible.");
    qc.invalidateQueries({ queryKey: ["conversations", userId] });
    if (params.threadId === id) navigate({ to: "/chat" });
  }

  async function signOut() {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/" });
  }

  const credits = profile?.credits;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="p-4">
        <Logo />
        <Button asChild className="mt-5 w-full justify-start rounded-xl" onClick={onNavigate}>
          <Link to="/chat">
            <Plus /> Nouvelle demande
          </Link>
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2">
        {conversations.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Aucune conversation pour l'instant.</p>}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center rounded-lg text-sm hover:bg-sidebar-accent ${params.threadId === c.id ? "bg-sidebar-accent font-semibold" : ""}`}
          >
            <Link
              to="/chat/$threadId"
              params={{ threadId: c.id }}
              onClick={onNavigate}
              className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2"
            >
              <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{c.title}</span>
            </Link>
            <button
              onClick={() => remove(c.id)}
              className="mr-1 rounded p-1.5 text-muted-foreground opacity-100 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
              aria-label="Supprimer la conversation"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </nav>
      <div className="border-t p-4">
        <div className="rounded-xl bg-card p-3 shadow-soft">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Crédits restants</span>
            <span className={`font-display text-2xl font-bold ${credits === 0 ? "text-destructive" : ""}`}>{credits ?? "…"}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-signal" style={{ width: `${Math.min(100, credits ?? 0)}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">1 crédit par message envoyé.</p>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{email}</span>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Se déconnecter">
            <LogOut />
          </Button>
        </div>
      </div>
    </div>
  );
}
