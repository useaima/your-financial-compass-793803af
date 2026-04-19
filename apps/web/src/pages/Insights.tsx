import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { FIREBASE_SETUP_MESSAGE, hasFirebaseConfig } from "@/integrations/firebase/client";
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
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(n);

const insightIcons: Record<string, typeof TrendingUp> = {
  positive: TrendingUp,
  negative: TrendingDown,
  warning: AlertTriangle,
  tip: Lightbulb,
};

const insightColors: Record<string, string> = {
  positive: "text-primary bg-primary/10 border-primary/20",
  negative: "text-destructive bg-destructive/10 border-destructive/20",
  warning:
    "text-[hsl(var(--chart-4))] bg-[hsl(var(--chart-5)/0.16)] border-[hsl(var(--chart-5)/0.26)]",
  tip: "text-[hsl(var(--chart-2))] bg-[hsl(var(--chart-2)/0.10)] border-[hsl(var(--chart-2)/0.18)]",
};

export default function Insights() {
  const { bootstrap } = usePublicUser();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>("weekly");

  const generate = async () => {
    if (!bootstrap.empty_flags.has_spending_history) {
      toast.error("Log some spending first so eva can generate real insights.");
      return;
    }

    if (!hasFirebaseConfig) {
      toast.error(FIREBASE_SETUP_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const result = await invokeEdgeFunction<InsightsData>("generate-insights", {
        frequency,
      });
      setData(result);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Spending Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with grounded daily and weekly summaries, then generate a deeper AI review when you
          want more detail.
        </p>
      </motion.div>

      <div className="grid gap-3 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Forecast
          </p>
          <h2 className="mt-3 text-base font-semibold text-foreground">
            {bootstrap.forecast?.status === "overextended"
              ? "This month is trending past break-even"
              : "Month-end cash forecast"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {bootstrap.forecast?.summary ??
              "Keep logging spending and eva will turn this into a grounded forecast."}
          </p>
          {bootstrap.forecast ? (
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(bootstrap.forecast.projected_free_cash)} projected free cash</span>
              <span>{formatCurrency(bootstrap.forecast.projected_end_of_month_spend)} projected spend</span>
            </div>
          ) : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pattern summaries
          </p>
          {bootstrap.pattern_summaries.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Not enough history yet. Once you keep logging, this panel will call out the categories
              that are rising, cooling off, or staying stubbornly steady.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {bootstrap.pattern_summaries.slice(0, 2).map((pattern) => (
                <div key={pattern.id} className="rounded-lg border border-border bg-background/70 p-3">
                  <p className="text-sm font-semibold text-foreground">{pattern.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{pattern.body}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(bootstrap.summaries ?? []).map((summary) => (
          <motion.div
            key={summary.period}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {summary.period === "daily" ? "Daily summary" : "Weekly summary"}
            </p>
            <h2 className="mt-3 text-base font-semibold text-foreground">{summary.headline}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{summary.body}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(summary.total_spent)} tracked</span>
              <span>{summary.event_count} log(s)</span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4"
      >
        {(["daily", "weekly", "monthly"] as Frequency[]).map((item) => (
          <button
            key={item}
            onClick={() => setFrequency(item)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors",
              frequency === item
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {item}
          </button>
        ))}
        <button
          onClick={generate}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : data ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {data ? "Refresh deep insight" : "Generate deep insight"}
        </button>
      </motion.div>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing your {frequency} spending...</p>
        </div>
      )}

      {!loading && !data && (
        <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            {bootstrap.empty_flags.has_spending_history
              ? "Your daily and weekly summaries above are already grounded in real logs. Generate a deeper AI view whenever you want category-level analysis and savings opportunities."
              : "Log a few real expenses first. Once you have spending history, eva will generate grounded insights instead of placeholders."}
          </p>
        </div>
      )}

      {!loading && data && (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Top spending categories
            </h2>
            <div className="space-y-3">
              {data.top_spending_categories.map((category, index) => (
                <div key={`${category.category}-${index}`} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{category.category}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCurrency(category.amount)} ({category.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${category.percentage}%` }}
                      transition={{ duration: 0.6, delay: index * 0.08 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {data.savings_opportunity > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/12">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Potential savings
                </p>
                <p className="text-2xl font-bold text-primary tabular-nums">
                  {formatCurrency(data.savings_opportunity)}
                </p>
                <p className="text-xs text-muted-foreground">
                  per {frequency === "daily" ? "day" : frequency === "weekly" ? "week" : "month"}
                </p>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.insights.map((insight, index) => {
              const Icon = insightIcons[insight.type] || Lightbulb;
              const colorClasses = insightColors[insight.type] || insightColors.tip;
              return (
                <motion.div
                  key={`${insight.title}-${index}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className={cn("rounded-xl border p-4", colorClasses)}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{insight.title}</p>
                      <p className="mt-1 text-xs opacity-80">{insight.description}</p>
                      {insight.amount !== undefined ? (
                        <p className="mt-2 text-sm font-bold tabular-nums">
                          {formatCurrency(insight.amount)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {data.summary ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  AI summary
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{data.summary}</p>
            </motion.div>
          ) : null}
        </div>
      )}
    </div>
  );
}
