import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Composer } from "@/components/chat/Composer";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { messagesQuery, pendingKey, profileQuery } from "@/lib/chat-data";

export const Route = createFileRoute("/chat/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { data, isLoading, error } = useQuery(messagesQuery(threadId));
  if (isLoading) return <div className="grid flex-1 place-items-center text-muted-foreground">Chargement…</div>;
  if (error)
    return (
      <div className="grid flex-1 place-items-center p-6 text-center">
        <div>
          <p>Impossible de charger cette conversation.</p>
          <Link to="/chat" className="mt-3 inline-block font-semibold text-primary">Nouvelle demande</Link>
        </div>
      </div>
    );
  return <ChatWindow key={threadId} threadId={threadId} initialMessages={data ?? []} />;
}

async function readError(err: Error) {
  try {
    const parsed = JSON.parse(err.message);
    if (parsed?.error) return parsed.error as string;
  } catch {
    /* not JSON */
  }
  if (/fetch|network/i.test(err.message)) return "Connexion impossible. Vérifie ta connexion internet.";
  return err.message || "Une erreur est survenue.";
}

function ChatWindow({ threadId, initialMessages }: { threadId: string; initialMessages: UIMessage[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user!.id));
  const [errorText, setErrorText] = useState<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { conversationId: threadId },
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [threadId],
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["profile", user!.id] });
    qc.invalidateQueries({ queryKey: ["conversations", user!.id] });
  };

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: async (err) => {
      const msg = await readError(err);
      setErrorText(msg);
      toast.error(msg);
      refresh();
    },
    onFinish: ({ messages: all }) => {
      qc.setQueryData(messagesQuery(threadId).queryKey, all);
      refresh();
    },
  });

  const send = (text: string) => {
    setErrorText(null);
    sendMessage({ text });
    setTimeout(refresh, 800);
  };

  const sentPending = useRef(false);
  useEffect(() => {
    if (sentPending.current) return;
    const pending = sessionStorage.getItem(pendingKey(threadId));
    if (pending) {
      sentPending.current = true;
      sessionStorage.removeItem(pendingKey(threadId));
      send(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const noCredits = profile?.credits === 0;
  const last = messages[messages.length - 1];
  const waiting = status === "submitted" || (status === "streaming" && last?.role === "user");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-6">
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent>
                {m.parts.map((part, i) => {
                  if (part.type === "text")
                    return m.role === "user" ? (
                      <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                    ) : (
                      <MessageResponse key={i}>{part.text}</MessageResponse>
                    );
                  if (part.type === "reasoning" && part.text)
                    return (
                      <Reasoning key={i} isStreaming={status === "streaming" && m.id === last?.id && i === m.parts.length - 1}>
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {waiting && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>FAIS-LE réfléchit…</Shimmer>
              </MessageContent>
            </Message>
          )}
          {errorText && status !== "streaming" && (
            <p className="rounded-xl border border-destructive/40 bg-card p-3 text-sm text-destructive">{errorText}</p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
        {noCredits && (
          <p className="mb-2 text-center text-sm text-muted-foreground">Tu as utilisé tous tes crédits. Tes conversations restent consultables.</p>
        )}
        <Composer onSend={send} status={status} onStop={stop} disabled={noCredits} />
      </div>
    </div>
  );
}
