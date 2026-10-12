"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import DogRunner from "@/components/DogRunner";
import { playSfx } from "@/lib/sfx";

type Source = { title: string; heading: string; score: number };
type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };

const SUGGESTIONS = [
  "How do hints work?",
  "How is a tie broken?",
  "Husky or Malamute?",
  "Help me with my math homework",
];

const GREETING: Message = {
  role: "assistant",
  content:
    "Woof! I'm **Tiffee**. Ask me about the game rules, scoring and hints, how to tell breeds apart, or dog care and training. Need help with something else, like homework? I can't do that, but I'll find you a canine companion to keep you company!",
};

/** **bold** only; everything else stays plain text (no HTML injection). */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}

/** Tiny markdown subset: paragraphs, "- " bullet lists and **bold**. */
function Rich({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul${blocks.length}`} className="my-1 list-disc space-y-0.5 pl-5">
          {bullets.map((b, i) => (
            <li key={i}>{inline(b)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  for (const line of text.split("\n")) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) bullets.push(bullet[1]);
    else {
      flush();
      if (line.trim()) blocks.push(<p key={`p${blocks.length}`}>{inline(line)}</p>);
    }
  }
  flush();
  return <div className="space-y-1.5">{blocks}</div>;
}

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tiffee is hidden during a live quiz so she can't be used to look up answers.
  const hidden = pathname.startsWith("/play");

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    if (ai === null) {
      fetch("/api/chat")
        .then((r) => r.json())
        .then((d) => setAi(Boolean(d.ai)))
        .catch(() => setAi(false));
    }
  }, [open, ai]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    playSfx("click");
    setInput("");
    setBusy(true);

    // The greeting is UI only; the API conversation starts with the player's first question.
    const history = [...messages.filter((m) => m !== GREETING), { role: "user" as const, content: text }];
    setMessages([...messages, { role: "user", content: text }, { role: "assistant", content: "" }]);

    const patchLast = (patch: Partial<Message>) =>
      setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, ...patch } : m)));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Tiffee is napping. Please try again.");
      }
      let sources: Source[] = [];
      try {
        sources = JSON.parse(decodeURIComponent(res.headers.get("x-sources") ?? "[]"));
      } catch {
        /* sources are optional */
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        patchLast({ content: answer });
      }
      patchLast({ content: answer || "Woof... I had nothing to say. Try asking another way!", sources });
    } catch (err) {
      patchLast({ content: err instanceof Error ? err.message : "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  if (hidden) return null;

  const lastIsEmpty = busy && messages[messages.length - 1]?.content === "";
  const showChips = messages.length === 1;

  return (
    <>
      {open && (
        <section className="chat-panel" role="dialog" aria-label="Chat with Tiffee, the Breed Rush helper dog">
          <header className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-[#fff1dc] to-[#eaf3ff] px-4 py-3">
            <span className="grid size-11 flex-none place-items-center rounded-full bg-white shadow-sm">
              <DogRunner running={busy} className="!w-9" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg leading-tight">Tiffee</h2>
              <p className="truncate text-xs text-muted">
                {ai === null ? "Your helper dog" : ai ? "Answers from the game docs · powered by Claude" : "Searching the game docs"}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="btn btn-ghost !px-3 !py-1.5 text-sm" aria-label="Close chat">
              ✕
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] px-3.5 py-2.5 text-[0.95rem] leading-snug ${m.role === "user" ? "chat-bubble-user" : "chat-bubble-bot"}`}>
                  {m.content ? <Rich text={m.content} /> : null}
                  {m.role === "assistant" && i === messages.length - 1 && lastIsEmpty && (
                    <span className="text-muted">
                      <span className="inline-block animate-bounce-paw" aria-hidden="true">🐾</span> sniffing out an answer…
                    </span>
                  )}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-2">
                      {[...new Set(m.sources.map((s) => s.title))].slice(0, 3).map((t) => (
                        <span key={t} className="rounded-full bg-white px-2 py-0.5 text-[0.7rem] font-semibold text-muted">
                          📄 {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {showChips && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => void ask(s)} className="btn btn-ghost !px-3 !py-1.5 text-sm">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={onSubmit} className="flex gap-2 border-t border-line bg-white p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={600}
              placeholder="Ask Tiffee a question…"
              aria-label="Your question"
              autoComplete="off"
              className="text-input !py-2.5 !text-base"
            />
            <button type="submit" disabled={busy || !input.trim()} className="btn btn-primary !px-4" aria-label="Send question">
              ➤
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="chat-fab"
        onClick={() => {
          playSfx("click");
          setOpen((o) => !o);
        }}
        aria-label={open ? "Close chat with Tiffee" : "Chat with Tiffee, the helper dog"}
        aria-expanded={open}
      >
        <span className="fab-tip">{open ? "Close chat" : "Ask Tiffee!"}</span>
        <DogRunner running={busy} />
      </button>
    </>
  );
}
