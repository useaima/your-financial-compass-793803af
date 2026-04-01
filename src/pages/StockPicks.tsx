import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Loader2, RefreshCw, ArrowUpRight, ShieldCheck, AlertTriangle, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StockRec {
  ticker: string;
  company: string;
  recommendation: string;
  current_price: string;
  target_price: string;
  upside: string;
  reason: string;
  source: string;
  risk_level: string;
  sector: string;
}

const riskColors: Record<string, string> = {
  Low: "text-primary bg-primary/10",
  Medium: "text-yellow-600 bg-yellow-500/10",
  High: "text-destructive bg-destructive/10",
};

const recColors: Record<string, string> = {
  "Strong Buy": "text-primary bg-primary/10 border-primary/20",
  Buy: "text-blue-600 bg-blue-500/10 border-blue-500/20",
  Hold: "text-muted-foreground bg-secondary border-border",
};

export default function StockPicks() {
  const [recs, setRecs] = useState<StockRec[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");

  const fetchRecs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stock-recommendations");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRecs(data.recommendations || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch recommendations");
    } finally {
      setLoading(false);
    }
  };

  const sectors = ["All", ...new Set(recs.map((r) => r.sector))];
  const filtered = filter === "All" ? recs : recs.filter((r) => r.sector === filter);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-24 md:pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Picks</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-curated investment recommendations from top advisory services</p>
        </div>
        <button
          onClick={fetchRecs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : recs.length ? <RefreshCw className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
          {recs.length ? "Refresh" : "Get Picks"}
        </button>
      </motion.div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Disclaimer:</strong> These are AI-generated recommendations based on market analysis. Not financial advice. Always do your own research before investing.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Analyzing stock recommendations...</p>
        </div>
      )}

      {!loading && !recs.length && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/12 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground max-w-sm">
            Get AI-curated stock picks from Motley Fool, Goldman Sachs, and other top advisory services.
          </p>
        </div>
      )}

      {!loading && recs.length > 0 && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 flex-wrap">
            {sectors.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </motion.div>

          <div className="space-y-4">
            {filtered.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-lg font-bold text-foreground">{rec.ticker}</span>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", recColors[rec.recommendation] || recColors.Hold)}>
                        {rec.recommendation}
                      </span>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1", riskColors[rec.risk_level] || riskColors.Medium)}>
                        <ShieldCheck className="w-3 h-3" />
                        {rec.risk_level} Risk
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.company}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-primary">
                      <ArrowUpRight className="w-4 h-4" />
                      <span className="text-sm font-bold">{rec.upside}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/50 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current</p>
                    <p className="text-sm font-bold text-foreground">{rec.current_price}</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Target</p>
                    <p className="text-sm font-bold text-primary">{rec.target_price}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{rec.reason}</p>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{rec.sector}</span>
                  <span className="text-[10px] text-muted-foreground">Source: {rec.source}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
