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
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import AgentInsights from "@/components/AgentInsights";
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
  const summaries = bootstrap.summaries ?? [];
  const advice = bootstrap.advice ?? [];
  const goalStatuses = bootstrap.goal_statuses ?? [];
  const budgetStatuses = bootstrap.budget_statuses ?? [];
  const patternSummaries = bootstrap.pattern_summaries ?? [];
  const forecast = bootstrap.forecast;
  const subscriptionReview = bootstrap.subscription_review;
  const dailySummary = summaries.find((item) => item.period === "daily");
  const weeklySummary = summaries.find((item) => item.period === "weekly");
  const nextAction = advice[0] ?? null;

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

  const topGoals = goalStatuses.slice(0, 3);
  const budgetAlerts = budgetStatuses.filter(
    (status) => status.status === "over" || status.status === "watch",
  );

  const stats = [
    { label: "Cash position", value: formatCurrency(summary.cash_balance), icon: Wallet },
    {
      label: "Spent this month",
      value: formatCurrency(summary.spending_this_month),
      icon: TrendingUp,
    },
    {
      label: "Health score",
      value: `${summary.health_score}/100`,
      icon: Sparkles,
    },
    {
      label: "Goal momentum",
      value: topGoals[0]
        ? topGoals[0].status === "achieved"
          ? "Achieved"
          : `${topGoals[0].progress_percent}%`
        : "Add goal",
      icon: Target,
    },
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
        className="rounded-[1.9rem] border border-border/80 bg-card/95 p-5 shadow-[0_24px_70px_-44px_rgba(110,73,75,0.28)] md:p-6"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              EVA workspace
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground md:text-4xl">
                {profile?.first_name ? `Welcome back, ${profile.first_name}` : "Your financial overview"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                This workspace stays grounded in your onboarding baseline, approved spending history,
                and the next action EVA thinks deserves attention now.
              </p>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-primary/15 bg-primary/8 p-4 lg:max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Next recommendation
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {nextAction?.title ?? "Keep the logging loop alive"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {nextAction?.body ??
                "Log one more real expense so EVA can keep your dashboard, statements, and insights aligned."}
            </p>
            <Button
              type="button"
              className="mt-4 gap-2"
              onClick={() => navigate(nextAction?.cta_href ?? "/chat")}
            >
              {nextAction?.cta_label ?? "Open AI Advisor"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            custom={index}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="space-y-3 rounded-[1.35rem] border border-border/80 bg-card/95 p-4 shadow-[0_18px_48px_-38px_rgba(110,73,75,0.2)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {stat.label}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {hasSpendingHistory ? (
        <>
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
                    Next Action
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">
                    {nextAction?.title ?? "Keep the logging loop going"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {nextAction?.body ??
                      "Keep logging expenses in real time so eva can keep the rest of your workspace honest."}
                  </p>
                </div>
                <div className="hidden rounded-2xl bg-primary/10 p-3 text-primary md:block">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => navigate(nextAction?.cta_href ?? "/chat")}
                  className="justify-between"
                >
                  {nextAction?.cta_label ?? "Log another expense"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/spending-history")}
                >
                  Review spending history
                </Button>
              </div>
            </motion.div>

            <motion.div
              custom={5}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-[1.6rem] border border-border bg-card p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Budget Pressure
              </p>
              {budgetAlerts.length === 0 ? (
                <div className="mt-4 rounded-xl border border-border bg-background/75 p-4">
                  <p className="text-sm font-semibold text-foreground">No category is under pressure</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Your active budget limits are currently holding. Keep logging in real time so
                    eva can warn you before a category drifts over the line.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {budgetAlerts.slice(0, 3).map((status) => (
                    <div key={status.category} className="rounded-xl border border-border bg-background/75 p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          className={`h-4 w-4 ${
                            status.status === "over" ? "text-destructive" : "text-[hsl(var(--chart-4))]"
                          }`}
                        />
                        <p className="text-sm font-semibold text-foreground">{status.category}</p>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {status.status === "over"
                          ? `${formatCurrency(status.spent_this_month)} spent against a ${formatCurrency(status.monthly_limit)} limit.`
                          : `${status.percent_used}% of the budget is already used this month.`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <motion.div
              custom={6}
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

            {[dailySummary, weeklySummary].map((item, index) => (
              <motion.div
                key={item?.period ?? index}
                custom={index + 7}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="rounded-xl border border-border bg-card p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {item?.period === "daily" ? "Daily summary" : "Weekly summary"}
                </p>
                <h2 className="mt-3 text-base font-semibold text-foreground">
                  {item?.headline ?? "Summary unavailable"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item?.body ?? "Keep logging real activity and eva will fill this summary in."}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(item?.total_spent ?? 0)} tracked</span>
                  <span>{item?.event_count ?? 0} log(s)</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <motion.div
              custom={9}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Month-end forecast
              </p>
              <h2 className="mt-3 text-lg font-semibold text-foreground">
                {forecast
                  ? formatCurrency(forecast.projected_free_cash)
                  : formatCurrency(0)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {forecast?.summary ??
                  "Keep logging real expenses so eva can estimate where this month is heading."}
              </p>
              {forecast ? (
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(forecast.projected_end_of_month_spend)} projected spend</span>
                  <span>{forecast.days_remaining} day(s) left</span>
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full justify-between"
                onClick={() =>
                  navigate("/chat", {
                    state: {
                      starterPrompt: "Can I afford a $75 dinner this weekend?",
                      autoStart: false,
                    },
                  })
                }
              >
                Run affordability check
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>

            <motion.div
              custom={10}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pattern watch
              </p>
              {patternSummaries.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-border bg-background/75 p-4">
                  <p className="text-sm font-semibold text-foreground">Not enough history yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Log a few more real expenses and eva will surface category patterns here.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {patternSummaries.slice(0, 2).map((pattern) => (
                    <div key={pattern.id} className="rounded-xl border border-border bg-background/75 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{pattern.title}</p>
                        <span className="text-xs font-medium text-muted-foreground">
                          {pattern.direction === "up"
                            ? "Up"
                            : pattern.direction === "down"
                              ? "Down"
                              : "Steady"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {pattern.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div
              custom={11}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Subscription review
              </p>
              <h2 className="mt-3 text-lg font-semibold text-foreground">
                {subscriptionReview?.flagged_count
                  ? `${subscriptionReview.flagged_count} to review`
                  : "All clear for now"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {subscriptionReview?.summary ??
                  "Add or log recurring costs so eva can review subscription pressure more honestly."}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full justify-between"
                onClick={() => navigate("/subscriptions")}
              >
                Open subscriptions
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <motion.div
              custom={12}
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
              custom={13}
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
        </>
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
        <motion.div custom={11} initial="hidden" animate="visible" variants={fadeUp}>
          <AgentInsights />
        </motion.div>

        <motion.div
          custom={12}
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
                    <span
                      className={`text-xs font-semibold ${
                        goal.status === "achieved"
                          ? "text-primary"
                          : goal.status === "on_track"
                            ? "text-[hsl(var(--chart-2))]"
                            : "text-[hsl(var(--chart-4))]"
                      }`}
                    >
                      {goal.status === "achieved"
                        ? "Done"
                        : goal.status === "on_track"
                          ? "On track"
                          : "Needs attention"}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, goal.progress_percent))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {goal.status === "achieved"
                      ? "This goal is fully funded."
                      : `${formatCurrency(goal.monthly_contribution_needed)} per month keeps the current deadline realistic.`}
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
