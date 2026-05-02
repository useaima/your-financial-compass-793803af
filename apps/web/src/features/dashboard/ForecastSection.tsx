import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
  ReferenceLine
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import BetaBadge from "@/components/BetaBadge";
import { Sparkles, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ForecastData {
  data_points: Array<{ date: string; balance: number; is_projected: boolean }>;
  summary: string;
  metrics: {
    daily_burn_rate: number;
    projected_savings: number;
  };
}

export function ForecastSection() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchForecast() {
      try {
        const { data: forecast, error } = await supabase.functions.invoke("generate-forecast");
        if (error) throw error;
        setData(forecast);
      } catch (err) {
        console.error("Failed to fetch forecast:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchForecast();
  }, []);

  if (loading) {
    return <Skeleton className="h-[400px] w-full rounded-[2rem]" />;
  }

  if (!data) return null;

  return (
    <Card className="overflow-hidden rounded-[2rem] border-border/80 bg-card/95 shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold">30-Day Cash Forecast</CardTitle>
              <BetaBadge />
            </div>
            <CardDescription>AI-driven projection based on your spending patterns</CardDescription>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.data_points}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(str) => {
                  const d = new Date(str);
                  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '1rem',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                }}
                labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { dateStyle: 'full' })}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorBalance)"
                strokeWidth={3}
              />
              {data.data_points.some(d => d.is_projected) && (
                <ReferenceLine
                  x={data.data_points.find(d => d.is_projected)?.date}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="3 3"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex-1 rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">EVA's Take</p>
                <p className="text-sm leading-relaxed text-foreground/90 italic">
                  "{data.summary}"
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:w-64">
            <div className="rounded-2xl border border-border bg-background/50 p-3 text-center">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">Burn Rate</p>
              <p className="text-lg font-bold text-foreground">${data.metrics.daily_burn_rate.toFixed(0)}<span className="text-[0.65rem] text-muted-foreground">/day</span></p>
            </div>
            <div className="rounded-2xl border border-border bg-background/50 p-3 text-center">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">Projected</p>
              <p className={cn(
                "text-lg font-bold",
                data.metrics.projected_savings >= 0 ? "text-green-600" : "text-destructive"
              )}>
                {data.metrics.projected_savings >= 0 ? "+" : ""}${data.metrics.projected_savings.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
