import type { ChatStatus } from "ai";
import { useState } from "react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

export function Composer({
  onSend,
  status,
  onStop,
  disabled,
}: {
  onSend: (text: string) => void;
  status: ChatStatus;
  onStop?: () => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const busy = status === "submitted" || status === "streaming";
  return (
    <PromptInput
      className="rounded-2xl bg-card shadow-soft"
      onSubmit={(msg) => {
        const t = (msg.text ?? "").trim();
        if (!t || busy || disabled) return;
        onSend(t);
        setText("");
      }}
    >
      <PromptInputBody>
        <PromptInputTextarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={disabled ? "Tu n'as plus de crédits." : "Dis-moi ce que tu veux faire…"}
          disabled={disabled}
        />
      </PromptInputBody>
      <PromptInputFooter className="justify-between">
        <span className="pl-2 text-xs text-muted-foreground">Entrée pour envoyer · 1 crédit</span>
        <PromptInputSubmit status={status} onStop={onStop} disabled={disabled || (!busy && !text.trim())} />
      </PromptInputFooter>
    </PromptInput>
  );
}
