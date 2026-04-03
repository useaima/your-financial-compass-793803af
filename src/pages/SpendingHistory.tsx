import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, TrendingUp, TrendingDown, DollarSign, Filter } from "lucide-react";
import { hasSupabaseConfig, SUPABASE_SETUP_MESSAGE, supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "#f97316", "#06b6d4",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b",
];

type TimeRange = "7d" | "30d" | "90d";

interface SpendingLog {
  id: string;
  date: string;
  items: any[];
  total: number;
  raw_input: string;
  created_at: string;
}

export default function SpendingHistory() {
  const [logs, setLogs] = useState<SpendingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("30d");

  useEffect(() => {
    loadLogs();
  }, [range]);

  const loadLogs = async () => {
    setLoading(true);
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data } = await supabase
      .from("spending_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", since.toISOString().split("T")[0])
      .order("date", { ascending: false });

    setLogs((data as SpendingLog[]) || []);
    setLoading(false);
  };

  const totalSpent = useMemo(() => logs.reduce((s, l) => s + Number(l.total), 0), [logs]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    logs.forEach(log => {
      const items = Array.isArray(log.items) ? log.items : [];
      items.forEach((item: any) => {
        cats[item.category] = (cats[item.category] || 0) + (item.amount || 0);
      });
    });
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [logs]);

  const dailyData = useMemo(() => {
    const byDay: Record<string, number> = {};
    logs.forEach(log => {
      byDay[log.date] = (byDay[log.date] || 0) + Number(log.total);
    });
    return Object.entries(byDay)
      .map(([date, total]) => ({ date: date.slice(5), total }))
      .reverse();
  }, [logs]);

  const avgDaily = logs.length > 0 ? totalSpent / Math.max(dailyData.length, 1) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Spending History</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your spending patterns over time</p>
        </div>
        <div className="flex gap-1 bg-secondary/50 rounded-lg p-0.5">
          {(["7d", "30d", "90d"] as TimeRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12 text-sm">Loading...</div>
      ) : !hasSupabaseConfig ? (
        <div className="text-center py-16 space-y-3">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground text-sm">Spending history is waiting for Supabase setup</p>
          <p className="text-xs text-muted-foreground/70">{SUPABASE_SETUP_MESSAGE}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground text-sm">No spending logged yet</p>
          <p className="text-xs text-muted-foreground/70">Use the AI Advisor to log your daily spending</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <DollarSign className="w-4 h-4 text-primary mb-1" />
              <p className="text-lg font-bold text-foreground tabular-nums">${totalSpent.toFixed(2)}</p>
              <p className="text-[11px] text-muted-foreground">Total spent</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <TrendingUp className="w-4 h-4 text-primary mb-1" />
              <p className="text-lg font-bold text-foreground tabular-nums">${avgDaily.toFixed(2)}</p>
              <p className="text-[11px] text-muted-foreground">Daily avg</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <Filter className="w-4 h-4 text-primary mb-1" />
              <p className="text-lg font-bold text-foreground tabular-nums">{categoryData.length}</p>
              <p className="text-[11px] text-muted-foreground">Categories</p>
            </div>
          </div>

          {/* Daily bar chart */}
          {dailyData.length > 1 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">Daily Spending</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "Spent"]}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category breakdown */}
          {categoryData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">By Category</h2>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {categoryData.map((cat, i) => (
                    <div key={cat.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{cat.name}</span>
                      </div>
                      <span className="font-medium text-foreground tabular-nums">${cat.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Log entries */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Recent Entries</h2>
            {logs.map(log => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">{log.date}</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">${Number(log.total).toFixed(2)}</span>
                </div>
                <div className="space-y-0.5">
                  {(Array.isArray(log.items) ? log.items : []).map((item: any, j: number) => (
                    <div key={j} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{item.category} — {item.description}</span>
                      <span className="font-medium text-foreground tabular-nums">${item.amount?.toFixed(2)}</span>
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
