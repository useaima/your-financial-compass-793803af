import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, User, Loader2, TrendingUp, Wallet, BarChart3, Calendar } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { streamChat, type Msg, type ParsedSpending } from "@/lib/streamChat";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import HealthScoreGauge from "@/components/HealthScoreGauge";

const quickActions = [
  { label: "Log spending", prompt: "I spent $12 on lunch and $5 on coffee today", icon: Wallet },
  { label: "Daily summary", prompt: "Give me my daily spending summary", icon: Calendar },
  { label: "Advise me", prompt: "Run a deep analysis of my spending and give me proactive advice.", icon: Sparkles },
  { label: "My score", prompt: "What's my financial score and how can I improve it?", icon: TrendingUp },
];

interface SpendingBubble {
  items: { category: string; amount: number; description: string }[];
  total: number;
}

type ChatEntry =
  | { type: "msg"; msg: Msg }
  | { type: "spending"; data: SpendingBubble };

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  const addEntry = useCallback((entry: ChatEntry) => {
    setEntries((prev) => [...prev, entry]);
  }, []);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Msg = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    addEntry({ type: "msg", msg: userMsg });
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setEntries((prev) => {
        const lastMsgIdx = prev.length - 1;
        const last = prev[lastMsgIdx];
        if (last?.type === "msg" && last.msg.role === "assistant") {
          return prev.map((e, i) =>
            i === lastMsgIdx ? { type: "msg", msg: { ...last.msg, content: assistantSoFar } } : e
          );
        }
        return [...prev, { type: "msg", msg: { role: "assistant", content: assistantSoFar } }];
      });
    };

    try {
      await streamChat({
        messages: newMessages,
        onDelta: upsertAssistant,
        onDone: () => {
          setIsLoading(false);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: assistantSoFar },
          ]);
        },
        onError: (err) => {
          toast.error(err);
          setIsLoading(false);
        },
        onSpendingParsed: (data: ParsedSpending) => {
          addEntry({ type: "spending", data: { items: data.items, total: data.total } });
          if (data.score) setScore(data.score);
        },
      });
    } catch {
      toast.error("Connection failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const isEmpty = entries.length === 0;

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen bg-background">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center h-full px-6 text-center gap-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/12 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-balance">AI Financial Advisor</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                Tell me what you spent today. I'll track it, spot patterns, and give you real advice to improve your finances.
              </p>
            </div>

            {score !== null && (
              <HealthScoreGauge score={score} />
            )}

            <div className="grid grid-cols-2 gap-2 max-w-md w-full">
              {quickActions.map((q) => (
                <button
                  key={q.label}
                  onClick={() => send(q.prompt)}
                  className="flex items-center gap-2.5 text-left text-xs px-4 py-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors active:scale-[0.97]"
                >
                  <q.icon className="w-4 h-4 text-primary shrink-0" />
                  <span>{q.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            <AnimatePresence initial={false}>
              {entries.map((entry, i) => {
                if (entry.type === "spending") {
                  return (
                    <motion.div
                      key={`spending-${i}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[85%] rounded-2xl bg-primary/5 border border-primary/20 px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-semibold text-primary">Spending Logged</span>
                          <span className="text-xs font-bold text-foreground ml-auto">${entry.data.total.toFixed(2)}</span>
                        </div>
                        <div className="space-y-1">
                          {entry.data.items.map((item, j) => (
                            <div key={j} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                {item.category} — {item.description}
                              </span>
                              <span className="font-medium text-foreground tabular-nums">${item.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                const msg = entry.msg;
                return (
                  <motion.div
                    key={`msg-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg bg-primary/12 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border border-border rounded-bl-md"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p style={{ overflowWrap: "break-word" }}>{msg.content}</p>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {isLoading && (() => {
              const last = entries[entries.length - 1];
              const isAssistantStreaming = last?.type === "msg" && last.msg.role === "assistant";
              if (isAssistantStreaming) return null;
              return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/12 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                  </div>
                </motion.div>
              );
            })()}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Score bar */}
      {score !== null && entries.length > 0 && (
        <div className="border-t border-border bg-card/80 px-4 py-2 flex items-center justify-center gap-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Financial Score:</span>
          <span className="text-sm font-bold tabular-nums text-primary">
            {score}/100
          </span>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-card/50 p-3 md:p-4">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me what you spent today..."
            rows={1}
            className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground"
            style={{ maxHeight: "120px", overflowWrap: "break-word" }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || isLoading}
            className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-colors active:scale-[0.96]"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
