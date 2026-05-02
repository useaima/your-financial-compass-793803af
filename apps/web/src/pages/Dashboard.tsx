import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  ClipboardCheck,
  CreditCard,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import AgentInsights from "@/components/AgentInsights";
import HealthScoreGauge from "@/components/HealthScoreGauge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { usePublicUser } from "@/context/PublicUserContext";
import { DashboardOverview } from "@/features/dashboard/DashboardOverview";
import { DashboardStatsGrid } from "@/features/dashboard/DashboardStatsGrid";
import {
  SPENDING_CATEGORY_COLORS,
  formatCurrency,
} from "@/lib/finance";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      delay: index * 0.08,
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { bootstrap, runAgentPlanner } = usePublicUser();
  const [plannerRunning, setPlannerRunning] = useState(false);
  const summary = bootstrap.dashboard_summary;
  const profile = bootstrap.profile;
  const hasSpendingHistory = bootstrap.empty_flags.has_spending_history;
  const summaries = bootstrap.summaries ?? [];
  const advice = bootstrap.advice ?? [];
  const goalStatuses = bootstrap.goal_statuses ?? [];
  const budgetStatuses = bootstrap.budget_statuses ?? [];
  const patternSummaries = bootstrap.pattern_summaries ?? [];
  const forecast = bootstrap.forecast;
  const pendingApprovals = bootstrap.approval_requests.filter((request) => request.status === "pending");
  const recentAction = bootstrap.action_history[0] ?? null;
  const agentMode = bootstrap.profile?.agent_mode ?? "manual";

  const topGoals = useMemo(() => {
    return (bootstrap.goals ?? [])
      .slice(0, 2)
      .map((g) => {
        const status = goalStatuses.find((s) => s.id === g.id);
        return {
          ...g,
          progress_percent: status?.progress_percent ?? 0,
          status: status?.status ?? "on_track",
          monthly_contribution_needed: status?.monthly_contribution_needed ?? 0,
        };
      });
  }, [bootstrap.goals, goalStatuses]);

  const handleRunPlanner = async () => {
    setPlannerRunning(true);
    try {
      await runAgentPlanner();
      toast.success(agentMode === "autopilot" ? "Planner checked for safe proposals." : "Planner suggestions refreshed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The planner could not run right now.");
    } finally {
      setPlannerRunning(false);
    }
  };

  const starterCards = [
    {
      title: "Log Spending",
      description: "Record a recent purchase to help eva understand your habits.",
      icon: Wallet,
      cta: "Add Entry",
      onClick: () => navigate("/transactions"),
    },
    {
      title: "Check Subscriptions",
      description: "See if there are any recurring costs you want to track or cut.",
      icon: CreditCard,
      cta: "View List",
      onClick: () => navigate("/subscriptions"),
    },
    {
      title: "Refine Goals",
      description: "Set a savings target to see how your current cashflow fits.",
      icon: Target,
      cta: "Go to Goals",
      onClick: () => navigate("/goals"),
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 px-6 pb-20 pt-8 md:pt-12">
      <SEO
        title="Dashboard"
        description="Your financial overview, insights, and goal tracking in one place."
      />

      <header className="flex flex-col gap-2">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <span className="h-2 w-2 rounded-full bg-primary" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
            Overview
          </p>
        </motion.div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Welcome back, {profile?.display_name || "there"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Here is what is happening with your money today.
            </p>
          </div>
          <Button
            onClick={() => navigate("/transactions")}
            className="h-11 gap-2 rounded-2xl px-6 shadow-lg shadow-primary/20"
          >
            Log spending <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <motion.section
        custom={0}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="grid gap-4 md:grid-cols-3"
      >
        <button
          type="button"
          onClick={() => navigate("/approvals")}
          className="rounded-[1.6rem] border border-border/50 bg-card/70 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
              {pendingApprovals.length} pending
            </span>
          </div>
          <p className="mt-4 text-sm font-bold text-foreground">Approval inbox</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Review proposal-first Phase E actions before anything dispatches or becomes action history.
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate("/action-history")}
          className="rounded-[1.6rem] border border-border/50 bg-card/70 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <ArrowRight className="h-5 w-5" />
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-muted-foreground">
              {recentAction?.status?.replace("_", " ") ?? "No receipts"}
            </span>
          </div>
          <p className="mt-4 text-sm font-bold text-foreground">Action history</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Track approved actions, UTG/manual status, receipts, and reconciliation outcomes.
          </p>
        </button>

        <div className="rounded-[1.6rem] border border-primary/20 bg-primary/5 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </span>
            <span className="rounded-full bg-background/80 px-2.5 py-1 text-xs font-bold capitalize text-foreground">
              {agentMode}
            </span>
          </div>
          <p className="mt-4 text-sm font-bold text-foreground">Proposal planner</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Phase G autopilot can create proposals only. Approval and execution always stay in your hands.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            onClick={handleRunPlanner}
            disabled={plannerRunning}
          >
            {plannerRunning ? "Checking..." : "Run planner"}
          </Button>
        </div>
      </motion.section>

      {hasSpendingHistory ? (
        <>
          <div className="grid grid-cols-1 gap-6">
            <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp}>
              <DashboardStatsGrid />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
            <motion.div
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-[2rem] border border-border/40 bg-card/40 p-1 shadow-sm backdrop-blur-md"
            >
              <div className="rounded-[1.8rem] bg-background/50 p-6">
                <DashboardOverview />
              </div>
            </motion.div>

            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="flex flex-col gap-6"
            >
              <div className="flex-1 rounded-[2rem] border border-border/40 bg-card/40 p-6 shadow-sm backdrop-blur-md transition-all hover:border-primary/20">
                <HealthScoreGauge />
              </div>
            </motion.div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="group rounded-[2.2rem] border border-border/40 bg-card/40 p-8 shadow-xl backdrop-blur-2xl transition-all hover:border-primary/20"
          >
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3 w-3" />
                  Starter Guide
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Your dashboard is ready for real activity
                </h2>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                  We have your baseline from onboarding. The next win is to log a real expense or
                  recurring cost so eva can start learning your actual money habits.
                </p>
              </div>
              <div className="hidden rounded-2xl bg-primary/10 p-4 text-primary shadow-inner md:block group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {starterCards.map((card, index) => (
                <motion.div
                  key={card.title}
                  custom={index + 5}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  className="flex flex-col rounded-[1.8rem] border border-border/40 bg-background/60 p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:bg-background/80"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <card.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-base font-bold text-foreground">{card.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {card.description}
                  </p>
                  <Button
                    type="button"
                    variant={index === 0 ? "default" : "outline"}
                    className="mt-6 w-full justify-between rounded-xl"
                    onClick={card.onClick}
                  >
                    {card.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            custom={7}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="rounded-[2.2rem] border border-border/40 bg-card/40 p-8 shadow-xl backdrop-blur-2xl"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70">
              Profile Summary
            </p>
            <div className="mt-6 space-y-4">
              <div className="group rounded-2xl border border-border/40 bg-background/40 p-5 transition-colors hover:bg-background/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Main focus</p>
                <p className="mt-2.5 text-base font-bold text-foreground">
                  {profile?.budgeting_focus || "Build stronger money habits"}
                </p>
              </div>
              <div className="group rounded-2xl border border-border/40 bg-background/40 p-5 transition-colors hover:bg-background/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Monthly buffer</p>
                <p className="mt-2.5 text-xl font-bold text-foreground">
                  {formatCurrency(summary.monthly_cashflow)}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Based on income, fixed expenses, and recurring costs.
                </p>
              </div>
              <div className="group rounded-2xl border border-border/40 bg-background/40 p-5 transition-colors hover:bg-background/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Starter goal</p>
                <p className="mt-2.5 text-base font-bold text-foreground">
                  {topGoals[0]?.name ?? "No goal added yet"}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {topGoals[0]
                    ? `${formatCurrency(topGoals[0].target_amount)} target`
                    : "Add one any time from the goals page."}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <motion.div custom={11} initial="hidden" animate="visible" variants={fadeUp}>
          <AgentInsights />
        </motion.div>

        <motion.div
          custom={12}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="rounded-[2.2rem] border border-border/40 bg-card/40 p-8 shadow-xl backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70">
              Goals in focus
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary ring-1 ring-primary/20">
              {bootstrap.goals.length} total
            </span>
          </div>
          {topGoals.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/20 p-8 text-center">
              <div className="rounded-full bg-muted/20 p-3">
                <Target className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm font-bold text-foreground">No active goals</p>
              <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-muted-foreground">
                Add a goal to turn this panel into a real progress tracker.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {topGoals.map((goal) => (
                <div key={goal.id} className="group rounded-[1.8rem] border border-border/40 bg-background/50 p-6 transition-all hover:bg-background/80 hover:shadow-md">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-2xl shadow-sm ring-1 ring-border/50 group-hover:scale-110 transition-transform">
                        {goal.icon}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-foreground">{goal.name}</p>
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
                        goal.status === "achieved"
                          ? "bg-primary/10 text-primary ring-primary/20"
                          : goal.status === "on_track"
                            ? "bg-green-500/10 text-green-500 ring-green-500/20"
                            : "bg-orange-500/10 text-orange-500 ring-orange-500/20"
                      )}
                    >
                      {goal.status === "achieved"
                        ? "Done"
                        : goal.status === "on_track"
                          ? "On track"
                          : "Attention"}
                    </span>
                  </div>
                  <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-secondary/50 shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(100, goal.progress_percent))}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full bg-primary shadow-[0_0_12px_rgba(var(--primary),0.3)]"
                    />
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                    {goal.status === "achieved"
                      ? "Goal fully funded."
                      : `${formatCurrency(goal.monthly_contribution_needed)}/mo to stay on track.`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
