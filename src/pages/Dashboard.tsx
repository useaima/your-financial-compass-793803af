import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowRight, AlertTriangle, CheckCircle, Info, Users, Building2 } from "lucide-react";
import HealthScoreGauge from "@/components/HealthScoreGauge";
import EbooksSection from "@/components/EbooksSection";
import {
  totalBalance, monthlyIncome, monthlyExpenses, savingsRate, healthScore,
  categoryBreakdown, monthlyTrend, smartAlerts, CATEGORY_COLORS, type TransactionCategory,
} from "@/data/mockData";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: (i: number) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

const alertIcons = {
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const alertColors = {
  warning: "text-accent",
  success: "text-primary",
  info: "text-muted-foreground",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ first_name: string; user_type: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("first_name, user_type").eq("id", user.id).single()
      .then(({ data }) => { if (data) setProfile(data as any); });
  }, [user]);

  const isEnterprise = profile?.user_type === "enterprise";
  const predictedBalance = totalBalance - monthlyExpenses * 0.35;

  const personalStats = [
    { label: "Total Balance", value: formatCurrency(totalBalance), icon: Wallet, trend: null },
    { label: "Monthly Spending", value: formatCurrency(monthlyExpenses), icon: TrendingDown, trend: "+4.2%" },
    { label: "Savings Rate", value: `${savingsRate}%`, icon: PiggyBank, trend: null },
    { label: "Predicted EOM", value: formatCurrency(predictedBalance), icon: TrendingUp, trend: null },
  ];

  const enterpriseStats = [
    { label: "Company Balance", value: formatCurrency(totalBalance * 12), icon: Building2, trend: null },
    { label: "Team Spending", value: formatCurrency(monthlyExpenses * 8), icon: TrendingDown, trend: "+2.1%" },
    { label: "Budget Utilization", value: "74%", icon: PiggyBank, trend: null },
    { label: "Active Members", value: "24", icon: Users, trend: null },
  ];

  const stats = isEnterprise ? enterpriseStats : personalStats;

  const enterpriseAlerts = [
    { id: "e1", type: "warning" as const, message: "Q1 department budgets are 12% over forecast. Consider reallocation." },
    { id: "e2", type: "success" as const, message: "Procurement savings of $14,200 achieved this quarter through vendor consolidation." },
    { id: "e3", type: "info" as const, message: "3 expense reports pending approval from the marketing team." },
    { id: "e4", type: "warning" as const, message: "Travel expenses trending 18% above policy limits for the engineering department." },
  ];

  const activeAlerts = isEnterprise ? enterpriseAlerts : smartAlerts;

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-balance">
          {profile?.first_name ? `Welcome back, ${profile.first_name}` : "Financial Overview"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEnterprise
            ? "Here's your organization's financial performance."
            : "Here's how your money is working for you."}
        </p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="bg-card rounded-xl border border-border p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
              <s.icon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold tabular-nums">{s.value}</p>
            {s.trend && (
              <span className="text-[10px] font-medium text-accent">{s.trend} vs last month</span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Middle row: Health + Spending + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Health Score */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="bg-card rounded-xl border border-border p-5 flex flex-col items-center justify-center"
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {isEnterprise ? "Org Financial Health" : "Financial Health"}
          </h2>
          <HealthScoreGauge score={healthScore} />
        </motion.div>

        {/* Spending Breakdown */}
        <motion.div
          custom={5}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="bg-card rounded-xl border border-border p-5"
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {isEnterprise ? "Department Spending" : "Spending Breakdown"}
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
                      fill={CATEGORY_COLORS[entry.name as TransactionCategory] || "hsl(225 10% 30%)"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(225 12% 14%)",
                    border: "1px solid hsl(225 10% 20%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "hsl(210 20% 92%)",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {categoryBreakdown.slice(0, 4).map((c) => (
              <div key={c.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: CATEGORY_COLORS[c.name as TransactionCategory] }}
                />
                {c.name}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Monthly Trend */}
        <motion.div
          custom={6}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="bg-card rounded-xl border border-border p-5"
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {isEnterprise ? "Revenue vs Costs" : "Income vs Expenses"}
          </h2>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(162 48% 42%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(162 48% 42%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(350 60% 55%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(350 60% 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(215 12% 52%)" }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "hsl(225 12% 14%)",
                    border: "1px solid hsl(225 10% 20%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "hsl(210 20% 92%)",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="hsl(162 48% 42%)"
                  fill="url(#incomeGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="hsl(350 60% 55%)"
                  fill="url(#expenseGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" />
              {isEnterprise ? "Revenue" : "Income"}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="w-2 h-2 rounded-full" style={{ background: "hsl(350 60% 55%)" }} />
              {isEnterprise ? "Costs" : "Expenses"}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Smart Alerts */}
      <motion.div
        custom={7}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="space-y-2"
      >
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isEnterprise ? "Organization Insights" : "Smart Insights"}
        </h2>
        <div className="grid gap-2">
          {activeAlerts.map((alert, i) => {
            const Icon = alertIcons[alert.type];
            return (
              <motion.div
                key={alert.id}
                custom={8 + i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="bg-card rounded-xl border border-border px-4 py-3 flex items-start gap-3 group cursor-pointer hover:border-primary/20 transition-colors"
              >
                <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", alertColors[alert.type])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/90 leading-relaxed">{alert.message}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* E-books Section */}
      <EbooksSection />
    </div>
  );
}
