import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Lightbulb } from "lucide-react";
import { hasSupabaseConfig, SUPABASE_SETUP_MESSAGE, supabase } from "@/integrations/supabase/client";
import { usePublicUser } from "@/context/PublicUserContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Frequency = "daily" | "weekly" | "monthly";

interface InsightItem {
  title: string;
  description: string;
  type: "positive" | "negative" | "warning" | "tip";
  amount?: number;
}

interface InsightsData {
  frequency: string;
  insights: InsightItem[];
  top_spending_categories: { category: string; amount: number; percentage: number }[];
  summary: string;
  savings_opportunity: number;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

const insightIcons: Record<string, typeof TrendingUp> = {
  positive: TrendingUp,
  negative: TrendingDown,
  warning: AlertTriangle,
  tip: Lightbulb,
};

const insightColors: Record<string, string> = {
  positive: "text-primary bg-primary/10 border-primary/20",
  negative: "text-destructive bg-destructive/10 border-destructive/20",
  warning: "text-[hsl(var(--chart-4))] bg-[hsl(var(--chart-5)/0.16)] border-[hsl(var(--chart-5)/0.26)]",
  tip: "text-[hsl(var(--chart-2))] bg-[hsl(var(--chart-2)/0.10)] border-[hsl(var(--chart-2)/0.18)]",
};

export default function Insights() {
  const { bootstrap, publicUserId } = usePublicUser();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>("monthly");

  const generate = async () => {
    if (!bootstrap.empty_flags.has_spending_history) {
      toast.error("Log some spending first so eva can generate real insights.");
      return;
    }

    if (!hasSupabaseConfig) {
      toast.error(SUPABASE_SETUP_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-insights", {
        body: { frequency, public_user_id: publicUserId },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setData(result);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-24 md:pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Spending Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-powered analysis of your spending patterns</p>
      </motion.div>

      {/* Frequency selector */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="flex items-center gap-2"
      >
        {(["daily", "weekly", "monthly"] as Frequency[]).map((f) => (
          <button
            key={f}
            onClick={() => setFrequency(f)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
              frequency === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
          </button>
        ))}
        <button
          onClick={generate}
          disabled={loading}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {data ? "Refresh" : "Generate Insights"}
        </button>
      </motion.div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Analyzing your {frequency} spending...</p>
        </div>
      )}

      {!loading && !data && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/12 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground max-w-sm">
            {bootstrap.empty_flags.has_spending_history
              ? "Select your preferred frequency and generate AI-powered insights from your real spending history."
              : "Log a few real expenses first. Once you have spending history, eva will generate grounded insights instead of placeholders."}
          </p>
        </div>
      )}

      {!loading && data && (
        <div className="space-y-6">
          {/* Top spending categories */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Top Spending Categories</h2>
            <div className="space-y-3">
              {data.top_spending_categories.map((cat, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground font-medium">{cat.category}</span>
                    <span className="text-muted-foreground tabular-nums">{formatCurrency(cat.amount)} ({cat.percentage}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${cat.percentage}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Savings opportunity */}
          {data.savings_opportunity > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/12 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Potential Savings</p>
                <p className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(data.savings_opportunity)}</p>
                <p className="text-xs text-muted-foreground">per {frequency === "daily" ? "day" : frequency === "weekly" ? "week" : "month"}</p>
              </div>
            </motion.div>
          )}

          {/* Insights grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.insights.map((insight, i) => {
              const Icon = insightIcons[insight.type] || Lightbulb;
              const colorClasses = insightColors[insight.type] || insightColors.tip;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className={cn("rounded-xl border p-4", colorClasses)}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{insight.title}</p>
                      <p className="text-xs mt-1 opacity-80">{insight.description}</p>
                      {insight.amount !== undefined && (
                        <p className="text-sm font-bold mt-2 tabular-nums">{formatCurrency(insight.amount)}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Summary */}
          {data.summary && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">AI Summary</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
