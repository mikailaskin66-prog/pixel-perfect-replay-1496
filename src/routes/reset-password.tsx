import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — FAIS-LE" },
      { name: "description", content: "Choisis un nouveau mot de passe pour ton compte FAIS-LE." },
      { property: "og:title", content: "Nouveau mot de passe — FAIS-LE" },
      { property: "og:description", content: "Choisis un nouveau mot de passe pour ton compte FAIS-LE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Le lien a expiré ou est invalide. Redemande un e-mail.");
      return;
    }
    toast.success("Mot de passe mis à jour.");
    navigate({ to: "/chat" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <Logo className="mb-8" />
      <form onSubmit={onSubmit} className="grid w-full max-w-sm gap-4 rounded-2xl border bg-card p-6 shadow-soft">
        <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
        <div className="grid gap-1.5">
          <Label htmlFor="pw">Mot de passe</Label>
          <Input id="pw" type="password" minLength={6} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="h-11" disabled={busy}>{busy ? "Un instant…" : "Enregistrer"}</Button>
      </form>
    </div>
  );
}
