import { queryOptions } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";

export const conversationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["conversations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("display_name, credits").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const messagesQuery = (conversationId: string) =>
  queryOptions({
    queryKey: ["messages", conversationId],
    staleTime: Infinity,
    queryFn: async (): Promise<UIMessage[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("ui_id, role, parts")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data.map((m) => ({
        id: m.ui_id,
        role: m.role as UIMessage["role"],
        parts: m.parts as unknown as UIMessage["parts"],
      }));
    },
  });

export async function createConversation() {
  const { data, error } = await supabase.from("conversations").insert({}).select("id").single();
  if (error) throw error;
  return data.id;
}

export const pendingKey = (id: string) => `fais-le:pending:${id}`;
