import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — FAIS-LE" },
      { name: "description", content: "Connecte-toi ou crée ton compte FAIS-LE." },
      { property: "og:title", content: "Connexion — FAIS-LE" },
      { property: "og:description", content: "Connecte-toi ou crée ton compte FAIS-LE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/chat" });
  }, [user, loading, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setInfo(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/chat" },
        });
        if (error) throw error;
        setInfo("Compte créé ! Ouvre l'e-mail de confirmation que tu viens de recevoir pour l'activer.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        setInfo("Si ce compte existe, un e-mail pour choisir un nouveau mot de passe vient d'être envoyé.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(msg === "Invalid login credentials" ? "E-mail ou mot de passe incorrect." : msg);
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error("La connexion a échoué. Réessaie.");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <Logo className="mb-8" />
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-soft">
        <h1 className="text-2xl font-bold">
          {mode === "signin" ? "Bon retour" : mode === "signup" ? "Créer un compte" : "Mot de passe oublié"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signup" ? "100 messages offerts pour commencer." : mode === "forgot" ? "On t'envoie un lien par e-mail." : "Content de te revoir."}
        </p>

        {mode !== "forgot" && (
          <div className="mt-6 grid gap-2">
            <Button variant="outline" className="h-11" onClick={() => social("google")}>
              Continuer avec Google
            </Button>
            <button type="button" className="lovable-auth-button" onClick={() => social("lovable")}>
              Continue with Lovable
            </button>
            <div className="my-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "forgot" && (
            <div className="grid gap-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          {info && <p className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">{info}</p>}
          <Button type="submit" className="h-11" disabled={busy}>
            {busy ? "Un instant…" : mode === "signin" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
          </Button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2 text-sm">
          {mode === "signin" && (
            <>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setMode("forgot")}>Mot de passe oublié ?</button>
              <button className="font-semibold text-primary" onClick={() => setMode("signup")}>Pas encore de compte ? S'inscrire</button>
            </>
          )}
          {mode !== "signin" && (
            <button className="font-semibold text-primary" onClick={() => setMode("signin")}>J'ai déjà un compte</button>
          )}
        </div>
      </div>
    </div>
  );
}
