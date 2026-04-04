import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { usePublicUser } from "@/context/PublicUserContext";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/finance";

type InsightCard = {
  id: string;
  title: string;
  body: string;
  type: "tip" | "warning" | "success" | "insight";
};

const typeIcons = {
  insight: Sparkles,
  warning: AlertTriangle,
  tip: Lightbulb,
  success: CheckCircle2,
};

const typeColors = {
  insight: "text-primary",
  warning: "text-[hsl(var(--chart-4))]",
  tip: "text-[hsl(var(--chart-2))]",
  success: "text-primary",
};

export default function AgentInsights() {
  const { bootstrap } = usePublicUser();
  const summary = bootstrap.dashboard_summary;
  const hasSpendingHistory = bootstrap.empty_flags.has_spending_history;

  const insights = useMemo<InsightCard[]>(() => {
    const nextInsights: InsightCard[] = [];

    if (!hasSpendingHistory) {
      return [];
    }

    if (summary.monthly_cashflow < 0) {
      nextInsights.push({
        id: "negative-cashflow",
        type: "warning",
        title: "Your monthly cash flow is negative",
        body: `Right now your fixed monthly plan is running about ${formatCurrency(Math.abs(summary.monthly_cashflow))} below break-even. Trim recurring costs or raise income before this becomes a habit.`,
      });
    } else {
      nextInsights.push({
        id: "positive-cashflow",
        type: "success",
        title: "You have room to save this month",
        body: `Your current monthly plan leaves about ${formatCurrency(summary.monthly_cashflow)} after fixed costs and subscriptions. Point that margin toward a goal before it disappears into reactive spending.`,
      });
    }

    if (bootstrap.subscriptions.length > 0) {
      nextInsights.push({
        id: "subscriptions",
        type: "tip",
        title: "Recurring costs are already visible",
        body: `eva is tracking ${bootstrap.subscriptions.length} subscription${bootstrap.subscriptions.length === 1 ? "" : "s"} worth about ${formatCurrency(summary.monthly_subscription_total)} each month.`,
      });
    }

    if (bootstrap.goals.length > 0) {
      const nextGoal = [...bootstrap.goals]
        .sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
      nextInsights.push({
        id: "goal-focus",
        type: "insight",
        title: "Your nearest goal is on the board",
        body: `${nextGoal.name} is your closest target. Keep updating progress so eva can tell you whether your current cash flow can support the timeline.`,
      });
    }

    return nextInsights.slice(0, 4);
  }, [bootstrap, hasSpendingHistory, summary]);

  if (!hasSpendingHistory) {
    return (
      <div className="rounded-[1.6rem] border border-dashed border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Insights unlock after a few logs</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              eva is waiting for real spending activity before it starts surfacing behavior
              patterns, watch-outs, and proactive recommendations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="space-y-2">
        {[1, 2].map((index) => (
          <div key={index} className="h-20 rounded-xl border border-border bg-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="h-3 w-3 text-primary" />
          eva insights
        </h2>
      </div>

      <div className="grid gap-2">
        {insights.map((insight, index) => {
          const Icon = typeIcons[insight.type];
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30"
            >
              <div
                className={cn(
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary",
                  typeColors[insight.type],
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold leading-tight text-foreground">
                  {insight.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {insight.body}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
