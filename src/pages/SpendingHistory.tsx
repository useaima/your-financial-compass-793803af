import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calendar, DollarSign, Filter, TrendingUp } from "lucide-react";
import { usePublicUser } from "@/context/PublicUserContext";
import { formatCurrencyDetailed } from "@/lib/finance";
import { cn } from "@/lib/utils";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(357 20% 36%)",
  "hsl(18 58% 45%)",
  "hsl(36 82% 58%)",
  "hsl(29 28% 50%)",
  "hsl(24 42% 33%)",
];

type TimeRange = "7d" | "30d" | "90d";

export default function SpendingHistory() {
  const { bootstrap } = usePublicUser();
  const [range, setRange] = useState<TimeRange>("30d");

  const logs = useMemo(() => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    return bootstrap.spending_logs.filter((log) => new Date(log.date) >= since);
  }, [bootstrap.spending_logs, range]);

  const totalSpent = useMemo(
    () => logs.reduce((sum, log) => sum + Number(log.total || 0), 0),
    [logs],
  );

  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    logs.forEach((log) => {
      log.items.forEach((item) => {
        totals[item.category] = (totals[item.category] || 0) + Number(item.amount || 0);
      });
    });

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [logs]);

  const dailyData = useMemo(() => {
    const byDay: Record<string, number> = {};
    logs.forEach((log) => {
      byDay[log.date] = (byDay[log.date] || 0) + Number(log.total || 0);
    });
    return Object.entries(byDay)
      .map(([date, total]) => ({ date: date.slice(5), total }))
      .reverse();
  }, [logs]);

  const avgDaily = logs.length > 0 ? totalSpent / Math.max(dailyData.length, 1) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Spending History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your real spending patterns over time.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-secondary/50 p-0.5">
          {(["7d", "30d", "90d"] as TimeRange[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRange(value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                range === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {value === "7d" ? "7 Days" : value === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="space-y-3 py-16 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No spending logged yet</p>
          <p className="text-xs text-muted-foreground/70">
            Use the AI Advisor to log your daily spending and history will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <DollarSign className="mb-1 h-4 w-4 text-primary" />
              <p className="text-lg font-bold tabular-nums text-foreground">
                {formatCurrencyDetailed(totalSpent)}
              </p>
              <p className="text-[11px] text-muted-foreground">Total spent</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <TrendingUp className="mb-1 h-4 w-4 text-primary" />
              <p className="text-lg font-bold tabular-nums text-foreground">
                {formatCurrencyDetailed(avgDaily)}
              </p>
              <p className="text-[11px] text-muted-foreground">Daily avg</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <Filter className="mb-1 h-4 w-4 text-primary" />
              <p className="text-lg font-bold tabular-nums text-foreground">
                {categoryData.length}
              </p>
              <p className="text-[11px] text-muted-foreground">Categories</p>
            </div>
          </div>

          {dailyData.length > 1 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Daily Spending</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [formatCurrencyDetailed(value), "Spent"]}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {categoryData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">By Category</h2>
              <div className="flex items-center gap-6">
                <div className="h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                        {categoryData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {categoryData.map((category, index) => (
                    <div key={category.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ background: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-muted-foreground">{category.name}</span>
                      </div>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatCurrencyDetailed(category.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Recent Entries</h2>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{log.date}</span>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {formatCurrencyDetailed(Number(log.total || 0))}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {(Array.isArray(log.items) ? log.items : []).map((item, index) => (
                    <div key={`${log.id}-${index}`} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {item.category} — {item.description}
                      </span>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatCurrencyDetailed(Number(item.amount || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
