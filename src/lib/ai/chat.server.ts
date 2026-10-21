import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "./run-id";
import { SYSTEM_PROMPT } from "./system-prompt";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

function textOf(message: UIMessage | undefined) {
  if (!message) return "";
  return message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .trim();
}

export async function handleChat(request: Request): Promise<Response> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!apiKey || !supabaseUrl || !publishableKey) {
    console.error("[chat] configuration manquante (clé IA ou base de données)");
    return jsonError(500, "Le service n'est pas configuré correctement. Réessaie plus tard.");
  }

  // 1. Authentification
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token.split(".").length !== 3) return jsonError(401, "Tu dois être connecté.");
  const supabase = createClient<Database>(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return jsonError(401, "Ta session a expiré. Reconnecte-toi.");
  const userId = userData.user.id;

  // 2. Validation de la requête
  let body: { messages?: UIMessage[]; conversationId?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Requête invalide.");
  }
  const messages = body.messages;
  const conversationId = body.conversationId;
  if (!Array.isArray(messages) || messages.length === 0 || typeof conversationId !== "string") {
    return jsonError(400, "Requête invalide.");
  }
  const last = messages[messages.length - 1];
  const lastText = textOf(last);
  if (last.role !== "user" || !lastText) return jsonError(400, "Le message est vide.");
  if (lastText.length > 20000) return jsonError(400, "Le message est trop long (20 000 caractères max).");

  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .select("id, title")
    .eq("id", conversationId)
    .maybeSingle();
  if (convError) {
    console.error("[chat] lecture conversation", convError.message);
    return jsonError(500, "Impossible de lire la conversation.");
  }
  if (!conv) return jsonError(404, "Conversation introuvable.");

  // 3. Crédit (1 par message, décompté côté serveur de façon atomique)
  const { data: remaining, error: creditError } = await supabase.rpc("consume_credit");
  if (creditError) {
    console.error("[chat] crédit", creditError.message);
    return jsonError(500, "Impossible de vérifier tes crédits.");
  }
  if (remaining === -1) return jsonError(402, "Tu n'as plus de crédits.");

  let refunded = false;
  const refund = async () => {
    if (refunded) return;
    refunded = true;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("refund_credit", { _user_id: userId });
    if (error) console.error("[chat] remboursement", error.message);
  };

  // 4. Sauvegarde du message utilisateur
  const { error: saveError } = await supabase.from("messages").upsert(
    {
      conversation_id: conversationId,
      user_id: userId,
      ui_id: last.id,
      role: "user",
      parts: last.parts as unknown as Database["public"]["Tables"]["messages"]["Insert"]["parts"],
    },
    { onConflict: "conversation_id,ui_id" },
  );
  if (saveError) {
    console.error("[chat] sauvegarde message", saveError.message);
    await refund();
    return jsonError(500, "Impossible d'enregistrer ton message.");
  }
  const isFirst = messages.filter((m) => m.role === "user").length === 1;
  await supabase
    .from("conversations")
    .update({
      updated_at: new Date().toISOString(),
      ...(isFirst ? { title: lastText.slice(0, 60) } : {}),
    })
    .eq("id", conversationId);

  // 5. Appel IA en streaming
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  let failed = false;
  const result = streamText({
    model: provider.responses(MODEL),
    instructions: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
    onError: async ({ error }) => {
      failed = true;
      console.error("[chat] erreur IA", error instanceof Error ? error.message : error);
      await refund();
    },
  });

  const response = result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    onError: (error) => {
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 429) return "L'assistant est très sollicité. Réessaie dans un instant (ton crédit a été rendu).";
      if (status === 402) return "Le service IA est temporairement indisponible (quota atteint). Ton crédit a été rendu.";
      return "L'assistant n'a pas pu répondre. Ton crédit a été rendu, réessaie.";
    },
    onFinish: async ({ responseMessage }) => {
      if (failed || !responseMessage || responseMessage.parts.length === 0) return;
      const { error } = await supabase.from("messages").upsert(
        {
          conversation_id: conversationId,
          user_id: userId,
          ui_id: responseMessage.id,
          role: "assistant",
          parts: responseMessage.parts as unknown as Database["public"]["Tables"]["messages"]["Insert"]["parts"],
        },
        { onConflict: "conversation_id,ui_id" },
      );
      if (error) console.error("[chat] sauvegarde réponse", error.message);
    },
  });

  return withLovableAiGatewayRunIdHeader(response, runIdFetch);
}
