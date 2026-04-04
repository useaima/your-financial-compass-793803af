import { useMemo } from "react";
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
  ArrowRight,
  CreditCard,
  PiggyBank,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import AgentInsights from "@/components/AgentInsights";
import EbooksSection from "@/components/EbooksSection";
import HealthScoreGauge from "@/components/HealthScoreGauge";
import { Button } from "@/components/ui/button";
import { usePublicUser } from "@/context/PublicUserContext";
import {
  SPENDING_CATEGORY_COLORS,
  formatCurrency,
} from "@/lib/finance";

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
  const { bootstrap } = usePublicUser();
  const summary = bootstrap.dashboard_summary;
  const profile = bootstrap.profile;
  const hasSpendingHistory = bootstrap.empty_flags.has_spending_history;

  const categoryBreakdown = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const totals: Record<string, number> = {};

    bootstrap.spending_logs
      .filter((log) => log.date.startsWith(currentMonth))
      .forEach((log) => {
        log.items.forEach((item) => {
          totals[item.category] = (totals[item.category] || 0) + Number(item.amount || 0);
        });
      });

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bootstrap.spending_logs]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        key,
        month: date.toLocaleDateString("en-US", { month: "short" }),
        spending: 0,
      };
    });

    for (const log of bootstrap.spending_logs) {
      const month = months.find((item) => log.date.startsWith(item.key));
      if (month) {
        month.spending += Number(log.total || 0);
      }
    }

    return months;
  }, [bootstrap.spending_logs]);

  const topGoals = useMemo(
    () =>
      bootstrap.goals
        .map((goal) => ({
          ...goal,
          progress:
            goal.target_amount > 0
              ? Math.round((goal.current_amount / goal.target_amount) * 100)
              : 0,
        }))
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 3),
    [bootstrap.goals],
  );

  const stats = [
    { label: "Cash balance", value: formatCurrency(summary.cash_balance), icon: Wallet },
    { label: "Net worth", value: formatCurrency(summary.net_worth), icon: PiggyBank },
    { label: "Monthly income", value: formatCurrency(summary.monthly_income), icon: TrendingUp },
    { label: "Monthly cash flow", value: formatCurrency(summary.monthly_cashflow), icon: Target },
  ];

  const starterCards = [
    {
      title: "Start tracking your spending",
      description:
        "Log today's real expenses so eva can begin building category trends and smarter guidance.",
      cta: "Log today's expense",
      icon: Wallet,
      onClick: () =>
        navigate("/chat", {
          state: {
            starterPrompt: "I spent $20 on food and $10 on transport today",
            autoStart: false,
          },
        }),
    },
    {
      title: bootstrap.empty_flags.has_subscriptions
        ? "Review your subscriptions"
        : "Add subscriptions",
      description:
        profile?.subscription_awareness === "yes" || profile?.subscription_awareness === "not_sure"
          ? "Recurring costs looked important during onboarding, so this is the fastest second win."
          : "If you have recurring costs, add them now so monthly cash flow stays honest.",
      cta: bootstrap.empty_flags.has_subscriptions ? "Open subscriptions" : "Add subscription",
      icon: CreditCard,
      onClick: () => navigate("/subscriptions"),
    },
    {
      title: "Your insights will appear here",
      description:
        "After a few real logs, eva will surface patterns, coaching, and next-best actions based on your behavior.",
      cta: "Talk to eva",
      icon: Sparkles,
      onClick: () => navigate("/chat"),
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-balance">
          {profile?.first_name ? `Welcome, ${profile.first_name}` : "Your Financial Overview"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything here is based on your onboarding details and the real activity you log.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            custom={index}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="space-y-2 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold tabular-nums">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {hasSpendingHistory ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-5"
          >
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Financial health
            </h2>
            <HealthScoreGauge score={summary.health_score} />
          </motion.div>

          <motion.div
            custom={5}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="rounded-xl border border-border bg-card p-5"
          >
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Spending breakdown
            </h2>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    stroke="hsl(var(--card))"
                  >
                    {categoryBreakdown.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          SPENDING_CATEGORY_COLORS[
                            entry.name as keyof typeof SPENDING_CATEGORY_COLORS
                          ] || "hsl(var(--chart-5))"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "10px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                      boxShadow: "0 18px 40px -28px rgba(50, 38, 32, 0.45)",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {categoryBreakdown.slice(0, 4).map((category) => (
                <div
                  key={category.name}
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{
                      background:
                        SPENDING_CATEGORY_COLORS[
                          category.name as keyof typeof SPENDING_CATEGORY_COLORS
                        ],
                    }}
                  />
                  {category.name}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            custom={6}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="rounded-xl border border-border bg-card p-5"
          >
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Spending trend
            </h2>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="spendingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "10px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                      boxShadow: "0 18px 40px -28px rgba(50, 38, 32, 0.45)",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="spending"
                    stroke="hsl(var(--primary))"
                    fill="url(#spendingGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="rounded-[1.6rem] border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Start Here
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">
                  Your dashboard is ready for real activity
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  We have your baseline from onboarding. The next win is to log a real expense or
                  recurring cost so eva can start learning your actual money habits.
                </p>
              </div>
              <div className="hidden rounded-2xl bg-primary/10 p-3 text-primary md:block">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {starterCards.map((card, index) => (
                <motion.div
                  key={card.title}
                  custom={index + 5}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  className="rounded-[1.35rem] border border-border bg-background/75 p-4"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">{card.title}</h3>
                  <p className="mt-2 min-h-[72px] text-sm leading-relaxed text-muted-foreground">
                    {card.description}
                  </p>
                  <Button
                    type="button"
                    variant={index === 0 ? "default" : "outline"}
                    className="mt-4 w-full justify-between"
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
            className="rounded-[1.6rem] border border-border bg-card p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              From Onboarding
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-background/75 p-4">
                <p className="text-xs font-medium text-muted-foreground">Main focus</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {profile?.budgeting_focus || "Build stronger money habits"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/75 p-4">
                <p className="text-xs font-medium text-muted-foreground">Monthly buffer</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {formatCurrency(summary.monthly_cashflow)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Based on your income, fixed expenses, and recurring costs.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/75 p-4">
                <p className="text-xs font-medium text-muted-foreground">Starter goal</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {topGoals[0]?.name ?? "No goal added yet"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {topGoals[0]
                    ? `${formatCurrency(topGoals[0].target_amount)} target`
                    : "You can add one any time from the goals page."}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
        <motion.div custom={7} initial="hidden" animate="visible" variants={fadeUp}>
          <AgentInsights />
        </motion.div>

        <motion.div
          custom={8}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Goals in focus
            </h2>
            <span className="text-xs text-muted-foreground">{bootstrap.goals.length} total</span>
          </div>
          {topGoals.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-background/70 p-5 text-center">
              <p className="text-sm font-medium text-foreground">No goals yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add a goal to turn this panel into a real progress tracker.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {topGoals.map((goal) => (
                <div key={goal.id} className="rounded-xl border border-border bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{goal.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{goal.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary">{goal.progress}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, goal.progress))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <EbooksSection />
    </div>
  );
}
