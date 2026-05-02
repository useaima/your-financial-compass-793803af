import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Calendar,
  Camera,
  Image as ImageIcon,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  TrendingUp,
  User,
  Video,
  Wallet,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useLocation } from "react-router-dom";
import { streamChat, type Msg, type ParsedSpending } from "@/lib/streamChat";
import { clearChatStarter, readChatStarter } from "@/lib/chatStarter";
import { usePublicUser } from "@/context/PublicUserContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import HealthScoreGauge from "@/components/HealthScoreGauge";
import type { MediaAnalysisRequest } from "@/lib/evaContracts";

const quickActions = [
  { label: "Log spending", prompt: "I spent $12 on lunch and $5 on coffee today", icon: Wallet },
  { label: "Daily summary", prompt: "Give me my daily spending summary", icon: Calendar },
  { label: "Can I afford this?", prompt: "Can I afford a $60 dinner this weekend?", icon: BarChart3 },
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

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function BetaBadge() {
  return (
    <span className="rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      Beta
    </span>
  );
}

function formatMediaInsight(result: Awaited<ReturnType<ReturnType<typeof usePublicUser>["analyzeMedia"]>>) {
  const items = result.detected_items.length
    ? `\n\nDetected: ${result.detected_items.map((item) => `${item.label} (${item.category})`).join(", ")}`
    : "";
  const steps = result.suggested_next_steps.length
    ? `\n\nNext steps:\n${result.suggested_next_steps.map((step) => `- ${step}`).join("\n")}`
    : "";

  return `**Beta media insight**\n\n${result.summary}\n\n${result.recommendation}\n\n_${result.finance_context} Confidence: ${result.confidence}._${items}${steps}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("We could not read that file."));
    reader.readAsDataURL(file);
  });
}

function extractVideoFrame(file: File) {
  return new Promise<string>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.75, Math.max(0, video.duration / 3));
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(video.videoWidth || 1280, 1280);
      canvas.height = Math.round(canvas.width * ((video.videoHeight || 720) / (video.videoWidth || 1280)));
      const context = canvas.getContext("2d");
      if (!context) {
        cleanup();
        reject(new Error("This browser could not read a video frame."));
        return;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      cleanup();
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("We could not read that video. Try a shorter clip or a photo."));
    };
  });
}

export default function Chat() {
  const location = useLocation();
  const { analyzeMedia, checkAffordability, refresh } = usePublicUser();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mediaStatus, setMediaStatus] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const hasAutostarted = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  const addEntry = useCallback((entry: ChatEntry) => {
    setEntries((prev) => [...prev, entry]);
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const parseAffordabilityPrompt = useCallback((text: string) => {
    const normalized = text.trim().toLowerCase();
    const isAffordabilityQuestion =
      /\bafford\b/.test(normalized) || /\b(can i buy|should i buy|buy this|which option is better)\b/i.test(text);
    if (!isAffordabilityQuestion) return null;

    const cadence = /\b(each month|monthly|per month|every month)\b/i.test(text) ? "monthly" : "one_time";
    const itemMatch =
      text.match(/\bafford\s+(?:an?|the)?\s*([^?.!,]+?)(?:\s+based on|\s+with|\s+using|\?|$)/i) ??
      text.match(/\bbuy\s+(?:an?|the)?\s*([^?.!,]+?)(?:\s+based on|\s+with|\s+using|\?|$)/i);
    const itemLabel = itemMatch?.[1]?.replace(/\b(my finances|my budget|my spending)\b/gi, "").trim() ?? null;
    const amountMatch = text.match(/\$?\s?(\d+(?:\.\d{1,2})?)/);
    if (!amountMatch) {
      return { requiresClarification: true, cadence, itemLabel } as const;
    }

    const amount = Number(amountMatch[1]);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const categoryMatch = text.match(/\bfor\s+([a-z][a-z\s]{2,40})/i);

    return {
      requiresClarification: false,
      amount,
      cadence,
      category: categoryMatch?.[1]?.trim() ?? itemLabel,
    } as const;
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Msg = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    addEntry({ type: "msg", msg: userMsg });
    setInput("");
    setIsLoading(true);

    const affordabilityRequest = parseAffordabilityPrompt(trimmed);
    if (affordabilityRequest?.requiresClarification) {
      const subject = affordabilityRequest.itemLabel ? `the ${affordabilityRequest.itemLabel}` : "it";
      const assistantMsg: Msg = {
        role: "assistant",
        content: `I can help with that. I just need the price for ${subject} and whether it is a one-time cost or a monthly payment, then I will give you a quick affordability check based on your finances.`,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      addEntry({ type: "msg", msg: assistantMsg });
      setIsLoading(false);
      return;
    }

    if (affordabilityRequest) {
      try {
        const result = await checkAffordability(affordabilityRequest);
        const assistantMessage =
          `## Affordability check\n` +
          `- Amount: $${result.amount.toFixed(2)}${result.category ? ` for ${result.category}` : ""}\n` +
          `- Status: ${result.status.replace(/_/g, " ")}\n` +
          `- Projected free cash after this: $${result.projected_free_cash.toFixed(2)}\n` +
          `- Suggested limit: $${result.suggested_limit.toFixed(2)}\n\n` +
          `${result.summary}`;
        const assistantMsg: Msg = { role: "assistant", content: assistantMessage };
        setMessages((prev) => [...prev, assistantMsg]);
        addEntry({ type: "msg", msg: assistantMsg });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Affordability check failed.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setEntries((prev) => {
        const lastMsgIdx = prev.length - 1;
        const last = prev[lastMsgIdx];
        if (last?.type === "msg" && last.msg.role === "assistant") {
          return prev.map((entry, index) =>
            index === lastMsgIdx ? { type: "msg", msg: { ...last.msg, content: assistantSoFar } } : entry,
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
          setMessages((prev) => [...prev, { role: "assistant", content: assistantSoFar }]);
        },
        onError: (err) => {
          toast.error(err);
          setIsLoading(false);
        },
        onSpendingParsed: (data: ParsedSpending) => {
          addEntry({ type: "spending", data: { items: data.items, total: data.total } });
          if (data.score) setScore(data.score);
          void refresh();
        },
      });
    } catch {
      toast.error("Connection failed. Please try again.");
      setIsLoading(false);
    }
  }, [addEntry, checkAffordability, isLoading, messages, parseAffordabilityPrompt, refresh]);

  const analyzeMediaRequest = useCallback(async (request: MediaAnalysisRequest, userLabel: string) => {
    if (isLoading) return;
    const prompt = request.prompt.trim() || "What should I know financially about this?";
    const userMsg: Msg = { role: "user", content: `${userLabel}: ${prompt}` };
    setMessages((prev) => [...prev, userMsg]);
    addEntry({ type: "msg", msg: userMsg });
    setIsLoading(true);
    setMediaStatus("EVA is analyzing this media privately. Raw media is not stored by default.");

    try {
      const result = await analyzeMedia({ ...request, prompt });
      const assistantMsg: Msg = { role: "assistant", content: formatMediaInsight(result) };
      setMessages((prev) => [...prev, assistantMsg]);
      addEntry({ type: "msg", msg: assistantMsg });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Media analysis failed.";
      toast.error(message);
      setMediaStatus(message);
    } finally {
      setIsLoading(false);
    }
  }, [addEntry, analyzeMedia, isLoading]);

  const handleMediaFile = useCallback(async (file: File | undefined, source: "chat_upload" | "chat_video") => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Please use a file under 20 MB for this Beta.");
      return;
    }

    try {
      const mediaDataUrl = source === "chat_video" ? await extractVideoFrame(file) : await readFileAsDataUrl(file);
      await analyzeMediaRequest(
        {
          media_data_url: mediaDataUrl,
          media_type: source === "chat_video" ? "video_frame" : "image",
          source,
          prompt: input || "Analyze this and tell me if it fits my finances.",
          file_name: file.name,
        },
        source === "chat_video" ? "Video frame analysis" : "Photo analysis",
      );
      setInput("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not process that media.");
    }
  }, [analyzeMediaRequest, input]);

  const toggleVoiceInput = useCallback(() => {
    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? (window as typeof window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
          (window as typeof window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition
        : undefined;

    if (!SpeechRecognitionCtor) {
      toast.error("Voice input is not supported in this browser yet. You can still type your message.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) {
        setInput((prev) => [prev, transcript].filter(Boolean).join(" "));
      }
    };
    recognition.onerror = () => {
      toast.error("Voice input stopped. Please try again or type your message.");
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setCameraActive(true);
      setCameraError(null);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 0);
    } catch {
      setCameraError("Camera permission was denied or no camera was found.");
    }
  }, []);

  const analyzeCameraFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!video || !canvas || !context) {
      toast.error("Camera preview is not ready yet.");
      return;
    }

    canvas.width = Math.min(video.videoWidth || 1280, 1280);
    canvas.height = Math.round(canvas.width * ((video.videoHeight || 720) / (video.videoWidth || 1280)));
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    await analyzeMediaRequest(
      {
        media_data_url: canvas.toDataURL("image/jpeg", 0.82),
        media_type: "image",
        source: "chat_camera",
        prompt: input || "Can I buy this, and what should I compare before deciding?",
        file_name: "live-camera-frame.jpg",
      },
      "Live camera analysis",
    );
  }, [analyzeMediaRequest, input]);

  useEffect(() => {
    const routeState = location.state as { starterPrompt?: string; autoStart?: boolean } | null;
    let starterPrompt = routeState?.starterPrompt;
    let autoStart = routeState?.autoStart;

    if (!starterPrompt || autoStart === undefined) {
      const storedStarter = readChatStarter();
      if (storedStarter) {
        starterPrompt = storedStarter.starterPrompt ?? starterPrompt;
        autoStart = storedStarter.autoStart ?? autoStart;
      }
    }

    if (!starterPrompt || hasAutostarted.current) return;
    hasAutostarted.current = true;

    if (autoStart) {
      void send(starterPrompt);
    } else {
      setInput(starterPrompt);
    }

    clearChatStarter();

    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState({ ...(window.history.state ?? {}), usr: {} }, "", window.location.href);
    }
  }, [location.state, send]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  };

  const isEmpty = entries.length === 0;

  return (
    <div className="flex h-[100dvh] flex-col bg-background md:h-screen">
      <div className="sr-only" aria-live="polite">
        {isListening ? "Voice input is listening." : mediaStatus ?? cameraError ?? ""}
      </div>

      <div className="flex-1 overflow-y-auto" aria-label="EVA chat messages">
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12" aria-hidden="true">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-balance">EVA financial chat</h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Tell me what you spent, what feels tight, or what you want to afford next. I’ll keep it grounded in your real finances.
              </p>
            </div>

            {score !== null && <HealthScoreGauge score={score} />}

            <div className="grid w-full max-w-md grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => void send(action.prompt)}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-left text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.97]"
                >
                  <action.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
            <AnimatePresence initial={false}>
              {entries.map((entry, index) => {
                if (entry.type === "spending") {
                  return (
                    <motion.div key={`spending-${index}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Wallet className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                          <span className="text-xs font-semibold text-primary">Spending logged</span>
                          <span className="ml-auto text-xs font-bold tabular-nums text-foreground">${entry.data.total.toFixed(2)}</span>
                        </div>
                        <div className="space-y-1">
                          {entry.data.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex justify-between gap-3 text-xs">
                              <span className="text-muted-foreground">{item.category} — {item.description}</span>
                              <span className="font-medium tabular-nums text-foreground">${item.amount.toFixed(2)}</span>
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
                    key={`msg-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {msg.role === "assistant" && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12" aria-hidden="true">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        msg.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card",
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert [&_li]:my-0.5 [&_p]:my-1.5 [&_ul]:my-1.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p style={{ overflowWrap: "break-word" }}>{msg.content}</p>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary" aria-hidden="true">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3" role="status" aria-label="EVA is thinking">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12" aria-hidden="true">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
                  </div>
                </motion.div>
              );
            })()}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {score !== null && entries.length > 0 && (
        <div className="flex items-center justify-center gap-3 border-t border-border bg-card/80 px-4 py-2">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-xs font-medium text-muted-foreground">Financial Score:</span>
          <span className="text-sm font-bold tabular-nums text-primary">{score}/100</span>
        </div>
      )}

      <div className="border-t border-border bg-card/50 p-3 md:p-4">
        <div className="mx-auto max-w-2xl space-y-3">
          {(cameraActive || cameraError || mediaStatus) && (
            <div className="rounded-2xl border border-border bg-background/90 p-3 text-sm shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-medium">
                  <Camera className="h-4 w-4 text-primary" aria-hidden="true" />
                  Live camera assistant <BetaBadge />
                </div>
                {cameraActive && (
                  <button type="button" onClick={stopCamera} className="rounded-lg p-1 text-muted-foreground hover:text-foreground" aria-label="Stop camera">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {cameraError && <p className="text-xs text-destructive">{cameraError}</p>}
              {mediaStatus && !cameraError && <p className="text-xs text-muted-foreground">{mediaStatus}</p>}
              {cameraActive && (
                <div className="mt-3 space-y-3">
                  <video ref={videoRef} autoPlay muted playsInline className="max-h-56 w-full rounded-xl bg-black object-cover" aria-label="Live camera preview" />
                  <button
                    type="button"
                    onClick={() => void analyzeCameraFrame()}
                    disabled={isLoading}
                    className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    Analyze current frame
                  </button>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={cn("inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-secondary", isListening && "border-primary text-primary")}
              aria-pressed={isListening}
              aria-label={isListening ? "Stop voice input" : "Start voice input beta"}
            >
              {isListening ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
              Voice <BetaBadge />
            </button>
            <button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-secondary" aria-label="Upload photo for beta analysis">
              <ImageIcon className="h-4 w-4" aria-hidden="true" /> Photo <BetaBadge />
            </button>
            <button type="button" onClick={() => videoInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-secondary" aria-label="Upload video for beta analysis">
              <Video className="h-4 w-4" aria-hidden="true" /> Video <BetaBadge />
            </button>
            <button type="button" onClick={cameraActive ? stopCamera : () => void startCamera()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-secondary" aria-pressed={cameraActive} aria-label={cameraActive ? "Stop live camera beta" : "Start live camera beta"}>
              <Camera className="h-4 w-4" aria-hidden="true" /> Camera <BetaBadge />
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleMediaFile(event.target.files?.[0], "chat_upload")} aria-label="Upload photo for analysis" />
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(event) => void handleMediaFile(event.target.files?.[0], "chat_video")} aria-label="Upload video for analysis" />
          </div>

          <div className="flex items-end gap-2">
            <label htmlFor="eva-chat-input" className="sr-only">Message EVA</label>
            <textarea
              id="eva-chat-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about spending, affordability, or upload a receipt..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              style={{ maxHeight: "120px", overflowWrap: "break-word" }}
            />
            <button
              type="button"
              onClick={() => void send(input)}
              disabled={!input.trim() || isLoading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 active:scale-[0.96]"
              aria-label="Send message to EVA"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
