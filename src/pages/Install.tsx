import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, CheckCircle2, Bell, Shield, Zap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import evaLockup from "@/assets/eva-lockup.png";
import evaAppIcon from "@/assets/eva-app-icon.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) setIsInstalled(true);

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Zap, title: "Instant Access", desc: "Launch eva from your home screen like a native finance app." },
    { icon: Bell, title: "Helpful Alerts", desc: "Receive spending insights, reminders, and progress nudges faster." },
    { icon: Shield, title: "Ready When You Are", desc: "Keep key views available even when your connection is unstable." },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="p-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-6 pb-12 text-center">
        <motion.div initial={{ scale: 0.84, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-6 flex flex-col items-center gap-5">
          <img
            src={evaAppIcon}
            alt="eva app icon"
            className="h-24 w-24 rounded-[2rem] object-cover shadow-[0_34px_55px_-32px_rgba(110,73,75,0.42)]"
          />
          <img src={evaLockup} alt="eva" className="h-16 w-auto max-w-full object-contain" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-2 text-2xl font-bold text-foreground"
        >
          Install eva
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8 max-w-sm text-muted-foreground"
        >
          Keep Your AI Finance Assistant on your home screen for faster access to spending clarity, planning, and cashflow guidance.
        </motion.p>

        {isInstalled ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-8 flex flex-col items-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <p className="font-medium text-foreground">eva is already installed.</p>
          </motion.div>
        ) : deferredPrompt ? (
          <Button size="lg" onClick={handleInstall} className="mb-8 w-full gap-2">
            <Download className="h-5 w-5" /> Install App
          </Button>
        ) : isIOS ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8 w-full space-y-3 rounded-2xl border border-border bg-card p-5 text-left shadow-[0_18px_42px_-34px_rgba(110,73,75,0.28)]"
          >
            <p className="text-sm font-medium text-foreground">Install on iPhone or iPad</p>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>Tap the <strong>Share</strong> button in Safari.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> to confirm.</li>
            </ol>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8 w-full space-y-3 rounded-2xl border border-border bg-card p-5 text-left shadow-[0_18px_42px_-34px_rgba(110,73,75,0.28)]"
          >
            <p className="text-sm font-medium text-foreground">Install on Android</p>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>Open the browser menu in Chrome.</li>
              <li>Tap <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Install</strong> to finish.</li>
            </ol>
          </motion.div>
        )}

        <div className="w-full space-y-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-start gap-3 text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
